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
