import { env } from "cloudflare:workers";
import { inventorySchemaStatements } from "./schema";

type InventoryRecord = Record<string, unknown>;
type InventoryState = {
  version?: number;
  products: InventoryRecord[];
  movements: InventoryRecord[];
  expenses: InventoryRecord[];
  customers: InventoryRecord[];
  settings: InventoryRecord;
};
type JsonRow = { id: string; record_json: string };
type MetadataRow = { state_version: number; updated_at: string; migrated_at: string | null };
type LegacyRow = { payload: string; updated_at: string };
type SaveResult = { updatedAt: string; written: number; deleted: number };

const schemaVersion = 1;
let schemaReady: Promise<typeof env.DB> | null = null;

const stringValue = (value: unknown) => typeof value === "string" ? value : String(value ?? "");
const numberValue = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const booleanValue = (value: unknown) => value ? 1 : 0;
const normalizedKey = (value: unknown) => stringValue(value).trim().toLowerCase().replace(/\s+/g, "");
const json = (value: unknown) => JSON.stringify(value);
const parseJson = <T>(value: string, label: string): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`Stored ${label} data is invalid.`);
  }
};
const rowsFrom = (result: unknown) => {
  const results = (result as { results?: JsonRow[] } | null)?.results;
  return Array.isArray(results) ? results : [];
};
const chunks = <T>(values: T[], size: number) => {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
};

export async function inventoryDatabase() {
  if (!env.DB) throw new Error("Local database is unavailable.");
  if (!schemaReady) {
    schemaReady = env.DB
      .batch(inventorySchemaStatements.map((statement) => env.DB.prepare(statement)))
      .then(() => env.DB)
      .catch((error) => {
        schemaReady = null;
        throw error;
      });
  }
  return schemaReady;
}

const tableConfigs = [
  {
    name: "products",
    columns: ["id", "sku", "name", "vendor", "category", "quantity", "unit_cost", "sale_price", "reorder_point", "sales_tax_paid", "created_at", "record_json"],
    records: (state: InventoryState) => state.products,
    values: (record: InventoryRecord, recordJson: string) => [
      stringValue(record.id), stringValue(record.sku), stringValue(record.name), stringValue(record.vendor),
      stringValue(record.category), numberValue(record.quantity), numberValue(record.unitCost), numberValue(record.salePrice),
      numberValue(record.reorderPoint), booleanValue(record.salesTaxPaid), stringValue(record.createdAt), recordJson,
    ],
  },
  {
    name: "movements",
    columns: ["id", "product_id", "type", "date", "source_key", "customer_id", "record_json"],
    records: (state: InventoryState) => state.movements,
    values: (record: InventoryRecord, recordJson: string) => [
      stringValue(record.id), stringValue(record.productId), stringValue(record.type), stringValue(record.date),
      stringValue(record.sourceKey) || null, stringValue(record.customerId) || null, recordJson,
    ],
  },
  {
    name: "expenses",
    columns: ["id", "external_key", "normalized_external_key", "purchase_source", "vendor", "category", "amount", "date", "source", "record_json"],
    records: (state: InventoryState) => state.expenses,
    values: (record: InventoryRecord, recordJson: string) => [
      stringValue(record.id), stringValue(record.externalKey), normalizedKey(record.externalKey),
      stringValue(record.purchaseSource), stringValue(record.vendor), stringValue(record.category),
      numberValue(record.amount), stringValue(record.date), stringValue(record.source), recordJson,
    ],
  },
  {
    name: "customers",
    columns: ["id", "external_key", "normalized_external_key", "name", "email", "state", "postal_code", "record_json"],
    records: (state: InventoryState) => state.customers,
    values: (record: InventoryRecord, recordJson: string) => {
      const address = record.address && typeof record.address === "object" ? record.address as InventoryRecord : {};
      return [
        stringValue(record.id), stringValue(record.externalKey), normalizedKey(record.externalKey),
        stringValue(record.name), stringValue(record.email), stringValue(address.state),
        stringValue(address.postalCode), recordJson,
      ];
    },
  },
] as const;

function deleteStatements(
  db: typeof env.DB,
  table: string,
  existingIds: string[],
  incomingIds: Set<string>,
) {
  const removed = existingIds.filter((id) => !incomingIds.has(id));
  return {
    count: removed.length,
    statements: chunks(removed, 50).map((group) =>
      db.prepare(`DELETE FROM ${table} WHERE id IN (${group.map(() => "?").join(", ")})`).bind(...group)
    ),
  };
}

