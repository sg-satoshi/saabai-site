/**
 * 26 Oct 2026 AI search copy. Facts stay on published offers.
 *   npx tsx --test tests/ai-search-gap.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Metadata } from "next";
import sitemap from "../app/sitemap";
import { publicPageMeta } from "../lib/seo-pages";
import { BRISBANE, GOLD_COAST } from "../lib/location-data";

const read = (path: string) => readFileSync(path, "utf8");
const titleOf = (meta: Metadata) => {
  const title = meta.title as { absolute?: string };
  assert.equal(typeof title.absolute, "string");
  return title.absolute as string;
};

test("sitemap lists the Queensland chatbot page and the Lex comparison", () => {
  const urls = sitemap().map((entry) => entry.url);
  assert.ok(urls.includes("https://www.saabai.ai/ai-chatbot-developer-queensland"));
  assert.ok(urls.includes("https://www.saabai.ai/legal/lex-vs-ai-legal-tools"));
});

test("Queensland page uses the approved title, H1, cost FAQ and links", () => {
  assert.equal(titleOf(publicPageMeta.queenslandChatbot), "Custom AI Chatbot Developer in Queensland | Saabai");
  const page = read("app/ai-chatbot-developer-queensland/page.tsx");
  assert.match(page, /Custom AI chatbots built in Queensland/);
  assert.match(page, /How much does a custom AI chatbot cost\?/);
  assert.match(page, /Book a free 30 minute call for a quote/);
  assert.match(page, /href="\/ai-chatbot-law-firms"/);
  assert.match(page, /href="\/ai-receptionist-gold-coast"/);
  assert.match(page, /href="\/legal"/);
  assert.doesNotMatch(page, /optional chatbot/i);
  assert.doesNotMatch(page, /Lifestyle Money Management/);
  assert.ok(!/[\u2012-\u2015]/.test(page));
});

test("home, footer and Brisbane link to the Queensland chatbot page", () => {
  assert.match(read("app/page.tsx"), /href="\/ai-chatbot-developer-queensland"/);
  assert.match(read("app/components/sb/SbFooter.tsx"), /href="\/ai-chatbot-developer-queensland"/);
  assert.equal(BRISBANE.spotlight?.title, "Custom AI chatbots in Brisbane");
  assert.equal(BRISBANE.spotlight?.linkHref, "/ai-chatbot-developer-queensland");
  const cost = BRISBANE.faqs.find((faq) => faq.q === "How much does an AI chatbot cost?");
  assert.equal(cost?.a, "It depends on what your chatbot needs to do. Book a free 30 minute call for a quote.");
});

test("Gold Coast title, H1 and hosting FAQ match the published offer", () => {
  assert.equal(
    titleOf(publicPageMeta.goldCoast),
    "Web Design Gold Coast, Hosting Included, From $2,000 | Saabai",
  );
  assert.match(GOLD_COAST.heroHeadline, /web design/i);
  assert.match(GOLD_COAST.heroHeadline, /hosting included/i);
  assert.match(GOLD_COAST.heroHeadline, /\$2,000/);
  const hosting = GOLD_COAST.faqs.find((faq) => faq.q === "Is hosting included?");
  assert.match(hosting?.a ?? "", /\$2,000/);
  assert.match(hosting?.a ?? "", /\$100 a month care/);
  assert.match(hosting?.a ?? "", /includes hosting/);
  assert.equal(GOLD_COAST.seo.description, publicPageMeta.goldCoast.description);
  assert.equal(BRISBANE.seo.description, publicPageMeta.brisbane.description);
});

test("Gold Coast receptionist is a website chatbot of about 1,000 words, with Lachie coming soon and no monthly from price", () => {
  const page = read("app/ai-receptionist-gold-coast/page.tsx");
  assert.match(page, /Website receptionist or phone receptionist\?/);
  assert.match(page, /Phone answering with Lachie, Saabai's AI voice receptionist, is coming soon\./);
  assert.match(page, /It is not live/);
  assert.match(page, /The receptionist on this page is the website chat/);
  assert.match(page, /calendly\.com\/shanegoldberg\/30min/);
  assert.match(page, /Book a demo/);
  assert.match(page, /LachieLockup as="h2" second="Legend"/);
  assert.match(page, /LachiePortrait alt="Lachie, Saabai's AI voice receptionist"/);
  assert.doesNotMatch(page, /VoiceDemo|LachieLegalDemo/);
  const lachie = read("app/components/sb/LachieLockup.tsx");
  assert.match(lachie, /Meet/);
  assert.match(lachie, /lachie-headset-avatar-button-96\.png/);
  assert.match(lachie, /lachie-headset-avatar-button-192\.png/);
  assert.match(lachie, /alt=\{alt\}/);
  assert.match(page, /The chatbot is included in the website tiers/);
  assert.match(page, /Tourism and hospitality/);
  assert.match(page, />Trades</);
  assert.match(page, />Property</);
  assert.doesNotMatch(page, /answers the phone|answers your calls|phone answering service|coming soon yet|no separate monthly price|from&quot; monthly/i);
  assert.doesNotMatch(page, /\$99|\$149|\$249|\$297|\$449/);
  assert.ok(!/[\u2012-\u2015]/.test(page));
  const prose = page
    .replace(/import[\s\S]*?from "[^"]+";/g, " ")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, " ");
  const words = prose.match(/[A-Za-z][A-Za-z'’-]+/g) ?? [];
  assert.ok(words.length >= 900 && words.length <= 1400, `word count ${words.length}`);
});

test("Lex title and H1 say AI legal assistant, and the workspace is distinguished from the chatbot demo", () => {
  assert.match(titleOf(publicPageMeta.legal), /AI legal assistant/i);
  const page = read("app/legal/page.tsx");
  assert.match(page, /<h1>Lex, an AI legal assistant that/);
  assert.match(page, /Lex the workspace is not the chatbot demo/);
  assert.match(page, /href="\/legal\/lex-vs-ai-legal-tools"/);
  const compare = read("app/legal/lex-vs-ai-legal-tools/page.tsx");
  assert.match(compare, /Lex vs other AI legal tools 2026/);
  for (const name of ["Harvey", "CoCounsel", "Lexis\\+ AI"]) assert.match(compare, new RegExp(name));
  assert.match(compare, /https:\/\/www\.harvey\.ai\/security/);
  assert.match(compare, /cocounsel-legal\.html/);
  assert.match(compare, /LNAU-Agreement-Global-Platform/);
  assert.match(compare, /The Lex page does not state where data is hosted|The Lex page does not state a hosting location/);
  assert.doesNotMatch(compare, /worse|inferior|outdated|overpriced|best value|the only AI/i);
  assert.ok(!/[\u2012-\u2015]/.test(compare));
});

test("the law firms page copies the Tributum case study quote and its attribution", () => {
  const firms = read("app/ai-chatbot-law-firms/page.tsx");
  const study = read("app/case-studies/page.tsx");
  const quote = "The clients calling about ATO disputes are stressed. They want to know someone&apos;s there. Lex answers that in 90 seconds, any time of day. The difference it&apos;s made to our conversion rate has been significant.";
  assert.ok(study.includes("The clients calling about ATO disputes are stressed."));
  assert.ok(study.includes("someone&apos;s there."));
  assert.ok(study.includes("difference it&apos;s made to our conversion rate has been significant."));
  assert.match(study, /, Principal, Tributum Law/);
  assert.match(study, /An Adelaide law firm serving clients across Australia and internationally/);
  assert.doesNotMatch(study, /Brisbane/);
  assert.ok(firms.includes(quote));
  assert.match(firms, /, Principal, Tributum Law/);
  assert.match(firms, /Tributum Law is an Adelaide law firm serving clients across Australia and internationally/);
  assert.doesNotMatch(firms, /Brisbane practice|Brisbane firm|firm, Brisbane/);
  assert.match(firms, /different product from the website chatbot demo/);
  assert.match(firms, /ai-chatbot-developer-queensland/);
});
