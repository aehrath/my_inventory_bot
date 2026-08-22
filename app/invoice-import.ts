export type ImportedInvoiceCustomer = {
  key: string;
  externalKey: string;
  name: string;
  email: string;
  phone: string;
  address: { line1: string; city: string; state: string; postalCode: string };
};

export type ImportedInvoiceLine = {
  sourceKey: string;
  invoiceNumber: string;
  lineId: string;
  date: string;
  customerKey: string;
  sku: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  salesTax?: number;
};

export type InvoiceImportPreview = {
  fileName: string;
  ready: ImportedInvoiceLine[];
  references: ImportedInvoiceLine[];
  duplicates: string[];
  invalid: string[];
  customers: ImportedInvoiceCustomer[];
  columns: string[];
  invoiceCount: number;
  totalQuantity: number;
  totalRevenue: number;
};

const canonicalField = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
export const normalizeInvoiceKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "");
export const normalizeProductIdentifier = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
export const normalizeCustomerKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "");

const parseNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  const raw = String(value ?? "").trim();
  if (!raw) return Number.NaN;
  const negative = /^\(.*\)$/.test(raw);
  const parsed = Number(raw.replace(/[,$%()\s]/g, ""));
  return negative ? -parsed : parsed;
};

const normalizeInvoiceDate = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const usDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usDate) return `${usDate[3]}-${usDate[1].padStart(2, "0")}-${usDate[2].padStart(2, "0")}`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

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

const flattenJsonRecords = (parsed: unknown) => {
  const root = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { invoices?: unknown[] }).invoices)
      ? (parsed as { invoices: unknown[] }).invoices
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { records?: unknown[] }).records)
        ? (parsed as { records: unknown[] }).records
        : [];
  const records: Array<Record<string, unknown>> = [];
  for (const item of root) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const parent = item as Record<string, unknown>;
    const lines = [parent.lines, parent.lineItems, parent.items].find(Array.isArray) as unknown[] | undefined;
    if (!lines) { records.push(parent); continue; }
    for (const line of lines) {
      if (line && typeof line === "object" && !Array.isArray(line)) records.push({ ...parent, ...(line as Record<string, unknown>), lines: undefined, lineItems: undefined, items: undefined });
    }
  }
  return records;
};

const hashText = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase();
};

export const generatedHistoricalSku = (name: string) => {
  const slug = name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 16) || "PRODUCT";
  return `HIST-${slug}-${hashText(name.trim().toLowerCase())}`;
};

export const parseInvoiceSummaryTitle = (title: string) => {
  const originalName = title.trim().replace(/\s+/g, " ");
  const leading = originalName.match(/^(\d[\d,]*)\s+(.+)$/);
  if (leading) {
    const remainder = leading[2].trim();
    const hasAnotherQuantity = /\b\d[\d,]*\b/.test(remainder) || /(?:^|\s)[x×]\s*\d[\d,]*(?:\s|$)/i.test(remainder);
    const quantity = Number(leading[1].replace(/,/g, ""));
    if (!hasAnotherQuantity && Number.isSafeInteger(quantity) && quantity > 0) return { name: remainder.replace(/[.;,\s]+$/g, ""), quantity };
  }
  const trailing = originalName.match(/^(.+?)\s+[x×]\s*(\d[\d,]*)\s*$/i);
  if (trailing) {
    const quantity = Number(trailing[2].replace(/,/g, ""));
    if (!/\b\d[\d,]*\b/.test(trailing[1]) && Number.isSafeInteger(quantity) && quantity > 0) return { name: trailing[1].trim().replace(/[.;,\s]+$/g, ""), quantity };
  }
  return { name: originalName.replace(/[.;,\s]+$/g, ""), quantity: 1 };
};

