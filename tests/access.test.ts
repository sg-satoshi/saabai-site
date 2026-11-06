/**
 * Access model: roles, per-area read/write, deny-by-default, legacy admins unchanged, 2FA gate, proxy enforcement.
 * In-memory Upstash mock, no real services.   npx tsx --test tests/access.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";
import { AREAS, ACL_HEADER, aclHeaderValue, areaForPath, decide, gate, grantActive, levelFor, sanitizeGrant, type AccessGrant } from "../lib/access";

const mock = createMockUpstash();
const FUTURE = new Date(Date.now() + 86_400_000).toISOString();
const PAST = new Date(Date.now() - 86_400_000).toISOString();
const user = (id: string, role: string, access?: AccessGrant, extra: object = {}) => JSON.stringify({ id, name: id, email: `${id}@t.test`, password: "p", role, access, dashboardUrl: "/saabai-admin", approvedAt: "", createdAt: "", ...extra });

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.SAABAI_ADMIN_ID = "saabai";
  process.env.SAABAI_SESSION_SECRET = "unit-test-secret-0123456789abcdef";
  mock.seed({
    hashes: {
      "saabai:users": {
        "legacy@t.test": user("legacy", "admin"), // pre-existing record: role admin, no access block
        "viewer@t.test": user("viewer", "staff", { role: "viewer", areas: { coupons: "read", orders: "read" } }),
        "custom@t.test": user("custom", "staff", { role: "custom", areas: { coupons: "write", orders: "read" } }),
        "noenrol@t.test": user("noenrol", "staff", { role: "viewer", areas: { coupons: "read" } }),
        "off@t.test": user("off", "staff", { role: "custom", areas: { coupons: "write" }, disabled: true }),
        "old@t.test": user("old", "staff", { role: "custom", areas: { coupons: "write" }, expiresAt: PAST }),
        "offadmin@t.test": user("offadmin", "admin", { role: "admin", disabled: true }),
        "tampered@t.test": user("tampered", "admin", { role: "viewer", areas: { coupons: "read" } }), // contradictory: fail closed
        "client@t.test": user("client", "user"),
      },
    },
    strings: { "admin2fa:viewer": "{}", "admin2fa:custom": "{}", "admin2fa:old": "{}", "admin2fa:off": "{}" },
  });
});
after(() => new Promise<void>((r) => mock.server.close(() => r())));

const viewer: AccessGrant = { role: "viewer", areas: { coupons: "read", orders: "read", billing: "read" } };
const custom: AccessGrant = { role: "custom", areas: { coupons: "write", orders: "read" } };

// ── pure decisions ──
test("deny by default: unmapped paths are admin only for restricted roles", () => {
  for (const p of ["/api/admin/impersonate", "/api/admin/sell/charge", "/saabai-admin/audits", "/api/deploy", "/api/growth/x", "/api/admin/unknown-future-route", "/saabai-admin/some-new-page"]) {
    assert.equal(areaForPath(p), "admin-only", p);
    assert.equal(decide(custom, "GET", p).allow, false, p);
    assert.equal(decide({ role: "admin" }, "GET", p).allow, true, p);
  }
});

test("chat history uses chatbot access and leadgen clients use customer access", () => {
  const bots: AccessGrant = { role: "viewer", areas: { chatbots: "read" } };
  const cust: AccessGrant = { role: "viewer", areas: { customers: "read" } };
  assert.equal(areaForPath("/saabai-admin/chat-history"), "chatbots");
  assert.equal(areaForPath("/saabai-admin/chat-history?bot=lmm-site"), "chatbots");
  assert.equal(decide(bots, "GET", "/saabai-admin/chat-history").allow, true);
  assert.equal(decide(bots, "POST", "/saabai-admin/chat-history").allow, false);
  assert.equal(decide(cust, "GET", "/saabai-admin/chat-history").allow, false);
  assert.equal(decide({ role: "admin" }, "GET", "/saabai-admin/chat-history").allow, true);
  assert.equal(areaForPath("/saabai-admin/leadgen-clients"), "customers");
  assert.equal(decide(cust, "GET", "/saabai-admin/leadgen-clients?id=client_1").allow, true);
  assert.equal(decide(bots, "GET", "/saabai-admin/leadgen-clients").allow, false);
});

test("viewer: GET on granted areas only, never writes", () => {
  assert.equal(decide(viewer, "GET", "/api/admin/coupons").allow, true);
  assert.equal(decide(viewer, "HEAD", "/saabai-admin/marketing/offers").allow, true);
  for (const m of ["POST", "PUT", "PATCH", "DELETE"]) assert.equal(decide(viewer, m, "/api/admin/coupons").allow, false, m);
  assert.equal(decide(viewer, "GET", "/api/admin/customers").allow, false); // not granted
  // even a viewer record carrying "write" is capped to read
  assert.equal(levelFor({ role: "viewer", areas: { coupons: "write" } }, "coupons"), "read");
});

test("custom: per-area read vs write", () => {
  assert.equal(decide(custom, "POST", "/api/admin/coupons").allow, true);
  assert.equal(decide(custom, "GET", "/api/admin/orders").allow, true);
  assert.equal(decide(custom, "POST", "/api/admin/orders").allow, false);
  assert.equal(decide(custom, "GET", "/api/admin/announcements").allow, false);
});

test("users and billing writes can never be granted; users never at all", () => {
  const greedy: AccessGrant = { role: "custom", areas: { users: "write", billing: "write" } };
  assert.equal(decide(greedy, "GET", "/api/user-directory").allow, false);
  assert.equal(decide(greedy, "GET", "/saabai-admin/users").allow, false);
  assert.equal(decide(greedy, "POST", "/api/admin/billing/setup").allow, false);
  assert.equal(decide(greedy, "GET", "/api/admin/billing/catalog").allow, true);
  const s = sanitizeGrant({ role: "custom", areas: { users: "write", billing: "write", coupons: "write", nonsense: "write", orders: "bogus" } })!;
  assert.deepEqual(s.areas, { billing: "read", coupons: "write" });
});

test("path tricks do not escape the area map", () => {
  assert.equal(areaForPath("/api/admin/coupons/../impersonate"), "admin-only");
  assert.equal(areaForPath("/api//admin//coupons"), "coupons");
  assert.equal(areaForPath("/API/ADMIN/COUPONS"), "coupons"); // matching is case-insensitive; Next routes are case-sensitive, so this is only stricter
  assert.equal(areaForPath("/saabai-admin/marketing/offers-evil"), "admin-only");
});

test("expiry, disable and revoke kill a grant; bad expiry fails closed", () => {
  assert.equal(grantActive({ role: "custom", expiresAt: PAST }), false);
  assert.equal(grantActive({ role: "custom", expiresAt: FUTURE }), true);
  assert.equal(grantActive({ role: "custom", expiresAt: "not-a-date" }), false);
  assert.equal(grantActive({ role: "admin", disabled: true }), false);
  assert.equal(grantActive({ role: "custom", revokedAt: PAST }), false);
  assert.equal(decide({ role: "admin", disabled: true }, "GET", "/saabai-admin").allow, false);
  assert.equal(grantActive(undefined), true); // legacy
});

test("2FA gate: restricted without TOTP gets only the enrol paths", () => {
  assert.equal(gate(viewer, "GET", "/api/admin/coupons", false).action, "enrol");
  assert.equal(gate(viewer, "GET", "/saabai-admin/marketing/offers", false).action, "enrol");
  assert.equal(gate(viewer, "GET", "/saabai-admin/security", false).action, "allow");
  assert.equal(gate(viewer, "POST", "/api/admin/2fa", false).action, "allow");
  assert.equal(gate(viewer, "GET", "/api/admin/coupons", true).action, "allow");
  assert.equal(gate(viewer, "GET", "/api/admin/customers", true).action, "deny");
  assert.equal(gate({ role: "admin" }, "GET", "/api/admin/coupons", false).action, "allow"); // full admin flow unchanged
});

test("model carries external-principal fields (kind, scope, expiresAt) without behaviour change", () => {
  const g = sanitizeGrant({ role: "custom", kind: "client", areas: { chatbots: "read" }, scope: { tenantId: "stu", siteIds: ["stus-cycle", 5] }, expiresAt: FUTURE })!;
  assert.deepEqual(g.scope, { tenantId: "stu", siteIds: ["stus-cycle"] });
  assert.equal(g.kind, "internal"); // external kinds are not issuable yet
  assert.equal(decide(g, "GET", "/api/admin/chatbots").allow, true);
});

// ── resolution against stored records ──
test("legacy admins and env admin resolve to full admin, zero change", async () => {
  const { resolveStaff, isAdminSession } = await import("../lib/auth");
  assert.equal((await resolveStaff("saabai"))?.grant.role, "admin");
  assert.equal((await resolveStaff("legacy"))?.grant.role, "admin");
  assert.equal(await isAdminSession("legacy"), true);
  assert.equal(await isAdminSession("saabai"), true);
});

test("restricted staff are never full admin; inactive and inconsistent records resolve to nobody", async () => {
  const { resolveStaff, isAdminSession, isStaffSession } = await import("../lib/auth");
  for (const id of ["viewer", "custom"]) {
    assert.equal(await isAdminSession(id), false, id);
    assert.equal(await isStaffSession(id), true, id);
  }
  for (const id of ["off", "old", "offadmin", "tampered", "client", "nobody"]) assert.equal(await resolveStaff(id), null, id);
  assert.equal(await isAdminSession("offadmin"), false);
});

// ── proxy enforcement end to end ──
async function call(id: string | null, method: string, path: string, host = "localhost") {
  const { proxy } = await import("../proxy");
  const { createSessionToken, COOKIE_NAME } = await import("../lib/auth");
  const headers: Record<string, string> = { host };
  if (id) headers.cookie = `${COOKIE_NAME}=${await createSessionToken(id)}`;
  return proxy(new NextRequest(`http://${host}${path}`, { method, headers }));
}
const forwarded = (r: Response | undefined, h: string) => r?.headers.get(`x-middleware-request-${h}`);

test("proxy: viewer can GET coupons, cannot POST, cannot reach other areas or admin-only routes", async () => {
  const ok = (await call("viewer", "GET", "/api/admin/coupons"))!;
  assert.equal(ok.status, 200);
  assert.ok(forwarded(ok, ACL_HEADER), "approved request carries the proxy grant header");
  assert.equal(forwarded(ok, ACL_HEADER), await aclHeaderValue("viewer"));
  assert.equal((await call("viewer", "POST", "/api/admin/coupons"))!.status, 403);
  assert.equal((await call("viewer", "DELETE", "/api/admin/coupons/abc"))!.status, 403);
  assert.equal((await call("viewer", "GET", "/api/admin/customers"))!.status, 403);
  assert.equal((await call("viewer", "GET", "/api/user-directory"))!.status, 403);
  assert.equal((await call("viewer", "POST", "/api/admin/impersonate"))!.status, 403);
  assert.equal((await call("viewer", "GET", "/api/admin/something-new"))!.status, 403);
});

test("proxy: custom can write coupons but only read orders", async () => {
  assert.equal((await call("custom", "POST", "/api/admin/coupons"))!.status, 200);
  assert.equal((await call("custom", "GET", "/api/admin/orders"))!.status, 200);
  assert.equal((await call("custom", "POST", "/api/admin/orders"))!.status, 403);
});

test("proxy: restricted pages redirect, denied ones go to the admin home", async () => {
  const ok = (await call("viewer", "GET", "/saabai-admin/marketing/offers"))!;
  assert.equal(ok.status, 200);
  const no = (await call("viewer", "GET", "/saabai-admin/customers"))!;
  assert.equal(no.status, 307);
  assert.match(no.headers.get("location") ?? "", /\/saabai-admin\?denied=1/);
  assert.equal((await call("viewer", "GET", "/saabai-admin/users"))!.status, 307);
});

test("proxy: restricted account without 2FA only reaches the enrol page", async () => {
  const api = (await call("noenrol", "GET", "/api/admin/coupons"))!;
  assert.equal(api.status, 403);
  assert.match(await api.text(), /enrolment required/i);
  const page = (await call("noenrol", "GET", "/saabai-admin/marketing/offers"))!;
  assert.equal(page.status, 307);
  assert.match(page.headers.get("location") ?? "", /\/saabai-admin\/security/);
  assert.equal((await call("noenrol", "GET", "/saabai-admin/security"))!.status, 200);
  assert.equal((await call("noenrol", "POST", "/api/admin/2fa"))!.status, 200);
});

test("proxy: disabled and expired accounts are refused immediately; legacy admin unchanged", async () => {
  assert.equal((await call("off", "GET", "/api/admin/coupons"))!.status, 403);
  assert.equal((await call("old", "GET", "/api/admin/coupons"))!.status, 403);
  assert.equal((await call("offadmin", "GET", "/api/admin/coupons"))!.status, 403);
  assert.equal((await call("tampered", "GET", "/api/admin/coupons"))!.status, 403);
  for (const id of ["legacy", "saabai"]) {
    for (const [m, p] of [["GET", "/api/admin/coupons"], ["POST", "/api/user-directory"], ["POST", "/api/admin/impersonate"], ["GET", "/api/admin/billing/catalog"], ["PATCH", "/api/admin/orders"]] as const) {
      const r = (await call(id, m, p))!;
      assert.equal(r.status, 200, `${id} ${m} ${p}`);
      assert.equal(forwarded(r, ACL_HEADER), null, "full admins never get the grant header");
    }
  }
  assert.equal((await call("client", "GET", "/api/admin/coupons"))!.status, 403);
  assert.equal((await call(null, "GET", "/api/admin/coupons"))!.status, 401);
});

test("proxy: a forged grant header does not help", async () => {
  const { proxy } = await import("../proxy");
  const { createSessionToken, COOKIE_NAME } = await import("../lib/auth");
  const req = new NextRequest("http://localhost/api/admin/customers", { method: "GET", headers: { host: "localhost", [ACL_HEADER]: "deadbeef", cookie: `${COOKIE_NAME}=${await createSessionToken("viewer")}` } });
  assert.equal((await proxy(req))!.status, 403);
});

test("admin audit: writes are logged with the signed-in actor, GETs are not, no secrets", async () => {
  mock.exec(["DEL", "saabai:admin-audit"]);
  await call("custom", "POST", "/api/admin/coupons?secret=abc");
  await call("custom", "GET", "/api/admin/coupons");
  await call("viewer", "POST", "/api/admin/coupons");
  await call("legacy", "POST", "/api/admin/orders");
  const rows = (mock.exec(["LRANGE", "saabai:admin-audit", 0, -1]) as string[]).map((r) => JSON.parse(r));
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => [r.actor, r.result]).reverse(), [["custom", "allow"], ["viewer", "deny:needs-write"], ["legacy", "allow"]]);
  assert.equal(rows[2].email, "custom@t.test");
  assert.ok(!JSON.stringify(rows).includes("secret=abc"), "query strings are never logged");
  assert.ok(!JSON.stringify(rows).includes("password"));
});

test("every grantable area is reachable by at least one prefix and none overlap with admin-only routes", () => {
  for (const a of AREAS) assert.notEqual(areaForPath({ coupons: "/api/admin/coupons", products: "/api/admin/products", chatbots: "/api/admin/chatbots", experiments: "/api/admin/experiments", orders: "/api/admin/orders", customers: "/api/admin/customers", announcements: "/api/admin/announcements", billing: "/api/admin/billing/x", roadmap: "/api/admin/roadmap", users: "/api/user-directory" }[a]), "admin-only", a);
  assert.equal(areaForPath("/api/admin/impersonate"), "admin-only");
});

// ── users admin API ──
async function usersApi(method: string, id: string | null, body?: unknown) {
  const { GET, POST, PATCH, DELETE } = await import("../app/api/user-directory/route");
  const { createSessionToken, COOKIE_NAME } = await import("../lib/auth");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (id) headers.cookie = `${COOKIE_NAME}=${await createSessionToken(id)}`;
  const req = new NextRequest("http://localhost/api/user-directory", { method, headers, body: body ? JSON.stringify(body) : undefined });
  return ({ GET, POST, PATCH, DELETE } as Record<string, (r: NextRequest) => Promise<Response>>)[method](req);
}
const stored = (email: string) => JSON.parse(mock.exec(["HGET", "saabai:users", email]));

test("users API: restricted staff cannot manage users even with a grant header", async () => {
  assert.equal((await usersApi("GET", "viewer")).status, 403);
  assert.equal((await usersApi("POST", "custom", { name: "x", email: "x@t.test", password: "longenough1!", role: "admin" })).status, 403);
});

test("users API: admin creates a viewer; areas are validated and capped; legacy admin creation unchanged", async () => {
  const res = await usersApi("POST", "legacy", { name: "Chief", email: "chief@t.test", password: "correct-horse-battery-1", role: "staff", access: { role: "viewer", areas: { coupons: "write", users: "write" }, expiresAt: FUTURE } });
  assert.equal(res.status, 200);
  const rec = stored("chief@t.test");
  assert.equal(rec.role, "staff");
  assert.deepEqual(rec.access.areas, { coupons: "read" });
  assert.equal(rec.access.role, "viewer");
  assert.ok(rec.password && rec.password !== "correct-horse-battery-1", "stored as hash");
  assert.equal((await usersApi("POST", "legacy", { name: "A", email: "a2@t.test", password: "correct-horse-battery-1", role: "admin" })).status, 200);
  assert.equal(stored("a2@t.test").access, undefined, "plain admins keep the legacy shape");
  assert.equal((await usersApi("POST", "legacy", { name: "B", email: "b2@t.test", password: "correct-horse-battery-1", role: "staff" })).status, 400, "staff needs an access level");
  assert.equal((await usersApi("POST", "legacy", { name: "C", email: "c2@t.test", role: "superuser" })).status, 400);
});

test("users API: one-click disable / enable and lock-out protection", async () => {
  assert.equal((await usersApi("PATCH", "legacy", { originalEmail: "viewer@t.test", disabled: true })).status, 200);
  assert.equal(stored("viewer@t.test").access.disabled, true);
  assert.equal((await call("viewer", "GET", "/api/admin/coupons"))!.status, 403, "disable is instant");
  assert.equal((await usersApi("PATCH", "legacy", { originalEmail: "viewer@t.test", disabled: false })).status, 200);
  assert.equal((await call("viewer", "GET", "/api/admin/coupons"))!.status, 200);
  assert.equal((await usersApi("PATCH", "legacy", { originalEmail: "legacy@t.test", disabled: true })).status, 400);
  assert.equal((await usersApi("PATCH", "legacy", { originalEmail: "legacy@t.test", role: "staff", access: { role: "viewer" } })).status, 400);
  assert.equal((await usersApi("DELETE", "legacy", { email: "legacy@t.test" })).status, 400);
  assert.equal(stored("legacy@t.test").role, "admin");
});
