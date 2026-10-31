import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { readRepoClientHtml } from "../lib/repo-client-html";

const dir = "public/clients/nico-moretti";
const policy = readFileSync(`${dir}/privacy-policy.html`, "utf8");
const widget = readFileSync(`${dir}/chat-widget.js`, "utf8");
const route = readFileSync("app/api/nico-chat/route.ts", "utf8");
const pages = readdirSync(dir).filter((file) => file.endsWith(".html"));

test("the privacy policy states the chat facts the code can support", () => {
  for (const phrase of [
    "Australian Privacy Principles",
    "APP 5",
    "APP 8",
    "Saabai (saabai.ai)",
    "can access leads and chats to run and support the site",
    "Sofia is an AI assistant",
    "DeepSeek",
    "deepseek-v4-flash",
    "api.deepseek.com",
    "Hangzhou DeepSeek",
    "DeepSeek is based in China and may process and store data there",
    "People's Republic of China",
    "saabai-chat:nico-moretti",
    "conversation id",
    "30 minutes",
    "Claude Haiku 4.5",
    "claude-haiku-4-5",
    "api.anthropic.com",
    "Anthropic, PBC",
    "United States",
    "counted as a lead",
    "more than a greeting",
    "last 40 messages",
    "Sydney",
    "Supabase",
    "Tokyo, Japan, for 90 days",
    "20,000 characters",
    "cost figure",
    "90 days",
    "about 26 hours",
    "sexual matters",
    "sexual preferences or practices",
    "Upstash Redis",
    "Resend",
    "United States",
    "Telegram",
    "api.telegram.org",
    "British Virgin Islands",
    "Dubai",
    "Vercel",
    "Google Fonts",
    "cdn.tailwindcss.com",
    "one or more of those countries",
    "Telegram Messenger Inc.",
    "Gold Coast and Hobart do not ask for an event type",
    "seven city pages",
    "kept until Nico deletes them",
    "oaic.gov.au",
    "https://nicomoretti.au/#contact",
    'id="mobile-menu"',
  ]) {
    assert.ok(policy.includes(phrase), phrase);
  }
  assert.ok(!policy.includes("It is not legal advice"));
  assert.ok(!policy.includes("the code does not"));
  assert.ok(!policy.includes("If a Telegram"));
  assert.ok(!policy.includes("last 50 messages"));
  assert.ok(!policy.includes("limited to operating the service"));
  assert.ok(!policy.includes("as long as needed"));
  assert.ok(!policy.includes("Ashburn"));
  assert.ok(!policy.includes("project settings"));
  assert.ok(!policy.includes("Netherlands"));
  assert.ok(!policy.includes("When the chat log database is connected"));
  assert.ok(!/[\u2012-\u2015]/.test(policy), "policy must not use em or en dashes");
});

