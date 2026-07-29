"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, CSSProperties, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { changelogReleases } from "./changelog";
import { amazonBusinessCsvColumns, amazonOrderHistoryCsvColumns, expenseAccountingClasses, expenseCategories, expenseCategoryDefinitions, expenseCostTimings, normalizeExpenseAsins, normalizeExpenseCategory, normalizeExpenseDate, normalizeExpenseKey, parseExpenseImportText } from "./expense-import";
import type { ExpenseAccountingClass, ExpenseCategory, ExpenseCategoryDefinition, ExpenseCostTiming, ExpenseImportPreview } from "./expense-import";
import { parseExpenseInventoryDescription } from "./expense-inventory";
import { normalizeCustomerKey, normalizeInvoiceKey, normalizeProductIdentifier, parseInvoiceImportText } from "./invoice-import";
import type { InvoiceImportPreview } from "./invoice-import";
import { defaultStateTaxSettings, stateName, stateTaxDefaults } from "./tax-data";
import type { TaxAddress, TaxRateLookup, TaxRateLookupResponse, TaxSourceStatus } from "./tax-rate-types";

type View = "dashboard" | "products" | "customers" | "activity" | "cogs" | "expenses" | "taxes" | "data" | "changelog";
type MovementType = "purchase" | "sale" | "production_use" | "personal_use" | "adjustment";
type Product = {
  id: string; sku: string; name: string; vendor: string; category: string; quantity: number; unitCost: number;
  salePrice: number; reorderPoint: number; salesTaxPaid: boolean; createdAt: string;
};
type Movement = {
  id: string; productId: string; type: MovementType; quantity: number; unitCost: number;
  unitPrice: number; salesTax: number; date: string; note: string; taxRate?: number;
  stateTax?: number; localTax?: number; stateTaxRate?: number; localTaxRate?: number;
  taxJurisdiction?: string; localJurisdiction?: string; taxCollected?: boolean; customerAddress?: Address;
  productName?: string; productSku?: string; finalProductId?: string; finalProductName?: string;
  sourceKey?: string; invoiceNumber?: string; customerId?: string; customerName?: string;
};
type Expense = { id: string; externalKey: string; purchaseSource: string; vendor: string; asins: string[]; category: ExpenseCategory; amount: number; date: string; note: string; personal: boolean; source: "manual" | "import"; importedAt?: string; fields?: Record<string, string> };
type ExpenseDraft = Omit<Expense, "id">;
type Address = TaxAddress;
type Customer = { id: string; externalKey: string; name: string; email: string; phone: string; address: Address; createdAt: string; updatedAt: string };
type RateMetadata = { manualOverride?: boolean; sourceName?: string; sourceUrl?: string; checkedAt?: string; effectiveDate?: string | null };
type StateTaxSetting = { enabled: boolean; rate: number } & RateMetadata;
type LocalTaxRule = { id: string; name: string; state: string; city: string; postalCode: string; rate: number; enabled: boolean } & RateMetadata;
type AddressTaxRate = TaxRateLookup & { addressKey: string; checkedAt: string };
type TaxUpdateAudit = { id: string; checkedAt: string; appliedAt: string | null; checkedAddresses: number; availableUpdates: number; appliedUpdates: number; status: "checked" | "applied"; sources: string[] };
type CustomExpenseCategory = ExpenseCategoryDefinition;
type ExpenseCategoryTreatment = Omit<ExpenseCategoryDefinition, "name">;
type Settings = { businessName: string; taxYear: number; beginningInventory: number; ownAddress: Address; stateTaxes: Record<string, StateTaxSetting>; localTaxRules: LocalTaxRule[]; addressTaxRates: AddressTaxRate[]; taxUpdateHistory: TaxUpdateAudit[]; customExpenseCategories: CustomExpenseCategory[]; expenseCategoryOverrides: Record<string, ExpenseCategoryTreatment>; expenseColumnOrder: string[]; expenseVisibleColumns: string[] };
type AppState = { version: 16; products: Product[]; movements: Movement[]; expenses: Expense[]; customers: Customer[]; settings: Settings };
type Metrics = { inventoryValue: number; units: number; revenue: number; inventoryCogs: number; additionalCogs: number; cogs: number; salesTax: number; stateSalesTax: number; localSalesTax: number; useTax: number; stateUseTax: number; localUseTax: number; expenses: number; expenseRecordsTotal: number; purchases: number; grossProfit: number; taxableIncome: number };
type ExpenseColumnDefinition = { key: string; label: string; width: string; field?: string };
type SortDirection = "asc" | "desc";
type SortValue = string | number | boolean;

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const whole = new Intl.NumberFormat("en-US");
const nowYear = new Date().getFullYear();
const uid = () => crypto.randomUUID();
const dateOnly = () => new Date().toISOString().slice(0, 10);
const blankAddress = (state = "CA"): Address => ({ line1: "", city: "", state, postalCode: "" });
const roundTax = (amount: number, rate: number) => Math.round(amount * rate) / 100;
const roundRate = (rate: number) => Math.round(rate * 1_000) / 1_000;
const compareSortValues = (left: SortValue, right: SortValue, direction: SortDirection) => {
  const comparison = typeof left === "number" && typeof right === "number"
    ? left - right
    : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
  return comparison * (direction === "asc" ? 1 : -1);
};
const expenseCsvColumnKey = (label: string) => `csv:${label}`;
const expenseBaseColumns: ExpenseColumnDefinition[] = [
  { key: "date", label: "Date", width: "130px" },
  { key: "vendor", label: "Vendor", width: "190px" },
  { key: "purchaseSource", label: "Purchase source", width: "180px" },
  { key: "asin", label: "ASIN(s)", width: "190px" },
  { key: "note", label: "Description", width: "340px" },
  { key: "category", label: "Category", width: "175px" },
  { key: "accountingClass", label: "Accounting class", width: "155px" },
  { key: "costTiming", label: "Cost timing", width: "190px" },
  { key: "personal", label: "Personal", width: "105px" },
  { key: "externalKey", label: "Unique key", width: "195px" },
  { key: "amount", label: "Amount", width: "125px" },
  { key: "source", label: "Record origin", width: "110px" },
];
const expenseCsvColumnDefinition = (label: string): ExpenseColumnDefinition => ({
  key: expenseCsvColumnKey(label),
  label,
  field: label,
  width: label === "Title" || label === "Product Name" ? "360px" : /Email|Account Group|Credentials/.test(label) ? "230px" : /Date|Amount|Total|Tax|Promotion|PPU|Quantity/.test(label) ? "145px" : /Order ID|Reference ID|Identifier|ASIN|UNSPSC|Code|Number/.test(label) ? "190px" : "175px",
});
const trackedExpenseImportFields = Array.from(new Set([...amazonBusinessCsvColumns, ...amazonOrderHistoryCsvColumns]));
const expenseImportCsvColumns = trackedExpenseImportFields.filter((label) => label !== "ASIN");
const defaultExpenseColumnDefinitions = [...expenseBaseColumns, ...expenseImportCsvColumns.map(expenseCsvColumnDefinition)];
const defaultExpenseColumnOrder = defaultExpenseColumnDefinitions.map((column) => column.key);
const defaultExpenseVisibleColumns = ["date", "vendor", "purchaseSource", "asin", "note", "category", "accountingClass", "costTiming", "personal", "externalKey", "amount"];
const expenseColumnDefinitionsFor = (expenses: Expense[]) => {
  const knownFields = new Set<string>(trackedExpenseImportFields);
  const dynamicFields = Array.from(new Set(expenses.flatMap((expense) => Object.keys(expense.fields ?? {})))).filter((field) => !knownFields.has(field));
  return [...defaultExpenseColumnDefinitions, ...dynamicFields.map(expenseCsvColumnDefinition)];
};
const mergeExpenseColumnOrder = (saved: string[], definitions: ExpenseColumnDefinition[]) => {
  const available = new Set(definitions.map((column) => column.key));
  const valid = saved.filter((key) => available.has(key));
  return [...valid, ...definitions.map((column) => column.key).filter((key) => !valid.includes(key))];
};
type LegacyExpenseCategoryType = "Inventory" | "COGS" | "Operating expense" | "Taxes & fees";
const treatmentFromLegacyType = (value: unknown): ExpenseCategoryTreatment | undefined => {
  const type = String(value) as LegacyExpenseCategoryType;
  if (type === "Inventory") return { accountingClass: "Product cost", costTiming: "Track in inventory" };
  if (type === "COGS") return { accountingClass: "Product cost", costTiming: "Recognize directly as COGS" };
  if (type === "Operating expense") return { accountingClass: "Operating expense" };
  if (type === "Taxes & fees") return { accountingClass: "Taxes & fees" };
  return undefined;
};
const normalizeExpenseCategoryTreatment = (value: unknown, fallback: ExpenseCategoryTreatment = { accountingClass: "Operating expense" }): ExpenseCategoryTreatment => {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const legacy = treatmentFromLegacyType(typeof value === "string" ? value : record.type);
  const rawClass = String(record.accountingClass ?? "");
  const accountingClass = expenseAccountingClasses.includes(rawClass as ExpenseAccountingClass)
    ? rawClass as ExpenseAccountingClass
    : legacy?.accountingClass ?? fallback.accountingClass;
  if (accountingClass !== "Product cost") return { accountingClass };
  const rawTiming = String(record.costTiming ?? "");
  const costTiming = expenseCostTimings.includes(rawTiming as ExpenseCostTiming)
    ? rawTiming as ExpenseCostTiming
    : legacy?.costTiming ?? (fallback.accountingClass === "Product cost" ? fallback.costTiming : undefined) ?? "Track in inventory";
  return { accountingClass, costTiming };
};
const sameExpenseCategoryTreatment = (left: ExpenseCategoryTreatment, right: ExpenseCategoryTreatment) =>
  left.accountingClass === right.accountingClass && left.costTiming === right.costTiming;
const normalizeCustomExpenseCategories = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  const builtIns = new Set<string>(expenseCategories.map((category) => category.toLowerCase()));
  const seen = new Set<string>();
  return value.flatMap((category) => {
    const rawName = typeof category === "string"
      ? category
      : category && typeof category === "object" && "name" in category
        ? String(category.name)
        : "";
    const name = rawName.trim().replace(/\s+/g, " ");
    const key = name.toLowerCase();
    if (!name || key === "all" || builtIns.has(key) || seen.has(key)) return [];
    seen.add(key);
    return [{ name, ...normalizeExpenseCategoryTreatment(category) }];
  });
};
const normalizeExpenseCategoryOverrides = (value: unknown, legacyValue: unknown) => {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const legacySource = legacyValue && typeof legacyValue === "object" && !Array.isArray(legacyValue) ? legacyValue as Record<string, unknown> : {};
  const builtInNames = new Map(expenseCategories.map((category) => [category.toLowerCase(), category]));
  return Object.fromEntries([...new Set([...Object.keys(legacySource), ...Object.keys(source)])].flatMap((rawName) => {
    const name = builtInNames.get(rawName.trim().toLowerCase());
    const defaultDefinition = expenseCategoryDefinitions.find((definition) => definition.name === name);
    if (!name || !defaultDefinition) return [];
    const defaultTreatment = normalizeExpenseCategoryTreatment(defaultDefinition);
    const treatment = normalizeExpenseCategoryTreatment(source[rawName] ?? legacySource[rawName], defaultTreatment);
    return sameExpenseCategoryTreatment(defaultTreatment, treatment) ? [] : [[name, treatment]];
  })) as Record<string, ExpenseCategoryTreatment>;
};
type ExpenseCategorySettings = Pick<Settings, "customExpenseCategories" | "expenseCategoryOverrides">;
const expenseCategoryDefinitionsFor = (settings: ExpenseCategorySettings) => [
  ...expenseCategoryDefinitions.map((definition) => ({ name: definition.name, ...normalizeExpenseCategoryTreatment(settings.expenseCategoryOverrides[definition.name] ?? definition, normalizeExpenseCategoryTreatment(definition)) })),
  ...settings.customExpenseCategories,
];
const expenseCategoriesFor = (settings: ExpenseCategorySettings) => expenseCategoryDefinitionsFor(settings).map((category) => category.name);
const expenseCategoryDefinitionFor = (category: ExpenseCategory, settings: ExpenseCategorySettings): ExpenseCategoryDefinition =>
  expenseCategoryDefinitionsFor(settings).find((definition) => definition.name === category) ?? { name: category, accountingClass: "Operating expense" };
const expenseAccountingClassFor = (category: ExpenseCategory, settings: ExpenseCategorySettings) =>
  expenseCategoryDefinitionFor(category, settings).accountingClass;
const expenseCostTimingFor = (category: ExpenseCategory, settings: ExpenseCategorySettings) =>
  expenseCategoryDefinitionFor(category, settings).costTiming;
const isTrackedInventoryCategory = (category: ExpenseCategory, settings: ExpenseCategorySettings) =>
  expenseAccountingClassFor(category, settings) === "Product cost" && expenseCostTimingFor(category, settings) === "Track in inventory";
const isDirectCogsCategory = (category: ExpenseCategory, settings: ExpenseCategorySettings) =>
  expenseAccountingClassFor(category, settings) === "Product cost" && expenseCostTimingFor(category, settings) === "Recognize directly as COGS";
const fallbackExpenseCategoryForTreatment = (definition: ExpenseCategoryDefinition): ExpenseCategory => {
  if (definition.accountingClass === "Product cost") return definition.costTiming === "Track in inventory" ? "Raw materials" : "Cost of goods";
  return definition.accountingClass === "Taxes & fees" ? "Taxes & licenses" : "Other";
};
async function parseExpenseImport(file: File, existingExpenses: Expense[], customCategories: readonly string[]): Promise<ExpenseImportPreview> {
  return parseExpenseImportText(await file.text(), file.name, existingExpenses.map((expense) => expense.externalKey), undefined, customCategories);
}
const addressKey = (address: Address) => [address.line1, address.city, address.state, address.postalCode.slice(0, 5)].map((part) => part.trim().toLowerCase()).join("|");
const isCompleteAddress = (address: Address) => Boolean(address.line1.trim() && address.city.trim() && address.state && /^\d{5}(?:-\d{4})?$/.test(address.postalCode.trim()));
const findLocalTaxRule = (address: Address, rules: LocalTaxRule[]) => {
  const stateRules = rules.filter((rule) => rule.enabled && rule.state === address.state);
  const postalMatch = stateRules.find((rule) => rule.postalCode && rule.postalCode.trim() === address.postalCode.trim());
  if (postalMatch) return postalMatch;
  const city = address.city.trim().toLowerCase();
  return stateRules.find((rule) => !rule.postalCode && rule.city.trim().toLowerCase() === city);
};
const findAddressTaxRate = (address: Address, rates: AddressTaxRate[]) => rates.find((rate) => rate.addressKey === addressKey(address));
const resolveAddressRate = (address: Address, settings: Settings, liveRate?: TaxRateLookup | null) => {
  const stateSetting = settings.stateTaxes[address.state] ?? { enabled: false, rate: 0 };
  const localRule = findLocalTaxRule(address, settings.localTaxRules);
  const cached = findAddressTaxRate(address, settings.addressTaxRates);
  const automatic = liveRate ?? cached;
  const stateRate = stateSetting.manualOverride ? stateSetting.rate : automatic?.stateRate ?? stateSetting.rate;
  const localRate = localRule?.manualOverride !== false && localRule ? localRule.rate : automatic?.localRate ?? localRule?.rate ?? 0;
  return {
    stateRate: roundRate(stateRate),
    localRate: roundRate(localRate),
    totalRate: roundRate(stateRate + localRate),
    jurisdiction: localRule?.manualOverride !== false && localRule ? localRule.name : automatic?.jurisdiction ?? localRule?.name,
    sourceName: localRule?.manualOverride !== false && localRule ? "Manual local rule" : automatic?.sourceName,
  };
};

const seed: AppState = {
  version: 16,
  settings: { businessName: "Juniper & Co.", taxYear: nowYear, beginningInventory: 3180, ownAddress: blankAddress("CA"), stateTaxes: defaultStateTaxSettings("CA"), localTaxRules: [], addressTaxRates: [], taxUpdateHistory: [], customExpenseCategories: [], expenseCategoryOverrides: {}, expenseColumnOrder: defaultExpenseColumnOrder, expenseVisibleColumns: defaultExpenseVisibleColumns },
  products: [
    { id: "p1", sku: "CER-101", name: "Speckled Ceramic Mug", vendor: "Clay & Kiln Supply", category: "Home", quantity: 24, unitCost: 8.5, salePrice: 24, reorderPoint: 8, salesTaxPaid: false, createdAt: `${nowYear}-01-05` },
    { id: "p2", sku: "CAN-204", name: "Cedar + Moss Candle", vendor: "North Coast Candle Co.", category: "Wellness", quantity: 7, unitCost: 7.25, salePrice: 22, reorderPoint: 10, salesTaxPaid: true, createdAt: `${nowYear}-01-09` },
    { id: "p3", sku: "TOT-310", name: "Canvas Market Tote", vendor: "Harbor Canvas Works", category: "Accessories", quantity: 31, unitCost: 5.8, salePrice: 18, reorderPoint: 12, salesTaxPaid: false, createdAt: `${nowYear}-02-02` },
    { id: "p4", sku: "NOT-118", name: "Linen Notebook", vendor: "Paper & Flax Studio", category: "Stationery", quantity: 15, unitCost: 4.2, salePrice: 14, reorderPoint: 6, salesTaxPaid: true, createdAt: `${nowYear}-02-18` },
  ],
  customers: [
    { id: "c1", externalKey: "seed-customer-1", name: "Harbor Market", email: "orders@harbormarket.example", phone: "", address: { line1: "210 Market St", city: "San Diego", state: "CA", postalCode: "92101" }, createdAt: `${nowYear}-03-04`, updatedAt: `${nowYear}-03-04` },
    { id: "c2", externalKey: "seed-customer-2", name: "Hill Street Goods", email: "hello@hillstreet.example", phone: "", address: { line1: "48 Hill Ave", city: "Los Angeles", state: "CA", postalCode: "90012" }, createdAt: `${nowYear}-03-04`, updatedAt: `${nowYear}-03-04` },
  ],
  movements: [
    { id: "m1", productId: "p1", productName: "Speckled Ceramic Mug", productSku: "CER-101", finalProductId: "p1", finalProductName: "Speckled Ceramic Mug", type: "sale", quantity: 3, unitCost: 8.5, unitPrice: 24, salesTax: 5.22, stateTax: 5.22, localTax: 0, taxRate: 7.25, stateTaxRate: 7.25, localTaxRate: 0, taxJurisdiction: "CA", taxCollected: true, customerId: "c1", customerName: "Harbor Market", customerAddress: { line1: "210 Market St", city: "San Diego", state: "CA", postalCode: "92101" }, date: `${nowYear}-03-04`, note: "Weekend market" },
    { id: "m2", productId: "p3", productName: "Canvas Market Tote", productSku: "TOT-310", finalProductId: "p3", finalProductName: "Canvas Market Tote", type: "sale", quantity: 4, unitCost: 5.8, unitPrice: 18, salesTax: 5.22, stateTax: 5.22, localTax: 0, taxRate: 7.25, stateTaxRate: 7.25, localTaxRate: 0, taxJurisdiction: "CA", taxCollected: true, customerId: "c2", customerName: "Hill Street Goods", customerAddress: { line1: "48 Hill Ave", city: "Los Angeles", state: "CA", postalCode: "90012" }, date: `${nowYear}-03-04`, note: "Weekend market" },
    { id: "m3", productId: "p2", productName: "Cedar + Moss Candle", productSku: "CAN-204", type: "purchase", quantity: 12, unitCost: 7.25, unitPrice: 0, salesTax: 7.61, date: `${nowYear}-02-20`, note: "Spring restock" },
    { id: "m4", productId: "p4", productName: "Linen Notebook", productSku: "NOT-118", finalProductName: "Stationery Gift Set", type: "production_use", quantity: 2, unitCost: 4.2, unitPrice: 0, salesTax: 0, date: `${nowYear}-03-02`, note: "Gift set assembly" },
  ],
  expenses: [
    { id: "e1", externalKey: "seed-flyer-001", purchaseSource: "Direct purchase", vendor: "Town Print Shop", asins: [], category: "Advertising & marketing", amount: 95, date: `${nowYear}-02-12`, note: "Local market flyer", personal: false, source: "manual" },
    { id: "e2", externalKey: "seed-packaging-001", purchaseSource: "Direct purchase", vendor: "Packaging Supply Co.", asins: [], category: "Office supplies", amount: 64.5, date: `${nowYear}-03-01`, note: "Packaging and labels", personal: false, source: "manual" },
  ],
};

