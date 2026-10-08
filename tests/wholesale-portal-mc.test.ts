/**
 * Wholesale Homes client login (per-user accounts + shared fallback, signed
 * session, server-side gate), portal approvals that can actually sign in,
 * Mission Control admin gate, and the custom-domain API auth fix.
 * Runs against an in-memory mock of the Upstash REST API, no real services.
 *
 *   npm run test:portal
 */
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();
const BASE = "http://localhost:3000";

const sentEmails: { to: string; subject: string; html: string; from: string }[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.includes("api.resend.com")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    sentEmails.push({ to: [].concat(body.to).join(","), subject: body.subject, html: body.html, from: body.from });
    return new Response(JSON.stringify({ id: "test-email" }), { status: 200, headers: { "content-type": "application/json" } });
  }
  return realFetch(input as RequestInfo, init);
}) as typeof fetch;

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.SAABAI_SESSION_SECRET = "test-secret-test-secret-test-secret-1234";
  process.env.PORTAL_SESSION_SECRET = "portal-test-secret-portal-test-secret";
  process.env.SAABAI_ADMIN_ID = "saabai";
  process.env.RESEND_API_KEY = "re_test";
  process.env.NEXT_PUBLIC_BASE_URL = "https://www.saabai.ai";
  process.env.WHOLESALE_CLIENT_EMAIL = "Shared@WholesaleHomes.test";
  process.env.WHOLESALE_CLIENT_PASS = "Shared-Plain-Pass";
  process.env.SAABAI_CLIENT_1_ID = "envclient";
  process.env.SAABAI_CLIENT_1_NAME = "Env Client";
  process.env.SAABAI_CLIENT_1_EMAIL = "env@client.test";
  process.env.SAABAI_CLIENT_1_PASSWORD = "env-pass-123";
});

after(() => {
  globalThis.fetch = realFetch;
  return new Promise<void>((r) => mock.server.close(() => r()));
});

const WH_LEGACY = { id: "olga-buyer-test", name: "Olga Buyer", email: "olga@buyer.test", password: "olga-legacy-pw", role: "user", dashboardUrl: "/sites/wholesale-homes/client/dashboard", approvedAt: "", createdAt: "" };
const SAABAI_CLIENT = { id: "stu-cycle-test", name: "Stu", email: "stu@cycle.test", password: "stu-pw-1234", role: "user", dashboardUrl: "/dashboard", approvedAt: "", createdAt: "" };

beforeEach(() => {
  mock.reset();
  mock.seed({
    hashes: {
      "saabai:users": { [WH_LEGACY.email]: JSON.stringify(WH_LEGACY), [SAABAI_CLIENT.email]: JSON.stringify(SAABAI_CLIENT) },
      "saabai:domain-map": { "wholesalehomes.com.au": "wholesale-homes" },
      "portal:pending": { "newbie@firm.test": JSON.stringify({ name: "New Bie", email: "newbie@firm.test", company: "Firm", requestedAt: "" }) },
      "portal:users": {
        "legacy@firm.test": JSON.stringify({ id: "legacy", name: "Legacy Person", email: "legacy@firm.test", password: "legacy-plain-pw", dashboardUrl: "/rex-dashboard", approvedAt: "2026-01-01" }),
        "env@client.test": JSON.stringify({ id: "env", name: "Env", email: "env@client.test", password: "portal-pw-xyz", dashboardUrl: "/x", approvedAt: "" }),
      },
    },
  });
  sentEmails.length = 0;
});

// ── helpers ───────────────────────────────────────────────────────────────
async function whLogin(email: string, password: string) {
  const { POST } = await import("../app/api/wholesale-auth/route");
  const res = await POST(new Request(`${BASE}/api/wholesale-auth`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) }));
  const cookie = res.headers.get("set-cookie") ?? "";
  return { status: res.status, cookie, token: /wh_session=([^;]+)/.exec(cookie)?.[1] ?? "" };
}
async function whMe(token: string) {
  const { GET } = await import("../app/api/wholesale-auth/route");
  const res = await GET(new NextRequest(`${BASE}/api/wholesale-auth`, { headers: { cookie: `wh_session=${token}` } }));
  return { status: res.status, body: await res.json() };
}
async function storedUser(email: string) {
  const { getDirectoryUser } = await import("../lib/user-directory");
  return getDirectoryUser(email);
}
async function saabaiLogin(email: string, password: string) {
  const { POST } = await import("../app/api/auth/login/route");
  const res = await POST(new NextRequest(`${BASE}/api/auth/login`, { method: "POST", body: new URLSearchParams({ email, password, redirect: "" }) }));
  return { location: res.headers.get("location") ?? "", cookie: res.headers.get("set-cookie") ?? "" };
}
async function setPasswordFromEmail(html: string, password: string) {
  const token = /[?&]token=([^"&]+)/.exec(html)?.[1];
  assert.ok(token, "email has a set-password token");
  const { POST } = await import("../app/api/auth/reset-password/route");
  return POST(new NextRequest(`${BASE}/api/auth/reset-password`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password }) }));
}
async function adminCookie() {
  const { createSessionToken } = await import("../lib/auth");
  return `saabai_session=${await createSessionToken("saabai")}`;
}

