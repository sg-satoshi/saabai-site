/**
 * /api/leadgen/config auth. In-memory Redis only, no prod calls.
 *   npx tsx --test tests/leadgen-config-auth.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();
let route: typeof import("../app/api/leadgen/config/route");
let auth: typeof import("../lib/auth");
const URL_ = "http://localhost/api/leadgen/config";
const A = { id: "client_a", slug: "a-plumbing", businessName: "A Plumbing", email: "a@client.test", phone: "0400000001" };
const B = { id: "client_b", slug: "b-plumbing", businessName: "B Plumbing", email: "b@client.test", phone: "0400000002" };

before(async () => {
  await new Promise<void>((resolve) => mock.server.listen(0, "127.0.0.1", () => resolve()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.SAABAI_ADMIN_ID = "saabai";
  process.env.SAABAI_SESSION_SECRET = "unit-test-secret-0123456789abcdef";
  const { Redis } = await import("@upstash/redis");
  const r = Redis.fromEnv();
  await r.hset("leadgen:clients", { [A.id]: JSON.stringify(A), [B.id]: JSON.stringify(B) });
  await r.hset("saabai:users", {
    "b@client.test": JSON.stringify({ id: "user_b", name: "B", email: "b@client.test", password: "x", role: "user", dashboardUrl: "/leadgen/portal" }),
  });
  route = await import("../app/api/leadgen/config/route");
  auth = await import("../lib/auth");
});

after(() => new Promise<void>((resolve) => mock.server.close(() => resolve())));

async function req(method: string, who: string | null, body?: unknown): Promise<NextRequest> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (who) headers.cookie = `${auth.COOKIE_NAME}=${await auth.createSessionToken(who)}`;
  return new NextRequest(URL_, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
}

test("anonymous GET, POST and PATCH get 401 and leak nothing", async () => {
  const g = await route.GET(await req("GET", null));
  assert.equal(g.status, 401);
  assert.doesNotMatch(await g.text(), /client\.test|0400/);
  assert.equal((await route.POST(await req("POST", null, { slug: "x", businessName: "X", email: "x@x.test" }))).status, 401);
  assert.equal((await route.PATCH(await req("PATCH", null, { id: A.id, businessName: "pwned" }))).status, 401);
});

test("a forged or garbage cookie is treated as anonymous", async () => {
  const r = new NextRequest(URL_, { headers: { cookie: `${auth.COOKIE_NAME}=saabai.9999999999.bad` } });
  assert.equal((await route.GET(r)).status, 401);
});

test("a signed-in non-admin cannot list or create", async () => {
  assert.equal((await route.GET(await req("GET", "leadgen_client_a"))).status, 403);
  assert.equal((await route.GET(await req("GET", "user_b"))).status, 403);
  assert.equal((await route.POST(await req("POST", "user_b", { slug: "x", businessName: "X", email: "x@x.test" }))).status, 403);
});

test("a LeadGen client can PATCH only its own record", async () => {
  assert.equal((await route.PATCH(await req("PATCH", "leadgen_client_a", { id: B.id, businessName: "pwned" }))).status, 403);
  assert.equal((await route.PATCH(await req("PATCH", "user_b", { id: A.id, businessName: "pwned" }))).status, 403);
  assert.equal((await route.PATCH(await req("PATCH", "leadgen_client_a", { id: A.id, businessName: "A Plumbing 2" }))).status, 200);
  assert.equal((await route.PATCH(await req("PATCH", "user_b", { id: B.id, businessName: "B Plumbing 2" }))).status, 200);
});

test("admin can GET, POST and PATCH", async () => {
  const g = await route.GET(await req("GET", "saabai"));
  assert.equal(g.status, 200);
  const { clients } = await g.json();
  const names = clients.map((c: { businessName: string }) => c.businessName).sort();
  assert.deepEqual(names, ["A Plumbing 2", "B Plumbing 2"]);
  const p = await route.POST(await req("POST", "saabai", { slug: "c", businessName: "C", email: "c@client.test" }));
  assert.equal(p.status, 201);
  const dup = await route.POST(await req("POST", "saabai", { slug: "c", businessName: "C again", email: "c2@client.test" }));
  assert.equal(dup.status, 409);
  assert.equal((await route.PATCH(await req("PATCH", "saabai", { id: B.id, phone: "0400000009" }))).status, 200);
});

test("proxy no longer lists /api/leadgen/config as public", () => {
  const src = readFileSync("proxy.ts", "utf8");
  const pub = src.slice(src.indexOf("const PUBLIC_API"), src.indexOf("const ADMIN_API"));
  assert.doesNotMatch(pub, /^\s*"\/api\/leadgen\/config"/m);
});
