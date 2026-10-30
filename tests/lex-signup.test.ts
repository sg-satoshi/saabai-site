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
const pastDue = async () => "past_due";
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

const portalCookie = async (email: string) => `portal_session=${(await import("../lib/portal-session")).signSession(email)}`;

test("signup route: signed-out POST gets 403 and never reaches Stripe, even with Stripe configured", async () => {
  const { POST } = await import("../app/api/lex/signup/route");
  const saved = { key: process.env.STRIPE_SECRET_KEY, price: process.env.STRIPE_LEX_FIRM_PRICE_ID, fetch: globalThis.fetch };
  const stripeCalls: string[] = [];
  process.env.STRIPE_SECRET_KEY = "sk_test_not_real";
  process.env.STRIPE_LEX_FIRM_PRICE_ID = "price_test_not_real";
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes("stripe.com")) { stripeCalls.push(url); return new Response("{}", { status: 500 }); }
    return saved.fetch(input, init);
  }) as typeof fetch;
  try {
    const mk = (headers: Record<string, string> = {}) => new NextRequest("http://localhost/api/lex/signup", { method: "POST", body: JSON.stringify(good), headers: { "content-type": "application/json", ...headers } });
    const r = await POST(mk());
    assert.equal(r.status, 403);
    assert.match((await r.json()).error, /60-day free trial/);
    assert.equal((await POST(mk({ cookie: "portal_session=e30.forged" }))).status, 403, "forged session");
    const { signSession } = await import("../lib/portal-session");
    assert.equal((await POST(mk({ cookie: `portal_session=${signSession("x@firm.test", -1000)}` }))).status, 403, "expired session");
    assert.equal(stripeCalls.length, 0, "no Stripe call for signed-out callers");
  } finally {
    if (saved.key === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = saved.key;
    if (saved.price === undefined) delete process.env.STRIPE_LEX_FIRM_PRICE_ID; else process.env.STRIPE_LEX_FIRM_PRICE_ID = saved.price;
    globalThis.fetch = saved.fetch;
  }
});

test("signup route (signed in, e.g. lapsed admin or trial firm): 400 on bad input, 503 (feature off) when the price env is unset", async () => {
  const { POST } = await import("../app/api/lex/signup/route");
  const cookie = await portalCookie("jane@smithlaw.test");
  const mk = (b: unknown) => new NextRequest("http://localhost/api/lex/signup", { method: "POST", body: JSON.stringify(b), headers: { "content-type": "application/json", cookie } });
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
  const { inviteMember, revokeMember, seatsUsed, getFirm } = await L();
  assert.deepEqual((await inviteMember(firmId, "bob@smithlaw.test", mailer)).ok, true);
  assert.deepEqual((await inviteMember(firmId, "existing@oldfirm.test", mailer)).ok, true);
  assert.equal(seatsUsed((await getFirm(firmId))!), 3);
  const r = await inviteMember(firmId, "carl@smithlaw.test", mailer);
  assert.ok(!r.ok && r.cap);
  assert.equal(await hasLex("bob@smithlaw.test"), true);
  assert.ok(sent.includes("existing@oldfirm.test"), "existing login gets the access email");
  assert.equal((await revokeMember(firmId, "bob@smithlaw.test")).ok, true);
  assert.equal(await hasLex("bob@smithlaw.test"), false);
  assert.equal((await revokeMember(firmId, "jane@smithlaw.test")).ok, false);
  assert.equal((await inviteMember(firmId, "bob@smithlaw.test", mailer)).ok, true);
});

