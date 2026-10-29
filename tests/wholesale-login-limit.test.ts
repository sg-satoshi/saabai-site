/**
 * Wholesale sign-in brute-force limit (audit H5): 5 fails / 15 min per account,
 * 20 per IP, 429 + Retry-After, generic errors, success clears the account counter.
 * In-memory Upstash mock, no real services.   npx tsx --test tests/wholesale-login-limit.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();
const BASE = "https://www.saabai.ai";

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.SAABAI_SESSION_SECRET = "test-secret-test-secret-test-secret-1234";
  process.env.PORTAL_SESSION_SECRET = "portal-test-secret-portal-test-secret";
  process.env.SAABAI_ADMIN_ID = "saabai";
  process.env.WHOLESALE_CLIENT_EMAIL = "shared@wholesalehomes.test";
  process.env.WHOLESALE_CLIENT_PASS = "Shared-Plain-Pass";
  process.env.WHOLESALE_ADMIN_EMAIL = "boss@wholesalehomes.test";
  process.env.WHOLESALE_ADMIN_PASS = "Admin-Plain-Pass";
});

after(() => { mock.server.close(); });

async function post(path: string, email: string, password: string, ip: string) {
  const mod = await import(path === "client" ? "../app/api/wholesale-auth/route" : "../app/api/wholesale-admin-auth/route");
  return mod.POST(new Request(`${BASE}/api/x`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `${ip}, 10.0.0.1` },
    body: JSON.stringify({ email, password }),
  }));
}

test("client: 5 fails lock the account with 429 + Retry-After, even with the right password", async () => {
  for (let i = 0; i < 5; i++) assert.equal((await post("client", "shared@wholesalehomes.test", "wrong", "1.1.1.1")).status, 401);
  const r = await post("client", "shared@wholesalehomes.test", "Shared-Plain-Pass", "1.1.1.2");
  assert.equal(r.status, 429);
  const ra = Number(r.headers.get("Retry-After"));
  assert.ok(ra > 0 && ra <= 900);
});

test("generic errors: unknown account and wrong password look the same", async () => {
  const a = await post("client", "nobody@x.test", "p", "2.2.2.1");
  const b = await post("client", "other@x.test", "p", "2.2.2.1");
  assert.equal(a.status, 401); assert.equal(b.status, 401);
  assert.deepEqual(await a.json(), await b.json());
});

test("success clears the account counter", async () => {
  for (let i = 0; i < 4; i++) await post("admin", "boss@wholesalehomes.test", "wrong", "3.3.3.1");
  assert.equal((await post("admin", "boss@wholesalehomes.test", "Admin-Plain-Pass", "3.3.3.1")).status, 200);
  for (let i = 0; i < 4; i++) assert.equal((await post("admin", "boss@wholesalehomes.test", "wrong", "3.3.3.1")).status, 401);
  assert.equal((await post("admin", "boss@wholesalehomes.test", "Admin-Plain-Pass", "3.3.3.1")).status, 200);
});

test("per-IP: 20 fails across accounts block that IP only", async () => {
  for (let i = 0; i < 20; i++) await post("admin", `u${i}@x.test`, "p", "4.4.4.4");
  const r = await post("admin", "fresh@x.test", "p", "4.4.4.4");
  assert.equal(r.status, 429);
  assert.ok(r.headers.get("Retry-After"));
  assert.equal((await post("admin", "fresh@x.test", "p", "5.5.5.5")).status, 401);
});

test("admin and client counters are separate", async () => {
  for (let i = 0; i < 5; i++) await post("admin", "shared2@x.test", "p", "6.6.6.1");
  assert.equal((await post("admin", "shared2@x.test", "p", "6.6.6.2")).status, 429);
  assert.equal((await post("client", "shared2@x.test", "p", "6.6.6.2")).status, 401);
});

test("first failure sets the counter with a TTL atomically, key is HMAC not plain sha256", async () => {
  const { createHash, createHmac } = await import("crypto");
  const { getRedis } = await import("../lib/redis");
  const r = getRedis()!;
  await post("client", "ttl@x.test", "p", "7.7.7.7");
  const plain = createHash("sha256").update("ttl@x.test").digest("hex");
  const hmac = createHmac("sha256", process.env.SAABAI_SESSION_SECRET!).update("ttl@x.test").digest("hex");
  assert.equal(await r.get(`loginlimit:wh:e:${plain}`), null);
  assert.equal(Number(await r.get(`loginlimit:wh:e:${hmac}`)), 1);
  const ttl = await r.ttl(`loginlimit:wh:e:${hmac}`);
  assert.ok(ttl > 0 && ttl <= 900);
  await post("client", "ttl@x.test", "p", "7.7.7.7");
  assert.equal(Number(await r.get(`loginlimit:wh:e:${hmac}`)), 2);
  assert.ok((await r.ttl(`loginlimit:wh:e:${hmac}`)) > 0);
});

test("admin: not-configured check runs before the limiter", async () => {
  const saved = process.env.WHOLESALE_ADMIN_PASS;
  delete process.env.WHOLESALE_ADMIN_PASS;
  try {
    for (let i = 0; i < 6; i++) assert.equal((await post("admin", "nc@x.test", "p", "8.8.8.8")).status, 500);
  } finally { process.env.WHOLESALE_ADMIN_PASS = saved; }
});

test("UI message: 429 shows the lockout with minutes, other errors keep the fallback", async () => {
  const { loginErrorMessage, loginErrorFromResponse, LOCKOUT_MESSAGE } = await import("../lib/login-limit-message");
  assert.equal(loginErrorMessage(401, "x", null, "Invalid credentials."), "Invalid credentials.");
  assert.equal(loginErrorMessage(429, LOCKOUT_MESSAGE, null, "Invalid"), LOCKOUT_MESSAGE);
  assert.equal(loginErrorMessage(429, LOCKOUT_MESSAGE, "61", "Invalid"), "Too many sign-in attempts. Please try again in 2 minutes.");
  assert.equal(loginErrorMessage(429, undefined, "30", "Invalid"), "Too many sign-in attempts. Please try again in 1 minute.");
  for (let i = 0; i < 5; i++) await post("client", "ui@x.test", "p", "9.9.9.1");
  const res = await post("client", "ui@x.test", "p", "9.9.9.2");
  assert.match(await loginErrorFromResponse(res, "Invalid email or password."), /^Too many sign-in attempts\. Please try again in \d+ minutes?\.$/);
});

test("both Wholesale login pages use the 429-aware message", async () => {
  const { readFileSync } = await import("fs");
  for (const f of ["app/sites/wholesale-homes/client-login/page.tsx", "app/sites/wholesale-homes/admin/login/page.tsx"]) {
    const src = readFileSync(f, "utf8");
    assert.match(src, /loginErrorFromResponse\(res,/, f);
  }
});
