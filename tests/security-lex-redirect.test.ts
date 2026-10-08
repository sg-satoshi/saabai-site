/**
 * Lex portal magic-link allow-list + rate limit, and login redirect validation.
 * Runs against an in-memory mock of the Upstash REST API, no real services.
 *
 *   npm run test:portal
 */
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();
const BASE = "http://localhost:3000";

const sentEmails: { to: string; subject: string; html: string }[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.includes("api.resend.com")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    sentEmails.push({ to: [].concat(body.to).join(","), subject: body.subject, html: body.html });
    return new Response(JSON.stringify({ id: "test-email" }), { status: 200, headers: { "content-type": "application/json" } });
  }
  return realFetch(input as RequestInfo, init);
}) as typeof fetch;

before(async () => {
  await new Promise<void>((r) => mock.server.listen(0, "127.0.0.1", () => r()));
  const { port } = mock.server.address() as AddressInfo;
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = "test";
  process.env.RESEND_API_KEY = "re_test";
  process.env.PORTAL_SESSION_SECRET = "portal-test-secret-portal-test-secret";
  process.env.NEXT_PUBLIC_BASE_URL = "https://saabai.ai";
  process.env.PLON_TEAM_EMAIL = "team@plon.test";
  delete process.env.SAABAI_NOTIFY_EMAIL; // Lex demo account defaults to hello@saabai.ai
});

after(() => {
  globalThis.fetch = realFetch;
  return new Promise<void>((r) => mock.server.close(() => r()));
});

beforeEach(() => {
  mock.reset();
  mock.seed({
    hashes: {
      "portal:users": { "partner@approvedfirm.test": { id: "partner", name: "Pat Partner", email: "partner@approvedfirm.test", password: "scrypt:x", dashboardUrl: "/client-portal", approvedAt: "" } },
      "saabai:users": {
        "lexclient@firm.test": { id: "lexclient-firm-test", name: "Lex Client", email: "lexclient@firm.test", password: "x", role: "user", dashboardUrl: "/dashboard", products: ["lex"], approvedAt: "", createdAt: "" },
        "rexonly@shop.test": { id: "rexonly-shop-test", name: "Rex Only", email: "rexonly@shop.test", password: "x", role: "user", dashboardUrl: "/dashboard", products: ["rex"], approvedAt: "", createdAt: "" },
      },
    },
    strings: { "portal:settings:existing@firm.test": JSON.stringify({ firmName: "Existing Firm" }) },
  });
  sentEmails.length = 0;
});

