export const expenseAccountingClasses = ["Product cost", "Operating expense", "Capital asset", "Taxes & fees", "Needs review"] as const;
export type ExpenseAccountingClass = typeof expenseAccountingClasses[number];
export const expenseCostTimings = ["Track in inventory", "Recognize directly as COGS"] as const;
export type ExpenseCostTiming = typeof expenseCostTimings[number];
export type ExpenseCategoryDefinition = {
  name: string;
  accountingClass: ExpenseAccountingClass;
  costTiming?: ExpenseCostTiming;
};

export const expenseCategoryDefinitions: readonly ExpenseCategoryDefinition[] = [
  { name: "Cost of goods", accountingClass: "Product cost", costTiming: "Recognize directly as COGS" },
  { name: "Raw materials", accountingClass: "Product cost", costTiming: "Track in inventory" },
  { name: "Resale item", accountingClass: "Product cost", costTiming: "Track in inventory" },
  { name: "Utilities", accountingClass: "Operating expense" },
  { name: "Rent", accountingClass: "Operating expense" },
  { name: "Office equipment", accountingClass: "Capital asset" },
  { name: "Office supplies", accountingClass: "Operating expense" },
  { name: "Advertising & marketing", accountingClass: "Operating expense" },
  { name: "Shipping & postage", accountingClass: "Operating expense" },
  { name: "Insurance", accountingClass: "Operating expense" },
  { name: "Professional services", accountingClass: "Operating expense" },
  { name: "Repairs & maintenance", accountingClass: "Operating expense" },
  { name: "Travel", accountingClass: "Operating expense" },
  { name: "Meals", accountingClass: "Operating expense" },
  { name: "Taxes & licenses", accountingClass: "Taxes & fees" },
  { name: "Bank & processing fees", accountingClass: "Taxes & fees" },
  { name: "Other", accountingClass: "Operating expense" },
  { name: "Review needed", accountingClass: "Needs review" },
] as const;

export const expenseCategories = expenseCategoryDefinitions.map((category) => category.name);

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

export const amazonOrderHistoryCsvColumns = [
  "ASIN", "Billing Address", "Carrier Name & Tracking Number", "Currency", "Gift Message", "Gift Recipient Contact",
  "Gift Sender Name", "Item Serial Number", "Order Date", "Order ID", "Order Status", "Original Quantity",
  "Payment Method Type", "Product Condition", "Product Name", "Purchase Order Number", "Ship Date",
  "Shipment Item Subtotal", "Shipment Item Subtotal Tax", "Shipment Status", "Shipping Address", "Shipping Charge",
  "Shipping Option", "Total Amount", "Total Discounts", "Unit Price", "Unit Price Tax", "Website",
] as const;

export const aliExpressPasteColumns = [
  "Order Status", "Order Date", "Ref. Number", "Store", "Item Details", "Unit Price", "Quantity", "Order Total",
] as const;

export type ExpenseCategory = string;

export type ImportedExpense = {
  externalKey: string;
  purchaseSource: string;
  vendor: string;
  asins: string[];
  category: ExpenseCategory;
  amount: number;
  date: string;
  note: string;
  personal?: boolean;
  canceled: boolean;
  source: "import";
  importedAt: string;
  fields: Record<string, string>;
};

export type ExpenseImportPreview = {
  fileName: string;
  ready: ImportedExpense[];
  updates: ImportedExpense[];
  duplicates: string[];
  skipped: string[];
  invalid: string[];
  years: number[];
  readyTotal: number;
  columns: string[];
};

export const normalizeExpenseKey = (key: string) => key.trim().toLowerCase().replace(/\s+/g, "");

export const normalizeExpensePurchaseSource = (value: unknown) => {
  const source = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!source) return "";
  const parts = source.split(/\s*(?:·|\||–|—)\s*|\s+-\s+|\s+\/\s+/).filter(Boolean);
  const isAmazonMarketplace = (part: string) => /^(?:amazon|amazon\.com)$/.test(part.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, ""));
  return parts.length && parts.every(isAmazonMarketplace) ? "Amazon" : source;
};

