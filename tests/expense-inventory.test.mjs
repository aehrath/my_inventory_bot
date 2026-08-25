import assert from "node:assert/strict";
import test from "node:test";
import { importedExpenseOrderQuantity, parseExpenseInventoryDescription } from "../app/expense-inventory.ts";

test("extracts explicit piece and pack counts and divides total cost", () => {
  assert.deepEqual(parseExpenseInventoryDescription("Blue widgets (200 PCS)", 80), {
    name: "Blue widgets",
    quantity: 200,
    unitCost: 0.4,
  });
  assert.deepEqual(parseExpenseInventoryDescription("Replacement filters 10 pack", 50), {
    name: "Replacement filters",
    quantity: 10,
    unitCost: 5,
  });
  assert.deepEqual(parseExpenseInventoryDescription("Pack of 12 brass blanks", 24), {
    name: "brass blanks",
    quantity: 12,
    unitCost: 2,
  });
});

test("supports grouped packages and safe leading quantities", () => {
  assert.deepEqual(parseExpenseInventoryDescription("2 packs of 10 cotton bags", 40), {
    name: "cotton bags",
    quantity: 20,
    unitCost: 2,
  });
  assert.deepEqual(parseExpenseInventoryDescription("24 unfinished frames", 120), {
    name: "unfinished frames",
    quantity: 24,
    unitCost: 5,
  });
});

test("keeps ambiguous or year-like descriptions as one item", () => {
  assert.deepEqual(parseExpenseInventoryDescription("50 Pens and 12 Hats", 100), {
    name: "50 Pens and 12 Hats",
    quantity: 1,
    unitCost: 100,
  });
  assert.deepEqual(parseExpenseInventoryDescription("2026 planner", 18), {
    name: "2026 planner",
    quantity: 1,
    unitCost: 18,
  });
});

test("expands AliExpress piece labels and multiplies by the ordered quantity", () => {
  assert.deepEqual(parseExpenseInventoryDescription("100PCS 74LS153 DIP chips", 29.8, 1), {
    name: "74LS153 DIP chips",
    quantity: 100,
    unitCost: 0.298,
  });
  assert.deepEqual(parseExpenseInventoryDescription("Connector assortment · 100piece", 25, 1), {
    name: "Connector assortment",
    quantity: 100,
    unitCost: 0.25,
  });
  assert.deepEqual(parseExpenseInventoryDescription("5/10PCS RS232 connector · Male head, 10PCS", 17.25, 5), {
    name: "5/10PCS RS232 connector · Male head",
    quantity: 50,
    unitCost: 0.345,
  });
  assert.deepEqual(parseExpenseInventoryDescription("Display module", 10.05, 5), {
    name: "Display module",
    quantity: 5,
    unitCost: 2.01,
  });
});

test("keeps the selected AliExpress option as the inventory name while expanding its pack", () => {
  assert.deepEqual(parseExpenseInventoryDescription("10PCS SN74LS158N", 37.2, 10), {
    name: "SN74LS158N",
    quantity: 100,
    unitCost: 0.372,
  });
});

test("reads a single imported marketplace order quantity safely", () => {
  assert.equal(importedExpenseOrderQuantity({ Quantity: "5" }), 5);
  assert.equal(importedExpenseOrderQuantity({ "Item Quantity": "100" }), 100);
  assert.equal(importedExpenseOrderQuantity({ "Original Quantity": "2" }), 2);
  assert.equal(importedExpenseOrderQuantity({ "Item Quantity": "1 · 2" }), 1);
  assert.equal(importedExpenseOrderQuantity(), 1);
});