const icons: Record<View | "plus" | "search" | "download" | "upload" | "alert" | "arrow", string> = {
  dashboard: "▦", products: "□", customers: "◉", activity: "↕", cogs: "∑", expenses: "$", taxes: "%", data: "↥", changelog: "≡", plus: "+", search: "⌕", download: "↓", upload: "↑", alert: "!", arrow: "→",
};

export default function Home() {
  const [state, setState] = useState<AppState>(seed);
  const [view, setView] = useState<View>("dashboard");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState<"saved" | "saving" | "error">("saved");
  const [query, setQuery] = useState("");
  const [productModal, setProductModal] = useState(false);
  const [movementModal, setMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<MovementType | null>(null);
  const [expenseModal, setExpenseModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/state").then((r) => r.json()).then((payload) => {
      if (payload.state) setState(normalizeState(payload.state));
    }).catch(() => setSaving("error")).finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      setSaving("saving");
      fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(state) })
        .then((r) => { if (!r.ok) throw new Error(); setSaving("saved"); })
        .catch(() => setSaving("error"));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [state, loaded]);

  const yearMovements = useMemo(() => state.movements.filter((m) => new Date(`${m.date}T12:00:00`).getFullYear() === state.settings.taxYear), [state.movements, state.settings.taxYear]);
  const yearExpenses = useMemo(() => state.expenses.filter((e) => !e.personal && new Date(`${e.date}T12:00:00`).getFullYear() === state.settings.taxYear), [state.expenses, state.settings.taxYear]);
  const metrics = useMemo(() => {
    const inventoryValue = state.products.reduce((n, p) => n + p.quantity * p.unitCost, 0);
    const units = state.products.reduce((n, p) => n + p.quantity, 0);
    const sales = yearMovements.filter((m) => m.type === "sale");
    const revenue = sales.reduce((n, m) => n + m.quantity * m.unitPrice, 0);
    const inventoryCogs = sales.reduce((n, m) => n + m.quantity * m.unitCost, 0);
    const additionalCogs = yearExpenses.filter((expense) => isDirectCogsCategory(expense.category, state.settings)).reduce((n, expense) => n + expense.amount, 0);
    const cogs = inventoryCogs + additionalCogs;
    const salesTax = sales.reduce((n, m) => n + m.salesTax, 0);
    const stateSalesTax = sales.reduce((n, m) => n + (m.stateTax ?? m.salesTax), 0);
    const localSalesTax = sales.reduce((n, m) => n + (m.localTax ?? 0), 0);
    const personalUse = yearMovements.filter((m) => m.type === "personal_use");
    const useTax = personalUse.reduce((n, m) => n + m.salesTax, 0);
    const stateUseTax = personalUse.reduce((n, m) => n + (m.stateTax ?? m.salesTax), 0);
    const localUseTax = personalUse.reduce((n, m) => n + (m.localTax ?? 0), 0);
    const expenses = yearExpenses.filter((expense) => {
      const accountingClass = expenseAccountingClassFor(expense.category, state.settings);
      return accountingClass === "Operating expense" || accountingClass === "Taxes & fees";
    }).reduce((n, expense) => n + expense.amount, 0);
    const expenseRecordsTotal = yearExpenses.reduce((n, expense) => n + expense.amount, 0);
    const purchases = yearMovements.filter((m) => m.type === "purchase").reduce((n, m) => n + m.quantity * m.unitCost, 0);
    return { inventoryValue, units, revenue, inventoryCogs, additionalCogs, cogs, salesTax, stateSalesTax, localSalesTax, useTax, stateUseTax, localUseTax, expenses, expenseRecordsTotal, purchases, grossProfit: revenue - cogs, taxableIncome: revenue - cogs - expenses };
  }, [state.products, state.settings, yearExpenses, yearMovements]);

  const saveProduct = (draft: Omit<Product, "id" | "createdAt">) => {
    setState((s) => selectedProduct
      ? { ...s, products: s.products.map((p) => p.id === selectedProduct.id ? { ...p, ...draft } : p) }
      : { ...s, products: [{ ...draft, id: uid(), createdAt: dateOnly() }, ...s.products] });
    setProductModal(false); setSelectedProduct(null);
  };

  const recordMovement = (draft: Omit<Movement, "id">) => {
    const delta = draft.type === "purchase" ? draft.quantity : draft.type === "adjustment" ? draft.quantity : -draft.quantity;
    setState((s) => ({ ...s, movements: [{ ...draft, id: uid() }, ...s.movements], products: s.products.map((p) => p.id === draft.productId ? { ...p, quantity: Math.max(0, p.quantity + delta), unitCost: draft.type === "purchase" ? draft.unitCost : p.unitCost } : p) }));
    setMovementModal(false); setMovementType(null); setSelectedProduct(null);
  };

  const openUse = (product: Product) => { setSelectedProduct(product); setMovementType("personal_use"); setMovementModal(true); };
  const openLinkedProduct = (product: Product) => { setView("products"); setQuery(product.sku); setSelectedProduct(product); setProductModal(true); };
  const nav: { id: View; label: string }[] = [
    { id: "dashboard", label: "Overview" }, { id: "products", label: "Products" }, { id: "customers", label: "Customers" }, { id: "activity", label: "Activity" }, { id: "cogs", label: "COGS" }, { id: "expenses", label: "Expenses" }, { id: "taxes", label: "Tax center" }, { id: "data", label: "Data & settings" }, { id: "changelog", label: "Changelog" },
  ];

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand"><div className="brandMark">SB</div><div><strong>StockBot</strong><span>inventory co-pilot</span></div></div>
        <nav>{nav.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}><i>{icons[item.id]}</i>{item.label}</button>)}</nav>
        <div className="sideTip"><img src="/robot.svg" alt="StockBot, a waving robot" /><strong>Everything adds up.</strong><p>Your data stays in this server&apos;s private local database.</p></div>
        <div className={`saveStatus ${saving}`}><span />{saving === "saving" ? "Saving changes…" : saving === "error" ? "Save unavailable" : "All changes saved"}</div>
      </aside>

      <main>
        <header className="topbar"><div><p className="eyebrow">{state.settings.businessName} · {state.settings.taxYear}</p><h1>{nav.find((n) => n.id === view)?.label}</h1></div><div className="topActions"><button className="secondary" onClick={() => { setMovementType(null); setMovementModal(true); }}>{icons.arrow} Record activity</button><button className="primary" onClick={() => { setSelectedProduct(null); setProductModal(true); }}>{icons.plus} Add product</button></div></header>

        {view === "dashboard" && <Dashboard state={state} metrics={metrics} onView={setView} onUse={openUse} />}
        {view === "products" && <Products state={state} query={query} setQuery={setQuery} onEdit={(p) => { setSelectedProduct(p); setProductModal(true); }} onUse={openUse} onDelete={(p) => confirm(`Delete ${p.name}? Its activity history will remain.`) && setState((s) => ({ ...s, products: s.products.filter((x) => x.id !== p.id) }))} />}
        {view === "customers" && <Customers state={state} setState={setState} />}
        {view === "activity" && <Activity state={state} onNew={() => setMovementModal(true)} />}
        {view === "cogs" && <CogsCenter state={state} onOpenProduct={openLinkedProduct} onProductionUse={() => { setSelectedProduct(null); setMovementType("production_use"); setMovementModal(true); }} onViewExpenses={() => setView("expenses")} />}
        {view === "expenses" && <Expenses state={state} setState={setState} onExpense={() => setExpenseModal(true)} onDeleteExpense={(id) => setState((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== id) }))} />}
        {view === "taxes" && <TaxCenter state={state} metrics={metrics} setState={setState} />}
        {view === "data" && <DataSettings state={state} setState={setState} fileRef={fileRef} onImport={(e) => importState(e, setState)} />}
        {view === "changelog" && <Changelog />}
      </main>

      {productModal && <ProductModal product={selectedProduct} onSave={saveProduct} onClose={() => { setProductModal(false); setSelectedProduct(null); }} />}
      {movementModal && <MovementModal products={state.products} initialProduct={selectedProduct} initialType={movementType} settings={state.settings} onSave={recordMovement} onClose={() => { setMovementModal(false); setMovementType(null); setSelectedProduct(null); }} />}
      {expenseModal && <ExpenseModal categories={expenseCategoryDefinitionsFor(state.settings)} onSave={(expense) => {
        const key = normalizeExpenseKey(expense.externalKey);
        if (state.expenses.some((existing) => normalizeExpenseKey(existing.externalKey) === key)) {
          alert(`An expense with the unique key “${expense.externalKey}” already exists.`); return;
        }
        setState((current) => ({ ...current, expenses: [{ ...expense, externalKey: expense.externalKey.trim(), id: uid() }, ...current.expenses] }));
        setExpenseModal(false);
      }} onClose={() => setExpenseModal(false)} />}
    </div>
  );
}

function Changelog() {
  const latest = changelogReleases[0];
  return <div className="changelogLayout">
    <section className="changelogHero">
      <div><span className="pill good">StockBot {latest.version}</span><h2>What&apos;s new in StockBot</h2><p>Every useful addition, workflow improvement, and important fix—kept in one tidy timeline.</p></div>
      <img src="/robot.svg" alt="StockBot robot presenting the changelog" />
    </section>
    <section className="releaseTimeline" aria-label="StockBot release history">
      {changelogReleases.map((release, index) => <article className={`releaseCard${index === 0 ? " latest" : ""}`} key={release.version}>
        <div className="releaseMarker"><span>{index === 0 ? "New" : ""}</span></div>
        <div className="releaseContent">
          <header><div><p className="eyebrow">Version {release.version} · {release.date}</p><h3>{release.title}</h3><p>{release.summary}</p></div>{index === 0 && <span className="pill good">Latest release</span>}</header>
          <div className="releaseSections">
            {release.sections.map((section) => <section key={section.title}><strong className={`changeType ${section.title.toLowerCase()}`}>{section.title}</strong><ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></section>)}
          </div>
        </div>
      </article>)}
    </section>
  </div>;
}

function Dashboard({ state, metrics, onView, onUse }: { state: AppState; metrics: Metrics; onView: (v: View) => void; onUse: (p: Product) => void }) {
  const low = state.products.filter((p) => p.quantity <= p.reorderPoint);
  const untaxed = state.products.filter((p) => !p.salesTaxPaid && p.quantity > 0);
  const recent = state.movements.slice(0, 5);
  const ownRate = resolveAddressRate(state.settings.ownAddress, state.settings).totalRate;
  return <div className="stack">
    <section className="hero"><div><span className="pill good">Inventory is under control</span><h2>Know what you have.<br />Know what it&apos;s worth.</h2><p>StockBot keeps your shelf counts, profit, and tax numbers in one tidy place.</p><button className="dark" onClick={() => onView("products")}>Review inventory {icons.arrow}</button></div><div className="heroVisual"><div className="orbit one">$</div><div className="orbit two">#</div><img src="/robot.svg" alt="StockBot robot" /></div></section>
    <section className="metricGrid">
      <Metric label="Inventory value" value={money.format(metrics.inventoryValue)} note={`${whole.format(metrics.units)} units on hand`} accent="green" />
      <Metric label={`Sales · ${state.settings.taxYear}`} value={money.format(metrics.revenue)} note={`${money.format(metrics.grossProfit)} gross profit`} accent="blue" />
      <Metric label="Cost of goods sold" value={money.format(metrics.cogs)} note={metrics.revenue ? `${Math.round((metrics.grossProfit / metrics.revenue) * 100)}% gross margin` : "No sales yet"} accent="sand" />
      <Metric label="Tax set-aside" value={money.format(metrics.salesTax + metrics.useTax)} note={`${money.format(metrics.useTax)} is personal-use tax`} accent="coral" />
    </section>
    <div className="twoCol">
      <section className="panel"><div className="panelTitle"><div><p className="eyebrow">Needs your eye</p><h3>Stock watch</h3></div><button className="textButton" onClick={() => onView("products")}>View all</button></div>
        {low.length ? low.map((p) => <div className="watchRow" key={p.id}><div className="productGlyph">{p.name.slice(0, 1)}</div><div><strong>{p.name}</strong><span>{p.sku} · {p.quantity} left</span></div><span className="pill warn">Reorder at {p.reorderPoint}</span></div>) : <Empty text="All products are above their reorder point." />}
      </section>
      <section className="panel"><div className="panelTitle"><div><p className="eyebrow">Use-tax helper</p><h3>Untaxed inventory</h3></div><span className="countBubble">{untaxed.length}</span></div>
        <p className="helperCopy">Bought for resale without sales tax. If you keep one, record personal use and StockBot adds the tax due.</p>
        {untaxed.slice(0, 2).map((p) => <div className="watchRow compact" key={p.id}><div><strong>{p.name}</strong><span>{money.format(p.unitCost)} cost · {ownRate}% {state.settings.ownAddress.state} use-tax rate</span></div><button className="smallButton" onClick={() => onUse(p)}>Mark used</button></div>)}
      </section>
    </div>
    <section className="panel"><div className="panelTitle"><div><p className="eyebrow">Latest entries</p><h3>Recent activity</h3></div><button className="textButton" onClick={() => onView("activity")}>Full ledger</button></div><MovementTable movements={recent} products={state.products} /></section>
  </div>;
}

