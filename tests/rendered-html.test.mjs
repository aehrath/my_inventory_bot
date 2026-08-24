import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("ships InventoryBot product metadata", async () => {
  const layout = await read("app/layout.tsx");
  assert.match(layout, /InventoryBot — Small Business Inventory/);
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
  assert.match(page, /What&apos;s new in InventoryBot/);
  assert.match(page, /changelogReleases\.map/);
  assert.match(changelog, /version: "0\.35\.1"/);
  assert.match(changelog, /version: "0\.35\.0"/);
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
  assert.match(markdown, /## 0\.35\.1 - 2026-08-22/);
  assert.match(markdown, /## 0\.35\.0 - 2026-08-22/);
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

test("rejects the unused local preview WebSocket probe before vinext redirects it", async () => {
  const worker = await read("worker/index.ts");
  assert.match(worker, /url\.pathname === "\/ws\/socket\.io"/);
  assert.match(worker, /url\.pathname === "\/ws\/socket\.io\/"/);
  assert.match(worker, /new Response\(null, \{ status: 404 \}\)/);
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
  assert.match(history, /inventoryHeaderCell/);
  assert.match(format, /INVENTORYBOT_DATA_FORMAT_VERSION = 3/);
  assert.match(format, /diffInventoryBotDataFiles/);
  assert.match(route, /pushInventoryBotDataToGitHub/);
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
  assert.match(page, /version: 20/);
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
  assert.match(styles, /inventoryHeaderCell\.sorted\.asc/);
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
  assert.match(expenseImport, /normalizeExpensePurchaseSource/);
  assert.match(expenseImport, /purchasesource: "Amazon"/);
  assert.doesNotMatch(expenseImport, /accountGroups\.join/);
  assert.match(page, /const purchaseSource = normalizeExpensePurchaseSource\(expense\.purchaseSource\)/);
  assert.match(page, /const sourceKey = normalizeExpensePurchaseSource\(importPurchaseSource\)/);
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

test("retains canceled purchase records without counting or showing them by default", async () => {
  const [page, expenseImport, format, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/expense-import.ts"),
    read("app/data-format.ts"),
    read("app/globals.css"),
  ]);
  assert.match(expenseImport, /canceled: boolean/);
  assert.match(expenseImport, /normalizeExpenseCanceled/);
  assert.match(expenseImport, /filter\(\(expense\) => !expense\.canceled\)/);
  assert.match(page, /const \[showCanceledOrders, setShowCanceledOrders\] = useState\(false\)/);
  assert.match(page, /Show canceled orders/);
  assert.match(page, /showCanceledOrders \|\| !expense\.canceled/);
  assert.match(page, /!e\.personal && !e\.canceled/);
  assert.match(page, /!expense\.personal && !expense\.canceled/);
  assert.match(page, /canceled: update\.canceled/);
  assert.match(page, /expenseStatus/);
  assert.match(format, /"personal", "canceled", "source"/);
  assert.match(styles, /\.expenseRow\.canceled/);
});

test("splits expense source seller and date with fallbacks for older Amazon rows", async () => {
  const [page, sourceDocuments, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/source-documents.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(page, /key: "documentSeller", label: "Seller \/ source"/);
  assert.match(page, /key: "documentDate", label: "Source date"/);
  assert.match(page, /SourceDocumentSellerCell/);
  assert.match(page, /SourceDocumentDateCell/);
  assert.match(page, /fallback=\{expense\.vendor && expense\.vendor !== "Unknown vendor" \? expense\.vendor : expense\.purchaseSource\}/);
  assert.match(page, /fallback=\{expense\.importedAt \|\| expense\.date\}/);
  assert.match(page, /purchaseSource === "Amazon" \? "Amazon" : "Unknown vendor"/);
  assert.match(page, /normalizeExpenseDate\(importedOrderDate\)/);
  assert.match(page, /savedVersion < 20/);
  assert.match(sourceDocuments, /sourceLabel\(fallback\)/);
  assert.match(sourceDocuments, /fallback \? shortDate\(fallback\) : "—"/);
  assert.match(styles, /\.sourceDocumentFallback/);
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
  assert.match(page, /Materials and resale goods waiting to become COGS/);
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
  const [page, styles, botUi] = await Promise.all([
    read("app/page.tsx"),
    read("app/globals.css"),
    read("../My Bot UI/src/index.tsx"),
  ]);
  assert.match(page, /selectedExpenseIds/);
  assert.match(page, /const selectExpenseRow = expenseSelection\.toggle/);
  assert.match(botUi, /visibleIds\.slice\(start, end \+ 1\)/);
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

test("offers shared bounded workspace undo and redo with visible buttons and keyboard shortcuts", async () => {
  const [page, styles, changelog, dataGrid] = await Promise.all([
    read("app/page.tsx"),
    read("app/globals.css"),
    read("app/changelog.ts"),
    read("../My Bot UI/src/index.tsx"),
  ]);
  assert.match(page, /const MAX_UNDO_STEPS = 50/);
  assert.match(page, /useUndoRedoState\(seed, MAX_UNDO_STEPS\)/);
  assert.match(dataGrid, /useState\(\{ present: initial, past: \[\] as T\[\], future: \[\] as T\[\] \}\)/);
  assert.match(dataGrid, /past: \[\.\.\.current\.past\.slice\(-\(maximumSteps - 1\)\), current\.present\]/);
  assert.match(dataGrid, /const undo = useCallback/);
  assert.match(dataGrid, /present: current\.past\[current\.past\.length - 1\]/);
  assert.match(dataGrid, /future: \[current\.present, \.\.\.current\.future\]\.slice\(0, maximumSteps\)/);
  assert.match(dataGrid, /const redo = useCallback/);
  assert.match(dataGrid, /present: current\.future\[0\]/);
  assert.match(dataGrid, /future: current\.future\.slice\(1\)/);
  assert.match(page, /replaceState\(normalizeState\(payload\.state\)\)/);
  assert.match(page, /className="secondary undoButton" disabled=\{!canUndo\}/);
  assert.match(page, /className="secondary redoButton" disabled=\{!canRedo\}/);
  assert.match(page, /Command\/Ctrl\+Z/);
  assert.match(page, /Command\/Ctrl\+Shift\+Z/);
  assert.match(page, /event\.key\.toLowerCase\(\) === "z" \|\| event\.code === "KeyZ"/);
  assert.doesNotMatch(page, /event\.shiftKey \|\| event\.altKey/);
  assert.match(page, /target\?\.matches\("textarea"\)/);
  assert.match(page, /target\?\.matches\("input"\) && textInputTypes\.has/);
  assert.doesNotMatch(page, /matches\("input, textarea, select"\)/);
  assert.match(page, /event\.stopPropagation\(\)/);
  assert.match(page, /if \(event\.shiftKey\) redo\(\); else undo\(\)/);
  assert.match(page, /window\.addEventListener\("keydown", handleUndoShortcut, true\)/);
  assert.match(styles, /\.topActions \.undoButton:disabled,\.topActions \.redoButton:disabled/);
  assert.match(changelog, /version: "0\.40\.0"/);
});

test("shares row selection, shift ranges, and retry-safe bulk deletion through My Bot UI", async () => {
  const [page, botUi] = await Promise.all([
    read("app/page.tsx"),
    read("../My Bot UI/src/index.tsx"),
  ]);
  assert.match(page, /useDataGridSelection\(visibleExpenseIds\)/);
  assert.match(page, /const selectExpenseRow = expenseSelection\.toggle/);
  assert.match(page, /expenseSelection\.remove\(\[expense\.id\]\)/);
  assert.match(botUi, /export function useDataGridSelection/);
  assert.match(botUi, /visibleIds\.slice\(start, end \+ 1\)/);
  assert.match(botUi, /allVisibleSelected/);
  assert.match(botUi, /Shift-click selects a range/);
  assert.match(botUi, /onClick=\{\(event\) => \{ if \(!rowClickIsInteractive\(event\.target\)\) selection\.toggle\(id, event\.shiftKey\); \}\}/);
  assert.match(botUi, /if \(deleted !== false\) selection\.remove\(ids\)/);
  assert.match(botUi, /Preserve selection for retry/);
  assert.match(botUi, /event\.key !== "Delete" && event\.key !== "Backspace"/);
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
  assert.match(page, /!e\.personal && !e\.canceled && new Date/);
  assert.match(page, /!expense\.personal && !expense\.canceled && isTrackedInventoryCategory/);
  assert.match(page, /const businessExpenses = selectedExpenses\.filter\(\(expense\) => !expense\.personal && !expense\.canceled\)/);
  assert.match(page, /Personal expense \$\{expense\.externalKey\}/);
  assert.match(page, /targetIds\.has\(item\.id\) \? \{ \.\.\.item, personal \} : item/);
  assert.match(page, /personal: Boolean\(expense\.personal\)/);
  assert.match(page, /category,personal,canceled,note/);
  assert.match(styles, /\.expenseRow\.personal/);
  assert.match(styles, /\.expensePersonalToggle/);
});

test("reviews business use for every imported expense before saving", async () => {
  const [page, styles] = await Promise.all([
    read("app/page.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(page, /const \[expenseImportQuery, setExpenseImportQuery\] = useState\(""\)/);
  assert.match(page, /const setImportBusinessUse =/);
  assert.match(page, /personal: !business/);
  assert.match(page, /existingUse\.get\(normalizeExpenseKey\(expense\.externalKey\)\)/);
  assert.match(page, /aria-label="Search imported expenses"/);
  assert.match(page, />Mark all business<\/button>/);
  assert.match(page, />Mark all unrelated<\/button>/);
  assert.match(page, /Business purchase \$\{expense\.externalKey\}/);
  assert.match(page, /excluded from inventory, COGS, expenses, and tax calculations/);
  assert.doesNotMatch(page, /importPreviewExpenses\.slice\(0, 6\)/);
  assert.match(styles, /\.expenseImportReviewList/);
  assert.match(styles, /\.importBusinessToggle/);
  assert.match(styles, /\.importExpenseReviewRow\.unrelated/);
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
  assert.match(expenseImport, /expenseAccountingClasses = \["Product cost", "Operating expense", "Capital asset", "Taxes & fees", "Needs review"\]/);
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
