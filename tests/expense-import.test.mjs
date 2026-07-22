import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseExpenseImportText } from "../app/expense-import.ts";

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
  assert.equal(preview.ready[1].category, "Office supplies");
});

test("skips an Amazon order that already exists", async () => {
  const text = await readFile(fixture, "utf8");
  const preview = parseExpenseImportText(text, "orders.csv", [" 111-1111111-1111111 "], "2026-07-22T00:00:00.000Z");

  assert.equal(preview.ready.length, 1);
  assert.deepEqual(preview.duplicates, ["111-1111111-1111111"]);
});
