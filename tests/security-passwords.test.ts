/**
 * Password security tests: hashing, transparent upgrade of legacy plaintext
 * passwords on login (including ADMIN accounts), no passwords in API
 * responses, and no passwords in emails.
 * Runs against an in-memory mock of the Upstash REST API, no real services.
 *
 *   npm run test:portal
 */
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();
const BASE = "http://localhost:3000";

// Capture outgoing Resend emails; optionally fail Redis writes.
const sentEmails: { to: string; subject: string; html: string }[] = [];
let failRedisWrites = false;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.includes("api.resend.com")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    sentEmails.push({ to: [].concat(body.to).join(","), subject: body.subject, html: body.html });
    return new Response(JSON.stringify({ id: "test-email" }), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (failRedisWrites && init?.body && /"(HSET|hset)"/.test(String(init.body))) {
    return new Response(JSON.stringify({ error: "simulated outage" }), { status: 500 });
  }
  return realFetch(input as RequestInfo, init);
}) as typeof fetch;

const LEGACY_ADMIN_PW = "Legacy-Admin-Pass-2024";
const LEGACY_USER_PW = "legacy-user-pw";

function seed() {
  mock.reset();
  mock.seed({
    hashes: {
      "saabai:users": {
        "hello@saabai.test": { id: "hello-saabai-test", name: "Shane Admin", email: "hello@saabai.test", password: LEGACY_ADMIN_PW, role: "admin", dashboardUrl: "/saabai-admin", approvedAt: "", createdAt: "" },
        "stu@cycle.test": { id: "stu-cycle-test", name: "Stu Smith", email: "stu@cycle.test", password: LEGACY_USER_PW, role: "user", dashboardUrl: "/dashboard", approvedAt: "", createdAt: "" },
      },
    },
  });
}

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.SAABAI_SESSION_SECRET = "test-secret-test-secret-test-secret-1234";
  process.env.SAABAI_ADMIN_ID = "saabai";
  process.env.RESEND_API_KEY = "re_test";
  process.env.NEXT_PUBLIC_BASE_URL = "https://www.saabai.ai";
  // Env-var ADMIN client (id === SAABAI_ADMIN_ID) with a plaintext env password.
  process.env.SAABAI_CLIENT_1_ID = "saabai";
  process.env.SAABAI_CLIENT_1_NAME = "Saabai";
  process.env.SAABAI_CLIENT_1_EMAIL = "admin-env@saabai.test";
  process.env.SAABAI_CLIENT_1_PASSWORD = "Env-Admin-Plain-1";
  process.env.SAABAI_CLIENT_1_DASHBOARD = "/saabai-admin";
});

after(() => {
  globalThis.fetch = realFetch;
  return new Promise<void>((r) => mock.server.close(() => r()));
});

beforeEach(() => {
  seed();
  sentEmails.length = 0;
  failRedisWrites = false;
});

async function storedUser(email: string): Promise<Record<string, unknown> | null> {
  const { getDirectoryUser } = await import("../lib/user-directory");
  return (await getDirectoryUser(email)) as unknown as Record<string, unknown> | null;
}

async function login(email: string, password: string, redirect = "") {
  const { POST } = await import("../app/api/auth/login/route");
  const body = new URLSearchParams({ email, password, redirect });
  const res = await POST(new NextRequest(`${BASE}/api/auth/login`, { method: "POST", body }));
  return { status: res.status, location: res.headers.get("location") ?? "", cookie: res.headers.get("set-cookie") ?? "" };
}

async function sessionFromCookie(cookie: string) {
  const { verifySessionToken } = await import("../lib/auth");
  const token = /saabai_session=([^;]+)/.exec(cookie)?.[1];
  assert.ok(token, "expected a session cookie");
  return verifySessionToken(decodeURIComponent(token));
}

async function adminCookie() {
  const { createSessionToken } = await import("../lib/auth");
  return `saabai_session=${await createSessionToken("saabai")}`;
}

async function waitFor(cond: () => boolean, ms = 3000) {
  const end = Date.now() + ms;
  while (!cond() && Date.now() < end) await new Promise((r) => setTimeout(r, 20));
}

