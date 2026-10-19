/**
 * Lex error states: failures are never answers.   npx tsx --test tests/lex-errors.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  stripErrorAnswers, cleanThreads, isLegacyErrorAnswer, lexErrorFromStatus, lexErrorFromResponse,
  lexNetworkError, lexEmptyError, isStreamErrorPart, signInHref, lexErrorResponse, LEGACY_ERROR_ANSWERS,
} from "../lib/lex-errors";

test("saved error answers are stripped from threads and from what goes to the model", () => {
  const msgs = [
    { role: "user", content: "Div 7A loan?" },
    { role: "assistant", content: "There was a problem reaching the research API. Please try again." },
    { role: "user", content: "Div 7A loan?" },
    { role: "assistant", content: "A real answer." },
  ];
  const out = stripErrorAnswers(msgs);
  assert.equal(out.length, 3);
  assert.ok(out.every((m) => !isLegacyErrorAnswer(m.content)));
  // a user typing the same words is not removed
  assert.equal(stripErrorAnswers([{ role: "user", content: LEGACY_ERROR_ANSWERS[0] }]).length, 1);
  const threads = cleanThreads([{ id: "a", messages: msgs }, { id: "b", messages: [] }]);
  assert.equal(threads[0].messages.length, 3);
});

test("401 asks the user to sign in and offers no retry", () => {
  const e = lexErrorFromStatus(401, { error: "Unauthorized" });
  assert.equal(e.kind, "auth");
  assert.equal(e.title, "Please sign in");
  assert.ok(e.signIn && !e.canRetry);
  assert.equal(signInHref("/lex?q=a b"), "/login?redirect=%2Flex%3Fq%3Da%20b");
});

test("403, 429 and 5xx map to clear states; server text and raw errors never leak", () => {
  const forbidden = lexErrorFromStatus(403, { error: "Forbidden" });
  assert.equal(forbidden.kind, "forbidden");
  assert.ok(!forbidden.message.includes("Forbidden"));
  assert.equal(forbidden.contactHref, "/client-portal?page=requests");
  const cap = lexErrorFromStatus(429, { error: "daily_limit", message: "Your firm has used all 20 reviews for today." }, "review");
  assert.equal(cap.kind, "limit");
  assert.equal(cap.contactHref, "/client-portal?page=requests");
  assert.equal(cap.message, "Your firm has used all 20 reviews for today.");
  assert.ok(!cap.canRetry);
  const s = lexErrorFromStatus(500, { error: "Error: 401 Incorrect API key provided: sk-abc" });
  assert.equal(s.kind, "server");
  assert.ok(s.canRetry);
  assert.ok(!s.message.includes("sk-"));
  // user-fixable 4xx keeps the route's wording
  assert.equal(lexErrorFromStatus(413, { error: "File too large (max 10MB)" }, "review").message, "File too large (max 10MB)");
});

test("network and empty errors offer retry", () => {
  assert.ok(lexNetworkError().canRetry);
  assert.ok(lexEmptyError().canRetry);
});

test("reads a Response body, JSON or not", async () => {
  assert.equal((await lexErrorFromResponse(new Response("Error: boom", { status: 500 }))).kind, "server");
  assert.equal((await lexErrorFromResponse(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }))).kind, "auth");
});

test("stream error parts are detected", () => {
  assert.ok(isStreamErrorPart({ type: "error", errorText: "x" }));
  assert.ok(!isStreamErrorPart({ type: "text-delta", delta: "x" }));
  assert.ok(!isStreamErrorPart(null));
});

test("route error body is generic JSON", async () => {
  const r = lexErrorResponse(500, "research_failed");
  assert.equal(r.status, 500);
  assert.deepEqual(await r.json(), { error: "research_failed" });
});

test("Lex routes no longer return raw exceptions, and the page never saves errors as answers", () => {
  for (const f of ["lex-research", "lex-draft", "lex-review", "lex-compare", "lex-extract", "lex-review-submit"]) {
    const src = readFileSync(`app/api/${f}/route.ts`, "utf8");
    assert.ok(!/new Response\(String\(err\)/.test(src), f);
    assert.ok(!/error: message \}, \{ status: 500/.test(src), f);
  }
  const page = readFileSync("app/lex/page.tsx", "utf8");
  for (const t of LEGACY_ERROR_ANSWERS) assert.ok(!page.includes(t), t);
  assert.ok(!/[\u2012-\u2015]/.test(readFileSync("lib/lex-errors.ts", "utf8")));
});
