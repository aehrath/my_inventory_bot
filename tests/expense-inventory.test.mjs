import assert from "node:assert/strict";
import test from "node:test";
import { parseExpenseInventoryDescription } from "../app/expense-inventory.ts";

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
