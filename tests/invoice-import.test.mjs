import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { generatedHistoricalSku, parseInvoiceImportText } from "../app/invoice-import.ts";

const fixture = new URL("./fixtures/historical-invoices.csv", import.meta.url);

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
