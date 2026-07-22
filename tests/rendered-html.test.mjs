import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("ships StockBot product metadata", async () => {
  const layout = await read("app/layout.tsx");
  assert.match(layout, /StockBot — Small Business Inventory/);
  assert.match(layout, /Inventory, cost of goods, sales tax/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview/);
});

test("includes preview, approval, protection, and audit controls", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /Check for updates/);
  assert.match(page, /Apply selected updates/);
  assert.match(page, /manualOverride/);
  assert.match(page, /taxUpdateHistory/);
  assert.match(page, /Look up exact address rate/);
  assert.match(page, /addressTaxRates/);
});

test("deduplicates imported expense records by external key", async () => {
  const [page, stateRoute] = await Promise.all([
    read("app/page.tsx"),
    read("app/api/state/route.ts"),
  ]);
  assert.match(page, /Amazon order ID, invoice number, or bank transaction ID/);
  assert.match(page, /amazonorderid/);
  assert.match(page, /isAmazonBusinessExport/);
  assert.match(page, /ordernettotal/);
  assert.match(page, /sellername/);
  assert.match(page, /amazoninternalproductcategory/);
  assert.match(page, /orders\.entries\(\)/);
  assert.match(page, /normalizeExpenseKey/);
  assert.match(page, /existingKeys\.has\(normalizedKey\) \|\| seen\.has\(normalizedKey\)/);
  assert.match(page, /if \(keys\.has\(key\)\) continue/);
  assert.match(page, /Import CSV or JSON/);
  assert.match(stateRoute, /expenseKeys\.has\(key\)/);
  assert.match(stateRoute, /Duplicate expense key/);
});

test("keeps external tax credentials on the server", async () => {
  const [route, example] = await Promise.all([
    read("app/api/tax-rates/route.ts"),
    read(".env.example"),
  ]);
  assert.match(route, /services\.maps\.cdtfa\.ca\.gov/);
  assert.match(route, /AVALARA_ACCOUNT_ID/);
  assert.match(route, /authorization: `Basic/);
  assert.match(example, /AVALARA_LICENSE_KEY=/);

  const page = await read("app/page.tsx");
  assert.doesNotMatch(page, /AVALARA_LICENSE_KEY|AVALARA_ACCOUNT_ID/);
});
