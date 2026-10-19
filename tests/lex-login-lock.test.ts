/**
 * Lex is login-only: /lex (and subroutes) redirect logged-out visitors to /login with a return path,
 * and /api/lex-extract + /api/lex-compare need a session like the other Lex APIs.
 * Signed-in Saabai users, portal (law-firm) users and admins still get through.
 * In-memory Upstash mock, no real services.   npx tsx --test tests/lex-login-lock.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
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
  process.env.PORTAL_SESSION_SECRET = "portal-test-secret-portal-test-secret";
  mock.seed({
    hashes: {
      "saabai:users": {
        "lexclient@firm.test": JSON.stringify({ id: "lexclient", name: "Lex Client", email: "lexclient@firm.test", password: "x", role: "user", dashboardUrl: "/dashboard", products: ["lex"], approvedAt: "", createdAt: "" }),
      },
    },
  });
});
after(() => new Promise<void>((r) => mock.server.close(() => r())));

type Who = null | { saabai: string } | { portal: string };
async function call(who: Who, method: string, path: string) {
  const { proxy } = await import("../proxy");
  const { createSessionToken, COOKIE_NAME } = await import("../lib/auth");
  const { signSession } = await import("../lib/portal-session");
  const headers: Record<string, string> = { host: "localhost" };
  if (who && "saabai" in who) headers.cookie = `${COOKIE_NAME}=${await createSessionToken(who.saabai)}`;
  if (who && "portal" in who) headers.cookie = `portal_session=${signSession(who.portal)}`;
  return (await proxy(new NextRequest(`http://localhost${path}`, { method, headers })))!;
}
const passes = (r: Response) => r.status === 200 && !r.headers.get("location");

test("logged out: /lex and subroutes redirect to /login with a return path", async () => {
  for (const [path, back] of [["/lex", "/lex"], ["/lex/anything", "/lex/anything"], ["/lex?q=adverse%20possession", "/lex?q=adverse%20possession"]]) {
    const r = await call(null, "GET", path);
    assert.ok([302, 307, 308].includes(r.status), `${path} -> ${r.status}`);
    const loc = new URL(r.headers.get("location")!);
    assert.equal(loc.pathname, "/login", path);
    assert.equal(loc.searchParams.get("redirect"), back, path);
    // the login page only follows it if safeRedirect accepts it
    const { safeRedirect } = await import("../lib/safe-redirect");
    assert.equal(safeRedirect(back, "/dashboard"), back, path);
  }
});

test("logged out: /api/lex-extract and /api/lex-compare return 401", async () => {
  for (const p of ["/api/lex-extract", "/api/lex-compare"]) {
    const r = await call(null, "POST", p);
    assert.equal(r.status, 401, p);
  }
});

test("lookalike public routes are untouched: /legal, /lex-widget, /api/lex-chat, /api/lex-leads", async () => {
  for (const p of ["/legal", "/lex-widget", "/lex-widget?client=tributum"]) assert.ok(passes(await call(null, "GET", p)), p);
  for (const p of ["/api/lex-chat", "/api/lex-leads"]) assert.notEqual((await call(null, "POST", p)).status, 401, p);
});

test("signed in: Saabai Lex user, portal (law-firm) user and admin reach /lex and both APIs", async () => {
  const people: Who[] = [{ saabai: "lexclient" }, { portal: "partner@firm.test" }, { saabai: "saabai" }];
  for (const who of people) {
    assert.ok(passes(await call(who, "GET", "/lex")), `/lex ${JSON.stringify(who)}`);
    assert.ok(passes(await call(who, "GET", "/lex?q=test")), `/lex?q ${JSON.stringify(who)}`);
    for (const p of ["/api/lex-extract", "/api/lex-compare"]) assert.ok(passes(await call(who, "POST", p)), `${p} ${JSON.stringify(who)}`);
  }
});

test("a forged or expired session does not unlock /lex", async () => {
  const { proxy } = await import("../proxy");
  const r = await proxy(new NextRequest("http://localhost/lex", { headers: { host: "localhost", cookie: "portal_session=e30.forged" } }));
  assert.equal(new URL(r!.headers.get("location")!).pathname, "/login");
  const { signSession } = await import("../lib/portal-session");
  const r2 = await proxy(new NextRequest("http://localhost/api/lex-compare", { method: "POST", headers: { host: "localhost", cookie: `portal_session=${signSession("x@firm.test", -1000)}` } }));
  assert.equal(r2!.status, 401);
});

test("admin pages still send logged-out visitors to the admin sign-in", async () => {
  const r = await call(null, "GET", "/saabai-admin/coupons");
  const loc = new URL(r.headers.get("location")!);
  assert.equal(loc.pathname, "/saabai-admin/login");
  assert.equal(loc.searchParams.get("redirect"), "/saabai-admin/coupons");
});
