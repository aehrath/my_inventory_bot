import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { amazonBusinessCsvColumns, expenseCategories, normalizeExpenseCategory, parseExpenseImportText } from "../app/expense-import.ts";

const fixture = new URL("./fixtures/amazon-business-orders.csv", import.meta.url);

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

test("includes inventory categories and normalizes their common labels", () => {
  assert.ok(expenseCategories.includes("Raw materials"));
  assert.ok(expenseCategories.includes("Resale item"));
  assert.equal(normalizeExpenseCategory("raw material"), "Raw materials");
  assert.equal(normalizeExpenseCategory("resale inventory"), "Resale item");
});
