/**
 * Accounts-receivable join layer (P0, read-only).
 *
 * Bridges two separate namespaces:
 *   - Unified customer directory (lib/customers.ts)       — source-scoped ids
 *   - Consulting invoice ledger (lib/invoice-store.ts)     — invoice clients + SG-NNN invoices
 *
 * The join is COMPUTED at request time (email → name → none), never persisted,
 * so it stays read-only and can't drift. No new Redis keys.
 *
 * Money units: directory revenue/mrr are CENTS. Invoice subtotal/total are DOLLARS
 * (line rates are $40–$45/hr). invoiceAmountToCents() is the ONLY conversion point.
 */
import { listInvoices, listClients, type Invoice, type InvoiceClient } from "./invoice-store";
import type { UnifiedCustomer } from "./customers";

/** Dollars → cents. Invoice totals are AUD dollars (2dp); directory values are cents. */
export function invoiceAmountToCents(amount: number): number {
  return Math.round(amount * 100);
}

export interface ReceivablesSummary {
  invoiceCount: number;
  unpaidCount: number;
  overdueCount: number;
  outstandingCents: number; // unpaid + overdue
  overdueCents: number; // only overdue portion
  paidCents: number;
  lastInvoiceNumber?: string;
  lastInvoiceDate?: string; // YYYY-MM-DD
}

export interface ReceivablesMatch {
  method: "email" | "name" | "none";
  customer: UnifiedCustomer | null;
  also: UnifiedCustomer[]; // additional dir matches (same email across sources), only if length > 1
}

export interface ReceivablesRow {
  invoiceClient: InvoiceClient;
  match: ReceivablesMatch;
  receivables: ReceivablesSummary;
  invoices: Array<Pick<Invoice, "id" | "number" | "date" | "status" | "total" | "paidDate">>;
}

export interface ReceivablesTotals {
  outstandingCents: number;
  overdueCents: number;
  unpaidCount: number;
  overdueCount: number;
}

const ZERO_SUMMARY: ReceivablesSummary = {
  invoiceCount: 0,
  unpaidCount: 0,
  overdueCount: 0,
  outstandingCents: 0,
  overdueCents: 0,
  paidCents: 0,
};

function normEmail(s: string): string {
  return (s || "").trim().toLowerCase();
}

