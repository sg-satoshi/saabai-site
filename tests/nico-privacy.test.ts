import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { readRepoClientHtml } from "../lib/repo-client-html";

const dir = "public/clients/nico-moretti";
const policy = readFileSync(`${dir}/privacy-policy.html`, "utf8");
const widget = readFileSync(`${dir}/chat-widget.js`, "utf8");
const route = readFileSync("app/api/nico-chat/route.ts", "utf8");

test("the privacy policy states the chat facts the code can support", () => {
  for (const phrase of [
    "Australian Privacy Principles",
    "APP 8",
    "DeepSeek",
    "deepseek-v4-flash",
    "China",
    "People's Republic of China",
    "api.deepseek.com",
    "nico-chat-history",
    "last 50 messages",
    "Sydney",
    "Supabase",
    "Tokyo, Japan",
    "20,000 characters",
    "90 days",
    "OpenAI",
    "does not store the chat in Redis",
    "sensitive information",
    "Upstash Redis",
    "does not set a deletion date",
    "Resend",
    "Telegram",
    "api.telegram.org",
    "oaic.gov.au",
    "https://nicomoretti.au/#contact",
  ]) {
    assert.ok(policy.includes(phrase), phrase);
  }
  assert.ok(!/[\u2012-\u2015]/.test(policy), "policy must not use em or en dashes");
});

test("every Nico page links the privacy policy, and the chat says where messages go", () => {
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".html")) continue;
    const html = readFileSync(`${dir}/${file}`, "utf8");
    assert.match(html, /nicomoretti\.au\/privacy-policy|href="\/privacy-policy"|privacy-policy\.html/, file);
  }
  assert.match(widget, /DeepSeek in China/);
  assert.match(widget, /Do not share sensitive information/);
  assert.match(widget, /privacyHref/);
  assert.match(widget, /nico-chat-history/);
  assert.match(widget, /messages\.slice\(-50\)/);
  assert.doesNotMatch(widget, /embed\/chat\.v1|chat-platform/);
  assert.ok(!/[\u2012-\u2015]/.test(widget));
});

test("the chat route stays on DeepSeek and the repo HTML is what Nico's site serves", () => {
  assert.match(route, /model: "deepseek-v4-flash"/);
  assert.match(route, /https:\/\/api\.deepseek\.com\/v1\/chat\/completions/);
  assert.match(route, /logChatTurn/);
  assert.doesNotMatch(route, /openai|embedding|Redis/i);
  assert.equal(readRepoClientHtml("cycle-repair", "index.html"), null);
  assert.equal(readRepoClientHtml("nico-moretti", "../index.html"), null);
  const served = readRepoClientHtml("nico-moretti", "privacy-policy.html");
  assert.ok(served?.includes("deepseek-v4-flash"));
  assert.match(readFileSync("app/sites/[slug]/route.ts", "utf8"), /readRepoClientHtml\(slug, "index.html"\)/);
  assert.match(readFileSync("app/sites/[slug]/[page]/route.ts", "utf8"), /readRepoClientHtml\(slug, `\$\{page\}\.html`\)/);
  assert.match(readFileSync("app/sites/[slug]/[page]/route.ts", "utf8"), /"privacy-policy"/);
});