export const isCanceledOrderStatus = (value: unknown) => {
  const status = String(value ?? "").trim().toLowerCase();
  return Boolean(status && !/\bnot\s+cancel(?:l)?ed\b/.test(status) && /\bcancel(?:l)?ed\b/.test(status));
};

const parseOptionalCanceled = (value: unknown) => {
  if (typeof value === "boolean") return value;
  const label = String(value ?? "").trim().toLowerCase();
  if (!label) return undefined;
  if (["1", "true", "yes", "y", "canceled", "cancelled"].includes(label)) return true;
  if (["0", "false", "no", "n", "active", "completed"].includes(label)) return false;
  return undefined;
};

export const normalizeExpenseCanceled = (value: unknown, fields?: Record<string, unknown>) => {
  const explicit = parseOptionalCanceled(value);
  if (explicit !== undefined) return explicit;
  return Object.entries(fields ?? {}).some(([key, status]) => {
    const canonicalKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    return ["orderstatus", "shipmentstatus", "status"].includes(canonicalKey) && isCanceledOrderStatus(status);
  });
};

export const normalizeExpenseAsins = (value: unknown) => Array.from(new Set(
  (Array.isArray(value) ? value : [value]).flatMap((entry) => String(entry ?? "").toUpperCase().match(/\b[A-Z0-9]{10}\b/g) ?? []),
));

