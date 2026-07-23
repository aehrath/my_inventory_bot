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
  assert.match(changelog, /version: "0\.21\.0"/);
  assert.match(changelog, /version: "0\.20\.0"/);
  assert.match(changelog, /version: "0\.19\.0"/);
  assert.match(changelog, /version: "0\.18\.0"/);
  assert.match(changelog, /version: "0\.17\.0"/);
  assert.match(changelog, /version: "0\.16\.0"/);
  assert.match(changelog, /version: "0\.15\.0"/);
  assert.match(changelog, /version: "0\.14\.0"/);
  assert.match(changelog, /version: "0\.13\.0"/);
  assert.match(changelog, /version: "0\.12\.0"/);
  assert.match(changelog, /version: "0\.11\.0"/);
  assert.match(changelog, /version: "0\.10\.0"/);
  assert.match(changelog, /version: "0\.9\.0"/);
  assert.match(changelog, /version: "0\.8\.0"/);
  assert.match(changelog, /version: "0\.7\.0"/);
  assert.match(changelog, /version: "0\.6\.0"/);
  assert.match(changelog, /version: "0\.1\.0"/);
  assert.match(markdown, /## 0\.21\.0 - 2026-07-23/);
  assert.match(markdown, /## 0\.20\.0 - 2026-07-23/);
  assert.match(markdown, /## 0\.19\.0 - 2026-07-23/);
  assert.match(markdown, /## 0\.18\.0 - 2026-07-23/);
  assert.match(markdown, /## 0\.17\.0 - 2026-07-22/);
  assert.match(markdown, /## 0\.16\.0 - 2026-07-22/);
  assert.match(markdown, /## 0\.15\.0 - 2026-07-22/);
  assert.match(markdown, /## 0\.14\.0 - 2026-07-22/);
  assert.match(markdown, /## 0\.13\.0 - 2026-07-22/);
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

test("includes item-level COGS and final-product tracking", async () => {
  const [page, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(page, /label: "COGS"/);
  assert.match(page, /function CogsCenter/);
  assert.match(page, /Sold-item COGS/);
  assert.match(page, /Used in final product/);
  assert.match(page, /production_use/);
  assert.match(page, /productName\?: string; productSku\?: string; finalProductId\?: string; finalProductName\?: string/);
  assert.match(page, /quantity \* movement\.unitCost/);
  assert.match(page, /Production-use cost/);
  assert.match(page, /Allocated, not yet sale COGS/);
  assert.match(page, /productName: product\.name, productSku: product\.sku/);
  assert.match(page, /className="cogsProductLink"/);
  assert.match(page, /href=\{`#product-\$\{linkedProduct\.id\}`\}/);
  assert.match(page, /onOpenProduct\(linkedProduct\)/);
  assert.match(page, /linkedFinalProductFor/);
  assert.match(page, /version: 9/);
  assert.match(styles, /\.cogsHead,.cogsRow/);
  assert.match(styles, /\.cogsProductLink/);
  assert.match(styles, /activityTag\.production_use/);
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

test("keeps expense imports isolated from products and inventory", async () => {
  const [page, expenseImport] = await Promise.all([
    read("app/page.tsx"),
    read("app/expense-import.ts"),
  ]);
  const expensesSection = page.slice(page.indexOf("function Expenses"), page.indexOf("function TaxCenter"));
  assert.doesNotMatch(expenseImport, /ImportedInventoryProduct|inventoryProductsFromRecords|parseProductPackSize/);
  assert.doesNotMatch(expensesSection, /expenseImport\.products|productAdditions|updatedProducts|importedQuantityForExpenseKeys/);
  assert.match(expensesSection, /expenses: \[\.\.\.additions, \.\.\.enriched\]/);
});

test("builds synchronized purchase inventory from expense categories", async () => {
  const [page, expenseImport, inventory, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/expense-import.ts"),
    read("app/expense-inventory.ts"),
    read("app/globals.css"),
  ]);
  assert.match(page, /label: "Purchase inventory"/);
  assert.match(page, /function PurchaseInventory/);
  assert.match(page, /isExpenseInventoryCategory\(expense\.category\)/);
  assert.match(page, /parseExpenseInventoryDescription\(expense\.note, expense\.amount\)/);
  assert.match(page, /expense\.category !== "Cost of goods" && !isExpenseInventoryCategory\(expense\.category\)/);
  assert.match(page, /Excludes COGS and inventory purchases/);
  assert.match(page, /className="expenseCategorySelect"/);
  assert.match(page, /Category for \$\{expense\.externalKey\}/);
  assert.match(page, /targetIds\.has\(item\.id\) \? \{ \.\.\.item, category \} : item/);
  assert.match(expenseImport, /"Raw materials"/);
  assert.match(expenseImport, /"Resale item"/);
  assert.match(inventory, /expenseInventoryCategories/);
  assert.match(inventory, /totalCost \/ quantity/);
  assert.match(styles, /\.purchaseInventoryHead/);
  assert.match(styles, /\.expenseCategorySelect/);
});

test("supports multi-select expense category changes and deletion", async () => {
  const [page, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(page, /selectedExpenseIds/);
  assert.match(page, /const selectExpenseRow = \(id: string, extendRange: boolean\)/);
  assert.match(page, /visibleExpenseIds\.slice\(start, end \+ 1\)/);
  assert.match(page, /selectExpenseRow\(expense\.id, event\.shiftKey\)/);
  assert.match(page, /role="row" tabIndex=\{0\} aria-selected=/);
  assert.match(page, /targetIds = selectedExpenseSet\.has\(expense\.id\) \? selectedExpenseSet : new Set\(\[expense\.id\]\)/);
  assert.match(page, /targetIds\.has\(item\.id\) \? \{ \.\.\.item, category \} : item/);
  assert.doesNotMatch(page, /Select all visible expenses|Bulk expense category|>Change category<\/button>/);
  assert.doesNotMatch(page, /expenseSelectionHead|expenseSelectionCell/);
  assert.match(page, /event\.key !== "Delete"/);
  assert.match(page, /window\.addEventListener\("keydown", handleDeleteKey\)/);
  assert.match(page, />Delete selected<\/button>/);
  assert.match(page, /current\.expenses\.filter\(\(expense\) => !selected\.has\(expense\.id\)\)/);
  assert.match(styles, /\.expenseSelectionBar/);
  assert.match(styles, /\.expenseRow\.selected/);
});

test("offers separate clear-all and demo-reset workspace actions", async () => {
  const [page, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(page, /const clearAllRecords = \(\) => setState/);
  assert.match(page, /products: \[\],\s+movements: \[\],\s+expenses: \[\],\s+customers: \[\]/);
  assert.match(page, /settings: \{ \.\.\.current\.settings, beginningInventory: 0 \}/);
  assert.match(page, />Clear all<\/button>/);
  assert.match(page, />Reset demo<\/button>/);
  assert.match(page, /Business and tax settings will be kept/);
  assert.match(styles, /\.dangerActions/);
});

test("imports historical invoices into duplicate-safe sales and customers", async () => {
  const [page, invoiceImport, stateRoute, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/invoice-import.ts"),
    read("app/api/state/route.ts"),
    read("app/globals.css"),
  ]);
  assert.match(page, /label: "Customers"/);
  assert.match(page, /Import old invoices/);
  assert.match(page, /downloadInvoiceTemplate/);
  assert.match(page, /soldByProduct/);
  assert.match(page, /sourceKey: line\.sourceKey/);
  assert.match(page, /products: \[\.\.\.productAdditions, \.\.\.current\.products\]/);
  assert.match(page, /on-hand quantities stay unchanged/);
  assert.match(invoiceImport, /invoice:\$\{normalizeInvoiceKey\(invoiceNumber\)\}:line:/);
  assert.match(invoiceImport, /customeremail/);
  assert.match(invoiceImport, /invoicetoken/);
  assert.match(invoiceImport, /parseInvoiceSummaryTitle/);
  assert.match(page, /Summary-only export/);
  assert.match(stateRoute, /Duplicate imported invoice line/);
  assert.match(styles, /\.customerHead,\.customerRow/);
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
