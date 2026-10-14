import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeTouch, touchFrom, parseAttr, serialiseAttr, attrMetadata, attrFromMetadata } from "../lib/growth/attribution";
import { renderDigest } from "../lib/growth/digest";
import { splitSections, sectionItems, limitFor, cleanBrief } from "../lib/pulse/types";

test("first touch is kept, last touch updates", () => {
  const a = mergeTouch(null, touchFrom(new URL("https://saabai.ai/score?utm_source=fb&utm_medium=paid&utm_campaign=oct"), null, "saabai.ai"), "/score")!;
  assert.equal(a.f.s, "fb");
  const b = mergeTouch(a, touchFrom(new URL("https://saabai.ai/blueprint"), "https://www.google.com/", "saabai.ai"), "/blueprint")!;
  assert.equal(b.f.s, "fb");
  assert.equal(b.l.s, "google.com");
  assert.equal(mergeTouch(b, touchFrom(new URL("https://saabai.ai/x"), "https://saabai.ai/", "saabai.ai"), "/x"), null);
  const plain = JSON.parse(JSON.stringify(b));
  assert.deepEqual(parseAttr(serialiseAttr(b)), plain);
  assert.deepEqual(attrFromMetadata(attrMetadata(b)), plain);
});

test("direct visit gets a direct first touch, referral codes tagged", () => {
  assert.equal(mergeTouch(null, null, "/")!.f.s, "direct");
  const r = touchFrom(new URL("https://saabai.ai/r/ABC123"), null, "saabai.ai", "ABC123")!;
  assert.equal(r.ref, "ABC123");
  assert.equal(r.m, "referral");
});

test("pulse sections parse and limits apply", () => {
  const s = splitSections("## Headlines\n1. One\n2. Two\n## Call to Action\n1. Go");
  assert.deepEqual(sectionItems(s.Headlines!), ["One", "Two"]);
  assert.equal(limitFor("headline", ["Meta", "Google"]), 30);
  assert.equal(limitFor("primary", ["Meta", "Google"]), 125);
  assert.equal(cleanBrief({ product: "x" }), null);
  assert.deepEqual(cleanBrief({ product: "a", audience: "b", goal: "c", platforms: ["Bogus"] })!.platforms, ["Meta"]);
});

test("digest renders and escapes", () => {
  const { subject, html } = renderDigest({ weekLabel: "6 Oct to 13 Oct", leads: 3, scores: 4, sales: [{ label: "Blueprint Pro", count: 1, cents: 149700 }], salesCents: 149700, mrrCents: 430000, activePlans: 26, newPlans: 1, cancelledPlans: 0, blueprintsDue: [{ firm: "<b>x</b>", tier: "pro", status: "assessment", overdue: true }], failedPayments: [], topSources: [] });
  assert.match(subject, /3 leads/);
  assert.match(html, /&lt;b&gt;x/);
  assert.match(html, /\$4,300/);
});

import { computeFunnel, computeAttribution, upsellCopy } from "../lib/growth/growth2";
test("funnel counts and conversion", () => {
  const ev = (c: string, type: string, d: number, meta = {}) => ({ id: c + type, contactId: c, type, occurredAt: new Date(Date.UTC(2026, 9, d)).toISOString(), meta } as never);
  const rows = computeFunnel([ev("a", "score_taken", 1), ev("b", "score_taken", 1), ev("a", "blueprint_purchased", 4, { tier: "pro" })]);
  assert.equal(rows[0].count, 2);
  assert.equal(rows[1].count, 1);
  assert.equal(rows[1].pctOfPrev, 50);
  assert.equal(rows[1].medianDaysFromPrev, 3);
  const at = computeAttribution([ev("a", "blueprint_purchased", 4, { source: { s: "fb", t: 1 } })]);
  assert.equal(at[0].source, "fb");
});
test("upsell copy uses saabai.ai links and the credit", () => {
  const c = upsellCopy("Tom Reilly", "Growth", 149700, "2026-11-13T00:00:00Z");
  assert.match(c.body, /Hi Tom/);
  assert.match(c.body, /\$1,497/);
  assert.match(c.body, /https:\/\/saabai\.ai\//);
  assert.doesNotMatch(c.body, /saab\.ai/);
});
