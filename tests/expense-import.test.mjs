import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { amazonBusinessCsvColumns, importedQuantityForExpenseKeys, parseExpenseImportText } from "../app/expense-import.ts";

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

test("defines every column in the provided Amazon Business export", () => {
  assert.equal(amazonBusinessCsvColumns.length, 73);
  assert.equal(amazonBusinessCsvColumns[0], "Order Date");
  assert.equal(amazonBusinessCsvColumns.at(-1), "Seller ZipCode");
});

test("adds product quantities only from new expense keys", () => {
  const csv = [
    "Order Date,Order ID,Order Net Total,ASIN,Title,Seller Name,Amazon-Internal Product Category,Item Quantity,Purchase PPU,Item Tax",
    "01/10/2026,NEW-1,20.00,ASIN-A,Blue widget,Widget Works,Office Products,2,8.00,1.20",
    "01/10/2026,NEW-1,20.00,ASIN-A,Blue widget,Widget Works,Office Products,1,8.00,0.60",
    "01/11/2026,OLD-1,32.00,ASIN-A,Blue widget,Widget Works,Office Products,99,8.00,2.00",
    "01/12/2026,NEW-2,40.00,ASIN-A,Blue widget,Widget Works,Office Products,4,8.00,2.40",
    "01/12/2026,NEW-2,40.00,ASIN-B,Red widget,Second Seller,Office Products,1,12.00,0.00",
  ].join("\n");
  const preview = parseExpenseImportText(csv, "orders.csv", ["OLD-1"], "2026-07-22T00:00:00.000Z", ["ASIN-A"]);

  assert.equal(preview.ready.length, 2);
  assert.equal(preview.updates.length, 1);
  assert.equal(preview.products.length, 2);
  assert.equal(preview.products[0].sku, "ASIN-A");
  assert.equal(preview.products[0].existing, true);
  assert.equal(preview.products[0].quantity, 7);
  assert.deepEqual(preview.products[0].expenseQuantities, { "new-1": 3, "new-2": 4 });
  assert.equal(preview.products[0].vendor, "Widget Works");
  assert.equal(preview.products[0].unitCost, 8);
  assert.equal(preview.products[0].salesTaxPaid, true);
  assert.equal(preview.products[1].existing, false);
  assert.equal(preview.products[1].quantity, 1);
  assert.equal(importedQuantityForExpenseKeys(preview.products[0], new Set(["new-2"])), 4);
});

test("re-importing an existing expense never offers inventory quantity again", () => {
  const csv = [
    "Order Date,Order ID,Order Net Total,ASIN,Title,Item Quantity",
    "01/10/2026,ORDER-1,20.00,ASIN-A,Blue widget,3",
  ].join("\n");
  const preview = parseExpenseImportText(csv, "orders.csv", ["ORDER-1"], "2026-07-22T00:00:00.000Z", ["ASIN-A"]);

  assert.equal(preview.ready.length, 0);
  assert.equal(preview.updates.length, 1);
  assert.deepEqual(preview.products, []);
});