// ── lib/password ──────────────────────────────────────────────────────────
test("hashPassword/verifyPassword: scrypt hashes, unique salts, legacy plaintext flagged for upgrade", async () => {
  const { hashPassword, verifyPassword, isHashedPassword } = await import("../lib/password");
  const h1 = await hashPassword("correct horse");
  const h2 = await hashPassword("correct horse");
  assert.match(h1, /^scrypt:16384:8:1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
  assert.notEqual(h1, h2, "salts must differ");
  assert.ok(!h1.includes("correct horse"));
  assert.ok(isHashedPassword(h1));

  assert.deepEqual(await verifyPassword("correct horse", h1), { ok: true, needsRehash: false });
  assert.deepEqual(await verifyPassword("wrong horse", h1), { ok: false, needsRehash: false });
  assert.deepEqual(await verifyPassword("plain-old", "plain-old"), { ok: true, needsRehash: true });
  assert.deepEqual(await verifyPassword("plain-ol", "plain-old"), { ok: false, needsRehash: false });
  assert.deepEqual(await verifyPassword("x", undefined), { ok: false, needsRehash: false });
  assert.deepEqual(await verifyPassword("", ""), { ok: false, needsRehash: false });
  assert.deepEqual(await verifyPassword("x", "scrypt:99999999:8:1:AAAA:BBBB"), { ok: false, needsRehash: false });
  assert.deepEqual(await verifyPassword("x", "scrypt:garbage"), { ok: false, needsRehash: false });
  // A user whose legacy plaintext happened to start with "scrypt:" can't be confused into a hash.
  assert.equal((await verifyPassword("scrypt:abc", "scrypt:abc")).ok, false);
});

// ── login: legacy upgrade, hashed login, wrong password ───────────────────
test("legacy plaintext user logs in and is upgraded to a hash; hashed login then works", async () => {
  const first = await login("stu@cycle.test", LEGACY_USER_PW);
  assert.equal(first.status, 303);
  assert.equal(new URL(first.location).pathname, "/dashboard");
  assert.equal((await sessionFromCookie(first.cookie))?.clientId, "stu-cycle-test");

  const after1 = await storedUser("stu@cycle.test");
  assert.match(String(after1?.password), /^scrypt:/, "stored password should now be a hash");
  assert.ok(!String(after1?.password).includes(LEGACY_USER_PW));
  // Everything else on the record is untouched.
  assert.equal(after1?.name, "Stu Smith");
  assert.equal(after1?.role, "user");

  const second = await login("STU@cycle.test ", LEGACY_USER_PW);
  assert.equal(second.status, 303);
  assert.equal(new URL(second.location).pathname, "/dashboard");
  assert.equal((await storedUser("stu@cycle.test"))?.password, after1?.password, "no re-hash needed on hashed login");
});

test("wrong password is rejected (legacy and hashed) and nothing is changed", async () => {
  const bad = await login("stu@cycle.test", "nope");
  assert.equal(bad.status, 303);
  assert.match(bad.location, /\/login\?error=invalid/);
  assert.equal(bad.cookie, "");
  assert.equal((await storedUser("stu@cycle.test"))?.password, LEGACY_USER_PW, "failed login must not upgrade");

  await login("stu@cycle.test", LEGACY_USER_PW); // upgrade
  const bad2 = await login("stu@cycle.test", LEGACY_USER_PW + "x");
  assert.match(bad2.location, /error=invalid/);
  assert.equal(bad2.cookie, "");
  const unknown = await login("nobody@nowhere.test", "whatever");
  assert.match(unknown.location, /error=invalid/);
});

// ── ADMIN accounts can never be locked out ────────────────────────────────
test("ADMIN directory account: existing plaintext password logs in, lands on /saabai-admin, gets upgraded, keeps working", async () => {
  const { isAdminSession } = await import("../lib/auth");
  // Same request the admin login form sends.
  const first = await login("hello@saabai.test", LEGACY_ADMIN_PW, "/saabai-admin");
  assert.equal(first.status, 303);
  assert.equal(new URL(first.location).pathname, "/saabai-admin");
  const s1 = await sessionFromCookie(first.cookie);
  assert.equal(s1?.clientId, "hello-saabai-test");
  assert.equal(await isAdminSession(s1!.clientId), true, "session must still be an admin session");

  const upgraded = await storedUser("hello@saabai.test");
  assert.match(String(upgraded?.password), /^scrypt:/);
  assert.equal(upgraded?.role, "admin", "role untouched by upgrade");

  // Same password still works after the upgrade, many times.
  for (let i = 0; i < 3; i++) {
    const again = await login("hello@saabai.test", LEGACY_ADMIN_PW, "/saabai-admin");
    assert.equal(new URL(again.location).pathname, "/saabai-admin");
    assert.equal(await isAdminSession((await sessionFromCookie(again.cookie))!.clientId), true);
  }
  assert.match((await login("hello@saabai.test", "wrong", "/saabai-admin")).location, /error=invalid/);
});

test("ADMIN still logs in if saving the upgraded hash fails (Redis write outage)", async () => {
  failRedisWrites = true;
  const res = await login("hello@saabai.test", LEGACY_ADMIN_PW, "/saabai-admin");
  assert.equal(new URL(res.location).pathname, "/saabai-admin");
  assert.equal((await sessionFromCookie(res.cookie))?.clientId, "hello-saabai-test");
  failRedisWrites = false;
  assert.equal((await storedUser("hello@saabai.test"))?.password, LEGACY_ADMIN_PW, "left as-is, upgraded next time");
  await login("hello@saabai.test", LEGACY_ADMIN_PW);
  assert.match(String((await storedUser("hello@saabai.test"))?.password), /^scrypt:/);
});

test("ADMIN env-var account (id = SAABAI_ADMIN_ID) logs in with its plaintext env password, and with a hashed env value", async () => {
  const { hashPassword } = await import("../lib/password");
  const res = await login("admin-env@saabai.test", "Env-Admin-Plain-1", "/saabai-admin");
  assert.equal(new URL(res.location).pathname, "/saabai-admin");
  assert.equal((await sessionFromCookie(res.cookie))?.clientId, "saabai");
  assert.match((await login("admin-env@saabai.test", "env-admin-plain-1")).location, /error=invalid/);

  const original = process.env.SAABAI_CLIENT_1_PASSWORD;
  process.env.SAABAI_CLIENT_1_PASSWORD = await hashPassword("Env-Admin-Plain-1");
  try {
    const hashed = await login("admin-env@saabai.test", "Env-Admin-Plain-1", "/saabai-admin");
    assert.equal((await sessionFromCookie(hashed.cookie))?.clientId, "saabai");
  } finally {
    process.env.SAABAI_CLIENT_1_PASSWORD = original;
  }
});

// ── change password ───────────────────────────────────────────────────────
test("change-password accepts a legacy current password and stores the new one hashed", async () => {
  const { POST } = await import("../app/api/auth/change-password/route");
  const { createSessionToken } = await import("../lib/auth");
  const cookie = `saabai_session=${await createSessionToken("stu-cycle-test")}`;
  const call = (body: object) => POST(new NextRequest(`${BASE}/api/auth/change-password`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(body) }));

  assert.equal((await call({ currentPassword: "wrong", newPassword: "brand-new-pass" })).status, 403);
  assert.equal((await call({ currentPassword: LEGACY_USER_PW, newPassword: "short" })).status, 400);
  const ok = await call({ currentPassword: LEGACY_USER_PW, newPassword: "brand-new-pass" });
  assert.equal(ok.status, 200);
  const stored = String((await storedUser("stu@cycle.test"))?.password);
  assert.match(stored, /^scrypt:/);
  assert.ok(!stored.includes("brand-new-pass"));
  assert.equal(new URL((await login("stu@cycle.test", "brand-new-pass")).location).pathname, "/dashboard");
  assert.match((await login("stu@cycle.test", LEGACY_USER_PW)).location, /error=invalid/);
});