function Metric({ label, value, note, accent }: { label: string; value: string; note: string; accent: string }) { return <article className={`metric ${accent}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }

function Products({ state, query, setQuery, onEdit, onUse, onDelete }: { state: AppState; query: string; setQuery: (v: string) => void; onEdit: (p: Product) => void; onUse: (p: Product) => void; onDelete: (p: Product) => void }) {
  type ProductSortKey = "product" | "vendor" | "quantity" | "sold" | "unitCost" | "retailValue" | "taxStatus";
  const [sort, setSort] = useState<{ key: ProductSortKey; direction: SortDirection }>({ key: "product", direction: "asc" });
  const soldByProduct = state.movements.filter((movement) => movement.type === "sale").reduce((totals, movement) => {
    totals.set(movement.productId, (totals.get(movement.productId) ?? 0) + movement.quantity);
    return totals;
  }, new Map<string, number>());
  const columns: Array<{ key: ProductSortKey; label: string }> = [
    { key: "product", label: "Product" },
    { key: "vendor", label: "Vendor" },
    { key: "quantity", label: "On hand" },
    { key: "sold", label: "Sold" },
    { key: "unitCost", label: "Unit cost" },
    { key: "retailValue", label: "Retail value" },
    { key: "taxStatus", label: "Tax status" },
  ];
  const productSortValue = (product: Product): SortValue => {
    if (sort.key === "vendor") return product.vendor;
    if (sort.key === "quantity") return product.quantity;
    if (sort.key === "sold") return soldByProduct.get(product.id) ?? 0;
    if (sort.key === "unitCost") return product.unitCost;
    if (sort.key === "retailValue") return product.quantity * product.salePrice;
    if (sort.key === "taxStatus") return product.salesTaxPaid ? "Tax paid" : "Untaxed resale";
    return `${product.name} ${product.sku} ${product.category}`;
  };
  const products = state.products
    .filter((p) => `${p.name} ${p.sku} ${p.vendor} ${p.category}`.toLowerCase().includes(query.toLowerCase()))
    .sort((left, right) => compareSortValues(productSortValue(left), productSortValue(right), sort.direction));
  const changeSort = (key: ProductSortKey) => setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  return <section className="panel tablePanel"><div className="toolbar"><label className="search"><span>{icons.search}</span><input aria-label="Search products" placeholder="Search products, vendors, SKU, or category" value={query} onChange={(e) => setQuery(e.target.value)} /></label><div className="legend"><span className="dot untaxed" /> Resale purchase — no tax paid</div></div>
    <div className="productTable"><div className="tableHead">{columns.map((column) => <button role="columnheader" aria-sort={sort.key === column.key ? (sort.direction === "asc" ? "ascending" : "descending") : "none"} type="button" key={column.key} className={`stockHeaderCell ${sort.key === column.key ? `sorted ${sort.direction}` : ""}`} onClick={() => changeSort(column.key)}><span>{column.label}</span><span className="sortPair" aria-hidden="true"><i /><b /></span></button>)}<span className="stockHeaderSpacer" /></div>
    {products.map((p) => <div className="productRow" id={`product-${p.id}`} key={p.id}><div className="productCell"><div className="productGlyph">{p.name.slice(0, 1)}</div><div className="productDescription"><strong title={p.name}>{p.name}</strong><span>{p.sku} · {p.category}</span></div></div><div className="vendorCell" title={p.vendor || "Vendor not set"}><strong>{p.vendor || "—"}</strong></div><div><strong>{p.quantity}</strong><span className={p.quantity <= p.reorderPoint ? "lowText" : "mutedText"}>{p.quantity <= p.reorderPoint ? "Low stock" : `Min ${p.reorderPoint}`}</span></div><strong>{whole.format(soldByProduct.get(p.id) ?? 0)}</strong><strong>{money.format(p.unitCost)}</strong><strong>{money.format(p.quantity * p.salePrice)}</strong><div>{p.salesTaxPaid ? <span className="pill neutral">Tax paid</span> : <span className="pill taxFree">Untaxed resale</span>}</div><div className="rowActions"><button onClick={() => onUse(p)} disabled={p.quantity < 1}>Use one</button><button onClick={() => onEdit(p)}>Edit</button><button className="dangerText" onClick={() => onDelete(p)}>Delete</button></div></div>)}
    {!products.length && <Empty text="No products match your search." />}</div></section>;
}

function Customers({ state, setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  type CustomerSortKey = "customer" | "contact" | "location" | "invoices" | "units" | "revenue" | "lastPurchase";
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: CustomerSortKey; direction: SortDirection }>({ key: "lastPurchase", direction: "desc" });
  const [preview, setPreview] = useState<InvoiceImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const invoiceRef = useRef<HTMLInputElement>(null);
  const salesFor = (customer: Customer) => state.movements.filter((movement) => movement.type === "sale" && movement.customerId === customer.id);
  const customerStats = (customer: Customer) => {
    const sales = salesFor(customer);
    return {
      invoices: new Set(sales.map((movement) => movement.invoiceNumber).filter(Boolean)).size,
      units: sales.reduce((total, movement) => total + movement.quantity, 0),
      revenue: sales.reduce((total, movement) => total + movement.quantity * movement.unitPrice, 0),
      lastPurchase: sales.map((movement) => movement.date).sort().at(-1) ?? "",
    };
  };
  const sortValue = (customer: Customer): SortValue => {
    const stats = customerStats(customer);
    if (sort.key === "contact") return `${customer.email} ${customer.phone}`;
    if (sort.key === "location") return `${customer.address.state} ${customer.address.city} ${customer.address.postalCode}`;
    if (sort.key === "invoices") return stats.invoices;
    if (sort.key === "units") return stats.units;
    if (sort.key === "revenue") return stats.revenue;
    if (sort.key === "lastPurchase") return stats.lastPurchase;
    return customer.name;
  };
  const customers = state.customers
    .filter((customer) => `${customer.name} ${customer.email} ${customer.phone} ${customer.address.line1} ${customer.address.city} ${customer.address.state} ${customer.address.postalCode}`.toLowerCase().includes(query.toLowerCase()))
    .sort((left, right) => compareSortValues(sortValue(left), sortValue(right), sort.direction));
  const invoiceSales = state.movements.filter((movement) => movement.type === "sale" && movement.sourceKey?.startsWith("invoice:"));
  const invoiceCount = new Set(invoiceSales.map((movement) => movement.invoiceNumber).filter(Boolean)).size;
  const importedRevenue = invoiceSales.reduce((total, movement) => total + movement.quantity * movement.unitPrice, 0);
  const knownProductKeys = new Set(state.products.flatMap((product) => [normalizeProductIdentifier(product.sku), `name:${normalizeProductIdentifier(product.name)}`]));
  const previewNewProductKeys = new Set((preview?.ready ?? []).filter((line) => !knownProductKeys.has(normalizeProductIdentifier(line.sku)) && !knownProductKeys.has(`name:${normalizeProductIdentifier(line.productName)}`)).map((line) => normalizeProductIdentifier(line.sku)));
  const previewNewCustomerKeys = new Set((preview?.customers ?? []).filter((imported) => !state.customers.some((customer) => normalizeCustomerKey(customer.externalKey) === normalizeCustomerKey(imported.externalKey) || (imported.email && customer.email.toLowerCase() === imported.email.toLowerCase()))).map((customer) => customer.key));
  const invoiceSummaryPreview = preview?.columns.some((column) => column.trim().toLowerCase() === "invoice token") ?? false;
  const customersWithoutAddresses = preview?.customers.filter((customer) => !customer.address.state).length ?? 0;
  const columns: Array<{ key: CustomerSortKey; label: string }> = [
    { key: "customer", label: "Customer" }, { key: "contact", label: "Contact" }, { key: "location", label: "Location" },
    { key: "invoices", label: "Invoices" }, { key: "units", label: "Units sold" }, { key: "revenue", label: "Revenue" }, { key: "lastPurchase", label: "Last purchase" },
  ];
  const changeSort = (key: CustomerSortKey) => setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  const openInvoiceImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setImporting(true);
    try {
      setPreview(parseInvoiceImportText(await file.text(), file.name, state.movements.map((movement) => movement.sourceKey).filter((key): key is string => Boolean(key))));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The invoice file could not be read.";
      setPreview({ fileName: file.name, ready: [], duplicates: [], invalid: [`${message} Use the downloadable CSV template or a JSON invoice export.`], customers: [], columns: [], invoiceCount: 0, totalQuantity: 0, totalRevenue: 0 });
    } finally { setImporting(false); }
  };
  const applyInvoiceImport = () => {
    if (!preview?.ready.length) return;
    setState((current) => {
      const existingSourceKeys = new Set(current.movements.map((movement) => movement.sourceKey).filter((key): key is string => Boolean(key)).map(normalizeInvoiceKey));
      const lines = preview.ready.filter((line) => !existingSourceKeys.has(normalizeInvoiceKey(line.sourceKey)));
      const usedCustomerKeys = new Set(lines.map((line) => line.customerKey));
      const customerIds = new Map<string, string>();
      const customers = current.customers.map((customer) => ({ ...customer, address: { ...customer.address } }));
      for (const imported of preview.customers.filter((customer) => usedCustomerKeys.has(customer.key))) {
        const existing = customers.find((customer) => normalizeCustomerKey(customer.externalKey) === normalizeCustomerKey(imported.externalKey) || (imported.email && customer.email.toLowerCase() === imported.email.toLowerCase()));
        const customerDates = lines.filter((line) => line.customerKey === imported.key).map((line) => line.date).sort();
        const updatedAt = customerDates.at(-1) ?? dateOnly();
        if (existing) {
          existing.name = existing.name || imported.name;
          existing.email = existing.email || imported.email;
          existing.phone = existing.phone || imported.phone;
          existing.address = {
            line1: existing.address.line1 || imported.address.line1,
            city: existing.address.city || imported.address.city,
            state: existing.address.state || imported.address.state,
            postalCode: existing.address.postalCode || imported.address.postalCode,
          };
          existing.updatedAt = existing.updatedAt > updatedAt ? existing.updatedAt : updatedAt;
          customerIds.set(imported.key, existing.id);
        } else {
          const customer: Customer = { id: uid(), externalKey: imported.externalKey, name: imported.name, email: imported.email, phone: imported.phone, address: { ...blankAddress(imported.address.state), ...imported.address }, createdAt: customerDates[0] ?? dateOnly(), updatedAt };
          customers.unshift(customer);
          customerIds.set(imported.key, customer.id);
        }
      }

      const productsBySku = new Map(current.products.map((product) => [normalizeProductIdentifier(product.sku), product]));
      const productsByName = new Map(current.products.map((product) => [normalizeProductIdentifier(product.name), product]));
      const productAdditions: Product[] = [];
      const movementAdditions: Movement[] = [];
      for (const line of lines) {
        let product = productsBySku.get(normalizeProductIdentifier(line.sku)) ?? productsByName.get(normalizeProductIdentifier(line.productName));
        if (!product) {
          product = { id: uid(), sku: line.sku, name: line.productName, vendor: "", category: line.category, quantity: 0, unitCost: line.unitCost ?? 0, salePrice: line.unitPrice, reorderPoint: 0, salesTaxPaid: false, createdAt: line.date };
          productAdditions.push(product);
          productsBySku.set(normalizeProductIdentifier(product.sku), product);
          productsByName.set(normalizeProductIdentifier(product.name), product);
        }
        const importedCustomer = preview.customers.find((customer) => customer.key === line.customerKey);
        const customerId = customerIds.get(line.customerKey);
        const address = importedCustomer ? { ...blankAddress(importedCustomer.address.state), ...importedCustomer.address } : blankAddress("");
        const stateSetting = current.settings.stateTaxes[address.state] ?? { enabled: false, rate: 0 };
        const resolvedRate = resolveAddressRate(address, current.settings);
        const taxableAmount = line.quantity * line.unitPrice;
        const calculatedTax = stateSetting.enabled ? roundTax(taxableAmount, resolvedRate.totalRate) : 0;
        const salesTax = line.salesTax ?? calculatedTax;
        const effectiveRate = taxableAmount > 0 ? roundRate((salesTax / taxableAmount) * 100) : 0;
        const stateShare = resolvedRate.totalRate > 0 ? resolvedRate.stateRate / resolvedRate.totalRate : 1;
        const stateTax = Math.round(salesTax * stateShare * 100) / 100;
        const localTax = Math.round((salesTax - stateTax) * 100) / 100;
        movementAdditions.push({
          id: uid(), productId: product.id, productName: product.name, productSku: product.sku, finalProductId: product.id, finalProductName: product.name,
          type: "sale", quantity: line.quantity, unitCost: line.unitCost ?? product.unitCost, unitPrice: line.unitPrice, salesTax, stateTax, localTax,
          taxRate: effectiveRate, stateTaxRate: resolvedRate.stateRate, localTaxRate: resolvedRate.localRate, taxJurisdiction: address.state || undefined,
          localJurisdiction: resolvedRate.jurisdiction, taxCollected: salesTax > 0, customerAddress: address, customerId, customerName: importedCustomer?.name,
          sourceKey: line.sourceKey, invoiceNumber: line.invoiceNumber, date: line.date, note: `Imported invoice ${line.invoiceNumber}`,
        });
        existingSourceKeys.add(normalizeInvoiceKey(line.sourceKey));
      }
      return { ...current, version: 16, customers, products: [...productAdditions, ...current.products], movements: [...movementAdditions, ...current.movements] };
    });
    setPreview(null);
  };
  return <div className="customerLayout">
    <section className="customerHero"><div><p className="eyebrow">Sales history</p><h2>Customers and old invoices, connected.</h2><p>Bring in historical invoice lines without changing today&apos;s on-hand counts. Each unique line increases the product&apos;s sold total and becomes part of the customer&apos;s history.</p></div><div className="customerHeroActions"><button className="dark" onClick={() => invoiceRef.current?.click()} disabled={importing}>{importing ? "Reading invoices…" : "↑ Import old invoices"}</button><button className="secondary" onClick={downloadInvoiceTemplate}>Download template</button><input ref={invoiceRef} hidden type="file" accept=".csv,text/csv,.json,application/json" onChange={openInvoiceImport} /></div></section>
    <section className="metricGrid"><Metric label="Customers" value={whole.format(state.customers.length)} note="Saved customer records" accent="green" /><Metric label="Imported invoices" value={whole.format(invoiceCount)} note={`${whole.format(invoiceSales.length)} unique invoice lines`} accent="blue" /><Metric label="Historical units sold" value={whole.format(invoiceSales.reduce((total, movement) => total + movement.quantity, 0))} note="Does not reduce on-hand inventory" accent="sand" /><Metric label="Imported revenue" value={money.format(importedRevenue)} note="From historical invoices" accent="coral" /></section>
    <section className="panel customerPanel"><div className="toolbar"><label className="search"><span>{icons.search}</span><input aria-label="Search customers" placeholder="Search customer, email, phone, or location" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="legend">Invoice imports are duplicate-safe by invoice and line ID</div></div><div className="customerTable"><div className="customerHead">{columns.map((column) => <button role="columnheader" aria-sort={sort.key === column.key ? (sort.direction === "asc" ? "ascending" : "descending") : "none"} type="button" key={column.key} className={`stockHeaderCell ${sort.key === column.key ? `sorted ${sort.direction}` : ""}`} onClick={() => changeSort(column.key)}><span>{column.label}</span><span className="sortPair" aria-hidden="true"><i /><b /></span></button>)}</div>{customers.map((customer) => { const stats = customerStats(customer); return <div className="customerRow" key={customer.id}><div className="customerName"><div className="productGlyph">{customer.name.slice(0, 1)}</div><span><strong title={customer.name}>{customer.name}</strong><small>{customer.externalKey}</small></span></div><div><strong>{customer.email || "—"}</strong><small>{customer.phone || "No phone"}</small></div><div><strong>{customer.address.city && customer.address.state ? `${customer.address.city}, ${customer.address.state}` : customer.address.state || "—"}</strong><small>{customer.address.postalCode || "No ZIP"}</small></div><strong>{whole.format(stats.invoices)}</strong><strong>{whole.format(stats.units)}</strong><strong>{money.format(stats.revenue)}</strong><strong>{stats.lastPurchase || "—"}</strong></div>; })}{!customers.length && <Empty text="No customers yet. Import an old invoice file to build your customer directory." />}</div></section>
    {preview && <Modal title="Review old invoice import" eyebrow="Historical sales import" onClose={() => setPreview(null)}><div className="importSummary"><article><span>Unique invoice lines</span><strong>{preview.ready.length}</strong></article><article><span>New products</span><strong>{previewNewProductKeys.size}</strong></article><article><span>New customers</span><strong>{previewNewCustomerKeys.size}</strong></article></div><p className="settingsCopy"><strong>{preview.fileName}</strong> contains {preview.invoiceCount} invoice{preview.invoiceCount === 1 ? "" : "s"}, {whole.format(preview.totalQuantity)} units, and {money.format(preview.totalRevenue)} in historical revenue. Existing products gain sold history only; on-hand quantities stay unchanged.</p>{invoiceSummaryPreview && <div className="formNotice"><strong>Summary-only export</strong><span>Quantities are inferred only from clear invoice-title patterns. Missing SKUs receive stable historical IDs and missing unit costs start at $0. {customersWithoutAddresses ? `${customersWithoutAddresses} customer address${customersWithoutAddresses === 1 ? " is" : "es are"} absent, so no destination tax is calculated for those invoices.` : ""}</span></div>}{preview.ready.length > 0 && <div className="importPreviewList">{preview.ready.slice(0, 7).map((line) => <div key={line.sourceKey}><span><strong>{line.productName}</strong><small>{line.invoiceNumber} · {line.sku} · {line.quantity} sold · {preview.customers.find((customer) => customer.key === line.customerKey)?.name}</small></span><b>{money.format(line.quantity * line.unitPrice)}</b></div>)}{preview.ready.length > 7 && <small>+ {preview.ready.length - 7} more lines</small>}</div>}{preview.duplicates.length > 0 && <details className="importDetails"><summary>{preview.duplicates.length} duplicate invoice line{preview.duplicates.length === 1 ? "" : "s"} skipped</summary><p>{preview.duplicates.slice(0, 12).join(", ")}</p></details>}{preview.invalid.length > 0 && <details className="importDetails"><summary>{preview.invalid.length} invalid row{preview.invalid.length === 1 ? "" : "s"} skipped</summary>{preview.invalid.slice(0, 12).map((message) => <p key={message}>{message}</p>)}</details>}<div className="modalActions"><button type="button" className="secondary" onClick={() => setPreview(null)}>Cancel</button><button className="primary" type="button" disabled={!preview.ready.length} onClick={applyInvoiceImport}>Import unique invoice lines</button></div></Modal>}
  </div>;
}

function Activity({ state, onNew }: { state: AppState; onNew: () => void }) { return <section className="panel tablePanel"><div className="panelTitle"><div><p className="eyebrow">Permanent stock trail</p><h3>Inventory ledger</h3></div><button className="primary" onClick={onNew}>+ Record activity</button></div><MovementTable movements={state.movements} products={state.products} /><p className="footnote">Activity entries remain in the ledger even if a product is later removed.</p></section>; }

function CogsCenter({ state, onOpenProduct, onProductionUse, onViewExpenses }: { state: AppState; onOpenProduct: (product: Product) => void; onProductionUse: () => void; onViewExpenses: () => void }) {
  type CogsSortKey = "date" | "product" | "type" | "quantity" | "unitCost" | "totalCost" | "revenue" | "finalProduct";
  const [query, setQuery] = useState("");
  const [year, setYear] = useState(String(state.settings.taxYear));
  const [kind, setKind] = useState<"all" | "sale" | "production_use">("all");
  const [sort, setSort] = useState<{ key: CogsSortKey; direction: SortDirection }>({ key: "date", direction: "desc" });
  const productFor = (movement: Movement) => state.products.find((product) => product.id === movement.productId);
  const productNameFor = (movement: Movement) => movement.productName || productFor(movement)?.name || "Removed product";
  const productSkuFor = (movement: Movement) => movement.productSku || productFor(movement)?.sku || "No SKU snapshot";
  const finalProductFor = (movement: Movement) => movement.finalProductName?.trim() || (movement.type === "sale" ? productNameFor(movement) : "Unassigned");
  const linkedFinalProductFor = (movement: Movement) => state.products.find((product) => product.id === movement.finalProductId)
    ?? state.products.find((product) => product.name.trim().toLowerCase() === finalProductFor(movement).toLowerCase());
  const cogsEntries = state.movements.filter((movement) => movement.type === "sale" || movement.type === "production_use");
  const years = Array.from(new Set([state.settings.taxYear, ...cogsEntries.map((movement) => Number(movement.date.slice(0, 4)))]))
    .filter(Number.isFinite)
    .sort((left, right) => right - left);
  const yearEntries = cogsEntries.filter((movement) => year === "All" || movement.date.startsWith(`${year}-`));
  const soldEntries = yearEntries.filter((movement) => movement.type === "sale");
  const productionEntries = yearEntries.filter((movement) => movement.type === "production_use");
  const soldCogs = soldEntries.reduce((total, movement) => total + movement.quantity * movement.unitCost, 0);
  const directCogsExpenses = state.expenses.filter((expense) =>
    !expense.personal
    && isDirectCogsCategory(expense.category, state.settings)
    && (year === "All" || expense.date.startsWith(`${year}-`)),
  ).reduce((total, expense) => total + expense.amount, 0);
  const recognizedCogs = soldCogs + directCogsExpenses;
  const revenue = soldEntries.reduce((total, movement) => total + movement.quantity * movement.unitPrice, 0);
  const productionCost = productionEntries.reduce((total, movement) => total + movement.quantity * movement.unitCost, 0);
  const filteredEntries = yearEntries.filter((movement) => {
    if (kind !== "all" && movement.type !== kind) return false;
    const haystack = `${productNameFor(movement)} ${productSkuFor(movement)} ${finalProductFor(movement)} ${movement.note}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });
  const sortValue = (movement: Movement): SortValue => {
    if (sort.key === "product") return `${productNameFor(movement)} ${productSkuFor(movement)}`;
    if (sort.key === "type") return movement.type;
    if (sort.key === "quantity") return movement.quantity;
    if (sort.key === "unitCost") return movement.unitCost;
    if (sort.key === "totalCost") return movement.quantity * movement.unitCost;
    if (sort.key === "revenue") return movement.type === "sale" ? movement.quantity * movement.unitPrice : -1;
    if (sort.key === "finalProduct") return finalProductFor(movement);
    return movement.date;
  };
  const entries = [...filteredEntries].sort((left, right) => compareSortValues(sortValue(left), sortValue(right), sort.direction));
  const columns: Array<{ key: CogsSortKey; label: string }> = [
    { key: "date", label: "Date" }, { key: "product", label: "Cost item" }, { key: "type", label: "Source" },
    { key: "quantity", label: "Qty" }, { key: "unitCost", label: "Unit cost" }, { key: "totalCost", label: "Total cost" },
    { key: "revenue", label: "Revenue" }, { key: "finalProduct", label: "Used in final product" },
  ];
  const changeSort = (key: CogsSortKey) => setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  return <div className="cogsLayout">
    <section className="cogsHero"><div><p className="eyebrow">Inventory and cost trail</p><h2>From purchase to recognized COGS.</h2><p>Product costs tracked in inventory stay on hand until they are sold or allocated. Product costs marked for direct recognition become COGS immediately.</p></div><button className="dark" onClick={onProductionUse}>+ Use item in final product</button></section>
    <section className="metricGrid cogsMetrics"><Metric label="Sold-item COGS" value={money.format(soldCogs)} note={`${whole.format(soldEntries.reduce((total, movement) => total + movement.quantity, 0))} units sold`} accent="sand" /><Metric label="Direct COGS expenses" value={money.format(directCogsExpenses)} note="Product costs recognized directly" accent="coral" /><Metric label="Sales revenue" value={money.format(revenue)} note={`${soldEntries.length} sales entries`} accent="blue" /><Metric label="Gross profit" value={money.format(revenue - recognizedCogs)} note={revenue ? `${Math.round(((revenue - recognizedCogs) / revenue) * 100)}% margin after recognized COGS` : "No sales in this view"} accent="green" /><Metric label="Production-use cost" value={money.format(productionCost)} note="Allocated, not yet sale COGS" accent="coral" /></section>
    <section className="panel cogsPanel"><div className="panelTitle"><div><p className="eyebrow">Item-level detail</p><h3>COGS and production allocations</h3></div><span className="pill neutral">{entries.length} entries</span></div><div className="cogsToolbar"><label className="search"><span>{icons.search}</span><input aria-label="Search COGS records" placeholder="Search cost item, SKU, note, or final product" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label>Year<select value={year} onChange={(event) => setYear(event.target.value)}><option value="All">All years</option>{years.map((value) => <option value={value} key={value}>{value}</option>)}</select></label><label>Entry type<select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="all">All cost entries</option><option value="sale">Customer sales</option><option value="production_use">Production use</option></select></label></div>
      <div className="cogsTable"><div className="ledgerHead cogsHead">{columns.map((column) => <button role="columnheader" aria-sort={sort.key === column.key ? (sort.direction === "asc" ? "ascending" : "descending") : "none"} type="button" key={column.key} className={`stockHeaderCell ${sort.key === column.key ? `sorted ${sort.direction}` : ""}`} onClick={() => changeSort(column.key)}><span>{column.label}</span><span className="sortPair" aria-hidden="true"><i /><b /></span></button>)}</div>{entries.map((movement) => { const totalCost = movement.quantity * movement.unitCost; const itemName = productNameFor(movement); const finalProduct = finalProductFor(movement); const linkedProduct = linkedFinalProductFor(movement); return <div className="cogsRow" key={movement.id}><span>{new Date(`${movement.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span><div className="cogsName"><strong title={itemName}>{itemName}</strong><small>{productSkuFor(movement)}{movement.note ? ` · ${movement.note}` : ""}</small></div><span className={`activityTag ${movement.type}`}>{movement.type === "sale" ? "Sold" : "Production use"}</span><strong>{whole.format(movement.quantity)}</strong><strong>{money.format(movement.unitCost)}</strong><strong>{money.format(totalCost)}</strong><strong>{movement.type === "sale" ? money.format(movement.quantity * movement.unitPrice) : "—"}</strong><div className="cogsFinal">{linkedProduct ? <a className="cogsProductLink" href={`#product-${linkedProduct.id}`} title={`Open ${linkedProduct.name}`} onClick={(event) => { event.preventDefault(); onOpenProduct(linkedProduct); }}>{finalProduct}</a> : <strong title={finalProduct}>{finalProduct}</strong>}{linkedProduct && <small>Open product</small>}</div></div>; })}{!entries.length && <Empty text="No COGS entries match this view." />}</div>
      <p className="footnote">Production-use cost reduces component inventory but is shown separately from recognized sale COGS to prevent double counting on tax reports.</p>
    </section>
    <PurchasedInventorySection state={state} onViewExpenses={onViewExpenses} />
  </div>;
}

function MovementTable({ movements, products }: { movements: Movement[]; products: Product[] }) {
  type MovementSortKey = "date" | "product" | "type" | "quantity" | "amount" | "tax";
  const [sort, setSort] = useState<{ key: MovementSortKey; direction: SortDirection }>({ key: "date", direction: "desc" });
  const columns: Array<{ key: MovementSortKey; label: string }> = [
    { key: "date", label: "Date" }, { key: "product", label: "Product" }, { key: "type", label: "Activity" },
    { key: "quantity", label: "Qty" }, { key: "amount", label: "Amount" }, { key: "tax", label: "Tax" },
  ];
  const productFor = (movement: Movement) => products.find((product) => product.id === movement.productId);
  const amountFor = (movement: Movement) => movement.quantity * (movement.type === "sale" ? movement.unitPrice : movement.unitCost);
  const movementSortValue = (movement: Movement): SortValue => {
    if (sort.key === "product") return movement.productName || productFor(movement)?.name || "Removed product";
    if (sort.key === "type") return movement.type.replaceAll("_", " ");
    if (sort.key === "quantity") return movement.quantity;
    if (sort.key === "amount") return amountFor(movement);
    if (sort.key === "tax") return movement.salesTax;
    return movement.date;
  };
  const sortedMovements = [...movements].sort((left, right) => compareSortValues(movementSortValue(left), movementSortValue(right), sort.direction));
  const changeSort = (key: MovementSortKey) => setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  return <div className="ledger"><div className="ledgerHead">{columns.map((column) => <button role="columnheader" aria-sort={sort.key === column.key ? (sort.direction === "asc" ? "ascending" : "descending") : "none"} type="button" key={column.key} className={`stockHeaderCell ${sort.key === column.key ? `sorted ${sort.direction}` : ""}`} onClick={() => changeSort(column.key)}><span>{column.label}</span><span className="sortPair" aria-hidden="true"><i /><b /></span></button>)}</div>{sortedMovements.map((m) => { const p = productFor(m); const amount = amountFor(m); return <div className="ledgerRow" key={m.id}><span>{new Date(`${m.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span><div><strong>{m.productName || p?.name || "Removed product"}</strong><small>{m.note || m.productSku || p?.sku}</small></div><span className={`activityTag ${m.type}`}>{m.type.replaceAll("_", " ")}</span><strong>{m.type === "purchase" || (m.type === "adjustment" && m.quantity > 0) ? "+" : "−"}{Math.abs(m.quantity)}</strong><strong>{money.format(amount)}</strong><span className="taxLedger">{m.salesTax ? money.format(m.salesTax) : "—"}{(m.localTax ?? 0) > 0 && <small>{money.format(m.localTax ?? 0)} local</small>}</span></div>})}{!movements.length && <Empty text="No activity has been recorded yet." />}</div>;
}

type PurchasedInventorySortKey = "name" | "category" | "quantity" | "unitCost" | "totalCost" | "vendor" | "purchaseSource" | "date" | "externalKey";

function PurchasedInventorySection({ state, onViewExpenses }: { state: AppState; onViewExpenses: () => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | "All">("All");
  const [purchaseSource, setPurchaseSource] = useState("All");
  const [sort, setSort] = useState<{ key: PurchasedInventorySortKey; direction: SortDirection }>({ key: "date", direction: "desc" });
  const inventoryCategories = expenseCategoryDefinitionsFor(state.settings).filter((definition) => definition.accountingClass === "Product cost" && definition.costTiming === "Track in inventory").map((definition) => definition.name);
  const items = state.expenses.filter((expense) => !expense.personal && isTrackedInventoryCategory(expense.category, state.settings)).map((expense) => ({
    expense,
    ...parseExpenseInventoryDescription(expense.note, expense.amount),
  }));
  const purchaseSources = Array.from(new Set(items.map((item) => item.expense.purchaseSource).filter(Boolean))).sort((left, right) => left.localeCompare(right));
  const hasUnassignedSource = items.some((item) => !item.expense.purchaseSource);
  const visibleItems = items.filter((item) => {
    const matchesCategory = category === "All" || item.expense.category === category;
    const matchesSource = purchaseSource === "All" || (purchaseSource === "__unassigned" ? !item.expense.purchaseSource : item.expense.purchaseSource === purchaseSource);
    const haystack = `${item.name} ${item.expense.vendor} ${item.expense.purchaseSource} ${item.expense.externalKey} ${item.expense.category}`.toLowerCase();
    return matchesCategory && matchesSource && haystack.includes(query.trim().toLowerCase());
  });
  const sortValue = (item: typeof items[number]): SortValue => {
    if (sort.key === "name") return item.name;
    if (sort.key === "category") return item.expense.category;
    if (sort.key === "quantity") return item.quantity;
    if (sort.key === "unitCost") return item.unitCost;
    if (sort.key === "totalCost") return item.expense.amount;
    if (sort.key === "vendor") return item.expense.vendor;
    if (sort.key === "purchaseSource") return item.expense.purchaseSource;
    if (sort.key === "externalKey") return item.expense.externalKey;
    return item.expense.date;
  };
  const sortedItems = [...visibleItems].sort((left, right) => {
    const comparison = compareSortValues(sortValue(left), sortValue(right), sort.direction);
    return comparison || left.expense.externalKey.localeCompare(right.expense.externalKey);
  });
  const changeSort = (key: PurchasedInventorySortKey) => setSort((current) => ({
    key,
    direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
  }));
  const columns: Array<{ key: PurchasedInventorySortKey; label: string }> = [
    { key: "name", label: "Item" },
    { key: "category", label: "Inventory type" },
    { key: "quantity", label: "Item count" },
    { key: "unitCost", label: "Cost per item" },
    { key: "totalCost", label: "Total cost" },
    { key: "vendor", label: "Vendor" },
    { key: "purchaseSource", label: "Purchase source" },
    { key: "date", label: "Purchased" },
    { key: "externalKey", label: "Expense key" },
  ];
  const totalUnits = items.reduce((total, item) => total + item.quantity, 0);
  const totalValue = items.reduce((total, item) => total + item.expense.amount, 0);

  return <div className="purchaseInventoryLayout">
    <div className="metricGrid"><Metric label="Purchased inventory value" value={money.format(totalValue)} note={`${whole.format(items.length)} inventory expense records`} accent="green" /><Metric label="Individual items" value={whole.format(totalUnits)} note="Pack descriptions expanded" accent="blue" /><Metric label="Inventory categories" value={whole.format(inventoryCategories.length)} note="Built-in and custom categories" accent="sand" /></div>
    <section className="panel purchaseInventoryPanel">
      <div className="panelTitle"><div><p className="eyebrow">Purchased inventory</p><h3>Inventory waiting to become COGS</h3></div><button className="secondary" onClick={onViewExpenses}>Review expense categories</button></div>
      <p className="settingsCopy">Product costs set to Track in inventory appear here. Changing their accounting class or cost timing removes them from this list without deleting the expense record.</p>
      <div className="purchaseInventoryToolbar"><label className="search"><span>{icons.search}</span><input aria-label="Search purchased inventory" placeholder="Search item, vendor, source, category, or expense key" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label>Category<select aria-label="Purchased inventory category" value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory | "All")}><option>All</option>{inventoryCategories.map((inventoryCategory) => <option key={inventoryCategory}>{inventoryCategory}</option>)}</select></label><label>Purchase source<select aria-label="Purchased inventory source" value={purchaseSource} onChange={(event) => setPurchaseSource(event.target.value)}><option value="All">All sources</option>{purchaseSources.map((source) => <option value={source} key={source}>{source}</option>)}{hasUnassignedSource && <option value="__unassigned">Unassigned</option>}</select></label></div>
      <div className="purchaseInventoryTable"><div className="purchaseInventoryHead">{columns.map((column) => <button role="columnheader" aria-sort={sort.key === column.key ? (sort.direction === "asc" ? "ascending" : "descending") : "none"} type="button" key={column.key} className={`stockHeaderCell ${sort.key === column.key ? `sorted ${sort.direction}` : ""}`} onClick={() => changeSort(column.key)}><span>{column.label}</span><span className="sortPair" aria-hidden="true"><i /><b /></span></button>)}</div>{sortedItems.map((item) => <div className="purchaseInventoryRow" key={item.expense.id}><div className="purchaseInventoryName"><strong title={item.name}>{item.name}</strong><small title={item.expense.note}>{item.expense.note || "Untitled inventory item"}</small></div><span><span className="inventoryType">{item.expense.category}</span></span><strong>{whole.format(item.quantity)}</strong><strong>{money.format(item.unitCost)}</strong><strong>{money.format(item.expense.amount)}</strong><span>{item.expense.vendor || "—"}</span><span>{item.expense.purchaseSource || "Unassigned"}</span><span>{new Date(`${item.expense.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span><span><code title={item.expense.externalKey}>{item.expense.externalKey}</code></span></div>)}{!sortedItems.length && <Empty text={items.length ? "No purchased inventory matches this view." : "Assign a Product cost category to Track in inventory to see it here."} />}</div>
    </section>
  </div>;
}

function Expenses({ state, setState, onExpense, onDeleteExpense }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onExpense: () => void; onDeleteExpense: (id: string) => void }) {
  const [expenseQuery, setExpenseQuery] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory | "All">("All");
  const [expenseAccountingClass, setExpenseAccountingClass] = useState<ExpenseAccountingClass | "All">("All");
  const [expenseCostTiming, setExpenseCostTiming] = useState<ExpenseCostTiming | "All">("All");
  const [expensePurchaseSource, setExpensePurchaseSource] = useState("All");
  const [expenseUse, setExpenseUse] = useState<"All" | "Business" | "Personal">("All");
  const [newExpenseCategory, setNewExpenseCategory] = useState("");
  const [newExpenseAccountingClass, setNewExpenseAccountingClass] = useState<ExpenseAccountingClass>("Operating expense");
  const [newExpenseCostTiming, setNewExpenseCostTiming] = useState<ExpenseCostTiming>("Track in inventory");
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
  const [categoryNameDrafts, setCategoryNameDrafts] = useState<Record<string, string>>({});
  const [expenseYear, setExpenseYear] = useState<string>("All");
  const [expenseImport, setExpenseImport] = useState<ExpenseImportPreview | null>(null);
  const [importPurchaseSource, setImportPurchaseSource] = useState("");
  const [importing, setImporting] = useState(false);
  const [columnConfigOpen, setColumnConfigOpen] = useState(false);
  const [columnQuery, setColumnQuery] = useState("");
  const [draggedExpenseColumn, setDraggedExpenseColumn] = useState<string | null>(null);
  const [expenseSort, setExpenseSort] = useState<{ key: string; direction: SortDirection }>({ key: "date", direction: "desc" });
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const expenseColumnWasDragged = useRef(false);
  const expenseSelectionAnchor = useRef<string | null>(null);
  const expenseFileRef = useRef<HTMLInputElement>(null);
  const availableExpenseCategoryDefinitions = expenseCategoryDefinitionsFor(state.settings);
  const availableExpenseCategories = expenseCategoriesFor(state.settings);
  const columnDefinitions = expenseColumnDefinitionsFor(state.expenses);
  const columnByKey = new Map(columnDefinitions.map((column) => [column.key, column]));
  const orderedColumnKeys = mergeExpenseColumnOrder(state.settings.expenseColumnOrder, columnDefinitions);
  const configuredVisibleKeys = state.settings.expenseVisibleColumns.filter((key) => columnByKey.has(key));
  const visibleColumnKeys = configuredVisibleKeys.length ? configuredVisibleKeys : defaultExpenseVisibleColumns;
  const orderedColumns = orderedColumnKeys.map((key) => columnByKey.get(key)).filter((column): column is ExpenseColumnDefinition => Boolean(column));
  const visibleColumns = orderedColumns.filter((column) => visibleColumnKeys.includes(column.key));
  const expenseGridColumns = `${visibleColumns.map((column) => column.width).join(" ")} 34px`;
  const columnOptions = orderedColumns.filter((column) => column.label.toLowerCase().includes(columnQuery.toLowerCase()));
  const years = Array.from(new Set(state.expenses.map((expense) => Number(expense.date.slice(0, 4))))).filter(Number.isFinite).sort((a, b) => b - a);
  const purchaseSources = Array.from(new Set(state.expenses.map((expense) => expense.purchaseSource).filter(Boolean))).sort((left, right) => left.localeCompare(right));
  const hasUnassignedSource = state.expenses.some((expense) => !expense.purchaseSource);
  const selectedExpenses = state.expenses.filter((expense) => expenseYear === "All" || expense.date.startsWith(`${expenseYear}-`));
  const filteredExpenses = selectedExpenses.filter((expense) => {
    const matchesCategory = expenseCategory === "All" || expense.category === expenseCategory;
    const matchesAccountingClass = expenseAccountingClass === "All" || expenseAccountingClassFor(expense.category, state.settings) === expenseAccountingClass;
    const matchesCostTiming = expenseCostTiming === "All" || expenseCostTimingFor(expense.category, state.settings) === expenseCostTiming;
    const matchesSource = expensePurchaseSource === "All" || (expensePurchaseSource === "__unassigned" ? !expense.purchaseSource : expense.purchaseSource === expensePurchaseSource);
    const matchesUse = expenseUse === "All" || (expenseUse === "Personal" ? expense.personal : !expense.personal);
    const haystack = `${expense.vendor} ${expense.purchaseSource} ${expense.asins.join(" ")} ${expense.externalKey} ${expense.category} ${expenseAccountingClassFor(expense.category, state.settings)} ${expenseCostTimingFor(expense.category, state.settings) ?? ""} ${expense.note} ${Object.values(expense.fields ?? {}).join(" ")}`.toLowerCase();
    return matchesCategory && matchesAccountingClass && matchesCostTiming && matchesSource && matchesUse && haystack.includes(expenseQuery.toLowerCase());
  });
  const expenseSortValue = (expense: Expense): SortValue => {
    if (expenseSort.key === "vendor") return expense.vendor;
    if (expenseSort.key === "purchaseSource") return expense.purchaseSource;
    if (expenseSort.key === "asin") return expense.asins.join(" ");
    if (expenseSort.key === "note") return expense.note;
    if (expenseSort.key === "category") return expense.category;
    if (expenseSort.key === "accountingClass") return expenseAccountingClassFor(expense.category, state.settings);
    if (expenseSort.key === "costTiming") return expenseCostTimingFor(expense.category, state.settings) ?? "";
    if (expenseSort.key === "personal") return expense.personal;
    if (expenseSort.key === "externalKey") return expense.externalKey;
    if (expenseSort.key === "amount") return expense.amount;
    if (expenseSort.key === "source") return expense.source;
    if (expenseSort.key === "date") return expense.date;
    const field = columnByKey.get(expenseSort.key)?.field;
    const raw = field ? expense.fields?.[field] ?? "" : "";
    if (/date/i.test(field ?? "")) {
      const timestamp = Date.parse(raw);
      if (Number.isFinite(timestamp)) return timestamp;
    }
    if (/amount|total|tax|promotion|ppu|quantity|price|cost|rate/i.test(field ?? "")) {
      const numberValue = Number(raw.replace(/[$,%()\s,]/g, ""));
      if (raw.trim() && Number.isFinite(numberValue)) return numberValue;
    }
    return raw;
  };
  const visibleExpenses = [...filteredExpenses].sort((left, right) => {
    const comparison = compareSortValues(expenseSortValue(left), expenseSortValue(right), expenseSort.direction);
    return comparison || left.externalKey.localeCompare(right.externalKey);
  });
  const selectedExpenseSet = new Set(selectedExpenseIds);
  const visibleExpenseIds = visibleExpenses.map((expense) => expense.id);
  const businessExpenses = selectedExpenses.filter((expense) => !expense.personal);
  const personalExpenses = selectedExpenses.filter((expense) => expense.personal);
  const categoryTotals = availableExpenseCategoryDefinitions.map(({ name: category, accountingClass, costTiming }) => ({ category, accountingClass, costTiming, total: businessExpenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount, 0) })).filter((item) => item.total > 0).sort((a, b) => b.total - a.total);
  const expenseTotal = businessExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const personalExpenseTotal = personalExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalForClass = (accountingClass: ExpenseAccountingClass) => businessExpenses.filter((expense) => expenseAccountingClassFor(expense.category, state.settings) === accountingClass).reduce((sum, expense) => sum + expense.amount, 0);
  const cogsTotal = businessExpenses.filter((expense) => isDirectCogsCategory(expense.category, state.settings)).reduce((sum, expense) => sum + expense.amount, 0);
  const inventoryPurchaseTotal = businessExpenses.filter((expense) => isTrackedInventoryCategory(expense.category, state.settings)).reduce((sum, expense) => sum + expense.amount, 0);
  const operatingTotal = totalForClass("Operating expense") + totalForClass("Taxes & fees");
  const importPreviewExpenses = expenseImport ? [...expenseImport.ready, ...expenseImport.updates] : [];
  const openExpenseImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const preview = await parseExpenseImport(file, state.expenses, state.settings.customExpenseCategories.map((category) => category.name));
      const suggestedSources = Array.from(new Set([...preview.ready, ...preview.updates].map((expense) => expense.purchaseSource).filter(Boolean)));
      const fileLabel = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
      setImportPurchaseSource(suggestedSources.length === 1 ? suggestedSources[0] : fileLabel);
      setExpenseImport(preview);
    }
    catch (caught) {
      const message = caught instanceof Error ? caught.message : "The file could not be read.";
      setImportPurchaseSource("");
      setExpenseImport({ fileName: file.name, ready: [], updates: [], duplicates: [], skipped: [], invalid: [`${message} Use a CSV or JSON expense export.`], years: [], readyTotal: 0, columns: [] });
    } finally { setImporting(false); }
  };
  const applyExpenseImport = () => {
    const sourceKey = importPurchaseSource.trim();
    if (!expenseImport || !sourceKey || (!expenseImport.ready.length && !expenseImport.updates.length)) return;
    const importedYears = expenseImport.years;
    setState((current) => {
      const keys = new Set(current.expenses.map((expense) => normalizeExpenseKey(expense.externalKey)));
      const additions: Expense[] = [];
      const updates = new Map(expenseImport.updates.map((expense) => [normalizeExpenseKey(expense.externalKey), expense]));
      for (const draft of expenseImport.ready) {
        const key = normalizeExpenseKey(draft.externalKey);
        if (keys.has(key)) continue;
        keys.add(key); additions.push({ ...draft, personal: draft.personal ?? false, purchaseSource: sourceKey, id: uid() });
      }
      const enriched = current.expenses.map((expense) => {
        const update = updates.get(normalizeExpenseKey(expense.externalKey));
        return update ? {
          ...expense,
          vendor: update.vendor,
          asins: update.asins.length ? update.asins : expense.asins,
          amount: update.amount,
          date: update.date,
          note: update.note || expense.note,
          personal: update.personal ?? expense.personal,
          purchaseSource: sourceKey,
          fields: update.fields,
          importedAt: expense.importedAt ?? update.importedAt,
        } : expense;
      });
      const importedColumnKeys = expenseImport.columns.filter((label) => label !== "ASIN").map(expenseCsvColumnKey);
      const expenseColumnOrder = [...current.settings.expenseColumnOrder, ...importedColumnKeys.filter((key) => !current.settings.expenseColumnOrder.includes(key))];
      return { ...current, expenses: [...additions, ...enriched], settings: { ...current.settings, expenseColumnOrder } };
    });
    setExpenseYear(importedYears.length === 1 ? String(importedYears[0]) : "All");
    setExpenseCategory("All");
    setExpenseAccountingClass("All");
    setExpenseCostTiming("All");
    setExpensePurchaseSource(sourceKey);
    setExpenseUse("All");
    setExpenseQuery("");
    setExpenseImport(null);
    setImportPurchaseSource("");
  };
  const toggleExpenseColumn = (key: string) => {
    setState((current) => {
      const enabled = current.settings.expenseVisibleColumns;
      if (enabled.includes(key) && enabled.length === 1) return current;
      const expenseVisibleColumns = enabled.includes(key) ? enabled.filter((columnKey) => columnKey !== key) : [...enabled, key];
      return { ...current, settings: { ...current.settings, expenseVisibleColumns } };
    });
  };
  const moveExpenseColumn = (sourceKey: string, targetKey: string) => {
    if (sourceKey === targetKey) return;
    expenseColumnWasDragged.current = true;
    setState((current) => {
      const order = mergeExpenseColumnOrder(current.settings.expenseColumnOrder, columnDefinitions).filter((key) => key !== sourceKey);
      const targetIndex = order.indexOf(targetKey);
      const expenseColumnOrder = [...order.slice(0, targetIndex), sourceKey, ...order.slice(targetIndex)];
      return { ...current, settings: { ...current.settings, expenseColumnOrder } };
    });
  };
  const changeExpenseSort = (key: string) => setExpenseSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  const selectAllExpenseColumns = () => setState((current) => ({ ...current, settings: { ...current.settings, expenseVisibleColumns: orderedColumnKeys } }));
  const resetExpenseColumns = () => setState((current) => ({ ...current, settings: { ...current.settings, expenseColumnOrder: defaultExpenseColumnOrder, expenseVisibleColumns: defaultExpenseVisibleColumns } }));
  const createExpenseCategory = (event: FormEvent) => {
    event.preventDefault();
    const category = newExpenseCategory.trim().replace(/\s+/g, " ");
    if (!category) return;
    if (category.toLowerCase() === "all" || availableExpenseCategories.some((existing) => existing.toLowerCase() === category.toLowerCase())) {
      alert(`The category “${category}” already exists or is reserved.`);
      return;
    }
    const treatment = normalizeExpenseCategoryTreatment({ accountingClass: newExpenseAccountingClass, costTiming: newExpenseCostTiming });
    setState((current) => ({ ...current, settings: { ...current.settings, customExpenseCategories: [...current.settings.customExpenseCategories, { name: category, ...treatment }] } }));
    setExpenseCategory(category);
    setExpenseAccountingClass(treatment.accountingClass);
    setExpenseCostTiming(treatment.costTiming ?? "All");
    setNewExpenseCategory("");
  };
  const updateExpenseCategoryTreatment = (name: ExpenseCategory, treatment: ExpenseCategoryTreatment) => {
    setState((current) => {
      const normalizedTreatment = normalizeExpenseCategoryTreatment(treatment);
      const isCustom = current.settings.customExpenseCategories.some((category) => category.name === name);
      if (isCustom) {
        const customExpenseCategories = current.settings.customExpenseCategories.map((category) => category.name === name ? { name, ...normalizedTreatment } : category);
        return { ...current, settings: { ...current.settings, customExpenseCategories } };
      }
      const defaultDefinition = expenseCategoryDefinitions.find((definition) => definition.name === name);
      if (!defaultDefinition) return current;
      const defaultTreatment = normalizeExpenseCategoryTreatment(defaultDefinition);
      const expenseCategoryOverrides = { ...current.settings.expenseCategoryOverrides };
      if (sameExpenseCategoryTreatment(defaultTreatment, normalizedTreatment)) delete expenseCategoryOverrides[name];
      else expenseCategoryOverrides[name] = normalizedTreatment;
      return { ...current, settings: { ...current.settings, expenseCategoryOverrides } };
    });
  };
  const updateExpenseAccountingClass = (name: ExpenseCategory, accountingClass: ExpenseAccountingClass) => {
    const current = expenseCategoryDefinitionFor(name, state.settings);
    const defaultDefinition = expenseCategoryDefinitions.find((definition) => definition.name === name);
    updateExpenseCategoryTreatment(name, {
      accountingClass,
      costTiming: accountingClass === "Product cost" ? current.costTiming ?? defaultDefinition?.costTiming ?? "Track in inventory" : undefined,
    });
  };
  const updateExpenseCostTiming = (name: ExpenseCategory, costTiming: ExpenseCostTiming) => {
    updateExpenseCategoryTreatment(name, { accountingClass: "Product cost", costTiming });
  };
  const renameExpenseCategory = (name: ExpenseCategory) => {
    const category = (categoryNameDrafts[name] ?? name).trim().replace(/\s+/g, " ");
    if (!category || category === name) return;
    if (category.toLowerCase() === "all" || availableExpenseCategories.some((existing) => existing !== name && existing.toLowerCase() === category.toLowerCase())) {
      alert(`The category “${category}” already exists or is reserved.`);
      return;
    }
    setState((current) => ({
      ...current,
      expenses: current.expenses.map((expense) => expense.category === name ? { ...expense, category } : expense),
      settings: {
        ...current.settings,
        customExpenseCategories: current.settings.customExpenseCategories.map((definition) => definition.name === name ? { ...definition, name: category } : definition),
      },
    }));
    if (expenseCategory === name) setExpenseCategory(category);
    setCategoryNameDrafts({});
  };
  const deleteExpenseCategory = (name: ExpenseCategory) => {
    const definition = availableExpenseCategoryDefinitions.find((category) => category.name === name);
    if (!definition || !state.settings.customExpenseCategories.some((category) => category.name === name)) return;
    const fallback = fallbackExpenseCategoryForTreatment(definition);
    const usageCount = state.expenses.filter((expense) => expense.category === name).length;
    if (!confirm(`Delete “${name}”? ${usageCount ? `${usageCount} expense record${usageCount === 1 ? "" : "s"} will be reassigned to “${fallback}”.` : "It is not used by any expense records."}`)) return;
    setState((current) => ({
      ...current,
      expenses: current.expenses.map((expense) => expense.category === name ? { ...expense, category: fallback } : expense),
      settings: {
        ...current.settings,
        customExpenseCategories: current.settings.customExpenseCategories.filter((category) => category.name !== name),
      },
    }));
    if (expenseCategory === name) setExpenseCategory(fallback);
    setCategoryNameDrafts({});
  };
  const selectExpenseRow = (id: string, extendRange: boolean) => {
    const anchorIndex = expenseSelectionAnchor.current ? visibleExpenseIds.indexOf(expenseSelectionAnchor.current) : -1;
    const targetIndex = visibleExpenseIds.indexOf(id);
    if (extendRange && anchorIndex >= 0 && targetIndex >= 0) {
      const start = Math.min(anchorIndex, targetIndex);
      const end = Math.max(anchorIndex, targetIndex);
      const range = visibleExpenseIds.slice(start, end + 1);
      setSelectedExpenseIds((current) => Array.from(new Set([...current, ...range])));
    } else {
      setSelectedExpenseIds((current) => current.includes(id) ? current.filter((expenseId) => expenseId !== id) : [...current, id]);
    }
    expenseSelectionAnchor.current = id;
  };
  const clearExpenseSelection = () => {
    setSelectedExpenseIds([]);
    expenseSelectionAnchor.current = null;
  };
  const deleteSelectedExpenses = useCallback(() => {
    if (!selectedExpenseIds.length) return;
    const count = selectedExpenseIds.length;
    if (!confirm(`Delete ${count} selected expense record${count === 1 ? "" : "s"}? This cannot be undone.`)) return;
    const selected = new Set(selectedExpenseIds);
    setState((current) => ({ ...current, expenses: current.expenses.filter((expense) => !selected.has(expense.id)) }));
    setSelectedExpenseIds([]);
    expenseSelectionAnchor.current = null;
  }, [selectedExpenseIds, setState]);
  useEffect(() => {
    const handleDeleteKey = (event: KeyboardEvent) => {
      if ((event.key !== "Delete" && event.key !== "Backspace") || !selectedExpenseIds.length) return;
      const target = event.target as HTMLElement | null;
      const isTextEntry = target?.tagName === "TEXTAREA" || target?.tagName === "SELECT" || target?.tagName === "INPUT" || target?.isContentEditable;
      if (isTextEntry) return;
      event.preventDefault();
      deleteSelectedExpenses();
    };
    window.addEventListener("keydown", handleDeleteKey);
    return () => window.removeEventListener("keydown", handleDeleteKey);
  }, [deleteSelectedExpenses, selectedExpenseIds.length]);
  const expenseCell = (expense: Expense, column: ExpenseColumnDefinition) => {
    if (column.field) {
      const value = expense.fields?.[column.field] || "—";
      return <span className="expenseCell raw" title={value === "—" ? undefined : value}>{value}</span>;
    }
    if (column.key === "vendor") return <span className="expenseCell"><strong>{expense.vendor}</strong></span>;
    if (column.key === "purchaseSource") return <span className="expenseCell"><strong>{expense.purchaseSource || "Unassigned"}</strong></span>;
    if (column.key === "asin") {
      const value = expense.asins.join(", ");
      return <span className="expenseCell asinLinks" title={value || undefined}>{expense.asins.length ? expense.asins.map((asin, index) => <span key={asin}>{index ? ", " : ""}<a href={`https://www.amazon.com/dp/${asin}`} target="_blank" rel="noreferrer" aria-label={`Open Amazon product ${asin}`} onClick={(event) => event.stopPropagation()}>{asin}</a></span>) : "—"}</span>;
    }
    if (column.key === "note") return <span className="expenseCell note" title={expense.note}>{expense.note || (expense.source === "import" ? "Imported record" : "Manual record")}</span>;
    if (column.key === "category") return <span className="expenseCell category"><select className="expenseCategorySelect" aria-label={`Category for ${expense.externalKey}`} value={expense.category} onClick={(event) => event.stopPropagation()} onChange={(event) => {
      const category = event.target.value as ExpenseCategory;
      const targetIds = selectedExpenseSet.has(expense.id) ? selectedExpenseSet : new Set([expense.id]);
      setState((current) => ({ ...current, expenses: current.expenses.map((item) => targetIds.has(item.id) ? { ...item, category } : item) }));
    }}>{availableExpenseCategories.map((category) => <option key={category}>{category}</option>)}</select></span>;
    if (column.key === "accountingClass") {
      const accountingClass = expenseAccountingClassFor(expense.category, state.settings);
      return <span className="expenseCell"><span className={`accountingClassBadge ${accountingClass.toLowerCase().replaceAll(" ", "-").replace("&", "and")}`}>{accountingClass}</span></span>;
    }
    if (column.key === "costTiming") {
      const costTiming = expenseCostTimingFor(expense.category, state.settings);
      return <span className="expenseCell"><span className={`costTimingBadge ${costTiming === "Track in inventory" ? "inventory" : costTiming ? "direct" : "not-applicable"}`}>{costTiming ?? "Not applicable"}</span></span>;
    }
    if (column.key === "personal") return <span className="expenseCell personal"><label className="expensePersonalToggle" onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`Personal expense ${expense.externalKey}`} checked={expense.personal} onChange={(event) => {
      const personal = event.target.checked;
      const targetIds = selectedExpenseSet.has(expense.id) ? selectedExpenseSet : new Set([expense.id]);
      setState((current) => ({ ...current, expenses: current.expenses.map((item) => targetIds.has(item.id) ? { ...item, personal } : item) }));
    }} /><span>{expense.personal ? "Yes" : "No"}</span></label></span>;
    if (column.key === "externalKey") return <span className="expenseCell"><code>{expense.externalKey}</code></span>;
    if (column.key === "amount") return <span className="expenseCell amount"><strong>{money.format(expense.amount)}</strong></span>;
    if (column.key === "source") return <span className="expenseCell"><small>{expense.source}</small></span>;
    return <span className="expenseCell">{expense.date}</span>;
  };
  return <div className="expenseLayout">
    <section className="expenseHero"><div><p className="eyebrow">Business spending</p><h2>Every expense, easy to find.</h2><p>Import purchase history or add a record by hand. Mark personal purchases so they stay visible without affecting business totals or taxes.</p></div><div className="expenseHeroTotal"><span>{expenseYear === "All" ? "Business total · all years" : `Business total · ${expenseYear}`}</span><strong>{money.format(expenseTotal)}</strong><small>{businessExpenses.length} business records · {personalExpenses.length} personal excluded</small></div></section>
    <div className="taxCards expenseCards"><Metric label="Business purchase records" value={money.format(expenseTotal)} note={expenseYear === "All" ? "Across every recorded year" : `Dated in ${expenseYear}`} accent="green" /><Metric label="Operating expenses" value={money.format(operatingTotal)} note="Operating expenses plus taxes & fees" accent="blue" /><Metric label="Direct COGS" value={money.format(cogsTotal)} note="Product costs recognized immediately" accent="sand" /><Metric label="Purchased inventory" value={money.format(inventoryPurchaseTotal)} note="Product costs waiting to become COGS" accent="green" /><Metric label="Personal excluded" value={money.format(personalExpenseTotal)} note={`${personalExpenses.length} record${personalExpenses.length === 1 ? "" : "s"} kept out of business totals`} accent="coral" /></div>
    <div className="taxColumns expenseColumns"><section className="panel expenseCategories"><div className="panelTitle"><div><p className="eyebrow">Expense summary</p><h3>Business spending by category</h3></div><div className="categorySummaryActions"><span className="pill neutral">{businessExpenses.length} records</span><button className="secondary" type="button" onClick={() => setCategoryEditorOpen(true)}>Edit categories</button></div></div><p className="categorySummaryCopy">Accounting class describes what a cost is. Product-cost timing determines whether it waits in inventory or is recognized directly as COGS.</p><div className="categoryTotals">{categoryTotals.map((item) => <button className={expenseCategory === item.category ? "active" : ""} key={item.category} onClick={() => { setExpenseCategory(item.category); setExpenseAccountingClass("All"); setExpenseCostTiming("All"); }}><span><strong>{item.category}</strong><small>{item.accountingClass}{item.costTiming ? ` · ${item.costTiming}` : ""} · {businessExpenses.filter((expense) => expense.category === item.category).length} records</small></span><b>{money.format(item.total)}</b></button>)}{!categoryTotals.length && <Empty text="No business expenses recorded for this period." />}</div><div className="expenseGrandTotal"><span>Total business purchase records</span><strong>{money.format(expenseTotal)}</strong></div></section>
    <section className="panel expenseGuide"><div className="panelTitle"><div><p className="eyebrow">Import guide</p><h3>Amazon Business exports</h3></div></div><p>StockBot groups multi-item rows into one expense per Amazon Order ID and uses Order Net Total, so the same order is not counted twice.</p><div className="importFacts"><span><strong>Unique key</strong><small>Amazon Order ID</small></span><span><strong>Expense amount</strong><small>Order Net Total</small></span><span><strong>Purchase source</strong><small>Account key assigned on review</small></span><span><strong>Imported years</strong><small>Shown automatically after import</small></span></div></section></div>
    <section className="panel expenseLedger">
      <div className="panelTitle"><div><p className="eyebrow">Deduplicated records</p><h3>Expense ledger</h3></div><div className="expenseActions"><button className={columnConfigOpen ? "secondary active" : "secondary"} onClick={() => setColumnConfigOpen((open) => !open)}>☷ Columns ({visibleColumns.length}/{orderedColumns.length})</button><button className="secondary" onClick={downloadExpenseTemplate}>↓ CSV template</button><button className="secondary" disabled={importing} onClick={() => expenseFileRef.current?.click()}>{importing ? "Reading file…" : "↑ Import CSV or JSON"}</button><button className="primary" onClick={onExpense}>+ Add expense</button><input ref={expenseFileRef} hidden type="file" accept="text/csv,.csv,application/json,.json" onChange={openExpenseImport} /></div></div>
      <p className="settingsCopy">Every record requires a unique external key—such as an Amazon order ID, invoice number, or bank transaction ID. Re-importing enriches existing records with every source column without creating duplicates.</p>
      {columnConfigOpen && <div className="expenseColumnConfig"><div className="expenseColumnConfigHeading"><div><strong>Display columns</strong><small>Check columns to show. Drag visible table headers to reorder them.</small></div><div><button type="button" onClick={selectAllExpenseColumns}>Select all</button><button type="button" onClick={resetExpenseColumns}>Reset</button></div></div><label className="search columnSearch"><span>{icons.search}</span><input aria-label="Search expense columns" placeholder="Find a column" value={columnQuery} onChange={(event) => setColumnQuery(event.target.value)} /></label><div className="expenseColumnChecklist">{columnOptions.map((column) => { const checked = visibleColumnKeys.includes(column.key); return <label className="expenseColumnOption" key={column.key}><input type="checkbox" checked={checked} disabled={checked && visibleColumnKeys.length === 1} onChange={() => toggleExpenseColumn(column.key)} /><span><strong>{column.label}</strong><small>{column.field ? "Imported CSV field" : "StockBot field"}</small></span></label>; })}</div></div>}
      <div className="expenseToolbar"><label className="search"><span>{icons.search}</span><input aria-label="Search expenses" placeholder="Search any displayed or imported field" value={expenseQuery} onChange={(event) => setExpenseQuery(event.target.value)} /></label><label>Year<select aria-label="Expense year" value={expenseYear} onChange={(event) => setExpenseYear(event.target.value)}><option value="All">All years</option>{years.map((year) => <option value={year} key={year}>{year}</option>)}</select></label><label>Accounting class<select aria-label="Expense accounting class" value={expenseAccountingClass} onChange={(event) => setExpenseAccountingClass(event.target.value as ExpenseAccountingClass | "All")}><option>All</option>{expenseAccountingClasses.map((accountingClass) => <option key={accountingClass}>{accountingClass}</option>)}</select></label><label>Cost timing<select aria-label="Expense cost timing" value={expenseCostTiming} onChange={(event) => setExpenseCostTiming(event.target.value as ExpenseCostTiming | "All")}><option>All</option>{expenseCostTimings.map((costTiming) => <option key={costTiming}>{costTiming}</option>)}</select></label><label>Category<select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value as ExpenseCategory | "All")}><option>All</option>{availableExpenseCategories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Use<select aria-label="Expense business or personal use" value={expenseUse} onChange={(event) => setExpenseUse(event.target.value as "All" | "Business" | "Personal")}><option>All</option><option>Business</option><option>Personal</option></select></label><label>Purchase source<select aria-label="Expense purchase source" value={expensePurchaseSource} onChange={(event) => setExpensePurchaseSource(event.target.value)}><option value="All">All sources</option>{purchaseSources.map((source) => <option value={source} key={source}>{source}</option>)}{hasUnassignedSource && <option value="__unassigned">Unassigned</option>}</select></label></div>
      <div className={`expenseSelectionBar ${selectedExpenseIds.length ? "active" : ""}`}><span><strong>{selectedExpenseIds.length} selected</strong><small>Click rows to toggle selection. Shift-click selects a range. Category and Personal changes apply to the entire selection.</small></span><button className="danger" disabled={!selectedExpenseIds.length} onClick={deleteSelectedExpenses}>Delete selected</button><button className="textButton" disabled={!selectedExpenseIds.length} onClick={clearExpenseSelection}>Clear selection</button></div>
      <div className="expenseTable"><div className="expenseDataGrid" style={{ "--expense-columns": expenseGridColumns } as CSSProperties}><div className="expenseHead">{visibleColumns.map((column) => <button role="columnheader" aria-sort={expenseSort.key === column.key ? (expenseSort.direction === "asc" ? "ascending" : "descending") : "none"} type="button" key={column.key} className={`stockHeaderCell draggable ${expenseSort.key === column.key ? `sorted ${expenseSort.direction}` : ""} ${draggedExpenseColumn === column.key ? "dragging" : ""}`} onPointerDown={() => { expenseColumnWasDragged.current = false; setDraggedExpenseColumn(column.key); }} onPointerEnter={(event) => { if (draggedExpenseColumn && event.buttons === 1) moveExpenseColumn(draggedExpenseColumn, column.key); }} onPointerUp={() => setDraggedExpenseColumn(null)} onPointerCancel={() => setDraggedExpenseColumn(null)} onClick={() => { if (expenseColumnWasDragged.current) { expenseColumnWasDragged.current = false; return; } changeExpenseSort(column.key); }} title="Click to sort; drag to reorder"><span>{column.label}</span><span className="sortPair" aria-hidden="true"><i /><b /></span></button>)}<span className="stockHeaderSpacer" /></div>{visibleExpenses.map((expense) => <div role="row" tabIndex={0} aria-selected={selectedExpenseSet.has(expense.id)} aria-label={`Expense ${expense.externalKey}`} className={`expenseRow ${expense.personal ? "personal" : ""} ${selectedExpenseSet.has(expense.id) ? "selected" : ""}`} key={expense.id} onClick={(event) => selectExpenseRow(expense.id, event.shiftKey)} onKeyDown={(event) => { if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return; event.preventDefault(); selectExpenseRow(expense.id, event.shiftKey); }}>{visibleColumns.map((column) => <span key={column.key}>{expenseCell(expense, column)}</span>)}<button aria-label={`Delete expense ${expense.externalKey}`} onClick={(event) => { event.stopPropagation(); if (!confirm(`Delete expense ${expense.externalKey}?`)) return; setSelectedExpenseIds((current) => current.filter((id) => id !== expense.id)); onDeleteExpense(expense.id); }}>×</button></div>)}{!visibleExpenses.length && <Empty text="No expense records match this view." />}</div></div>
    </section>
    <div className="disclaimer"><strong>Good records, calmer filing.</strong><span>The Tax center uses the selected tax year for its filing worksheet. This ledger shows all years unless you filter it.</span></div>
    {expenseImport && <Modal title="Review expense import" eyebrow="Duplicate-safe import" onClose={() => { setExpenseImport(null); setImportPurchaseSource(""); }}>
      <div className="importSummary"><article><span>New records</span><strong>{expenseImport.ready.length}</strong></article><article><span>Existing records corrected</span><strong>{expenseImport.updates.length}</strong></article><article><span>Invalid records</span><strong>{expenseImport.invalid.length}</strong></article></div>
      <p className="settingsCopy"><strong>{expenseImport.fileName}</strong> contains {expenseImport.columns.length} source columns. {importPreviewExpenses.length > 0 && <>The importable total is <strong>{money.format(expenseImport.readyTotal)}</strong>{expenseImport.years.length ? ` across ${expenseImport.years.join(", ")}` : ""}. Existing expense keys refresh their imported order details and source fields but are never duplicated.</>}</p>
      {importPreviewExpenses.length > 0 && <div className="formGrid importSourceForm"><label className="wide">Purchase source key<input autoFocus required value={importPurchaseSource} onChange={(event) => setImportPurchaseSource(event.target.value)} placeholder="Amazon Business, Amazon Personal, wholesale account…" /><small>This label is saved on every record in this file so you can sort and filter purchases by account or source.</small></label></div>}
      {importPreviewExpenses.length > 0 && <div className="importPreviewList">{importPreviewExpenses.slice(0, 6).map((expense) => <div key={expense.externalKey}><span><strong>{expense.vendor}</strong><small>{expense.externalKey} · {expense.category} · {expense.date}{expense.asins.length ? ` · ASIN ${expense.asins.slice(0, 2).join(", ")}${expense.asins.length > 2 ? ` +${expense.asins.length - 2}` : ""}` : ""}{expenseImport.updates.some((update) => update.externalKey === expense.externalKey) ? " · existing" : " · new"}</small></span><b>{money.format(expense.amount)}</b></div>)}{importPreviewExpenses.length > 6 && <small>+ {importPreviewExpenses.length - 6} more records</small>}</div>}
      {expenseImport.duplicates.length > 0 && <details className="importDetails"><summary>{expenseImport.duplicates.length} duplicate row{expenseImport.duplicates.length === 1 ? "" : "s"} inside this file skipped</summary><p>{expenseImport.duplicates.slice(0, 12).join(", ")}</p></details>}
      {expenseImport.skipped.length > 0 && <details className="importDetails"><summary>{expenseImport.skipped.length} cancelled or zero-dollar order{expenseImport.skipped.length === 1 ? "" : "s"} ignored</summary>{expenseImport.skipped.slice(0, 12).map((message) => <p key={message}>{message}</p>)}</details>}
      {expenseImport.invalid.length > 0 && <details className="importDetails"><summary>{expenseImport.invalid.length} invalid record{expenseImport.invalid.length === 1 ? "" : "s"} skipped</summary>{expenseImport.invalid.slice(0, 12).map((message) => <p key={message}>{message}</p>)}</details>}
      <div className="modalActions"><button type="button" className="secondary" onClick={() => { setExpenseImport(null); setImportPurchaseSource(""); }}>Cancel</button><button type="button" className="primary" disabled={!importPreviewExpenses.length || !importPurchaseSource.trim()} onClick={applyExpenseImport}>Save {importPreviewExpenses.length} records</button></div>
    </Modal>}
    {categoryEditorOpen && <Modal className="categoryEditorModal" title="Edit expense categories" eyebrow="Accounting setup" onClose={() => { setCategoryEditorOpen(false); setCategoryNameDrafts({}); }}>
      <p className="categoryEditorIntro">Accounting class describes what a purchase is. Product costs also choose when the cost becomes COGS: after inventory is sold or used, or immediately. Built-in names stay fixed for reliable imports.</p>
      <form className="expenseCategoryCreator categoryEditorCreate" onSubmit={createExpenseCategory}><label><span>New category</span><input aria-label="New expense category" maxLength={60} value={newExpenseCategory} onChange={(event) => setNewExpenseCategory(event.target.value)} placeholder="Subscriptions, samples, storage…" /></label><label className="categoryClassField"><span>Accounting class</span><select aria-label="New expense accounting class" value={newExpenseAccountingClass} onChange={(event) => setNewExpenseAccountingClass(event.target.value as ExpenseAccountingClass)}>{expenseAccountingClasses.map((accountingClass) => <option key={accountingClass}>{accountingClass}</option>)}</select></label>{newExpenseAccountingClass === "Product cost" && <label className="categoryTimingField"><span>Cost timing</span><select aria-label="New expense cost timing" value={newExpenseCostTiming} onChange={(event) => setNewExpenseCostTiming(event.target.value as ExpenseCostTiming)}>{expenseCostTimings.map((costTiming) => <option key={costTiming}>{costTiming}</option>)}</select></label>}<button className="secondary" type="submit" disabled={!newExpenseCategory.trim()}>+ Add</button></form>
      <div className="categoryEditorLegend"><span>Category</span><span>Accounting class</span><span>Cost timing</span><span>Actions</span></div>
      <div className="categoryEditorList">{availableExpenseCategoryDefinitions.map((definition) => {
        const isCustom = state.settings.customExpenseCategories.some((category) => category.name === definition.name);
        const usageCount = state.expenses.filter((expense) => expense.category === definition.name).length;
        const draftName = categoryNameDrafts[definition.name] ?? definition.name;
        const defaultDefinition = expenseCategoryDefinitions.find((category) => category.name === definition.name);
        return <div className="categoryEditorRow" key={definition.name}>
          <div className="categoryEditorName">{isCustom ? <input aria-label={`Category name ${definition.name}`} maxLength={60} value={draftName} onChange={(event) => setCategoryNameDrafts((current) => ({ ...current, [definition.name]: event.target.value }))} /> : <strong>{definition.name}</strong>}<small>{isCustom ? "Custom" : "Built-in"} · {usageCount} record{usageCount === 1 ? "" : "s"}{!isCustom && state.settings.expenseCategoryOverrides[definition.name] ? " · customized" : ""}</small></div>
          <label className="categoryEditorClass"><span>Accounting class for {definition.name}</span><select aria-label={`Accounting class for ${definition.name}`} value={definition.accountingClass} onChange={(event) => updateExpenseAccountingClass(definition.name, event.target.value as ExpenseAccountingClass)}>{expenseAccountingClasses.map((accountingClass) => <option key={accountingClass}>{accountingClass}{!isCustom && accountingClass === defaultDefinition?.accountingClass ? " (default)" : ""}</option>)}</select></label>
          <label className="categoryEditorTiming"><span>Cost timing for {definition.name}</span>{definition.accountingClass === "Product cost" ? <select aria-label={`Cost timing for ${definition.name}`} value={definition.costTiming ?? "Track in inventory"} onChange={(event) => updateExpenseCostTiming(definition.name, event.target.value as ExpenseCostTiming)}>{expenseCostTimings.map((costTiming) => <option key={costTiming}>{costTiming}{!isCustom && costTiming === defaultDefinition?.costTiming ? " (default)" : ""}</option>)}</select> : <small>Not applicable</small>}</label>
          <div className="categoryEditorActions">{isCustom ? <><button className="secondary" type="button" disabled={!draftName.trim() || draftName.trim().replace(/\s+/g, " ") === definition.name} onClick={() => renameExpenseCategory(definition.name)}>Save name</button><button className="textButton dangerText" type="button" onClick={() => deleteExpenseCategory(definition.name)}>Delete</button></> : <span>Protected</span>}</div>
        </div>;
      })}</div>
      <div className="modalActions"><button type="button" className="primary" onClick={() => { setCategoryEditorOpen(false); setCategoryNameDrafts({}); }}>Done</button></div>
    </Modal>}
  </div>;
}

function TaxCenter({ state, metrics, setState }: { state: AppState; metrics: Metrics; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const rows = [
    ["Gross sales", metrics.revenue, "Total product sales before sales tax"],
    ["Returns & allowances", 0, "No returns recorded"],
    ["Inventory-ledger COGS", metrics.inventoryCogs, "Unit cost captured when each sale was recorded"],
    ["Additional COGS records", metrics.additionalCogs, "Imported or manually entered costs not already in product unit cost"],
    ["Gross profit", metrics.grossProfit, "Gross sales minus both COGS sources"],
    ["Operating expenses", metrics.expenses, "Excludes cost of goods and inventory purchase records"],
    ["Estimated net business income", metrics.taxableIncome, "Before owner-specific deductions and income taxes"],
  ] as const;
  const taxMovements = state.movements.filter((movement) => movement.type === "sale" && new Date(`${movement.date}T12:00:00`).getFullYear() === state.settings.taxYear);
  const taxByState = Object.entries(taxMovements.reduce<Record<string, { sales: number; stateTax: number; localTax: number }>>((totals, movement) => { const code = movement.taxJurisdiction ?? movement.customerAddress?.state ?? "Unassigned"; const current = totals[code] ?? { sales: 0, stateTax: 0, localTax: 0 }; totals[code] = { sales: current.sales + movement.quantity * movement.unitPrice, stateTax: current.stateTax + (movement.stateTax ?? movement.salesTax), localTax: current.localTax + (movement.localTax ?? 0) }; return totals; }, {})).sort(([a], [b]) => a.localeCompare(b));
  const localByJurisdiction = Object.entries(taxMovements.reduce<Record<string, { state: string; sales: number; tax: number; rate: number }>>((totals, movement) => { const localTax = movement.localTax ?? 0; if (!localTax) return totals; const key = movement.localJurisdiction ?? `${movement.customerAddress?.city || "Local"}, ${movement.customerAddress?.state || ""}`; const current = totals[key] ?? { state: movement.customerAddress?.state ?? "", sales: 0, tax: 0, rate: movement.localTaxRate ?? 0 }; totals[key] = { ...current, sales: current.sales + movement.quantity * movement.unitPrice, tax: current.tax + localTax }; return totals; }, {})).sort(([a], [b]) => a.localeCompare(b));
  return <div className="taxLayout"><section className="taxHero"><div><p className="eyebrow">Filing worksheet</p><h2>{state.settings.taxYear} numbers, gathered.</h2><p>Choose a tax year and keep your books current. StockBot does the arithmetic; your tax professional makes the filing decisions.</p></div><label>Tax year<select value={state.settings.taxYear} onChange={(e) => setState((s) => ({ ...s, settings: { ...s.settings, taxYear: Number(e.target.value) } }))}>{[nowYear - 2, nowYear - 1, nowYear, nowYear + 1].map((y) => <option key={y}>{y}</option>)}</select></label></section>
    <div className="taxCards"><Metric label="State sales tax" value={money.format(metrics.stateSalesTax)} note="State portion collected from customers" accent="blue" /><Metric label="Local sales tax" value={money.format(metrics.localSalesTax)} note="City, county, and district portion" accent="sand" /><Metric label="Personal-use tax due" value={money.format(metrics.useTax)} note={`${money.format(metrics.localUseTax)} is local use tax`} accent="coral" /><Metric label="Total tax set-aside" value={money.format(metrics.salesTax + metrics.useTax)} note="State and local sales/use tax" accent="green" /></div>
    <TaxRateUpdater state={state} setState={setState} />
    <section className="panel stateSummary"><div className="panelTitle"><div><p className="eyebrow">Destination summary</p><h3>Sales tax by customer state</h3></div></div><div className="stateSummaryGrid">{taxByState.map(([code, total]) => <div key={code}><span><strong>{code === "Unassigned" ? code : stateName(code)}</strong><small>{money.format(total.sales)} taxable sales</small></span><span className="taxSplit"><small>State {money.format(total.stateTax)}</small><b>Local {money.format(total.localTax)}</b></span></div>)}{!taxByState.length && <Empty text="No customer sales in this tax year." />}</div></section>
    <section className="panel localSummary"><div className="panelTitle"><div><p className="eyebrow">Local filing detail</p><h3>Tax by city, county, or district</h3></div><span className="pill neutral">{localByJurisdiction.length} jurisdictions</span></div><div className="localSummaryGrid">{localByJurisdiction.map(([name, total]) => <div key={name}><span><strong>{name}</strong><small>{stateName(total.state)} · {total.rate}% local · {money.format(total.sales)} sales</small></span><b>{money.format(total.tax)}</b></div>)}{!localByJurisdiction.length && <Empty text="No local tax has been collected yet. Add local rules in Data & settings." />}</div></section>
    <section className="panel taxWorksheet"><div className="panelTitle"><div><p className="eyebrow">Income summary</p><h3>Profit & COGS worksheet</h3></div><button className="secondary" onClick={() => window.print()}>Print</button></div><div className="taxRows">{rows.map(([label, value, note], index) => <div className={index === rows.length - 1 ? "total" : ""} key={label}><span><strong>{label}</strong><small>{note}</small></span><strong>{money.format(value)}</strong></div>)}</div><div className="formula"><strong>Inventory formula reference</strong><span>Beginning inventory {money.format(state.settings.beginningInventory)} + inventory purchases {money.format(metrics.purchases)} − ending inventory {money.format(metrics.inventoryValue)}</span><b>{money.format(state.settings.beginningInventory + metrics.purchases - metrics.inventoryValue)}</b></div><p className="footnote">Expense totals come from the separate Expenses section. Do not categorize a purchase as additional COGS if its cost is already included in a product&apos;s unit cost.</p></section>
    <div className="disclaimer"><strong>Good records, calmer filing.</strong><span>This worksheet is an organizational estimate, not tax or legal advice. Equipment and other purchases may require special tax treatment.</span></div>
  </div>;
}

type RatePreviewItem = {
  lookup: TaxRateLookup;
  currentStateRate: number;
  currentLocalRate: number;
  proposedStateRate: number;
  proposedLocalRate: number;
  protectedParts: string[];
  canApply: boolean;
  hasChange: boolean;
};

function TaxRateUpdater({ state, setState }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ response: TaxRateLookupResponse; items: RatePreviewItem[]; auditId: string } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const history = state.settings.taxUpdateHistory.slice(0, 5);

  const relevantAddresses = useMemo(() => {
    const candidates: Array<{ id: string; address: Address; stateBaseRate: number }> = [];
    if (isCompleteAddress(state.settings.ownAddress)) {
      candidates.push({ id: "business", address: state.settings.ownAddress, stateBaseRate: state.settings.stateTaxes[state.settings.ownAddress.state]?.rate ?? 0 });
    }
    const seen = new Set(candidates.map((item) => addressKey(item.address)));
    for (const movement of state.movements) {
      const address = movement.customerAddress;
      if (movement.type !== "sale" || !address || !isCompleteAddress(address) || !state.settings.stateTaxes[address.state]?.enabled) continue;
      const key = addressKey(address);
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({ id: `customer-${key}`, address, stateBaseRate: state.settings.stateTaxes[address.state]?.rate ?? 0 });
      if (candidates.length >= 25) break;
    }
    return candidates;
  }, [state.movements, state.settings.ownAddress, state.settings.stateTaxes]);

  const checkRates = async () => {
    if (!relevantAddresses.length) {
      setError("Add a complete business address or record a sale with a complete customer address first.");
      return;
    }
    setChecking(true); setError(""); setPreview(null); setSelected([]);
    try {
      const response = await fetch("/api/tax-rates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ addresses: relevantAddresses }) });
      const payload = await response.json() as TaxRateLookupResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "The tax sources could not be checked.");
      const items = payload.lookups.map((lookup): RatePreviewItem => {
        const stateSetting = state.settings.stateTaxes[lookup.address.state] ?? { enabled: false, rate: 0 };
        const manualLocal = findLocalTaxRule(lookup.address, state.settings.localTaxRules);
        const current = resolveAddressRate(lookup.address, state.settings);
        const proposedStateRate = stateSetting.manualOverride ? stateSetting.rate : lookup.stateRate;
        const proposedLocalRate = manualLocal ? manualLocal.rate : lookup.localRate;
        const protectedParts = [stateSetting.manualOverride ? "state" : "", manualLocal ? "local" : ""].filter(Boolean);
        const hasChange = Math.abs(current.stateRate - proposedStateRate) > 0.0001 || Math.abs(current.localRate - proposedLocalRate) > 0.0001 || !findAddressTaxRate(lookup.address, state.settings.addressTaxRates);
        return { lookup, currentStateRate: current.stateRate, currentLocalRate: current.localRate, proposedStateRate, proposedLocalRate, protectedParts, hasChange, canApply: hasChange && protectedParts.length < 2 };
      });
      const auditId = uid();
      const applyIds = items.filter((item) => item.canApply).map((item) => item.lookup.id);
      const audit: TaxUpdateAudit = { id: auditId, checkedAt: payload.checkedAt, appliedAt: null, checkedAddresses: relevantAddresses.length, availableUpdates: applyIds.length, appliedUpdates: 0, status: "checked", sources: payload.sources.filter((source) => source.status === "connected").map((source) => source.name) };
      setSelected(applyIds);
      setPreview({ response: payload, items, auditId });
      setState((current) => ({ ...current, settings: { ...current.settings, taxUpdateHistory: [audit, ...current.settings.taxUpdateHistory].slice(0, 50) } }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The tax sources could not be checked.");
    } finally {
      setChecking(false);
    }
  };

  const applyRates = () => {
    if (!preview) return;
    const chosen = preview.items.filter((item) => selected.includes(item.lookup.id) && item.canApply);
    if (!chosen.length) return;
    const appliedAt = new Date().toISOString();
    setState((current) => {
      const stateTaxes = { ...current.settings.stateTaxes };
      let addressTaxRates = [...current.settings.addressTaxRates];
      for (const item of chosen) {
        const code = item.lookup.address.state;
        const setting = stateTaxes[code] ?? { enabled: false, rate: 0 };
        if (!setting.manualOverride) {
          stateTaxes[code] = { ...setting, rate: item.proposedStateRate, manualOverride: false, sourceName: item.lookup.sourceName, sourceUrl: item.lookup.sourceUrl, checkedAt: preview.response.checkedAt, effectiveDate: item.lookup.effectiveDate };
        }
        const cached: AddressTaxRate = { ...item.lookup, stateRate: item.proposedStateRate, localRate: item.proposedLocalRate, totalRate: roundRate(item.proposedStateRate + item.proposedLocalRate), addressKey: addressKey(item.lookup.address), checkedAt: preview.response.checkedAt };
        addressTaxRates = [cached, ...addressTaxRates.filter((rate) => rate.addressKey !== cached.addressKey)];
      }
      return { ...current, settings: { ...current.settings, stateTaxes, addressTaxRates: addressTaxRates.slice(0, 250), taxUpdateHistory: current.settings.taxUpdateHistory.map((entry) => entry.id === preview.auditId ? { ...entry, appliedAt, appliedUpdates: chosen.length, status: "applied" } : entry) } };
    });
    setPreview((current) => current ? { ...current, items: current.items.map((item) => selected.includes(item.lookup.id) ? { ...item, hasChange: false, canApply: false, currentStateRate: item.proposedStateRate, currentLocalRate: item.proposedLocalRate } : item) } : current);
    setSelected([]);
  };

  const sourceStatus = (source: TaxSourceStatus) => source.status === "connected" ? "Connected" : source.status === "not_configured" ? "Not configured" : source.status === "unavailable" ? "Unavailable" : "Reference";
  return <section className="panel rateUpdater"><div className="panelTitle"><div><p className="eyebrow">Rate maintenance</p><h3>Update official tax rates</h3></div><button className="primary" onClick={checkRates} disabled={checking}>{checking ? "Checking sources…" : "↻ Check for updates"}</button></div>
    <p className="settingsCopy">Checks your business address and saved customer destinations. California uses the official CDTFA service; Avalara can cover other enabled states when configured. Nothing changes until you review and apply it.</p>
    <div className="sourceStrip"><a href="https://services.maps.cdtfa.ca.gov/" target="_blank" rel="noreferrer"><strong>California CDTFA</strong><span>Official address API</span></a><a href="https://www.streamlinedsalestax.org/Shared-Pages/rate-and-boundary-files" target="_blank" rel="noreferrer"><strong>Streamlined Sales Tax</strong><span>Quarterly files</span></a><a href="https://developer.avalara.com/api-reference/avatax/rest/v2/methods/TaxContent/TaxRatesByAddress/" target="_blank" rel="noreferrer"><strong>Avalara AvaTax</strong><span>Optional nationwide API</span></a></div>
    {error && <div className="updateMessage error"><strong>Couldn&apos;t check rates</strong><span>{error}</span></div>}
    {preview && <div className="updatePreview"><div className="sourceResults">{preview.response.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id} className={`sourceResult ${source.status}`}><span><strong>{source.name}</strong><small>{source.detail}</small></span><b>{sourceStatus(source)}</b></a>)}</div>
      <div className="previewHeading"><span><strong>Review address rates</strong><small>Checked {new Date(preview.response.checkedAt).toLocaleString()} · effective date is shown when the source supplies one</small></span><b>{preview.items.filter((item) => item.canApply).length} updates</b></div>
      <div className="rateChanges">{preview.items.map((item) => { const currentTotal = roundRate(item.currentStateRate + item.currentLocalRate); const proposedTotal = roundRate(item.proposedStateRate + item.proposedLocalRate); return <label className={item.canApply ? "rateChange" : "rateChange protected"} key={item.lookup.id}><input type="checkbox" disabled={!item.canApply} checked={selected.includes(item.lookup.id)} onChange={(e) => setSelected((current) => e.target.checked ? [...current, item.lookup.id] : current.filter((id) => id !== item.lookup.id))} /><span><strong>{item.lookup.address.line1}</strong><small>{item.lookup.address.city}, {item.lookup.address.state} {item.lookup.address.postalCode} · {item.lookup.jurisdiction}</small><small>{item.lookup.sourceName}{item.lookup.confidence ? ` · ${item.lookup.confidence} confidence` : ""}{item.protectedParts.length ? ` · manual ${item.protectedParts.join(" + ")} rate protected` : ""}</small></span><span className="rateDelta"><small>{currentTotal}% current</small><b>{proposedTotal}%</b><small>{item.proposedStateRate}% state + {item.proposedLocalRate}% local</small></span></label>; })}{!preview.items.length && <Empty text="No eligible addresses could be looked up. Review the notices below." />}</div>
      {preview.response.notices.length > 0 && <details className="updateNotices"><summary>{preview.response.notices.length} address notice{preview.response.notices.length === 1 ? "" : "s"}</summary>{preview.response.notices.map((notice) => <p key={notice}>{notice}</p>)}</details>}
      <div className="applyBar"><span>{selected.length ? `${selected.length} selected` : "No changes selected"}</span><button className="dark" disabled={!selected.length} onClick={applyRates}>Apply selected updates</button></div></div>}
    <div className="auditLog"><div className="previewHeading"><span><strong>Update history</strong><small>Checks and applied changes are saved with your backup.</small></span></div>{history.map((entry) => <div className="auditRow" key={entry.id}><span><strong>{entry.status === "applied" ? `${entry.appliedUpdates} rate update${entry.appliedUpdates === 1 ? "" : "s"} applied` : "Sources checked"}</strong><small>{new Date(entry.checkedAt).toLocaleString()} · {entry.checkedAddresses} addresses · {entry.sources.join(", ") || "No live source connected"}</small></span><span className={`pill ${entry.status === "applied" ? "good" : "neutral"}`}>{entry.status}</span></div>)}{!history.length && <Empty text="No rate checks yet." />}</div>
  </section>;
}

function DataSettings({ state, setState, fileRef, onImport }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; fileRef: React.RefObject<HTMLInputElement | null>; onImport: (e: ChangeEvent<HTMLInputElement>) => void }) {
  const [clearing, setClearing] = useState(false);
  const updateOwnAddress = (field: keyof Address, value: string) => setState((current) => ({
    ...current,
    settings: { ...current.settings, ownAddress: { ...current.settings.ownAddress, [field]: value } },
  }));
  const ownResolvedRate = resolveAddressRate(state.settings.ownAddress, state.settings);
  const ownStateRate = ownResolvedRate.stateRate;
  const ownLocalRate = ownResolvedRate.localRate;
  const ownRate = ownResolvedRate.totalRate;
  const enabledCount = Object.values(state.settings.stateTaxes).filter((setting) => setting.enabled).length;
  const clearAllRecords = async () => {
    const clearedState: AppState = {
      ...state,
      version: 16,
      products: [],
      movements: [],
      expenses: [],
      customers: [],
      settings: { ...state.settings, beginningInventory: 0 },
    };
    setClearing(true);
    setState(clearedState);
    try {
      const response = await fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(clearedState) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not clear StockBot data.");
      window.location.reload();
    } catch (caught) {
      setState(state);
      setClearing(false);
      alert(caught instanceof Error ? caught.message : "Could not clear StockBot data.");
    }
  };
  return <div className="settingsGrid">
    <section className="panel"><p className="eyebrow">Business profile</p><h3>Calculation settings</h3><div className="formGrid"><label className="wide">Business name<input value={state.settings.businessName} onChange={(e) => setState((s) => ({ ...s, settings: { ...s.settings, businessName: e.target.value } }))} /></label><label>Beginning inventory<input type="number" step="0.01" value={state.settings.beginningInventory} onChange={(e) => setState((s) => ({ ...s, settings: { ...s.settings, beginningInventory: Number(e.target.value) } }))} /></label></div></section>
    <section className="panel"><p className="eyebrow">Personal-use location</p><h3>Your address sets use tax</h3><p className="settingsCopy">When untaxed resale inventory becomes personal use, StockBot applies {ownStateRate}% state tax{ownLocalRate ? ` + ${ownLocalRate}% local tax${ownResolvedRate.jurisdiction ? ` for ${ownResolvedRate.jurisdiction}` : ""}` : ""}, for a {ownRate}% combined rate.</p><div className="formGrid"><label className="wide">Street address<input value={state.settings.ownAddress.line1} onChange={(e) => updateOwnAddress("line1", e.target.value)} placeholder="123 Main Street" /></label><label>City<input value={state.settings.ownAddress.city} onChange={(e) => updateOwnAddress("city", e.target.value)} /></label><label>State<select value={state.settings.ownAddress.state} onChange={(e) => updateOwnAddress("state", e.target.value)}>{stateTaxDefaults.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label><label>ZIP code<input value={state.settings.ownAddress.postalCode} onChange={(e) => updateOwnAddress("postalCode", e.target.value)} inputMode="numeric" /></label></div></section>
    <section className="panel stateTaxPanel"><div className="panelTitle"><div><p className="eyebrow">Destination sales tax</p><h3>States where you collect</h3></div><span className="pill good">{enabledCount} enabled</span></div><p className="settingsCopy">Check only states where you are registered and required to collect. A customer&apos;s delivery state selects the statewide base rate below; matching local rules are added separately.</p><div className="stateTaxGrid">{stateTaxDefaults.map((item) => { const setting = state.settings.stateTaxes[item.code] ?? { enabled: false, rate: item.rate }; return <div className={setting.enabled ? "stateTaxRow enabled" : "stateTaxRow"} key={item.code}><label className="stateCheck"><input type="checkbox" checked={setting.enabled} onChange={(e) => setState((current) => ({ ...current, settings: { ...current.settings, stateTaxes: { ...current.settings.stateTaxes, [item.code]: { ...setting, enabled: e.target.checked } } } }))} /><span><strong>{item.name}</strong><small>{item.code}{setting.manualOverride ? " · manual rate" : setting.sourceName ? ` · ${setting.sourceName}` : item.hasLocalTax ? " · local tax may apply" : " · statewide rate"}</small></span></label><label className="rateInput"><input aria-label={`${item.name} sales tax rate`} type="number" min="0" step="0.001" value={setting.rate} onChange={(e) => setState((current) => ({ ...current, settings: { ...current.settings, stateTaxes: { ...current.settings.stateTaxes, [item.code]: { ...setting, rate: Number(e.target.value), manualOverride: true, sourceName: undefined, sourceUrl: undefined, checkedAt: undefined, effectiveDate: undefined } } } }))} /><span>%</span></label></div>; })}</div><div className="rateNote"><strong>Manual protection</strong><span>Editing a state rate marks it as a manual override. Official updates will show the difference but will not replace it.</span></div></section>
    <LocalTaxRulesPanel rules={state.settings.localTaxRules} onChange={(localTaxRules) => setState((current) => ({ ...current, settings: { ...current.settings, localTaxRules } }))} />
    <section className="panel backupCard"><p className="eyebrow">Portable backups</p><h3>Your data, in your hands.</h3><p>Export a complete JSON backup whenever you like. Importing replaces the current workspace after validation.</p><div><button className="primary" onClick={() => exportState(state)}>{icons.download} Export backup</button><button className="secondary" onClick={() => fileRef.current?.click()}>{icons.upload} Import backup</button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={onImport} /></div></section>
    <section className="panel privacyCard"><div className="lock">⌂</div><div><h3>Lightweight SQLite storage</h3><p>StockBot keeps products, expenses, purchase sources, customers, and activity in indexed tables in this server&apos;s private D1 database. Nothing is sent to an outside inventory service.</p></div></section>
    <section className="panel dangerZone"><p className="eyebrow">Fresh start</p><h3>Clear or reset workspace</h3><p>Clear every product, customer, activity, COGS, and expense record, or replace them with the original sample data.</p><div className="dangerActions"><button className="danger" disabled={clearing} onClick={() => { if (confirm("Permanently clear all products, customers, activity, COGS, and expenses? Business and tax settings will be kept.")) void clearAllRecords(); }}>{clearing ? "Clearing…" : "Clear all"}</button><button className="secondary" disabled={clearing} onClick={() => confirm("Replace all current inventory data with the demo workspace?") && setState(seed)}>Reset demo</button></div><small>After clearing, StockBot reloads a fresh view while keeping your business profile, address, tax rates, local tax rules, and display settings.</small></section>
  </div>;
}

function LocalTaxRulesPanel({ rules, onChange }: { rules: LocalTaxRule[]; onChange: (rules: LocalTaxRule[]) => void }) {
  const [draft, setDraft] = useState({ name: "", state: "CA", city: "", postalCode: "", rate: 0 });
  const addRule = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || (!draft.city.trim() && !draft.postalCode.trim())) return;
    onChange([...rules, { ...draft, id: uid(), name: draft.name.trim(), city: draft.city.trim(), postalCode: draft.postalCode.trim(), enabled: true, manualOverride: true }]);
    setDraft({ name: "", state: draft.state, city: "", postalCode: "", rate: 0 });
  };
  return <section className="panel localRulesPanel"><div className="panelTitle"><div><p className="eyebrow">Local tax layer</p><h3>City, county & district rules</h3></div><span className="pill neutral">{rules.filter((rule) => rule.enabled).length} active</span></div><p className="settingsCopy">Add the local portion only—not the statewide rate. ZIP rules take priority; a city rule is the fallback when no ZIP rule matches.</p><form className="localRuleForm" onSubmit={addRule}><label>Jurisdiction name<input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Los Angeles County" /></label><label>State<select value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })}>{stateTaxDefaults.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label><label>City<input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="Los Angeles" /></label><label>ZIP code<input value={draft.postalCode} onChange={(e) => setDraft({ ...draft, postalCode: e.target.value })} inputMode="numeric" placeholder="90012" /></label><label>Local rate (%)<input required type="number" min="0" step="0.001" value={draft.rate} onChange={(e) => setDraft({ ...draft, rate: Number(e.target.value) })} /></label><button className="primary" type="submit">+ Add local rule</button></form><div className="localRuleList">{rules.map((rule) => <div className={rule.enabled ? "localRuleRow" : "localRuleRow disabled"} key={rule.id}><label className="stateCheck"><input type="checkbox" checked={rule.enabled} onChange={(e) => onChange(rules.map((current) => current.id === rule.id ? { ...current, enabled: e.target.checked } : current))} /><span><strong>{rule.name}</strong><small>{stateName(rule.state)} · {rule.postalCode ? `ZIP ${rule.postalCode}` : rule.city} · manual</small></span></label><label className="rateInput"><input aria-label={`${rule.name} local tax rate`} type="number" min="0" step="0.001" value={rule.rate} onChange={(e) => onChange(rules.map((current) => current.id === rule.id ? { ...current, rate: Number(e.target.value), manualOverride: true } : current))} /><span>%</span></label><button className="ruleDelete" type="button" aria-label={`Delete ${rule.name}`} onClick={() => confirm(`Delete the ${rule.name} local tax rule?`) && onChange(rules.filter((current) => current.id !== rule.id))}>×</button></div>)}{!rules.length && <Empty text="No local tax rules yet. Add one for each city, county, district, or ZIP where you collect local tax." />}</div><div className="rateNote"><strong>Manual protection</strong><span>Rules entered here take priority over address updates and will not be replaced.</span></div></section>;
}

