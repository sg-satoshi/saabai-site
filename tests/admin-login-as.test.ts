/**
 * Admin "Login as": admin-only, never admins or staff, 1-hour, audited, blocks password and billing, Exit restores.
 * In-memory Upstash mock, no AI calls.   npx tsx --test tests/admin-login-as.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();
before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.SAABAI_ADMIN_ID = "saabai";
  process.env.SAABAI_SESSION_SECRET = "unit-test-secret-0123456789abcdef";
  const { saveDirectoryUser } = await import("../lib/user-directory");
  const base = { password: "x", dashboardUrl: "/lex", createdAt: new Date().toISOString() };
  await saveDirectoryUser({ ...base, id: "bot-user", name: "QA Bot", email: "bot@firm.test", role: "user", products: ["lex"] } as never);
  await saveDirectoryUser({ ...base, id: "other-admin", name: "Other Admin", email: "adm@saabai.test", role: "admin" } as never);
  await saveDirectoryUser({ ...base, id: "a-staffer", name: "Staffer", email: "staff@saabai.test", role: "staff", access: { role: "viewer", areas: {} } } as never);
});
after(() => mock.server.close());

async function session(id: string) {
  const { createSessionToken } = await import("../lib/auth");
  return createSessionToken(id);
}
const start = async (cookie: string, userId: string) => {
  const { POST } = await import("../app/api/admin/login-as/route");
  return POST(new NextRequest("http://localhost/api/admin/login-as", { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({ userId }) }));
};
const cookieVal = (res: Response, name: string) => {
  const all = (res.headers as unknown as { getSetCookie(): string[] }).getSetCookie();
  const c = all.find((x) => x.startsWith(`${name}=`));
  return c ? c.slice(name.length + 1).split(";")[0] : undefined;
};

test("non-admins get 403 from the API (no session, a client user, staff)", async () => {
  assert.equal((await start("", "bot-user")).status, 403);
  assert.equal((await start(`saabai_session=${await session("bot-user")}`, "bot-user")).status, 403);
  assert.equal((await start(`saabai_session=${await session("a-staffer")}`, "bot-user")).status, 403);
});

test("admins and staff cannot be viewed as", async () => {
  const admin = `saabai_session=${await session("saabai")}`;
  assert.equal((await start(admin, "other-admin")).status, 403);
  assert.equal((await start(admin, "a-staffer")).status, 403);
  assert.equal((await start(admin, "nobody")).status, 404);
});

test("admin starts, gets a 1-hour session as the user, banner cookie, audit; Exit restores the admin", async () => {
  const adminTok = await session("saabai");
  const res = await start(`saabai_session=${adminTok}`, "bot-user");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.redirect, "/lex?view=dashboard");
  const userTok = cookieVal(res, "saabai_session")!;
  const marker = cookieVal(res, "saabai_login_as")!;
  assert.equal(decodeURIComponent(cookieVal(res, "saabai_viewing_as")!), "QA Bot");
  const { verifySessionToken } = await import("../lib/auth");
  assert.equal((await verifySessionToken(userTok))?.clientId, "bot-user");
  const exp = Number(userTok.split(".")[1]);
  assert.ok(exp - Date.now() / 1000 <= 3600 + 5, "session lasts at most 1 hour");
  assert.ok(body.expiresAt - Date.now() <= 3600 * 1000 + 5000);

  // Blocked while viewing as
  const cookie = `saabai_session=${userTok}; saabai_login_as=${marker}`;
  const cp = await import("../app/api/auth/change-password/route");
  const r1 = await cp.POST(new NextRequest("http://localhost/api/auth/change-password", { method: "POST", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: "x", newPassword: "abcdefgh1" }) }));
  assert.equal(r1.status, 403);
  const pb = await import("../app/api/portal/billing/route");
  assert.equal((await pb.POST(new Request("http://localhost/api/portal/billing", { method: "POST", headers: { cookie }, body: "{}" }))).status, 403);
  const bp = await import("../app/api/dashboard/billing/portal/route");
  assert.equal((await bp.POST(new Request("http://localhost/api/dashboard/billing/portal", { method: "POST", headers: { cookie } }))).status, 403);

  // Exit restores the admin session and clears the markers
  const exit = await import("../app/api/auth/login-as/exit/route");
  const out = await exit.POST(new Request("http://localhost/api/auth/login-as/exit", { method: "POST", headers: { cookie } }));
  assert.equal(out.status, 303);
  assert.equal(out.headers.get("location"), "/saabai-admin/users");
  assert.equal(cookieVal(out, "saabai_session"), adminTok);
  assert.equal(cookieVal(out, "saabai_login_as"), "");

  // Audit: start and end with admin, target and time
  const { getRedis } = await import("../lib/redis");
  const rows = ((await getRedis()!.lrange("impersonate:audit", 0, 10)) as unknown[]).map((r) => (typeof r === "string" ? JSON.parse(r) : r));
  const mine = rows.filter((r: { clientId: string }) => r.clientId === "bot-user");
  assert.deepEqual(mine.map((r: { action: string }) => r.action).sort(), ["end", "start"]);
  for (const r of mine) { assert.equal(r.adminId, "saabai"); assert.ok(!Number.isNaN(Date.parse(r.at))); }
});

test("an expired or tampered marker cannot restore an admin session", async () => {
  const { signLoginAs, verifyLoginAs } = await import("../lib/login-as");
  const { token } = signLoginAs({ adminId: "saabai", adminToken: await session("saabai"), targetId: "bot-user", targetEmail: "bot@firm.test", targetName: "QA Bot" }, Date.now() - 2 * 3600 * 1000);
  assert.equal(verifyLoginAs(token), null);
  const exit = await import("../app/api/auth/login-as/exit/route");
  const out = await exit.POST(new Request("http://localhost/api/auth/login-as/exit", { method: "POST", headers: { cookie: `saabai_login_as=${token}x` } }));
  assert.equal(out.headers.get("location"), "/saabai-admin/login");
  assert.equal(cookieVal(out, "saabai_session"), "");
});

test("the Login as button only renders for full admins", () => {
  const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
  assert.match(read("app/saabai-admin/users/UsersClient.tsx"), /canLoginAs && !isEnv && user\.role === "user"/);
  assert.match(read("app/saabai-admin/users/page.tsx"), /canLoginAs = !!session && \(await isAdminSession/);
  assert.match(read("proxy.ts"), /"\/api\/auth\/login-as\/exit"/);
});
