import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("uses indexed relational D1 storage for business records", async () => {
  const [schema, repository, route, migration, personalMigration, page] = await Promise.all([
    read("db/schema.ts"),
    read("db/inventory-repository.ts"),
    read("app/api/state/route.ts"),
    read("drizzle/0000_burly_sage.sql"),
    read("drizzle/0001_third_rockslide.sql"),
    read("app/page.tsx"),
  ]);

  for (const table of ["app_metadata", "app_settings", "products", "movements", "expenses", "customers"]) {
    assert.match(schema, new RegExp(`sqliteTable\\("${table}"`));
    assert.match(migration, new RegExp(`CREATE TABLE \\\`${table}\\\``));
  }

  assert.match(schema, /expenses_purchase_source_idx/);
  assert.match(schema, /expenses_category_date_idx/);
  assert.match(schema, /expenses_personal_date_idx/);
  assert.match(schema, /personal: integer\("personal", \{ mode: "boolean" \}\)/);
  assert.match(schema, /products_sku_idx/);
  assert.match(schema, /movements_source_key_idx/);
  assert.match(schema, /customers_external_key_idx/);
  assert.match(repository, /existing\.get\(id\) === recordJson/);
  assert.match(repository, /ALTER TABLE expenses ADD COLUMN personal INTEGER NOT NULL DEFAULT 0/);
  assert.match(repository, /booleanValue\(record\.personal\)/);
  assert.match(personalMigration, /ALTER TABLE `expenses` ADD `personal` integer DEFAULT false NOT NULL/);
  assert.match(personalMigration, /CREATE INDEX `expenses_personal_date_idx`/);
  assert.match(repository, /DELETE FROM \$\{table\} WHERE id IN/);
  assert.match(repository, /SELECT payload, updated_at FROM inventory_state/);
  assert.match(repository, /migrated: true/);
  assert.match(route, /loadInventoryState/);
  assert.match(route, /saveInventoryState/);
  assert.match(route, /storage: "d1-relational"/);
  assert.match(page, /Lightweight SQLite storage/);
});
