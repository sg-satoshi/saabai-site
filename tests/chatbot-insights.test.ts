import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildFunnel, groupTranscripts, isMonth, mergeFunnels, retentionCutoff } from "../lib/chatbot/insights";

test("funnel: counts and rates, junk ignored, no divide by zero", () => {
  const f = buildFunnel("2026-10", { conversation_started: "10", cta_shown: 8, cta_click: 2, review_shown: 0, review_click: 3, evil: 99, field_email: -4 });
  const by = Object.fromEntries(f.steps.map((s) => [s.key, s]));
  assert.equal(by.cta_click.count, 2); assert.equal(by.cta_click.rate, 25);
  assert.equal(by.cta_shown.rate, 80);
  assert.equal(by.review_click.rate, null);
  assert.equal(by.field_email.count, 0);
  assert.ok(!("evil" in by));
  assert.equal(buildFunnel("2026-10", null).steps[0].count, 0);
});

test("merged funnels add counts and recompute the rate", () => {
  const a = buildFunnel("2026-10", { conversation_started: 10, cta_shown: 4 });
  const b = buildFunnel("2026-10", { conversation_started: 5, cta_shown: 5 });
  const m = mergeFunnels([a, b]);
  const by = Object.fromEntries(m.steps.map((s) => [s.key, s]));
  assert.equal(m.month, "2026-10");
  assert.equal(by.conversation_started.count, 15);
  assert.equal(by.cta_shown.count, 9);
  assert.equal(by.cta_shown.rate, 60);
  assert.equal(mergeFunnels([]).steps[0].count, 0);
});

test("month validation", () => {
  assert.ok(isMonth("2026-10")); assert.ok(!isMonth("2026-13")); assert.ok(!isMonth("x:*"));
});

test("transcripts: grouped, sorted, 90 day cutoff, roles filtered", () => {
  const now = Date.parse("2026-10-30T00:00:00Z");
  const cut = retentionCutoff(now);
  assert.equal(cut, "2026-08-01T00:00:00.000Z");
  const rows = [
    { conversation_id: "a", role: "assistant", content: "hi", created_at: "2026-10-02T00:00:01Z" },
    { conversation_id: "a", role: "user", content: "hello", created_at: "2026-10-02T00:00:00Z" },
    { conversation_id: "b", role: "user", content: "new", created_at: "2026-10-20T00:00:00Z" },
    { conversation_id: "old", role: "user", content: "x", created_at: "2026-07-01T00:00:00Z" },
    { conversation_id: "a", role: "system", content: "secret", created_at: "2026-10-02T00:00:02Z" },
  ];
  const t = groupTranscripts(rows, () => true, cut);
  assert.deepEqual(t.map((x) => x.id), ["b", "a"]);
  assert.deepEqual(t[1].messages.map((m) => m.content), ["hello", "hi"]);
});

test("routes: portal slug from session only, admin needs readActor, transcripts toggle respected", () => {
  const portal = readFileSync("app/api/portal/chatbot/insights/route.ts", "utf8");
  assert.match(portal, /resolvePortalBilling/); assert.match(portal, /decidePortalBot/);
  assert.doesNotMatch(portal, /searchParams\.get\("slug"\)/);
  assert.match(portal, /effectiveEngage\(cfg\.engage\)\.transcripts/);
  assert.doesNotMatch(portal, /POST/);
  const admin = readFileSync("app/api/admin/chatbots/insights/route.ts", "utf8");
  assert.match(admin, /readActor\(\)/);
  assert.match(admin, /historyBotIds/);
  assert.match(admin, /retentionDays: 90/);
  assert.doesNotMatch(admin, /\bPOST\b/);
  const lib = readFileSync("lib/chatbot/insights.ts", "utf8");
  assert.match(lib, /\.eq\("bot_slug", slug\)/); assert.match(lib, /\.gte\("created_at", cutoff\)/);
});
