import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { amazonBusinessCsvColumns, amazonOrderHistoryCsvColumns, expenseAccountingClasses, expenseCategories, expenseCategoryDefinitions, expenseCostTimings, normalizeExpenseAsins, normalizeExpenseCategory, parseExpenseImportText } from "../app/expense-import.ts";

const fixture = new URL("./fixtures/amazon-business-orders.csv", import.meta.url);
const amazonOrderHistoryFixture = new URL("./fixtures/amazon-order-history.csv", import.meta.url);

test("groups Amazon Business rows into unique order expenses", async () => {
  const text = await readFile(fixture, "utf8");
  const preview = parseExpenseImportText(text, "orders.csv", [], "2026-07-22T00:00:00.000Z");

  assert.equal(preview.ready.length, 2);
  assert.equal(preview.invalid.length, 1);
  assert.deepEqual(preview.years, [2025]);
  assert.equal(preview.readyTotal, 104.48);
  assert.equal(preview.ready[0].externalKey, "111-1111111-1111111");
  assert.equal(preview.ready[0].amount, 87.98);
  assert.equal(preview.ready[0].category, "Office equipment");
  assert.match(preview.ready[0].note, /Commercial laminator/);
  assert.match(preview.ready[0].note, /Laminating film/);
  assert.equal(preview.ready[0].fields["Order ID"], "111-1111111-1111111");
  assert.equal(Object.keys(preview.ready[0].fields).length, 10);
  assert.match(preview.ready[0].fields.Title, /Commercial laminator/);
  assert.match(preview.ready[0].fields.Title, /Laminating film/);
  assert.equal(preview.ready[1].category, "Office supplies");
});

test("enriches an existing Amazon order without creating a duplicate", async () => {
  const text = await readFile(fixture, "utf8");
  const preview = parseExpenseImportText(text, "orders.csv", [" 111-1111111-1111111 "], "2026-07-22T00:00:00.000Z");

  assert.equal(preview.ready.length, 1);
  assert.equal(preview.updates.length, 1);
  assert.equal(preview.updates[0].externalKey, "111-1111111-1111111");
  assert.deepEqual(preview.duplicates, []);
});

test("groups Amazon consumer Order History items and sums every line total", async () => {
  const text = await readFile(amazonOrderHistoryFixture, "utf8");
  const preview = parseExpenseImportText(text, "Order History.csv", [], "2026-07-28T00:00:00.000Z");

  assert.equal(preview.ready.length, 2);
  assert.equal(preview.duplicates.length, 0);
  assert.equal(preview.skipped.length, 1);
  assert.equal(preview.invalid.length, 0);
  assert.match(preview.skipped[0], /cancelled Amazon order/);
  assert.equal(preview.readyTotal, 27.8);
  assert.equal(preview.ready[0].externalKey, "111-1111111-1111111");
  assert.equal(preview.ready[0].amount, 22.55);
  assert.equal(preview.ready[0].vendor, "Amazon.com");
  assert.equal(preview.ready[0].purchaseSource, "Amazon · Amazon.com");
  assert.deepEqual(preview.ready[0].asins, ["B000000001", "B000000002"]);
  assert.equal(preview.ready[0].date, "2026-01-15");
  assert.match(preview.ready[0].note, /Shipping labels, 200 pieces/);
  assert.match(preview.ready[0].note, /Laminating pouches/);
  assert.equal(preview.ready[0].fields["Order ID"], "111-1111111-1111111");
  assert.equal(Object.keys(preview.ready[0].fields).length, 28);
  assert.match(preview.ready[0].fields["Product Name"], /Shipping labels, 200 pieces/);
  assert.match(preview.ready[0].fields["Product Name"], /Laminating pouches/);
});

test("uses an Amazon Order History order ID to correct an existing expense", async () => {
  const text = await readFile(amazonOrderHistoryFixture, "utf8");
  const preview = parseExpenseImportText(text, "Order History.csv", ["111-1111111-1111111"], "2026-07-28T00:00:00.000Z");

  assert.equal(preview.ready.length, 1);
  assert.equal(preview.updates.length, 1);
  assert.equal(preview.updates[0].amount, 22.55);
  assert.equal(preview.updates[0].vendor, "Amazon.com");
  assert.match(preview.updates[0].note, /Laminating pouches/);
});

