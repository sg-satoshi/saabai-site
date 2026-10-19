import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nudgeFor, NUDGE_PAGES, NUDGE_DELAY_MS } from "../lib/mia-nudge";

test("nudge only on pricing and Blueprint pages", () => {
  assert.ok(nudgeFor("/blueprint"));
  assert.ok(nudgeFor("/blueprint/"));
  assert.ok(nudgeFor("/services"));
  assert.ok(nudgeFor("/websites"));
  for (const p of ["/", "/about", "/faq", "/contact", null, undefined, ""]) assert.equal(nudgeFor(p as string), null, String(p));
});

test("never on score or checkout pages", () => {
  for (const p of ["/score", "/score/result", "/blueprint/checkout", "/blueprint/checkout?tier=pro", "/blueprint/confirmation", "/checkout", "/pay/abc"]) {
    assert.equal(nudgeFor(p), null, p);
  }
});

test("copy is short, no em dashes, waits at least 15s", () => {
  for (const t of Object.values(NUDGE_PAGES)) {
    assert.ok(t.length <= 90, t);
    assert.equal(t.includes("\u2014"), false);
  }
  assert.ok(NUDGE_DELAY_MS >= 15000);
});

test("widget never auto-opens and shows the nudge once per session", () => {
  const w = readFileSync("app/components/ChatWidget.tsx", "utf8");
  assert.equal((w.match(/setIsOpen\(true\)/g) ?? []).length, 1, "only openWidget opens the chat");
  assert.match(w, /function openWidget\(\) \{[\s\S]{0,400}setIsOpen\(true\)/);
  assert.ok(!w.includes("proactive_trigger"));
  assert.match(w, /sessionStorage\.setItem\(NUDGE_SESSION_KEY/);
  assert.match(w, /nudgeFor\(pathname\)/);
});
