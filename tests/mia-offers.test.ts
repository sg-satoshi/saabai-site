import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderOffersForPrompt, WEBSITE_PLANS, GST_LINE } from "../lib/mia-offers";
import { TIERS } from "../lib/blueprint";
import { SYSTEM_PROMPT } from "../lib/chat-prompt";

const aud = (n: number) => `$${n.toLocaleString("en-AU")}`;

test("offers block lists every Blueprint tier at checkout prices", () => {
  const block = renderOffersForPrompt();
  for (const t of Object.values(TIERS)) assert.ok(block.includes(`${t.name}: ${t.priceLabel} one-off`), t.name);
  assert.deepEqual(Object.values(TIERS).map((t) => t.price).sort((a, b) => a - b), [497, 1497, 3500]);
});

test("website plans match the live /websites page source", () => {
  const page = readFileSync("app/websites/page.tsx", "utf8");
  for (const p of WEBSITE_PLANS) {
    assert.ok(page.includes(`name: "${p.name}"`), p.name);
    assert.ok(page.includes(`from ${aud(p.build)}`), `${p.name} build`);
    assert.ok(page.includes(`${p.name} is ${aud(p.monthly)} a month`) || page.includes(`${p.name} ${aud(p.monthly)}`), `${p.name} monthly`);
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
