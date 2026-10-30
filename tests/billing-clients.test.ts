import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gstLabel, newClient, pickExistingCustomer, searchClients, toStripeCustomerParams, validateClientInput, syncStripeCustomer } from "../lib/billing/clients";
import { buildAuditEntry } from "../lib/billing/audit-log";
import { cleanRequestId, idemKey, stepKey } from "../lib/billing/idempotency";

test("client input: required fields, ABN, GST default not registered", () => {
  assert.equal(validateClientInput({ email: "a@b.co" }).error, "Name is required");
  assert.equal(validateClientInput({ name: "A", email: "nope" }).error, "A valid email is required");
  assert.equal(validateClientInput({ name: "A", email: "a@b.co", abn: "123" }).error, "ABN must be 11 digits");
  const { input } = validateClientInput({ name: " Ann ", email: "Ann@Firm.com.au", abn: "71 889 082 572", lexFirmId: "firm_1", address: { city: "Brisbane" } });
  assert.equal(input!.name, "Ann");
  assert.equal(input!.email, "ann@firm.com.au");
  assert.equal(input!.abn, "71889082572");
  assert.equal(input!.gst, "not_registered");
  assert.equal(input!.address!.country, "AU");
  assert.equal(input!.lexFirmId, "firm_1");
  assert.equal(gstLabel(input!), "GST not applicable");
});

test("stripe customer params carry the client id and no tax settings", () => {
  const c = newClient(validateClientInput({ name: "Ann", firm: "Ann Law", email: "ann@x.au", gst: "registered" }).input!);
  const p = toStripeCustomerParams(c);
  assert.equal(p.name, "Ann Law");
  const md = p.metadata as Record<string, string>;
  assert.equal(md.saabai_client_id, c.id);
  assert.equal(md.gst, "registered");
  assert.equal((p as Record<string, unknown>).tax_exempt, undefined);
  assert.match(c.id, /^bc_[a-z0-9]{16}$/);
});

test("pick existing customer: tagged first, skips deleted and other clients", () => {
  const list: { id: string; email: string; metadata: Record<string, string>; deleted?: boolean }[] = [
    { id: "cus_new", email: "a@x", metadata: {} },
    { id: "cus_other", email: "a@x", metadata: { saabai_client_id: "bc_other" } },
    { id: "cus_old", email: "a@x", metadata: {} },
    { id: "cus_dead", email: "a@x", metadata: {}, deleted: true },
  ];
  assert.equal(pickExistingCustomer("bc_me", list), "cus_old");
  assert.equal(pickExistingCustomer("bc_other", list), "cus_other");
  assert.equal(pickExistingCustomer("bc_me", [list[1], list[3]]), null);
});

function fakeStripe(existing: { id: string; email: string; metadata: Record<string, string>; deleted?: boolean }[]) {
  const calls: string[] = [];
  const stripe = {
    customers: {
      retrieve: async (id: string) => { calls.push(`retrieve:${id}`); const c = existing.find((x) => x.id === id); if (!c) throw new Error("No such customer"); return c; },
      update: async (id: string) => { calls.push(`update:${id}`); return { id }; },
      list: async ({ email }: { email: string }) => { calls.push(`list:${email}`); return { data: existing.filter((x) => x.email === email) }; },
      create: async (_p: unknown, o: { idempotencyKey: string }) => { calls.push(`create:${o.idempotencyKey.startsWith("saabai:client-customer:")}`); return { id: "cus_created" }; },
    },
  };
  return { stripe: stripe as never, calls };
}

