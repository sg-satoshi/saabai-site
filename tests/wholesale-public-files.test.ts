/**
 * Wholesale Homes: members-only files served through an authenticated route
 * (not public/), and the public /packages pages free of prices and other
 * members-only figures, including their search-engine and social metadata.
 * Runs against an in-memory mock of the Upstash REST API, no real services.
 *
 *   npm run test:portal
 */
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { createMockUpstash } from "../scripts/dev/mock-upstash.mjs";

const mock = createMockUpstash();
const ROOT = new URL("..", import.meta.url).pathname;
const FIGURES = /\$\s?\d|\d\s?%|\d+\s?[kK]\b|\byield|\brent(al)?\b|\bpric(e|es|ed|ing)\b(?! (is|are) (for|available))|valuation|retailPrice|wholesalePrice|landPrice|totalBuildPrice/i;

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
after(() => new Promise<void>((r) => mock.server.close(() => r())));

const WH_USER = { id: "olga", name: "Olga Buyer", email: "olga@buyer.test", password: "olga-legacy-pw", role: "user", dashboardUrl: "/sites/wholesale-homes/client/dashboard", siteId: "wholesale-homes", approvedAt: "", createdAt: "" };
beforeEach(() => {
  mock.reset();
  mock.seed({ hashes: { "saabai:users": { [WH_USER.email]: JSON.stringify(WH_USER) }, "saabai:domain-map": { "wholesalehomes.com.au": "wholesale-homes" } } });
});

