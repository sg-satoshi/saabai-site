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

test("10.7 live deletion of an ended trial releases the owner email link; a re-trial is still refused", async () => {
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

test("one trial per firm: same domain blocked (even after deletion); webmail refused", async () => {
  const { startTrial, requestTrial, trialClaimKey, TRIAL_ALREADY_USED } = await T();
  assert.equal(trialClaimKey("A@Gmail.com"), trialClaimKey("a@gmail.com"));
  assert.equal(trialClaimKey("x@acmelaw.com.au"), trialClaimKey("y@mail.acmelaw.com.au"));
  assert.ok((await startTrial(input("one@acmelaw.test"), "", mailer)).ok);
  const again = await startTrial(input("two@acmelaw.test"), "", mailer);
  assert.ok(!again.ok && again.error === TRIAL_ALREADY_USED);
  const req = await requestTrial(input("three@acmelaw.test"), "", async () => { throw new Error("must not send"); }, "https://x.test");
  assert.equal(req.ok, false, "blocked before any email is sent");
  await (await import("../lib/redis")).getRedis()!.del("lex:firm:byemail:one@acmelaw.test");
  assert.equal((await startTrial(input("one@acmelaw.test"), "", mailer)).ok, false, "re-trial after deletion still blocked");
  const { WORK_EMAIL_REQUIRED } = await import("../lib/lex-trial-guard");
  const wm = await startTrial(input("solo1@gmail.com"), "", mailer);
  assert.ok(!wm.ok && wm.error === WORK_EMAIL_REQUIRED, "webmail never gets a trial (work email only)");
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
  const verifyPage = readFileSync("app/lex/signup/trial/verify/VerifyTrial.tsx", "utf8") + readFileSync("app/lex/signup/trial/verify/page.tsx", "utf8");
  assert.doesNotMatch(form + verifyPage, /\$\s?\d|\bAUD\b|per month|\d+ a month \(/, "no public Lex price on trial pages");
  assert.match(form, /Don&apos;t pay a cent until you&apos;ve tried it/);
});

test("QA r1 open trial: email normalisation (+tags, Gmail dots, googlemail, subdomains, .com.au)", async () => {
  const { trialIdentity, registrableDomain, trialClaimKey } = await T();
  assert.equal(trialIdentity("Jo+1@Gmail.com"), "m:jo@gmail.com");
  assert.equal(trialIdentity("j.o@gmail.com"), "m:jo@gmail.com");
  assert.equal(trialIdentity("J.O+x@googlemail.com"), "m:jo@gmail.com");
  assert.equal(trialIdentity("jo+lex@outlook.com.au"), "m:jo@outlook.com.au");
  assert.equal(trialIdentity("j.o@outlook.com"), "m:j.o@outlook.com", "dots only stripped for Gmail");
  assert.equal(trialIdentity("a@mail.firm.com.au"), "d:firm.com.au");
  assert.equal(trialIdentity("b+x@firm.com.au"), "d:firm.com.au");
  assert.equal(trialIdentity("c@uk.firm.co.uk"), "d:firm.co.uk");
  assert.equal(trialIdentity("d@eu.firm.com"), "d:firm.com");
  assert.equal(registrableDomain("a.b.firm.org.nz"), "firm.org.nz");
  for (const isp of ["westnet.com.au", "dodo.com.au", "aussiebb.com.au", "telstra.com", "iprimus.com.au", "hotmail.co.uk", "outlook.co.nz", "hey.com", "tutanota.com", "protonmail.ch", "internode.net.au"]) {
    assert.match(trialIdentity(`x@${isp}`), /^m:/, isp);
  }
  assert.equal(trialClaimKey("jo+1@gmail.com"), trialClaimKey("j.o@googlemail.com"));
});

test("QA r1 open trial: claim keys are hashes holding only a marker; no address or domain stored", async () => {
  const { startTrial, trialClaimKey } = await T();
  const k = trialClaimKey("owner@hashfirm.test");
  assert.match(k, /^lex:trial:claim:[a-f0-9]{64}$/);
  assert.doesNotMatch(k, /hashfirm|owner/);
  assert.ok((await startTrial(input("owner@hashfirm.test"), "", mailer)).ok);
  assert.equal(await (await import("../lib/redis")).getRedis()!.get(k).then(String), "1");
  assert.equal((await startTrial(input("other@sub.hashfirm.test"), "", mailer)).ok, false, "subdomain is the same firm");
  assert.equal((await startTrial(input("x+2@mail.hashfirm.test"), "", mailer)).ok, false, "+tag on a subdomain is the same firm");
  const copy = readFileSync("lib/lex-trial-copy.ts", "utf8");
  assert.match(copy, /one-way coded marker/);
  assert.match(readFileSync("app/privacy/page.tsx", "utf8"), /LEX_TRIAL_MARKER_COPY/);
  assert.match(readFileSync("app/lex/signup/trial/page.tsx", "utf8"), /LEX_TRIAL_MARKER_COPY/);
});

test("QA r1 open trial: resend cooldown sends one confirm email per identity per 10 minutes", async () => {
  const { requestTrial, RESEND_COOLDOWN_SECONDS } = await T();
  let sent = 0;
  const send = async () => { sent++; };
  assert.ok((await requestTrial(input("a@cool.test"), "", send, "https://x.test")).ok);
  assert.ok((await requestTrial(input("b@cool.test"), "", send, "https://x.test")).ok, "same answer (no enumeration)");
  assert.equal(sent, 1);
  assert.equal(RESEND_COOLDOWN_SECONDS, 600);
});

test("QA r1 open trial: founding places reserved atomically at checkout; race can't overshoot; released on expiry", async () => {
  const sub = await import("../lib/lex-subscription");
  const r = (await import("../lib/redis")).getRedis()!;
  await r.set(sub.FOUNDING_COUNT_KEY, "0");
  const ids = Array.from({ length: 20 }, (_, i) => `lf_race${i}`);
  const got = await Promise.all(ids.map((id) => sub.reserveFoundingPlace(id, 3)));
  assert.equal(got.filter(Boolean).length, 3, "exactly the cap");
  assert.equal(Number(await r.get(sub.FOUNDING_COUNT_KEY)), 3);
  const winner = ids[got.indexOf(true)];
  assert.equal(await sub.reserveFoundingPlace(winner, 3), true, "same firm retrying keeps its place");
  assert.equal(Number(await r.get(sub.FOUNDING_COUNT_KEY)), 3);
  await sub.consumeFoundingPlace(winner);
  assert.equal(Number(await r.get(sub.FOUNDING_COUNT_KEY)), 3, "paid: counted once");
  const others = ids.filter((id, i) => got[i] && id !== winner);
  assert.equal(await sub.releaseFoundingPlace(others[0]), true);
  assert.equal(await sub.releaseFoundingPlace(others[0]), false, "release is idempotent");
  assert.equal(Number(await r.get(sub.FOUNDING_COUNT_KEY)), 2);
  assert.equal(await sub.sweepFoundingReservations(Date.now() + sub.FOUNDING_RES_TTL_MS + 1000), 1, "expired reservation swept");
  assert.equal(Number(await r.get(sub.FOUNDING_COUNT_KEY)), 1);
  const route = readFileSync("app/api/lex/signup/route.ts", "utf8");
  assert.match(route, /reserveFoundingPlace\(trialFirm\.firmId/);
  assert.match(route, /await release\(\);/);
  assert.match(readFileSync("app/api/stripe/webhook/route.ts", "utf8"), /checkout\.session\.expired[\s\S]*releaseFoundingPlace/);
  assert.match(readFileSync("app/api/cron/lex-grace/route.ts", "utf8"), /sweepFoundingReservations/);
});

test("QA r1 open trial: rate limit fails closed for signup and trial; sender identity is one config value", async () => {
  const { formGuard, FORM_RULES } = await import("../lib/form-guard");
  const broken = { incr: async () => { throw new Error("down"); }, expire: async () => 0 };
  const req = (p: string) => ({ method: "POST", nextUrl: { pathname: p }, headers: new Headers() }) as never;
  for (const p of ["/api/lex/trial", "/api/lex/trial/verify", "/api/lex/signup"]) assert.equal((await formGuard(req(p), broken))?.status, 503, p);
  assert.equal(await formGuard(req("/api/testimonial"), broken), null, "others still fail open");
  assert.ok(FORM_RULES.find((r) => r.prefix === "/api/lex/trial")?.failClosed);
  const { EMAIL_BRAND, renderBrandedEmail } = await import("../lib/email/branded-layout");
  assert.ok(EMAIL_BRAND.senderIdentity);
  const e = renderBrandedEmail({ subject: "s", title: "t", bodyHtml: "<p>x</p>", textBody: ["x"] } as never);
  assert.ok(e.html.includes(EMAIL_BRAND.senderIdentity.replace("·", "&middot;")) || e.html.includes(EMAIL_BRAND.senderIdentity));
  assert.doesNotMatch(readFileSync("lib/email/branded-layout.ts", "utf8"), /ABN \$\{EMAIL_BRAND\.abn\}/, "footer uses senderIdentity only");
  assert.doesNotMatch(readFileSync("lib/lex-subscription-emails.ts", "utf8"), /\bABN\b|71 889/);
});

test("QA r1 open trial: no price anywhere on trial pages, confirm email or trial APIs (incl. bare 299/249)", async () => {
  const src = ["app/lex/signup/trial/page.tsx", "app/lex/signup/trial/TrialForm.tsx", "app/lex/signup/trial/verify/page.tsx", "app/lex/signup/trial/verify/VerifyTrial.tsx", "app/api/lex/trial/route.ts", "app/api/lex/trial/verify/route.ts", "lib/lex-trial-copy.ts"].map((f) => readFileSync(f, "utf8")).join("\n");
  const emails = readFileSync("lib/lex-subscription-emails.ts", "utf8");
  const verifyEmail = emails.slice(emails.indexOf("export async function sendTrialVerifyEmail"), emails.indexOf("/** Internal alert to Saabai."));
  assert.ok(verifyEmail.length > 100);
  for (const [name, text] of [["pages+api", src], ["confirm email", verifyEmail]] as const) {
    assert.doesNotMatch(text, /\$\s?\d|\b(299|249)\b|\bAUD\b|per month|unlimited/i, name);
  }
  const { TRIAL_ALREADY_USED, TRIAL_GENERIC_ERROR, VERIFY_INVALID, INVITE_INVALID } = await T();
  for (const t of [TRIAL_ALREADY_USED, TRIAL_GENERIC_ERROR, VERIFY_INVALID, INVITE_INVALID]) assert.doesNotMatch(t, /\$|\b(299|249)\b/);
});

// ── Round 2: anti-competitor trial signup (Shane, 30 Oct 2:07/2:08 PM) ──
const G = () => import("../lib/lex-trial-guard");
const okDns = { resolveMx: async () => [{ exchange: "mx.firm", priority: 10 }], lookup: async () => ({ address: "1.2.3.4" }) };

test("R2 required fields: phone (AU) and firm address with postcode matching state", async () => {
  const { validateTrialContact, normaliseAuPhone, postcodeMatchesState } = await G();
  const base = { phone: "07 3000 0000", street: "1 George St", suburb: "Brisbane City", state: "QLD", postcode: "4000" };
  const ok = validateTrialContact(base);
  assert.ok(ok.ok && ok.value.phone === "0730000000" && ok.value.address.state === "QLD");
  for (const [p, n] of [["+61 400 123 456", "0400123456"], ["(02) 9000 1234", "0290001234"], ["1300 123 456", "1300123456"], ["61 8 9000 1234", "0890001234"]]) assert.equal(normaliseAuPhone(p), n, p);
  for (const p of ["12345", "+1 415 555 0100", "0500 000 000", "0400 12"]) assert.equal(normaliseAuPhone(p), null, p);
  const bad = (o: object) => { const r = validateTrialContact({ ...base, ...o }); return r.ok ? null : r.field; };
  assert.equal(bad({ phone: "" }), "phone");
  assert.equal(bad({ phone: "555-1234" }), "phone");
  assert.equal(bad({ street: "" }), "street");
  assert.equal(bad({ suburb: "" }), "suburb");
  assert.equal(bad({ state: "XX" }), "state");
  assert.equal(bad({ postcode: "40000" }), "postcode");
  assert.equal(bad({ postcode: "2000" }), "postcode", "Sydney postcode with QLD");
  for (const [pc, st] of [["2000", "NSW"], ["2600", "ACT"], ["0200", "ACT"], ["2913", "ACT"], ["3000", "VIC"], ["5000", "SA"], ["6000", "WA"], ["7000", "TAS"], ["0800", "NT"]]) assert.ok(postcodeMatchesState(pc, st), `${pc} ${st}`);
  assert.ok(!postcodeMatchesState("2600", "NSW") && !postcodeMatchesState("0800", "QLD"));
  const route = readFileSync("app/api/lex/trial/route.ts", "utf8");
  assert.match(route, /validateTrialContact\(body\)/);
  assert.match(route, /checkTrialDomain\(v\.value\.email\)/);
  const form = readFileSync("app/lex/signup/trial/TrialForm.tsx", "utf8");
  for (const n of ["name", "email", "firmName", "phone", "street", "suburb", "state", "postcode"]) assert.match(form, new RegExp(`name="${n}"[^>]*required|name="${n}"[\\s\\S]{0,80}required`), n);
  assert.doesNotMatch(form, /Phone <small>\(optional\)/);
});

test("R2 work email only: webmail/ISP and disposable refused with the friendly message", async () => {
  const { checkTrialDomain, WORK_EMAIL_REQUIRED } = await G();
  for (const e of ["a@gmail.com", "a@googlemail.com", "a@bigpond.com", "a@outlook.com.au", "a@westnet.com.au", "a@icloud.com", "a@mailinator.com", "a@yopmail.com", "a@sub.guerrillamail.com", "a@duck.com"]) {
    const r = await checkTrialDomain(e, okDns);
    assert.ok(!r.ok && r.error === WORK_EMAIL_REQUIRED, e);
  }
  assert.equal(WORK_EMAIL_REQUIRED, "Please use your firm email address.");
  assert.ok((await checkTrialDomain("jane@smithlaw.com.au", okDns)).ok);
});

test("R2 competitor blocklist: neutral message, no reason, subdomains covered, list is editable config", async () => {
  const { checkTrialDomain, TRIAL_BLOCKED, domainRule } = await G();
  const { LEX_TRIAL_BLOCKED_DOMAINS } = await import("../config/lex-trial-blocklist");
  for (const d of ["leap.com.au", "leaplegalsoftware.com", "smokeball.com.au", "smokeball.com", "clio.com", "actionstep.com", "lawpath.com.au", "lexisnexis.com.au", "lexisnexis.com", "thomsonreuters.com", "infotrack.com.au", "harvey.ai", "josef.legal"]) {
    assert.ok(LEX_TRIAL_BLOCKED_DOMAINS.includes(d), d);
    const r = await checkTrialDomain(`x@${d}`, okDns);
    assert.ok(!r.ok && r.error === TRIAL_BLOCKED, d);
  }
  assert.equal(domainRule("x@au.mail.clio.com"), "blocked");
  assert.equal(TRIAL_BLOCKED, "We couldn't start a trial for this address. Contact us.");
  assert.doesNotMatch(TRIAL_BLOCKED, /competitor|block|vendor/i);
  const { startTrial } = await T();
  const r = await startTrial(input("spy@smokeball.com"), "", mailer);
  assert.ok(!r.ok && r.error === TRIAL_BLOCKED, "enforced in startTrial too");
});

test("R2 domain must look real: MX + website, short timeout, fails closed", async () => {
  const { checkTrialDomain, domainLooksReal, DOMAIN_UNVERIFIED, DNS_TIMEOUT_MS } = await G();
  assert.ok(DNS_TIMEOUT_MS <= 3000);
  const fail = async () => { throw new Error("ENOTFOUND"); };
  assert.equal(await domainLooksReal("a@firm.com.au", { ...okDns, resolveMx: async () => [] }), false, "no MX");
  assert.equal(await domainLooksReal("a@firm.com.au", { ...okDns, resolveMx: fail }), false, "MX error");
  assert.equal(await domainLooksReal("a@firm.com.au", { ...okDns, lookup: fail }), false, "no website");
  let looked: string[] = [];
  assert.equal(await domainLooksReal("a@mail.firm.com.au", { ...okDns, lookup: async (h: string) => { looked.push(h); if (h !== "www.firm.com.au") throw new Error("x"); return {}; } }), true, "www. counts");
  assert.ok(looked.includes("firm.com.au"));
  const hang = () => new Promise<never>(() => {});
  const t0 = Date.now();
  assert.equal(await domainLooksReal("a@firm.com.au", { resolveMx: hang, lookup: hang }, 50), false, "timeout fails closed");
  assert.ok(Date.now() - t0 < 1000);
  const r = await checkTrialDomain("a@firm.com.au", { ...okDns, resolveMx: fail });
  assert.ok(!r.ok && r.error === DOMAIN_UNVERIFIED);
  looked = [];
});

test("R2 contact details stored on the firm; new trial alerts admin; admin list shows them; revoke is admin-only", async () => {
  const { requestTrial, activateTrial, trialRow, revokeTrial } = await T();
  const sub = await import("../lib/lex-subscription");
  const r = (await import("../lib/redis")).getRedis()!;
  let url = "";
  const v = { ...input("owner@contactfirm.test"), phone: "0733334444", address: { street: "1 Eagle St", suburb: "Brisbane City", state: "QLD", postcode: "4000" } };
  assert.ok((await requestTrial(v, "", async (o) => { url = o.url; }, "https://x.test")).ok);
  const alerts: string[] = [];
  const out = await activateTrial(new URL(url).searchParams.get("token"), mailer, new Date(), async (f) => { alerts.push(f.firmId); });
  assert.ok(out.ok);
  assert.deepEqual(alerts, [out.firm.firmId], "admin alerted once per new trial");
  const f = await sub.getFirm(out.firm.firmId);
  assert.equal(f?.phone, "0733334444");
  assert.equal(f?.address?.postcode, "4000");
  const row = trialRow(f!);
  assert.equal(row.domain, "contactfirm.test");
  assert.equal(row.ownerName, "Jane Citizen");
  assert.equal(row.phone, "0733334444");
  assert.equal(row.address, "1 Eagle St, Brisbane City QLD 4000");
  assert.ok(row.createdAt);
  assert.equal(await revokeTrial("lf_nope", "admin1", mailer), false);
  assert.equal(await revokeTrial(f!.firmId, "admin1", mailer), true);
  const g = await sub.getFirm(f!.firmId);
  assert.equal(g?.status, "lapsed");
  assert.equal(g?.lapseReason, "trial_ended");
  assert.equal(g?.trialRevokedBy, "admin1");
  assert.equal(await revokeTrial(f!.firmId, "admin1", mailer), false, "idempotent");
  void r;
  const api = readFileSync("app/api/admin/lex-trials/route.ts", "utf8");
  assert.match(api, /if \(!who\) return Response\.json\(\{ error: "Unauthorized" \}, \{ status: 403 \}\)[\s\S]*revokeTrial\(body\.firmId, who/);
  const ui = readFileSync("app/saabai-admin/lex-trials/LexTrialsClient.tsx", "utf8");
  assert.match(ui, /window\.confirm\([\s\S]{0,200}revokeTrial/);
  for (const h of ["Domain", "Owner", "Phone", "Address", "Created"]) assert.match(ui, new RegExp(`"${h}"`));
  const emails = readFileSync("lib/lex-trial.ts", "utf8");
  assert.match(emails, /alertNewTrial[\s\S]*lexAlert/);
});

test("R2 privacy policy and trial page disclose the contact details and watermark", async () => {
  const { LEX_TRIAL_CONTACT_COPY } = await import("../lib/lex-trial-copy");
  assert.match(LEX_TRIAL_CONTACT_COPY, /phone number/);
  assert.match(LEX_TRIAL_CONTACT_COPY, /street address/);
  assert.match(LEX_TRIAL_CONTACT_COPY, /watermark/);
  assert.match(LEX_TRIAL_CONTACT_COPY, /alert with your name, firm name and email domain, and that alert stays in our mailbox/);
  assert.match(readFileSync("app/privacy/page.tsx", "utf8"), /LEX_TRIAL_CONTACT_COPY/);
  assert.match(readFileSync("app/lex/signup/trial/page.tsx", "utf8"), /LEX_TRIAL_CONTACT_COPY/);
});

test("R2 watermark: firm + email, tiled, low opacity, click-through, trial firms, not on signup", async () => {
  const w = await import("../lib/lex-watermark");
  assert.ok(w.WATERMARK_OPACITY > 0 && w.WATERMARK_OPACITY <= 0.08, "subtle");
  assert.equal(w.watermarkText("Smith Law", "jane@smithlaw.com.au"), "Smith Law · jane@smithlaw.com.au");
  const bg = decodeURIComponent(w.watermarkBackground(w.watermarkText("A&B <Law>", "x@y.au")));
  assert.match(bg, /A&amp;B &lt;Law&gt;/, "escaped");
  assert.match(bg, /fill-opacity="0\.0\d"/);
  assert.ok(w.showWatermark({ status: "trial", firmName: "A", me: "a@b.au" }));
  assert.ok(!w.showWatermark({ status: "trial", firmName: "A", me: null }));
  assert.equal(w.showWatermark({ status: "active", firmName: "A", me: "a@b.au" }), w.WATERMARK_ALL_FIRMS);
  const c = readFileSync("app/lex/_components/Watermark.tsx", "utf8");
  assert.match(c, /pointerEvents: "none"/);
  assert.match(c, /aria-hidden="true"/);
  assert.match(c, /backgroundRepeat: "repeat"/);
  assert.match(c, /startsWith\("\/lex\/signup"\)/);
  assert.match(readFileSync("app/lex/layout.tsx", "utf8"), /<Watermark \/>/);
  assert.match(readFileSync("app/api/lex/team/route.ts", "utf8"), /me: me \?\? null/);
});

test("Lex Terms include the Free trial clause (Shane, 30 Oct 2:34 PM); draft removed; terms version bumped", async () => {
  const { LEX_TERMS } = await import("../lib/lex-terms");
  const { LEX_TERMS_VERSION } = await S();
  const c = LEX_TERMS.find((t) => t.heading === "Free trial");
  assert.ok(c, "Free trial section present");
  for (const k of [/legal software or legal AI products/, /competitive analysis/, /scrape, crawl or extract/, /reverse engineer/, /suspend or end a free trial at any time/, /One free trial per firm/]) assert.match(c!.body, k);
  assert.doesNotMatch(c!.body, /DRAFT|Status:/);
  assert.equal(LEX_TERMS_VERSION, "lex-terms-2026-10-30c");
  assert.equal((await import("node:fs")).existsSync("docs/drafts/lex-trial-terms-clause.md"), false);
});

// ── QA Part B rework ──
test("B1 deletion sweep scrubs owner name, email, phone, address and staff emails; keeps only non-PII markers", async () => {
  const { requestTrial, activateTrial, sweepTrials } = await T();
  const { getFirm, sweepDataRetention, SCRUBBED } = await S();
  const r = (await import("../lib/redis")).getRedis()!;
  let url = "";
  const v = { ...input("pii@scrubfirm.test"), phone: "0733335555", address: { street: "9 Secret Lane", suburb: "Paddington", state: "QLD", postcode: "4064" } };
  assert.ok((await requestTrial(v, "", async (o) => { url = o.url; }, "https://x.test")).ok);
  const a = await activateTrial(new URL(url).searchParams.get("token"), mailer, new Date(), async () => {});
  assert.ok(a.ok);
  const end = new Date(a.firm.trialEndsAt!);
  await sweepTrials(mailer, new Date(end.getTime() + 3600_000));
  await sweepDataRetention({ matters: async () => 0, threads: async () => {} }, (e) => `k:${e}`, async () => [], new Date(end.getTime() + 31 * DAY), { mode: "live", log: () => {} });
  const f = (await getFirm(a.firm.firmId))!;
  assert.ok(f.dataDeletedAt && f.piiScrubbedAt);
  assert.equal(f.adminName, SCRUBBED);
  assert.equal(f.phone, undefined);
  assert.equal(f.address, undefined);
  assert.deepEqual(f.members, []); assert.deepEqual(f.formerMembers, []); assert.deepEqual(f.granted, []);
  assert.match(f.adminEmail, /^deleted@lf_[a-z0-9]+\.invalid$/);
  assert.equal(f.firmName, "Deleted firm");
  assert.ok(!raw0(f).includes("scrubfirm"), "domain survives only as the HMAC claim marker");
  const raw = String(await r.get(`lex:firm:${f.firmId}`));
  for (const pii of ["pii@scrubfirm.test", "Jane Citizen", "0733335555", "Secret Lane", "Paddington"]) assert.ok(!raw.includes(pii), pii);
  assert.equal(f.status, "lapsed"); assert.equal(f.lapseReason, "trial_ended"); assert.ok(f.createdAt && f.trialEndsAt, "non-PII markers kept");
  assert.equal((await startTrial2("x@scrubfirm.test")).ok, false, "one-trial marker still refuses the firm");
  const src = readFileSync("lib/lex-subscription.ts", "utf8");
  assert.doesNotMatch(src, /a new trial still needs a new admin invite code/, "stale comment fixed");
});
async function startTrialNoSecret(email: string) { const { startTrial } = await T(); return startTrial(input(email), "", mailer); }
function raw0(f: object) { return JSON.stringify(f); }
async function startTrial2(email: string) { const { startTrial } = await T(); return startTrial(input(email), "", mailer); }

test("B2 new-trial alert carries only name, firm, domain and the admin list link", async () => {
  const { newTrialAlertText } = await T();
  const t = newTrialAlertText({ firmName: "Smith Law", adminName: "Jane Citizen", adminEmail: "jane@smithlaw.com.au" }, "https://www.saabai.ai/");
  assert.equal(t, "New Lex trial: Jane Citizen at Smith Law (smithlaw.com.au). Review or revoke: https://www.saabai.ai/saabai-admin/lex-trials");
  assert.ok(!t.includes("jane@"));
  const src = readFileSync("lib/lex-trial.ts", "utf8");
  const body = src.slice(src.indexOf("export const alertNewTrial"), src.indexOf("export async function startTrial"));
  assert.doesNotMatch(body, /phone|address|adminEmail\}/);
});

test("B3 claim markers are HMAC with an existing server secret, fail closed without one; revoke logs a line", async () => {
  const { trialClaimKey, revokeTrial, requestTrial, activateTrial } = await T();
  const { createHash, createHmac } = await import("node:crypto");
  const prev = process.env.LEX_PRIVACY_TOKEN_SECRET;
  try {
    delete process.env.LEX_PRIVACY_TOKEN_SECRET;
    const ps = process.env.PORTAL_SESSION_SECRET, ss = process.env.SAABAI_SESSION_SECRET;
    delete process.env.PORTAL_SESSION_SECRET; delete process.env.SAABAI_SESSION_SECRET;
    const errs: string[] = []; const oe = console.error; console.error = (...x: unknown[]) => { errs.push(x.join(" ")); };
    try {
      assert.throws(() => trialClaimKey("a@hm.test"), (e: Error) => e.name === "LexTrialSecretMissing", "fails closed, no sha256 fallback");
      await assert.rejects(startTrialNoSecret("a@hm.test"), (e: Error) => e.name === "LexTrialSecretMissing", "trial refused");
    } finally { console.error = oe; }
    assert.ok(errs.some((l) => l.includes("claim marker secret missing")), "clear server error log");
    void createHash;
    process.env.LEX_PRIVACY_TOKEN_SECRET = "s3cret-for-test";
    assert.equal(trialClaimKey("a@hm.test"), `lex:trial:claim:${createHmac("sha256", "s3cret-for-test").update("lex-trial:d:hm.test").digest("hex")}`);
    if (ps) process.env.PORTAL_SESSION_SECRET = ps; if (ss) process.env.SAABAI_SESSION_SECRET = ss;
  } finally { if (prev === undefined) delete process.env.LEX_PRIVACY_TOKEN_SECRET; else process.env.LEX_PRIVACY_TOKEN_SECRET = prev; }
  let url = "";
  assert.ok((await requestTrial(input("o@revlog.test"), "", async (o) => { url = o.url; }, "https://x.test")).ok);
  const a = await activateTrial(new URL(url).searchParams.get("token"), mailer, new Date(), async () => {});
  assert.ok(a.ok);
  const lines: string[] = []; const orig = console.log;
  console.log = (...x: unknown[]) => { lines.push(x.join(" ")); };
  try { assert.ok(await revokeTrial(a.firm.firmId, "admin7", mailer)); } finally { console.log = orig; }
  assert.ok(lines.some((l) => l.includes(`[lex trial] revoked firm=${a.firm.firmId} by=admin7`)), lines.join("|"));
});
