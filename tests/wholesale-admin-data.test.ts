/**
 * Wholesale Homes: real admin login (signed server-side session instead of a
 * browser flag), members-only package data kept out of the browser bundle,
 * admin preview of the client portal, and lead lists that need an admin.
 * Runs against an in-memory mock of the Upstash REST API, no real services.
 *
 *   npm run test:portal
 */
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();
const BASE = "http://localhost:3000";
const ROOT = new URL("..", import.meta.url).pathname;

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
  process.env.SAABAI_SESSION_SECRET = "test-secret-test-secret-test-secret-1234";
  process.env.PORTAL_SESSION_SECRET = "portal-test-secret-portal-test-secret";
  process.env.SAABAI_ADMIN_ID = "saabai";
  process.env.RESEND_API_KEY = "re_test";
  process.env.NEXT_PUBLIC_BASE_URL = "https://www.saabai.ai";
  process.env.WHOLESALE_CLIENT_EMAIL = "shared@wholesalehomes.test";
  process.env.WHOLESALE_CLIENT_PASS = "Shared-Plain-Pass";
  process.env.WHOLESALE_ADMIN_EMAIL = "Boss@WholesaleHomes.test";
  process.env.WHOLESALE_ADMIN_PASS = "Admin-Plain-Pass";
});

after(() => {
  globalThis.fetch = realFetch;
  return new Promise<void>((r) => mock.server.close(() => r()));
});

const WH_USER = { id: "olga", name: "Olga Buyer", email: "olga@buyer.test", password: "olga-legacy-pw", role: "user", dashboardUrl: "/sites/wholesale-homes/client/dashboard", siteId: "wholesale-homes", approvedAt: "", createdAt: "" };
const OTHER_CLIENT = { id: "stu-cycle-test", name: "Stu", email: "stu@cycle.test", password: "stu-pw-1234", role: "user", dashboardUrl: "/dashboard", approvedAt: "", createdAt: "" };
const LEAD_A = { name: "Lead A", email: "a@lead.test", phone: "0400", siteSlug: "wholesale-homes", createdAt: 1 };
const LEAD_B = { name: "Lead B", email: "b@lead.test", phone: "0401", siteSlug: "wholesale-homes", createdAt: 2 };

beforeEach(async () => {
  mock.reset();
  mock.seed({
    hashes: {
      "saabai:users": { [WH_USER.email]: JSON.stringify(WH_USER), [OTHER_CLIENT.email]: JSON.stringify(OTHER_CLIENT) },
      "saabai:domain-map": { "wholesalehomes.com.au": "wholesale-homes" },
    },
  });
  // Leads are stored the way the lead route writes them (JSON strings, LPUSH).
  await mock.exec(["LPUSH", "saabai:leads:wholesale-homes", JSON.stringify(LEAD_A)]);
  await mock.exec(["LPUSH", "saabai:leads:wholesale-homes", JSON.stringify(LEAD_B)]);
  sentEmails.length = 0;
  process.env.WHOLESALE_ADMIN_PASS = "Admin-Plain-Pass";
});