// ── helpers ───────────────────────────────────────────────────────────────
async function cookieFrom(route: string, email: string, password: string, name: string) {
  const { POST } = await import(`../app/api/${route}/route`);
  const res: Response = await POST(new Request(`http://localhost/api/${route}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) }));
  assert.equal(res.status, 200, `${route} login`);
  return `${name}=${new RegExp(`${name}=([^;]+)`).exec(res.headers.get("set-cookie") ?? "")?.[1]}`;
}
const member = () => cookieFrom("wholesale-auth", "olga@buyer.test", "olga-legacy-pw", "wh_session");
const shared = () => cookieFrom("wholesale-auth", "shared@wholesalehomes.test", "Shared-Plain-Pass", "wh_session");
const whAdmin = () => cookieFrom("wholesale-admin-auth", "boss@wholesalehomes.test", "Admin-Plain-Pass", "wh_admin_session");
async function saabai(clientId: string) {
  const { createSessionToken } = await import("../lib/auth");
  return `saabai_session=${await createSessionToken(clientId)}`;
}
async function getFile(file: string, cookie = "", host = "www.wholesalehomes.com.au") {
  const { GET } = await import("../app/api/wholesale-files/[file]/route");
  const req = new NextRequest(`https://${host}/api/wholesale-files/${encodeURIComponent(file)}`, { headers: { cookie, host } });
  const res = await GET(req, { params: Promise.resolve({ file }) });
  return { status: res.status, headers: res.headers, bytes: res.status === 200 ? Buffer.from(await res.arrayBuffer()) : null };
}

// ── (a) members-only files ────────────────────────────────────────────────
test("Files: signed-out visitors are sent to the client login (right path on each domain)", async () => {
  const a = await getFile("kyabram-greens-lot-32-brochure.pdf");
  assert.equal(a.status, 307);
  assert.equal(a.headers.get("location"), "/client-login");
  const b = await getFile("kyabram-greens-lot-32-rental-appraisal.pdf", "", "saabai.ai");
  assert.equal(b.headers.get("location"), "/sites/wholesale-homes/client-login");
  for (const cookie of [await saabai("stu-cycle-test"), "wh_session=forged.value", "wh_admin_session=forged.value"]) {
    assert.equal((await getFile("the-willows.jpg", cookie)).status, 307, cookie.split("=")[0]);
  }
});

test("Files: members (per-user and shared), Wholesale admins and Saabai admins get the file", async () => {
  const onDisk = readFileSync(join(ROOT, "private/wholesale-homes/kyabram-greens-lot-32-brochure.pdf"));
  for (const cookie of [await member(), await shared(), await whAdmin(), await saabai("saabai")]) {
    const r = await getFile("kyabram-greens-lot-32-brochure.pdf", cookie);
    assert.equal(r.status, 200, cookie.split("=")[0]);
    assert.equal(r.headers.get("content-type"), "application/pdf");
    assert.equal(r.headers.get("cache-control"), "private, no-store");
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
    assert.ok(r.bytes!.equals(onDisk));
  }
  const img = await getFile("kyabram-greens.jpg", await member());
  assert.equal(img.headers.get("content-type"), "image/jpeg");
});

test("Files: only allow-listed names are served, even when signed in", async () => {
  const cookie = await member();
  for (const name of ["../../package.json", "..%2F..%2F.env", "package.json", "kyabram-greens-thumb.jpg", "constructor", "__proto__", "toString"]) {
    assert.equal((await getFile(name, cookie)).status, 404, name);
  }
});

test("Files: moved out of public/, present in private/, and the old public paths are gone", async () => {
  const { WH_MEMBER_FILES } = await import("../lib/wholesale-files");
  for (const name of Object.keys(WH_MEMBER_FILES)) {
    assert.ok(existsSync(join(ROOT, "private/wholesale-homes", name)), `${name} in private/`);
    assert.ok(!existsSync(join(ROOT, "public/sites/wholesale-homes", name)), `${name} not in public/`);
    assert.ok(!existsSync(join(ROOT, "public/sites/wholesale-homes/documents", name)), `${name} not in public/documents`);
  }
  const cfg = readFileSync(join(ROOT, "next.config.ts"), "utf8");
  assert.match(cfg, /"\/api\/wholesale-files\/\[file\]": \["\.\/private\/wholesale-homes\/\*\*\/\*"\]/, "files are bundled with the route");
});

test("Files: every link points at the authenticated route, and every linked file exists", async () => {
  const { packageDetails, dashboardPackages } = await import("../app/sites/wholesale-homes/_data/member-packages");
  const { WH_MEMBER_FILES } = await import("../lib/wholesale-files");
  const urls = [
    ...packageDetails.flatMap((p) => [p.image, p.brochureUrl, p.rentalAppraisal?.url]),
    ...dashboardPackages.map((p) => p.image),
  ].filter((u): u is string => !!u);
  for (const u of urls.filter((u) => u.startsWith("/api/wholesale-files/"))) {
    assert.ok(WH_MEMBER_FILES[u.split("/").pop()!], `${u} is allow-listed`);
  }
  assert.equal(urls.filter((u) => u.startsWith("/api/wholesale-files/")).length, 14);
  // No code anywhere still points at the old public locations.
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|jsx?|md|json)$/.test(n) ? [p] : []; });
  const old = /\/sites\/wholesale-homes\/(documents\/|(kyabram-greens|the-willows|orchardfield|the-outlook|woodlands|winterbrook)\.jpg)/;
  const hits = [...walk(join(ROOT, "app")), ...walk(join(ROOT, "lib"))].filter((f) => old.test(readFileSync(f, "utf8")));
  assert.deepEqual(hits, []);
});

test("Files: the proxy lets the route through on both domains (it checks the session itself)", async () => {
  const { proxy } = await import("../proxy");
  for (const host of ["www.wholesalehomes.com.au", "www.saabai.ai"]) {
    const res = await proxy(new NextRequest(`https://${host}/api/wholesale-files/kyabram-greens-lot-32-brochure.pdf`, { headers: { host } }));
    assert.equal(res.headers.get("x-middleware-next"), "1", host);
  }
});