function ProductModal({ product, onSave, onClose }: { product: Product | null; onSave: (p: Omit<Product, "id" | "createdAt">) => void; onClose: () => void }) {
  const [draft, setDraft] = useState({ sku: product?.sku ?? "", name: product?.name ?? "", vendor: product?.vendor ?? "", category: product?.category ?? "", quantity: product?.quantity ?? 0, unitCost: product?.unitCost ?? 0, salePrice: product?.salePrice ?? 0, reorderPoint: product?.reorderPoint ?? 5, salesTaxPaid: product?.salesTaxPaid ?? false });
  return <Modal title={product ? "Edit product" : "Add a product"} eyebrow="Inventory item" onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); onSave({ ...draft, vendor: draft.vendor.trim() }); }}><div className="formGrid"><label className="wide">Product name<input required autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Speckled ceramic mug" /></label><label>SKU<input required value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value.toUpperCase() })} placeholder="MUG-101" /></label><label>Category<input required value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Home" /></label><label className="wide">Vendor<input value={draft.vendor} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} placeholder="Supplier or manufacturer" /></label><label>Quantity on hand<input required min="0" type="number" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} /></label><label>Reorder point<input required min="0" type="number" value={draft.reorderPoint} onChange={(e) => setDraft({ ...draft, reorderPoint: Number(e.target.value) })} /></label><label>Unit cost<input required min="0" step="0.01" type="number" value={draft.unitCost} onChange={(e) => setDraft({ ...draft, unitCost: Number(e.target.value) })} /></label><label>Sale price<input required min="0" step="0.01" type="number" value={draft.salePrice} onChange={(e) => setDraft({ ...draft, salePrice: Number(e.target.value) })} /></label><label className="wide checkLabel"><input type="checkbox" checked={draft.salesTaxPaid} onChange={(e) => setDraft({ ...draft, salesTaxPaid: e.target.checked })} /><span><strong>Sales tax was paid when purchased</strong><small>Leave unchecked for inventory bought tax-free for resale. Personal-use tax comes from your address in settings.</small></span></label></div><ModalActions onClose={onClose} label={product ? "Save changes" : "Add product"} /></form></Modal>;
}