// ── admin user APIs never return passwords ────────────────────────────────
test("user-directory GET/POST/PATCH never return password fields; passwords are stored hashed", async () => {
  const route = await import("../app/api/user-directory/route");
  const cookie = await adminCookie();
  const req = (method: string, body?: object) =>
    new NextRequest(`${BASE}/api/user-directory`, { method, headers: { cookie, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });

  const created = await route.POST(req("POST", { name: "New Client", email: "New@Client.test", password: "Chosen-By-Admin-1", role: "user", dashboardUrl: "/dashboard" }));
  const createdText = await created.text();
  assert.equal(created.status, 200);
  assert.ok(!/password/i.test(createdText), `POST response leaked a password field: ${createdText}`);
  assert.ok(!createdText.includes("Chosen-By-Admin-1") && !createdText.includes("scrypt:"));
  assert.match(String((await storedUser("new@client.test"))?.password), /^scrypt:/);

  const patched = await route.PATCH(req("PATCH", { originalEmail: "new@client.test", password: "Changed-By-Admin-2" }));
  const patchedText = await patched.text();
  assert.ok(!/password/i.test(patchedText) && !patchedText.includes("scrypt:"), patchedText);
  assert.match(String((await storedUser("new@client.test"))?.password), /^scrypt:/);
  assert.equal(new URL((await login("new@client.test", "Changed-By-Admin-2")).location).pathname, "/dashboard");

  const listed = await route.GET(req("GET"));
  const listedText = await listed.text();
  assert.ok(JSON.parse(listedText).users.length >= 3);
  assert.ok(!/password/i.test(listedText), "GET leaked a password field");
  assert.ok(!listedText.includes("scrypt:") && !listedText.includes(LEGACY_ADMIN_PW) && !listedText.includes("Env-Admin-Plain-1"));

  // Non-admins are refused.
  const { createSessionToken } = await import("../lib/auth");
  const userCookie = `saabai_session=${await createSessionToken("stu-cycle-test")}`;
  const denied = await route.GET(new NextRequest(`${BASE}/api/user-directory`, { headers: { cookie: userCookie } }));
  assert.equal(denied.status, 403);
});

// ── emails never contain a password ───────────────────────────────────────
test("admin-created user with invite: welcome email has a set-password link and never the password", async () => {
  const route = await import("../app/api/user-directory/route");
  const cookie = await adminCookie();
  const res = await route.POST(new NextRequest(`${BASE}/api/user-directory`, {
    method: "POST", headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ name: "Invited Person", email: "invited@client.test", password: "Admin-Typed-Secret-9", role: "user", dashboardUrl: "/dashboard", sendInvite: true }),
  }));
  assert.equal((await res.json()).inviteQueued, true);
  await waitFor(() => sentEmails.length > 0);
  assert.equal(sentEmails.length, 1);
  const mail = sentEmails[0];
  assert.equal(mail.to, "invited@client.test");
  assert.ok(!mail.html.includes("Admin-Typed-Secret-9"), "email must not contain the password");
  assert.ok(!/Your Login Details|>Password</i.test(mail.html));
  const link = /href="(https:\/\/www\.saabai\.ai\/reset-password\?token=[^"&]+&amp;welcome=1)"/.exec(mail.html)?.[1];
  assert.ok(link, "expected a set-password link on the fixed base URL");
  assert.match(mail.html, /Email me a sign-in link/);

  // The link sets a password exactly once, stored hashed.
  const token = new URL(link.replace(/&amp;/g, "&")).searchParams.get("token")!;
  const reset = await import("../app/api/auth/reset-password/route");
  const call = () => reset.POST(new NextRequest(`${BASE}/api/auth/reset-password`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password: "Own-Choice-123" }) }));
  assert.equal((await call()).status, 200);
  assert.equal((await call()).status, 400, "link is single-use");
  assert.match(String((await storedUser("invited@client.test"))?.password), /^scrypt:/);
  assert.equal(new URL((await login("invited@client.test", "Own-Choice-123")).location).pathname, "/dashboard");
});

