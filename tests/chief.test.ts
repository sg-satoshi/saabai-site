import { test } from "node:test";
import assert from "node:assert/strict";
process.env.SAABAI_SESSION_SECRET ||= "unit-test-secret-0123456789abcdef";
process.env.CHIEF_ADMIN_PASSWORD = "unit-test-chief-password-0123456789";
import { chiefAllowed, checkChiefPassword, createChiefToken, verifyChiefToken, chiefHostOk, chiefEnabled } from "../lib/chief";

test("chief scope is read-only split testing only", () => {
  assert.ok(chiefAllowed("GET", "/saabai-admin/experiments"));
  assert.ok(chiefAllowed("GET", "/api/admin/experiments/abc"));
  for (const p of ["/saabai-admin/payments", "/saabai-admin/orders", "/saabai-admin/customers", "/saabai-admin/users", "/saabai-admin/security", "/api/admin/payments", "/api/admin/billing", "/api/admin/customers", "/api/admin/invoices", "/api/admin/impersonate", "/api/admin/experiments-evil", "/api/stripe", "/api/user-directory", "/saabai-admin"])
    assert.equal(chiefAllowed("GET", p), false, p);
  for (const m of ["POST", "PUT", "PATCH", "DELETE"]) {
    assert.equal(chiefAllowed(m, "/api/admin/experiments/abc"), false);
    assert.equal(chiefAllowed(m, "/api/admin/experiments/wrap-request"), false);
  }
});

test("chief password and token", async () => {
  assert.ok(chiefEnabled());
  assert.ok(checkChiefPassword("unit-test-chief-password-0123456789"));
  assert.equal(checkChiefPassword("unit-test-chief-password-012345678X"), false);
  assert.equal(checkChiefPassword(""), false);
  const t = await createChiefToken();
  assert.ok(await verifyChiefToken(t));
  assert.equal(await verifyChiefToken(t + "x"), false);
  assert.equal(await verifyChiefToken(t, Date.now() + 3 * 3600 * 1000), false);
  assert.equal(await verifyChiefToken("chief.99999999999.AAAA"), false);
  process.env.CHIEF_ADMIN_PASSWORD = "rotated-password-rotated-password-1";
  assert.equal(await verifyChiefToken(t), false, "rotating the password revokes sessions");
  delete process.env.CHIEF_ADMIN_PASSWORD;
  assert.equal(chiefEnabled(), false);
  assert.equal(checkChiefPassword("anything"), false);
});

test("chief never on customer hosts", () => {
  assert.ok(chiefHostOk("www.saabai.ai"));
  assert.equal(chiefHostOk("stuscyclerepairs.com.au"), false);
  assert.equal(chiefHostOk("lifestylemoneymanagement.com.au"), false);
  assert.equal(chiefHostOk("evil.saabai.ai"), false);
});
