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
 *
 * --exp      split-testing checks (saabai.ai): variant is in the raw server HTML, cookie is sticky,
 *            bots / GPC get the default with no cookie, canonical/title/JSON-LD never vary.
 * --exp=off  the host must be untouched: no sb_exp cookie, no experiment markup (Stu's, LMM).
 *            Both send only GETs, plus one POST to /api/exp/event as a bot (always ignored, stores nothing).
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
const HUMAN_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const BOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const expMode = args.includes("--exp") ? "on" : opt("exp") === "off" ? "off" : null;

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


// 4b. Split testing checks
if (expMode) {
  const fetchHome = async (headers = {}) => {
    const r = await get("/", { headers: { "user-agent": HUMAN_UA, ...headers }, redirect: "manual" });
    const html = r.status === 200 ? await r.text() : "";
    const setc = (r.headers.getSetCookie?.() ?? [r.headers.get("set-cookie") || ""]).filter(Boolean);
    const ck = setc.find((c) => c.startsWith("sb_exp="));
    const variant = html.match(/data-exp-variant="([^"]+)"/)?.[1];
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, " ").replace(/&nbsp;|\u00a0/g, " ").replace(/\s+/g, " ").trim();
    const meta = {
      title: html.match(/<title>([^<]*)/i)?.[1], canon: html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1],
      ld: [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join("|"),
    };
    const ctaTag = html.match(/<a\b[^>]*data-exp-slot="home\.hero\.cta"[^>]*>([\s\S]*?)<\/a>/i);
    const cta = ctaTag ? { variant: ctaTag[0].match(/data-exp-variant="([^"]+)"/)?.[1], text: ctaTag[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() } : null;
    return { status: r.status, html, ck, cta, cookieHeader: ck?.split(";")[0], variant, h1, meta, httpOnly: /httponly/i.test(ck || "") };
  };
  if (expMode === "off") {
    const h = await fetchHome();
    h.status === 200 && !h.ck && !/data-exp-slot|data-exp-variant/.test(h.html)
      ? log("PASS", "exp off: no sb_exp cookie, no experiment markup (host untouched)")
      : log("FAIL", "exp off: host must be untouched", `status ${h.status}, cookie ${!!h.ck}, markup ${/data-exp-slot/.test(h.html)}`);
  } else {
    const h1 = await fetchHome();
    if (h1.status !== 200 || !h1.variant || !h1.h1) log("FAIL", "exp: variant rendered in raw server HTML", `status ${h1.status}, variant ${h1.variant}, h1 ${JSON.stringify(h1.h1)}`);
    else log("PASS", "exp: variant rendered in raw server HTML (no flicker)", `${h1.variant}: "${h1.h1}"`);
    h1.ck && h1.httpOnly ? log("PASS", "exp: human gets sb_exp cookie (HttpOnly)") : log("FAIL", "exp: human gets sb_exp cookie (HttpOnly)", h1.ck ? "not HttpOnly" : "no cookie");
    if (h1.cookieHeader) {
      let same = true;
      for (let i = 0; i < 4; i++) { const r = await fetchHome({ cookie: h1.cookieHeader }); if (r.variant !== h1.variant || r.ck) same = false; }
      same ? log("PASS", "exp: variant sticky across repeat visits, cookie not reissued") : log("FAIL", "exp: variant sticky across repeat visits");
    }
    // Sample fresh visitors: variants must differ in the headline only.
    const seen = new Map();
    for (let i = 0; i < 24 && seen.size < 3; i++) { const r = await fetchHome(); if (r.variant && !seen.has(r.variant)) seen.set(r.variant, r); }
    const vs = [...seen.values()];
    if (vs.length < 2) log("WARN", "exp: saw fewer than 2 variants in 24 fresh visits", `${[...seen.keys()]}`);
    else {
      const sameMeta = vs.every((v) => v.meta.title === vs[0].meta.title && v.meta.canon === vs[0].meta.canon && v.meta.ld === vs[0].meta.ld);
      sameMeta ? log("PASS", "exp: title, canonical and JSON-LD identical across variants", `variants seen: ${[...seen.keys()].join(",")}`) : log("FAIL", "exp: title/canonical/JSON-LD must not vary by variant");
      new Set(vs.map((v) => v.h1)).size === vs.length ? log("PASS", "exp: variants show different headlines") : log("FAIL", "exp: variants show the same headline");
    }
    // Second slot: hero button label. Same rules, independent assignment.
    if (!h1.cta?.variant || !h1.cta.text) log("FAIL", "exp: hero button variant rendered in raw server HTML", JSON.stringify(h1.cta));
    else log("PASS", "exp: hero button variant rendered in raw server HTML", `${h1.cta.variant}: "${h1.cta.text}"`);
    if (h1.cookieHeader) {
      let same = true;
      for (let i = 0; i < 3; i++) { const r = await fetchHome({ cookie: h1.cookieHeader }); if (r.cta?.variant !== h1.cta?.variant) same = false; }
      same ? log("PASS", "exp: hero button variant sticky across repeat visits") : log("FAIL", "exp: hero button variant sticky across repeat visits");
    }
    const ctaSeen = new Map();
    for (let i = 0; i < 24 && ctaSeen.size < 3; i++) { const r = await fetchHome(); if (r.cta?.variant && !ctaSeen.has(r.cta.variant)) ctaSeen.set(r.cta.variant, r.cta.text); }
    if (ctaSeen.size < 2) log("WARN", "exp: saw fewer than 2 hero button variants in 24 fresh visits", `${[...ctaSeen.keys()]}`);
    else new Set(ctaSeen.values()).size === ctaSeen.size ? log("PASS", "exp: hero button variants show different labels", [...ctaSeen.entries()].map(([k, t]) => `${k}="${t}"`).join(" ")) : log("FAIL", "exp: hero button variants show the same label");
    const bot = await fetchHome({ "user-agent": BOT_UA });
    const def = [...seen.values()].find((v) => v.variant === "a") ?? null;
    !bot.ck && bot.variant === "a" && bot.cta?.variant === "a" && (!def || bot.h1 === def.h1) ? log("PASS", "exp: bot gets default (control) headline and no cookie") : log("FAIL", "exp: bot must get default and no cookie", `variant ${bot.variant}, cookie ${!!bot.ck}`);
    const gpc = await fetchHome({ "sec-gpc": "1" });
    !gpc.ck && gpc.variant === "a" && gpc.cta?.variant === "a" ? log("PASS", "exp: Global Privacy Control gets default and no cookie") : log("FAIL", "exp: GPC must get default and no cookie", `variant ${gpc.variant}, cookie ${!!gpc.ck}`);
    const off = await fetchHome({ cookie: "sb_exp_off=1" });
    !off.ck && off.variant === "a" && off.cta?.variant === "a" ? log("PASS", "exp: opt-out cookie gets default and no cookie") : log("FAIL", "exp: opt-out must get default and no cookie");
    // Bot beacon: must be accepted (204) and ignored.
    try {
      const r = await fetch(new URL("/api/exp/event", origin), { method: "POST", headers: { "user-agent": BOT_UA, "content-type": "application/json" }, body: JSON.stringify({ type: "impression", exp: "home-hero-headline" }) });
      r.status === 204 ? log("PASS", "exp: event endpoint answers 204 to a bot (ignored)") : log("FAIL", "exp: event endpoint should answer 204", `got ${r.status}`);
    } catch (e) { log("FAIL", "exp: event endpoint reachable", String(e.message || e)); }
  }
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
