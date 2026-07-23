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

test("includes a visible release changelog", async () => {
  const [page, changelog, markdown] = await Promise.all([
    read("app/page.tsx"),
    read("app/changelog.ts"),
    read("CHANGELOG.md"),
  ]);
  assert.match(page, /label: "Changelog"/);
  assert.match(page, /What&apos;s new in StockBot/);
  assert.match(page, /changelogReleases\.map/);
  assert.match(changelog, /version: "0\.12\.0"/);
  assert.match(changelog, /version: "0\.11\.0"/);
  assert.match(changelog, /version: "0\.10\.0"/);
  assert.match(changelog, /version: "0\.9\.0"/);
  assert.match(changelog, /version: "0\.8\.0"/);
  assert.match(changelog, /version: "0\.7\.0"/);
  assert.match(changelog, /version: "0\.6\.0"/);
  assert.match(changelog, /version: "0\.1\.0"/);
  assert.match(markdown, /## 0\.12\.0 - 2026-07-22/);
  assert.match(markdown, /## 0\.11\.0 - 2026-07-22/);
  assert.match(markdown, /## 0\.10\.0 - 2026-07-22/);
  assert.match(markdown, /## 0\.9\.0 - 2026-07-22/);
  assert.match(markdown, /## 0\.8\.0 - 2026-07-22/);
  assert.match(markdown, /## 0\.7\.0 - 2026-07-22/);
  assert.match(markdown, /## 0\.6\.0 - 2026-07-22/);
  assert.match(markdown, /## 0\.1\.0 - 2026-07-22/);
});

test("stores and displays product vendors", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /name: string; vendor: string; category: string/);
  assert.match(page, /key: "vendor", label: "Vendor"/);
  assert.match(page, /className="vendorCell"/);
  assert.match(page, /<label className="wide">Vendor<input/);
  assert.match(page, /product\.vendor\.trim\(\)/);
  assert.match(page, /Search products, vendors, SKU, or category/);
});

test("truncates long product descriptions and exposes the full text on hover", async () => {
  const [page, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(page, /className="productDescription"/);
  assert.match(page, /<strong title=\{p\.name\}>\{p\.name\}<\/strong>/);
  assert.match(styles, /\.productDescription\{min-width:0\}/);
  assert.match(styles, /white-space:nowrap;overflow:hidden;text-overflow:ellipsis/);
});

test("uses True Wealth-style sortable headers on every table", async () => {
  const [page, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(page, /className="tableHead"/);
  assert.match(page, /className="ledgerHead"/);
  assert.match(page, /className="expenseHead"/);
  assert.match(page, /className="sortPair"/);
  assert.match(page, /aria-sort=/);
  assert.match(page, /changeExpenseSort/);
  assert.match(styles, /border-bottom:2px solid #2f7d32/);
  assert.match(styles, /background:#f5f5f5/);
  assert.match(styles, /stockHeaderCell\.sorted\.asc/);
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
  const [page, expenseImport, stateRoute] = await Promise.all([
    read("app/page.tsx"),
    read("app/expense-import.ts"),
    read("app/api/state/route.ts"),
  ]);
  assert.match(page, /Amazon order ID, invoice number, or bank transaction ID/);
  assert.match(page, /label: "Expenses"/);
  assert.match(page, /All years/);
  assert.match(page, /Imported years/);
  assert.match(page, /Display columns/);
  assert.match(page, /Select all/);
  assert.match(page, /Drag visible table headers to reorder them/);
  assert.match(page, /expenseVisibleColumns/);
  assert.match(page, /expenseColumnOrder/);
  assert.match(expenseImport, /amazonorderid/);
  assert.match(expenseImport, /isAmazonBusinessExport/);
  assert.match(expenseImport, /ordernettotal/);
  assert.match(expenseImport, /sellername/);
  assert.match(expenseImport, /amazoninternalproductcategory/);
  assert.match(expenseImport, /orders\.entries\(\)/);
  assert.match(expenseImport, /amazonBusinessCsvColumns/);
  assert.match(expenseImport, /fields/);
  assert.match(page, /normalizeExpenseKey/);
  assert.match(expenseImport, /existingKeys\.has\(normalizedKey\).*updates\.push/);
  assert.match(page, /if \(keys\.has\(key\)\) continue/);
  assert.match(page, /Import CSV or JSON/);
  assert.match(stateRoute, /expenseKeys\.has\(key\)/);
  assert.match(stateRoute, /Duplicate expense key/);
});

test("uses new expense keys to add imported products and stock exactly once", async () => {
  const [page, expenseImport] = await Promise.all([
    read("app/page.tsx"),
    read("app/expense-import.ts"),
  ]);
  assert.match(expenseImport, /expenseQuantities/);
  assert.match(expenseImport, /ready\.map\(\(expense\) => expense\.externalKey\)/);
  assert.match(page, /addedExpenseKeys/);
  assert.match(page, /quantity: product\.quantity \+ importedQuantity\(imported\)/);
  assert.match(page, /re-imported expenses never add stock twice/);
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