function MovementModal({ products, initialProduct, initialType, settings, onSave, onClose }: { products: Product[]; initialProduct: Product | null; initialType: MovementType | null; settings: Settings; onSave: (m: Omit<Movement, "id">) => void; onClose: () => void }) {
  const first = initialProduct ?? products[0];
  const defaultType: MovementType = initialType ?? (initialProduct ? "personal_use" : "sale");
  const [draft, setDraft] = useState({ productId: first?.id ?? "", type: defaultType, quantity: 1, date: dateOnly(), note: "", finalProductName: defaultType === "sale" ? first?.name ?? "" : "", customerAddress: blankAddress(settings.ownAddress.state) });
  const [liveRate, setLiveRate] = useState<TaxRateLookup | null>(null);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "checking" | "error">("idle");
  const [lookupMessage, setLookupMessage] = useState("");
  const product = products.find((p) => p.id === draft.productId);
  const isOut = draft.type === "sale" || draft.type === "production_use" || draft.type === "personal_use";
  const customerSetting = settings.stateTaxes[draft.customerAddress.state] ?? { enabled: false, rate: 0 };
  const customerResolved = resolveAddressRate(draft.customerAddress, settings, liveRate);
  const ownResolved = resolveAddressRate(settings.ownAddress, settings);
  const selectedRate = draft.type === "personal_use" ? ownResolved : customerResolved;
  const stateRate = draft.type === "personal_use" ? selectedRate.stateRate : draft.type === "sale" && customerSetting.enabled ? selectedRate.stateRate : 0;
  const localRate = draft.type === "personal_use" ? selectedRate.localRate : draft.type === "sale" && customerSetting.enabled ? selectedRate.localRate : 0;
  const appliedRate = roundRate(stateRate + localRate);
  const taxableAmount = product ? draft.quantity * (draft.type === "sale" ? product.salePrice : product.unitCost) : 0;
  const shouldTax = Boolean(product && ((draft.type === "personal_use" && !product.salesTaxPaid) || (draft.type === "sale" && customerSetting.enabled)));
  const stateTax = shouldTax ? roundTax(taxableAmount, stateRate) : 0;
  const localTax = shouldTax ? roundTax(taxableAmount, localRate) : 0;
  const tax = stateTax + localTax;
  const updateCustomerAddress = (field: keyof Address, value: string) => {
    setDraft((current) => ({ ...current, customerAddress: { ...current.customerAddress, [field]: value } }));
    setLiveRate(null); setLookupStatus("idle"); setLookupMessage("");
  };
  const changeProduct = (productId: string) => {
    const nextProduct = products.find((candidate) => candidate.id === productId);
    setDraft((current) => ({ ...current, productId, finalProductName: current.type === "sale" ? nextProduct?.name ?? "" : current.finalProductName }));
  };
  const changeType = (type: MovementType) => setDraft((current) => ({ ...current, type, finalProductName: type === "sale" ? product?.name ?? "" : type === "production_use" ? "" : "" }));
  const lookupCustomerRate = async () => {
    if (!isCompleteAddress(draft.customerAddress)) {
      setLookupStatus("error"); setLookupMessage("Complete the street, city, state, and ZIP first."); return;
    }
    setLookupStatus("checking"); setLookupMessage("");
    try {
      const response = await fetch("/api/tax-rates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ addresses: [{ id: "sale-address", address: draft.customerAddress, stateBaseRate: customerSetting.rate }] }) });
      const payload = await response.json() as TaxRateLookupResponse & { error?: string };
      const match = payload.lookups?.[0];
      if (!response.ok || !match) throw new Error(payload.error || payload.notices?.[0] || "No rate was returned for this address.");
      setLiveRate(match); setLookupStatus("idle"); setLookupMessage(`${match.sourceName} · ${match.jurisdiction}`);
    } catch (caught) {
      setLookupStatus("error"); setLookupMessage(caught instanceof Error ? caught.message : "The address rate could not be checked.");
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (isOut && draft.quantity > product.quantity) return alert("There is not enough stock for this activity.");
    const tracksFinalProduct = draft.type === "sale" || draft.type === "production_use";
    const finalProductName = tracksFinalProduct ? draft.finalProductName.trim() : undefined;
    if (tracksFinalProduct && !finalProductName) return alert("Choose or enter the final product for this cost.");
    const finalProduct = products.find((candidate) => candidate.name.trim().toLowerCase() === finalProductName?.toLowerCase());
    const customerAddress = draft.type === "sale" ? draft.customerAddress : undefined;
    onSave({ ...draft, finalProductName, finalProductId: finalProduct?.id, productName: product.name, productSku: product.sku, customerAddress, unitCost: product.unitCost, unitPrice: draft.type === "production_use" ? 0 : product.salePrice, salesTax: tax, stateTax, localTax, taxRate: appliedRate, stateTaxRate: stateRate, localTaxRate: localRate, taxJurisdiction: draft.type === "personal_use" ? settings.ownAddress.state : draft.type === "sale" ? draft.customerAddress.state : undefined, localJurisdiction: draft.type === "sale" || draft.type === "personal_use" ? selectedRate.jurisdiction : undefined, taxCollected: draft.type === "sale" ? customerSetting.enabled : false });
  };
  const modalTitle = draft.type === "personal_use" ? "Mark inventory as used" : draft.type === "production_use" ? "Use inventory in a final product" : "Record inventory activity";
  return <Modal title={modalTitle} eyebrow="Stock ledger" onClose={onClose}><form onSubmit={submit}><div className="formGrid">
    <label className="wide">{draft.type === "production_use" ? "Cost item from inventory" : "Product"}<select required value={draft.productId} onChange={(event) => changeProduct(event.target.value)}>{products.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.name} · {candidate.quantity} on hand</option>)}</select></label>
    <label>Activity<select value={draft.type} onChange={(event) => changeType(event.target.value as MovementType)}><option value="sale">Customer sale</option><option value="production_use">Used in final product</option><option value="purchase">Stock purchase</option><option value="personal_use">Personal use</option><option value="adjustment">Count adjustment (+/−)</option></select></label>
    <label>Quantity<input required type="number" min={draft.type === "adjustment" ? undefined : 1} value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: Number(event.target.value) })} /></label>
    <label>Date<input required type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
    {(draft.type === "sale" || draft.type === "production_use") && <label className="wide">{draft.type === "sale" ? "Final product sold" : "Used in final product"}<input required list="final-product-options" value={draft.finalProductName} onChange={(event) => setDraft({ ...draft, finalProductName: event.target.value })} placeholder="Choose an existing product or enter a finished-product name" /><small>{draft.type === "sale" ? "Defaults to the sold item; change it when this cost belongs to a bundle or another finished product." : "This links the component cost to the item you are producing."}</small><datalist id="final-product-options">{products.map((candidate) => <option value={candidate.name} key={candidate.id} />)}</datalist></label>}
    {draft.type === "sale" && <><div className="addressHeading wide"><span>Customer delivery address</span><small>Destination state, city, and ZIP select your configured tax layers.</small></div><label className="wide">Street address<input required value={draft.customerAddress.line1} onChange={(event) => updateCustomerAddress("line1", event.target.value)} placeholder="Customer delivery address" /></label><label>City<input required value={draft.customerAddress.city} onChange={(event) => updateCustomerAddress("city", event.target.value)} /></label><label>State<select required value={draft.customerAddress.state} onChange={(event) => updateCustomerAddress("state", event.target.value)}>{stateTaxDefaults.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label><label>ZIP code<input required inputMode="numeric" value={draft.customerAddress.postalCode} onChange={(event) => updateCustomerAddress("postalCode", event.target.value)} /></label>{customerSetting.enabled && <div className="lookupRow wide"><button type="button" className="secondary" onClick={lookupCustomerRate} disabled={lookupStatus === "checking"}>{lookupStatus === "checking" ? "Checking official source…" : "↻ Look up exact address rate"}</button><span className={lookupStatus === "error" ? "lookupError" : ""}>{lookupMessage || (findAddressTaxRate(draft.customerAddress, settings.addressTaxRates) ? "Using the last saved address update." : "Optional, but recommended before recording the sale.")}</span></div>}</>}
    <label className="wide">Note<input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Optional detail" /></label>
    {draft.type === "production_use" && <div className="formNotice wide"><strong>Production allocation</strong><span>This reduces the component&apos;s on-hand quantity. The cost stays separate from recognized sale COGS until a customer sale is recorded.</span></div>}
  </div>{draft.type === "sale" && <div className={customerSetting.enabled ? "taxPreview layered" : "taxPreview off"}><span><strong>{customerSetting.enabled ? `Collecting ${appliedRate}% combined tax` : `Not collecting tax in ${stateName(draft.customerAddress.state)}`}</strong><small>{customerSetting.enabled ? `${stateName(draft.customerAddress.state)} ${stateRate}% (${money.format(stateTax)})${localRate ? ` + ${selectedRate.jurisdiction || "local"} ${localRate}% (${money.format(localTax)})` : " + no local rate found"}${selectedRate.sourceName ? ` · ${selectedRate.sourceName}` : ""}` : "This state is not checked in Data & settings."}</small></span><b>{money.format(tax)}</b></div>}{draft.type === "personal_use" && <div className="taxPreview layered"><span><strong>{product?.salesTaxPaid ? "No additional use tax" : `Use tax for your ${stateName(settings.ownAddress.state)} address`}</strong><small>{product?.salesTaxPaid ? "Sales tax was already paid on this product." : `${stateRate}% state (${money.format(stateTax)})${localRate ? ` + ${selectedRate.jurisdiction || "local"} ${localRate}% (${money.format(localTax)})` : " + no local rate found"}${selectedRate.sourceName ? ` · ${selectedRate.sourceName}` : ""}`}</small></span><b>{money.format(tax)}</b></div>}<ModalActions onClose={onClose} label={draft.type === "production_use" ? "Allocate cost" : "Record activity"} /></form></Modal>;
}

