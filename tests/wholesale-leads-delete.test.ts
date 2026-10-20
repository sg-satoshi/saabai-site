/**
 * Delete pending Wholesale Homes registrations from Saabai admin.
 * In-memory Upstash mock, no real services.
 *
 *   npx tsx --test tests/wholesale-leads-delete.test.ts
 */
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";
import { areaForPath } from "../lib/access";

const mock = createMockUpstash();
const BASE = "http://localhost:3000";
const KEY = "saabai:leads:wholesale-homes";

const LEAD_A = { name: "Ada Buyer", email: "ada@lead.test", phone: "0400", siteSlug: "wholesale-homes", createdAt: 1 };
const LEAD_A_DUP = { name: "Ada Buyer", email: "Ada@lead.test", phone: "0400", siteSlug: "wholesale-homes", createdAt: 1 };
const LEAD_B = { name: "Bea Buyer", email: "bea@lead.test", phone: "0401", siteSlug: "wholesale-homes", createdAt: 2 };
const LEAD_C = { name: "Ada Later", email: "ada@lead.test", phone: "0402", siteSlug: "wholesale-homes", createdAt: 3 };
const OTHER = { name: "Other Site", email: "ada@lead.test", phone: "0403", siteSlug: "other-site", createdAt: 1 };
const APPROVED = { id: "ada-lead-test", name: "Ada Buyer", email: "ada@lead.test", password: "hashed", role: "user", dashboardUrl: "/sites/wholesale-homes/client/dashboard", siteId: "wholesale-homes", approvedAt: "", createdAt: "" };
const CLIENT = { id: "stu-cycle-test", name: "Stu", email: "stu@cycle.test", password: "stu-pw", role: "user", dashboardUrl: "/dashboard", approvedAt: "", createdAt: "" };
const VIEWER = { id: "viewer", name: "Viewer", email: "viewer@t.test", password: "p", role: "staff", access: { role: "viewer", areas: { coupons: "read" } }, dashboardUrl: "/saabai-admin", approvedAt: "", createdAt: "" };

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.SAABAI_SESSION_SECRET = "test-secret-test-secret-test-secret-1234";
  process.env.SAABAI_ADMIN_ID = "saabai";
});

after(() => new Promise<void>((r) => mock.server.close(() => r())));

beforeEach(() => {
  mock.reset();
  mock.seed({
    hashes: {
      "saabai:users": {
        [APPROVED.email]: JSON.stringify(APPROVED),
        [CLIENT.email]: JSON.stringify(CLIENT),
        [VIEWER.email]: JSON.stringify(VIEWER),
      },
    },
  });
  for (const lead of [LEAD_A, LEAD_A_DUP, LEAD_B, LEAD_C]) {
    mock.exec(["LPUSH", KEY, JSON.stringify(lead)]);
  }
  mock.exec(["LPUSH", "saabai:leads:other-site", JSON.stringify(OTHER)]);
});

async function saabaiCookie(clientId: string) {
  const { createSessionToken } = await import("../lib/auth");
  return `saabai_session=${await createSessionToken(clientId)}`;
}

