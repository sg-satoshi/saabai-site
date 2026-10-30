import test from "node:test";
import assert from "node:assert/strict";
import { maskLogText, stripeErrorFields } from "../lib/lex-signup-log";

test("masks emails and key fragments", () => {
  const m = maskLogText("No such key sk_live_****abcd for jo@firm.com.au; rk_test_ab12 pk_live_X whsec_9z");
  assert.ok(!/@|sk_|rk_|pk_|whsec_|abcd|ab12/.test(m), m);
  assert.match(m, /\[email\]/);
  assert.match(m, /\[key\]/);
});

test("keeps price ids and caps length", () => {
  assert.match(maskLogText("No such price: price_123"), /price_123/);
  assert.equal(maskLogText("x".repeat(500)).length, 300);
});

test("stripeErrorFields keeps only allowed fields, masked", () => {
  const f = stripeErrorFields({ type: "StripeInvalidRequestError", code: "resource_missing", param: "a@b.co", message: "bad sk_live_****wxyz", raw: { secret: 1 }, requestBody: "x" });
  assert.deepEqual(Object.keys(f).sort(), ["code", "message", "param", "type"]);
  assert.equal(f.param, "[email]");
  assert.ok(!f.message.includes("sk_"));
  assert.deepEqual(stripeErrorFields(null), { name: "object" });
});

test("masks keys embedded in other text", () => {
  const m = maskLogText("idxsk_live_ABCDEF123 and key_whsec_abc and xrk_test_Q9");
  assert.doesNotMatch(m, /ABCDEF123|whsec_abc|Q9/);
  assert.equal((m.match(/\[key\]/g) ?? []).length, 3);
});

test("masks mixed-case key prefixes", () => {
  const m = maskLogText("Sk_live_AbC123 SK_TEST_xyz Whsec_Zz9 RK_live_k1");
  assert.doesNotMatch(m, /AbC123|xyz|Zz9|k1/);
  assert.equal((m.match(/\[key\]/g) ?? []).length, 4);
});