// ── (a) Wholesale Homes client login ──────────────────────────────────────
test("Wholesale: approve-lead account -> welcome email -> set password on wholesalehomes.com.au -> sign in with a signed session", async () => {
  const { POST } = await import("../app/api/site-factory/approve-lead/route");
  const r = await POST(new Request(`${BASE}/api/site-factory/approve-lead`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Wendy Buyer", email: "Wendy@Homes.test" }) }));
  assert.equal(r.status, 200);
  const user = await storedUser("wendy@homes.test");
  assert.equal(user?.siteId, "wholesale-homes");
  assert.match(String(user?.password), /^scrypt:/);

  assert.equal(sentEmails.length, 1);
  const mail = sentEmails[0];
  assert.match(mail.from, /wholesalehomes\.com\.au/);
  assert.match(mail.html, /https:\/\/www\.wholesalehomes\.com\.au\/set-password\?token=[^"]+welcome=1/, "Wholesale-branded set-password link");
  assert.ok(!/>Password</.test(mail.html));

  // Random password isn't known to anyone, so login fails until they set one.
  assert.equal((await whLogin("wendy@homes.test", "anything-goes")).status, 401);
  assert.equal((await setPasswordFromEmail(mail.html, "Wendy-Chosen-1")).status, 200);

  const ok = await whLogin(" WENDY@homes.test", "Wendy-Chosen-1");
  assert.equal(ok.status, 200);
  assert.match(ok.cookie, /wh_session=[^;]+; Path=\/; HttpOnly;( Secure;)? SameSite=Lax; Max-Age=604800/);
  const me = await whMe(ok.token);
  assert.deepEqual(me, { status: 200, body: { authenticated: true, email: "wendy@homes.test", name: "Wendy Buyer" } });
});

test("Wholesale: wrong password and unknown emails are rejected without a cookie", async () => {
  for (const [e, p] of [["olga@buyer.test", "nope"], ["ghost@x.test", "olga-legacy-pw"], ["", ""], ["olga@buyer.test", ""]]) {
    const r = await whLogin(e, p);
    assert.equal(r.status, 401, `${e}/${p}`);
    assert.equal(r.cookie, "");
  }
});

test("Wholesale: legacy plaintext account signs in and is upgraded to a hash", async () => {
  const r = await whLogin("olga@buyer.test", "olga-legacy-pw");
  assert.equal(r.status, 200);
  assert.match(String((await storedUser("olga@buyer.test"))?.password), /^scrypt:/);
  // Session issued before the upgrade finished still matches the upgraded value.
  assert.equal((await whMe(r.token)).status, 200);
  assert.equal((await whLogin("olga@buyer.test", "olga-legacy-pw")).status, 200);
});

test("Wholesale: shared env login still works as a fallback (plain text or hashed env value)", async () => {
  const r = await whLogin("shared@wholesalehomes.test", "Shared-Plain-Pass");
  assert.equal(r.status, 200);
  assert.equal((await whMe(r.token)).body.email, "shared@wholesalehomes.test");
  assert.equal((await whLogin("shared@wholesalehomes.test", "shared-plain-pass")).status, 401);

  const { hashPassword } = await import("../lib/password");
  const orig = process.env.WHOLESALE_CLIENT_PASS;
  process.env.WHOLESALE_CLIENT_PASS = await hashPassword("Shared-Plain-Pass");
  try {
    assert.equal((await whLogin("shared@wholesalehomes.test", "Shared-Plain-Pass")).status, 200);
    // Changing the shared password signs out sessions made with the old one.
    assert.equal((await whMe(r.token)).status, 401);
  } finally {
    process.env.WHOLESALE_CLIENT_PASS = orig;
  }
});

test("Wholesale: only Wholesale accounts can use it (a Saabai client can't sign in here)", async () => {
  assert.equal((await whLogin("stu@cycle.test", "stu-pw-1234")).status, 401);
  assert.equal((await whLogin("env@client.test", "env-pass-123")).status, 401);
});

test("Wholesale session: tampering, other session types, password change and deletion all invalidate it", async () => {
  const { createSessionToken, verifySessionToken } = await import("../lib/auth");
  const { signSession } = await import("../lib/portal-session");
  const { token } = await whLogin("olga@buyer.test", "olga-legacy-pw");
  assert.equal((await whMe(token)).status, 200);

  const [body, sig] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), email: "wendy@homes.test" })).toString("base64url");
  assert.equal((await whMe(`${forged}.${sig}`)).status, 401, "edited payload");
  assert.equal((await whMe(`${body}.${sig.slice(0, -2)}xx`)).status, 401, "bad signature");
  assert.equal((await whMe(await createSessionToken("olga-buyer-test"))).status, 401, "Saabai session can't be used");
  assert.equal((await whMe(signSession("olga@buyer.test"))).status, 401, "Lex portal session can't be used");
  assert.equal(await verifySessionToken(token), null, "wh_session can't be used as a Saabai session");

  // Password change (via reset link) signs the old session out.
  const { createPasswordToken } = await import("../lib/password-tokens");
  const t = await createPasswordToken("olga@buyer.test", "reset");
  assert.equal((await setPasswordFromEmail(`?token=${t}"`, "Olga-New-Pass-1")).status, 200);
  assert.equal((await whMe(token)).status, 401);
  const fresh = await whLogin("olga@buyer.test", "Olga-New-Pass-1");
  assert.equal((await whMe(fresh.token)).status, 200);

  // Deleting the account signs them out.
  const { deleteDirectoryUser } = await import("../lib/user-directory");
  await deleteDirectoryUser("olga@buyer.test");
  assert.equal((await whMe(fresh.token)).status, 401);
});