// ── helpers ───────────────────────────────────────────────────────────────
async function adminLogin(email: string, password: string) {
  const { POST } = await import("../app/api/wholesale-admin-auth/route");
  const res = await POST(new Request(`${BASE}/api/wholesale-admin-auth`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) }));
  const cookie = res.headers.get("set-cookie") ?? "";
  return { status: res.status, cookie, token: /wh_admin_session=([^;]+)/.exec(cookie)?.[1] ?? "" };
}
async function adminMe(cookie: string) {
  const { GET } = await import("../app/api/wholesale-admin-auth/route");
  const res = await GET(new NextRequest(`${BASE}/api/wholesale-admin-auth`, { headers: { cookie } }));
  return { status: res.status, body: await res.json() };
}
async function saabaiCookie(clientId: string) {
  const { createSessionToken } = await import("../lib/auth");
  return `saabai_session=${await createSessionToken(clientId)}`;
}
async function whClientToken() {
  const { POST } = await import("../app/api/wholesale-auth/route");
  const res = await POST(new Request(`${BASE}/api/wholesale-auth`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "olga@buyer.test", password: "olga-legacy-pw" }) }));
  assert.equal(res.status, 200);
  return /wh_session=([^;]+)/.exec(res.headers.get("set-cookie") ?? "")?.[1] ?? "";
}
async function call(path: string, cookie = "", init: { method?: string; body?: unknown } = {}) {
  const mod = await import(`../app/api/${path}/route`);
  const method = init.method ?? "GET";
  const req = new NextRequest(`${BASE}/api/${path}`, {
    method,
    headers: { cookie, "content-type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const res: Response = await mod[method](req);
  return { status: res.status, body: await res.json().catch(() => null) };
}

// ── (a) Wholesale admin login ─────────────────────────────────────────────
test("Wholesale admin: right credentials get a signed HttpOnly session; wrong ones get nothing", async () => {
  for (const [e, p] of [["boss@wholesalehomes.test", "wrong"], ["olga@buyer.test", "Admin-Plain-Pass"], ["", ""], ["boss@wholesalehomes.test", ""]]) {
    const r = await adminLogin(e, p);
    assert.equal(r.status, 401, `${e}/${p}`);
    assert.equal(r.cookie, "");
  }
  const ok = await adminLogin("  BOSS@wholesalehomes.test ", "Admin-Plain-Pass");
  assert.equal(ok.status, 200);
  assert.match(ok.cookie, /^wh_admin_session=[^;]+; Path=\/; HttpOnly;( Secure;)? SameSite=Lax; Max-Age=43200$/);
  assert.deepEqual(await adminMe(`wh_admin_session=${ok.token}`), { status: 200, body: { authenticated: true, email: "boss@wholesalehomes.test", source: "wholesale-admin" } });
});

test("Wholesale admin: no cookie, a tampered cookie, or a changed admin password means signed out", async () => {
  assert.equal((await adminMe("")).status, 401);
  const ok = await adminLogin("boss@wholesalehomes.test", "Admin-Plain-Pass");
  const [body, sig] = ok.token.split(".");
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), exp: 9999999999 })).toString("base64url");
  assert.equal((await adminMe(`wh_admin_session=${forged}.${sig}`)).status, 401);
  process.env.WHOLESALE_ADMIN_PASS = "Rotated-Pass-2";
  assert.equal((await adminMe(`wh_admin_session=${ok.token}`)).status, 401, "rotating the password signs admins out");
});

test("Wholesale admin: a hashed admin password in the env also works", async () => {
  const { hashPassword } = await import("../lib/password");
  process.env.WHOLESALE_ADMIN_PASS = await hashPassword("Hashed-Admin-Pass");
  assert.equal((await adminLogin("boss@wholesalehomes.test", "Hashed-Admin-Pass")).status, 200);
  assert.equal((await adminLogin("boss@wholesalehomes.test", process.env.WHOLESALE_ADMIN_PASS)).status, 401);
});

test("Wholesale admin: client sessions are never admin, admin tokens are never client sessions", async () => {
  const clientToken = await whClientToken();
  assert.equal((await adminMe(`wh_admin_session=${clientToken}`)).status, 401);
  assert.equal((await adminMe(`wh_session=${clientToken}`)).status, 401);
  const adminTok = (await adminLogin("boss@wholesalehomes.test", "Admin-Plain-Pass")).token;
  const { getWholesaleSession } = await import("../lib/wholesale-auth");
  assert.equal(await getWholesaleSession(adminTok), null);
  // A Saabai session for an ordinary client isn't an admin either.
  assert.equal((await adminMe(await saabaiCookie("stu-cycle-test"))).status, 401);
});