function ExpenseModal({ categories, onSave, onClose }: { categories: readonly ExpenseCategoryDefinition[]; onSave: (expense: ExpenseDraft) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<ExpenseDraft>({ externalKey: "", purchaseSource: "", vendor: "", asins: [], category: "Office supplies", amount: 0, date: dateOnly(), note: "", personal: false, source: "manual" });
  const selectedCategory: ExpenseCategoryDefinition = categories.find((category) => category.name === draft.category) ?? { name: draft.category, accountingClass: "Operating expense" };
  const treatmentLabel = `${selectedCategory.accountingClass}${selectedCategory.costTiming ? ` · ${selectedCategory.costTiming}` : ""}`;
  return <Modal title="Add an expense record" eyebrow="Expense ledger" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave({ ...draft, externalKey: draft.externalKey.trim(), purchaseSource: draft.purchaseSource.trim(), vendor: draft.vendor.trim(), note: draft.note.trim() }); }}><div className="formGrid"><label className="wide">Unique record key<input autoFocus required value={draft.externalKey} onChange={(event) => setDraft({ ...draft, externalKey: event.target.value })} placeholder="Amazon order ID, invoice ID, or transaction ID" /><small>StockBot blocks any future record with this same key.</small></label><label>Vendor or merchant<input required value={draft.vendor} onChange={(event) => setDraft({ ...draft, vendor: event.target.value })} placeholder="Amazon, electric company, landlord…" /></label><label>Purchase source<input value={draft.purchaseSource} onChange={(event) => setDraft({ ...draft, purchaseSource: event.target.value })} placeholder="Account or purchase channel" /><small>Optional for manually entered expenses.</small></label><label>Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as ExpenseCategory })}>{expenseAccountingClasses.map((accountingClass) => <optgroup label={accountingClass} key={accountingClass}>{categories.filter((category) => category.accountingClass === accountingClass).map((category) => <option key={category.name} value={category.name}>{category.name}{category.costTiming ? ` · ${category.costTiming}` : ""}</option>)}</optgroup>)}</select><small>{treatmentLabel}</small></label><label>Amount<input required min="0.01" step="0.01" type="number" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })} /></label><label>Date<input required type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label><label className="wide">Description or memo<input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="What the purchase was for" /></label><label className="wide checkLabel"><input type="checkbox" checked={draft.personal} onChange={(event) => setDraft({ ...draft, personal: event.target.checked })} /><span><strong>Personal purchase</strong><small>Keep this record for reference without including it in business expenses, COGS, inventory, or tax calculations.</small></span></label>{selectedCategory.accountingClass === "Product cost" && selectedCategory.costTiming === "Recognize directly as COGS" && !draft.personal && <div className="formNotice wide"><strong>Avoid counting the same cost twice.</strong><span>Recognize a product cost directly only when the amount is not already included in a product&apos;s unit cost.</span></div>}</div><ModalActions onClose={onClose} label="Add expense" /></form></Modal>;
}

