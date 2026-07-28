export const expenseCategories = [
  "Cost of goods",
  "Raw materials",
  "Resale item",
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

export const amazonBusinessCsvColumns = [
  "Order Date", "Order ID", "Account Group", "PO Number", "Order Quantity", "Currency", "Order Subtotal",
  "Order Shipping & Handling", "Order Promotion", "Order Tax", "Order Net Total", "Order Status", "Approver",
  "Order Receiving Status", "Order Received Quantity", "Account User", "Account User Email", "Invoice Status",
  "Total Amount", "Invoice Due Amount", "Invoice Issue Date", "Invoice Due Date", "Payment Reference ID", "Payment Date",
  "Payment Amount", "Payment Instrument Type", "Payment Identifier", "Amazon-Internal Product Category", "ASIN", "Title",
  "UNSPSC", "Segment", "Family", "Class", "Commodity", "Brand Code", "Brand", "Manufacturer", "National Stock Number",
  "Item model number", "Part number", "Product Condition", "Company Compliance", "Listed PPU", "Purchase PPU",
  "Item Quantity", "Item Subtotal", "Item Shipping & Handling", "Item Promotion", "Item Tax", "Item Net Total",
  "PO Line Item Id", "Tax Exemption Applied", "Tax Exemption Type", "Tax Exemption Opt Out", "Pricing Savings program",
  "Pricing Discount Applied", "Receiving Status", "Received Quantity", "Received Date", "Receiver Name", "Receiver Email",
  "GL Code", "Department", "Cost Center", "Project Code", "Location", "Custom Field 1", "Seller Name",
  "Seller Credentials", "Seller City", "Seller State", "Seller ZipCode",
] as const;

export type ExpenseCategory = typeof expenseCategories[number];

export type ImportedExpense = {
  externalKey: string;
  purchaseSource: string;
  vendor: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  note: string;
  source: "import";
  importedAt: string;
  fields: Record<string, string>;
};

export type ExpenseImportPreview = {
  fileName: string;
  ready: ImportedExpense[];
  updates: ImportedExpense[];
  duplicates: string[];
  invalid: string[];
  years: number[];
  readyTotal: number;
  columns: string[];
};

export const normalizeExpenseKey = (key: string) => key.trim().toLowerCase().replace(/\s+/g, "");

export const normalizeExpenseCategory = (value: unknown): ExpenseCategory => {
  const label = String(value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  const aliases: Record<string, ExpenseCategory> = {
    cogs: "Cost of goods", "cost of goods sold": "Cost of goods", inventory: "Cost of goods", merchandise: "Cost of goods",
    "raw material": "Raw materials", "raw materials": "Raw materials", material: "Raw materials", materials: "Raw materials",
    "resale item": "Resale item", "resale items": "Resale item", resale: "Resale item", "resale inventory": "Resale item",
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
  let sourceColumns: Array<{ key: string; label: string }> = [];
  const trimmed = text.trim();
  if (fileName.toLowerCase().endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(text) as unknown;
    const list = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed && Array.isArray((parsed as { expenses?: unknown[] }).expenses)
        ? (parsed as { expenses: unknown[] }).expenses
        : [];
    const objectRecords = list.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
    const labels = Array.from(new Set(objectRecords.flatMap((record) => Object.keys(record).filter((key) => key !== "fields"))));
    sourceColumns = labels.map((label) => ({ key: canonicalField(label), label }));
    records = objectRecords.map((record) => ({ ...canonicalRecord(record), fields: record.fields }));
  } else {
    const rows = parseCsvRows(text);
    if (rows.length > 1) {
      sourceColumns = rows[0].map((header, index) => {
        const label = header.replace(/^\uFEFF/, "").trim() || `Column ${index + 1}`;
        return { key: canonicalField(label), label };
      });
      records = rows.slice(1).map((row) => Object.fromEntries(sourceColumns.map((column, index) => [column.key, row[index] ?? ""])));
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
      const accountGroups = uniqueValues(["accountgroup"]);
      const titles = uniqueValues(["title", "description"]);
      const amazonCategories = uniqueValues(["amazoninternalproductcategory"]);
      const titleNote = titles.slice(0, 3).join("; ");
      const moreItems = titles.length > 3 ? ` (+${titles.length - 3} more items)` : "";
      const categoryNote = amazonCategories[0] ? ` · Amazon category: ${amazonCategories[0]}` : "";
      const fields = Object.fromEntries(sourceColumns.map((column) => {
        const values = Array.from(new Set(orderRows.map((record) => String(record[column.key] ?? "").trim()).filter(Boolean)));
        return [column.label, values.join(" · ")];
      }));
      return {
        externalkey: orderId,
        purchasesource: accountGroups.length ? `Amazon · ${accountGroups.join(" · ")}` : "Amazon",
        vendor: sellers.slice(0, 3).join(", ") || "Amazon",
        category: categoryForAmazonOrder(orderRows),
        amount: valueFor(first, ["ordernettotal"]),
        date: valueFor(first, ["orderdate"]),
        note: `${titleNote}${moreItems}${categoryNote}`,
        fields,
      };
    });
  }

  const ready: ImportedExpense[] = [];
  const updates: ImportedExpense[] = [];
  const duplicates: string[] = [];
  const invalid: string[] = [];
  const existingKeys = new Set(existingExternalKeys.map(normalizeExpenseKey));
  const seen = new Set<string>();
  const aliases = {
    key: ["externalkey", "amazonorderid", "orderid", "transactionid", "invoiceid", "receiptid", "recordid", "uniqueid", "id"],
    purchaseSource: ["purchasesource", "purchasesourcekey", "sourcekey", "accountsource", "accountname", "importsource"],
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
    if (seen.has(normalizedKey)) {
      duplicates.push(externalKey);
      return;
    }
    seen.add(normalizedKey);
    const nestedFields = record.fields && typeof record.fields === "object" && !Array.isArray(record.fields) ? record.fields as Record<string, unknown> : null;
    const fields = nestedFields
      ? Object.fromEntries(Object.entries(nestedFields).map(([key, value]) => [key, String(value ?? "")]))
      : Object.fromEntries(sourceColumns.map((column) => [column.label, String(record[column.key] ?? "").trim()]));
    const importedExpense: ImportedExpense = {
      externalKey,
      purchaseSource: String(valueFor(record, aliases.purchaseSource) ?? "").trim(),
      vendor: String(valueFor(record, aliases.vendor) ?? "Unknown vendor").trim(),
      category: normalizeExpenseCategory(valueFor(record, aliases.category)),
      amount,
      date,
      note: String(valueFor(record, aliases.note) ?? "").trim(),
      source: "import",
      importedAt,
      fields,
    };
    if (existingKeys.has(normalizedKey)) updates.push(importedExpense);
    else ready.push(importedExpense);
  });

  const importable = [...ready, ...updates];
  const years = Array.from(new Set(importable.map((expense) => Number(expense.date.slice(0, 4))))).filter(Number.isFinite).sort((a, b) => b - a);
  const readyTotal = Math.round(importable.reduce((sum, expense) => sum + expense.amount, 0) * 100) / 100;
  return { fileName, ready, updates, duplicates, invalid, years, readyTotal, columns: sourceColumns.map((column) => column.label) };
}
