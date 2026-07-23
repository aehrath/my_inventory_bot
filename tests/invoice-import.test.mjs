import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { generatedHistoricalSku, parseInvoiceImportText, parseInvoiceSummaryTitle } from "../app/invoice-import.ts";

const fixture = new URL("./fixtures/historical-invoices.csv", import.meta.url);
const summaryFixture = new URL("./fixtures/invoice-summary-export.csv", import.meta.url);

test("imports only unique historical invoice lines", async () => {
  const text = await readFile(fixture, "utf8");
  const preview = parseInvoiceImportText(text, "historical-invoices.csv", ["invoice:inv-100:line:1"]);

  assert.equal(preview.ready.length, 2);
  assert.equal(preview.duplicates.length, 2);
  assert.equal(preview.invoiceCount, 2);
  assert.equal(preview.totalQuantity, 4);
  assert.equal(preview.totalRevenue, 79);
  assert.equal(preview.customers.length, 2);
  assert.equal(preview.ready[0].sourceKey, "invoice:inv-100:line:2");
  assert.equal(preview.ready[0].salesTax, 4.86);
});

test("flattens JSON invoices and creates a stable SKU when none is supplied", () => {
  const text = JSON.stringify({ invoices: [{
    invoiceNumber: "OLD-7",
    invoiceDate: "2025-02-03",
    customerName: "Northwind Goods",
    customerEmail: "hello@northwind.example",
    shippingState: "wa",
    items: [{ lineItemId: "A", productName: "Handmade bowl", quantity: 2, unitPrice: 31 }],
  }] });
  const preview = parseInvoiceImportText(text, "invoices.json", []);

  assert.equal(preview.ready.length, 1);
  assert.equal(preview.ready[0].sku, generatedHistoricalSku("Handmade bowl"));
  assert.equal(preview.customers[0].address.state, "WA");
});

test("imports invoice-summary exports without line-item columns", async () => {
  const text = await readFile(summaryFixture, "utf8");
  const preview = parseInvoiceImportText(text, "invoices-export.csv", ["invoice:inv:TOKEN-1"]);

  assert.equal(preview.ready.length, 3);
  assert.equal(preview.duplicates.length, 1);
  assert.equal(preview.invalid.length, 0);
  assert.equal(preview.invoiceCount, 3);
  assert.equal(preview.totalQuantity, 213);
  assert.equal(preview.totalRevenue, 369.75);
  assert.equal(preview.ready[0].sourceKey, "invoice:inv:token-2");
  assert.equal(preview.ready[0].productName, "Guitar Picks Customized + initial design work");
  assert.equal(preview.ready[0].quantity, 200);
  assert.equal(preview.ready[0].unitPrice, 108.75 / 200);
  assert.equal(preview.ready[1].productName, "50 Pens and 12 Hats");
  assert.equal(preview.ready[1].quantity, 1);
  assert.equal(preview.ready[2].productName, "Customized hats");
  assert.equal(preview.ready[2].quantity, 12);
  assert.equal(preview.customers.length, 2);
  assert.equal(preview.customers[0].address.state, "");
});

test("derives quantity only from unambiguous invoice titles", () => {
  assert.deepEqual(parseInvoiceSummaryTitle("24 Black Customized Hats"), { name: "Black Customized Hats", quantity: 24 });
  assert.deepEqual(parseInvoiceSummaryTitle("Customized hats x12"), { name: "Customized hats", quantity: 12 });
  assert.deepEqual(parseInvoiceSummaryTitle("50 Pens and 12 Hats"), { name: "50 Pens and 12 Hats", quantity: 1 });
  assert.deepEqual(parseInvoiceSummaryTitle("Bottle Openers, 2-Sided Color Engraved"), { name: "Bottle Openers, 2-Sided Color Engraved", quantity: 1 });
});
