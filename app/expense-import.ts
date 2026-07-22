export const expenseCategories = [
  "Cost of goods",
  "Utilities",
  "Rent",
  "Office equipment",
  "Office supplies",
  "Advertising & marketing",
  "Shipping & postage",
  "Insurance",
  "Professional services",
  "Repairs & maintenance",
  "Travel",
  "Meals",
  "Taxes & licenses",
  "Bank & processing fees",
  "Other",
] as const;

export type ExpenseCategory = typeof expenseCategories[number];

export type ImportedExpense = {
  externalKey: string;
  vendor: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  note: string;
  source: "import";
  importedAt: string;
};

export type ExpenseImportPreview = {
  fileName: string;
  ready: ImportedExpense[];
  duplicates: string[];
  invalid: string[];
  years: number[];
  readyTotal: number;
};

export const normalizeExpenseKey = (key: string) => key.trim().toLowerCase().replace(/\s+/g, "");

export const normalizeExpenseCategory = (value: unknown): ExpenseCategory => {
  const label = String(value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  const aliases: Record<string, ExpenseCategory> = {
    cogs: "Cost of goods", "cost of goods sold": "Cost of goods", inventory: "Cost of goods", merchandise: "Cost of goods",
    utility: "Utilities", utilities: "Utilities", electric: "Utilities", electricity: "Utilities", internet: "Utilities", phone: "Utilities",
    rent: "Rent", lease: "Rent", equipment: "Office equipment", "office equipment": "Office equipment", computer: "Office equipment",
    office: "Office supplies", supplies: "Office supplies", "office supplies": "Office supplies",
    advertising: "Advertising & marketing", marketing: "Advertising & marketing", "advertising marketing": "Advertising & marketing",
    shipping: "Shipping & postage", postage: "Shipping & postage", freight: "Shipping & postage", "shipping postage": "Shipping & postage",
    insurance: "Insurance", legal: "Professional services", accounting: "Professional services", "professional services": "Professional services",
    repairs: "Repairs & maintenance", maintenance: "Repairs & maintenance", "repairs maintenance": "Repairs & maintenance",
    travel: "Travel", meals: "Meals", food: "Meals", taxes: "Taxes & licenses", licenses: "Taxes & licenses", "taxes licenses": "Taxes & licenses",
    fees: "Bank & processing fees", banking: "Bank & processing fees", "bank fees": "Bank & processing fees", "processing fees": "Bank & processing fees",
    other: "Other",
  };
  return expenseCategories.find((category) => category.toLowerCase() === label) ?? aliases[label] ?? "Other";
};

export const normalizeExpenseDate = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const usDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usDate) return `${usDate[3]}-${usDate[1].padStart(2, "0")}-${usDate[2].padStart(2, "0")}`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

const parseExpenseAmount = (value: unknown) => {
  if (typeof value === "number") return value;
  const raw = String(value ?? "").trim();
  const negative = /^\(.*\)$/.test(raw);
  const parsed = Number(raw.replace(/[,$()\s]/g, ""));
  return negative ? -parsed : parsed;
};

const canonicalField = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const parseCsvRows = (text: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value); value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value); value = "";
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else value += character;
  }
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
};

const canonicalRecord = (record: Record<string, unknown>) => Object.fromEntries(
  Object.entries(record).map(([key, value]) => [canonicalField(key), value]),
);

const valueFor = (record: Record<string, unknown>, names: readonly string[]) => names
  .map((name) => record[name])
  .find((value) => value !== undefined && String(value).trim() !== "");

const categoryForAmazonOrder = (rows: Array<Record<string, unknown>>): ExpenseCategory => {
  const valuesForField = (field: string) => rows.map((row) => String(row[field] ?? "").trim()).filter(Boolean);
  const taxonomy = Array.from(new Set([
    ...valuesForField("amazoninternalproductcategory"),
    ...valuesForField("segment"),
    ...valuesForField("family"),
    ...valuesForField("class"),
    ...valuesForField("commodity"),
  ])).join(" ").toLowerCase();
  if (/office supplies|stationery|paper|writing|label|packaging/.test(taxonomy)) return "Office supplies";
  if (/office equipment|office machine|computer|electronic|printer|monitor|furniture/.test(taxonomy)) return "Office equipment";
  if (/office product/.test(taxonomy)) return "Office supplies";
  if (/shipping|postage|mailing|freight/.test(taxonomy)) return "Shipping & postage";
  return "Other";
};

