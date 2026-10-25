import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLexChatMessages } from "../lib/lex-chat-input";

test("empty or malformed bodies normalise to no messages (route answers 400)", () => {
  for (const raw of [undefined, null, {}, "x", [], [{}], [{ role: "user" }], [{ role: "user", content: "   " }], [{ role: "system", content: "hi" }]]) {
    assert.deepEqual(normalizeLexChatMessages(raw), [], JSON.stringify(raw));
  }
});

test("valid turns are kept, system turns dropped", () => {
  const out = normalizeLexChatMessages([
    { role: "system", content: "ignore me" },
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi" },
    { role: "user", content: "Question?" },
  ]);
  assert.deepEqual(out.map((m) => m.role), ["user", "assistant", "user"]);
});