test("Wholesale: forgot password sends a Wholesale-branded link to the Wholesale set-password page", async () => {
  const { POST } = await import("../app/api/auth/forgot-password/route");
  const res = await POST(new NextRequest(`${BASE}/api/auth/forgot-password`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "olga@buyer.test" }) }));
  assert.equal(res.status, 200);
  const end = Date.now() + 3000;
  while (!sentEmails.length && Date.now() < end) await new Promise((r) => setTimeout(r, 20));
  assert.equal(sentEmails.length, 1);
  assert.match(sentEmails[0].from, /wholesalehomes/);
  assert.match(sentEmails[0].subject, /Wholesale Homes/);
  assert.match(sentEmails[0].html, /https:\/\/www\.wholesalehomes\.com\.au\/set-password\?token=/);
  assert.ok(!/welcome=1/.test(sentEmails[0].html));
});

test("Wholesale: logout clears the cookie", async () => {
  const { DELETE } = await import("../app/api/wholesale-auth/route");
  const res = await DELETE();
  assert.match(res.headers.get("set-cookie") ?? "", /wh_session=; .*Max-Age=0/);
});

test("Wholesale members pages are gated server-side; register stays public", () => {
  const root = new URL("../app/sites/wholesale-homes/client/", import.meta.url);
  for (const seg of ["account", "calculators", "dashboard", "packages", "resources"]) {
    const src = readFileSync(new URL(`${seg}/layout.tsx`, root), "utf8");
    assert.match(src, /await requireWholesaleClient\(\)/, `${seg} must be gated`);
  }
  assert.equal(existsSync(new URL("register/layout.tsx", root)), false, "register must stay public");
  assert.equal(existsSync(new URL("layout.tsx", root)) && /requireWholesaleClient/.test(readFileSync(new URL("layout.tsx", root), "utf8")), false);
  const shell = readFileSync(new URL("../app/sites/wholesale-homes/_components/ClientPortalShell.tsx", import.meta.url), "utf8");
  assert.match(shell, /method: "DELETE"/, "logout clears the server session");
});

test("wholesaleBasePath picks the right login path per host", async () => {
  const { wholesaleBasePath } = await import("../lib/wholesale-auth");
  assert.equal(wholesaleBasePath("www.wholesalehomes.com.au"), "");
  assert.equal(wholesaleBasePath("wholesalehomes.com.au"), "");
  assert.equal(wholesaleBasePath("www.saabai.ai"), "/sites/wholesale-homes");
  assert.equal(wholesaleBasePath("saabai-site-abc.vercel.app"), "/sites/wholesale-homes");
  assert.equal(wholesaleBasePath("localhost:3000"), "/sites/wholesale-homes");
});

