"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { expenseCategories, normalizeExpenseCategory, normalizeExpenseDate, normalizeExpenseKey, parseExpenseImportText } from "./expense-import";
import type { ExpenseCategory, ExpenseImportPreview } from "./expense-import";
import { defaultStateTaxSettings, stateName, stateTaxDefaults } from "./tax-data";
import type { TaxAddress, TaxRateLookup, TaxRateLookupResponse, TaxSourceStatus } from "./tax-rate-types";

type View = "dashboard" | "products" | "activity" | "expenses" | "taxes" | "data";
type MovementType = "purchase" | "sale" | "personal_use" | "adjustment";
type Product = {
  id: string; sku: string; name: string; category: string; quantity: number; unitCost: number;
  salePrice: number; reorderPoint: number; salesTaxPaid: boolean; createdAt: string;
};
type Movement = {
  id: string; productId: string; type: MovementType; quantity: number; unitCost: number;
  unitPrice: number; salesTax: number; date: string; note: string; taxRate?: number;
  stateTax?: number; localTax?: number; stateTaxRate?: number; localTaxRate?: number;
  taxJurisdiction?: string; localJurisdiction?: string; taxCollected?: boolean; customerAddress?: Address;
};
type Expense = { id: string; externalKey: string; vendor: string; category: ExpenseCategory; amount: number; date: string; note: string; source: "manual" | "import"; importedAt?: string };
type ExpenseDraft = Omit<Expense, "id">;
type Address = TaxAddress;
type RateMetadata = { manualOverride?: boolean; sourceName?: string; sourceUrl?: string; checkedAt?: string; effectiveDate?: string | null };
type StateTaxSetting = { enabled: boolean; rate: number } & RateMetadata;
type LocalTaxRule = { id: string; name: string; state: string; city: string; postalCode: string; rate: number; enabled: boolean } & RateMetadata;
type AddressTaxRate = TaxRateLookup & { addressKey: string; checkedAt: string };
type TaxUpdateAudit = { id: string; checkedAt: string; appliedAt: string | null; checkedAddresses: number; availableUpdates: number; appliedUpdates: number; status: "checked" | "applied"; sources: string[] };
type Settings = { businessName: string; taxYear: number; beginningInventory: number; ownAddress: Address; stateTaxes: Record<string, StateTaxSetting>; localTaxRules: LocalTaxRule[]; addressTaxRates: AddressTaxRate[]; taxUpdateHistory: TaxUpdateAudit[] };
type AppState = { version: 5; products: Product[]; movements: Movement[]; expenses: Expense[]; settings: Settings };
type Metrics = { inventoryValue: number; units: number; revenue: number; inventoryCogs: number; additionalCogs: number; cogs: number; salesTax: number; stateSalesTax: number; localSalesTax: number; useTax: number; stateUseTax: number; localUseTax: number; expenses: number; expenseRecordsTotal: number; purchases: number; grossProfit: number; taxableIncome: number };

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const whole = new Intl.NumberFormat("en-US");
const nowYear = new Date().getFullYear();
const uid = () => crypto.randomUUID();
const dateOnly = () => new Date().toISOString().slice(0, 10);
const blankAddress = (state = "CA"): Address => ({ line1: "", city: "", state, postalCode: "" });
const roundTax = (amount: number, rate: number) => Math.round(amount * rate) / 100;
const roundRate = (rate: number) => Math.round(rate * 1_000) / 1_000;
async function parseExpenseImport(file: File, existingExpenses: Expense[]): Promise<ExpenseImportPreview> {
  return parseExpenseImportText(await file.text(), file.name, existingExpenses.map((expense) => expense.externalKey));
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
  version: 5,
  settings: { businessName: "Juniper & Co.", taxYear: nowYear, beginningInventory: 3180, ownAddress: blankAddress("CA"), stateTaxes: defaultStateTaxSettings("CA"), localTaxRules: [], addressTaxRates: [], taxUpdateHistory: [] },
  products: [
    { id: "p1", sku: "CER-101", name: "Speckled Ceramic Mug", category: "Home", quantity: 24, unitCost: 8.5, salePrice: 24, reorderPoint: 8, salesTaxPaid: false, createdAt: `${nowYear}-01-05` },
    { id: "p2", sku: "CAN-204", name: "Cedar + Moss Candle", category: "Wellness", quantity: 7, unitCost: 7.25, salePrice: 22, reorderPoint: 10, salesTaxPaid: true, createdAt: `${nowYear}-01-09` },
    { id: "p3", sku: "TOT-310", name: "Canvas Market Tote", category: "Accessories", quantity: 31, unitCost: 5.8, salePrice: 18, reorderPoint: 12, salesTaxPaid: false, createdAt: `${nowYear}-02-02` },
    { id: "p4", sku: "NOT-118", name: "Linen Notebook", category: "Stationery", quantity: 15, unitCost: 4.2, salePrice: 14, reorderPoint: 6, salesTaxPaid: true, createdAt: `${nowYear}-02-18` },
  ],
  movements: [
    { id: "m1", productId: "p1", type: "sale", quantity: 3, unitCost: 8.5, unitPrice: 24, salesTax: 5.22, stateTax: 5.22, localTax: 0, taxRate: 7.25, stateTaxRate: 7.25, localTaxRate: 0, taxJurisdiction: "CA", taxCollected: true, customerAddress: { line1: "210 Market St", city: "San Diego", state: "CA", postalCode: "92101" }, date: `${nowYear}-03-04`, note: "Weekend market" },
    { id: "m2", productId: "p3", type: "sale", quantity: 4, unitCost: 5.8, unitPrice: 18, salesTax: 5.22, stateTax: 5.22, localTax: 0, taxRate: 7.25, stateTaxRate: 7.25, localTaxRate: 0, taxJurisdiction: "CA", taxCollected: true, customerAddress: { line1: "48 Hill Ave", city: "Los Angeles", state: "CA", postalCode: "90012" }, date: `${nowYear}-03-04`, note: "Weekend market" },
    { id: "m3", productId: "p2", type: "purchase", quantity: 12, unitCost: 7.25, unitPrice: 0, salesTax: 7.61, date: `${nowYear}-02-20`, note: "Spring restock" },
  ],
  expenses: [
    { id: "e1", externalKey: "seed-flyer-001", vendor: "Town Print Shop", category: "Advertising & marketing", amount: 95, date: `${nowYear}-02-12`, note: "Local market flyer", source: "manual" },
    { id: "e2", externalKey: "seed-packaging-001", vendor: "Packaging Supply Co.", category: "Office supplies", amount: 64.5, date: `${nowYear}-03-01`, note: "Packaging and labels", source: "manual" },
  ],
};