test("suggests and imports purchase source keys", () => {
  const amazon = [
    "Order Date,Order ID,Account Group,Order Net Total,Title,Seller Name",
    "01/15/2026,444-4444444-4444444,Studio account,25.00,Shipping labels,Amazon",
  ].join("\n");
  const amazonPreview = parseExpenseImportText(amazon, "amazon-orders.csv", []);
  assert.equal(amazonPreview.ready[0].purchaseSource, "Amazon · Studio account");

  const generic = [
    "external_key,purchase_source,vendor,date,amount,category,note",
    "SUPPLY-1,Wholesale portal,Supply Co.,2026-01-16,40.00,Raw materials,Cotton bags",
  ].join("\n");
  const genericPreview = parseExpenseImportText(generic, "purchases.csv", []);
  assert.equal(genericPreview.ready[0].purchaseSource, "Wholesale portal");
});

test("imports an optional personal flag without defaulting missing values", () => {
  const text = [
    "external_key,purchase_source,vendor,date,amount,category,personal,note",
    "PERSONAL-1,Amazon Personal,Amazon,2026-01-17,18.00,Office supplies,yes,Home printer paper",
    "BUSINESS-1,Amazon Business,Amazon,2026-01-18,28.00,Office supplies,false,Business printer paper",
    "UNSET-1,Wholesale,Supply Co.,2026-01-19,38.00,Office supplies,,Shipping labels",
  ].join("\n");
  const preview = parseExpenseImportText(text, "mixed-purchases.csv", []);

  assert.equal(preview.ready[0].personal, true);
  assert.equal(preview.ready[1].personal, false);
  assert.equal(preview.ready[2].personal, undefined);
});

test("defines every column in the provided Amazon Business export", () => {
  assert.equal(amazonBusinessCsvColumns.length, 73);
  assert.equal(amazonBusinessCsvColumns[0], "Order Date");
  assert.equal(amazonBusinessCsvColumns.at(-1), "Seller ZipCode");
});

test("defines every column in the Amazon consumer Order History export", () => {
  assert.equal(amazonOrderHistoryCsvColumns.length, 28);
  assert.equal(amazonOrderHistoryCsvColumns[0], "ASIN");
  assert.equal(amazonOrderHistoryCsvColumns.at(-1), "Website");
  assert.ok(amazonOrderHistoryCsvColumns.includes("Product Name"));
  assert.ok(amazonOrderHistoryCsvColumns.includes("Total Amount"));
});

test("normalizes and deduplicates imported ASIN values", () => {
  assert.deepEqual(normalizeExpenseAsins("b000000001 · B000000002 · b000000001"), ["B000000001", "B000000002"]);
  const text = [
    "external_key,vendor,ASIN,date,amount,category,note",
    "ASIN-1,Amazon,b0test0001,2026-01-20,29.00,Office supplies,Printer paper",
  ].join("\n");
  const preview = parseExpenseImportText(text, "amazon.csv", []);
  assert.deepEqual(preview.ready[0].asins, ["B0TEST0001"]);
});

test("includes inventory categories and normalizes their common labels", () => {
  assert.ok(expenseCategories.includes("Raw materials"));
  assert.ok(expenseCategories.includes("Resale item"));
  assert.equal(normalizeExpenseCategory("raw material"), "Raw materials");
  assert.equal(normalizeExpenseCategory("resale inventory"), "Resale item");
});

test("separates accounting class from product-cost timing", () => {
  assert.deepEqual(expenseAccountingClasses, ["Product cost", "Operating expense", "Taxes & fees"]);
  assert.deepEqual(expenseCostTimings, ["Track in inventory", "Recognize directly as COGS"]);
  assert.equal(expenseCategoryDefinitions.length, expenseCategories.length);
  assert.deepEqual(expenseCategoryDefinitions.find((category) => category.name === "Raw materials"), { name: "Raw materials", accountingClass: "Product cost", costTiming: "Track in inventory" });
  assert.deepEqual(expenseCategoryDefinitions.find((category) => category.name === "Cost of goods"), { name: "Cost of goods", accountingClass: "Product cost", costTiming: "Recognize directly as COGS" });
  assert.deepEqual(expenseCategoryDefinitions.find((category) => category.name === "Utilities"), { name: "Utilities", accountingClass: "Operating expense" });
  assert.deepEqual(expenseCategoryDefinitions.find((category) => category.name === "Taxes & licenses"), { name: "Taxes & licenses", accountingClass: "Taxes & fees" });
});

test("preserves configured custom categories during expense import", () => {
  assert.equal(normalizeExpenseCategory("subscriptions", ["Subscriptions"]), "Subscriptions");
  const text = [
    "external_key,vendor,date,amount,category,note",
    "SAAS-1,Software Co.,2026-01-20,29.00,Subscriptions,Monthly service",
  ].join("\n");
  const preview = parseExpenseImportText(text, "software.csv", [], "2026-07-28T00:00:00.000Z", ["Subscriptions"]);

  assert.equal(preview.ready[0].category, "Subscriptions");
});