test("lifecycle: failed payment starts 7-day grace, idempotent; sweep lapses after 7 days; payment restores", async () => {
  const { handleLexLifecycle, sweepGrace, getFirm } = await L();
  const t0 = new Date("2026-11-01T00:00:00Z");
  const fail = { id: "evt_f1", type: "invoice.payment_failed", data: { object: { id: "in_1", subscription: "sub_1" } } };
  assert.equal(await handleLexLifecycle(fail, mailer, t0), "grace-started");
  assert.equal(await handleLexLifecycle(fail, mailer, t0), "duplicate");
  assert.equal((await getFirm(firmId))?.status, "grace");
  assert.equal((await sweepGrace(mailer, pastDue, new Date(t0.getTime() + 6 * 86400_000))).lapsed, 0);
  assert.equal(await hasLex("jane@smithlaw.test"), true);
  assert.equal((await sweepGrace(mailer, pastDue, new Date(t0.getTime() + 7 * 86400_000 + 1))).lapsed, 1);
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
  const rds = (await import("../lib/redis")).getRedis()!;
  assert.equal(await rds.get("lex:firm:byemail:bob@smithlaw.test"), null, "former staff are released on cancel");
  assert.equal(String(await rds.get("lex:firm:byemail:jane@smithlaw.test")), firmId, "owner keeps the link");
  assert.equal((await getFirm(firmId))?.members.length, 0);
  assert.equal(await handleLexLifecycle({ id: "evt_z", type: "customer.subscription.deleted", data: { object: { id: "sub_other" } } }, mailer), "ignored");
});

test("round 2: parallel invites can't exceed 3 seats (per-firm lock)", async () => {
  const { savePendingSignup, provisionLexCheckout, firmBySubscription, inviteMember, getFirm } = await L();
  const p = await savePendingSignup({ name: "Race Owner", email: "owner@race.test", firmName: "Race Law" });
  const s = { id: "cs_race", payment_status: "paid", customer: "cus_r", subscription: "sub_race", metadata: { product: "lex", plan: "firm", pendingId: p.id } };
  assert.equal(await provisionLexCheckout("evt_r", s, mailer, alert), "provisioned");
  const id = (await firmBySubscription("sub_race"))!.firmId;
  const rs = await Promise.all(["a", "b", "c", "d", "e", "f"].map((x) => inviteMember(id, `${x}@race.test`, mailer)));
  assert.equal(rs.filter((r) => r.ok).length, 2);
  const f = (await getFirm(id))!;
  assert.equal(f.members.length, 2);
  let withLex = 0;
  for (const x of ["a", "b", "c", "d", "e", "f"]) if (await hasLex(`${x}@race.test`)) withLex++;
  assert.equal(withLex, 2);
});

test("round 2: inviting someone on another firm gets a generic error", async () => {
  const { firmBySubscription, inviteMember, INVITE_GENERIC_ERROR } = await L();
  const id = (await firmBySubscription("sub_race"))!.firmId;
  const r = await inviteMember(id, "jane@smithlaw.test", mailer);
  assert.ok(!r.ok);
  assert.equal(r.error, INVITE_GENERIC_ERROR);
  assert.doesNotMatch(r.error, /another firm/);
});

test("round 2: a payment_failed older than the last paid invoice is ignored", async () => {
  const { handleLexLifecycle, firmBySubscription } = await L();
  const sub = { subscription: "sub_race" };
  assert.equal(await handleLexLifecycle({ id: "evt_rp", type: "invoice.paid", created: 2000, data: { object: { id: "in_rp", ...sub } } }, mailer), "noop");
  assert.equal(await handleLexLifecycle({ id: "evt_rf_old", type: "invoice.payment_failed", created: 1999, data: { object: { id: "in_rf", ...sub } } }, mailer), "stale");
  assert.equal((await firmBySubscription("sub_race"))?.status, "active");
  assert.equal((await firmBySubscription("sub_race"))?.lastPaidAt, 2000);
  assert.equal(await handleLexLifecycle({ id: "evt_rf_new", type: "invoice.payment_failed", created: 2001, data: { object: { id: "in_rf2", ...sub } } }, mailer, new Date("2026-11-01T00:00:00Z")), "grace-started");
});