const icons: Record<View | "plus" | "search" | "download" | "upload" | "alert" | "arrow", string> = {
  dashboard: "▦", products: "□", activity: "↕", expenses: "$", taxes: "%", data: "↥", plus: "+", search: "⌕", download: "↓", upload: "↑", alert: "!", arrow: "→",
};

export default function Home() {
  const [state, setState] = useState<AppState>(seed);
  const [view, setView] = useState<View>("dashboard");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState<"saved" | "saving" | "error">("saved");
  const [query, setQuery] = useState("");
  const [productModal, setProductModal] = useState(false);
  const [movementModal, setMovementModal] = useState(false);
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
  const yearExpenses = useMemo(() => state.expenses.filter((e) => new Date(`${e.date}T12:00:00`).getFullYear() === state.settings.taxYear), [state.expenses, state.settings.taxYear]);
  const metrics = useMemo(() => {
    const inventoryValue = state.products.reduce((n, p) => n + p.quantity * p.unitCost, 0);
    const units = state.products.reduce((n, p) => n + p.quantity, 0);
    const sales = yearMovements.filter((m) => m.type === "sale");
    const revenue = sales.reduce((n, m) => n + m.quantity * m.unitPrice, 0);
    const inventoryCogs = sales.reduce((n, m) => n + m.quantity * m.unitCost, 0);
    const additionalCogs = yearExpenses.filter((expense) => expense.category === "Cost of goods").reduce((n, expense) => n + expense.amount, 0);
    const cogs = inventoryCogs + additionalCogs;
    const salesTax = sales.reduce((n, m) => n + m.salesTax, 0);
    const stateSalesTax = sales.reduce((n, m) => n + (m.stateTax ?? m.salesTax), 0);
    const localSalesTax = sales.reduce((n, m) => n + (m.localTax ?? 0), 0);
    const personalUse = yearMovements.filter((m) => m.type === "personal_use");
    const useTax = personalUse.reduce((n, m) => n + m.salesTax, 0);
    const stateUseTax = personalUse.reduce((n, m) => n + (m.stateTax ?? m.salesTax), 0);
    const localUseTax = personalUse.reduce((n, m) => n + (m.localTax ?? 0), 0);
    const expenses = yearExpenses.filter((expense) => expense.category !== "Cost of goods").reduce((n, expense) => n + expense.amount, 0);
    const expenseRecordsTotal = expenses + additionalCogs;
    const purchases = yearMovements.filter((m) => m.type === "purchase").reduce((n, m) => n + m.quantity * m.unitCost, 0);
    return { inventoryValue, units, revenue, inventoryCogs, additionalCogs, cogs, salesTax, stateSalesTax, localSalesTax, useTax, stateUseTax, localUseTax, expenses, expenseRecordsTotal, purchases, grossProfit: revenue - cogs, taxableIncome: revenue - cogs - expenses };
  }, [state.products, yearExpenses, yearMovements]);

  const saveProduct = (draft: Omit<Product, "id" | "createdAt">) => {
    setState((s) => selectedProduct
      ? { ...s, products: s.products.map((p) => p.id === selectedProduct.id ? { ...p, ...draft } : p) }
      : { ...s, products: [{ ...draft, id: uid(), createdAt: dateOnly() }, ...s.products] });
    setProductModal(false); setSelectedProduct(null);
  };

  const recordMovement = (draft: Omit<Movement, "id">) => {
    const delta = draft.type === "purchase" ? draft.quantity : draft.type === "adjustment" ? draft.quantity : -draft.quantity;
    setState((s) => ({ ...s, movements: [{ ...draft, id: uid() }, ...s.movements], products: s.products.map((p) => p.id === draft.productId ? { ...p, quantity: Math.max(0, p.quantity + delta), unitCost: draft.type === "purchase" ? draft.unitCost : p.unitCost } : p) }));
    setMovementModal(false);
  };

  const openUse = (product: Product) => { setSelectedProduct(product); setMovementModal(true); };
  const nav: { id: View; label: string }[] = [
    { id: "dashboard", label: "Overview" }, { id: "products", label: "Products" }, { id: "activity", label: "Activity" }, { id: "expenses", label: "Expenses" }, { id: "taxes", label: "Tax center" }, { id: "data", label: "Data & settings" },
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
        <header className="topbar"><div><p className="eyebrow">{state.settings.businessName} · {state.settings.taxYear}</p><h1>{nav.find((n) => n.id === view)?.label}</h1></div><div className="topActions"><button className="secondary" onClick={() => setMovementModal(true)}>{icons.arrow} Record activity</button><button className="primary" onClick={() => { setSelectedProduct(null); setProductModal(true); }}>{icons.plus} Add product</button></div></header>

        {view === "dashboard" && <Dashboard state={state} metrics={metrics} onView={setView} onUse={openUse} />}
        {view === "products" && <Products state={state} query={query} setQuery={setQuery} onEdit={(p) => { setSelectedProduct(p); setProductModal(true); }} onUse={openUse} onDelete={(p) => confirm(`Delete ${p.name}? Its activity history will remain.`) && setState((s) => ({ ...s, products: s.products.filter((x) => x.id !== p.id) }))} />}
        {view === "activity" && <Activity state={state} onNew={() => setMovementModal(true)} />}
        {view === "expenses" && <Expenses state={state} setState={setState} onExpense={() => setExpenseModal(true)} onDeleteExpense={(id) => setState((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== id) }))} />}
        {view === "taxes" && <TaxCenter state={state} metrics={metrics} setState={setState} />}
        {view === "data" && <DataSettings state={state} setState={setState} fileRef={fileRef} onImport={(e) => importState(e, setState)} />}
      </main>

      {productModal && <ProductModal product={selectedProduct} onSave={saveProduct} onClose={() => { setProductModal(false); setSelectedProduct(null); }} />}
      {movementModal && <MovementModal products={state.products} initialProduct={selectedProduct} settings={state.settings} onSave={recordMovement} onClose={() => { setMovementModal(false); setSelectedProduct(null); }} />}
      {expenseModal && <ExpenseModal onSave={(expense) => {
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
  const products = state.products.filter((p) => `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="panel tablePanel"><div className="toolbar"><label className="search"><span>{icons.search}</span><input aria-label="Search products" placeholder="Search products, SKU, or category" value={query} onChange={(e) => setQuery(e.target.value)} /></label><div className="legend"><span className="dot untaxed" /> Resale purchase — no tax paid</div></div>
    <div className="productTable"><div className="tableHead"><span>Product</span><span>On hand</span><span>Unit cost</span><span>Retail value</span><span>Tax status</span><span /></div>
    {products.map((p) => <div className="productRow" key={p.id}><div className="productCell"><div className="productGlyph">{p.name.slice(0, 1)}</div><div><strong>{p.name}</strong><span>{p.sku} · {p.category}</span></div></div><div><strong>{p.quantity}</strong><span className={p.quantity <= p.reorderPoint ? "lowText" : "mutedText"}>{p.quantity <= p.reorderPoint ? "Low stock" : `Min ${p.reorderPoint}`}</span></div><strong>{money.format(p.unitCost)}</strong><strong>{money.format(p.quantity * p.salePrice)}</strong><div>{p.salesTaxPaid ? <span className="pill neutral">Tax paid</span> : <span className="pill taxFree">Untaxed resale</span>}</div><div className="rowActions"><button onClick={() => onUse(p)} disabled={p.quantity < 1}>Use one</button><button onClick={() => onEdit(p)}>Edit</button><button className="dangerText" onClick={() => onDelete(p)}>Delete</button></div></div>)}
    {!products.length && <Empty text="No products match your search." />}</div></section>;
}

function Activity({ state, onNew }: { state: AppState; onNew: () => void }) { return <section className="panel tablePanel"><div className="panelTitle"><div><p className="eyebrow">Permanent stock trail</p><h3>Inventory ledger</h3></div><button className="primary" onClick={onNew}>+ Record activity</button></div><MovementTable movements={state.movements} products={state.products} /><p className="footnote">Activity entries remain in the ledger even if a product is later removed.</p></section>; }

function MovementTable({ movements, products }: { movements: Movement[]; products: Product[] }) { return <div className="ledger"><div className="ledgerHead"><span>Date</span><span>Product</span><span>Activity</span><span>Qty</span><span>Amount</span><span>Tax</span></div>{movements.map((m) => { const p = products.find((x) => x.id === m.productId); const amount = m.quantity * (m.type === "sale" ? m.unitPrice : m.unitCost); return <div className="ledgerRow" key={m.id}><span>{new Date(`${m.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span><div><strong>{p?.name ?? "Removed product"}</strong><small>{m.note || p?.sku}</small></div><span className={`activityTag ${m.type}`}>{m.type.replace("_", " ")}</span><strong>{m.type === "purchase" || (m.type === "adjustment" && m.quantity > 0) ? "+" : "−"}{Math.abs(m.quantity)}</strong><strong>{money.format(amount)}</strong><span className="taxLedger">{m.salesTax ? money.format(m.salesTax) : "—"}{(m.localTax ?? 0) > 0 && <small>{money.format(m.localTax ?? 0)} local</small>}</span></div>})}{!movements.length && <Empty text="No activity has been recorded yet." />}</div>; }

function Expenses({ state, setState, onExpense, onDeleteExpense }: { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onExpense: () => void; onDeleteExpense: (id: string) => void }) {
  const [expenseQuery, setExpenseQuery] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory | "All">("All");
  const [expenseYear, setExpenseYear] = useState<string>("All");
  const [expenseImport, setExpenseImport] = useState<ExpenseImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const expenseFileRef = useRef<HTMLInputElement>(null);
  const years = Array.from(new Set(state.expenses.map((expense) => Number(expense.date.slice(0, 4))))).filter(Number.isFinite).sort((a, b) => b - a);
  const selectedExpenses = state.expenses.filter((expense) => expenseYear === "All" || expense.date.startsWith(`${expenseYear}-`));
  const visibleExpenses = selectedExpenses.filter((expense) => {
    const matchesCategory = expenseCategory === "All" || expense.category === expenseCategory;
    const haystack = `${expense.vendor} ${expense.externalKey} ${expense.category} ${expense.note}`.toLowerCase();
    return matchesCategory && haystack.includes(expenseQuery.toLowerCase());
  });
  const categoryTotals = expenseCategories.map((category) => ({ category, total: selectedExpenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount, 0) })).filter((item) => item.total > 0).sort((a, b) => b.total - a.total);
  const expenseTotal = selectedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const cogsTotal = selectedExpenses.filter((expense) => expense.category === "Cost of goods").reduce((sum, expense) => sum + expense.amount, 0);
  const operatingTotal = expenseTotal - cogsTotal;
  const openExpenseImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setImporting(true);
    try { setExpenseImport(await parseExpenseImport(file, state.expenses)); }
    catch (caught) {
      const message = caught instanceof Error ? caught.message : "The file could not be read.";
      setExpenseImport({ fileName: file.name, ready: [], duplicates: [], invalid: [`${message} Use a CSV or JSON expense export.`], years: [], readyTotal: 0 });
    } finally { setImporting(false); }
  };
  const applyExpenseImport = () => {
    if (!expenseImport?.ready.length) return;
    const importedYears = expenseImport.years;
    setState((current) => {
      const keys = new Set(current.expenses.map((expense) => normalizeExpenseKey(expense.externalKey)));
      const additions: Expense[] = [];
      for (const draft of expenseImport.ready) {
        const key = normalizeExpenseKey(draft.externalKey);
        if (keys.has(key)) continue;
        keys.add(key); additions.push({ ...draft, id: uid() });
      }
      return { ...current, expenses: [...additions, ...current.expenses] };
    });
    setExpenseYear(importedYears.length === 1 ? String(importedYears[0]) : "All");
    setExpenseCategory("All");
    setExpenseQuery("");
    setExpenseImport(null);
  };
  return <div className="expenseLayout">
    <section className="expenseHero"><div><p className="eyebrow">Business spending</p><h2>Every expense, easy to find.</h2><p>Import purchase history or add a record by hand. StockBot keeps unique keys, categories, and tax-year totals organized.</p></div><div className="expenseHeroTotal"><span>{expenseYear === "All" ? "All recorded years" : expenseYear}</span><strong>{money.format(expenseTotal)}</strong><small>{selectedExpenses.length} unique records</small></div></section>
    <div className="taxCards expenseCards"><Metric label="Total expenses" value={money.format(expenseTotal)} note={expenseYear === "All" ? "Across every recorded year" : `Dated in ${expenseYear}`} accent="green" /><Metric label="Operating expenses" value={money.format(operatingTotal)} note="Excludes cost-of-goods records" accent="blue" /><Metric label="Additional COGS" value={money.format(cogsTotal)} note="Costs not already in product unit cost" accent="sand" /><Metric label="Unique records" value={whole.format(selectedExpenses.length)} note={`${years.length} year${years.length === 1 ? "" : "s"} represented`} accent="coral" /></div>
    <div className="taxColumns expenseColumns"><section className="panel expenseCategories"><div className="panelTitle"><div><p className="eyebrow">Expense summary</p><h3>Spending by category</h3></div><span className="pill neutral">{selectedExpenses.length} records</span></div><div className="categoryTotals">{categoryTotals.map((item) => <button className={expenseCategory === item.category ? "active" : ""} key={item.category} onClick={() => setExpenseCategory(item.category)}><span><strong>{item.category}</strong><small>{selectedExpenses.filter((expense) => expense.category === item.category).length} records</small></span><b>{money.format(item.total)}</b></button>)}{!categoryTotals.length && <Empty text="No expenses recorded for this period." />}</div><div className="expenseGrandTotal"><span>Total expense records</span><strong>{money.format(expenseTotal)}</strong></div></section>
    <section className="panel expenseGuide"><div className="panelTitle"><div><p className="eyebrow">Import guide</p><h3>Amazon Business exports</h3></div></div><p>StockBot groups multi-item rows into one expense per Amazon Order ID and uses Order Net Total, so the same order is not counted twice.</p><div className="importFacts"><span><strong>Unique key</strong><small>Amazon Order ID</small></span><span><strong>Expense amount</strong><small>Order Net Total</small></span><span><strong>Imported years</strong><small>Shown automatically after import</small></span></div></section></div>
    <section className="panel expenseLedger"><div className="panelTitle"><div><p className="eyebrow">Deduplicated records</p><h3>Expense ledger</h3></div><div className="expenseActions"><button className="secondary" onClick={downloadExpenseTemplate}>↓ CSV template</button><button className="secondary" disabled={importing} onClick={() => expenseFileRef.current?.click()}>{importing ? "Reading file…" : "↑ Import CSV or JSON"}</button><button className="primary" onClick={onExpense}>+ Add expense</button><input ref={expenseFileRef} hidden type="file" accept="text/csv,.csv,application/json,.json" onChange={openExpenseImport} /></div></div><p className="settingsCopy">Every record requires a unique external key—such as an Amazon order ID, invoice number, or bank transaction ID. The same key can never be imported twice.</p><div className="expenseToolbar"><label className="search"><span>{icons.search}</span><input aria-label="Search expenses" placeholder="Search vendor, order ID, category, or note" value={expenseQuery} onChange={(event) => setExpenseQuery(event.target.value)} /></label><label>Year<select aria-label="Expense year" value={expenseYear} onChange={(event) => setExpenseYear(event.target.value)}><option value="All">All years</option>{years.map((year) => <option value={year} key={year}>{year}</option>)}</select></label><label>Category<select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value as ExpenseCategory | "All")}><option>All</option>{expenseCategories.map((category) => <option key={category}>{category}</option>)}</select></label></div><div className="expenseTable"><div className="expenseHead"><span>Date</span><span>Vendor & description</span><span>Category</span><span>Unique key</span><span>Amount</span><span /></div>{visibleExpenses.map((expense) => <div className="expenseRow" key={expense.id}><span>{expense.date}</span><span><strong>{expense.vendor}</strong><small>{expense.note || (expense.source === "import" ? "Imported record" : "Manual record")}</small></span><span><b>{expense.category}</b></span><span><code>{expense.externalKey}</code><small>{expense.source}</small></span><strong>{money.format(expense.amount)}</strong><button aria-label={`Delete expense ${expense.externalKey}`} onClick={() => confirm(`Delete expense ${expense.externalKey}?`) && onDeleteExpense(expense.id)}>×</button></div>)}{!visibleExpenses.length && <Empty text="No expense records match this view." />}</div></section>
    <div className="disclaimer"><strong>Good records, calmer filing.</strong><span>The Tax center uses the selected tax year for its filing worksheet. This ledger shows all years unless you filter it.</span></div>
    {expenseImport && <Modal title="Review expense import" eyebrow="Duplicate-safe import" onClose={() => setExpenseImport(null)}><div className="importSummary"><article><span>Ready to import</span><strong>{expenseImport.ready.length}</strong></article><article><span>Duplicates skipped</span><strong>{expenseImport.duplicates.length}</strong></article><article><span>Invalid records</span><strong>{expenseImport.invalid.length}</strong></article></div><p className="settingsCopy"><strong>{expenseImport.fileName}</strong> was checked against saved records and against itself. {expenseImport.ready.length > 0 && <>The ready total is <strong>{money.format(expenseImport.readyTotal)}</strong>{expenseImport.years.length ? ` across ${expenseImport.years.join(", ")}` : ""}.</>}</p>{expenseImport.ready.length > 0 && <div className="importPreviewList">{expenseImport.ready.slice(0, 6).map((expense) => <div key={expense.externalKey}><span><strong>{expense.vendor}</strong><small>{expense.externalKey} · {expense.category} · {expense.date}</small></span><b>{money.format(expense.amount)}</b></div>)}{expenseImport.ready.length > 6 && <small>+ {expenseImport.ready.length - 6} more ready records</small>}</div>}{expenseImport.duplicates.length > 0 && <details className="importDetails"><summary>{expenseImport.duplicates.length} duplicate key{expenseImport.duplicates.length === 1 ? "" : "s"} skipped</summary><p>{expenseImport.duplicates.slice(0, 12).join(", ")}</p></details>}{expenseImport.invalid.length > 0 && <details className="importDetails"><summary>{expenseImport.invalid.length} invalid record{expenseImport.invalid.length === 1 ? "" : "s"} skipped</summary>{expenseImport.invalid.slice(0, 12).map((message) => <p key={message}>{message}</p>)}</details>}<div className="modalActions"><button type="button" className="secondary" onClick={() => setExpenseImport(null)}>Cancel</button><button type="button" className="primary" disabled={!expenseImport.ready.length} onClick={applyExpenseImport}>Import {expenseImport.ready.length} records</button></div></Modal>}
  </div>;
}

