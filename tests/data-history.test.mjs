import assert from "node:assert/strict";
import test from "node:test";
import { createStockBotDataFile, dataDiffValue, diffStockBotDataFiles, stableStockBotDataJson, STOCKBOT_DATA_FORMAT_ID, STOCKBOT_DATA_FORMAT_VERSION } from "../app/data-format.ts";
import { validateGitHubTarget } from "../app/github-data-push.ts";

const state = {
  version: 17,
  products: [{ id: "p1", sku: "SKU-1", name: "Widget", quantity: 2, unitCost: 3, salesTaxPaid: false }],
  movements: [],
  expenses: [
    { id: "e2", externalKey: "ORDER-2", fields: { ASIN: "", Color: "Blue" } },
    { id: "e1", externalKey: "ORDER-1", fields: { ASIN: "B000000001" } },
  ],
  customers: [],
  settings: {
    businessName: "Test Shop",
    taxYear: 2026,
    beginningInventory: 0,
    ownAddress: { line1: "", city: "", state: "CA", postalCode: "" },
    stateTaxes: { CA: { enabled: true, rate: 7.25 } },
    localTaxRules: [],
    addressTaxRates: [],
    taxUpdateHistory: [],
    customExpenseCategories: [],
    expenseCategoryOverrides: {},
    expenseColumnOrder: ["date"],
    expenseVisibleColumns: ["date"],
  },
};

test("creates a stable, explicitly versioned full-data format", () => {
  const file = createStockBotDataFile(state);
  assert.equal(file.format, STOCKBOT_DATA_FORMAT_ID);
  assert.equal(file.formatVersion, STOCKBOT_DATA_FORMAT_VERSION);
  assert.equal(file.applicationStateVersion, 17);
  assert.equal(file.data.products[0].vendor, null);
  assert.deepEqual(file.data.expenses.map((expense) => expense.id), ["e1", "e2"]);
  assert.deepEqual(file.data.expenses[0].fields, { ASIN: "B000000001", Color: "" });
  assert.deepEqual(file.data.expenses[1].fields, { ASIN: "", Color: "Blue" });
  assert.equal(stableStockBotDataJson(file), stableStockBotDataJson(createStockBotDataFile({ ...state, expenses: [...state.expenses].reverse() })));
});

test("diff grid exposes empty, unchanged, modified, added, and removed fields", () => {
  const previous = createStockBotDataFile(state);
  const current = createStockBotDataFile({
    ...state,
    products: [{ ...state.products[0], quantity: 5 }],
    expenses: [{ ...state.expenses[0], fields: { ASIN: "", Color: "Green" } }, { id: "e3", externalKey: "ORDER-3", fields: {} }],
  });
  const rows = diffStockBotDataFiles(previous, current);
  assert.ok(rows.some((row) => row.dataset === "products" && row.field === "quantity" && row.change === "modified" && row.previous === 2 && row.current === 5));
  assert.ok(rows.some((row) => row.dataset === "products" && row.field === "vendor" && row.change === "unchanged" && row.previous === null));
  assert.ok(rows.some((row) => row.dataset === "expenses" && row.recordKey === "e1" && row.change === "removed"));
  assert.ok(rows.some((row) => row.dataset === "expenses" && row.recordKey === "e3" && row.change === "added"));
  assert.ok(rows.some((row) => row.dataset === "expenses" && row.recordKey === "e1" && row.field === "fields.Color" && row.change === "removed" && row.previous === "" && row.current === undefined));
  assert.ok(rows.some((row) => row.dataset === "expenses" && row.field === "fields.ASIN" && dataDiffValue(row.current) === ""));
});

test("validates safe GitHub repository targets without retaining credentials", () => {
  assert.deepEqual(validateGitHubTarget({ provider: "github", repository: "owner/private-data", branch: "data/history", path: "accounting/stockbot-data.json", token: "secret" }), {
    repository: "owner/private-data",
    branch: "data/history",
    path: "accounting/stockbot-data.json",
    token: "secret",
  });
  assert.throws(() => validateGitHubTarget({ provider: "github", repository: "invalid", branch: "main", path: "stockbot-data.json", token: "secret" }), /owner\/repository/);
  assert.throws(() => validateGitHubTarget({ provider: "github", repository: "owner/repo", branch: "main", path: "..\/secret.json", token: "secret" }), /safe relative/);
});

test("publishes a matching JSON schema route for data format version 2", async () => {
  const { GET } = await import("../app/data-format/v2/route.ts");
  const response = await GET();
  const schema = await response.json();
  assert.equal(schema.$id, "https://stockbot-inventory.aehrath.chatgpt.site/data-format/v2");
  assert.equal(schema.properties.format.const, STOCKBOT_DATA_FORMAT_ID);
  assert.equal(schema.properties.formatVersion.const, STOCKBOT_DATA_FORMAT_VERSION);
  assert.ok(schema.properties.data.required.includes("expenses"));
  assert.ok(schema.properties.data.required.includes("importDocuments"));
  assert.ok(schema.properties.data.required.includes("importDocumentLinks"));
});
