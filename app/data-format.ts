import type { ImportDocumentIndex } from "./import-documents";

export const STOCKBOT_DATA_FORMAT_ID = "stockbot-data" as const;
export const STOCKBOT_DATA_FORMAT_VERSION = 2 as const;
export const STOCKBOT_DATA_SCHEMA = "https://stockbot-inventory.aehrath.chatgpt.site/data-format/v2" as const;

type JsonScalar = string | number | boolean | null;
type JsonValue = JsonScalar | JsonValue[] | { [key: string]: JsonValue };
type JsonRecord = { [key: string]: JsonValue };
type SourceRecord = Record<string, unknown>;

export const stockBotDatasetLabels = {
  products: "Products",
  movements: "Activity",
  expenses: "Expenses",
  customers: "Customers",
  settings: "Workspace settings",
  stateTaxes: "State tax settings",
  localTaxRules: "Local tax rules",
  addressTaxRates: "Saved address tax rates",
  taxUpdateHistory: "Tax-rate history",
  customExpenseCategories: "Custom expense categories",
  expenseCategoryOverrides: "Expense category treatments",
  expenseColumnOrder: "Expense column order",
  expenseVisibleColumns: "Visible expense columns",
  importDocuments: "Imported documents",
  importDocumentLinks: "Document provenance links",
} as const;

export type StockBotDataset = keyof typeof stockBotDatasetLabels;
export type StockBotDataFile = {
  $schema: typeof STOCKBOT_DATA_SCHEMA;
  format: typeof STOCKBOT_DATA_FORMAT_ID;
  formatVersion: typeof STOCKBOT_DATA_FORMAT_VERSION;
  applicationStateVersion: number;
  data: Record<StockBotDataset, JsonRecord[]>;
};
export type DataDiffChange = "added" | "removed" | "modified" | "unchanged";
export type DataDiffRow = {
  id: string;
  dataset: StockBotDataset;
  datasetLabel: string;
  recordKey: string;
  recordLabel: string;
  field: string;
  previous: JsonValue | undefined;
  current: JsonValue | undefined;
  change: DataDiffChange;
};

const productFields = ["id", "sku", "name", "vendor", "category", "quantity", "unitCost", "salePrice", "reorderPoint", "salesTaxPaid", "createdAt"] as const;
const movementFields = ["id", "productId", "type", "quantity", "unitCost", "unitPrice", "salesTax", "date", "note", "taxRate", "stateTax", "localTax", "stateTaxRate", "localTaxRate", "taxJurisdiction", "localJurisdiction", "taxCollected", "customerAddress", "productName", "productSku", "finalProductId", "finalProductName", "sourceKey", "invoiceNumber", "customerId", "customerName"] as const;
const expenseFields = ["id", "externalKey", "purchaseSource", "vendor", "asins", "category", "amount", "date", "note", "personal", "source", "importedAt"] as const;
const customerFields = ["id", "externalKey", "name", "email", "phone", "address", "createdAt", "updatedAt"] as const;
const settingsFields = ["businessName", "taxYear", "beginningInventory", "ownAddress"] as const;
const stateTaxFields = ["state", "enabled", "rate", "manualOverride", "sourceName", "sourceUrl", "checkedAt", "effectiveDate"] as const;
const localTaxRuleFields = ["id", "name", "state", "city", "postalCode", "rate", "enabled", "manualOverride", "sourceName", "sourceUrl", "checkedAt", "effectiveDate"] as const;
const addressTaxRateFields = ["id", "addressKey", "address", "stateRate", "localRate", "totalRate", "jurisdiction", "localJurisdiction", "sourceName", "sourceUrl", "effectiveDate", "confidence", "checkedAt"] as const;
const taxHistoryFields = ["id", "checkedAt", "appliedAt", "checkedAddresses", "availableUpdates", "appliedUpdates", "status", "sources"] as const;
const categoryFields = ["name", "accountingClass", "costTiming"] as const;
const importDocumentFields = ["id", "originalName", "storedName", "sourceName", "importKind", "importedAt", "lastImportedAt", "importCount", "contentType", "byteSize", "contentHash", "semanticHash", "linkCount"] as const;
const importDocumentLinkFields = ["documentId", "entityType", "entityId", "relation", "linkedAt"] as const;

