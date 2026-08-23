/**
 * Fixture test for the receivables join (lib/receivables.ts).
 * Proves the join answers "which clients have unpaid invoices" and "what does X owe"
 * across the directory↔ledger gap, with hand-computable expectations.
 * Run: npx tsx scripts/verify-receivables.ts
 */
import {
  queryReceivables,
  attachReceivables,
  invoiceAmountToCents,
} from "../lib/receivables";
import type { UnifiedCustomer } from "../lib/customers";
import type { Invoice, InvoiceClient } from "../lib/invoice-store";

let failures = 0;
function assert(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}\n        expected ${e}\n        got      ${a}`);
  }
}

// ── Fixtures ────────────────────────────────────────────────────────────────
const customers: UnifiedCustomer[] = [
  {
    id: "stripe_cus_A",
    name: "Holland Plastics",
    email: "billing@hollandplastics.com",
    type: "stripe",
    project: "Lex",
    status: "active",
    revenue: 0,
    mrr: 0,
    createdAt: 1000,
    detailUrl: "/saabai-admin/orders",
    metadata: {},
  },
  {
    id: "lex_cB",
    name: "Casey Legal",
    email: "accounts@caseylegal.com",
    type: "lex",
    project: "Lex",
    status: "active",
    revenue: 0,
    mrr: 0,
    createdAt: 0,
    detailUrl: "/saabai-admin/lex-clients",
    metadata: {},
  },
  // No email, name does not match any invoice client → no-match path.
  {
    id: "portal_cC",
    name: "Unknown Umbrella",
    email: "",
    type: "portal",
    project: "Portal",
    status: "active",
    revenue: 0,
    mrr: 0,
    createdAt: 0,
    detailUrl: "",
    metadata: {},
  },
];

const clients: InvoiceClient[] = [
  { id: "cl_default_hp", name: "Holland Plastics" }, // no email → name-only match
  { id: "cl_casey", name: "Casey Legal", email: "accounts@caseylegal.com" }, // email match
];

const baseInv = {
  lineItems: [],
  subtotal: 0,
  gst: 0,
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-01T00:00:00Z",
};

const invoices: Invoice[] = [
  // Holland Plastics: 1 unpaid + 1 overdue
  { ...baseInv, id: "inv_1", number: "SG-010", date: "2026-07-01", clientId: "cl_default_hp", total: 400, status: "unpaid" },
  { ...baseInv, id: "inv_2", number: "SG-011", date: "2026-08-01", clientId: "cl_default_hp", total: 900, status: "overdue" },
  // Casey Legal: only paid → should be excluded from status=unpaid
  { ...baseInv, id: "inv_3", number: "SG-012", date: "2026-08-10", clientId: "cl_casey", total: 450, status: "paid" },
];

console.log("invoiceAmountToCents(400) =", invoiceAmountToCents(400));
assert("money adapter dollars→cents (identity when already integer dollars)", invoiceAmountToCents(400.5), 40050);

// ── queryReceivables: status=unpaid (default) ──────────────────────────────
console.log("\nqueryReceivables(status=unpaid)");
const r1 = queryReceivables({ status: "unpaid" }, customers, clients, invoices);
assert("returned exactly 1 row (Holland Plastics)", r1.rows.length, 1);
assert(
  "row is Holland Plastics with name-only match",
  { name: r1.rows[0].invoiceClient.name, method: r1.rows[0].match.method, cus: r1.rows[0].match.customer?.id },
  { name: "Holland Plastics", method: "name", cus: "stripe_cus_A" }
);
assert(
  "row receivables outstanding = (400+900)*100",
  r1.rows[0].receivables.outstandingCents,
  130000
);
assert(
  "row receivables overdueCents = 900*100",
  r1.rows[0].receivables.overdueCents,
  90000
);
assert("row scoped invoice numbers = SG-010, SG-011", r1.rows[0].invoices.map((i) => i.number), ["SG-010", "SG-011"]);
assert(
  "totals match hand sum",
  r1.totals,
  { outstandingCents: 130000, overdueCents: 90000, unpaidCount: 1, overdueCount: 1 }
);

// ── queryReceivables: status=any → both clients appear ──────────────────────
console.log("\nqueryReceivables(status=any)");
const r2 = queryReceivables({ status: "any" }, customers, clients, invoices);
assert("status=any returns 2 rows", r2.rows.length, 2);
assert("Casey row method = email", r2.rows.find((x) => x.invoiceClient.id === "cl_casey")?.match.method, "email");

// ── queryReceivables: no-match client (unmatchedOnly) ───────────────────────
console.log("\nqueryReceivables(unmatchedOnly, any)");
// Add a ledger-only client with no directory match
const ledgerOnly: InvoiceClient = { id: "cl_golf", name: "Golf Pro Shop", email: "billing@golfpro.example" };
const extraInv: Invoice = { ...baseInv, id: "inv_4", number: "SG-013", date: "2026-08-15", clientId: "cl_golf", total: 250, status: "unpaid" };
const r3 = queryReceivables(
  { status: "any", unmatchedOnly: true },
  customers,
  [...clients, ledgerOnly],
  [...invoices, extraInv]
);
assert("unmatchedOnly surfaces the ledger-only client as method=none", r3.rows.length, 1);
assert("ledger-only client method = none", r3.rows[0].match.method, "none");

// ── attachReceivables: customer directory → AR augmentation ────────────────
console.log("\nattachReceivables(customers, clients, invoices)");
const attached = attachReceivables(customers, clients, invoices);
const hp = attached.find((a) => a.id === "stripe_cus_A");
const casey = attached.find((a) => a.id === "lex_cB");
const noMatch = attached.find((a) => a.id === "portal_cC");
assert("Holland Plastics attached outstanding = 130000", hp?.receivables.outstandingCents, 130000);
assert("Holland Plastics invoiceClientId = cl_default_hp", hp?.invoiceClientId, "cl_default_hp");
assert("Casey Legal attached (paid-only) outstanding = 0", casey?.receivables.outstandingCents, 0);
assert("Casey Legal invoiceClientId = cl_casey", casey?.invoiceClientId, "cl_casey");
assert("unknown customer gets ZERO summary (not missing)", noMatch?.receivables.outstandingCents, 0);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
