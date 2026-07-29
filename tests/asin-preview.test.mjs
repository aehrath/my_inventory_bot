import assert from "node:assert/strict";
import test from "node:test";
import { amazonPreviewFromHtml, normalizePreviewAsin } from "../app/asin-preview.ts";

test("extracts the matching Amazon mobile product image", () => {
  const html = `
    <img alt="Wrong product" src="https://m.media-amazon.com/images/I/wrong.jpg" data-fling-asin="B000000000" />
    <img alt="Shipping labels &amp; tape" src="https://m.media-amazon.com/images/I/small.jpg"
      data-fling-asin="B0TEST0001" data-midres-replacement="https://m.media-amazon.com/images/I/medium.jpg"
      data-a-hires="https://m.media-amazon.com/images/I/large.jpg" id="main-image" />
  `;
  assert.deepEqual(amazonPreviewFromHtml(html, "b0test0001"), {
    asin: "B0TEST0001",
    imageUrl: "https://m.media-amazon.com/images/I/large.jpg",
    title: "Shipping labels & tape",
  });
});

test("rejects invalid ASINs and non-Amazon image hosts", () => {
  assert.equal(normalizePreviewAsin("not-an-asin"), "");
  assert.equal(amazonPreviewFromHtml('<img id="main-image" src="https://example.com/product.jpg" />', "B0TEST0001"), null);
});