function TaxCenter({ state, metrics, setState }: { state: AppState; metrics: Metrics; setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const rows = [
    ["Gross sales", metrics.revenue, "Total product sales before sales tax"],
    ["Returns & allowances", 0, "No returns recorded"],
    ["Inventory-ledger COGS", metrics.inventoryCogs, "Unit cost captured when each sale was recorded"],
    ["Additional COGS records", metrics.additionalCogs, "Imported or manually entered costs not already in product unit cost"],
    ["Gross profit", metrics.grossProfit, "Gross sales minus both COGS sources"],
    ["Operating expenses", metrics.expenses, "Expense records outside cost of goods"],
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
      setSelected(applyIds);
      setPreview({ response: payload, items, auditId });
      setState((current) => ({ ...current, settings: { ...current.settings, taxUpdateHistory: [{ id: auditId, checkedAt: payload.checkedAt, appliedAt: null, checkedAddresses: relevantAddresses.length, availableUpdates: applyIds.length, appliedUpdates: 0, status: "checked", sources: payload.sources.filter((source) => source.status === "connected").map((source) => source.name) }, ...current.settings.taxUpdateHistory].slice(0, 50) } }));
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
  const updateOwnAddress = (field: keyof Address, value: string) => setState((current) => ({
    ...current,
    settings: { ...current.settings, ownAddress: { ...current.settings.ownAddress, [field]: value } },
  }));
  const ownResolvedRate = resolveAddressRate(state.settings.ownAddress, state.settings);
  const ownStateRate = ownResolvedRate.stateRate;
  const ownLocalRate = ownResolvedRate.localRate;
  const ownRate = ownResolvedRate.totalRate;
  const enabledCount = Object.values(state.settings.stateTaxes).filter((setting) => setting.enabled).length;
  return <div className="settingsGrid">
    <section className="panel"><p className="eyebrow">Business profile</p><h3>Calculation settings</h3><div className="formGrid"><label className="wide">Business name<input value={state.settings.businessName} onChange={(e) => setState((s) => ({ ...s, settings: { ...s.settings, businessName: e.target.value } }))} /></label><label>Beginning inventory<input type="number" step="0.01" value={state.settings.beginningInventory} onChange={(e) => setState((s) => ({ ...s, settings: { ...s.settings, beginningInventory: Number(e.target.value) } }))} /></label></div></section>
    <section className="panel"><p className="eyebrow">Personal-use location</p><h3>Your address sets use tax</h3><p className="settingsCopy">When untaxed resale inventory becomes personal use, StockBot applies {ownStateRate}% state tax{ownLocalRate ? ` + ${ownLocalRate}% local tax${ownResolvedRate.jurisdiction ? ` for ${ownResolvedRate.jurisdiction}` : ""}` : ""}, for a {ownRate}% combined rate.</p><div className="formGrid"><label className="wide">Street address<input value={state.settings.ownAddress.line1} onChange={(e) => updateOwnAddress("line1", e.target.value)} placeholder="123 Main Street" /></label><label>City<input value={state.settings.ownAddress.city} onChange={(e) => updateOwnAddress("city", e.target.value)} /></label><label>State<select value={state.settings.ownAddress.state} onChange={(e) => updateOwnAddress("state", e.target.value)}>{stateTaxDefaults.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label><label>ZIP code<input value={state.settings.ownAddress.postalCode} onChange={(e) => updateOwnAddress("postalCode", e.target.value)} inputMode="numeric" /></label></div></section>
    <section className="panel stateTaxPanel"><div className="panelTitle"><div><p className="eyebrow">Destination sales tax</p><h3>States where you collect</h3></div><span className="pill good">{enabledCount} enabled</span></div><p className="settingsCopy">Check only states where you are registered and required to collect. A customer&apos;s delivery state selects the statewide base rate below; matching local rules are added separately.</p><div className="stateTaxGrid">{stateTaxDefaults.map((item) => { const setting = state.settings.stateTaxes[item.code] ?? { enabled: false, rate: item.rate }; return <div className={setting.enabled ? "stateTaxRow enabled" : "stateTaxRow"} key={item.code}><label className="stateCheck"><input type="checkbox" checked={setting.enabled} onChange={(e) => setState((current) => ({ ...current, settings: { ...current.settings, stateTaxes: { ...current.settings.stateTaxes, [item.code]: { ...setting, enabled: e.target.checked } } } }))} /><span><strong>{item.name}</strong><small>{item.code}{setting.manualOverride ? " · manual rate" : setting.sourceName ? ` · ${setting.sourceName}` : item.hasLocalTax ? " · local tax may apply" : " · statewide rate"}</small></span></label><label className="rateInput"><input aria-label={`${item.name} sales tax rate`} type="number" min="0" step="0.001" value={setting.rate} onChange={(e) => setState((current) => ({ ...current, settings: { ...current.settings, stateTaxes: { ...current.settings.stateTaxes, [item.code]: { ...setting, rate: Number(e.target.value), manualOverride: true, sourceName: undefined, sourceUrl: undefined, checkedAt: undefined, effectiveDate: undefined } } } }))} /><span>%</span></label></div>; })}</div><div className="rateNote"><strong>Manual protection</strong><span>Editing a state rate marks it as a manual override. Official updates will show the difference but will not replace it.</span></div></section>
    <LocalTaxRulesPanel rules={state.settings.localTaxRules} onChange={(localTaxRules) => setState((current) => ({ ...current, settings: { ...current.settings, localTaxRules } }))} />
    <section className="panel backupCard"><p className="eyebrow">Portable backups</p><h3>Your data, in your hands.</h3><p>Export a complete JSON backup whenever you like. Importing replaces the current workspace after validation.</p><div><button className="primary" onClick={() => exportState(state)}>{icons.download} Export backup</button><button className="secondary" onClick={() => fileRef.current?.click()}>{icons.upload} Import backup</button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={onImport} /></div></section>
    <section className="panel privacyCard"><div className="lock">⌂</div><div><h3>Local by design</h3><p>Inventory is stored in this server&apos;s local database. Nothing is sent to an outside inventory service.</p></div></section>
    <section className="panel dangerZone"><p className="eyebrow">Fresh start</p><h3>Reset demo workspace</h3><p>Replace all current data with the original sample products and activity.</p><button className="danger" onClick={() => confirm("Replace all current inventory data with the demo workspace?") && setState(seed)}>Reset all data</button></section>
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
  const [draft, setDraft] = useState({ sku: product?.sku ?? "", name: product?.name ?? "", category: product?.category ?? "", quantity: product?.quantity ?? 0, unitCost: product?.unitCost ?? 0, salePrice: product?.salePrice ?? 0, reorderPoint: product?.reorderPoint ?? 5, salesTaxPaid: product?.salesTaxPaid ?? false });
  return <Modal title={product ? "Edit product" : "Add a product"} eyebrow="Inventory item" onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); onSave(draft); }}><div className="formGrid"><label className="wide">Product name<input required autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Speckled ceramic mug" /></label><label>SKU<input required value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value.toUpperCase() })} placeholder="MUG-101" /></label><label>Category<input required value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Home" /></label><label>Quantity on hand<input required min="0" type="number" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} /></label><label>Reorder point<input required min="0" type="number" value={draft.reorderPoint} onChange={(e) => setDraft({ ...draft, reorderPoint: Number(e.target.value) })} /></label><label>Unit cost<input required min="0" step="0.01" type="number" value={draft.unitCost} onChange={(e) => setDraft({ ...draft, unitCost: Number(e.target.value) })} /></label><label>Sale price<input required min="0" step="0.01" type="number" value={draft.salePrice} onChange={(e) => setDraft({ ...draft, salePrice: Number(e.target.value) })} /></label><label className="wide checkLabel"><input type="checkbox" checked={draft.salesTaxPaid} onChange={(e) => setDraft({ ...draft, salesTaxPaid: e.target.checked })} /><span><strong>Sales tax was paid when purchased</strong><small>Leave unchecked for inventory bought tax-free for resale. Personal-use tax comes from your address in settings.</small></span></label></div><ModalActions onClose={onClose} label={product ? "Save changes" : "Add product"} /></form></Modal>;
}

