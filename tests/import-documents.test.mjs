import assert from "node:assert/strict";
import test from "node:test";
import { detectImportSource, formatImportTimestamp, semanticImportContent, storedImportFileName } from "../app/import-documents.ts";

test("detects common import sources and creates timestamped safe names", () => {
  assert.equal(detectImportSource("orders.csv", "Order ID,ASIN,Title", "Amazon Business 2"), "amazon");
  assert.equal(detectImportSource("Ali Express orders.csv", "Order,Item", ""), "aliexpress");
  const date = new Date("2026-08-22T03:04:05.000Z");
  assert.equal(formatImportTimestamp(date), "20260822030405");
  assert.match(storedImportFileName("Order History.csv", "amazon", date, "12345678-abcd"), /^20260822030405-amazon-order-history-12345678-a\.csv$/);
});

test("semantic content ignores JSON formatting and CSV whitespace", () => {
  assert.equal(
    semanticImportContent("one.json", '{ "b": 2, "a": [1, 2] }'),
    semanticImportContent("two.json", '{\n  "a": [1,2],\n  "b": 2\n}'),
  );
  assert.equal(
    semanticImportContent("one.csv", 'Order ID, Title\nA-1, "Widget   pack"\n'),
    semanticImportContent("two.csv", ' Order ID ,Title\r\n A-1 ,"Widget pack"\r\n'),
  );
  assert.notEqual(
    semanticImportContent("one.csv", "Order ID,Title\nA-1,Widget"),
    semanticImportContent("two.csv", "Order ID,Title\nA-2,Widget"),
  );
});
