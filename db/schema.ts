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
  personal: integer("personal", { mode: "boolean" }).notNull().default(false),
  amount: real("amount").notNull(),
  date: text("date").notNull(),
  source: text("source").notNull(),
  recordJson: text("record_json").notNull(),
}, (table) => [
  uniqueIndex("expenses_external_key_idx").on(table.normalizedExternalKey),
  index("expenses_purchase_source_idx").on(table.purchaseSource),
  index("expenses_category_date_idx").on(table.category, table.date),
  index("expenses_personal_date_idx").on(table.personal, table.date),
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

export const dataCommits = sqliteTable("data_commits", {
  id: text("id").primaryKey(),
  parentId: text("parent_id"),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
  formatVersion: integer("format_version").notNull(),
  applicationStateVersion: integer("application_state_version").notNull(),
  contentHash: text("content_hash").notNull(),
  snapshotKey: text("snapshot_key").notNull(),
  snapshotBytes: integer("snapshot_bytes").notNull(),
  recordCount: integer("record_count").notNull(),
  fieldCount: integer("field_count").notNull(),
  changedFieldCount: integer("changed_field_count").notNull(),
  remoteStatus: text("remote_status").notNull().default("not_pushed"),
  remoteRepository: text("remote_repository"),
  remoteBranch: text("remote_branch"),
  remotePath: text("remote_path"),
  remoteCommitSha: text("remote_commit_sha"),
  remoteUrl: text("remote_url"),
  remoteError: text("remote_error"),
}, (table) => [
  index("data_commits_created_at_idx").on(table.createdAt),
  index("data_commits_parent_idx").on(table.parentId),
  index("data_commits_content_hash_idx").on(table.contentHash),
]);

export const importDocuments = sqliteTable("import_documents", {
  id: text("id").primaryKey(),
  originalName: text("original_name").notNull(),
  storedName: text("stored_name").notNull(),
  sourceName: text("source_name").notNull(),
  importKind: text("import_kind").notNull(),
  importedAt: text("imported_at").notNull(),
  contentType: text("content_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  contentHash: text("content_hash").notNull(),
  semanticHash: text("semantic_hash").notNull(),
  lastImportedAt: text("last_imported_at").notNull(),
  importCount: integer("import_count").notNull().default(1),
  storageKey: text("storage_key").notNull(),
}, (table) => [
  uniqueIndex("import_documents_stored_name_idx").on(table.storedName),
  index("import_documents_imported_at_idx").on(table.importedAt),
  index("import_documents_source_name_idx").on(table.sourceName),
  index("import_documents_content_hash_idx").on(table.contentHash),
  uniqueIndex("import_documents_semantic_hash_idx").on(table.semanticHash),
]);

export const importDocumentLinks = sqliteTable("import_document_links", {
  documentId: text("document_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  relation: text("relation").notNull(),
  linkedAt: text("linked_at").notNull(),
}, (table) => [
  uniqueIndex("import_document_links_unique_idx").on(table.documentId, table.entityType, table.entityId),
  index("import_document_links_entity_idx").on(table.entityType, table.entityId),
  index("import_document_links_document_idx").on(table.documentId),
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
    personal INTEGER NOT NULL DEFAULT 0,
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
  `CREATE TABLE IF NOT EXISTS data_commits (
    id TEXT PRIMARY KEY,
    parent_id TEXT,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    format_version INTEGER NOT NULL,
    application_state_version INTEGER NOT NULL,
    content_hash TEXT NOT NULL,
    snapshot_key TEXT NOT NULL,
    snapshot_bytes INTEGER NOT NULL,
    record_count INTEGER NOT NULL,
    field_count INTEGER NOT NULL,
    changed_field_count INTEGER NOT NULL,
    remote_status TEXT NOT NULL DEFAULT 'not_pushed',
    remote_repository TEXT,
    remote_branch TEXT,
    remote_path TEXT,
    remote_commit_sha TEXT,
    remote_url TEXT,
    remote_error TEXT
  )`,
  "CREATE INDEX IF NOT EXISTS data_commits_created_at_idx ON data_commits (created_at)",
  "CREATE INDEX IF NOT EXISTS data_commits_parent_idx ON data_commits (parent_id)",
  "CREATE INDEX IF NOT EXISTS data_commits_content_hash_idx ON data_commits (content_hash)",
  `CREATE TABLE IF NOT EXISTS import_documents (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    source_name TEXT NOT NULL,
    import_kind TEXT NOT NULL,
    imported_at TEXT NOT NULL,
    content_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    content_hash TEXT NOT NULL,
    semantic_hash TEXT NOT NULL,
    last_imported_at TEXT NOT NULL,
    import_count INTEGER NOT NULL DEFAULT 1,
    storage_key TEXT NOT NULL
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS import_documents_stored_name_idx ON import_documents (stored_name)",
  "CREATE INDEX IF NOT EXISTS import_documents_imported_at_idx ON import_documents (imported_at)",
  "CREATE INDEX IF NOT EXISTS import_documents_source_name_idx ON import_documents (source_name)",
  "CREATE INDEX IF NOT EXISTS import_documents_content_hash_idx ON import_documents (content_hash)",
  "CREATE UNIQUE INDEX IF NOT EXISTS import_documents_semantic_hash_idx ON import_documents (semantic_hash)",
  `CREATE TABLE IF NOT EXISTS import_document_links (
    document_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    relation TEXT NOT NULL,
    linked_at TEXT NOT NULL,
    PRIMARY KEY (document_id, entity_type, entity_id),
    FOREIGN KEY (document_id) REFERENCES import_documents(id) ON DELETE CASCADE
  )`,
  "CREATE INDEX IF NOT EXISTS import_document_links_entity_idx ON import_document_links (entity_type, entity_id)",
  "CREATE INDEX IF NOT EXISTS import_document_links_document_idx ON import_document_links (document_id)",
] as const;
