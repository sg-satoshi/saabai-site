import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CTA_META, CTA_STEPS, ctaHref, isCtaStep, newSessionId } from "../lib/mia-cta";

test("every step has a tracked link with UTM and session id", () => {
  for (const step of CTA_STEPS) {
    const u = new URL(ctaHref(step, { page: "/blueprint", sid: "mia_abc" }));
    assert.equal(u.searchParams.get("utm_source"), "mia");
    assert.equal(u.searchParams.get("utm_medium"), "chat");
    assert.equal(u.searchParams.get("utm_campaign"), `mia_${step}`);
    assert.equal(u.searchParams.get("utm_content"), "/blueprint");
    assert.equal(u.searchParams.get("utm_term"), "mia_abc");
  }
  assert.ok(ctaHref("score").startsWith("https://www.saabai.ai/score?"));
  assert.ok(ctaHref("call").startsWith("https://calendly.com/shanegoldberg/30min?"));
});

test("price hints come from the offers file and say GST not applicable", () => {
  assert.match(CTA_META.blueprint.sub, /\$497/);
  assert.match(CTA_META.websites.sub, /\$2,000 \+ \$100\/mo/);
  for (const s of [CTA_META.blueprint.sub, CTA_META.websites.sub]) assert.match(s, /GST not applicable/);
});

test("step guard and session ids", () => {
  assert.ok(isCtaStep("score"));
  assert.equal(isCtaStep("discount"), false);
  const a = newSessionId(); const b = newSessionId();
  assert.match(a, /^mia_[0-9a-f]{16}$/);
  assert.notEqual(a, b);
});

test("route exposes suggest_next_step and widget always shows Talk to Shane", () => {
  assert.match(readFileSync("app/api/chat/route.ts", "utf8"), /suggest_next_step: tool\(/);
  const w = readFileSync("app/components/ChatWidget.tsx", "utf8");
  assert.match(w, /Talk to Shane/);
  assert.ok(!w.includes('href="https://calendly.com'), "no untracked Calendly links");
});