async function call(cookie = "", body?: unknown) {
  const { DELETE } = await import("../app/api/admin/wholesale-leads/route");
  const req = new NextRequest(`${BASE}/api/admin/wholesale-leads`, {
    method: "DELETE",
    headers: { cookie, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const res = await DELETE(req);
  return { status: res.status, body: await res.json().catch(() => null) };
}

function emails(key = KEY): string[] {
  const raw = mock.exec(["LRANGE", key, "0", "-1"]) as string[];
  return raw.map((item) => JSON.parse(item).email.toLowerCase());
}

test("wholesale leads delete stays on the admin-only gate used by /saabai-admin", () => {
  assert.equal(areaForPath("/api/admin/wholesale-leads"), "admin-only");
  assert.equal(areaForPath("/saabai-admin/wholesale-leads"), "admin-only");
});

test("delete endpoint: no session, a bad session, and a non-admin are rejected and nothing is removed", async () => {
  assert.equal((await call("")).status, 401);
  assert.equal((await call("saabai_session=not-a-token", { leads: [{ email: LEAD_B.email, createdAt: LEAD_B.createdAt }] })).status, 401);
  assert.equal((await call(await saabaiCookie("stu-cycle-test"), { leads: [{ email: LEAD_B.email, createdAt: LEAD_B.createdAt }] })).status, 403);
  assert.equal((await call(await saabaiCookie("viewer"), { leads: [{ email: LEAD_B.email, createdAt: LEAD_B.createdAt }] })).status, 403);
  assert.deepEqual(emails().sort(), ["ada@lead.test", "ada@lead.test", "ada@lead.test", "bea@lead.test"]);
  assert.deepEqual(emails("saabai:leads:other-site"), ["ada@lead.test"]);
});

test("proxy: the delete endpoint uses the same admin session gate as other /api/admin routes", async () => {
  const { proxy } = await import("../proxy");
  const hit = async (cookie = "") => proxy(new NextRequest("https://www.saabai.ai/api/admin/wholesale-leads", {
    method: "DELETE",
    headers: { host: "www.saabai.ai", ...(cookie ? { cookie } : {}) },
  }));
  assert.equal((await hit()).status, 401);
  assert.equal((await hit(await saabaiCookie("stu-cycle-test"))).status, 403);
  assert.equal((await hit(await saabaiCookie("viewer"))).status, 403);
  const ok = await hit(await saabaiCookie("saabai"));
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("x-middleware-next"), "1");
});

test("delete endpoint: an admin hard-deletes one registration and leaves the rest", async () => {
  const res = await call(await saabaiCookie("saabai"), { leads: [{ email: "  BEA@lead.test ", createdAt: 2 }] });
  assert.equal(res.status, 200);
  assert.equal(res.body.deleted, 1);
  assert.deepEqual(emails().sort(), ["ada@lead.test", "ada@lead.test", "ada@lead.test"]);
  assert.equal(mock.exec(["HGET", "saabai:users", "ada@lead.test"]) !== null, true, "approved portal account stays");
  assert.deepEqual(emails("saabai:leads:other-site"), ["ada@lead.test"]);
});

test("delete endpoint: same email with a different time is a different registration", async () => {
  const res = await call(await saabaiCookie("saabai"), { leads: [{ email: "ada@lead.test", createdAt: 1 }] });
  assert.equal(res.status, 200);
  assert.equal(res.body.deleted, 2, "both stored copies of that registration go");
  const left = (mock.exec(["LRANGE", KEY, "0", "-1"]) as string[]).map((item) => JSON.parse(item));
  assert.deepEqual(left.map((l: { name: string }) => l.name).sort(), ["Ada Later", "Bea Buyer"]);
});

test("delete endpoint: bulk delete removes every selected registration", async () => {
  const res = await call(await saabaiCookie("saabai"), {
    leads: [
      { email: "ada@lead.test", createdAt: 1 },
      { email: "bea@lead.test", createdAt: 2 },
    ],
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.deleted, 3);
  const left = (mock.exec(["LRANGE", KEY, "0", "-1"]) as string[]).map((item) => JSON.parse(item));
  assert.deepEqual(left.map((l) => l.name), ["Ada Later"]);
});

test("delete endpoint: unknown registration is a 404 and bad input is a 400", async () => {
  const admin = await saabaiCookie("saabai");
  assert.equal((await call(admin, { leads: [{ email: "missing@lead.test", createdAt: 9 }] })).status, 404);
  assert.equal((await call(admin, { leads: [] })).status, 400);
  assert.equal((await call(admin, {})).status, 400);
  assert.equal((await call(admin, { leads: [{ email: "not-an-email", createdAt: 1 }] })).status, 400);
  assert.equal((await call(admin, "nope")).status, 400);
  assert.equal(emails().length, 4);
});

test("wholesale leads UI confirms name and email, and has no em dashes", () => {
  const src = readFileSync("app/saabai-admin/wholesale-leads/WholesaleLeadsClient.tsx", "utf8");
  assert.match(src, /Delete this registration\?/);
  assert.match(src, /lead\.email/);
  assert.match(src, /Delete selected/);
  assert.match(src, /\/api\/admin\/wholesale-leads/);
  assert.ok(!/[\u2013\u2014]/.test(src));
});