// ── (b) public package pages without prices ───────────────────────────────
test("Public data: no prices, yields, rents or price fields", async () => {
  const src = readFileSync(join(ROOT, "app/sites/wholesale-homes/_data/packages.ts"), "utf8");
  const body = src.slice(src.indexOf("export const packages"));
  assert.ok(!FIGURES.test(body), `figure found: ${FIGURES.exec(body)?.[0]}`);
  const { packages } = await import("../app/sites/wholesale-homes/_data/packages");
  assert.equal(packages.length, 23);
  for (const p of packages) {
    assert.ok(!("retailPrice" in p) && !("wholesalePrice" in p), p.id);
    assert.ok(p.description.length > 40, `${p.id} keeps a useful description`);
  }
});

test("Public metadata: title, description, Open Graph and Twitter carry no prices", async () => {
  const { generateMetadata } = await import("../app/sites/wholesale-homes/packages/[id]/layout");
  const { packages } = await import("../app/sites/wholesale-homes/_data/packages");
  for (const p of packages) {
    const m = await generateMetadata({ params: Promise.resolve({ id: p.id }) });
    const text = JSON.stringify(m);
    assert.ok(!FIGURES.test(text.replace(/wholesale pricing/gi, "")), `${p.id}: ${FIGURES.exec(text)?.[0]}`);
    assert.match(String(m.description), /sign in or register/);
    assert.equal((m.openGraph as { images?: string })?.images, p.image, "OG image is the public photo");
  }
  const list = readFileSync(join(ROOT, "app/sites/wholesale-homes/packages/layout.tsx"), "utf8");
  assert.ok(!/Below Market Pricing|\$\d/.test(list));
});

test("Public pages: server-rendered, no price UI, sign-in / register call to action", () => {
  for (const f of ["packages/page.tsx", "packages/[id]/page.tsx", "_components/PackageCard.tsx"]) {
    const s = readFileSync(join(ROOT, "app/sites/wholesale-homes", f), "utf8");
    assert.ok(!/["']use client["']/.test(s), `${f} is a server component`);
    assert.ok(!/formatPrice|retailPrice|wholesalePrice|yieldVal|rentalAppraisal|member-packages/.test(s), `${f} has no price UI or member data`);
    assert.ok(!/router\.replace\(["']\/client-login/.test(s), `${f} no longer just bounces to the login`);
  }
  const detail = readFileSync(join(ROOT, "app/sites/wholesale-homes/packages/[id]/page.tsx"), "utf8");
  assert.match(detail, /Sign in to see pricing/);
  assert.match(detail, /\/client\/register/);
  assert.match(detail, /redirect\(`\/client\/packages\/\$\{encodeURIComponent\(id\)\}`\)/, "unknown or members-only ids go to the members page");
});

test("Sitemap: no figures, and every package URL in it has a public page", async () => {
  const xml = readFileSync(join(ROOT, "public/sites/wholesale-homes/sitemap.xml"), "utf8");
  assert.ok(!/\$|price|yield/i.test(xml));
  const { getPublicPackage } = await import("../app/sites/wholesale-homes/_data/packages");
  for (const m of xml.matchAll(/\/packages\/([a-z0-9-]+)</g)) assert.ok(getPublicPackage(m[1]), m[1]);
});

test("Built public pages contain no prices (when a build exists)", (t) => {
  const dir = join(ROOT, ".next/server/app/sites/wholesale-homes/packages");
  if (!existsSync(dir)) return t.skip("no .next build; run npm run predeploy first");
  const files = readdirSync(dir).filter((n) => n.endsWith(".html") || n.endsWith(".rsc") || n.endsWith(".meta"));
  assert.ok(files.length >= 23, `prerendered ${files.length} files`);
  for (const n of files) {
    const s = readFileSync(join(dir, n), "utf8");
    // (RSC payloads use "$1"-style references, so match real amounts only.)
    const m = /\$\s?\d{1,3}(,\d{3})+|\$\s?\d+(\.\d+)?\s?[kKmM]\b|\$\d{4,}|Members Price|Retail Price|retailPrice|wholesalePrice|forecasted yield|Rental appraisal \$/i.exec(s);
    assert.equal(m, null, `${n}: ${m?.[0]}`);
  }
});
