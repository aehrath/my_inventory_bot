import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const appMetadata = sqliteTable("app_metadata", {
  id: integer("id").primaryKey(),
  schemaVersion: integer("schema_version").notNull(),
  stateVersion: integer("state_version").notNull(),
  updatedAt: text("updated_at").notNull(),
  migratedAt: text("migrated_at"),
});

export const appSettings = sqliteTable("app_settings", {
  id: integer("id").primaryKey(),
  recordJson: text("record_json").notNull(),
});

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  vendor: text("vendor").notNull(),
  category: text("category").notNull(),
  quantity: real("quantity").notNull(),
  unitCost: real("unit_cost").notNull(),
  salePrice: real("sale_price").notNull(),
  reorderPoint: real("reorder_point").notNull(),
  salesTaxPaid: integer("sales_tax_paid", { mode: "boolean" }).notNull(),
  createdAt: text("created_at").notNull(),
  recordJson: text("record_json").notNull(),
}, (table) => [
  uniqueIndex("products_sku_idx").on(table.sku),
  index("products_vendor_idx").on(table.vendor),
  index("products_category_idx").on(table.category),
]);

export const movements = sqliteTable("movements", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  type: text("type").notNull(),
  date: text("date").notNull(),
  sourceKey: text("source_key"),
  customerId: text("customer_id"),
  recordJson: text("record_json").notNull(),
}, (table) => [
  index("movements_product_idx").on(table.productId),
  index("movements_type_date_idx").on(table.type, table.date),
  uniqueIndex("movements_source_key_idx").on(table.sourceKey),
  index("movements_customer_idx").on(table.customerId),
]);

export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  externalKey: text("external_key").notNull(),
  normalizedExternalKey: text("normalized_external_key").notNull(),
  purchaseSource: text("purchase_source").notNull(),
  vendor: text("vendor").notNull(),
  category: text("category").notNull(),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  source: text("source").notNull(),
  recordJson: text("record_json").notNull(),
}, (table) => [
  uniqueIndex("expenses_external_key_idx").on(table.normalizedExternalKey),
  index("expenses_purchase_source_idx").on(table.purchaseSource),
  index("expenses_category_date_idx").on(table.category, table.date),
  index("expenses_vendor_idx").on(table.vendor),
]);

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  externalKey: text("external_key").notNull(),
  normalizedExternalKey: text("normalized_external_key").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  state: text("state").notNull(),
  postalCode: text("postal_code").notNull(),
  recordJson: text("record_json").notNull(),
}, (table) => [
  uniqueIndex("customers_external_key_idx").on(table.normalizedExternalKey),
  index("customers_name_idx").on(table.name),
  index("customers_email_idx").on(table.email),
  index("customers_location_idx").on(table.state, table.postalCode),
]);

export const inventorySchemaStatements = [
  `CREATE TABLE IF NOT EXISTS inventory_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS app_metadata (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    schema_version INTEGER NOT NULL,
    state_version INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    migrated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    record_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    vendor TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_cost REAL NOT NULL,
    sale_price REAL NOT NULL,
    reorder_point REAL NOT NULL,
    sales_tax_paid INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    record_json TEXT NOT NULL
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS products_sku_idx ON products (sku)",
  "CREATE INDEX IF NOT EXISTS products_vendor_idx ON products (vendor)",
  "CREATE INDEX IF NOT EXISTS products_category_idx ON products (category)",
  `CREATE TABLE IF NOT EXISTS movements (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    source_key TEXT,
    customer_id TEXT,
    record_json TEXT NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS movements_product_idx ON movements (product_id)",
  "CREATE INDEX IF NOT EXISTS movements_type_date_idx ON movements (type, date)",
  "CREATE UNIQUE INDEX IF NOT EXISTS movements_source_key_idx ON movements (source_key)",
  "CREATE INDEX IF NOT EXISTS movements_customer_idx ON movements (customer_id)",
  `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    external_key TEXT NOT NULL,
    normalized_external_key TEXT NOT NULL,
    purchase_source TEXT NOT NULL DEFAULT '',
    vendor TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    source TEXT NOT NULL,
    record_json TEXT NOT NULL
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS expenses_external_key_idx ON expenses (normalized_external_key)",
  "CREATE INDEX IF NOT EXISTS expenses_purchase_source_idx ON expenses (purchase_source)",
  "CREATE INDEX IF NOT EXISTS expenses_category_date_idx ON expenses (category, date)",
  "CREATE INDEX IF NOT EXISTS expenses_vendor_idx ON expenses (vendor)",
  `CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    external_key TEXT NOT NULL,
    normalized_external_key TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    record_json TEXT NOT NULL
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS customers_external_key_idx ON customers (normalized_external_key)",
  "CREATE INDEX IF NOT EXISTS customers_name_idx ON customers (name)",
  "CREATE INDEX IF NOT EXISTS customers_email_idx ON customers (email)",
  "CREATE INDEX IF NOT EXISTS customers_location_idx ON customers (state, postal_code)",
] as const;