export function parseInvoiceImportText(
  text: string,
  fileName: string,
  existingSourceKeys: readonly string[],
): InvoiceImportPreview {
  let records: Array<Record<string, unknown>> = [];
  let columns: string[] = [];
  const trimmed = text.trim();
  if (fileName.toLowerCase().endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const objects = flattenJsonRecords(JSON.parse(text));
    columns = Array.from(new Set(objects.flatMap((record) => Object.keys(record).filter((key) => !["lines", "lineItems", "items"].includes(key)))));
    records = objects.map(canonicalRecord);
  } else {
    const rows = parseCsvRows(text);
    if (rows.length > 1) {
      columns = rows[0].map((header, index) => header.replace(/^\uFEFF/, "").trim() || `Column ${index + 1}`);
      const keys = columns.map(canonicalField);
      records = rows.slice(1).map((row) => Object.fromEntries(keys.map((key, index) => [key, row[index] ?? ""])));
    }
  }

  const aliases = {
    invoice: ["invoicenumber", "invoiceid", "ordernumber", "orderid", "receiptnumber", "receiptid", "transactionid", "saleid"],
    line: ["lineitemid", "invoicelineid", "orderlineid", "lineid", "detailid"],
    date: ["invoicedate", "orderdate", "saledate", "transactiondate", "date"],
    sku: ["sku", "productsku", "itemsku", "productcode", "itemnumber", "productid", "asin", "upc"],
    productName: ["productname", "itemname", "itemdescription", "productdescription", "title", "description"],
    category: ["productcategory", "itemcategory", "category"],
    quantity: ["quantity", "qty", "itemquantity", "units", "quantitysold"],
    unitPrice: ["unitprice", "saleprice", "priceeach", "itemprice", "rate", "price"],
    lineTotal: ["linetotal", "itemtotal", "extendedprice", "netsales", "netamount", "subtotal", "amount"],
    unitCost: ["unitcost", "costeach", "productcost", "itemcost", "cost", "cogs"],
    salesTax: ["linesalestax", "itemtax", "salestax", "taxamount", "linetax", "tax"],
    invoiceToken: ["invoicetoken"],
    invoiceTitle: ["invoicetitle"],
    status: ["invoicestatus", "status"],
    customerId: ["customerid", "customerkey", "clientid", "buyerid", "accountid"],
    customerName: ["customername", "clientname", "buyername", "billtoname", "shiptoname", "companyname"],
    customerEmail: ["customeremail", "clientemail", "buyeremail", "billingemail", "shippingemail", "email"],
    customerPhone: ["customerphone", "clientphone", "buyerphone", "billingphone", "shippingphone", "phone"],
    address: ["shippingaddress", "shiptoaddress", "customeraddress", "billingaddress", "billtoaddress", "address1", "streetaddress", "address"],
    city: ["shippingcity", "shiptocity", "customercity", "billingcity", "billtocity", "city"],
    state: ["shippingstate", "shiptostate", "customerstate", "billingstate", "billtostate", "state"],
    postalCode: ["shippingzip", "shippingpostalcode", "shiptozip", "customerzip", "billingzip", "billtozip", "zipcode", "postalcode", "zip"],
  } as const;

  const ready: ImportedInvoiceLine[] = [];
  const references: ImportedInvoiceLine[] = [];
  const duplicates: string[] = [];
  const invalid: string[] = [];
  const customers = new Map<string, ImportedInvoiceCustomer>();
  const existing = new Set(existingSourceKeys.map(normalizeInvoiceKey));
  const seen = new Set<string>();
  const isInvoiceSummaryExport = records.some((record) => valueFor(record, aliases.invoiceToken) && valueFor(record, aliases.invoiceTitle) && valueFor(record, ["requestedamount", "amountpaid"]) !== undefined);

  records.forEach((record, index) => {
    const invoiceNumber = String(valueFor(record, aliases.invoice) ?? "").trim();
    const date = normalizeInvoiceDate(valueFor(record, aliases.date));
    const rawSku = String(valueFor(record, aliases.sku) ?? "").trim();
    const invoiceTitle = String(valueFor(record, aliases.invoiceTitle) ?? "").trim();
    const summaryProduct = isInvoiceSummaryExport ? parseInvoiceSummaryTitle(invoiceTitle || `Invoice ${invoiceNumber}`) : null;
    const productName = summaryProduct?.name || String(valueFor(record, aliases.productName) ?? rawSku).trim();
    const sku = rawSku || (productName ? generatedHistoricalSku(productName) : "");
    const rawQuantity = parseNumber(valueFor(record, aliases.quantity));
    const quantity = Number.isFinite(rawQuantity) ? rawQuantity : summaryProduct?.quantity ?? Number.NaN;
    const lineTotal = parseNumber(valueFor(record, isInvoiceSummaryExport ? ["requestedamount", "amountpaid", ...aliases.lineTotal] : aliases.lineTotal));
    const rawUnitPrice = parseNumber(valueFor(record, aliases.unitPrice));
    const unitPrice = Number.isFinite(rawUnitPrice) ? rawUnitPrice : Number.isFinite(lineTotal) && quantity > 0 ? lineTotal / quantity : Number.NaN;
    const rawUnitCost = parseNumber(valueFor(record, aliases.unitCost));
    const salesTaxValue = parseNumber(valueFor(record, aliases.salesTax));
    const customerId = String(valueFor(record, aliases.customerId) ?? "").trim();
    const email = String(valueFor(record, aliases.customerEmail) ?? "").trim().toLowerCase();
    const name = String(valueFor(record, aliases.customerName) ?? (email || (customerId ? `Customer ${customerId}` : ""))).trim();
    const address = {
      line1: String(valueFor(record, aliases.address) ?? "").trim(),
      city: String(valueFor(record, aliases.city) ?? "").trim(),
      state: String(valueFor(record, aliases.state) ?? "").trim().toUpperCase(),
      postalCode: String(valueFor(record, aliases.postalCode) ?? "").trim(),
    };
    const customerKey = customerId
      ? `id:${normalizeCustomerKey(customerId)}`
      : email
        ? `email:${normalizeCustomerKey(email)}`
        : name
          ? `name:${normalizeCustomerKey(`${name}|${address.line1}|${address.postalCode}`)}`
          : "";
    const invoiceToken = String(valueFor(record, aliases.invoiceToken) ?? "").trim();
    const explicitLineId = String(valueFor(record, aliases.line) ?? "").trim();
    const lineId = explicitLineId || (isInvoiceSummaryExport ? invoiceToken : "") || rawSku || productName;
    const sourceKey = isInvoiceSummaryExport && invoiceToken
      ? `invoice:${normalizeInvoiceKey(invoiceToken)}`
      : invoiceNumber && lineId
        ? `invoice:${normalizeInvoiceKey(invoiceNumber)}:line:${normalizeProductIdentifier(lineId)}`
        : "";
    const problems = [
      !invoiceNumber && "missing invoice number",
      !date && "invalid invoice date",
      !sku && "missing SKU or product name",
      !productName && "missing product name",
      (!Number.isFinite(quantity) || quantity <= 0) && "invalid quantity",
      (!Number.isFinite(unitPrice) || unitPrice < 0) && "invalid unit price or line total",
      !customerKey && "missing customer",
    ].filter(Boolean);
    if (problems.length) {
      invalid.push(`Row ${index + 2}${invoiceNumber ? ` · ${invoiceNumber}` : ""}: ${problems.join(", ")}`);
      return;
    }
    const externalKey = customerId || email || `${name}|${address.line1}|${address.postalCode}`;
    const importedLine: ImportedInvoiceLine = {
      sourceKey,
      invoiceNumber,
      lineId,
      date,
      customerKey,
      sku,
      productName,
      category: String(valueFor(record, aliases.category) ?? "Uncategorized").trim() || "Uncategorized",
      quantity,
      unitPrice,
      unitCost: Number.isFinite(rawUnitCost) && rawUnitCost >= 0 ? rawUnitCost : undefined,
      salesTax: Number.isFinite(salesTaxValue) && salesTaxValue >= 0 ? salesTaxValue : undefined,
    };
    if (seen.has(normalizeInvoiceKey(sourceKey))) {
      duplicates.push(`${invoiceNumber} · ${lineId}`);
      return;
    }
    seen.add(normalizeInvoiceKey(sourceKey));
    customers.set(customerKey, { key: customerKey, externalKey, name, email, phone: String(valueFor(record, aliases.customerPhone) ?? "").trim(), address });
    if (existing.has(normalizeInvoiceKey(sourceKey))) {
      duplicates.push(`${invoiceNumber} · ${lineId}`);
      references.push(importedLine);
      return;
    }
    ready.push(importedLine);
  });

  return {
    fileName,
    ready,
    references,
    duplicates,
    invalid,
    customers: Array.from(customers.values()),
    columns,
    invoiceCount: new Set(ready.map((line) => normalizeInvoiceKey(line.invoiceNumber))).size,
    totalQuantity: ready.reduce((total, line) => total + line.quantity, 0),
    totalRevenue: Math.round(ready.reduce((total, line) => total + line.quantity * line.unitPrice, 0) * 100) / 100,
  };
}