test("round 2: sweep re-checks live Stripe status: active restores, unknown skips, past_due lapses", async () => {
  const { sweepGrace, firmBySubscription } = await L();
  const late = new Date("2026-11-20T00:00:00Z");
  let r = await sweepGrace(mailer, async () => null, late);
  assert.equal(r.lapsed, 0); assert.ok(r.skipped >= 1);
  assert.equal((await firmBySubscription("sub_race"))?.status, "grace");
  r = await sweepGrace(mailer, async () => "active", late);
  assert.equal(r.restored, 1); assert.equal(r.lapsed, 0);
  assert.equal((await firmBySubscription("sub_race"))?.status, "active");
  assert.equal(await hasLex("owner@race.test"), true);
});

test("round 2: a webhook retry doesn't send the welcome email twice", async () => {
  const { grantLex } = await L();
  const before = sent.filter((e) => e === "existing@oldfirm.test").length;
  await grantLex("lf_retrytest", "existing@oldfirm.test", "Old", "Retry Law", mailer);
  await grantLex("lf_retrytest", "existing@oldfirm.test", "Old", "Retry Law", mailer);
  assert.equal(sent.filter((e) => e === "existing@oldfirm.test").length, before + 1);
});

test("round 2: signup redirects use siteUrl(); billing and team routes don't require 'lex'; FirmPlan handles lapsed and missing dates", () => {
  const signup = readFileSync("app/api/lex/signup/route.ts", "utf8");
  assert.match(signup, /siteUrl\(\)/);
  assert.doesNotMatch(signup, /headers\.get\("origin"\)/);
  for (const f of ["app/api/lex/team/route.ts", "app/api/lex/billing-portal/route.ts"]) {
    const src = readFileSync(f, "utf8");
    assert.match(src, /resolveSessionEmail/);
    assert.doesNotMatch(src, /resolveReviewActor/);
  }
  const ui = readFileSync("app/lex/_components/FirmPlan.tsx", "utf8");
  assert.match(ui, /status === "lapsed"/);
  assert.match(ui, /end of your current billing period/);
  const form = readFileSync("app/lex/signup/SignupForm.tsx", "utf8");
  assert.match(form, /aria-invalid/);
  assert.match(form, /\.focus\(\)/);
});

test("billing webhook skips Lex checkouts, subscriptions and invoices so a Lex purchase isn't counted twice", async () => {
  const { isLexStripeObject } = await L();
  assert.equal(await isLexStripeObject({ id: "cs_l", metadata: { product: "lex", plan: "firm" } }, "checkout.session.completed"), true);
  assert.equal(await isLexStripeObject({ id: "sub_1" }, "customer.subscription.updated"), true, "known Lex subscription");
  assert.equal(await isLexStripeObject({ id: "in_l", parent: { subscription_details: { subscription: "sub_race" } } }, "invoice.paid"), true);
  assert.equal(await isLexStripeObject({ id: "in_l2", parent: { subscription_details: { metadata: { product: "lex" } } } }, "invoice.paid"), true);
  assert.equal(await isLexStripeObject({ id: "cs_site", metadata: { source: "saabai-billing", siteId: "x" } }, "checkout.session.completed"), false);
  assert.equal(await isLexStripeObject({ id: "sub_site" }, "customer.subscription.updated"), false);
  const src = readFileSync("app/api/webhooks/billing/route.ts", "utf8");
  const skip = src.indexOf("isLexStripeObject(event.data.object");
  assert.ok(skip > 0 && skip < src.indexOf("recordBillingGrowthEvent(event)") && skip < src.indexOf("reportCheckoutPurchase(event"), "Lex is skipped before growth tracking and purchase reporting");
});

