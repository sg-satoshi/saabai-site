import { test } from "node:test";
import assert from "node:assert/strict";
process.env.SAABAI_SESSION_SECRET ||= "unit-test-secret-0123456789abcdef";
import { newSecret, generateCode, verifyTotpStep, encrypt, decrypt, createPendingToken, verifyPendingToken, newBackupCodes } from "../lib/admin-2fa";

const T = Date.UTC(2026, 9, 13, 8, 0, 15);

test("current code verifies", () => {
  const s = newSecret();
  assert.notEqual(verifyTotpStep(s, generateCode(s, T), T), null);
});
test("one step of drift either way is accepted", () => {
  const s = newSecret();
  assert.notEqual(verifyTotpStep(s, generateCode(s, T - 30_000), T), null);
  assert.notEqual(verifyTotpStep(s, generateCode(s, T + 30_000), T), null);
});
test("two steps away is rejected", () => {
  const s = newSecret();
  assert.equal(verifyTotpStep(s, generateCode(s, T - 90_000), T), null);
  assert.equal(verifyTotpStep(s, generateCode(s, T + 90_000), T), null);
});
test("wrong or malformed codes are rejected", () => {
  const s = newSecret();
  const good = generateCode(s, T);
  const bad = String((Number(good) + 1) % 1_000_000).padStart(6, "0");
  assert.equal(verifyTotpStep(s, bad, T), null);
  assert.equal(verifyTotpStep(s, "abc123", T), null);
  assert.equal(verifyTotpStep(s, "", T), null);
});
test("secret encryption round trips", () => {
  const s = newSecret();
  const e = encrypt(s);
  assert.notEqual(e, s);
  assert.equal(decrypt(e), s);
});
test("pending token verifies and rejects tampering", () => {
  const t = createPendingToken("saabai", "/saabai-admin");
  assert.deepEqual(verifyPendingToken(t), { clientId: "saabai", redirect: "/saabai-admin" });
  assert.equal(verifyPendingToken(t.slice(0, -2) + "xx"), null);
  assert.equal(verifyPendingToken(undefined), null);
});
test("8 unique backup codes", () => {
  const c = newBackupCodes();
  assert.equal(new Set(c).size, 8);
});