function upsertStatements(
  db: typeof env.DB,
  table: string,
  columns: readonly string[],
  rows: unknown[][],
) {
  if (!rows.length) return [];
  const rowsPerStatement = Math.max(1, Math.floor(90 / columns.length));
  const assignments = columns.filter((column) => column !== "id").map((column) => `${column} = excluded.${column}`).join(", ");
  return chunks(rows, rowsPerStatement).map((group) => {
    const valuesSql = group.map(() => `(${columns.map(() => "?").join(", ")})`).join(", ");
    return db.prepare(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${valuesSql}
       ON CONFLICT(id) DO UPDATE SET ${assignments}`
    ).bind(...group.flat());
  });
}

async function normalizedState(db: typeof env.DB, metadata: MetadataRow) {
  const [settingsRow, ...tableResults] = await Promise.all([
    db.prepare("SELECT record_json FROM app_settings WHERE id = 1").first() as Promise<{ record_json: string } | null>,
    ...tableConfigs.map((config) => db.prepare(`SELECT id, record_json FROM ${config.name} ORDER BY rowid`).all()),
  ]);
  if (!settingsRow?.record_json) throw new Error("Stored settings are missing.");
  const parsedTables = tableResults.map((result, index) =>
    rowsFrom(result).map((row) => parseJson<InventoryRecord>(row.record_json, tableConfigs[index].name))
  );
  return {
    state: {
      version: metadata.state_version,
      products: parsedTables[0],
      movements: parsedTables[1],
      expenses: parsedTables[2],
      customers: parsedTables[3],
      settings: parseJson<InventoryRecord>(settingsRow.record_json, "settings"),
    },
    updatedAt: metadata.updated_at,
    storage: "d1-relational",
  };
}

export async function loadInventoryState() {
  const db = await inventoryDatabase();
  const metadata = await db
    .prepare("SELECT state_version, updated_at, migrated_at FROM app_metadata WHERE id = 1")
    .first() as MetadataRow | null;
  if (metadata) return normalizedState(db, metadata);

  const legacy = await db
    .prepare("SELECT payload, updated_at FROM inventory_state WHERE id = 1")
    .first() as LegacyRow | null;
  if (!legacy?.payload) return { state: null, updatedAt: null, storage: "d1-relational" };

  const state = parseJson<InventoryState>(legacy.payload, "legacy inventory");
  await saveInventoryState(state, legacy.updated_at, new Date().toISOString());
  return { state, updatedAt: legacy.updated_at, storage: "d1-relational", migrated: true };
}

export async function saveInventoryState(
  state: InventoryState,
  updatedAt = new Date().toISOString(),
  migratedAt?: string,
): Promise<SaveResult> {
  const db = await inventoryDatabase();
  const existingResults = await Promise.all(
    tableConfigs.map((config) => db.prepare(`SELECT id, record_json FROM ${config.name}`).all())
  );
  const statements: ReturnType<typeof db.prepare>[] = [];
  let written = 0;
  let deleted = 0;

  tableConfigs.forEach((config, index) => {
    const existingRows = rowsFrom(existingResults[index]);
    const existing = new Map(existingRows.map((row) => [row.id, row.record_json]));
    const records = config.records(state);
    const incomingIds = new Set(records.map((record) => stringValue(record.id)));
    const removals = deleteStatements(db, config.name, [...existing.keys()], incomingIds);
    statements.push(...removals.statements);
    deleted += removals.count;

    const changedRows = records.flatMap((record) => {
      const recordJson = json(record);
      const id = stringValue(record.id);
      return existing.get(id) === recordJson ? [] : [config.values(record, recordJson)];
    });
    statements.push(...upsertStatements(db, config.name, config.columns, changedRows));
    written += changedRows.length;
  });

  const settingsJson = json(state.settings);
  const savedSettings = await db
    .prepare("SELECT record_json FROM app_settings WHERE id = 1")
    .first() as { record_json: string } | null;
  if (savedSettings?.record_json !== settingsJson) {
    statements.push(db.prepare(`
      INSERT INTO app_settings (id, record_json) VALUES (1, ?)
      ON CONFLICT(id) DO UPDATE SET record_json = excluded.record_json
    `).bind(settingsJson));
    written += 1;
  }

  statements.push(db.prepare(`
    INSERT INTO app_metadata (id, schema_version, state_version, updated_at, migrated_at)
    VALUES (1, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      schema_version = excluded.schema_version,
      state_version = excluded.state_version,
      updated_at = excluded.updated_at,
      migrated_at = COALESCE(app_metadata.migrated_at, excluded.migrated_at)
  `).bind(schemaVersion, numberValue(state.version), updatedAt, migratedAt ?? null));

  await db.batch(statements);
  return { updatedAt, written, deleted };
}