export const normalizeExpenseCategory = (value: unknown, customCategories: readonly string[] = []): ExpenseCategory => {
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
  return expenseCategories.find((category) => category.toLowerCase() === label)
    ?? customCategories.find((category) => category.toLowerCase() === label)
    ?? aliases[label]
    ?? "Other";
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

const parseOptionalPersonal = (value: unknown) => {
  const label = String(value ?? "").trim().toLowerCase();
  if (!label) return undefined;
  if (["1", "true", "yes", "y", "personal"].includes(label)) return true;
  if (["0", "false", "no", "n", "business"].includes(label)) return false;
  return undefined;
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

const categoryForAmazonLine = (row: Record<string, unknown>): ExpenseCategory => {
  const title = ["title", "description"].map((field) => String(row[field] ?? "").trim()).filter(Boolean).join(" ").toLowerCase();
  const taxonomy = ["amazoninternalproductcategory", "segment", "family", "class", "commodity"]
    .map((field) => String(row[field] ?? "").trim()).filter(Boolean).join(" ").toLowerCase();
  const corpus = `${title} ${taxonomy}`;
  const exemptionType = String(row.taxexemptiontype ?? "").trim().toLowerCase();
  const productionExemption = /production|manufactur|ingredient|component|raw material/.test(exemptionType);
  const resaleExemption = /resale/.test(exemptionType);
  const intrinsicMaterial = /\b(raw materials?|ingredients?|blanks?|unfinished|filaments?|fabrics?|leatherette|decals?|patches?|transfer paper|transfer vinyl|heat transfer|adhesives?|glue|lumber|plywood|acrylic|plexiglass|resin|pigments?|dyes?|beads?|sewing thread|yarn)\b/.test(title);
  const componentInput = /\b(components?|connectors?|switches?|stepper motors?|wires?|cables?|clasps?|key rings?|fasteners?|screws?|capacitors?|relays?|sockets?|circuit boards?|pcb|chips?|integrated circuits?|ics?|modules?|displays?|processors?|servos?|dip(?:-\d+)?|(?:sn)?74[a-z0-9-]+)\b/.test(title);
  const productionUse = /\b[1-9][0-9]+\s*(?:pcs|pieces)|\b(?:diy|craft|jewelry|laser|engraving|sublimation|heat press|3d print|cnc|assembly|manufactur)/.test(title);
  const materialTaxonomy = /manufacturing components|electronic components and supplies|electrical equipment and components|arts and crafts equipment and accessories and supplies|sewing supplies/.test(taxonomy);
  const materialInput = intrinsicMaterial || (componentInput && productionUse) || (materialTaxonomy && productionUse);
  const consumable = /office supplies|stationery|printer paper|copy paper|writing paper|shipping labels?|packing tape|envelopes?|toner|ink cartridges?|cleaning supplies|sanitizer|paper towels?|trash bags?/.test(corpus);
  const equipmentProduct = /\b(laminators?|printers?|monitors?|computers?|laptops?|cameras?|speakers?|drives?|usb hubs?|power tools?|hand tools?|machines?|lamps?)\b/.test(title);
  const equipment = equipmentProduct || /office equipment|office machines?|computer equipment|consumer electronics|audio and visual equipment|furniture|power tools?|hand tools?|machinery/.test(taxonomy);
  const shipping = /shipping|postage|mailing|freight/.test(corpus);
  const service = /digital software|software|subscription|membership|professional service/.test(corpus);

  if (productionExemption || (resaleExemption && materialInput)) return "Raw materials";
  if (resaleExemption) return "Resale item";
  if (materialInput) return "Raw materials";
  if (equipmentProduct) return "Office equipment";
  if (consumable) return "Office supplies";
  if (shipping) return "Shipping & postage";
  if (equipment) return "Office equipment";
  if (service) return "Other";
  return "Review needed";
};

const categoryForAmazonOrder = (rows: Array<Record<string, unknown>>): ExpenseCategory => {
  const categories = Array.from(new Set(rows.map(categoryForAmazonLine)));
  return categories.length === 1 ? categories[0] : "Review needed";
};

const aliExpressStatusPattern = "Completed|Cancel(?:l)?ed|Awaiting delivery|To ship|Shipped|Processing|Unpaid|Refund processing|Closed";
const isAliExpressOrderText = (text: string) => new RegExp(`(?:^|\\n)\\s*(?:${aliExpressStatusPattern})\\s*\\r?\\n\\s*Date:\\s*[^\\n]+\\r?\\n\\s*Ref\\.\\s*Number:\\s*\\d+`, "i").test(text);

const parseAliExpressOrders = (text: string) => {
  const records: Array<Record<string, unknown>> = [];
  const orderPattern = new RegExp(`(?:^|\\n)\\s*(${aliExpressStatusPattern})\\s*\\r?\\n\\s*Date:\\s*([^\\n]+)\\r?\\n\\s*Ref\\.\\s*Number:\\s*(\\d+)\\s*\\r?\\n\\s*Copy\\s*\\r?\\n\\s*Details\\s*\\r?\\n([\\s\\S]*?)(?=\\r?\\n\\s*(?:${aliExpressStatusPattern})\\s*\\r?\\n\\s*Date:|\\s*$)`, "gi");
  for (const match of text.matchAll(orderPattern)) {
    const [, status, rawDate, reference, rawBody] = match;
    const lines = rawBody.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const totalIndex = lines.findIndex((line) => /^Total\s*:\s*\$/i.test(line));
    const totalMatch = (totalIndex >= 0 ? lines[totalIndex] : "").match(/^Total\s*:\s*\$\s*([\d,]+(?:\.\d{1,2})?)/i);
    const vendor = lines[0] && !/^Total\s*:/i.test(lines[0]) ? lines[0] : "AliExpress";
    const beforeTotal = lines.slice(1, totalIndex >= 0 ? totalIndex : lines.length);
    const priceLine = beforeTotal.find((line) => /^\$\s*[\d,]+(?:\.\d{1,2})?\s+x\s*\d+/i.test(line));
    const priceMatch = priceLine?.match(/^\$\s*([\d,]+(?:\.\d{1,2})?)\s+x\s*(\d+)/i);
    const itemLines = beforeTotal.filter((line) => line !== priceLine
      && !/^title img$/i.test(line)
      && !/^\d+\s+items?$/i.test(line)
      && !/^\$?\d+(?:\.\d+)?\s+coupon/i.test(line)
      && !/^(?:Free returns?|Fast delivery|·)$/i.test(line));
    const itemDetails = itemLines.join(" · ");
    const amount = totalMatch ? Number(totalMatch[1].replace(/,/g, "")) : Number.NaN;
    const fields = {
      "Order Status": status,
      "Order Date": rawDate.trim(),
      "Ref. Number": reference,
      Store: vendor,
      "Item Details": itemDetails,
      "Unit Price": priceMatch?.[1] ? `$${priceMatch[1]}` : "",
      Quantity: priceMatch?.[2] ?? "",
      "Order Total": totalMatch?.[0] ?? "",
    };
    records.push({
      externalkey: reference,
      purchasesource: "AliExpress",
      vendor,
      category: categoryForAmazonLine({ title: itemDetails }),
      amount,
      date: rawDate,
      note: itemDetails,
      canceled: isCanceledOrderStatus(status),
      fields,
    });
  }
  return records;
};

export function parseExpenseImportText(
  text: string,
  fileName: string,
  existingExternalKeys: readonly string[],
  importedAt = new Date().toISOString(),
  customCategories: readonly string[] = [],
): ExpenseImportPreview {
  let records: Array<Record<string, unknown>> = [];
  let sourceColumns: Array<{ key: string; label: string }> = [];
  const trimmed = text.trim();
  if (isAliExpressOrderText(trimmed)) {
    sourceColumns = aliExpressPasteColumns.map((label) => ({ key: canonicalField(label), label }));
    records = parseAliExpressOrders(trimmed);
  } else if (fileName.toLowerCase().endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{")) {
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
      const titles = uniqueValues(["title", "description"]);
      const amazonCategories = uniqueValues(["amazoninternalproductcategory"]);
      const canceled = uniqueValues(["orderstatus"]).some(isCanceledOrderStatus);
      const titleNote = titles.slice(0, 3).join("; ");
      const moreItems = titles.length > 3 ? ` (+${titles.length - 3} more items)` : "";
      const categoryNote = amazonCategories[0] ? ` · Amazon category: ${amazonCategories[0]}` : "";
      const fields = Object.fromEntries(sourceColumns.map((column) => {
        const values = Array.from(new Set(orderRows.map((record) => String(record[column.key] ?? "").trim()).filter(Boolean)));
        return [column.label, values.join(" · ")];
      }));
      return {
        externalkey: orderId,
        purchasesource: "Amazon",
        vendor: sellers.slice(0, 3).join(", ") || "Amazon",
        asin: uniqueValues(["asin"]).join(" · "),
        category: categoryForAmazonOrder(orderRows),
        amount: valueFor(first, ["ordernettotal"]),
        date: valueFor(first, ["orderdate"]),
        note: `${titleNote}${moreItems}${categoryNote}`,
        canceled,
        fields,
      };
    });
  }

  const isAmazonOrderHistoryExport = !isAmazonBusinessExport && records.some((record) =>
    valueFor(record, ["orderid"])
    && valueFor(record, ["totalamount"]) !== undefined
    && valueFor(record, ["productname"]) !== undefined
    && valueFor(record, ["website"]) !== undefined,
  );
  if (isAmazonOrderHistoryExport) {
    const orders = new Map<string, Array<Record<string, unknown>>>();
    for (const record of records) {
      const orderId = String(valueFor(record, ["orderid"]) ?? "").trim();
      if (!orderId) continue;
      orders.set(orderId, [...(orders.get(orderId) ?? []), record]);
    }
    records = Array.from(orders.entries()).map(([orderId, orderRows]) => {
      const first = orderRows[0];
      const uniqueValues = (fields: readonly string[]) => Array.from(new Set(orderRows.map((record) => String(valueFor(record, fields) ?? "").trim()).filter(Boolean)));
      const websites = uniqueValues(["website"]);
      const titles = uniqueValues(["productname"]);
      const canceled = uniqueValues(["orderstatus", "shipmentstatus"]).some(isCanceledOrderStatus);
      const titleNote = titles.slice(0, 3).join("; ");
      const moreItems = titles.length > 3 ? ` (+${titles.length - 3} more items)` : "";
      const amount = Math.round(orderRows.reduce((sum, record) => {
        const lineAmount = parseExpenseAmount(valueFor(record, ["totalamount"]));
        return sum + (Number.isFinite(lineAmount) ? lineAmount : 0);
      }, 0) * 100) / 100;
      const fields = Object.fromEntries(sourceColumns.map((column) => {
        const values = Array.from(new Set(orderRows.map((record) => String(record[column.key] ?? "").trim()).filter(Boolean)));
        return [column.label, values.join(" · ")];
      }));
      return {
        externalkey: orderId,
        purchasesource: "Amazon",
        vendor: websites[0] || "Amazon",
        asin: uniqueValues(["asin"]).join(" · "),
        category: categoryForAmazonOrder(orderRows),
        amount,
        date: valueFor(first, ["orderdate"]),
        note: `${titleNote}${moreItems}`,
        canceled,
        importskipreason: !canceled && amount <= 0 ? "zero-dollar Amazon order" : "",
        fields,
      };
    });
  }

  const ready: ImportedExpense[] = [];
  const updates: ImportedExpense[] = [];
  const duplicates: string[] = [];
  const skipped: string[] = [];
  const invalid: string[] = [];
  const existingKeys = new Set(existingExternalKeys.map(normalizeExpenseKey));
  const seen = new Set<string>();
  const aliases = {
    key: ["externalkey", "amazonorderid", "orderid", "transactionid", "invoiceid", "receiptid", "recordid", "uniqueid", "id"],
    purchaseSource: ["purchasesource", "purchasesourcekey", "sourcekey", "accountsource", "accountname", "importsource"],
    vendor: ["vendor", "merchant", "sellername", "seller", "supplier", "payee", "store"],
    asin: ["asin", "amazonasin", "asinid", "asinnumber", "productasin"],
    category: ["category", "expensecategory", "amazoninternalproductcategory", "type", "account"],
    amount: ["amount", "ordernettotal", "itemnettotal", "paymentamount", "totalamount", "total", "ordertotal", "charge", "price", "expenseamount"],
    date: ["date", "orderdate", "transactiondate", "purchasedate", "posteddate"],
    note: ["note", "title", "description", "memo", "item", "product", "details"],
    personal: ["personal", "ispersonal", "personaluse"],
    canceled: ["canceled", "cancelled", "iscanceled", "iscancelled"],
    status: ["orderstatus", "shipmentstatus", "status"],
  } as const;

  records.forEach((record, index) => {
    const externalKey = String(valueFor(record, aliases.key) ?? "").trim();
    const normalizedKey = normalizeExpenseKey(externalKey);
    const skipReason = String(record.importskipreason ?? "").trim();
    if (skipReason) {
      skipped.push(`${externalKey || `Row ${index + 2}`}: ${skipReason}`);
      return;
    }
    const amount = parseExpenseAmount(valueFor(record, aliases.amount));
    const date = normalizeExpenseDate(valueFor(record, aliases.date));
    const canceled = normalizeExpenseCanceled(valueFor(record, aliases.canceled), {
      "Order Status": valueFor(record, aliases.status),
    });
    if (!normalizedKey || !Number.isFinite(amount) || (canceled ? amount < 0 : amount <= 0) || !date) {
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
      purchaseSource: normalizeExpensePurchaseSource(valueFor(record, aliases.purchaseSource)),
      vendor: String(valueFor(record, aliases.vendor) ?? "Unknown vendor").trim(),
      asins: normalizeExpenseAsins(valueFor(record, aliases.asin)),
      category: normalizeExpenseCategory(valueFor(record, aliases.category), customCategories),
      amount,
      date,
      note: String(valueFor(record, aliases.note) ?? "").trim(),
      personal: parseOptionalPersonal(valueFor(record, aliases.personal)),
      canceled,
      source: "import",
      importedAt,
      fields,
    };
    if (existingKeys.has(normalizedKey)) updates.push(importedExpense);
    else ready.push(importedExpense);
  });

  const importable = [...ready, ...updates];
  const years = Array.from(new Set(importable.map((expense) => Number(expense.date.slice(0, 4))))).filter(Number.isFinite).sort((a, b) => b - a);
  const readyTotal = Math.round(importable.filter((expense) => !expense.canceled).reduce((sum, expense) => sum + expense.amount, 0) * 100) / 100;
  return { fileName, ready, updates, duplicates, skipped, invalid, years, readyTotal, columns: sourceColumns.map((column) => column.label) };
}