function normName(s: string): string {
  return (s || "").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Build a full AR summary for one invoice client from ALL of its invoices. */
function summarize(invoicesForClient: Invoice[]): ReceivablesSummary {
  if (invoicesForClient.length === 0) return { ...ZERO_SUMMARY };

  let unpaidCount = 0;
  let overdueCount = 0;
  let outstandingCents = 0;
  let overdueCents = 0;
  let paidCents = 0;
  let lastDate: string | undefined;

  for (const inv of invoicesForClient) {
    const cents = invoiceAmountToCents(inv.total);
    if (inv.status === "paid") {
      paidCents += cents;
    } else {
      outstandingCents += cents;
      if (inv.status === "overdue") {
        overdueCount++;
        overdueCents += cents;
      } else {
        unpaidCount++;
      }
    }
    if (!lastDate || inv.date > lastDate) lastDate = inv.date;
  }

  const latest = invoicesForClient.reduce((a, b) => (a.date < b.date ? b : a));
  return {
    invoiceCount: invoicesForClient.length,
    unpaidCount,
    overdueCount,
    outstandingCents,
    overdueCents,
    paidCents,
    lastInvoiceNumber: latest.number,
    lastInvoiceDate: lastDate,
  };
}

/** Match an invoice client to directory customers: email → name → none. */
function matchClient(client: InvoiceClient, customers: UnifiedCustomer[]): ReceivablesMatch {
  const cEmail = normEmail(client.email ?? "");
  if (cEmail) {
    const emailHits = customers.filter((c) => normEmail(c.email) === cEmail);
    if (emailHits.length > 0) {
      const [first, ...rest] = emailHits;
      return { method: "email", customer: first, also: rest.length > 1 ? rest : [] };
    }
  }

  const cName = normName(client.name ?? "");
  if (cName.length >= 4) {
    const nameHits = customers.filter((c) => normName(c.name) === cName);
    if (nameHits.length > 0) {
      const [first, ...rest] = nameHits;
      return { method: "name", customer: first, also: rest.length > 1 ? rest : [] };
    }
  }

  return { method: "none", customer: null, also: [] };
}

/** Index invoices by clientId. */
function indexInvoicesByClient(invoices: Invoice[]): Map<string, Invoice[]> {
  const map = new Map<string, Invoice[]>();
  for (const inv of invoices) {
    const list = map.get(inv.clientId) ?? [];
    list.push(inv);
    map.set(inv.clientId, list);
  }
  return map;
}

/** Find the invoice client for a given directory customer (email → name → null). */
function findClientByMatch(customer: UnifiedCustomer, clients: InvoiceClient[]): InvoiceClient | null {
  const cEmail = normEmail(customer.email);
  if (cEmail) {
    const byEmail = clients.find((cl) => normEmail(cl.email ?? "") === cEmail);
    if (byEmail) return byEmail;
  }
  const cName = normName(customer.name);
  if (cName.length >= 4) {
    const byName = clients.find((cl) => normName(cl.name ?? "") === cName);
    if (byName) return byName;
  }
  return null;
}

/**
 * Augment a customer directory with receivables from the invoice ledger.
 * Directory-only customers get a zero summary so "missing" is never confused
 * with "owes nothing".
 */
export function attachReceivables(
  customers: UnifiedCustomer[],
  clients: InvoiceClient[],
  invoices: Invoice[]
): Array<UnifiedCustomer & { receivables: ReceivablesSummary; invoiceClientId?: string }> {
  const byClient = indexInvoicesByClient(invoices);
  const summaryByClientId = new Map<string, ReceivablesSummary>();
  for (const cl of clients) {
    summaryByClientId.set(cl.id, summarize(byClient.get(cl.id) ?? []));
  }

  return customers.map((c) => {
    const invoiceClient = findClientByMatch(c, clients);
    if (invoiceClient) {
      return {
        ...c,
        receivables: summaryByClientId.get(invoiceClient.id) ?? { ...ZERO_SUMMARY },
        invoiceClientId: invoiceClient.id,
      };
    }
    return { ...c, receivables: { ...ZERO_SUMMARY } };
  });
}

/**
 * Every invoice client with its AR summary (including zero-invoice clients).
 * Unlike queryReceivables, this returns ALL clients — used by the
 * "list invoice clients" tool so a client with no invoices still appears
 * with a zero summary rather than being dropped.
 */
export function clientsWithReceivables(
  clients: InvoiceClient[],
  invoices: Invoice[]
): Array<InvoiceClient & { receivables: ReceivablesSummary }> {
  const byClient = indexInvoicesByClient(invoices);
  return clients.map((cl) => ({ ...cl, receivables: summarize(byClient.get(cl.id) ?? []) }));
}

export interface QueryReceivablesInput {
  query?: string;
  status?: "unpaid" | "overdue" | "paid" | "any";
  unmatchedOnly?: boolean;
  limit?: number;
}

/**
 * Cross-business AR query. Answers "who has unpaid invoices" and "what does X owe".
 * status default "unpaid" = clients holding outstanding (unpaid or overdue) invoices.
 */
export function queryReceivables(
  input: QueryReceivablesInput,
  customers: UnifiedCustomer[],
  clients: InvoiceClient[],
  invoices: Invoice[]
): { rows: ReceivablesRow[]; totals: ReceivablesTotals } {
  const status = input.status ?? "unpaid";
  const limit = input.limit ?? 50;
  const q = (input.query ?? "").trim().toLowerCase();
  const byClient = indexInvoicesByClient(invoices);

  const rows: ReceivablesRow[] = [];

  for (const client of clients) {
    const clientInvoices = byClient.get(client.id) ?? [];
    const summary = summarize(clientInvoices);
    const match = matchClient(client, customers);

    // Scope the row's invoice list to the requested status.
    let inScope: Invoice[];
    switch (status) {
      case "overdue":
        inScope = clientInvoices.filter((i) => i.status === "overdue");
        break;
      case "paid":
        inScope = clientInvoices.filter((i) => i.status === "paid");
        break;
      case "any":
        inScope = clientInvoices;
        break;
      default: // "unpaid"
        inScope = clientInvoices.filter((i) => i.status !== "paid");
    }

    // Include the client only when it has at least one in-scope invoice.
    if (inScope.length === 0) continue;

    // Optional text filter across name/email/number/dir id.
    if (q) {
      const haystack = [
        client.name,
        client.email ?? "",
        match.customer?.id ?? "",
        ...inScope.map((i) => i.number),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) continue;
    }

    if (input.unmatchedOnly && match.method !== "none") continue;

    rows.push({
      invoiceClient: client,
      match,
      receivables: summary,
      invoices: inScope.map((i) => ({
        id: i.id,
        number: i.number,
        date: i.date,
        status: i.status,
        total: i.total,
        paidDate: i.paidDate,
      })),
    });
  }

  // Deterministic ordering: outstanding desc, then name.
  rows.sort((a, b) => {
    if (b.receivables.outstandingCents !== a.receivables.outstandingCents) {
      return b.receivables.outstandingCents - a.receivables.outstandingCents;
    }
    return a.invoiceClient.name.localeCompare(b.invoiceClient.name);
  });

  const capped = rows.slice(0, limit);

  const totals: ReceivablesTotals = {
    outstandingCents: capped.reduce((s, r) => s + r.receivables.outstandingCents, 0),
    overdueCents: capped.reduce((s, r) => s + r.receivables.overdueCents, 0),
    unpaidCount: capped.reduce((s, r) => s + r.receivables.unpaidCount, 0),
    overdueCount: capped.reduce((s, r) => s + r.receivables.overdueCount, 0),
  };

  return { rows: capped, totals };
}