function Modal({ title, eyebrow, onClose, children, className = "" }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode; className?: string }) { return <div className="modalBackdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className={`modal ${className}`.trim()} role="dialog" aria-modal="true" aria-label={title}><button className="modalClose" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{children}</section></div>; }
function ModalActions({ onClose, label }: { onClose: () => void; label: string }) { return <div className="modalActions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit">{label}</button></div>; }
function Empty({ text }: { text: string }) { return <div className="empty">{text}</div>; }

function downloadExpenseTemplate() { const csv = "external_key,purchase_source,vendor,asin,date,amount,category,personal,note\nAMAZON-ORDER-ID,Amazon Business,Amazon,B0TEST0001,2026-01-15,49.95,Office supplies,false,Printer paper\n"; const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "stockbot-expense-import-template.csv"; anchor.click(); URL.revokeObjectURL(url); }
function downloadInvoiceTemplate() { const csv = "Invoice Number,Line Item ID,Invoice Date,Customer ID,Customer Name,Customer Email,Customer Phone,Shipping Address,Shipping City,Shipping State,Shipping ZIP,SKU,Product Name,Category,Quantity,Unit Price,Unit Cost,Line Sales Tax\nINV-1001,1,2025-01-15,CUST-42,Harbor Market,orders@harbormarket.example,555-0100,210 Market St,San Diego,CA,92101,CER-101,Speckled Ceramic Mug,Home,3,24.00,8.50,5.22\n"; const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "stockbot-historical-invoice-template.csv"; anchor.click(); URL.revokeObjectURL(url); }
function exportState(state: AppState) { const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `stockbot-backup-${dateOnly()}.json`; a.click(); URL.revokeObjectURL(url); }
function importState(event: ChangeEvent<HTMLInputElement>, setState: React.Dispatch<React.SetStateAction<AppState>>) { const file = event.target.files?.[0]; if (!file) return; file.text().then((text) => { const parsed: unknown = JSON.parse(text); const normalized = normalizeState(parsed); if (!Array.isArray((parsed as Partial<AppState>)?.products) || !Array.isArray((parsed as Partial<AppState>)?.movements) || !Array.isArray((parsed as Partial<AppState>)?.expenses)) throw new Error(); if (confirm(`Import ${normalized.products.length} products and replace the current workspace?`)) setState(normalized); }).catch(() => alert("That file is not a valid StockBot backup.")); event.target.value = ""; }

function normalizeState(raw: unknown): AppState {
  if (!raw || typeof raw !== "object") return seed;
  const incoming = raw as Partial<AppState> & { settings?: Partial<Settings> & { defaultTaxRate?: number; expenseCategoryTypeOverrides?: unknown } };
  const savedVersion = Number(incoming.version) || 0;
  const customExpenseCategories = normalizeCustomExpenseCategories(incoming.settings?.customExpenseCategories);
  const expenseCategoryOverrides = normalizeExpenseCategoryOverrides(incoming.settings?.expenseCategoryOverrides, incoming.settings?.expenseCategoryTypeOverrides);
  const ownAddress = { ...blankAddress("CA"), ...(incoming.settings?.ownAddress ?? {}) };
  const savedTaxes = incoming.settings?.stateTaxes ?? {};
  const legacyRate = incoming.settings?.defaultTaxRate;
  const stateTaxes = { ...defaultStateTaxSettings(ownAddress.state), ...savedTaxes };
  if (legacyRate !== undefined && !incoming.settings?.stateTaxes) stateTaxes[ownAddress.state] = { enabled: true, rate: legacyRate };
  const seenExpenseKeys = new Set<string>();
  const expenses = (Array.isArray(incoming.expenses) ? incoming.expenses : seed.expenses).map((expense, index): Expense => {
    const fields = expense.fields && typeof expense.fields === "object" && !Array.isArray(expense.fields) ? Object.fromEntries(Object.entries(expense.fields).map(([key, value]) => [key, String(value ?? "")])) : undefined;
    const importedAsin = fields ? Object.entries(fields).find(([key]) => key.trim().toLowerCase().replace(/[^a-z0-9]/g, "") === "asin")?.[1] : undefined;
    return {
      id: expense.id || `legacy-expense-${index + 1}`,
      externalKey: String(expense.externalKey || `legacy:${expense.id || index + 1}`).trim(),
      purchaseSource: typeof expense.purchaseSource === "string" ? expense.purchaseSource.trim() : "",
      vendor: String(expense.vendor || "Unknown vendor").trim(),
      asins: normalizeExpenseAsins(expense.asins?.length ? expense.asins : importedAsin),
      category: normalizeExpenseCategory(expense.category, customExpenseCategories.map((category) => category.name)),
      amount: Number(expense.amount) || 0,
      date: normalizeExpenseDate(expense.date) || dateOnly(),
      note: String(expense.note || "").trim(),
      personal: Boolean(expense.personal),
      source: expense.source === "import" ? "import" : "manual",
      importedAt: expense.importedAt,
      fields,
    };
  }).filter((expense) => {
    const key = normalizeExpenseKey(expense.externalKey);
    if (!key || seenExpenseKeys.has(key)) return false;
    seenExpenseKeys.add(key); return true;
  });
  const expenseColumns = expenseColumnDefinitionsFor(expenses);
  const mergedExpenseColumnOrder = mergeExpenseColumnOrder(Array.isArray(incoming.settings?.expenseColumnOrder) ? incoming.settings.expenseColumnOrder.filter((key): key is string => typeof key === "string") : defaultExpenseColumnOrder, expenseColumns);
  const legacyOrderWithoutSource = mergedExpenseColumnOrder.filter((key) => key !== "purchaseSource");
  const vendorColumnIndex = legacyOrderWithoutSource.indexOf("vendor");
  const sourceMigratedColumnOrder = savedVersion < 10
    ? [...legacyOrderWithoutSource.slice(0, vendorColumnIndex + 1), "purchaseSource", ...legacyOrderWithoutSource.slice(vendorColumnIndex + 1)]
    : mergedExpenseColumnOrder;
  const legacyOrderWithoutPersonal = sourceMigratedColumnOrder.filter((key) => key !== "personal");
  const categoryColumnIndex = legacyOrderWithoutPersonal.indexOf("category");
  const personalMigratedColumnOrder = savedVersion < 11
    ? [...legacyOrderWithoutPersonal.slice(0, categoryColumnIndex + 1), "personal", ...legacyOrderWithoutPersonal.slice(categoryColumnIndex + 1)]
    : sourceMigratedColumnOrder;
  const orderWithoutTreatment = personalMigratedColumnOrder.filter((key) => key !== "categoryType" && key !== "accountingClass" && key !== "costTiming");
  const migratedCategoryColumnIndex = orderWithoutTreatment.indexOf("category");
  const treatmentMigratedColumnOrder = savedVersion < 15
    ? [...orderWithoutTreatment.slice(0, migratedCategoryColumnIndex + 1), "accountingClass", "costTiming", ...orderWithoutTreatment.slice(migratedCategoryColumnIndex + 1)]
    : personalMigratedColumnOrder;
  const orderWithoutAsin = treatmentMigratedColumnOrder.filter((key) => key !== "asin" && key !== expenseCsvColumnKey("ASIN"));
  const asinColumnIndex = Math.max(0, orderWithoutAsin.indexOf("purchaseSource") + 1);
  const expenseColumnOrder = savedVersion < 16
    ? [...orderWithoutAsin.slice(0, asinColumnIndex), "asin", ...orderWithoutAsin.slice(asinColumnIndex)]
    : treatmentMigratedColumnOrder;
  const expenseColumnKeys = new Set(expenseColumns.map((column) => column.key));
  const savedVisibleColumns = Array.isArray(incoming.settings?.expenseVisibleColumns) ? incoming.settings.expenseVisibleColumns.filter((key): key is string => typeof key === "string" && expenseColumnKeys.has(key)) : [];
  const sourceMigratedVisibleColumns = savedVersion < 10 && savedVisibleColumns.length && !savedVisibleColumns.includes("purchaseSource")
    ? [...savedVisibleColumns.slice(0, 2), "purchaseSource", ...savedVisibleColumns.slice(2)]
    : savedVisibleColumns;
  const personalMigratedVisibleColumns = savedVersion < 11 && sourceMigratedVisibleColumns.length && !sourceMigratedVisibleColumns.includes("personal")
    ? [...sourceMigratedVisibleColumns.slice(0, Math.max(0, sourceMigratedVisibleColumns.indexOf("category") + 1)), "personal", ...sourceMigratedVisibleColumns.slice(Math.max(0, sourceMigratedVisibleColumns.indexOf("category") + 1))]
    : sourceMigratedVisibleColumns;
  const visibleWithoutTreatment = personalMigratedVisibleColumns.filter((key) => key !== "categoryType" && key !== "accountingClass" && key !== "costTiming");
  const treatmentMigratedVisibleColumns = savedVersion < 15 && visibleWithoutTreatment.length
    ? [...visibleWithoutTreatment.slice(0, Math.max(0, visibleWithoutTreatment.indexOf("category") + 1)), "accountingClass", "costTiming", ...visibleWithoutTreatment.slice(Math.max(0, visibleWithoutTreatment.indexOf("category") + 1))]
    : personalMigratedVisibleColumns;
  const visibleWithoutAsin = treatmentMigratedVisibleColumns.filter((key) => key !== "asin" && key !== expenseCsvColumnKey("ASIN"));
  const asinVisibleColumnIndex = Math.max(0, visibleWithoutAsin.indexOf("purchaseSource") + 1);
  const migratedVisibleColumns = savedVersion < 16 && visibleWithoutAsin.length
    ? [...visibleWithoutAsin.slice(0, asinVisibleColumnIndex), "asin", ...visibleWithoutAsin.slice(asinVisibleColumnIndex)]
    : treatmentMigratedVisibleColumns;
  const products = (Array.isArray(incoming.products) ? incoming.products : seed.products).map((product) => ({ ...product, vendor: typeof product.vendor === "string" ? product.vendor.trim() : "" }));
  const seenCustomerKeys = new Set<string>();
  const customers = (Array.isArray(incoming.customers) ? incoming.customers : []).map((customer, index): Customer => {
    const address = customer.address && typeof customer.address === "object" ? customer.address : blankAddress();
    const externalKey = String(customer.externalKey || customer.email || customer.id || `legacy-customer-${index + 1}`).trim();
    return {
      id: String(customer.id || `legacy-customer-${index + 1}`),
      externalKey,
      name: String(customer.name || customer.email || "Unknown customer").trim(),
      email: String(customer.email || "").trim().toLowerCase(),
      phone: String(customer.phone || "").trim(),
      address: { ...blankAddress(String(address.state || "")), ...address, state: String(address.state || "").toUpperCase() },
      createdAt: normalizeExpenseDate(customer.createdAt) || dateOnly(),
      updatedAt: normalizeExpenseDate(customer.updatedAt) || normalizeExpenseDate(customer.createdAt) || dateOnly(),
    };
  }).filter((customer) => {
    const key = normalizeCustomerKey(customer.externalKey);
    if (!key || seenCustomerKeys.has(key)) return false;
    seenCustomerKeys.add(key); return true;
  });
  const movementTypes: MovementType[] = ["purchase", "sale", "production_use", "personal_use", "adjustment"];
  const seenMovementSourceKeys = new Set<string>();
  const movements = (Array.isArray(incoming.movements) ? incoming.movements : seed.movements).map((movement): Movement => {
    const product = products.find((candidate) => candidate.id === movement.productId);
    const type = movementTypes.includes(movement.type) ? movement.type : "adjustment";
    const productName = typeof movement.productName === "string" && movement.productName.trim() ? movement.productName.trim() : product?.name;
    const productSku = typeof movement.productSku === "string" && movement.productSku.trim() ? movement.productSku.trim() : product?.sku;
    const savedFinalProductName = typeof movement.finalProductName === "string" ? movement.finalProductName.trim() : "";
    return { ...movement, type, productName, productSku, finalProductId: typeof movement.finalProductId === "string" ? movement.finalProductId : undefined, finalProductName: savedFinalProductName || (type === "sale" ? productName : undefined), sourceKey: typeof movement.sourceKey === "string" && movement.sourceKey.trim() ? movement.sourceKey.trim() : undefined, invoiceNumber: typeof movement.invoiceNumber === "string" ? movement.invoiceNumber.trim() : undefined, customerId: typeof movement.customerId === "string" ? movement.customerId : undefined, customerName: typeof movement.customerName === "string" ? movement.customerName.trim() : undefined };
  }).filter((movement) => {
    if (!movement.sourceKey) return true;
    const key = normalizeInvoiceKey(movement.sourceKey);
    if (seenMovementSourceKeys.has(key)) return false;
    seenMovementSourceKeys.add(key); return true;
  });
  return {
    version: 16,
    products,
    movements,
    expenses,
    customers,
    settings: {
      businessName: incoming.settings?.businessName ?? seed.settings.businessName,
      taxYear: incoming.settings?.taxYear ?? nowYear,
      beginningInventory: incoming.settings?.beginningInventory ?? 0,
      ownAddress,
      stateTaxes,
      localTaxRules: Array.isArray(incoming.settings?.localTaxRules) ? incoming.settings.localTaxRules.map((rule) => ({ ...rule, manualOverride: rule.manualOverride ?? true })) : [],
      addressTaxRates: Array.isArray(incoming.settings?.addressTaxRates) ? incoming.settings.addressTaxRates : [],
      taxUpdateHistory: Array.isArray(incoming.settings?.taxUpdateHistory) ? incoming.settings.taxUpdateHistory : [],
      customExpenseCategories,
      expenseCategoryOverrides,
      expenseColumnOrder,
      expenseVisibleColumns: migratedVisibleColumns.length ? migratedVisibleColumns : defaultExpenseVisibleColumns,
    },
  };
}
