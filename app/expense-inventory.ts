export type ParsedExpenseInventoryItem = {
  name: string;
  quantity: number;
  unitCost: number;
};

export function importedExpenseOrderQuantity(fields?: Record<string, string>) {
  const raw = ["Quantity", "Item Quantity", "Original Quantity"]
    .map((key) => fields?.[key]?.trim())
    .find(Boolean);
  return raw && /^\d[\d,]*$/.test(raw) ? positiveCount(raw) ?? 1 : 1;
}

const positiveCount = (value: string) => {
  const count = Number(value.replace(/,/g, ""));
  return Number.isSafeInteger(count) && count > 0 ? count : null;
};

const perUnitCost = (totalCost: number, quantity: number) => Math.round((totalCost / quantity) * 1_000_000) / 1_000_000;

const cleanInventoryName = (value: string, fallback: string) => {
  const cleaned = value
    .replace(/\(\s*\)|\[\s*\]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:|/·–—-]+|[\s,;:|/·–—-]+$/g, "")
    .replace(/^of\s+/i, "")
    .trim();
  return cleaned || fallback;
};

/**
 * Converts clear package/count language in an expense description into
 * individual inventory units. Ambiguous descriptions keep a quantity of one.
 */
export function parseExpenseInventoryDescription(description: string, totalCost: number, orderedPackages = 1): ParsedExpenseInventoryItem {
  const original = description.trim().replace(/\s+/g, " ") || "Untitled inventory item";
  const packageMultiplier = Number.isSafeInteger(orderedPackages) && orderedPackages > 0 ? orderedPackages : 1;
  const explicitPatterns: Array<{ expression: RegExp; quantity: (match: RegExpMatchArray) => number | null }> = [
    {
      expression: /\b(\d[\d,]*)\s*(?:packs?|boxes?|sets?)\s+of\s+(\d[\d,]*)\s*(?:pcs?|pieces?|units?|count|ct)?\b/gi,
      quantity: (match) => {
        const packages = positiveCount(match[1]);
        const pieces = positiveCount(match[2]);
        return packages && pieces ? packages * pieces : null;
      },
    },
    {
      expression: /\b(\d[\d,]*)\s*[x×]\s*(\d[\d,]*)\s*(?:pcs?|pieces?|units?|count|ct|packs?)\b/gi,
      quantity: (match) => {
        const groups = positiveCount(match[1]);
        const pieces = positiveCount(match[2]);
        return groups && pieces ? groups * pieces : null;
      },
    },
    {
      expression: /\b(?:packs?|boxes?|sets?)\s+of\s+(\d[\d,]*)\s*(?:pcs?|pieces?|units?|count|ct)?\b/gi,
      quantity: (match) => positiveCount(match[1]),
    },
    {
      expression: /\b(\d[\d,]*)\s*[- ]?\s*(?:pcs?|pieces?|units?|count|ct|packs?)\b/gi,
      quantity: (match) => positiveCount(match[1]),
    },
  ];

  for (const pattern of explicitPatterns) {
    const matches = Array.from(original.matchAll(pattern.expression));
    for (const match of matches.reverse()) {
      if (match.index === undefined) continue;
      const piecesPerPackage = pattern.quantity(match);
      if (!piecesPerPackage) continue;
      const quantity = piecesPerPackage * packageMultiplier;
      const withoutCount = `${original.slice(0, match.index)} ${original.slice(match.index + match[0].length)}`;
      return {
        name: cleanInventoryName(withoutCount, original),
        quantity,
        unitCost: perUnitCost(totalCost, quantity),
      };
    }
  }

  const leading = original.match(/^(\d[\d,]*)\s+(.+)$/);
  const numberTokens = original.match(/\b\d[\d,]*\b/g) ?? [];
  if (leading && numberTokens.length === 1) {
    const quantity = positiveCount(leading[1]);
    const looksLikeYear = quantity !== null && quantity >= 1900 && quantity <= 2100;
    if (quantity && !looksLikeYear) {
      return {
        name: cleanInventoryName(leading[2], original),
        quantity: quantity * packageMultiplier,
        unitCost: perUnitCost(totalCost, quantity * packageMultiplier),
      };
    }
  }

  if (packageMultiplier > 1) return { name: cleanInventoryName(original, original), quantity: packageMultiplier, unitCost: perUnitCost(totalCost, packageMultiplier) };
  return { name: cleanInventoryName(original, original), quantity: 1, unitCost: totalCost };
}
