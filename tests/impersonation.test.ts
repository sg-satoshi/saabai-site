import { describe, it } from "node:test";
import assert from "node:assert/strict";

process.env.PORTAL_SESSION_SECRET = process.env.PORTAL_SESSION_SECRET || "test-portal-session-secret-32chars!!";
process.env.SAABAI_SESSION_SECRET = process.env.SAABAI_SESSION_SECRET || "test-saabai-session-secret-32chars!!";

describe("impersonation tokens", () => {
  it("signs and verifies a 30-minute read-only payload", async () => {
    const {
      signImpersonation,
      verifyImpersonation,
      IMPERSONATE_TTL_SECONDS,
    } = await import("../lib/impersonation");

    const { token, payload } = signImpersonation({
      adminId: "saabai",
      clientEmail: "stuscyclerepairs@gmail.com",
      clientName: "Stu",
      clientId: "cycle-repair",
      returnTo: "/saabai-admin/customers",
    });
    assert.equal(payload.readOnly, true);
    assert.ok(payload.exp > Date.now());
    assert.ok(payload.exp <= Date.now() + IMPERSONATE_TTL_SECONDS * 1000 + 1000);

    const verified = verifyImpersonation(token);
    assert.ok(verified);
    assert.equal(verified!.clientEmail, "stuscyclerepairs@gmail.com");
    assert.equal(verified!.adminId, "saabai");
    assert.equal(verified!.readOnly, true);
  });

  it("rejects tampered or expired tokens", async () => {
    const { signImpersonation, verifyImpersonation } = await import("../lib/impersonation");
    const { token } = signImpersonation({
      adminId: "saabai",
      clientEmail: "a@b.com",
      clientName: "A",
      clientId: "a",
      returnTo: "/saabai-admin/customers",
    });
    assert.equal(verifyImpersonation(token + "x"), null);
    assert.equal(verifyImpersonation("not.a.token"), null);

    const { createHmac } = await import("node:crypto");
    const body = Buffer.from(
      JSON.stringify({
        adminId: "saabai",
        clientEmail: "a@b.com",
        clientName: "A",
        clientId: "a",
        returnTo: "/saabai-admin/customers",
        sessionId: "dead",
        exp: Date.now() - 1000,
        readOnly: true,
      }),
    ).toString("base64url");
    const secret =
      process.env.IMPERSONATE_SECRET ||
      process.env.PORTAL_SESSION_SECRET ||
      process.env.SAABAI_SESSION_SECRET ||
      "";
    const sig = createHmac("sha256", secret).update(`impersonate:${body}`).digest("base64url");
    assert.equal(verifyImpersonation(`${body}.${sig}`), null, "expired token must fail");
    assert.equal(verifyImpersonation(`${body}.fakesig`), null);
  });

  it("blocks mutating requests when impersonation cookie is present", async () => {
    const {
      signImpersonation,
      rejectIfImpersonatingReadOnly,
      IMPERSONATE_COOKIE,
      READ_ONLY_MESSAGE,
    } = await import("../lib/impersonation");

    const { token } = signImpersonation({
      adminId: "saabai",
      clientEmail: "stuscyclerepairs@gmail.com",
      clientName: "Stu",
      clientId: "cycle-repair",
      returnTo: "/saabai-admin/customers",
    });

    const blocked = rejectIfImpersonatingReadOnly(
      new Request("https://www.saabai.ai/api/portal/settings", {
        method: "POST",
        headers: { cookie: `${IMPERSONATE_COOKIE}=${token}` },
      }),
    );
    assert.ok(blocked);
    assert.equal(blocked!.status, 403);
    const json = await blocked!.json();
    assert.equal(json.code, "impersonation_read_only");
    assert.ok(String(json.error).includes("read-only") || String(json.error) === READ_ONLY_MESSAGE);

    const open = rejectIfImpersonatingReadOnly(
      new Request("https://www.saabai.ai/api/portal/settings", { method: "POST" }),
    );
    assert.equal(open, null);
  });

  it("portal session helper can issue a short-lived token", async () => {
    const { signSession, verifySession } = await import("../lib/portal-session");
    const token = signSession("stuscyclerepairs@gmail.com", 30 * 60 * 1000);
    const session = verifySession(token);
    assert.ok(session);
    assert.equal(session!.email, "stuscyclerepairs@gmail.com");
  });
});
