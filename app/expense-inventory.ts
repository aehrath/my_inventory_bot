export const expenseInventoryCategories = ["Raw materials", "Resale item"] as const;

export type ExpenseInventoryCategory = typeof expenseInventoryCategories[number];

export type ParsedExpenseInventoryItem = {
  name: string;
  quantity: number;
  unitCost: number;
};

const positiveCount = (value: string) => {
  const count = Number(value.replace(/,/g, ""));
  return Number.isSafeInteger(count) && count > 0 ? count : null;
};

const cleanInventoryName = (value: string, fallback: string) => {
  const cleaned = value
    .replace(/\(\s*\)|\[\s*\]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:|/–—-]+|[\s,;:|/–—-]+$/g, "")
    .replace(/^of\s+/i, "")
    .trim();
  return cleaned || fallback;
};

/**
 * Converts clear package/count language in an expense description into
 * individual inventory units. Ambiguous descriptions keep a quantity of one.
 */
export function parseExpenseInventoryDescription(description: string, totalCost: number): ParsedExpenseInventoryItem {
  const original = description.trim().replace(/\s+/g, " ") || "Untitled inventory item";
  const explicitPatterns: Array<{ expression: RegExp; quantity: (match: RegExpMatchArray) => number | null }> = [
    {
      expression: /\b(\d[\d,]*)\s*(?:packs?|boxes?|sets?)\s+of\s+(\d[\d,]*)\s*(?:pcs?|pieces?|units?|count|ct)?\b/i,
      quantity: (match) => {
        const packages = positiveCount(match[1]);
        const pieces = positiveCount(match[2]);
        return packages && pieces ? packages * pieces : null;
      },
    },
    {
      expression: /\b(\d[\d,]*)\s*[x×]\s*(\d[\d,]*)\s*(?:pcs?|pieces?|units?|count|ct|packs?)\b/i,
      quantity: (match) => {
        const groups = positiveCount(match[1]);
        const pieces = positiveCount(match[2]);
        return groups && pieces ? groups * pieces : null;
      },
    },
    {
      expression: /\b(?:packs?|boxes?|sets?)\s+of\s+(\d[\d,]*)\s*(?:pcs?|pieces?|units?|count|ct)?\b/i,
      quantity: (match) => positiveCount(match[1]),
    },
    {
      expression: /\b(\d[\d,]*)\s*[- ]?\s*(?:pcs?|pieces?|units?|count|ct|packs?)\b/i,
      quantity: (match) => positiveCount(match[1]),
    },
  ];

  for (const pattern of explicitPatterns) {
    const match = original.match(pattern.expression);
    if (!match || match.index === undefined) continue;
    const quantity = pattern.quantity(match);
    if (!quantity) continue;
    const withoutCount = `${original.slice(0, match.index)} ${original.slice(match.index + match[0].length)}`;
    return {
      name: cleanInventoryName(withoutCount, original),
      quantity,
      unitCost: totalCost / quantity,
    };
  }

  const leading = original.match(/^(\d[\d,]*)\s+(.+)$/);
  const numberTokens = original.match(/\b\d[\d,]*\b/g) ?? [];
  if (leading && numberTokens.length === 1) {
    const quantity = positiveCount(leading[1]);
    const looksLikeYear = quantity !== null && quantity >= 1900 && quantity <= 2100;
    if (quantity && !looksLikeYear) {
      return {
        name: cleanInventoryName(leading[2], original),
        quantity,
        unitCost: totalCost / quantity,
      };
    }
  }

  return { name: cleanInventoryName(original, original), quantity: 1, unitCost: totalCost };
}

export const isExpenseInventoryCategory = (category: string): category is ExpenseInventoryCategory =>
  expenseInventoryCategories.includes(category as ExpenseInventoryCategory);
