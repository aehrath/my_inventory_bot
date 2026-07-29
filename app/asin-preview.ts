export type AsinPreview = {
  asin: string;
  imageUrl: string;
  title: string;
};

export const normalizePreviewAsin = (value: unknown) => {
  const asin = String(value ?? "").trim().toUpperCase();
  return /^[A-Z0-9]{10}$/.test(asin) ? asin : "";
};

const decodeHtmlAttribute = (value: string) => value
  .replaceAll("&amp;", "&")
  .replaceAll("&quot;", '"')
  .replaceAll("&#39;", "'")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">");

const attributeValue = (tag: string, name: string) => {
  const match = tag.match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`, "i"));
  return decodeHtmlAttribute(match?.[1] ?? match?.[2] ?? "");
};

const isAmazonImageUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (
      url.hostname === "m.media-amazon.com"
      || url.hostname.endsWith(".ssl-images-amazon.com")
      || url.hostname.endsWith(".images-amazon.com")
    );
  } catch {
    return false;
  }
};

export function amazonPreviewFromHtml(html: string, requestedAsin: string): AsinPreview | null {
  const asin = normalizePreviewAsin(requestedAsin);
  if (!asin) return null;
  const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
  const tag = imageTags.find((candidate) => normalizePreviewAsin(attributeValue(candidate, "data-fling-asin")) === asin)
    ?? imageTags.find((candidate) => attributeValue(candidate, "id") === "main-image");
  if (!tag) return null;
  const imageUrl = [
    attributeValue(tag, "data-a-hires"),
    attributeValue(tag, "data-midres-replacement"),
    attributeValue(tag, "src"),
  ].find(isAmazonImageUrl) ?? "";
  if (!imageUrl) return null;
  return { asin, imageUrl, title: attributeValue(tag, "alt").trim() };
}
