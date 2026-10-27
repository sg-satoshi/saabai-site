import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

test("/login metadata is noindex and does not canonicalise to the homepage", () => {
  const page = read("app/login/page.tsx");
  assert.match(page, /index:\s*false/);
  assert.match(page, /follow:\s*false/);
  assert.match(page, /canonical:\s*"\/login"/);
  assert.match(page, /openGraph:\s*\{[^}]*url:\s*"\/login"/);
  assert.ok(!page.includes("https://www.saabai.ai\""));
  assert.ok(!page.includes("canonical: BASE_URL") && !page.includes('canonical: "/"'));
});

test("/score server page renders a heading and a short description", () => {
  const page = read("app/score/page.tsx");
  const client = read("app/score/ScoreClient.tsx");
  assert.ok(!page.includes("use client"));
  assert.match(client, /use client/);
  assert.match(page, /<h1>Free AI Readiness Score<\/h1>/);
  assert.match(page, /A free 3 minute score for Australian small businesses, from Saabai on the Gold Coast\./);
  assert.match(page, /Twelve questions, an instant score out of 100 and three quick wins\./);
  assert.match(client, /\{children\}/);
  assert.match(read("lib/seo-pages.ts"), /Twelve questions, an instant score out of 100 and three quick wins/);
});

test("public pricing does not emit a standalone /month or /year text node", () => {
  const files = ["app/legal/page.tsx", "app/leadgen/page.tsx", "app/saabai-admin/chatbots/ChatbotsClient.tsx", "app/saabai-admin/chatbots/[slug]/BotDetailClient.tsx"];
  for (const file of files) {
    const src = read(file);
    assert.ok(!/>\s*\/(?:month|year)\s*</.test(src), file);
    assert.ok(!/\}\s*\/(?:month|year)/.test(src), file);
  }
});
