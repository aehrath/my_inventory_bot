import { loadInventoryState, saveInventoryState } from "../../../db/inventory-repository";

type InventoryRecord = Record<string, unknown>;

type InventoryState = {
  version?: number;
  products?: InventoryRecord[];
  movements?: InventoryRecord[];
  expenses?: InventoryRecord[];
  customers?: InventoryRecord[];
  settings?: InventoryRecord;
};

const normalizedKey = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");

function validateState(state: InventoryState) {
  if (!state || typeof state !== "object" || !Array.isArray(state.products) || !Array.isArray(state.movements)) {
    return { error: "This is not a valid inventory backup.", status: 400 };
  }
  if (!Array.isArray(state.expenses)) return { error: "Expense records are missing.", status: 400 };
  if (!Array.isArray(state.customers)) return { error: "Customer records are missing.", status: 400 };
  if (!state.settings || typeof state.settings !== "object") return { error: "Inventory settings are missing.", status: 400 };

  const expenseKeys = new Set<string>();
  for (const expense of state.expenses) {
    const key = normalizedKey(expense?.externalKey);
    if (!key) return { error: "Every expense needs a unique external key.", status: 400 };
    if (expenseKeys.has(key)) return { error: `Duplicate expense key: ${expense.externalKey}`, status: 409 };
    expenseKeys.add(key);
  }

  const customerKeys = new Set<string>();
  for (const customer of state.customers) {
    const key = normalizedKey(customer?.externalKey);
    if (!key) return { error: "Every customer needs a unique external key.", status: 400 };
    if (customerKeys.has(key)) return { error: `Duplicate customer key: ${customer.externalKey}`, status: 409 };
    customerKeys.add(key);
  }

  const productSkus = new Set<string>();
  for (const product of state.products) {
    const sku = normalizedKey(product?.sku);
    if (!sku) return { error: "Every product needs a SKU.", status: 400 };
    if (productSkus.has(sku)) return { error: `Duplicate product SKU: ${product.sku}`, status: 409 };
    productSkus.add(sku);
  }

  const invoiceLineKeys = new Set<string>();
  for (const movement of state.movements) {
    const key = normalizedKey(movement?.sourceKey);
    if (!key) continue;
    if (invoiceLineKeys.has(key)) return { error: `Duplicate imported invoice line: ${movement.sourceKey}`, status: 409 };
    invoiceLineKeys.add(key);
  }
  return null;
}

export async function GET() {
  try {
    return Response.json(await loadInventoryState());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load inventory." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const state = await request.json() as InventoryState;
    const invalid = validateState(state);
    if (invalid) return Response.json({ error: invalid.error }, { status: invalid.status });
    const result = await saveInventoryState(state as Required<InventoryState>);
    return Response.json({ ok: true, storage: "d1-relational", ...result });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not save inventory." }, { status: 500 });
  }
}