async function requestLink(email: unknown, redirect?: string) {
  const { POST } = await import("../app/api/portal/login/route");
  const res = await POST(new Request(`${BASE}/api/portal/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, redirect }) }));
  return { status: res.status, body: await res.text() };
}

async function settle(expected: number) {
  const end = Date.now() + 3000;
  while (sentEmails.length < expected && Date.now() < end) await new Promise((r) => setTimeout(r, 20));
  await new Promise((r) => setTimeout(r, 150)); // make sure nothing extra arrives
}

const tokenKeys = () => (mock.exec(["KEYS", "portal:token:*"]) as string[]);

test("Lex /api/portal/login: unknown email gets the identical response and no email or token", async () => {
  const known = await requestLink("hello@saabai.ai");
  const unknown = await requestLink("stranger@random.test");
  const rexOnly = await requestLink("rexonly@shop.test");
  assert.deepEqual(unknown, known, "response must be identical");
  assert.deepEqual(rexOnly, known);
  assert.equal(known.status, 200);
  assert.deepEqual(JSON.parse(known.body), { ok: true });
  await settle(1);
  assert.deepEqual(sentEmails.map((m) => m.to), ["hello@saabai.ai"], "only the known client is emailed");
  assert.equal(tokenKeys().length, 1, "no token created for unknown emails");
  // Malformed input is rejected the same way regardless of who it is.
  assert.equal((await requestLink("not-an-email")).status, 400);
  assert.equal((await requestLink(42)).status, 400);
});

test("Lex demo still works end to end: link is emailed, signs in, and lands on the portal", async () => {
  await requestLink("Hello@Saabai.ai ");
  await settle(1);
  assert.equal(sentEmails.length, 1);
  const link = /href="(https:\/\/saabai\.ai\/api\/portal\/auth\?token=[^"]+)"/.exec(sentEmails[0].html)?.[1];
  assert.ok(link, "magic link present");
  const { GET } = await import("../app/api/portal/auth/route");
  const res = await GET(new Request(link!));
  assert.equal(res.status, 200);
  assert.match(res.headers.get("set-cookie") ?? "", /portal_session=/);
  assert.match(await res.text(), /https:\/\/saabai\.ai\/client-portal/);
  // Single use.
  const again = await GET(new Request(link!));
  assert.match(again.headers.get("location") ?? "", /error=invalid_token/);
});

test("Lex allow-list covers approved portal users, Lex directory users, existing firms and the PLON team", async () => {
  for (const email of ["partner@approvedfirm.test", "lexclient@firm.test", "existing@firm.test", "team@plon.test"]) {
    await requestLink(email);
  }
  await settle(4);
  assert.deepEqual(sentEmails.map((m) => m.to).sort(), ["existing@firm.test", "lexclient@firm.test", "partner@approvedfirm.test", "team@plon.test"]);
});

test("Lex allow-list honours optional LEX_PORTAL_ALLOWED_EMAILS", async () => {
  process.env.LEX_PORTAL_ALLOWED_EMAILS = "trial@newfirm.test, other@x.test";
  try {
    await requestLink("trial@newfirm.test");
    await settle(1);
    assert.deepEqual(sentEmails.map((m) => m.to), ["trial@newfirm.test"]);
  } finally {
    delete process.env.LEX_PORTAL_ALLOWED_EMAILS;
  }
});

test("Lex /api/portal/login is rate limited to 5 links per email per 15 minutes", async () => {
  for (let i = 0; i < 8; i++) {
    const r = await requestLink("hello@saabai.ai");
    assert.equal(r.status, 200, "throttled requests look identical too");
  }
  await settle(5);
  assert.equal(sentEmails.length, 5);
  assert.equal(tokenKeys().length, 5);
  const ttl = mock.exec(["TTL", (mock.exec(["KEYS", "portal:login:rate:*"]) as string[])[0]]) as number;
  assert.ok(ttl > 0 && ttl <= 900);
});

test("Lex link keeps only safe same-origin redirects", async () => {
  await requestLink("hello@saabai.ai", "https://evil.com/phish");
  await settle(1);
  assert.deepEqual(mock.exec(["KEYS", "portal:redirect:*"]), [], "absolute redirect is dropped");
});

// ── admin login redirect validation ───────────────────────────────────────
test("admin login redirect: only same-origin relative paths survive", async () => {
  const { safeRedirect } = await import("../lib/safe-redirect");
  const admin = (v: unknown) => safeRedirect(v, "/saabai-admin");
  assert.equal(admin(undefined), "/saabai-admin");
  assert.equal(admin("/saabai-admin/users?tab=1"), "/saabai-admin/users?tab=1");
  for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "http:/evil.com", " https://evil.com", "/\t/evil.com", ["/a", "/b"], 42]) {
    assert.equal(admin(bad), "/saabai-admin", `should reject ${JSON.stringify(bad)}`);
  }
});

test("admin and PLON login pages never use the raw ?redirect= value", () => {
  for (const [file, fallback] of [
    ["app/saabai-admin/login/page.tsx", "/saabai-admin"],
    ["app/admin/login/page.tsx", "/saabai-admin"],
    ["app/plon/login/page.tsx", "/rex-dashboard"],
  ]) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.ok(src.includes(`safeRedirect(params.redirect, "${fallback}")`), `${file} must validate with safeRedirect`);
    assert.ok(!/params\.redirect\s*\?\?/.test(src), `${file} still uses params.redirect directly`);
  }
});