function MovementModal({ products, initialProduct, settings, onSave, onClose }: { products: Product[]; initialProduct: Product | null; settings: Settings; onSave: (m: Omit<Movement, "id">) => void; onClose: () => void }) {
  const first = initialProduct ?? products[0];
  const [draft, setDraft] = useState({ productId: first?.id ?? "", type: initialProduct ? "personal_use" as MovementType : "sale" as MovementType, quantity: 1, date: dateOnly(), note: "", customerAddress: blankAddress(settings.ownAddress.state) });
  const [liveRate, setLiveRate] = useState<TaxRateLookup | null>(null);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "checking" | "error">("idle");
  const [lookupMessage, setLookupMessage] = useState("");
  const product = products.find((p) => p.id === draft.productId);
  const isOut = draft.type === "sale" || draft.type === "personal_use";
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
    const customerAddress = draft.type === "sale" ? draft.customerAddress : undefined;
    onSave({ ...draft, customerAddress, unitCost: product.unitCost, unitPrice: product.salePrice, salesTax: tax, stateTax, localTax, taxRate: appliedRate, stateTaxRate: stateRate, localTaxRate: localRate, taxJurisdiction: draft.type === "personal_use" ? settings.ownAddress.state : draft.type === "sale" ? draft.customerAddress.state : undefined, localJurisdiction: selectedRate.jurisdiction, taxCollected: draft.type === "sale" ? customerSetting.enabled : false });
  };
  return <Modal title={draft.type === "personal_use" ? "Mark inventory as used" : "Record inventory activity"} eyebrow="Stock ledger" onClose={onClose}><form onSubmit={submit}><div className="formGrid"><label className="wide">Product<select required value={draft.productId} onChange={(e) => setDraft({ ...draft, productId: e.target.value })}>{products.map((p) => <option value={p.id} key={p.id}>{p.name} · {p.quantity} on hand</option>)}</select></label><label>Activity<select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as MovementType })}><option value="sale">Customer sale</option><option value="purchase">Stock purchase</option><option value="personal_use">Personal use</option><option value="adjustment">Count adjustment (+/−)</option></select></label><label>Quantity<input required type="number" min={draft.type === "adjustment" ? undefined : 1} value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} /></label><label>Date<input required type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label>{draft.type === "sale" && <><div className="addressHeading wide"><span>Customer delivery address</span><small>Destination state, city, and ZIP select your configured tax layers.</small></div><label className="wide">Street address<input required value={draft.customerAddress.line1} onChange={(e) => updateCustomerAddress("line1", e.target.value)} placeholder="Customer delivery address" /></label><label>City<input required value={draft.customerAddress.city} onChange={(e) => updateCustomerAddress("city", e.target.value)} /></label><label>State<select required value={draft.customerAddress.state} onChange={(e) => updateCustomerAddress("state", e.target.value)}>{stateTaxDefaults.map((item) => <option value={item.code} key={item.code}>{item.name}</option>)}</select></label><label>ZIP code<input required inputMode="numeric" value={draft.customerAddress.postalCode} onChange={(e) => updateCustomerAddress("postalCode", e.target.value)} /></label>{customerSetting.enabled && <div className="lookupRow wide"><button type="button" className="secondary" onClick={lookupCustomerRate} disabled={lookupStatus === "checking"}>{lookupStatus === "checking" ? "Checking official source…" : "↻ Look up exact address rate"}</button><span className={lookupStatus === "error" ? "lookupError" : ""}>{lookupMessage || (findAddressTaxRate(draft.customerAddress, settings.addressTaxRates) ? "Using the last saved address update." : "Optional, but recommended before recording the sale.")}</span></div>}</>}<label className="wide">Note<input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Optional detail" /></label></div>{draft.type === "sale" && <div className={customerSetting.enabled ? "taxPreview layered" : "taxPreview off"}><span><strong>{customerSetting.enabled ? `Collecting ${appliedRate}% combined tax` : `Not collecting tax in ${stateName(draft.customerAddress.state)}`}</strong><small>{customerSetting.enabled ? `${stateName(draft.customerAddress.state)} ${stateRate}% (${money.format(stateTax)})${localRate ? ` + ${selectedRate.jurisdiction || "local"} ${localRate}% (${money.format(localTax)})` : " + no local rate found"}${selectedRate.sourceName ? ` · ${selectedRate.sourceName}` : ""}` : "This state is not checked in Data & settings."}</small></span><b>{money.format(tax)}</b></div>}{draft.type === "personal_use" && <div className="taxPreview layered"><span><strong>{product?.salesTaxPaid ? "No additional use tax" : `Use tax for your ${stateName(settings.ownAddress.state)} address`}</strong><small>{product?.salesTaxPaid ? "Sales tax was already paid on this product." : `${stateRate}% state (${money.format(stateTax)})${localRate ? ` + ${selectedRate.jurisdiction || "local"} ${localRate}% (${money.format(localTax)})` : " + no local rate found"}${selectedRate.sourceName ? ` · ${selectedRate.sourceName}` : ""}`}</small></span><b>{money.format(tax)}</b></div>}<ModalActions onClose={onClose} label="Record activity" /></form></Modal>;
}

