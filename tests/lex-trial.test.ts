/**
 * Lex invite-only 60-day free trial: invites, trial firms, seats, reminders, lapse, conversion, 10.7 clock.
 * In-memory Upstash mock, no Stripe or email.   npx tsx --test tests/lex-trial.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();
before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.SAABAI_SESSION_SECRET = "unit-test-secret-0123456789abcdef";
  delete process.env.RESEND_API_KEY;
  delete process.env.LEX_DATA_DELETION_MODE;
});
after(() => new Promise<void>((r) => mock.server.close(() => r())));

const T = () => import("../lib/lex-trial");
const S = () => import("../lib/lex-subscription");
const mailer = { welcome: async () => {} };
const DAY = 86400_000;
const hasLex = async (e: string) => !!(await (await import("../lib/user-directory")).getDirectoryUser(e))?.products?.includes("lex");
const input = (email: string) => ({ name: "Jane Citizen", email, firmName: "Smith Law" });

test("invites default to single use and 14 days; codes normalise; bad codes share one message", async () => {
  const { createInvite, normaliseCode, checkInvite, INVITE_INVALID, revokeInvite } = await T();
  const now = new Date("2026-11-01T00:00:00Z");
  const inv = await createInvite({ createdBy: "admin" }, now);
  assert.equal(inv.maxUses, 1);
  assert.equal(new Date(inv.expiresAt).getTime() - now.getTime(), 14 * DAY);
  assert.equal(normaliseCode(inv.code.toLowerCase().replace("lex-", " ")), inv.code);
  assert.equal(normaliseCode("../x"), null);
  assert.ok((await checkInvite(inv.code, now)).ok);
  const expired = await checkInvite(inv.code, new Date(now.getTime() + 15 * DAY));
  assert.ok(!expired.ok && expired.error === INVITE_INVALID);
  const unknown = await checkInvite("LEX-ABCDEFGHJK", now);
  assert.ok(!unknown.ok && unknown.error === INVITE_INVALID);
  await revokeInvite(inv.code, now);
  assert.equal((await checkInvite(inv.code, now)).ok, false);
});

let firmId = "";
test("trial signup: creates a trial firm, no Stripe ids, Lex granted, single-use invite used up", async () => {
  const { createInvite, startTrial, TRIAL_DAYS } = await T();
  const now = new Date();
  const inv = await createInvite({ label: "LinkedIn", createdBy: "admin" }, now);
  const r = await startTrial(input("jane@smithlaw.test"), inv.code, mailer, now);
  assert.ok(r.ok);
  if (!r.ok) return;
  firmId = r.firm.firmId;
  assert.equal(r.firm.status, "trial");
  assert.equal(r.firm.customerId, undefined);
  assert.equal(r.firm.subscriptionId, undefined);
  assert.equal(r.firm.inviteSource, "LinkedIn");
  assert.equal(new Date(r.firm.trialEndsAt!).getTime() - now.getTime(), TRIAL_DAYS * DAY);
  assert.equal(await hasLex("jane@smithlaw.test"), true);
  const again = await startTrial(input("other@else.test"), inv.code, mailer, now);
  assert.ok(!again.ok && again.field === "code");
});

test("capped invite: uses stop at maxUses; an email already on a firm can't start another trial (use refunded)", async () => {
  const { createInvite, startTrial, listInvites } = await T();
  const inv = await createInvite({ maxUses: 2, createdBy: "admin" });
  assert.ok((await startTrial(input("a@one.test"), inv.code, mailer)).ok);
  const dup = await startTrial(input("jane@smithlaw.test"), inv.code, mailer);
  assert.ok(!dup.ok && dup.field === "email");
  assert.ok((await startTrial(input("b@two.test"), inv.code, mailer)).ok);
  assert.equal((await startTrial(input("c@three.test"), inv.code, mailer)).ok, false);
  assert.equal((await listInvites()).find((i) => i.code === inv.code)?.state, "used_up");
});

test("seats: invites work on trial firms, 3-seat cap still applies", async () => {
  const { inviteMember } = await S();
  assert.ok((await inviteMember(firmId, "b@smithlaw.test", mailer)).ok);
  assert.ok((await inviteMember(firmId, "c@smithlaw.test", mailer)).ok);
  const full = await inviteMember(firmId, "d@smithlaw.test", mailer);
  assert.ok(!full.ok && full.cap);
});

test("trialInfo: days left, day 45 and day 55 reminders, ended", async () => {
  const { trialInfo } = await T();
  const start = new Date("2026-11-01T00:00:00Z");
  const f = { trialStartedAt: start.toISOString(), trialEndsAt: new Date(start.getTime() + 60 * DAY).toISOString() };
  const at = (d: number) => trialInfo(f, new Date(start.getTime() + d * DAY + 1000))!;
  assert.equal(trialInfo(f, start)!.daysLeft, 60);
  assert.equal(at(43).stage, "none");
  assert.equal(at(44).stage, "day45");
  assert.equal(at(54).stage, "day55");
  assert.equal(at(60).stage, "ended");
  assert.equal(at(60).daysLeft, 0);
  const { trialMessage } = await import("../lib/lex-trial-copy");
  assert.match(trialMessage(at(54), true)!, /Subscribe/);
  assert.equal(trialMessage(at(10), true), null);
});

test("sweep: ended trial lapses read-only (trial_ended), access removed, 30-day clock from trial end; deletion stays dry_run", async () => {
  const { sweepTrials } = await T();
  const { getFirm, sweepDataRetention, deletionMode } = await S();
  const f = (await getFirm(firmId))!;
  const end = new Date(f.trialEndsAt!);
  assert.equal((await sweepTrials(mailer, new Date(end.getTime() - 1000))).ended, 0);
  await sweepTrials(mailer, new Date(end.getTime() + 5 * 3600_000));
  const g = (await getFirm(firmId))!;
  assert.equal(g.status, "lapsed");
  assert.equal(g.lapseReason, "trial_ended");
  assert.equal(new Date(g.dataDeleteAfter!).getTime(), end.getTime() + 30 * DAY);
  assert.equal(await hasLex("jane@smithlaw.test"), false);
  assert.equal(await hasLex("b@smithlaw.test"), false);
  assert.equal(deletionMode(undefined), "dry_run");
  const logs: string[] = [];
  const res = await sweepDataRetention({ matters: async () => { throw new Error("must not delete"); }, threads: async () => { throw new Error("must not delete"); } },
    (e) => e.split("@")[1], async () => [], new Date(end.getTime() + 31 * DAY), { log: (l) => logs.push(l) });
  assert.ok(res.dryRun >= 1);
  assert.ok(logs.some((l) => l.includes(firmId) && l.includes("would_delete")));
});

test("subscribing with the owner email converts the same trial firm (data kept, clock cleared)", async () => {
  const { provisionLexCheckout, savePendingSignup, getFirm, firmBySubscription } = await S();
  const p = await savePendingSignup(input("jane@smithlaw.test"));
  const out = await provisionLexCheckout("evt_t", { id: "cs_t", payment_status: "paid", customer: "cus_t", subscription: "sub_t", metadata: { product: "lex", plan: "firm", pendingId: p.id } }, mailer, async () => {});
  assert.equal(out, "provisioned");
  const f = (await getFirm(firmId))!;
  assert.equal(f.status, "active");
  assert.equal(f.subscriptionId, "sub_t");
  assert.ok(f.convertedFromTrialAt);
  assert.equal(f.dataDeleteAfter, undefined);
  assert.equal((await firmBySubscription("sub_t"))?.firmId, firmId);
  assert.equal(await hasLex("jane@smithlaw.test"), true);
});

test("wiring: public route + rate limit, cron runs the trial sweep, admin page in the Lex nav, signup path unchanged", () => {
  assert.match(readFileSync("proxy.ts", "utf8"), /"\/api\/lex\/trial"/);
  assert.match(readFileSync("lib/form-guard.ts", "utf8"), /\/api\/lex\/trial/);
  assert.match(readFileSync("app/api/cron/lex-grace/route.ts", "utf8"), /sweepTrials\(lexMailer\)/);
  assert.match(readFileSync("app/saabai-admin/AdminSidebar.tsx", "utf8"), /\/saabai-admin\/lex-trials/);
  assert.doesNotMatch(readFileSync("app/api/lex/trial/route.ts", "utf8"), /getStripe|checkout\.sessions/);
  assert.match(readFileSync("app/api/lex/signup/route.ts", "utf8"), /checkout\.sessions\.create/);
});

test("founding offer: off by default; on before the deadline and under the cap flags founding_member; after the deadline or cap it doesn't", async () => {
  const { createInvite, startTrial, getFoundingConfig, setFoundingConfig, foundingCheckoutOpen } = await T();
  const now = new Date("2026-11-05T00:00:00Z");
  const inv = await createInvite({ createdBy: "admin", maxUses: 10, expiresInDays: 60 }, now);
  const off = await startTrial(input("f0@found0.test"), inv.code, mailer, now);
  assert.ok(off.ok && !off.firm.foundingMember, "off until an admin turns it on");
  await setFoundingConfig({ enabled: true, deadline: "2026-11-30", cap: 2 }, "admin", now);
  const cfg = await getFoundingConfig();
  assert.equal(cfg.deadline, "2026-11-30T13:59:59.000Z", "end of day Brisbane");
  const a = await startTrial(input("f1@found1.test"), inv.code, mailer, now);
  const b = await startTrial(input("f2@found2.test"), inv.code, mailer, now);
  assert.ok(a.ok && a.firm.foundingMember && b.ok && b.firm.foundingMember);
  assert.equal((await getFoundingConfig()).used, 0, "default FOUNDING_CAP_COUNTS=paid_conversions: trial starts don't take places");
  await (await import("../lib/redis")).getRedis()!.set("lex:trial:founding:count", "2"); // two paid founding conversions
  assert.equal(await foundingCheckoutOpen(), false, "cap reached: checkout falls back to the normal price");
  const c = await startTrial(input("f3@found3.test"), inv.code, mailer, now);
  assert.ok(c.ok && !c.firm.foundingMember, "cap of 2 reached");
  await setFoundingConfig({ enabled: true, deadline: "2026-11-30", cap: "" }, "admin", now);
  const late = await startTrial(input("f4@found4.test"), inv.code, mailer, new Date("2026-12-01T00:00:00Z"));
  assert.ok(late.ok && !late.firm.foundingMember, "after the deadline");
  await assert.rejects(setFoundingConfig({ enabled: true, deadline: "not a date" }, "admin"));
  await assert.rejects(setFoundingConfig({ enabled: true, cap: -1 }, "admin"));
});

test("checkout price: founding only with switch ON + env var + flag + active trial before its end; else $299", async () => {
  const { lexCheckoutPrice } = await T();
  const env = { STRIPE_LEX_FIRM_PRICE_ID: "price_normal", STRIPE_PRICE_LEX_FOUNDING: "price_founding" };
  const now = new Date("2026-11-10T00:00:00Z");
  const trial = { foundingMember: true, status: "trial" as const, trialEndsAt: "2026-12-01T00:00:00Z" };
  const F = { price: "price_founding", founding: true }, N = { price: "price_normal", founding: false };
  assert.deepEqual(lexCheckoutPrice(trial, true, env, now), F);
  assert.deepEqual(lexCheckoutPrice(trial, false, env, now), N, "admin switch OFF");
  assert.deepEqual(lexCheckoutPrice({ ...trial, foundingMember: false }, true, env, now), N, "not flagged");
  assert.deepEqual(lexCheckoutPrice(null, true, env, now), N);
  assert.deepEqual(lexCheckoutPrice(trial, true, { STRIPE_LEX_FIRM_PRICE_ID: "price_normal" }, now), N, "env unset");
  assert.deepEqual(lexCheckoutPrice(trial, true, { ...env, STRIPE_PRICE_LEX_FOUNDING: "  " }, now), N);
  assert.deepEqual(lexCheckoutPrice({ ...trial, status: "lapsed" as const }, true, env, now), N, "trial_ended firm pays normal");
  assert.deepEqual(lexCheckoutPrice(trial, true, env, new Date("2026-12-01T00:00:01Z")), N, "after trialEndsAt");
  const route = readFileSync("app/api/lex/signup/route.ts", "utf8");
  assert.match(route, /foundingCheckoutOpen\(\)/);
  assert.match(route, /lexCheckoutPrice\(trialFirm, foundingOn\)/);
});

test("founding status is lost on any lapse of a paid founding subscription (unpaid 10.6 or cancelled); trial lapse untouched", async () => {
  const { lapseFirm, FOUNDING_LOST_ON_LAPSE } = await S();
  assert.equal(FOUNDING_LOST_ON_LAPSE, true);
  for (const reason of ["unpaid", "cancelled"] as const) {
    const f = { firmId: `lf_found_${reason}`, firmName: "F", adminEmail: `o-${reason}@found.test`, members: [], granted: [], status: "active", subscriptionId: "sub_x", foundingMember: true, createdAt: "", updatedAt: "" } as never as Parameters<typeof lapseFirm>[0];
    await lapseFirm(f, reason, mailer);
    assert.equal(f.foundingMember, false, reason);
    assert.ok(f.foundingLostAt);
  }
  const t = { firmId: "lf_found_trial", firmName: "F", adminEmail: "t@found.test", members: [], granted: [], status: "trial", foundingMember: true, createdAt: "", updatedAt: "" } as never as Parameters<typeof lapseFirm>[0];
  await lapseFirm(t, "trial_ended", mailer);
  assert.equal(t.foundingMember, true, "trial lapse keeps the flag (price rule then gives $299 anyway)");
});

test("10.7 live deletion of an ended trial releases the owner email; a re-trial still needs a new code", async () => {
  const { createInvite, startTrial, sweepTrials } = await T();
  const { getFirm, sweepDataRetention } = await S();

  const now = new Date("2026-11-03T00:00:00Z");
  const inv = await createInvite({ createdBy: "admin" }, now);
  const r = await startTrial(input("owner@released.test"), inv.code, mailer, now);
  assert.ok(r.ok);
  const end = new Date(r.firm.trialEndsAt!);
  await sweepTrials(mailer, new Date(end.getTime() + 3600_000));
  const res = await sweepDataRetention({ matters: async () => 0, threads: async () => {} }, (e) => `k:${e}`, async () => [], new Date(end.getTime() + 31 * DAY), { mode: "live", log: () => {} });
  assert.ok(res.deleted >= 1);
  assert.ok((await getFirm(r.firm.firmId))!.dataDeletedAt);
  assert.equal(await (await import("../lib/redis")).getRedis()!.get("lex:firm:byemail:owner@released.test"), null);
  assert.equal((await startTrial(input("owner@released.test"), inv.code, mailer, now)).ok, false, "old single-use code is spent");
});

test("GET invite check is rate limited per IP; banner is in the Lex layout (every screen) without setState in an effect", () => {
  const route = readFileSync("app/api/lex/trial/route.ts", "utf8");
  assert.match(route, /checkLimited\(req\)[\s\S]*status: 429/);
  assert.match(readFileSync("app/lex/layout.tsx", "utf8"), /<TrialBanner \/>\{children\}/);
  assert.doesNotMatch(readFileSync("app/lex/page.tsx", "utf8"), /TrialBanner/);
  assert.doesNotMatch(readFileSync("app/lex/_components/TrialBanner.tsx", "utf8"), /useEffect\(\(\) => \{ if \(t\) set/);
});

test("open self-serve: no code needed; email must be verified before the trial starts; token single use; code optional for tracking", async () => {
  const { requestTrial, activateTrial, createInvite, SELF_SERVE_SOURCE } = await T();
  const sent: { email: string; url: string }[] = [];
  const send = async (o: { email: string; name: string; url: string }) => { sent.push(o); };
  const r = await requestTrial(input("owner@openfirm.test"), "", send, "https://x.test");
  assert.ok(r.ok);
  assert.equal(await hasLex("owner@openfirm.test"), false, "nothing starts before verification");
  assert.equal(await (await import("../lib/redis")).getRedis()!.get("lex:firm:byemail:owner@openfirm.test"), null);
  const token = new URL(sent[0].url).searchParams.get("token");
  assert.equal(sent[0].email, "owner@openfirm.test");
  assert.equal((await activateTrial("nope", mailer)).ok, false);
  const a = await activateTrial(token, mailer);
  assert.ok(a.ok && a.firm.status === "trial" && a.firm.inviteSource === SELF_SERVE_SOURCE);
  assert.equal(await hasLex("owner@openfirm.test"), true);
  assert.equal((await activateTrial(token, mailer)).ok, false, "token works once");
  const inv = await createInvite({ createdBy: "admin", label: "Law Society", expiresInDays: 30 });
  const sent2: string[] = [];
  assert.ok((await requestTrial(input("o@tracked.test"), inv.code, async (o) => { sent2.push(o.url); }, "https://x.test")).ok);
  const t = await activateTrial(new URL(sent2[0]).searchParams.get("token"), mailer);
  assert.ok(t.ok && t.firm.inviteSource === "Law Society");
  assert.equal((await requestTrial(input("o@bad.test"), "LEX-NOTREAL00", send, "https://x.test")).ok, false, "a given code must be valid");
});

test("one trial per firm: same domain blocked (even after deletion); webmail keyed by full email", async () => {
  const { startTrial, requestTrial, trialClaimKey, TRIAL_ALREADY_USED } = await T();
  assert.equal(trialClaimKey("A@Gmail.com"), "lex:trial:claim:a@gmail.com");
  assert.equal(trialClaimKey("x@acmelaw.com.au"), "lex:trial:claim:acmelaw.com.au");
  assert.ok((await startTrial(input("one@acmelaw.test"), "", mailer)).ok);
  const again = await startTrial(input("two@acmelaw.test"), "", mailer);
  assert.ok(!again.ok && again.error === TRIAL_ALREADY_USED);
  const req = await requestTrial(input("three@acmelaw.test"), "", async () => { throw new Error("must not send"); }, "https://x.test");
  assert.equal(req.ok, false, "blocked before any email is sent");
  await (await import("../lib/redis")).getRedis()!.del("lex:firm:byemail:one@acmelaw.test");
  assert.equal((await startTrial(input("one@acmelaw.test"), "", mailer)).ok, false, "re-trial after deletion still blocked");
  assert.ok((await startTrial(input("solo1@gmail.com"), "", mailer)).ok);
  assert.ok((await startTrial(input("solo2@gmail.com"), "", mailer)).ok, "webmail: different people");
});

test("paid founding conversion counts the cap once (FOUNDING_CAP_COUNTS default), never auto-converts", async () => {
  const sub = await import("../lib/lex-subscription");
  assert.equal(sub.FOUNDING_CAP_COUNTS, "paid_conversions");
  const src = readFileSync("lib/lex-subscription.ts", "utf8");
  assert.match(src, /FOUNDING_CAP_COUNTS === "paid_conversions" && f\.foundingMember && s\.metadata\?\.founding === "1" && !f\.foundingCountedAt/);
  assert.doesNotMatch(readFileSync("lib/lex-trial.ts", "utf8"), /getStripe|checkout\.sessions|subscriptions\.create/);
  const verify = readFileSync("app/api/lex/trial/verify/route.ts", "utf8");
  assert.match(verify, /export async function POST/);
  assert.doesNotMatch(verify, /export async function GET/, "link scanners can't start a trial");
  const form = readFileSync("app/lex/signup/trial/TrialForm.tsx", "utf8") + readFileSync("app/lex/signup/trial/page.tsx", "utf8");
  assert.doesNotMatch(form, /[Ii]nvite code|[Bb]y invitation|beta invite/);
  assert.match(form, /name="website"/, "honeypot kept");
  assert.match(form, /Don&apos;t pay a cent until you&apos;ve tried it/);
});