const sourceRecord = (value: unknown): SourceRecord => value && typeof value === "object" && !Array.isArray(value) ? value as SourceRecord : {};
const sourceArray = (value: unknown): SourceRecord[] => Array.isArray(value) ? value.map(sourceRecord) : [];
const jsonValue = (value: unknown): JsonValue => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map(jsonValue);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value as SourceRecord).sort(([left], [right]) => left.localeCompare(right)).map(([key, nested]) => [key, jsonValue(nested)]));
  }
  return String(value);
};
const record = (source: SourceRecord, fields: readonly string[], defaults: Record<string, JsonValue> = {}): JsonRecord =>
  Object.fromEntries(fields.map((field) => [field, source[field] === undefined ? (defaults[field] ?? null) : jsonValue(source[field])]));
const sorted = (records: JsonRecord[], key: string) => [...records].sort((left, right) => String(left[key] ?? "").localeCompare(String(right[key] ?? ""), undefined, { numeric: true, sensitivity: "base" }));

export function createStockBotDataFile(rawState: unknown, provenance?: ImportDocumentIndex): StockBotDataFile {
  const state = sourceRecord(rawState);
  const settings = sourceRecord(state.settings);
  const importedFieldNames = Array.from(new Set(sourceArray(state.expenses).flatMap((expense) => Object.keys(sourceRecord(expense.fields))))).sort((left, right) => left.localeCompare(right));
  const expenses = sourceArray(state.expenses).map((expense) => ({
    ...record(expense, expenseFields, { asins: [], personal: false }),
    fields: Object.fromEntries(importedFieldNames.map((field) => [field, jsonValue(sourceRecord(expense.fields)[field] ?? "")])),
  }));
  const stateTaxes = Object.entries(sourceRecord(settings.stateTaxes)).map(([stateCode, value]) => record({ state: stateCode, ...sourceRecord(value) }, stateTaxFields, { enabled: false, rate: 0 }));
  const expenseCategoryOverrides = Object.entries(sourceRecord(settings.expenseCategoryOverrides)).map(([name, value]) => record({ name, ...sourceRecord(value) }, categoryFields));
  const positioned = (value: unknown) => (Array.isArray(value) ? value : []).map((key, position) => ({ position, key: jsonValue(key) }));

  return {
    $schema: STOCKBOT_DATA_SCHEMA,
    format: STOCKBOT_DATA_FORMAT_ID,
    formatVersion: STOCKBOT_DATA_FORMAT_VERSION,
    applicationStateVersion: Number(state.version) || 0,
    data: {
      products: sorted(sourceArray(state.products).map((item) => record(item, productFields, { quantity: 0, unitCost: 0, salePrice: 0, reorderPoint: 0, salesTaxPaid: false })), "id"),
      movements: sorted(sourceArray(state.movements).map((item) => record(item, movementFields, { quantity: 0, unitCost: 0, unitPrice: 0, salesTax: 0 })), "id"),
      expenses: sorted(expenses, "id"),
      customers: sorted(sourceArray(state.customers).map((item) => record(item, customerFields)), "id"),
      settings: [record({ id: "workspace", ...settings }, ["id", ...settingsFields], { beginningInventory: 0 })],
      stateTaxes: sorted(stateTaxes, "state"),
      localTaxRules: sorted(sourceArray(settings.localTaxRules).map((item) => record(item, localTaxRuleFields, { rate: 0, enabled: false })), "id"),
      addressTaxRates: sorted(sourceArray(settings.addressTaxRates).map((item) => record(item, addressTaxRateFields, { stateRate: 0, localRate: 0, totalRate: 0 })), "id"),
      taxUpdateHistory: sorted(sourceArray(settings.taxUpdateHistory).map((item) => record(item, taxHistoryFields, { checkedAddresses: 0, availableUpdates: 0, appliedUpdates: 0, sources: [] })), "id"),
      customExpenseCategories: sorted(sourceArray(settings.customExpenseCategories).map((item) => record(item, categoryFields)), "name"),
      expenseCategoryOverrides: sorted(expenseCategoryOverrides, "name"),
      expenseColumnOrder: positioned(settings.expenseColumnOrder),
      expenseVisibleColumns: positioned(settings.expenseVisibleColumns),
      importDocuments: sorted((provenance?.documents ?? []).map((item) => record(item as unknown as SourceRecord, importDocumentFields, { linkCount: 0 })), "id"),
      importDocumentLinks: sorted((provenance?.links ?? []).map((item) => record(item as unknown as SourceRecord, importDocumentLinkFields)), "documentId"),
    },
  };
}

