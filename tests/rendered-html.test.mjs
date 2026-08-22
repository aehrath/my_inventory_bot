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
  assert.match(changelog, /version: "0\.26\.0"/);
  assert.match(changelog, /version: "0\.25\.0"/);
  assert.match(changelog, /version: "0\.24\.0"/);
  assert.match(changelog, /version: "0\.23\.0"/);
  assert.match(changelog, /version: "0\.22\.0"/);
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
  assert.match(markdown, /## 0\.26\.0 - 2026-07-28/);
  assert.match(markdown, /## 0\.25\.0 - 2026-07-28/);
  assert.match(markdown, /## 0\.24\.0 - 2026-07-28/);
  assert.match(markdown, /## 0\.23\.0 - 2026-07-28/);
  assert.match(markdown, /## 0\.22\.0 - 2026-07-28/);
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

test("includes versioned Git data history with an all-field diff grid", async () => {
  const [page, history, format, route, styles, hosting] = await Promise.all([
    read("app/page.tsx"),
    read("app/data-history-view.tsx"),
    read("app/data-format.ts"),
    read("app/api/data-history/route.ts"),
    read("app/globals.css"),
    read(".openai/hosting.json"),
  ]);
  assert.match(page, /id: "history", label: "Data history"/);
  assert.match(page, /<DataHistory saveStatus=\{saving\}/);
  assert.match(history, /Every data change/);
  assert.match(history, /Also push a real Git commit to GitHub/);
  assert.match(history, /token is sent for this push, then cleared and never stored/);
  assert.match(history, /Nothing is hidden/);
  assert.match(history, /Empty values are labeled “Empty,” and unchanged values remain visible/);
  assert.match(history, /Previous value/);
  assert.match(history, /Current value/);
  assert.match(history, /stockHeaderCell/);
  assert.match(format, /STOCKBOT_DATA_FORMAT_VERSION = 2/);
  assert.match(format, /diffStockBotDataFiles/);
  assert.match(route, /pushStockBotDataToGitHub/);
  assert.match(styles, /\.dataDiffGrid/);
  assert.match(hosting, /"r2": "DATA_SNAPSHOTS"/);
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
  assert.match(page, /version: 17/);
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
  assert.match(expenseImport, /isAmazonOrderHistoryExport/);
  assert.match(expenseImport, /ordernettotal/);
  assert.match(expenseImport, /productname/);
  assert.match(expenseImport, /totalamount/);
  assert.match(expenseImport, /sellername/);
  assert.match(expenseImport, /amazoninternalproductcategory/);
  assert.match(expenseImport, /orders\.entries\(\)/);
  assert.match(expenseImport, /amazonBusinessCsvColumns/);
  assert.match(expenseImport, /amazonOrderHistoryCsvColumns/);
  assert.match(expenseImport, /fields/);
  assert.match(page, /normalizeExpenseKey/);
  assert.match(expenseImport, /existingKeys\.has\(normalizedKey\).*updates\.push/);
  assert.match(page, /if \(keys\.has\(key\)\) continue/);
  assert.match(page, /Import CSV or JSON/);
  assert.match(stateRoute, /expenseKeys\.has\(key\)/);
  assert.match(stateRoute, /Duplicate expense key/);
});

test("tracks sortable and filterable purchase sources", async () => {
  const [page, expenseImport, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/expense-import.ts"),
    read("app/globals.css"),
  ]);
  assert.match(page, /purchaseSource: string/);
  assert.match(page, /key: "purchaseSource", label: "Purchase source"/);
  assert.match(page, /Purchase source key/);
  assert.match(page, /Expense purchase source/);
  assert.match(page, /Purchased inventory source/);
  assert.match(page, /expenseSort\.key === "purchaseSource"/);
  assert.match(page, /sort\.key === "purchaseSource"/);
  assert.match(page, /setExpensePurchaseSource\(sourceKey\)/);
  assert.match(page, /purchase_source,vendor/);
  assert.match(expenseImport, /purchasesourcekey/);
  assert.match(expenseImport, /Amazon · \$\{accountGroups\.join/);
  assert.match(styles, /min-width:1390px/);
});

test("tracks imported ASINs as a visible sortable expense field", async () => {
  const [page, expenseImport, styles, previewRoute] = await Promise.all([
    read("app/page.tsx"),
    read("app/expense-import.ts"),
    read("app/globals.css"),
    read("app/api/asin-preview/route.ts"),
  ]);
  assert.match(page, /key: "asin", label: "ASIN\(s\)"/);
  assert.match(page, /expenseSort\.key === "asin"/);
  assert.match(page, /expense\.asins\.join/);
  assert.match(page, /ASIN \$\{expense\.asins/);
  assert.match(page, /expense\.asins\.join\(", "\)/);
  assert.match(page, /https:\/\/www\.amazon\.com\/dp\/\$\{asin\}/);
  assert.match(page, /target="_blank"/);
  assert.match(page, /Open Amazon product \$\{asin\}/);
  assert.match(styles, /\.asinLinks a/);
  assert.match(page, /className="asinTooltip" role="group" aria-label="ASIN links and product preview for this order"/);
  assert.match(page, /Amazon product preview/);
  assert.match(page, /\/api\/asin-preview\?asin=/);
  assert.match(page, /Loading product image…/);
  assert.match(page, /Product image unavailable/);
  assert.match(page, /onMouseEnter=\{\(\) => setActiveAsinPreview\(asin\)\}/);
  assert.match(page, /Open Amazon product \$\{asin\} from tooltip/);
  assert.match(styles, /\.asinLinks:hover>\.asinTooltip,.asinLinks:focus-within>\.asinTooltip\{display:block\}/);
  assert.match(styles, /\.asinImagePreview/);
  assert.match(styles, /\.asinTooltipList a/);
  assert.match(previewRoute, /https:\/\/www\.amazon\.com\/gp\/aw\/d\/\$\{asin\}/);
  assert.match(previewRoute, /s-maxage=604800/);
  assert.match(page, /savedVersion < 16/);
  assert.match(expenseImport, /asins: string\[\]/);
  assert.match(expenseImport, /normalizeExpenseAsins/);
  assert.match(expenseImport, /asinnumber/);
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

test("combines purchased inventory and recognized costs in the COGS workspace", async () => {
  const [page, expenseImport, inventory, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/expense-import.ts"),
    read("app/expense-inventory.ts"),
    read("app/globals.css"),
  ]);
  assert.doesNotMatch(page, /\{ id: "purchaseInventory"/);
  assert.match(page, /function PurchasedInventorySection/);
  assert.match(page, /<PurchasedInventorySection state=\{state\}/);
  assert.match(page, /isTrackedInventoryCategory\(expense\.category, state\.settings\)/);
  assert.match(page, /isDirectCogsCategory\(expense\.category, state\.settings\)/);
  assert.match(page, /parseExpenseInventoryDescription\(expense\.note, expense\.amount\)/);
  assert.match(page, /Inventory waiting to become COGS/);
  assert.match(page, /Product costs waiting to become COGS/);
  assert.match(page, /className="expenseCategorySelect"/);
  assert.match(page, /Category for \$\{expense\.externalKey\}/);
  assert.match(page, /targetIds\.has\(item\.id\) \? \{ \.\.\.item, category \} : item/);
  assert.match(expenseImport, /\{ name: "Raw materials", accountingClass: "Product cost", costTiming: "Track in inventory" \}/);
  assert.match(expenseImport, /\{ name: "Resale item", accountingClass: "Product cost", costTiming: "Track in inventory" \}/);
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
  assert.match(page, /const clearAllRecords = async \(\) =>/);
  assert.match(page, /products: \[\],\s+movements: \[\],\s+expenses: \[\],\s+customers: \[\]/);
  assert.match(page, /settings: \{ \.\.\.state\.settings, beginningInventory: 0 \}/);
  assert.match(page, /fetch\("\/api\/state", \{ method: "PUT"/);
  assert.match(page, /window\.location\.reload\(\)/);
  assert.match(page, /clearing \? "Clearing…" : "Clear all"/);
  assert.match(page, />Reset demo<\/button>/);
  assert.match(page, /Business and tax settings will be kept/);
  assert.match(styles, /\.dangerActions/);
});

test("keeps personal expenses visible but out of business calculations", async () => {
  const [page, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(page, /personal: boolean/);
  assert.match(page, /key: "personal", label: "Personal"/);
  assert.match(page, /Expense business or personal use/);
  assert.match(page, /expenseSort\.key === "personal"/);
  assert.match(page, /!e\.personal && new Date/);
  assert.match(page, /!expense\.personal && isTrackedInventoryCategory/);
  assert.match(page, /const businessExpenses = selectedExpenses\.filter\(\(expense\) => !expense\.personal\)/);
  assert.match(page, /Personal expense \$\{expense\.externalKey\}/);
  assert.match(page, /targetIds\.has\(item\.id\) \? \{ \.\.\.item, personal \} : item/);
  assert.match(page, /personal: Boolean\(expense\.personal\)/);
  assert.match(page, /category,personal,note/);
  assert.match(styles, /\.expenseRow\.personal/);
  assert.match(styles, /\.expensePersonalToggle/);
});

test("separates persistent expense accounting class from product-cost timing", async () => {
  const [page, expenseImport, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/expense-import.ts"),
    read("app/globals.css"),
  ]);
  assert.match(page, /customExpenseCategories: CustomExpenseCategory\[\]/);
  assert.match(page, /expenseCategoryOverrides: Record<string, ExpenseCategoryTreatment>/);
  assert.match(page, /const normalizeCustomExpenseCategories/);
  assert.match(page, /const normalizeExpenseCategoryOverrides/);
  assert.match(page, /const expenseCategoryDefinitionsFor/);
  assert.match(page, /const expenseCategoriesFor/);
  assert.match(page, /const expenseAccountingClassFor/);
  assert.match(page, /const expenseCostTimingFor/);
  assert.match(page, /const isTrackedInventoryCategory/);
  assert.match(page, /const isDirectCogsCategory/);
  assert.match(page, /if \(type === "Inventory"\) return \{ accountingClass: "Product cost", costTiming: "Track in inventory" \}/);
  assert.match(page, /if \(type === "COGS"\) return \{ accountingClass: "Product cost", costTiming: "Recognize directly as COGS" \}/);
  assert.match(page, /normalizeExpenseCategoryOverrides\(incoming\.settings\?\.expenseCategoryOverrides, incoming\.settings\?\.expenseCategoryTypeOverrides\)/);
  assert.match(page, /savedVersion < 15/);
  assert.match(page, /const createExpenseCategory = \(event: FormEvent\)/);
  assert.match(page, /const updateExpenseCategoryTreatment =/);
  assert.match(page, /const updateExpenseAccountingClass =/);
  assert.match(page, /const updateExpenseCostTiming =/);
  assert.match(page, /const renameExpenseCategory =/);
  assert.match(page, /const deleteExpenseCategory =/);
  assert.match(page, />Edit categories<\/button>/);
  assert.match(page, /title="Edit expense categories"/);
  assert.match(page, /Built-in names stay fixed/);
  assert.match(page, /expense\.category === name \? \{ \.\.\.expense, category: fallback \}/);
  assert.match(page, /aria-label="New expense category"/);
  assert.match(page, /aria-label="New expense accounting class"/);
  assert.match(page, /aria-label="New expense cost timing"/);
  assert.match(page, /customExpenseCategories: \[\.\.\.current\.settings\.customExpenseCategories, \{ name: category, \.\.\.treatment \}\]/);
  assert.match(page, /availableExpenseCategories\.map\(\(category\) => <option/);
  assert.match(page, /<ExpenseModal categories=\{expenseCategoryDefinitionsFor\(state\.settings\)\}/);
  assert.match(page, /normalizeExpenseCategory\(expense\.category, customExpenseCategories\.map/);
  assert.match(page, /key: "accountingClass", label: "Accounting class"/);
  assert.match(page, /key: "costTiming", label: "Cost timing"/);
  assert.match(page, /expenseSort\.key === "accountingClass"/);
  assert.match(page, /expenseSort\.key === "costTiming"/);
  assert.match(page, /aria-label="Expense accounting class"/);
  assert.match(page, /aria-label="Expense cost timing"/);
  assert.match(expenseImport, /customCategories: readonly string\[\] = \[\]/);
  assert.match(expenseImport, /expenseAccountingClasses = \["Product cost", "Operating expense", "Taxes & fees"\]/);
  assert.match(expenseImport, /expenseCostTimings = \["Track in inventory", "Recognize directly as COGS"\]/);
  assert.match(expenseImport, /normalizeExpenseCategory\(valueFor\(record, aliases\.category\), customCategories\)/);
  assert.match(styles, /\.expenseCategoryCreator/);
  assert.match(styles, /\.categoryEditorRow/);
  assert.match(styles, /\.accountingClassBadge/);
  assert.match(styles, /\.costTimingBadge/);
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