test("Wholesale admin: a Saabai admin session counts (so Saabai can support the client)", async () => {
  assert.deepEqual(await adminMe(await saabaiCookie("saabai")), { status: 200, body: { authenticated: true, email: "saabai", source: "saabai-admin" } });
});

test("Wholesale admin: sign out clears the cookie", async () => {
  const { DELETE } = await import("../app/api/wholesale-admin-auth/route");
  const res = await DELETE();
  assert.match(res.headers.get("set-cookie") ?? "", /^wh_admin_session=; Path=\/; HttpOnly;( Secure;)? SameSite=Lax; Max-Age=0$/);
});

test("Wholesale admin APIs: leads, users and approvals need the admin session", async () => {
  for (const [path, method] of [["wholesale-admin/leads", "GET"], ["wholesale-admin/users", "GET"], ["wholesale-admin/approve-lead", "POST"]]) {
    for (const cookie of ["", `wh_session=${await whClientToken()}`, await saabaiCookie("stu-cycle-test")]) {
      const r = await call(path, cookie, { method, body: method === "POST" ? { name: "X", email: "x@y.test" } : undefined });
      assert.equal(r.status, 401, `${method} ${path} with ${cookie.split("=")[0] || "no cookie"}`);
    }
  }
  assert.equal(sentEmails.length, 0);
});

test("Wholesale admin APIs: leads parse correctly; users list is Wholesale-only and has no passwords", async () => {
  const cookie = `wh_admin_session=${(await adminLogin("boss@wholesalehomes.test", "Admin-Plain-Pass")).token}`;
  const leads = await call("wholesale-admin/leads", cookie);
  assert.equal(leads.status, 200);
  assert.deepEqual(leads.body.leads.map((l: { email: string }) => l.email), ["b@lead.test", "a@lead.test"]);

  const users = await call("wholesale-admin/users", cookie);
  assert.equal(users.status, 200);
  assert.deepEqual(users.body.users.map((u: { email: string }) => u.email), ["olga@buyer.test"], "other Saabai clients are not listed");
  assert.ok(!JSON.stringify(users.body).includes("password") && !JSON.stringify(users.body).includes("olga-legacy-pw"));
});

test("Wholesale admin APIs: approving a lead creates a Wholesale account and sends the set-password email", async () => {
  const cookie = `wh_admin_session=${(await adminLogin("boss@wholesalehomes.test", "Admin-Plain-Pass")).token}`;
  const r = await call("wholesale-admin/approve-lead", cookie, { method: "POST", body: { name: "Lead A", email: "A@Lead.test" } });
  assert.equal(r.status, 200);
  const { getDirectoryUser } = await import("../lib/user-directory");
  const u = await getDirectoryUser("a@lead.test");
  assert.equal(u?.siteId, "wholesale-homes");
  assert.match(String(u?.password), /^scrypt:/);
  assert.equal(sentEmails.length, 1);
  assert.match(sentEmails[0].html, /https:\/\/www\.wholesalehomes\.com\.au\/set-password\?token=/);
  assert.equal((await call("wholesale-admin/approve-lead", cookie, { method: "POST", body: { name: "Lead A", email: "a@lead.test" } })).status, 409);
  assert.equal((await call("wholesale-admin/approve-lead", cookie, { method: "POST", body: { name: "", email: "bad" } })).status, 400);
});

test("Saabai admin approve-lead still works through the shared helper", async () => {
  const r = await call("site-factory/approve-lead", await saabaiCookie("saabai"), { method: "POST", body: { name: "Lead B", email: "b@lead.test" } });
  assert.equal(r.status, 200);
  assert.equal(sentEmails.length, 1);
});

