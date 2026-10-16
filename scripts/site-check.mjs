#!/usr/bin/env node
/**
 * Site Factory self-check. Read-only: GET/OPTIONS/HEAD only, never submits a form.
 *
 *   node scripts/site-check.mjs <url> [--pages=/a,/b] [--form=/api/x] [--shots=dir] [--no-browser]
 *
 * Checks: home 200, key pages 200, robots.txt / sitemap.xml / llms.txt (+ every
 * sitemap URL on the same host returns 200), JSON-LD parses, form endpoint
 * reachable (OPTIONS then GET; any non-5xx answer = reachable), and, if
 * Playwright is available, console/JS errors, no horizontal overflow at 390px,
 * and a mobile screenshot. Exit code 1 if any check FAILs.
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
const opt = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");
if (!target) { console.error("usage: node scripts/site-check.mjs <url> [--pages=/a,/b] [--form=/api/x] [--shots=dir] [--no-browser]"); process.exit(2); }
const origin = new URL(target).origin;
const extraPages = (opt("pages") || "").split(",").filter(Boolean);
const formPaths = (opt("form") || "").split(",").filter(Boolean);
const shotsDir = opt("shots") || "/tmp/site-check";
const UA = "Mozilla/5.0 (compatible; SaabaiSiteCheck/1.0)";

const results = [];
const log = (status, name, detail = "") => { results.push({ status, name, detail }); console.log(`${status.padEnd(4)} ${name}${detail ? " - " + detail : ""}`); };
const get = async (path, init = {}) => {
  try { return await fetch(new URL(path, origin), { redirect: "follow", headers: { "user-agent": UA }, ...init }); }
  catch (e) { return { status: 0, error: String(e.message || e), text: async () => "", headers: new Headers() }; }
};

// 1. Home + key pages
const home = await get("/");
const homeHtml = await home.text();
home.status === 200 ? log("PASS", "home 200", origin) : log("FAIL", "home 200", `got ${home.status} ${home.error || ""}`);

const sitemapRes = await get("/sitemap.xml");
const sitemapXml = sitemapRes.status === 200 ? await sitemapRes.text() : "";
const sitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

const pages = new Set(extraPages);
for (const u of sitemapUrls) { try { const x = new URL(u); if (x.host.replace(/^www\./, "") === new URL(origin).host.replace(/^www\./, "")) pages.add(x.pathname); } catch {} }
for (const p of [...pages].slice(0, 40)) {
  const r = await get(p);
  r.status === 200 ? log("PASS", `page ${p}`) : log("FAIL", `page ${p}`, `got ${r.status}`);
}

// 2. SEO files
const robots = await get("/robots.txt"); const robotsTxt = robots.status === 200 ? await robots.text() : "";
robots.status === 200 && /user-agent/i.test(robotsTxt) ? log("PASS", "robots.txt") : log("FAIL", "robots.txt", `status ${robots.status}`);
if (robots.status === 200) /sitemap:/i.test(robotsTxt) ? log("PASS", "robots.txt lists sitemap") : log("WARN", "robots.txt lists sitemap", "no Sitemap: line");
sitemapRes.status === 200 && sitemapUrls.length ? log("PASS", "sitemap.xml", `${sitemapUrls.length} urls`) : log("FAIL", "sitemap.xml", `status ${sitemapRes.status}, ${sitemapUrls.length} urls`);
for (const f of ["/llms.txt", "/llms-full.txt"]) {
  const r = await get(f); const t = r.status === 200 ? await r.text() : "";
  r.status === 200 && t.trim().length > 50 ? log("PASS", f) : log(f === "/llms.txt" ? "FAIL" : "WARN", f, `status ${r.status}`);
}

// 3. JSON-LD + canonical + title
const blocks = [...homeHtml.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
if (!blocks.length) log("FAIL", "JSON-LD present");
else {
  const types = []; let bad = 0;
  for (const b of blocks) { try { const j = JSON.parse(b); for (const n of [].concat(j["@graph"] || j)) types.push([].concat(n["@type"]).join("/")); } catch { bad++; } }
  bad ? log("FAIL", "JSON-LD parses", `${bad} invalid block(s)`) : log("PASS", "JSON-LD present", types.join(", "));
}
const canon = homeHtml.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1];
canon ? log("PASS", "canonical link", canon) : log("WARN", "canonical link", "missing");
/<title>[^<]{3,}/i.test(homeHtml) ? log("PASS", "title present") : log("FAIL", "title present");
if (/Powered by Saabai/i.test(homeHtml)) log("PASS", "Powered by Saabai.ai credit (keep on all client sites)");

// 4. Form endpoints (OPTIONS then GET only)
for (const fp of formPaths) {
  const o = await get(fp, { method: "OPTIONS" });
  const g = o.status >= 200 && o.status < 500 ? o : await get(fp);
  g.status > 0 && g.status < 500 ? log("PASS", `form endpoint ${fp}`, `${o.status === g.status ? "OPTIONS" : "GET"} ${g.status} (405/401/400 still means reachable)`) : log("FAIL", `form endpoint ${fp}`, `status ${g.status} ${g.error || ""}`);
}

// 5. Browser checks (optional)
let chromium;
if (!args.includes("--no-browser")) {
  for (const load of [() => import("playwright"), () => createRequire("/workspace/package.json")("playwright")]) {
    try { const m = await load(); chromium = (m.default || m).chromium; if (chromium) break; } catch {}
  }
}
if (!chromium) log("SKIP", "browser checks", "Playwright not available (or --no-browser)");
else {
  mkdirSync(shotsDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, userAgent: UA + " Mobile" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160)); });
    page.on("response", (r) => { if (r.status() >= 400 && new URL(r.url()).origin === origin) errors.push(`${r.status()} ${new URL(r.url()).pathname}`); });
    await page.goto(origin + "/", { waitUntil: "networkidle", timeout: 45000 }).catch((e) => errors.push("goto: " + e.message));
    await page.waitForTimeout(1000);
    errors.length ? log("WARN", "console/JS errors", errors.slice(0, 5).join(" | ")) : log("PASS", "no console/JS errors or failed same-origin requests");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    overflow > 2 ? log("FAIL", "mobile horizontal overflow", `${overflow}px wider than 390px viewport`) : log("PASS", "no mobile horizontal overflow");
    const file = `${shotsDir}/${new URL(origin).host.replace(/[^\w.-]/g, "_")}-mobile.png`;
    await page.screenshot({ path: file, fullPage: false });
    log("PASS", "mobile screenshot", file);
  } catch (e) { log("WARN", "browser checks", String(e.message || e).slice(0, 200)); }
  finally { await browser.close(); }
}

const fails = results.filter((r) => r.status === "FAIL").length, warns = results.filter((r) => r.status === "WARN").length;
console.log(`\n${origin}: ${results.filter((r) => r.status === "PASS").length} pass, ${warns} warn, ${fails} fail`);
process.exit(fails ? 1 : 0);
