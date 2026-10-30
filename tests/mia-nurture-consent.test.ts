import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
process.env.SAABAI_SESSION_SECRET ||= "test-secret";
import { miaFooterHtml, unsubHeaders, verifyUnsub } from "../lib/growth/consent";
import { ENTITY_ABN } from "../lib/entity";

test("Mia footer says why, who, and has a working unsubscribe link", () => {
  const html = miaFooterHtml("Jo@Example.com");
  assert.match(html, /chatted with Mia/);
  assert.ok(html.includes(`ABN ${ENTITY_ABN}`));
  const m = html.match(/href="https:\/\/saabai\.ai\/unsubscribe\?e=([^&]+)&t=([^"]+)"/);
  assert.ok(m, "unsubscribe link");
  assert.ok(verifyUnsub(decodeURIComponent(m![1]), m![2]));
});

test("one-click unsubscribe headers", () => {
  const h = unsubHeaders("jo@example.com");
  assert.match(h["List-Unsubscribe"], /^<https:\/\/saabai\.ai\/unsubscribe\?/);
  assert.equal(h["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
});

test("nurture cron checks suppression and adds footer + headers to both emails", () => {
  const src = readFileSync("app/api/cron/mia-nurture/route.ts", "utf8");
  assert.match(src, /isSuppressed\(record\.email\)/);
  assert.equal((src.match(/headers: unsubHeaders\(record\.email\)/g) ?? []).length, 2);
  assert.equal((src.match(/\$\{footer\}/g) ?? []).length, 2);
  assert.ok(!/errors\.push\(`day[25] \$\{record\.email\}/.test(src), "no emails in error output");
});

test("no em or en dashes in Mia email copy (comments aside)", () => {
  for (const f of ["app/api/cron/mia-nurture/route.ts", "app/api/leads/route.ts", "lib/growth/consent.ts"]) {
    const code = readFileSync(f, "utf8").replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(!/[\u2013\u2014]/.test(code), f);
  }
});