test("admin-created user with a blank password still gets a hashed random password and a welcome link", async () => {
  const route = await import("../app/api/user-directory/route");
  const res = await route.POST(new NextRequest(`${BASE}/api/user-directory`, {
    method: "POST", headers: { cookie: await adminCookie(), "content-type": "application/json" },
    body: JSON.stringify({ name: "No Pass", email: "nopass@client.test", role: "user", dashboardUrl: "/dashboard", sendInvite: false }),
  }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).inviteQueued, true, "blank password always sends the welcome link");
  assert.match(String((await storedUser("nopass@client.test"))?.password), /^scrypt:/);
  await waitFor(() => sentEmails.length > 0);
  assert.match(sentEmails[0].html, /reset-password\?token=/);
});

test("Stripe checkout account creation: hashed random password, welcome email without any password", async () => {
  const { ensureClientAccount } = await import("../lib/client-account");
  const { created, user } = await ensureClientAccount({ name: "Pat Buyer", email: "Pat@Buyer.test", productName: "Website Care" });
  assert.equal(created, true);
  assert.match(user.password, /^scrypt:/);
  assert.equal(sentEmails.length, 1);
  const mail = sentEmails[0];
  assert.equal(mail.to, "pat@buyer.test");
  assert.match(mail.html, /Website Care/);
  assert.match(mail.html, /reset-password\?token=[^"]+welcome=1/);
  assert.ok(!/Your Login Details|>Password</i.test(mail.html), "no credentials table");
  // The only secret-looking value in the email is the single-use link token.
  assert.ok(!mail.html.includes(user.password));
  // Idempotent: second call doesn't create or email again.
  const again = await ensureClientAccount({ name: "Pat Buyer", email: "pat@buyer.test", productName: "Website Care" });
  assert.equal(again.created, false);
  assert.equal(sentEmails.length, 1);
});

test("Wholesale Homes approve-lead: hashed password, branded welcome email without any password", async () => {
  const { POST } = await import("../app/api/site-factory/approve-lead/route");
  const res = await POST(new Request(`${BASE}/api/site-factory/approve-lead`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Wendy Buyer", email: "wendy@homes.test" }) }));
  assert.equal(res.status, 200);
  assert.match(String((await storedUser("wendy@homes.test"))?.password), /^scrypt:/);
  assert.equal(sentEmails.length, 1);
  assert.match(sentEmails[0].html, /Wholesale Homes Australia/);
  assert.match(sentEmails[0].html, /reset-password\?token=/);
  assert.ok(!/Your Login Details|>Password</i.test(sentEmails[0].html));
});