function ExpenseModal({ onSave, onClose }: { onSave: (expense: ExpenseDraft) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<ExpenseDraft>({ externalKey: "", vendor: "", category: "Office supplies", amount: 0, date: dateOnly(), note: "", source: "manual" });
  return <Modal title="Add a business expense" eyebrow="Expense ledger" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave({ ...draft, externalKey: draft.externalKey.trim(), vendor: draft.vendor.trim(), note: draft.note.trim() }); }}><div className="formGrid"><label className="wide">Unique record key<input autoFocus required value={draft.externalKey} onChange={(event) => setDraft({ ...draft, externalKey: event.target.value })} placeholder="Amazon order ID, invoice ID, or transaction ID" /><small>StockBot blocks any future record with this same key.</small></label><label className="wide">Vendor or merchant<input required value={draft.vendor} onChange={(event) => setDraft({ ...draft, vendor: event.target.value })} placeholder="Amazon, electric company, landlord…" /></label><label>Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as ExpenseCategory })}>{expenseCategories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Amount<input required min="0.01" step="0.01" type="number" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })} /></label><label>Date<input required type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label><label className="wide">Description or memo<input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="What the purchase was for" /></label>{draft.category === "Cost of goods" && <div className="formNotice wide"><strong>Avoid counting the same cost twice.</strong><span>Use this category only when the amount is not already included in a product&apos;s unit cost.</span></div>}</div><ModalActions onClose={onClose} label="Add expense" /></form></Modal>;
}