test("sync: stored id wins, email is only a fallback, create is idempotent", async () => {
  const c = newClient(validateClientInput({ name: "Ann", email: "ann@x.au" }).input!);
  let f = fakeStripe([{ id: "cus_stored", email: "other@x.au", metadata: {} }, { id: "cus_email", email: "ann@x.au", metadata: {} }]);
  assert.deepEqual(await syncStripeCustomer(f.stripe, { ...c, stripeCustomerId: "cus_stored" }), { customerId: "cus_stored", via: "stored" });
  assert.ok(!f.calls.some((x) => x.startsWith("list:")));
  f = fakeStripe([{ id: "cus_email", email: "ann@x.au", metadata: {} }]);
  assert.deepEqual(await syncStripeCustomer(f.stripe, { ...c, stripeCustomerId: "cus_gone" }), { customerId: "cus_email", via: "email" });
  f = fakeStripe([]);
  assert.deepEqual(await syncStripeCustomer(f.stripe, c), { customerId: "cus_created", via: "created" });
  assert.ok(f.calls.includes("create:true"));
});

test("search clients", () => {
  const a = newClient(validateClientInput({ name: "Ann", firm: "Ann Law", email: "ann@x.au" }).input!);
  const b = newClient(validateClientInput({ name: "Bob", email: "bob@y.au" }).input!);
  assert.deepEqual(searchClients([a, b], "law").map((x) => x.id), [a.id]);
  assert.equal(searchClients([a, b], "").length, 2);
});

test("idempotency keys are stable per submission and differ by step", () => {
  assert.equal(cleanRequestId("bad id!"), null);
  const rid = cleanRequestId("0f8e1c2d3b4a59687766554433221100");
  const k1 = idemKey("create-intent", rid, { amount: 1 });
  assert.equal(k1, idemKey("create-intent", rid, { amount: 999 }));
  assert.notEqual(stepKey(k1, "pi"), stepKey(k1, "customer"));
  const t = Date.parse("2026-10-30T04:00:00Z");
  assert.equal(idemKey("x", null, { a: 1, b: 2 }, t), idemKey("x", null, { b: 2, a: 1 }, t + 1000));
  assert.notEqual(idemKey("x", null, { a: 1 }, t), idemKey("x", null, { a: 2 }, t));
});

test("audit entry redacts card-like numbers and keeps stripe ids", () => {
  const e = buildAuditEntry({ actor: "shane@saabai.ai", action: "payment.create", amountCents: 1234.4, stripeIds: { payment_intent: "pi_1", empty: "" }, ok: true, note: "card 4242 4242 4242 4242" });
  assert.equal(e.amountCents, 1234);
  assert.deepEqual(e.stripeIds, { payment_intent: "pi_1" });
  assert.equal(e.note, "card [redacted]");
  assert.ok(e.at);
});

test("every money route is full-admin only and uses idempotency keys on creates", () => {
  const routes = [
    "app/api/admin/payments/create-intent/route.ts",
    "app/api/admin/payments/create-invoice/route.ts",
    "app/api/admin/payments/create-subscription/route.ts",
    "app/api/admin/payments/validate-coupon/route.ts",
    "app/api/admin/payments/audit/route.ts",
    "app/api/admin/sell/charge/route.ts",
    "app/api/admin/sell/link/route.ts",
    "app/api/admin/sell/quote/route.ts",
    "app/api/admin/billing-clients/route.ts",
    "app/api/admin/billing-clients/[id]/route.ts",
  ];
  for (const r of routes) {
    const src = readFileSync(r, "utf8");
    assert.ok(src.includes("moneyAdmin()"), `${r} uses moneyAdmin`);
    assert.ok(!src.includes("isAdminRequest"), `${r} no longer accepts granted staff`);
    const creates = src.match(/\.(create|finalizeInvoice|sendInvoice)\([^;]*?\);/g) || [];
    for (const c of creates) assert.ok(/idempotencyKey/.test(c), `${r}: ${c.slice(0, 60)}`);
  }
  for (const r of ["app/api/admin/payments/history/route.ts", "app/api/admin/invoices/route.ts", "app/api/admin/invoice-clients/route.ts"]) {
    assert.ok(readFileSync(r, "utf8").includes("isAdminSession"), `${r} stays admin-only`);
  }
});
