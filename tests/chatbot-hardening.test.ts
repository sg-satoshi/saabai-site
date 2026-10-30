/** Chatbot hardening: event beacon rate limits and admin locks on the conversion playbook. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_ENGAGE, ENGAGE_FIELDS, mergeClientEngage, toPublicEngage, validateEngage, type EngageConfig } from "../lib/chatbot/engage";
import { clientSaveEngage, portalView } from "../lib/chatbot/portal";
import { EVENT_LIMIT_PER_BOT, EVENT_LIMIT_PER_IP, eventRateKeys, eventRateLimited } from "../lib/chatbot/ratelimit";

function fakeRedis(fail = false) {
  const m = new Map<string, number>();
  return { m, incr: async (k: string) => { if (fail) throw new Error("down"); const n = (m.get(k) ?? 0) + 1; m.set(k, n); return n; }, expire: async () => 1 };
}
const req = (ip: string) => new Request("https://saabai.ai/api/chat-platform/event", { headers: { "x-forwarded-for": `${ip}, 10.0.0.1` } });

test("event beacon: per IP limit blocks after the cap, other IPs still pass", async () => {
  const r = fakeRedis(); const now = 1_800_000_000_000;
  for (let i = 0; i < EVENT_LIMIT_PER_IP; i++) assert.equal(await eventRateLimited(req("1.1.1.1"), "acme", r, now), false);
  assert.equal(await eventRateLimited(req("1.1.1.1"), "acme", r, now), true);
  assert.equal(await eventRateLimited(req("2.2.2.2"), "acme", r, now), false);
  assert.equal(await eventRateLimited(req("1.1.1.1"), "other", r, now), false, "limit is per bot");
  assert.equal(await eventRateLimited(req("1.1.1.1"), "acme", r, now + 60_000), false, "next minute resets");
});

test("event beacon: per bot limit caps a distributed flood", async () => {
  const r = fakeRedis(); const now = 1_800_000_000_000;
  for (let i = 0; i < EVENT_LIMIT_PER_BOT; i++) assert.equal(await eventRateLimited(req(`9.9.${i >> 8}.${i & 255}`), "acme", r, now), false);
  assert.equal(await eventRateLimited(req("8.8.8.8"), "acme", r, now), true);
});

test("event beacon: fails open and never stores the raw IP", async () => {
  assert.equal(await eventRateLimited(req("1.1.1.1"), "acme", fakeRedis(true)), false);
  const r = fakeRedis(); await eventRateLimited(req("203.0.113.7"), "acme", r);
  for (const k of r.m.keys()) assert.ok(!k.includes("203.0.113.7"));
  const k = eventRateKeys("acme", "abc", 0); assert.match(k.ip, /^saabai:chat:rl:ev:ip:acme:abc:0$/);
});

test("event route checks the rate limit before counting anything", () => {
  const src = readFileSync("app/api/chat-platform/event/route.ts", "utf8");
  const rl = src.indexOf("eventRateLimited(req, slug)"); const rec = src.indexOf("recordChatEvent(slug, event)");
  assert.ok(rl > 0 && rl < rec);
  assert.match(src, /status: 429/);
});

const stored: EngageConfig = { ...DEFAULT_ENGAGE, emailCopy: false, idleSeconds: 30, exitIntent: false, testimonials: [{ quote: "Great work", name: "Sam" }], locked: ["emailCopy", "nudges", "testimonials"] };

test("playbook locks: admin can set locks, unknown fields are dropped", () => {
  const v = validateEngage({ ...DEFAULT_ENGAGE, locked: ["emailCopy", "bogus", "reviews"] });
  assert.ok(v.ok); assert.deepEqual(v.ok && v.value.locked, ["emailCopy", "reviews"]);
  assert.ok(ENGAGE_FIELDS.includes("nudges"));
});

test("playbook locks: client cannot change locked settings or the lock list", () => {
  const r = clientSaveEngage(stored, { ...DEFAULT_ENGAGE, emailCopy: true, idleSeconds: 60, exitIntent: true, scrollPercent: 50, testimonials: [{ quote: "Made up", name: "X" }], microCommit: false, locked: [] });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.value.emailCopy, false);
  assert.equal(r.value.idleSeconds, 30); assert.equal(r.value.exitIntent, false); assert.equal(r.value.scrollPercent, 0);
  assert.deepEqual(r.value.testimonials, [{ quote: "Great work", name: "Sam" }]);
  assert.equal(r.value.microCommit, false, "unlocked settings still save");
  assert.deepEqual(r.value.locked, ["emailCopy", "nudges", "testimonials"]);
});

test("playbook locks: a bad value in a locked field cannot block or change a save", () => {
  const r = clientSaveEngage({ ...DEFAULT_ENGAGE, locked: ["offer"] }, { ...DEFAULT_ENGAGE, offer: { text: "Hurry, only 3 left", endsOn: "" } });
  assert.ok(r.ok); assert.equal(r.ok && r.value.offer, undefined);
});

test("playbook locks: no locks means client values save, and locks never reach the widget", () => {
  const m = mergeClientEngage(undefined, { ...DEFAULT_ENGAGE, emailCopy: true, locked: ["emailCopy"] });
  assert.equal(m.emailCopy, true); assert.equal(m.locked, undefined);
  assert.ok(!("locked" in toPublicEngage(stored, { leadCapture: true })));
  assert.deepEqual(portalView("acme", undefined, stored).engageLocked, ["emailCopy", "nudges", "testimonials"]);
});

test("portal route passes the stored playbook so locks are enforced server-side", () => {
  const src = readFileSync("app/api/portal/chatbot/route.ts", "utf8");
  assert.match(src, /clientSaveEngage\(cfg\.engage, body\.engage\)/);
  assert.match(readFileSync("app/saabai-admin/chatbots/ChatbotEditor.tsx", "utf8"), /mode="admin"/);
});
