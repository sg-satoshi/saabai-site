/** Lex signup error log sanitiser.   npx tsx --test tests/lex-signup-log.test.ts */
import { test } from "node:test";
import assert from "node:assert/strict";
import { maskSecrets, stripeErrorFields } from "../lib/lex-signup-log";

test("masks Stripe key and webhook secret fragments", () => {
  const out = maskSecrets("Invalid API Key provided: sk_live_51AbCdEf****WXYZ and rk_test_9zz, whsec_abc123, pk_live_Q1w2 sk_abcdef1234");
  assert.doesNotMatch(out, /51AbCdEf|WXYZ|9zz|abc123|Q1w2|abcdef1234/);
  assert.match(out, /sk_live_\[redacted\]/); assert.match(out, /rk_test_\[redacted\]/); assert.match(out, /whsec_\[redacted\]/);
});

test("masks emails in every field and caps length", () => {
  const f = stripeErrorFields({ name: "StripeInvalidRequestError", type: "invalid_request_error", code: "x", param: "customer_email a@b.com", message: "bad jo@firm.com.au " + "y".repeat(400) });
  assert.equal(f.param, "customer_email [email]");
  assert.match(f.message, /^bad \[email\]/); assert.equal(f.message.length, 300);
});

test("keeps only the error fields, nothing else", () => {
  assert.deepEqual(Object.keys(stripeErrorFields({ message: "m", raw: { body: "secret" }, headers: {} })), ["message"]);
  assert.deepEqual(stripeErrorFields("boom"), { name: "string" });
  assert.deepEqual(stripeErrorFields(null), { name: "object" });
});