test("clause 10.7: cancelled firm data is deleted after 30 days, kept if the domain still has Lex, and kept on resubscribe", async () => {
  const { savePendingSignup, provisionLexCheckout, firmBySubscription, handleLexLifecycle, sweepDataRetention, getFirm, DATA_RETENTION_DAYS, LEX_TERMS_VERSION } = await L();
  const { LEX_TERMS } = await import("../lib/lex-terms");
  assert.equal(DATA_RETENTION_DAYS, 30);
  assert.doesNotMatch(LEX_TERMS_VERSION, /draft/);
  assert.match(LEX_TERMS[6].body, /30 days/);
  assert.doesNotMatch(JSON.stringify(LEX_TERMS), /\$\d|GST not applicable/);
  assert.match(LEX_TERMS[0].body, /shown before checkout and includes GST/);
  assert.match(LEX_TERMS[6].body, /hello@saabai\.ai/);
  const key = (e: string) => e.split("@")[1];
  const mk = async (tag: string, owner: string) => {
    const p = await savePendingSignup({ name: "O", email: owner, firmName: tag });
    await provisionLexCheckout(`evt_${tag}`, { id: `cs_${tag}`, payment_status: "paid", customer: `cus_${tag}`, subscription: `sub_${tag}`, metadata: { product: "lex", plan: "firm", pendingId: p.id } }, mailer, alert);
    await handleLexLifecycle({ id: `evt_del_${tag}`, type: "customer.subscription.deleted", data: { object: { id: `sub_${tag}`, status: "canceled" } } }, mailer);
    return (await firmBySubscription(`sub_${tag}`))!;
  };
  const gone = await mk("gone", "o@gone.test");
  assert.ok(gone.dataDeleteAfter);
  const deleted: string[] = []; const threads: string[] = [];
  const del = { matters: async (k: string) => { deleted.push(k); return 1; }, threads: async (e: string) => { threads.push(e); } };
  const logs: string[] = []; const alerts: string[] = [];
  const live = { mode: "live" as const, log: (l: string) => logs.push(l), alert: async (m: string) => { alerts.push(m); } };
  const { deletionMode } = await L();
  assert.equal(deletionMode(undefined), "dry_run");
  assert.equal(deletionMode("LIVE"), "live");
  assert.equal(deletionMode("off"), "off");
  assert.equal(deletionMode("yes"), "dry_run");
  const early = new Date(Date.now() + 29 * 86400_000);
  assert.equal((await sweepDataRetention(del, key, async () => [], early, live)).deleted, 0);
  const late = new Date(Date.now() + 31 * 86400_000);
  // off and dry_run delete nothing and never mark
  assert.equal((await sweepDataRetention(del, key, async () => [], late, { ...live, mode: "off" })).dryRun, 0);
  const dry = await sweepDataRetention(del, key, async () => [], late, { ...live, mode: "dry_run" });
  assert.ok(dry.dryRun >= 1 && dry.deleted === 0 && deleted.length === 0);
  assert.equal((await getFirm(gone.firmId))?.dataDeletedAt, undefined);
  // shared key: held, not marked, ops alerted once
  const shared = await mk("shared", "o@shared.test");
  const r1 = await sweepDataRetention(del, key, async () => ["x@shared.test"], late, live);
  assert.ok(r1.held >= 1 && !deleted.includes("shared.test"));
  const sf = (await getFirm(shared.firmId))!;
  assert.equal(sf.dataDeletedAt, undefined);
  assert.ok(sf.dataDeletionHeldAt);
  assert.equal(alerts.filter((a) => a.includes(shared.firmId)).length, 1);
  await sweepDataRetention(del, key, async () => ["x@shared.test"], late, live);
  assert.equal(alerts.filter((a) => a.includes(shared.firmId)).length, 1, "alert once");
  assert.equal((await sweepDataRetention(del, key, async () => ["someone@race.test"], late, live)).deleted >= 1, true);
  for (const l of logs) assert.doesNotMatch(l, /@|\.test/, "log lines carry no emails or domains");
  assert.ok(deleted.includes("gone.test"));
  assert.ok(threads.includes("o@gone.test"));
  assert.ok((await getFirm(gone.firmId))?.dataDeletedAt);
  // Resubscribe within 30 days keeps the data
  const back = await mk("back", "o@back.test");
  const p2 = await savePendingSignup({ name: "O", email: "o@back.test", firmName: "Back again" });
  await provisionLexCheckout("evt_back2", { id: "cs_back2", payment_status: "paid", customer: "cus_b2", subscription: "sub_back2", metadata: { product: "lex", plan: "firm", pendingId: p2.id } }, mailer, alert);
  assert.equal((await getFirm(back.firmId))?.dataDeleteAfter, undefined);
  deleted.length = 0;
  await sweepDataRetention(del, key, async () => ["o@back.test"], late, live);
  assert.ok(!deleted.includes("back.test"));
});

