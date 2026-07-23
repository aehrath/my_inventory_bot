import { env } from "cloudflare:workers";
import { inventorySchemaSql } from "../../../db/schema";

type D1Result = { payload?: string; updated_at?: string };

async function ensureTable() {
  if (!env.DB) throw new Error("Local database is unavailable.");
  await env.DB.prepare(inventorySchemaSql).run();
  return env.DB;
}

export async function GET() {
  try {
    const db = await ensureTable();
    const row = await db
      .prepare("SELECT payload, updated_at FROM inventory_state WHERE id = 1")
      .first() as D1Result | null;
    return Response.json({ state: row?.payload ? JSON.parse(row.payload) : null, updatedAt: row?.updated_at ?? null });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load inventory." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const state = await request.json();
    if (!state || typeof state !== "object" || !Array.isArray(state.products) || !Array.isArray(state.movements)) {
      return Response.json({ error: "This is not a valid inventory backup." }, { status: 400 });
    }
    if (!Array.isArray(state.expenses)) {
      return Response.json({ error: "Expense records are missing." }, { status: 400 });
    }
    if (!Array.isArray(state.customers)) {
      return Response.json({ error: "Customer records are missing." }, { status: 400 });
    }
    const expenseKeys = new Set<string>();
    for (const expense of state.expenses) {
      const key = String(expense?.externalKey ?? "").trim().toLowerCase().replace(/\s+/g, "");
      if (!key) return Response.json({ error: "Every expense needs a unique external key." }, { status: 400 });
      if (expenseKeys.has(key)) return Response.json({ error: `Duplicate expense key: ${expense.externalKey}` }, { status: 409 });
      expenseKeys.add(key);
    }
    const customerKeys = new Set<string>();
    for (const customer of state.customers) {
      const key = String(customer?.externalKey ?? "").trim().toLowerCase().replace(/\s+/g, "");
      if (!key) return Response.json({ error: "Every customer needs a unique external key." }, { status: 400 });
      if (customerKeys.has(key)) return Response.json({ error: `Duplicate customer key: ${customer.externalKey}` }, { status: 409 });
      customerKeys.add(key);
    }
    const invoiceLineKeys = new Set<string>();
    for (const movement of state.movements) {
      const key = String(movement?.sourceKey ?? "").trim().toLowerCase().replace(/\s+/g, "");
      if (!key) continue;
      if (invoiceLineKeys.has(key)) return Response.json({ error: `Duplicate imported invoice line: ${movement.sourceKey}` }, { status: 409 });
      invoiceLineKeys.add(key);
    }
    const db = await ensureTable();
    const updatedAt = new Date().toISOString();
    await db.prepare(`
      INSERT INTO inventory_state (id, payload, updated_at) VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
    `).bind(JSON.stringify(state), updatedAt).run();
    return Response.json({ ok: true, updatedAt });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not save inventory." }, { status: 500 });
  }
}