test("Public lead endpoint: anyone can still POST, but reading leads needs a Saabai admin", async () => {
  const { GET } = await import("../app/api/site-factory/lead/route");
  const get = async (cookie: string) => {
    const res = await GET(new Request(`${BASE}/api/site-factory/lead?siteSlug=wholesale-homes`, { headers: { cookie } }));
    return { status: res.status, body: await res.json() };
  };
  assert.equal((await get("")).status, 401);
  assert.equal((await get(await saabaiCookie("stu-cycle-test"))).status, 401);
  assert.equal((await get(`wh_admin_session=${(await adminLogin("boss@wholesalehomes.test", "Admin-Plain-Pass")).token}`)).status, 401, "Wholesale admins use their own endpoint");
  const ok = await get(await saabaiCookie("saabai"));
  assert.equal(ok.status, 200);
  assert.equal(ok.body.leads.length, 2, "stored JSON leads now parse instead of failing with a 500");
});

test("Proxy: Wholesale admin APIs are reachable on both domains (they check the session themselves)", async () => {
  const { proxy } = await import("../proxy");
  for (const host of ["www.wholesalehomes.com.au", "www.saabai.ai"]) {
    for (const path of ["/api/wholesale-admin/leads", "/api/wholesale-admin/users", "/api/wholesale-admin/approve-lead"]) {
      const res = await proxy(new NextRequest(`https://${host}${path}`, { headers: { host } }));
      assert.equal(res.headers.get("x-middleware-next"), "1", `${host}${path}`);
    }
    const dir = await proxy(new NextRequest(`https://${host}/api/user-directory`, { headers: { host } }));
    assert.equal(dir.status, 401, "unrelated admin APIs stay locked");
  }
});