// ── (b) portal approvals can sign in ──────────────────────────────────────
async function approve(body: object) {
  const { POST } = await import("../app/api/admin/portal-users/route");
  return POST(new NextRequest(`${BASE}/api/admin/portal-users`, { method: "POST", headers: { cookie: await adminCookie(), "content-type": "application/json" }, body: JSON.stringify({ action: "approve", ...body }) }));
}

test("Portal approval with a blank password: directory account + welcome link, then /login works", async () => {
  const res = await approve({ email: "NewBie@Firm.test", name: "New Bie", dashboardUrl: "/dashboard" });
  assert.equal(res.status, 200);
  const u = await storedUser("newbie@firm.test");
  assert.equal(u?.role, "user");
  assert.match(String(u?.password), /^scrypt:/);
  assert.deepEqual(mock.exec(["HKEYS", "portal:pending"]), [], "request cleared");
  assert.equal(sentEmails.length, 1);
  assert.match(sentEmails[0].html, /www\.saabai\.ai\/reset-password\?token=[^"]+welcome=1/);
  assert.equal((await setPasswordFromEmail(sentEmails[0].html, "Newbie-Pass-1")).status, 200);
  assert.equal(new URL((await saabaiLogin("newbie@firm.test", "Newbie-Pass-1")).location).pathname, "/dashboard");
});

test("Portal approval with an admin-set password: that password works at /login and isn't emailed", async () => {
  assert.equal((await approve({ email: "newbie@firm.test", name: "New Bie", password: "Admin-Set-Pass-9", dashboardUrl: "https://evil.com" })).status, 200);
  assert.equal((await storedUser("newbie@firm.test"))?.dashboardUrl, "/dashboard", "unsafe dashboard URL falls back");
  assert.equal(new URL((await saabaiLogin("newbie@firm.test", "Admin-Set-Pass-9")).location).pathname, "/dashboard");
  assert.ok(!sentEmails[0].html.includes("Admin-Set-Pass-9"));
  // Approving again doesn't overwrite the account.
  assert.equal((await approve({ email: "newbie@firm.test", password: "Other-Pass-123" })).status, 409);
  assert.equal(new URL((await saabaiLogin("newbie@firm.test", "Admin-Set-Pass-9")).location).pathname, "/dashboard");
});

test("Portal approvals need a Saabai admin session", async () => {
  const { POST } = await import("../app/api/admin/portal-users/route");
  const { createSessionToken } = await import("../lib/auth");
  const res = await POST(new NextRequest(`${BASE}/api/admin/portal-users`, { method: "POST", headers: { cookie: `saabai_session=${await createSessionToken("stu-cycle-test")}`, "content-type": "application/json" }, body: JSON.stringify({ action: "approve", email: "x@y.test" }) }));
  assert.equal(res.status, 401);
});

test("Older approvals stuck in portal:users can now sign in and are moved into the user store (hashed)", async () => {
  assert.match((await saabaiLogin("legacy@firm.test", "wrong-password")).location, /error=invalid/);
  assert.equal(await storedUser("legacy@firm.test"), null, "no migration on a wrong password");

  const ok = await saabaiLogin("legacy@firm.test", "legacy-plain-pw");
  assert.equal(new URL(ok.location).pathname, "/dashboard");
  const u = await storedUser("legacy@firm.test");
  assert.equal(u?.name, "Legacy Person");
  assert.equal(u?.role, "user");
  assert.match(String(u?.password), /^scrypt:/);
  assert.equal(new URL((await saabaiLogin("legacy@firm.test", "legacy-plain-pw")).location).pathname, "/dashboard");

  // An env-var account's email is never shadowed by an old portal record.
  assert.match((await saabaiLogin("env@client.test", "portal-pw-xyz")).location, /error=invalid/);
  assert.equal(await storedUser("env@client.test"), null);
});

// ── (c) Mission Control ───────────────────────────────────────────────────
test("Mission Control: no PIN in client code; server layout requires an admin session", () => {
  const page = readFileSync(new URL("../app/mission-control/page.tsx", import.meta.url), "utf8");
  assert.ok(!/NEXT_PUBLIC_MC_PASSWORD|saabai2026|AuthGate|mc_unlocked/.test(page), "PIN code removed");
  const layout = readFileSync(new URL("../app/mission-control/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /verifySessionToken/);
  assert.match(layout, /isAdminSession\(session\.clientId\)/);
  assert.match(layout, /redirect\("\/login\?redirect=\/mission-control"\)/);
});
