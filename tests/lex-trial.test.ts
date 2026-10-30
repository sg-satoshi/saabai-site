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
  const { createInvite, startTrial, getFoundingConfig, setFoundingConfig } = await T();
  const now = new Date("2026-11-05T00:00:00Z");
  const inv = await createInvite({ createdBy: "admin", maxUses: 10, expiresInDays: 60 }, now);
  const off = await startTrial(input("f0@found.test"), inv.code, mailer, now);
  assert.ok(off.ok && !off.firm.foundingMember, "off until an admin turns it on");
  await setFoundingConfig({ enabled: true, deadline: "2026-11-30", cap: 2 }, "admin", now);
  const cfg = await getFoundingConfig();
  assert.equal(cfg.deadline, "2026-11-30T13:59:59.000Z", "end of day Brisbane");
  const a = await startTrial(input("f1@found.test"), inv.code, mailer, now);
  const b = await startTrial(input("f2@found.test"), inv.code, mailer, now);
  const c = await startTrial(input("f3@found.test"), inv.code, mailer, now);
  assert.ok(a.ok && a.firm.foundingMember && b.ok && b.firm.foundingMember);
  assert.ok(c.ok && !c.firm.foundingMember, "cap of 2 reached");
  assert.equal((await getFoundingConfig()).used, 2);
  await setFoundingConfig({ enabled: true, deadline: "2026-11-30", cap: "" }, "admin", now);
  const late = await startTrial(input("f4@found.test"), inv.code, mailer, new Date("2026-12-01T00:00:00Z"));
  assert.ok(late.ok && !late.firm.foundingMember, "after the deadline");
  await assert.rejects(setFoundingConfig({ enabled: true, deadline: "not a date" }, "admin"));
  await assert.rejects(setFoundingConfig({ enabled: true, cap: -1 }, "admin"));
});

test("checkout price: founding price only when the env var is set AND the converting trial firm is founding; else $299 price", async () => {
  const { lexCheckoutPrice } = await T();
  const env = { STRIPE_LEX_FIRM_PRICE_ID: "price_normal", STRIPE_PRICE_LEX_FOUNDING: "price_founding" };
  assert.deepEqual(lexCheckoutPrice({ foundingMember: true }, env), { price: "price_founding", founding: true });
  assert.deepEqual(lexCheckoutPrice({ foundingMember: false }, env), { price: "price_normal", founding: false });
  assert.deepEqual(lexCheckoutPrice(null, env), { price: "price_normal", founding: false });
  assert.deepEqual(lexCheckoutPrice({ foundingMember: true }, { STRIPE_LEX_FIRM_PRICE_ID: "price_normal" }), { price: "price_normal", founding: false });
  assert.deepEqual(lexCheckoutPrice({ foundingMember: true }, { ...env, STRIPE_PRICE_LEX_FOUNDING: "  " }), { price: "price_normal", founding: false });
  const route = readFileSync("app/api/lex/signup/route.ts", "utf8");
  assert.match(route, /lexCheckoutPrice\(trialFirm\)/);
  assert.match(route, /convertibleTrialFirm\(v\.value\.email\)/);
});
