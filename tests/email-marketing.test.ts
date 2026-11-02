/**
 * SUNDER email marketing MVP. No network, no SES, no Supabase.
 * Run: npx tsx --test tests/email-marketing.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSesCommandInput } from "../lib/email/ses";
import { listUnsubscribeHeader, renderMarketingEmail } from "../lib/email/message";
import { afterQuiet, isQuiet, seriesRunAt } from "../lib/email/quiet";
import { acquireSendSlot, type RateCounter } from "../lib/email/rate";
import {
  classifySesError, confirmationKey, fromDomainAllowed, mailableContacts, oneAddress,
  shouldQueueConfirmation, validateSeriesSteps,
} from "../lib/email/rules";
import { SUNDER_IDENTITY } from "../lib/email/constants";
import { SUNDER_LOGO_URL, documentHtml, textToBlocks } from "../lib/email/blocks";
import { MIN_SENDS_FOR_RATES, rateDecision, sendBlocked, splitByDailyCap } from "../lib/email/gates";
import { readEmailToken, signEmailToken } from "../lib/email/tokens";
import { drainOutbox, type Outbox, type OutboxRow } from "../lib/email/worker";

const SECRET = "unit-test-secret-0123456789abcdef";
const sql = readFileSync("db/migrations/009_email_marketing.sql", "utf8");

function row(over: Partial<OutboxRow> = {}): OutboxRow {
  return {
    id: "send-1",
    toEmail: "sam@example.com",
    kind: "marketing",
    subject: "Hello {{firstName|there}}",
    html: "<p>Hi {{firstName|there}}</p>",
    fromName: "SUNDER",
    respectQuiet: false,
    contactStatus: "subscribed",
    confirmedAt: "2026-11-01T00:00:00Z",
    firstName: "Sam",
    campaignId: "11111111-2222-4333-8444-555555555555",
    identity: { ...SUNDER_IDENTITY },
    ...over,
  };
}

function memoryOutbox(rows: OutboxRow[], suppressed = new Set<string>()) {
  const state = new Map<string, string>(rows.map((r) => [r.id, "pending"]));
  const sentIds = new Map<string, string>();
  const reasons = new Map<string, string>();
  const box: Outbox = {
    async claim(limit) {
      return rows.filter((r) => state.get(r.id) === "pending").slice(0, limit).map((r) => {
        state.set(r.id, "sending");
        return r;
      });
    },
    async markSent(id, messageId) { state.set(id, "sent"); sentIds.set(id, messageId); },
    async markFailed(id, error) { state.set(id, "failed"); reasons.set(id, error); },
    async markSkipped(id, reason) { state.set(id, "skipped"); reasons.set(id, reason); },
    async release(id) { state.set(id, "pending"); },
    async suppressed() { return suppressed; },
  };
  return { box, state, sentIds, reasons };
}

test("marketing mail names the sender and carries one-click unsubscribe", () => {
  const token = signEmailToken({ k: "unsub", t: "sunder", e: "sam@example.com", iat: 1_700_000_000 }, SECRET);
  const page = `https://saabai.ai/email/u?t=${token}`;
  const api = `https://saabai.ai/api/email/unsubscribe?t=${token}`;
  const rendered = renderMarketingEmail({
    subject: "Hello {{firstName|there}}",
    html: "<p>Hi {{firstName|there}}</p>",
    fromName: "SUNDER",
    identity: SUNDER_IDENTITY,
    unsubUrl: page,
    values: { firstName: "Sam" },
  });
  assert.equal(rendered.from, "SUNDER <hello@sunder.com.au>");
  assert.equal(rendered.subject, "Hello Sam");
  assert.match(rendered.html, /ABN 44 703 735 264/);
  assert.match(rendered.html, /31 Bourton Road, Merrimac QLD 4226 Australia/);
  assert.match(rendered.html, /Saabai Pty Ltd for SUNDER/);
  assert.match(rendered.html, /hello@sunder.com.au/);
  assert.match(rendered.html, /you joined the SUNDER waitlist and agreed to hear from us/);
  assert.match(rendered.html, new RegExp(page.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(rendered.text, /Unsubscribe in one click/);
  const headers = listUnsubscribeHeader(api, "mailto:hello@sunder.com.au?subject=unsubscribe");
  assert.equal(headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.match(headers["List-Unsubscribe"], /<https:\/\/saabai\.ai\/api\/email\/unsubscribe/);
  assert.match(headers["List-Unsubscribe"], /<mailto:hello@sunder.com.au\?subject=unsubscribe>/);
  const input = buildSesCommandInput({
    from: rendered.from,
    to: "sam@example.com",
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    headers,
    tenantName: "sunder",
    tags: [{ Name: "tenant", Value: "sunder" }, { Name: "campaign", Value: "camp-1" }],
  });
  assert.equal(input.TenantName, "sunder");
  assert.equal(input.ConfigurationSetName, undefined);
  assert.equal(input.Destination?.ToAddresses?.[0], "sam@example.com");
  const withSet = buildSesCommandInput({
    from: rendered.from, to: "sam@example.com", subject: "Hi", html: "<p>x</p>", text: "x", headers: {},
    tenantName: "sunder", configurationSetName: "cs-sunder",
  });
  assert.equal(withSet.ConfigurationSetName, "cs-sunder");
});

test("unsubscribe tokens do not expire and confirmation tokens do", () => {
  const now = 1_800_000_000;
  const unsub = signEmailToken({ k: "unsub", t: "sunder", e: "sam@example.com", iat: now - 10_000_000 }, SECRET);
  assert.equal(readEmailToken(unsub, SECRET, "unsub", now)?.e, "sam@example.com");
  assert.equal(readEmailToken(unsub, SECRET, "confirm", now), null);
  const confirm = signEmailToken({ k: "confirm", t: "sunder", e: "sam@example.com", iat: now }, SECRET);
  assert.equal(readEmailToken(confirm, SECRET, "confirm", now)?.t, "sunder");
  assert.equal(readEmailToken(confirm, SECRET, "confirm", now + 15 * 24 * 3600), null);
  assert.equal(readEmailToken(confirm.slice(0, -2) + "aa", SECRET, "confirm", now), null);
  assert.equal(readEmailToken(confirm, "other-secret", "confirm", now), null);
});

test("only confirmed subscribed contacts are mailable", () => {
  const suppressed = new Set(["gone@x.co"]);
  const gate = mailableContacts([
    { email: "ok@x.co", status: "subscribed", confirmedAt: "2026-01-01" },
    { email: "new@x.co", status: "pending", confirmedAt: null },
    { email: "old@x.co", status: "subscribed", confirmedAt: null },
    { email: "gone@x.co", status: "subscribed", confirmedAt: "2026-01-01" },
    { email: "stop@x.co", status: "unsubscribed", confirmedAt: "2026-01-01" },
  ], suppressed);
  assert.deepEqual(gate.recipients.map((r) => r.email), ["ok@x.co"]);
  assert.equal(gate.suppressed, 1);
  assert.equal(gate.held, 3);
  assert.equal(oneAddress("success@simulator.amazonses.com"), "success@simulator.amazonses.com");
  assert.equal(oneAddress("a@b.co, c@d.co"), null);
  assert.equal(fromDomainAllowed("hello@sunder.com.au"), true);
  assert.equal(fromDomainAllowed("hello@evil.test"), false);
});

test("new signups queue a confirmation and existing confirmed rows do not", () => {
  assert.equal(shouldQueueConfirmation(true, "pending"), true);
  assert.equal(shouldQueueConfirmation(false, "confirmed"), false);
  assert.equal(shouldQueueConfirmation(false, "pending"), true);
  assert.equal(shouldQueueConfirmation(false, "unsubscribed"), false);
  const day = confirmationKey("Sam@Example.com", new Date("2026-11-02T12:00:00Z"));
  assert.equal(day, confirmationKey("sam@example.com", new Date("2026-11-02T23:00:00Z")));
  assert.notEqual(day, confirmationKey("sam@example.com", new Date("2026-11-03T00:00:00Z")));
});

test("quiet hours hold series mail until 7am Brisbane", () => {
  const noon = new Date("2026-11-02T02:00:00Z"); // 12:00 Brisbane
  const ninePm = new Date("2026-11-02T11:00:00Z"); // 21:00 Brisbane
  const sixThirty = new Date("2026-11-01T20:30:00Z"); // 06:30 Brisbane on the 2nd
  const seven = new Date("2026-11-01T21:00:00Z"); // 07:00 Brisbane
  assert.equal(isQuiet(noon), false);
  assert.equal(afterQuiet(noon).toISOString(), noon.toISOString());
  assert.equal(isQuiet(ninePm), true);
  assert.equal(afterQuiet(ninePm).toISOString(), "2026-11-02T21:00:00.000Z");
  assert.equal(afterQuiet(sixThirty).toISOString(), "2026-11-01T21:00:00.000Z");
  assert.equal(isQuiet(seven), false);
  const enrolled = new Date("2026-11-02T01:00:00Z");
  const day3 = seriesRunAt(enrolled, 3 * 24 * 60, enrolled);
  assert.equal(day3.toISOString(), new Date(enrolled.getTime() + 3 * 24 * 60 * 60_000).toISOString());
});

test("the shared rate limit stays at 10 sends in one second", async () => {
  const counts = new Map<string, number>();
  const counter: RateCounter = {
    async incr(key) { const n = (counts.get(key) || 0) + 1; counts.set(key, n); return n; },
    async decr(key) { const n = (counts.get(key) || 0) - 1; counts.set(key, n); return n; },
    async expire() { return 1; },
  };
  const now = 1_700_000_000_000;
  let ok = 0;
  for (let i = 0; i < 12; i++) if ((await acquireSendSlot(counter, now)).ok) ok++;
  assert.equal(ok, 10);
  assert.equal([...counts.values()][0], 10);
  const local = await acquireSendSlot(null, now);
  assert.equal(local.ok, true);
  assert.equal(local.waitMs, 100);
});

test("the outbox skips suppressed and unconfirmed rows, pauses, and does not retry an accepted send", async () => {
  const calls: string[] = [];
  const box = memoryOutbox([
    row({ id: "ok" }),
    row({ id: "held", contactStatus: "pending", confirmedAt: null, toEmail: "new@example.com" }),
    row({ id: "stop", toEmail: "stop@example.com" }),
  ], new Set(["stop@example.com"]));
  const sent = await drainOutbox({
    outbox: box.box,
    send: async (msg) => {
      calls.push(msg.to);
      assert.equal(msg.tenantName, "sunder");
      assert.equal(msg.configurationSetName, undefined);
      assert.equal(msg.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
      assert.match(msg.html, /ABN 44 703 735 264/);
      return { messageId: "ses-1" };
    },
    acquire: async () => ({ ok: true, waitMs: 0 }),
    paused: false,
    quiet: false,
    secret: SECRET,
    nowSec: 1_800_000_000,
  });
  assert.deepEqual(calls, ["sam@example.com"]);
  assert.equal(sent.sent, 1);
  assert.equal(sent.skipped, 2);
  assert.equal(box.sentIds.get("ok"), "ses-1");
  assert.equal(box.state.get("ok"), "sent");
  assert.equal(box.reasons.get("held"), "not_confirmed");
  assert.equal(box.reasons.get("stop"), "suppressed");

  const paused = await drainOutbox({
    outbox: memoryOutbox([row()]).box,
    send: async () => { throw new Error("should not send"); },
    acquire: async () => ({ ok: true, waitMs: 0 }),
    paused: true,
    quiet: false,
    secret: SECRET,
  });
  assert.equal(paused.paused, true);
  assert.equal(paused.sent, 0);
});

test("throttles go back to pending and uncertain errors are not retried", async () => {
  const hot = row({ id: "hot" });
  let claims = 0;
  const state = { value: "pending" };
  const throttled = await drainOutbox({
    outbox: {
      async claim() {
        if (state.value !== "pending" || claims > 0) return [];
        claims++;
        state.value = "sending";
        return [hot];
      },
      async markSent() { state.value = "sent"; },
      async markFailed() { state.value = "failed"; },
      async markSkipped() { state.value = "skipped"; },
      async release() { state.value = "pending"; },
      async suppressed() { return new Set(); },
    },
    send: async () => { const err = new Error("Too many requests"); err.name = "Throttling"; throw err; },
    acquire: async () => ({ ok: true, waitMs: 0 }),
    paused: false,
    quiet: false,
    secret: SECRET,
    sleep: async () => {},
  });
  assert.equal(throttled.released, 1);
  assert.equal(state.value, "pending");
  assert.equal(classifySesError(Object.assign(new Error("timeout"), { name: "TimeoutError" })), "uncertain");

  const failed = memoryOutbox([row({ id: "bad" })]);
  const result = await drainOutbox({
    outbox: failed.box,
    send: async () => { const err = new Error("address not verified"); err.name = "MessageRejected"; throw err; },
    acquire: async () => ({ ok: true, waitMs: 0 }),
    paused: false,
    quiet: false,
    secret: SECRET,
    limit: 1,
  });
  assert.equal(result.failed, 1);
  assert.equal(failed.state.get("bad"), "failed");
  assert.match(failed.reasons.get("bad") || "", /MessageRejected/);
});

test("welcome steps are day 0, 3 and 7 and series delays must move forward", () => {
  assert.match(sql, /\(0, 0, 'welcome-1'\), \(1, 4320, 'welcome-2'\), \(2, 10080, 'welcome-3'\)/);
  assert.equal(validateSeriesSteps([
    { position: 0, delayDays: 0, subject: "A", body: "B" },
    { position: 1, delayDays: 3, subject: "C", body: "D" },
    { position: 2, delayDays: 7, subject: "E", body: "F" },
  ]), null);
  assert.match(validateSeriesSteps([
    { position: 0, delayDays: 7, subject: "A", body: "B" },
    { position: 1, delayDays: 1, subject: "C", body: "D" },
  ]) || "", /later/);
});

test("migration keeps existing consent, defaults new rows to pending, and sends without a config set", () => {
  assert.match(sql, /set marketing_status = 'confirmed' where marketing_status is null/);
  assert.match(sql, /set default 'pending'/);
  assert.match(sql, /set confirmed_at = consent_at/);
  assert.match(sql, /ses_tenant_name/);
  assert.match(sql, /'sunder', 'ready'/);
  assert.match(sql, /config_set, ses_tenant_name, status/);
  assert.match(sql, /null, 'sunder', 'ready'/);
  assert.match(sql, /for update skip locked/);
  assert.match(sql, /function email_unsubscribe/);
  assert.match(sql, /error = 'unsubscribed'/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /grant execute on function email_claim_sends\(int, boolean\) to service_role/);
  assert.match(sql, /Apply by hand/);
  assert.doesNotMatch(sql, /create configuration set|CreateConfigurationSet/i);
});

test("send stays locked without a matching test, and over 500 needs typed SEND", () => {
  const hash = "abc";
  assert.match(sendBlocked({ paused: false, audience: 10, testHash: null, contentHash: hash }) || "", /test/);
  assert.match(sendBlocked({ paused: false, audience: 10, testHash: "old", contentHash: hash }) || "", /test/);
  assert.equal(sendBlocked({ paused: false, audience: 10, testHash: hash, contentHash: hash }), null);
  assert.equal(sendBlocked({ paused: false, audience: 500, testHash: hash, contentHash: hash }), null);
  assert.match(sendBlocked({ paused: false, audience: 501, testHash: hash, contentHash: hash }) || "", /SEND/);
  assert.equal(sendBlocked({ paused: false, audience: 501, testHash: hash, contentHash: hash, confirm: "SEND" }), null);
  assert.match(sendBlocked({ paused: false, audience: 0, testHash: hash, contentHash: hash }) || "", /Nobody/);
  assert.match(sendBlocked({ paused: true, audience: 10, testHash: hash, contentHash: hash }) || "", /paused/);
  assert.deepEqual(splitByDailyCap(4100, 0, 2000), { today: 2000, later: 2100 });
  assert.deepEqual(splitByDailyCap(320, 1240, 2000), { today: 320, later: 0 });
});

test("health rates stay hidden under 500 sends in 7 days", () => {
  assert.equal(MIN_SENDS_FOR_RATES, 500);
  assert.equal(rateDecision(499, 40, 1).rates, null);
  assert.equal(rateDecision(499, 40, 1).pause, null);
  const over = rateDecision(500, 25, 0);
  assert.ok(over.rates);
  assert.match(over.pause || "", /Bounce/);
  assert.equal(rateDecision(1000, 10, 0).pause, null);
});

test("the SUNDER document uses the hosted logo and fallback fonts", () => {
  const html = documentHtml({ preheader: "First look", blocks: textToBlocks("Hello {{firstName|there}}") });
  assert.match(html, new RegExp(SUNDER_LOGO_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(html, /Archivo, Arial Black, Arial/);
  assert.match(html, /Inter Tight, Arial/);
  assert.match(html, /EMAIL_FOOTER/);
  assert.doesNotMatch(html, /@font-face/);
});

test("routes, cron and the public proxy list match the module", () => {
  const proxy = readFileSync("proxy.ts", "utf8");
  const pub = proxy.slice(proxy.indexOf("const PUBLIC_API"), proxy.indexOf("const ADMIN_API"));
  assert.match(pub, /\/api\/email\/unsubscribe/);
  assert.match(pub, /\/api\/email\/confirm/);
  assert.doesNotMatch(pub, /\/api\/admin\/email/);
  const cron = readFileSync("app/api/cron/email-send/route.ts", "utf8");
  assert.match(cron, /Bearer \$\{process\.env\.CRON_SECRET\}/);
  assert.match(cron, /status: 401/);
  const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
  const job = vercel.crons.find((c: { path: string }) => c.path === "/api/cron/email-send");
  assert.equal(job.schedule, "* * * * *");
  assert.match(readFileSync("app/saabai-admin/email/page.tsx", "utf8"), /await requireAdmin\(/);
  assert.match(readFileSync("app/api/admin/email/route.ts", "utf8"), /requireAdminSession/);
  assert.match(readFileSync("app/api/email/unsubscribe/route.ts", "utf8"), /status: 405/);
  assert.match(readFileSync("lib/email/ses.ts", "utf8"), /ConfigurationSetName is set only when/);
  assert.equal(readFileSync("lib/website-tiers.ts", "utf8").includes("email_tenants"), false);
});
