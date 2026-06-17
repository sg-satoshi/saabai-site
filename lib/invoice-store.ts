/**
 * Invoice storage — Redis-backed invoice and client management.
 * Mirrors the mylife.saabai.ai invoicing tool but synced server-side.
 */
import { getRedis } from "./redis";

// ── Types ───────────────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  type?: "hourly" | "fixed";
  description: string;
  hours?: number;
  rate?: number;
  total: number;
  notes?: string;
}

export interface Invoice {
  id: string;
  number: string;
  date: string; // YYYY-MM-DD
  clientId: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  gst: number;
  total: number;
  status: "unpaid" | "paid" | "overdue";
  paidDate?: string;
  bankRef?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceClient {
  id: string;
  name: string;
  address?: string;
  email?: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

export const MY_INFO = {
  name: "Shane Goldberg",
  abn: "71 889 082 572",
  address: "4302/31 Bourton Road, Merrimac QLD 4226",
  phone: "0415 622 733",
  email: "hello@saabai.ai",
  website: "www.saabai.ai",
};

export const PAY_INFO = {
  accountName: "Shane Goldberg",
  bsb: "084899",
  accountNumber: "726851250",
};

const INV_PREFIX = "admin:invoices:";
const CLI_PREFIX = "admin:invoice-clients:";
const INV_INDEX = "admin:invoices:index";
const CLI_INDEX = "admin:invoice-clients:index";

const DEFAULT_CLIENTS: InvoiceClient[] = [
  { id: "cl_default_hp", name: "Holland Plastics", address: "13 Distribution Ave, Molendinar QLD 4214" },
];

const LINE_TEMPLATES = [
  { description: "Consulting / Contracted Hours", rate: 40 },
  { description: "AI Strategic Development & Implementation", rate: 45 },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function calcLineTotal(item: InvoiceLineItem): number {
  if (item.type === "fixed") return item.total || 0;
  return parseFloat(((item.hours || 0) * (item.rate || 0)).toFixed(2));
}

export function calcInvoiceTotals(items: InvoiceLineItem[]): { subtotal: number; gst: number; total: number } {
  const subtotal = items.reduce((s, li) => s + calcLineTotal(li), 0);
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    gst: 0,
    total: parseFloat(subtotal.toFixed(2)),
  };
}

export function nextInvoiceNumber(invoices: Invoice[]): string {
  const nums = invoices.map(inv => {
    const m = inv.number.match(/SG-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const max = nums.length ? Math.max(...nums) : 14;
  return "SG-" + String(max + 1).padStart(3, "0");
}

// ── Client operations ───────────────────────────────────────────────────────

export async function listClients(): Promise<InvoiceClient[]> {
  const redis = getRedis();
  if (!redis) return DEFAULT_CLIENTS;

  const ids = await redis.smembers(CLI_INDEX);
  if (!ids || ids.length === 0) {
    // Seed defaults
    for (const c of DEFAULT_CLIENTS) {
      await redis.set(CLI_PREFIX + c.id, c);
      await redis.sadd(CLI_INDEX, c.id);
    }
    return DEFAULT_CLIENTS;
  }

  const results = await Promise.all(ids.map(id => redis.get<InvoiceClient>(CLI_PREFIX + id)));
  return results.filter(Boolean) as InvoiceClient[];
}

export async function createClient(data: { name: string; address?: string }): Promise<InvoiceClient> {
  const client: InvoiceClient = { id: "cl_" + uid(), name: data.name, address: data.address };
  const redis = getRedis();
  if (redis) {
    await redis.set(CLI_PREFIX + client.id, client);
    await redis.sadd(CLI_INDEX, client.id);
  }
  return client;
}

// ── Invoice operations ──────────────────────────────────────────────────────

export async function listInvoices(): Promise<Invoice[]> {
  const redis = getRedis();
  if (!redis) return [];

  const ids = await redis.smembers(INV_INDEX);
  if (!ids || ids.length === 0) return [];

  const results = await Promise.all(ids.map(id => redis.get<Invoice>(INV_PREFIX + id)));
  return results.filter(Boolean) as Invoice[];
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const redis = getRedis();
  if (!redis) return null;
  return redis.get(INV_PREFIX + id);
}

export async function createInvoice(data: {
  number?: string;
  date: string;
  clientId: string;
  lineItems: InvoiceLineItem[];
  notes?: string;
  status?: "unpaid" | "paid" | "overdue";
  paidDate?: string;
  bankRef?: string;
}): Promise<Invoice> {
  const existing = await listInvoices();
  const totals = calcInvoiceTotals(data.lineItems);

  const invoice: Invoice = {
    id: "inv_" + uid(),
    number: data.number || nextInvoiceNumber(existing),
    date: data.date,
    clientId: data.clientId,
    lineItems: data.lineItems,
    ...totals,
    status: data.status || "unpaid",
    paidDate: data.paidDate,
    bankRef: data.bankRef,
    notes: data.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const redis = getRedis();
  if (redis) {
    await redis.set(INV_PREFIX + invoice.id, invoice);
    await redis.sadd(INV_INDEX, invoice.id);
  }
  return invoice;
}

export async function updateInvoice(
  id: string,
  data: Partial<Omit<Invoice, "id" | "createdAt">>
): Promise<Invoice | null> {
  const existing = await getInvoice(id);
  if (!existing) return null;

  const lineItems = data.lineItems || existing.lineItems;
  const totals = calcInvoiceTotals(lineItems);

  const updated: Invoice = {
    ...existing,
    ...data,
    lineItems,
    ...(data.lineItems ? totals : {}),
    updatedAt: new Date().toISOString(),
  };

  const redis = getRedis();
  if (redis) {
    await redis.set(INV_PREFIX + id, updated);
  }
  return updated;
}

export async function deleteInvoice(id: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  await redis.del(INV_PREFIX + id);
  await redis.srem(INV_INDEX, id);
  return true;
}

export async function cycleInvoiceStatus(id: string): Promise<Invoice | null> {
  const inv = await getInvoice(id);
  if (!inv) return null;

  const cycle: Record<string, "unpaid" | "paid" | "overdue"> = {
    unpaid: "paid",
    paid: "overdue",
    overdue: "unpaid",
  };

  return updateInvoice(id, {
    status: cycle[inv.status] || "unpaid",
    paidDate: cycle[inv.status] === "paid" ? new Date().toISOString().split("T")[0] : undefined,
  });
}

export { LINE_TEMPLATES };