function Modal({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) { return <div className="modalBackdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><button className="modalClose" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{children}</section></div>; }
function ModalActions({ onClose, label }: { onClose: () => void; label: string }) { return <div className="modalActions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" type="submit">{label}</button></div>; }
function Empty({ text }: { text: string }) { return <div className="empty">{text}</div>; }

function downloadExpenseTemplate() { const csv = "external_key,vendor,date,amount,category,note\nAMAZON-ORDER-ID,Amazon,2026-01-15,49.95,Office supplies,Printer paper\n"; const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "stockbot-expense-import-template.csv"; anchor.click(); URL.revokeObjectURL(url); }
function exportState(state: AppState) { const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `stockbot-backup-${dateOnly()}.json`; a.click(); URL.revokeObjectURL(url); }
function importState(event: ChangeEvent<HTMLInputElement>, setState: React.Dispatch<React.SetStateAction<AppState>>) { const file = event.target.files?.[0]; if (!file) return; file.text().then((text) => { const parsed: unknown = JSON.parse(text); const normalized = normalizeState(parsed); if (!Array.isArray((parsed as Partial<AppState>)?.products) || !Array.isArray((parsed as Partial<AppState>)?.movements) || !Array.isArray((parsed as Partial<AppState>)?.expenses)) throw new Error(); if (confirm(`Import ${normalized.products.length} products and replace the current workspace?`)) setState(normalized); }).catch(() => alert("That file is not a valid StockBot backup.")); event.target.value = ""; }

function normalizeState(raw: unknown): AppState {
  if (!raw || typeof raw !== "object") return seed;
  const incoming = raw as Partial<AppState> & { settings?: Partial<Settings> & { defaultTaxRate?: number } };
  const ownAddress = { ...blankAddress("CA"), ...(incoming.settings?.ownAddress ?? {}) };
  const savedTaxes = incoming.settings?.stateTaxes ?? {};
  const legacyRate = incoming.settings?.defaultTaxRate;
  const stateTaxes = { ...defaultStateTaxSettings(ownAddress.state), ...savedTaxes };
  if (legacyRate !== undefined && !incoming.settings?.stateTaxes) stateTaxes[ownAddress.state] = { enabled: true, rate: legacyRate };
  const seenExpenseKeys = new Set<string>();
  const expenses = (Array.isArray(incoming.expenses) ? incoming.expenses : seed.expenses).map((expense, index): Expense => ({
    id: expense.id || `legacy-expense-${index + 1}`,
    externalKey: String(expense.externalKey || `legacy:${expense.id || index + 1}`).trim(),
    vendor: String(expense.vendor || "Unknown vendor").trim(),
    category: normalizeExpenseCategory(expense.category),
    amount: Number(expense.amount) || 0,
    date: normalizeExpenseDate(expense.date) || dateOnly(),
    note: String(expense.note || "").trim(),
    source: expense.source === "import" ? "import" : "manual",
    importedAt: expense.importedAt,
  })).filter((expense) => {
    const key = normalizeExpenseKey(expense.externalKey);
    if (!key || seenExpenseKeys.has(key)) return false;
    seenExpenseKeys.add(key); return true;
  });
  return {
    version: 5,
    products: Array.isArray(incoming.products) ? incoming.products : seed.products,
    movements: Array.isArray(incoming.movements) ? incoming.movements : seed.movements,
    expenses,
    settings: {
      businessName: incoming.settings?.businessName ?? seed.settings.businessName,
      taxYear: incoming.settings?.taxYear ?? nowYear,
      beginningInventory: incoming.settings?.beginningInventory ?? 0,
      ownAddress,
      stateTaxes,
      localTaxRules: Array.isArray(incoming.settings?.localTaxRules) ? incoming.settings.localTaxRules.map((rule) => ({ ...rule, manualOverride: rule.manualOverride ?? true })) : [],
      addressTaxRates: Array.isArray(incoming.settings?.addressTaxRates) ? incoming.settings.addressTaxRates : [],
      taxUpdateHistory: Array.isArray(incoming.settings?.taxUpdateHistory) ? incoming.settings.taxUpdateHistory : [],
    },
  };
}
