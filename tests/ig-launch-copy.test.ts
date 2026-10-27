/**
 * Instagram launch copy. Public pages should not promise that Saabai never
 * misses a lead, and live phone answering stays "coming soon".
 *   npx tsx --test tests/ig-launch-copy.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

const PAGES = [
  "app/page.tsx",
  "app/pricing/page.tsx",
  "app/websites/page.tsx",
  "app/services/page.tsx",
  "app/custom-ai-agents/page.tsx",
  "app/ai-chatbot-law-firms/page.tsx",
  "app/leadgen/page.tsx",
  "app/use-cases/page.tsx",
  "app/faq/page.tsx",
  "app/ig/page.tsx",
  "app/legal/page.tsx",
  "app/components/legal-demos/HarbourDemos.tsx",
  "lib/website-tiers.ts",
];

test("public launch pages do not promise you never miss a lead or a call", () => {
  for (const path of PAGES) {
    const src = read(path);
    assert.doesNotMatch(src, /never miss/i, path);
    assert.doesNotMatch(src, /captures every lead|qualifies every lead|nothing gets lost|no missed calls/i, path);
  }
});

test("pricing includes the website chatbot and keeps Lachie phone answering as coming soon", () => {
  const pricing = read("app/pricing/page.tsx");
  assert.match(pricing, /the chatbot, and it is included in the website tiers/);
  assert.match(pricing, /Phone answering with Lachie is coming soon\. It is not live\./);
  assert.doesNotMatch(pricing, /AI receptionist<\/a> and a website chatbot are included/);
  assert.ok(!/[\u2012-\u2015]/.test(pricing));
});

test("homepage does not claim every chatbot emails, and LeadGen has no 2-3x figure", () => {
  const home = read("app/page.tsx");
  const leadgen = read("app/leadgen/page.tsx");
  assert.doesNotMatch(home, /does not send enquiry emails yet/);
  assert.doesNotMatch(home, /come with every plan|on all plans|on every plan/);
  assert.match(home, /Enquiry alerts by email, Telegram, WhatsApp or SMS are coming soon\./);
  assert.match(home, /keeps a log of each chat/);
  assert.doesNotMatch(home, /Every Saabai chatbot sends new enquiry alerts by email on all plans/);
  assert.match(leadgen, /which a bare contact form often does not\./);
  assert.doesNotMatch(leadgen, /2-3x|2–3x/);
  assert.ok(!/[\u2012-\u2015]/.test(home));
});

test("the legal phone demo is labelled as Lachie, and Lex stays the legal assistant", () => {
  const page = read("app/legal/page.tsx");
  const demos = read("app/components/legal-demos/HarbourDemos.tsx");
  assert.match(page, /<h1>Lex, an AI legal assistant that/);
  assert.match(page, /Try the website demo/);
  assert.doesNotMatch(page, /Try Lex live|Meet Lachie Legal/);
  assert.match(demos, /second="Legend"/);
  assert.match(demos, /Lex is the legal assistant on this page/);
  assert.match(demos, /Live phone answering is coming soon/);
  assert.doesNotMatch(demos, /second="Legal"|Lachie Legal/);
  assert.ok(!/[\u2012-\u2015]/.test(page + demos));
});