export function stableStockBotDataJson(dataFile: StockBotDataFile) {
  return `${JSON.stringify(dataFile, null, 2)}\n`;
}

const recordKey = (dataset: StockBotDataset, item: JsonRecord, index: number) => {
  if (dataset === "products") return String(item.id ?? item.sku ?? index);
  if (dataset === "expenses" || dataset === "customers") return String(item.id ?? item.externalKey ?? index);
  if (dataset === "movements" || dataset === "localTaxRules" || dataset === "addressTaxRates" || dataset === "taxUpdateHistory") return String(item.id ?? index);
  if (dataset === "stateTaxes") return String(item.state ?? index);
  if (dataset === "customExpenseCategories" || dataset === "expenseCategoryOverrides") return String(item.name ?? index);
  if (dataset === "expenseColumnOrder" || dataset === "expenseVisibleColumns") return String(item.position ?? index);
  if (dataset === "importDocuments") return String(item.id ?? index);
  if (dataset === "importDocumentLinks") return `${item.documentId ?? ""}:${item.entityType ?? ""}:${item.entityId ?? index}`;
  return String(item.id ?? index);
};
const recordLabel = (dataset: StockBotDataset, item: JsonRecord, key: string) => {
  const candidate = dataset === "products" ? item.name : dataset === "expenses" ? item.externalKey : dataset === "customers" ? item.name : dataset === "movements" ? (item.sourceKey ?? item.productName) : dataset === "stateTaxes" ? item.state : dataset === "localTaxRules" ? item.name : dataset === "customExpenseCategories" || dataset === "expenseCategoryOverrides" ? item.name : dataset === "expenseColumnOrder" || dataset === "expenseVisibleColumns" ? item.key : dataset === "importDocuments" ? item.storedName : dataset === "importDocumentLinks" ? `${item.entityType}:${item.entityId}` : item.id;
  return String(candidate ?? key);
};
const flattened = (value: JsonValue, prefix = ""): Map<string, JsonValue> => {
  const result = new Map<string, JsonValue>();
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value);
    if (!entries.length && prefix) result.set(prefix, {});
    for (const [key, nested] of entries) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (nested !== null && typeof nested === "object" && !Array.isArray(nested)) {
        for (const [nestedPath, nestedValue] of flattened(nested, path)) result.set(nestedPath, nestedValue);
      } else result.set(path, nested);
    }
  } else if (prefix) result.set(prefix, value);
  return result;
};
const equalJson = (left: JsonValue | undefined, right: JsonValue | undefined) => JSON.stringify(left) === JSON.stringify(right);

export function diffStockBotDataFiles(previous: StockBotDataFile | null, current: StockBotDataFile): DataDiffRow[] {
  const rows: DataDiffRow[] = [];
  for (const dataset of Object.keys(stockBotDatasetLabels) as StockBotDataset[]) {
    const previousRecords = new Map((previous?.data[dataset] ?? []).map((item, index) => [recordKey(dataset, item, index), item]));
    const currentRecords = new Map((current.data[dataset] ?? []).map((item, index) => [recordKey(dataset, item, index), item]));
    const datasetFields = Array.from(new Set(
      [...previousRecords.values(), ...currentRecords.values()].flatMap((item) => [...flattened(item).keys()])
    )).sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }));
    const keys = Array.from(new Set([...previousRecords.keys(), ...currentRecords.keys()])).sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }));
    for (const key of keys) {
      const before = previousRecords.get(key);
      const after = currentRecords.get(key);
      const beforeFields = before ? flattened(before) : new Map<string, JsonValue>();
      const afterFields = after ? flattened(after) : new Map<string, JsonValue>();
      for (const field of datasetFields) {
        const previousValue = beforeFields.get(field);
        const currentValue = afterFields.get(field);
        const change: DataDiffChange = !before ? "added" : !after ? "removed" : equalJson(previousValue, currentValue) ? "unchanged" : "modified";
        rows.push({
          id: `${dataset}:${key}:${field}`,
          dataset,
          datasetLabel: stockBotDatasetLabels[dataset],
          recordKey: key,
          recordLabel: recordLabel(dataset, after ?? before ?? {}, key),
          field,
          previous: previousValue,
          current: currentValue,
          change,
        });
      }
    }
  }
  return rows;
}

export function dataDiffValue(value: JsonValue | undefined) {
  if (value === undefined || value === null || value === "") return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}