test("Admin pages: server-side gate, no browser flag, links work on both domains", () => {
  const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
  const layout = read("app/sites/wholesale-homes/admin/(secure)/layout.tsx");
  assert.match(layout, /await requireWholesaleAdmin\(\)/);
  assert.ok(!/["']use client["']/.test(layout));
  assert.match(read("app/sites/wholesale-homes/_lib/require-admin.ts"), /redirect\(`\$\{WH_ADMIN_BASE\}\/login`\)/);
  for (const f of ["AdminShell.tsx", "AdminDashboardClient.tsx", "page.tsx", "leads/page.tsx", "users/page.tsx", "packages/page.tsx"]) {
    const s = read(`app/sites/wholesale-homes/admin/(secure)/${f}`);
    assert.ok(!/wholesale_admin_auth|localStorage/.test(s), `${f} has no browser auth flag`);
    assert.ok(!/["'`]\/admin(\/|["'`])/.test(s), `${f} has no links to Saabai's /admin`);
    assert.ok(!/\/api\/user-directory|\/api\/site-factory\//.test(s), `${f} uses the Wholesale admin APIs`);
  }
  assert.ok(!existsSync(join(ROOT, "app/sites/wholesale-homes/admin/page.tsx")), "no admin page outside the guarded group");
  assert.ok(!/setItem\(/.test(read("app/sites/wholesale-homes/admin/login/page.tsx")));
});

// ── (b) package data out of the browser bundle ────────────────────────────
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|jsx?)$/.test(n) ? [p] : [];
  });
}

test("Package data: no client component imports the package lists (types only)", () => {
  const files = [...walk(join(ROOT, "app")), ...walk(join(ROOT, "lib"))];
  const offenders: string[] = [];
  for (const f of files) {
    const s = readFileSync(f, "utf8");
    if (!/^\s*["']use client["']/.test(s)) continue;
    for (const m of s.matchAll(/import\s+(type\s+)?[^;]*?from\s+["']([^"']+)["']/g)) {
      if (/_data\/(member-)?packages$/.test(m[2]) && !m[1]) offenders.push(`${f.replace(ROOT, "")} -> ${m[2]}`);
    }
    if (/import\(\s*["'][^"']*_data\/(member-)?packages["']\s*\)/.test(s)) offenders.push(`${f.replace(ROOT, "")} (dynamic import)`);
  }
  assert.deepEqual(offenders, []);
  // Members pages are server components that pass data down.
  for (const p of ["client/dashboard/page.tsx", "client/packages/[id]/page.tsx"]) {
    const s = readFileSync(join(ROOT, "app/sites/wholesale-homes", p), "utf8");
    assert.ok(!/["']use client["']/.test(s), `${p} is a server component`);
    assert.match(s, /member-packages/);
  }
});

test("Package data: the member list matches what the pages showed before", async () => {
  const { dashboardPackages, packageDetails, getPackageDetail } = await import("../app/sites/wholesale-homes/_data/member-packages");
  assert.equal(dashboardPackages.length, 27);
  assert.equal(packageDetails.length, 27);
  assert.deepEqual(dashboardPackages.map((p) => p.id), packageDetails.map((p) => p.id));
  assert.equal(getPackageDetail("kyabram-greens-lot-32")?.rentalAppraisal?.company, "Koham Property");
  assert.equal(getPackageDetail("nope"), null);
});

test("Package data: not present in the built browser JavaScript (when a build exists)", (t) => {
  const dir = join(ROOT, ".next/static");
  if (!existsSync(dir)) return t.skip("no .next build; run npm run predeploy first");
  const hits: string[] = [];
  for (const f of walk(dir)) {
    const s = readFileSync(f, "utf8");
    for (const needle of ["Koham Property", "Kyabram Greens Estate", "astel-emilia-8", "banyan-hill-lot-1042", "parklands-haven-36"]) {
      if (s.includes(needle)) hits.push(`${f.replace(ROOT, "")}: ${needle}`);
    }
  }
  assert.deepEqual(hits, []);
});

// ── (c) admin preview of the client portal ────────────────────────────────
test("Admin preview: Wholesale and Saabai admins see the portal as a preview; others don't", async () => {
  const { GET } = await import("../app/api/wholesale-auth/route");
  const me = async (cookie: string) => {
    const res = await GET(new NextRequest(`${BASE}/api/wholesale-auth`, { headers: { cookie } }));
    return { status: res.status, body: await res.json() };
  };
  assert.deepEqual(await me(await saabaiCookie("saabai")), { status: 200, body: { authenticated: true, email: "saabai", name: "Admin preview", preview: true } });
  const adminTok = (await adminLogin("boss@wholesalehomes.test", "Admin-Plain-Pass")).token;
  assert.equal((await me(`wh_admin_session=${adminTok}`)).body.preview, true);
  assert.equal((await me(await saabaiCookie("stu-cycle-test"))).status, 401);
  assert.equal((await me("")).status, 401);
  // A real client is still a client, even if they also have an admin cookie.
  const clientTok = await whClientToken();
  assert.deepEqual((await me(`wh_session=${clientTok}; wh_admin_session=${adminTok}`)).body, { authenticated: true, email: "olga@buyer.test", name: "Olga Buyer", preview: false });

  const guard = readFileSync(join(ROOT, "app/sites/wholesale-homes/_lib/require-client.ts"), "utf8");
  assert.match(guard, /getWholesaleAdmin\(jar\)/);
  assert.match(guard, /source: "admin-preview"/);
});

test("Portal links follow the host (root on wholesalehomes.com.au, /sites/wholesale-homes on saabai.ai)", async () => {
  const { wholesaleBasePath } = await import("../lib/wholesale-paths");
  assert.equal(wholesaleBasePath("www.wholesalehomes.com.au"), "");
  assert.equal(wholesaleBasePath("saabai.ai"), "/sites/wholesale-homes");
  assert.equal(wholesaleBasePath("saabai-site-abc.vercel.app"), "/sites/wholesale-homes");
  const files = walk(join(ROOT, "app/sites/wholesale-homes/client")).filter((f) => !f.includes("/register/"));
  files.push(join(ROOT, "app/sites/wholesale-homes/_components/ClientPortalShell.tsx"));
  for (const f of files) {
    const s = readFileSync(f, "utf8");
    const bad = [...s.matchAll(/(href=|push\()\s*\{?\s*["'`]\/client/g)];
    assert.equal(bad.length, 0, `${f.replace(ROOT, "")} has a hard-coded /client link`);
  }
});
