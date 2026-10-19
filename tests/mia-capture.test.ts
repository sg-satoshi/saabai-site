import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const w = readFileSync("app/components/ChatWidget.tsx", "utf8");
const route = readFileSync("app/api/chat/route.ts", "utf8");
const redis = readFileSync("lib/redis.ts", "utf8");

test("form asks for email only (name optional) and explains why", () => {
  assert.match(w, /First name \(optional\)/);
  assert.match(w, /send you a summary of this chat/);
  assert.match(w, /if \(!leadForm\.email\.trim\(\)\) return;/);
  assert.ok(!/placeholder="(Phone|Company)/i.test(w), "no extra fields");
});

test("consent and privacy line at capture", () => {
  assert.match(w, /Unsubscribe anytime/);
  assert.match(w, /href="\/privacy"/);
  assert.match(w, /don&apos;t share sensitive info/);
});

test("summary offer appears after a few messages", () => {
  assert.match(w, /userMessages\.length >= 3 && !showLeadCapture/);
  assert.match(w, /Email me a summary of this chat/);
});

test("no email addresses sent to analytics, none kept in localStorage profile", () => {
  assert.ok(!/track\([^)]*email:/.test(w), "track() must not include email");
  assert.match(w, /const \{ email: _email, \.\.\.profileFacts \}/);
});

test("partial leads: inline email is saved on the lead record", () => {
  assert.match(route, /email: z\s*\.string\(\)\s*\.email\(\)/);
  assert.match(route, /email: sessionData\.visitorFacts\.email as string \| undefined/);
  assert.match(redis, /email: lead\.email \?\? ""/);
});
