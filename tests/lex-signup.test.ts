/**
 * Lex Firm plan signup, webhook provisioning, lifecycle (7-day grace), seats (3) and routing.
 * In-memory Upstash mock, no Stripe or email calls.   npx tsx --test tests/lex-signup.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();
before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.SAABAI_SESSION_SECRET = "unit-test-secret-0123456789abcdef";
  process.env.PORTAL_SESSION_SECRET = "portal-test-secret-portal-test-secret";
  delete process.env.RESEND_API_KEY;
  delete process.env.STRIPE_LEX_FIRM_PRICE_ID;
  mock.seed({ hashes: { "saabai:users": {
    "existing@oldfirm.test": JSON.stringify({ id: "existing", name: "Old", email: "existing@oldfirm.test", password: "x", role: "user", dashboardUrl: "/lex", products: ["lex"], approvedAt: "", createdAt: "" }),
  } } });
});
after(() => new Promise<void>((r) => mock.server.close(() => r())));

const L = () => import("../lib/lex-subscription");
const sent: string[] = [];
const mailer = { welcome: async (o: { email: string }) => { sent.push(o.email); } };
const alerts: string[] = [];
const alert = async (m: string) => { alerts.push(m); };
const user = async (e: string) => (await import("../lib/user-directory")).getDirectoryUser(e);
const hasLex = async (e: string) => !!(await user(e))?.products?.includes("lex");

const good = { name: "Jane Citizen", email: "Jane@Smithlaw.test", firmName: "Smith Law", acceptTerms: true };

test("signup validation: required fields, terms, honeypot, ABN", async () => {
  const { validateSignup } = await L();
  const ok = validateSignup(good);
  assert.ok(ok.ok && ok.value.email === "jane@smithlaw.test");
  assert.equal(validateSignup({ ...good, acceptTerms: false }).ok, false);
  assert.equal(validateSignup({ ...good, acceptTerms: "true" }).ok, false);
  assert.equal(validateSignup({ ...good, email: "nope" }).ok, false);
  assert.equal(validateSignup({ ...good, name: "" }).ok, false);
  assert.equal(validateSignup({ ...good, firmName: "" }).ok, false);
  assert.equal(validateSignup({ ...good, abn: "123" }).ok, false);
  const abn = validateSignup({ ...good, abn: "51 824 753 556" });
  assert.ok(abn.ok && abn.value.abn === "51824753556");
  const bot = validateSignup({ ...good, website: "http://spam" });
  assert.ok(!bot.ok && bot.bot);
});

test("signup route: 400 on bad input, 503 (feature off) when the price env is unset", async () => {
  const { POST } = await import("../app/api/lex/signup/route");
  const mk = (b: unknown) => new NextRequest("http://localhost/api/lex/signup", { method: "POST", body: JSON.stringify(b), headers: { "content-type": "application/json" } });
  assert.equal((await POST(mk({ ...good, acceptTerms: false }))).status, 400);
  assert.equal((await POST(mk(good))).status, 503);
});

test("pending signup saved with terms version, accepted time and a 24h TTL", async () => {
  const { savePendingSignup, getPendingSignup, LEX_TERMS_VERSION, PENDING_TTL_SECONDS } = await L();
  const p = await savePendingSignup({ name: "A", email: "a@x.test", firmName: "X" });
  const back = await getPendingSignup(p.id);
  assert.equal(back?.termsVersion, LEX_TERMS_VERSION);
  assert.ok(back?.termsAcceptedAt);
  assert.equal(PENDING_TTL_SECONDS, 86400);
  assert.equal(await getPendingSignup("../../etc"), null);
});

let firmId = "";
test("webhook provisioning: paid firm session provisions once; unpaid, non-Lex and legacy plans do not", async () => {
  const { savePendingSignup, provisionLexCheckout, firmBySubscription } = await L();
  const p = await savePendingSignup({ name: "Jane Citizen", email: "jane@smithlaw.test", firmName: "Smith Law" });
  const s = { id: "cs_1", payment_status: "paid", customer: "cus_1", subscription: "sub_1", customer_details: { email: "jane@smithlaw.test", name: "Jane" }, metadata: { product: "lex", plan: "firm", pendingId: p.id, termsVersion: p.termsVersion } };
  assert.equal(await provisionLexCheckout("evt_1", { ...s, id: "cs_0", payment_status: "unpaid" }, mailer, alert), "unpaid");
  assert.equal(await hasLex("jane@smithlaw.test"), false);
  assert.equal(await provisionLexCheckout("evt_x", { ...s, id: "cs_9", metadata: { product: "blueprint" } }, mailer, alert), "not-lex");
  assert.equal(await provisionLexCheckout("evt_l", { ...s, id: "cs_8", metadata: { product: "lex", plan: "starter" } }, mailer, alert), "legacy-plan");
  assert.ok(alerts.some((a) => a.includes("cs_8")));
  assert.equal(await provisionLexCheckout("evt_1", s, mailer, alert), "provisioned");
  assert.equal(await provisionLexCheckout("evt_1b", s, mailer, alert), "duplicate");
  assert.equal(await hasLex("jane@smithlaw.test"), true);
  const f = await firmBySubscription("sub_1");
  assert.equal(f?.customerId, "cus_1");
  assert.equal(f?.adminEmail, "jane@smithlaw.test");
  assert.equal(f?.firmName, "Smith Law");
  firmId = f!.firmId;
});

test("seats: owner + 2 invites = 3; the 4th is refused with cap; revoke frees a seat", async () => {
  const { getFirm, inviteMember, revokeMember, seatsUsed } = await L();
  let f = (await getFirm(firmId))!;
  assert.deepEqual((await inviteMember(f, "bob@smithlaw.test", mailer)).ok, true);
  assert.deepEqual((await inviteMember(f, "existing@oldfirm.test", mailer)).ok, true);
  assert.equal(seatsUsed(f), 3);
  const r = await inviteMember(f, "carl@smithlaw.test", mailer);
  assert.ok(!r.ok && r.cap);
  assert.equal(await hasLex("bob@smithlaw.test"), true);
  assert.ok(sent.includes("existing@oldfirm.test"), "existing login gets the access email");
  f = (await getFirm(firmId))!;
  assert.equal((await revokeMember(f, "bob@smithlaw.test")).ok, true);
  assert.equal(await hasLex("bob@smithlaw.test"), false);
  assert.equal((await revokeMember(f, "jane@smithlaw.test")).ok, false);
  assert.equal((await inviteMember(f, "bob@smithlaw.test", mailer)).ok, true);
});

test("lifecycle: failed payment starts 7-day grace, idempotent; sweep lapses after 7 days; payment restores", async () => {
  const { handleLexLifecycle, sweepGrace, getFirm } = await L();
  const t0 = new Date("2026-11-01T00:00:00Z");
  const fail = { id: "evt_f1", type: "invoice.payment_failed", data: { object: { id: "in_1", subscription: "sub_1" } } };
  assert.equal(await handleLexLifecycle(fail, mailer, t0), "grace-started");
  assert.equal(await handleLexLifecycle(fail, mailer, t0), "duplicate");
  assert.equal((await getFirm(firmId))?.status, "grace");
  assert.equal(await sweepGrace(mailer, new Date(t0.getTime() + 6 * 86400_000)), 0);
  assert.equal(await hasLex("jane@smithlaw.test"), true);
  assert.equal(await sweepGrace(mailer, new Date(t0.getTime() + 7 * 86400_000 + 1)), 1);
  assert.equal(await hasLex("jane@smithlaw.test"), false);
  assert.equal(await hasLex("bob@smithlaw.test"), false);
  assert.equal(await hasLex("existing@oldfirm.test"), true, "Lex we did not grant is never removed");
  const paid = { id: "evt_p1", type: "invoice.paid", data: { object: { id: "in_2", parent: { subscription_details: { subscription: "sub_1" } } } } };
  assert.equal(await handleLexLifecycle(paid, mailer), "restored");
  assert.equal(await hasLex("jane@smithlaw.test"), true);
  assert.equal(await hasLex("bob@smithlaw.test"), true);
});

test("lifecycle: cancel at period end is recorded; subscription.deleted removes Lex; unknown subs ignored", async () => {
  const { handleLexLifecycle, getFirm } = await L();
  const upd = { id: "evt_u1", type: "customer.subscription.updated", data: { object: { id: "sub_1", status: "active", cancel_at_period_end: true, current_period_end: 1795000000 } } };
  assert.equal(await handleLexLifecycle(upd, mailer), "updated");
  assert.equal((await getFirm(firmId))?.cancelAtPeriodEnd, true);
  assert.equal(await hasLex("jane@smithlaw.test"), true);
  const del = { id: "evt_d1", type: "customer.subscription.deleted", data: { object: { id: "sub_1", status: "canceled" } } };
  assert.equal(await handleLexLifecycle(del, mailer), "lapsed");
  assert.equal(await hasLex("jane@smithlaw.test"), false);
  assert.equal(await hasLex("bob@smithlaw.test"), false);
  assert.equal(await handleLexLifecycle({ id: "evt_z", type: "customer.subscription.deleted", data: { object: { id: "sub_other" } } }, mailer), "ignored");
});

test("webhooks: canonical route routes Lex strictly and has no old welcome copy; legacy route never provisions Lex", () => {
  const canon = readFileSync("app/api/stripe/webhook/route.ts", "utf8");
  assert.match(canon, /constructEvent/);
  assert.match(canon, /metadata\?\.product === "lex"/);
  assert.match(canon, /provisionLexCheckout/);
  for (const bad of [/calendly/i, /Anthropic/, /\$1,500/]) assert.doesNotMatch(canon, bad);
  const legacy = readFileSync("app/api/webhooks/stripe/route.ts", "utf8");
  assert.match(legacy, /product === "lex"/);
  assert.doesNotMatch(legacy, /provisionLexCheckout|ensureClientAccount\([^)]*Lex/);
  assert.doesNotMatch(legacy, /`Lex \$\{label\}`/);
  const emails = readFileSync("lib/lex-subscription-emails.ts", "utf8");
  for (const bad of [/calendly/i, /Anthropic/, /\$1,500/]) assert.doesNotMatch(emails, bad);
});

test("proxy: /lex/signup is public, /lex stays login-only, /api/lex/signup is public and rate limited", async () => {
  const { proxy } = await import("../proxy");
  const go = (m: string, p: string) => proxy(new NextRequest(`http://localhost${p}`, { method: m, headers: { host: "localhost" } }));
  const s = (await go("GET", "/lex/signup"))!;
  assert.ok(!s.headers.get("location"), "signup not redirected");
  assert.ok(!(await go("GET", "/lex/signup/done"))!.headers.get("location"));
  assert.ok((await go("GET", "/lex"))!.headers.get("location")?.includes("/login"));
  assert.notEqual((await go("POST", "/api/lex/team"))!.status, 200);
  const { formRuleFor } = await import("../lib/form-guard");
  assert.ok(formRuleFor("/api/lex/signup"));
});