test("webhooks: canonical route routes Lex strictly and has no old welcome copy; legacy route never provisions Lex", () => {
  const canon = readFileSync("app/api/stripe/webhook/route.ts", "utf8");
  assert.match(canon, /constructEvent/);
  assert.match(canon, /metadata\?\.product === "lex"/);
  assert.match(canon, /provisionLexCheckout/);
  for (const bad of [/calendly/i, /Anthropic/, /\$1,500/]) assert.doesNotMatch(canon, bad);
  const legacy = readFileSync("app/api/webhooks/stripe/route.ts", "utf8");
  assert.match(legacy, /status: 410/, "legacy webhook is retired");
  assert.doesNotMatch(legacy, /provisionLexCheckout|ensureClientAccount|constructEvent/);
  const emails = readFileSync("lib/lex-subscription-emails.ts", "utf8");
  for (const bad of [/calendly/i, /Anthropic/, /\$1,500/]) assert.doesNotMatch(emails, bad);
});

test("proxy: signed-out /lex/signup goes to /legal unless done page or the public trial page, bare /lex goes to /legal when signed out, deep /lex links stay login-only, /api/lex/signup is public and rate limited", async () => {
  const { proxy } = await import("../proxy");
  const go = (m: string, p: string) => proxy(new NextRequest(`http://localhost${p}`, { method: m, headers: { host: "localhost" } }));
  const s = (await go("GET", "/lex/signup"))!;
  assert.equal(s.status, 307, "signed-out paid signup page is closed; firms start with the free trial");
  assert.match(s.headers.get("location") ?? "", /\/legal$/);
  for (const p of ["/lex/signup/trial", "/lex/signup/trial/", "/lex/signup/trial?code=LEX-ABCDEFGHJK", "/lex/signup/trial?code=nope"]) assert.ok(!(await go("GET", p))!.headers.get("location"), `${p} is public`);
  assert.ok(!(await go("GET", "/lex/signup/done"))!.headers.get("location"));
  assert.ok(!(await go("GET", "/lex/signup/done/"))!.headers.get("location"), "trailing slash on the Stripe return page");
  // Signed out: bare /lex shows the public Lex page; deep links still need sign-in.
  assert.match((await go("GET", "/lex"))!.headers.get("location") ?? "", /\/legal$/);
  assert.ok((await go("GET", "/lex?q=trust"))!.headers.get("location")?.includes("/login"));
  assert.ok((await go("GET", "/lex/billing"))!.headers.get("location")?.includes("/login"));
  assert.notEqual((await go("POST", "/api/lex/team"))!.status, 200);
  const { formRuleFor } = await import("../lib/form-guard");
  assert.ok(formRuleFor("/api/lex/signup"));
});

test("deleteFirmMatters: glob characters in a firm key never touch other firms' keys", async () => {
  const { createMatter, deleteFirmMatters, listMatters } = await import("../lib/lex-matters");
  const { getRedis } = await import("../lib/redis");
  const r = getRedis()!;
  const evil = "*@gmail.com";
  await createMatter("bob@gmail.com", "bob@gmail.com", { name: "Bob's" });
  await createMatter("other.test", "a@other.test", { name: "Other" });
  await createMatter(evil, evil, { name: "Evil" });
  const y = new Date().getUTCFullYear();
  assert.equal(await deleteFirmMatters(evil), 1);
  assert.equal((await listMatters(evil)).length, 0);
  assert.equal(await r.get(`lex:matters:seq:${evil}:${y}`), null);
  assert.equal((await listMatters("bob@gmail.com")).length, 1);
  assert.equal((await listMatters("other.test")).length, 1);
  assert.ok(await r.get(`lex:matters:seq:bob@gmail.com:${y}`));
  assert.ok(await r.get(`lex:matters:seq:other.test:${y}`));
});