export function parseExpenseImportText(
  text: string,
  fileName: string,
  existingExternalKeys: readonly string[],
  importedAt = new Date().toISOString(),
): ExpenseImportPreview {
  let records: Array<Record<string, unknown>> = [];
  const trimmed = text.trim();
  if (fileName.toLowerCase().endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(text) as unknown;
    const list = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed && Array.isArray((parsed as { expenses?: unknown[] }).expenses)
        ? (parsed as { expenses: unknown[] }).expenses
        : [];
    records = list
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
      .map(canonicalRecord);
  } else {
    const rows = parseCsvRows(text);
    if (rows.length > 1) {
      const headers = rows[0].map(canonicalField);
      records = rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
    }
  }

  const isAmazonBusinessExport = records.some((record) => valueFor(record, ["orderid"]) && valueFor(record, ["ordernettotal"]) !== undefined);
  if (isAmazonBusinessExport) {
    const orders = new Map<string, Array<Record<string, unknown>>>();
    for (const record of records) {
      const orderId = String(valueFor(record, ["orderid"]) ?? "").trim();
      if (!orderId) continue;
      orders.set(orderId, [...(orders.get(orderId) ?? []), record]);
    }
    records = Array.from(orders.entries()).map(([orderId, orderRows]) => {
      const first = orderRows[0];
      const uniqueValues = (fields: readonly string[]) => Array.from(new Set(orderRows.map((record) => String(valueFor(record, fields) ?? "").trim()).filter(Boolean)));
      const sellers = uniqueValues(["sellername", "vendor", "merchant"]);
      const titles = uniqueValues(["title", "description"]);
      const amazonCategories = uniqueValues(["amazoninternalproductcategory"]);
      const titleNote = titles.slice(0, 3).join("; ");
      const moreItems = titles.length > 3 ? ` (+${titles.length - 3} more items)` : "";
      const categoryNote = amazonCategories[0] ? ` · Amazon category: ${amazonCategories[0]}` : "";
      return {
        externalkey: orderId,
        vendor: sellers.slice(0, 3).join(", ") || "Amazon",
        category: categoryForAmazonOrder(orderRows),
        amount: valueFor(first, ["ordernettotal"]),
        date: valueFor(first, ["orderdate"]),
        note: `${titleNote}${moreItems}${categoryNote}`,
      };
    });
  }

  const ready: ImportedExpense[] = [];
  const duplicates: string[] = [];
  const invalid: string[] = [];
  const existingKeys = new Set(existingExternalKeys.map(normalizeExpenseKey));
  const seen = new Set<string>();
  const aliases = {
    key: ["externalkey", "amazonorderid", "orderid", "transactionid", "invoiceid", "receiptid", "recordid", "uniqueid", "id"],
    vendor: ["vendor", "merchant", "sellername", "seller", "supplier", "payee", "store"],
    category: ["category", "expensecategory", "amazoninternalproductcategory", "type", "account"],
    amount: ["amount", "ordernettotal", "itemnettotal", "paymentamount", "totalamount", "total", "ordertotal", "charge", "price", "expenseamount"],
    date: ["date", "orderdate", "transactiondate", "purchasedate", "posteddate"],
    note: ["note", "title", "description", "memo", "item", "product", "details"],
  } as const;

  records.forEach((record, index) => {
    const externalKey = String(valueFor(record, aliases.key) ?? "").trim();
    const normalizedKey = normalizeExpenseKey(externalKey);
    const amount = parseExpenseAmount(valueFor(record, aliases.amount));
    const date = normalizeExpenseDate(valueFor(record, aliases.date));
    if (!normalizedKey || !Number.isFinite(amount) || amount <= 0 || !date) {
      const label = externalKey ? `Record ${externalKey}` : `Row ${index + 2}`;
      invalid.push(`${label}: ${!normalizedKey ? "missing unique key" : !date ? "invalid date" : "invalid amount"}`);
      return;
    }
    if (existingKeys.has(normalizedKey) || seen.has(normalizedKey)) {
      duplicates.push(externalKey);
      return;
    }
    seen.add(normalizedKey);
    ready.push({
      externalKey,
      vendor: String(valueFor(record, aliases.vendor) ?? "Unknown vendor").trim(),
      category: normalizeExpenseCategory(valueFor(record, aliases.category)),
      amount,
      date,
      note: String(valueFor(record, aliases.note) ?? "").trim(),
      source: "import",
      importedAt,
    });
  });

  const years = Array.from(new Set(ready.map((expense) => Number(expense.date.slice(0, 4))))).filter(Number.isFinite).sort((a, b) => b - a);
  const readyTotal = Math.round(ready.reduce((sum, expense) => sum + expense.amount, 0) * 100) / 100;
  return { fileName, ready, duplicates, invalid, years, readyTotal };
}