test("every Nico page links the privacy policy, and the chat discloses the AI", () => {
  const formPages: string[] = [];
  for (const file of pages) {
    const html = readFileSync(`${dir}/${file}`, "utf8");
    assert.match(html, /nicomoretti\.au\/privacy-policy|href="\/privacy-policy"|privacy-policy\.html/, file);
    assert.match(html, /embed\/chat\.v1\.js\?v=1\.3\.0/, file);
    assert.match(html, /data-site="nico-moretti"/, file);
    if (html.includes('type="submit"')) formPages.push(file);
  }
  assert.deepEqual(formPages.sort(), [
    "brisbane.html",
    "canberra.html",
    "gold-coast.html",
    "hobart.html",
    "husband-experience.html",
    "index.html",
    "melbourne.html",
    "perth.html",
    "sydney.html",
  ]);
  for (const file of formPages) {
    const html = readFileSync(`${dir}/${file}`, "utf8");
    assert.match(html, /nm-app5/, file);
    assert.match(html, /Nico receives your inquiry by email and Telegram/, file);
    assert.match(html, /font-size:13px/, file);
    assert.match(html, /min-height:44px/, file);
    assert.match(html, /display:inline-block/, file);
    assert.doesNotMatch(html, /inline-flex/, file);
  }
  assert.match(widget, /Hi, I'm Sofia, Nico's AI booking assistant/);
  assert.match(widget, /Sofia is an AI assistant/);
  assert.match(widget, /sexual matters/);
  assert.match(widget, /sexual preferences or practices/);
  assert.doesNotMatch(widget, /DeepSeek in China/);
  assert.match(widget, /font-size: 13px/);
  assert.match(widget, /min-height: 44px/);
  assert.match(widget, /display: inline-block/);
  assert.doesNotMatch(widget, /inline-flex/);
  assert.match(widget, /privacyHref/);
  assert.match(widget, /nico-chat-history/);
  assert.match(widget, /MAX_HISTORY = 40/);
  assert.match(widget, /messages = messages\.slice\(-MAX_HISTORY\)/);
  assert.doesNotMatch(widget, /slice\(-50\)/);
  assert.doesNotMatch(widget, /embed\/chat\.v1|chat-platform/);
  const shared = readFileSync("public/embed/chat.v1.js", "utf8");
  assert.match(shared, /sensitiveNotice/);
  assert.doesNotMatch(shared, /DeepSeek in China/);
  assert.ok(!/[\u2012-\u2015]/.test(widget));
});

test("discretion copy does not make absolute claims, and the chat route stays on DeepSeek", () => {
  const faq = readFileSync(`${dir}/faq.html`, "utf8");
  const husband = readFileSync(`${dir}/husband-experience.html`, "utf8");
  const interim = "Your enquiry is kept confidential. It is shared only with the services that run this website, which are listed in our privacy policy, and never sold or used for marketing.";
  assert.ok(faq.includes(interim));
  assert.ok(husband.includes(interim));
  for (const phrase of [
    "never disclosed to any third party",
    "absolute professional silence",
    "Nothing is ever disclosed",
    "invoices are issued through a discreet professional entity",
    "invoices are issued discreetly",
    "Your privacy is permanent",
  ]) {
    assert.ok(!faq.includes(phrase), phrase);
    assert.ok(!husband.includes(phrase), phrase);
  }
  const persona = readFileSync("lib/chatbot/personas.ts", "utf8");
  assert.match(persona, /an AI booking assistant/);
  assert.match(persona, /say that you are an AI assistant/);
  assert.match(persona, /enquiry form/);
  assert.match(persona, /model: "deepseek:deepseek-v4-flash"/);
  assert.match(route, /handleChat/);
  assert.doesNotMatch(route, /personal booking consultant/);
  assert.doesNotMatch(route, /Phone: as listed/);
  assert.doesNotMatch(route, /or phone/);
  assert.doesNotMatch(route, /api\.deepseek\.com/);
  assert.match(readFileSync("lib/chatbot/handler.ts", "utf8"), /conversationId: sid/);
  assert.doesNotMatch(route, /openai|embedding|Redis/i);
  assert.match(readFileSync("lib/repo-client-html.ts", "utf8"), /not from Vercel Blob/);
  assert.match(readFileSync(".github/workflows/client-site-surface.yml", "utf8"), /tests\/nico-privacy\.test\.ts/);
  assert.equal(readRepoClientHtml("cycle-repair", "index.html"), null);
  assert.equal(readRepoClientHtml("nico-moretti", "../index.html"), null);
  const served = readRepoClientHtml("nico-moretti", "privacy-policy.html");
  assert.ok(served?.includes("deepseek-v4-flash"));
  assert.ok(served?.includes("claude-haiku-4-5"));
  assert.match(readFileSync("app/sites/[slug]/route.ts", "utf8"), /readRepoClientHtml\(slug, "index.html"\)/);
  assert.match(readFileSync("app/sites/[slug]/[page]/route.ts", "utf8"), /readRepoClientHtml\(slug, `\$\{page\}\.html`\)/);
  assert.match(readFileSync("app/sites/[slug]/[page]/route.ts", "utf8"), /"privacy-policy"/);
});
