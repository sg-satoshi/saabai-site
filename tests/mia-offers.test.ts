import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderOffersForPrompt, WEBSITE_PLANS, GST_LINE } from "../lib/mia-offers";
import { TIERS } from "../lib/blueprint";
import { SYSTEM_PROMPT } from "../lib/chat-prompt";
import { WEBSITE_TIERS } from "../lib/website-tiers";

const aud = (n: number) => `$${n.toLocaleString("en-AU")}`;

test("offers block lists every Blueprint tier at checkout prices", () => {
  const block = renderOffersForPrompt();
  for (const t of Object.values(TIERS)) assert.ok(block.includes(`${t.name}: ${t.priceLabel} one-off`), t.name);
  assert.deepEqual(Object.values(TIERS).map((t) => t.price).sort((a, b) => a - b), [497, 1497, 3500]);
});

test("website plans match the shared tiers the site renders", () => {
  assert.equal(WEBSITE_PLANS.length, WEBSITE_TIERS.length);
  for (let i = 0; i < WEBSITE_TIERS.length; i++) {
    const plan = WEBSITE_PLANS[i];
    const tier = WEBSITE_TIERS[i];
    assert.equal(plan.name, tier.name);
    assert.equal(plan.build, tier.buildFrom);
    assert.equal(plan.monthly, tier.monthly);
    assert.equal(plan.summary, tier.description);
    assert.ok(tier.homePoints.every((point) => tier.features.includes(point)), tier.name);
  }
  const page = readFileSync("app/websites/page.tsx", "utf8");
  const home = readFileSync("app/page.tsx", "utf8");
  const receptionist = readFileSync("app/ai-receptionist-gold-coast/page.tsx", "utf8");
  assert.match(page, /WEBSITE_TIERS/);
  assert.match(page, /websiteCareFaqAnswer/);
  assert.match(home, /WEBSITE_TIERS/);
  assert.match(receptionist, /WEBSITE_TIERS/);
  for (const file of [home, receptionist]) {
    assert.doesNotMatch(file, /Starter site|Growth site|Optional chatbot|Custom, quoted/);
  }
  const block = renderOffersForPrompt();
  for (const tier of WEBSITE_TIERS) {
    assert.ok(block.includes(`${tier.name}: from ${aud(tier.buildFrom)} one-off build, then ${aud(tier.monthly)}/month care.`), tier.name);
  }
});

test("prompt: GST not applicable, AI disclosure, no stale offer text", () => {
  assert.ok(SYSTEM_PROMPT.includes(GST_LINE));
  assert.ok(SYSTEM_PROMPT.includes("GST not applicable"));
  assert.ok(/You are an AI and you say so/.test(SYSTEM_PROMPT));
  assert.ok(SYSTEM_PROMPT.includes("/score") && SYSTEM_PROMPT.includes("/blueprint"));
  for (const stale of ["AI Audit", "the audit is a few thousand", "five to twenty-five thousand", "Never quote prices or give cost estimates", "single objective", "NOT a support bot", "incl. GST", "plus GST", "inc GST"]) {
    assert.equal(SYSTEM_PROMPT.includes(stale), false, stale);
  }
});

test("prompt only contains dollar figures that are approved", () => {
  const block = renderOffersForPrompt();
  const figs = (t: string) => (t.match(/\$[0-9][0-9,]*[0-9]/g) ?? []);
  const approved = new Set(figs(block));
  // Hourly-rate estimates and ROI illustrations ($80,000 / $95,000 labour cost) are not prices.
  const allowedExtra = /^\$(40|45|60|80|90|80,000|95,000|150|180|200)$/;
  const rest = SYSTEM_PROMPT.replace(block, "");
  for (const m of figs(rest)) {
    assert.ok(approved.has(m) || allowedExtra.test(m), `unapproved figure ${m}`);
  }
});
