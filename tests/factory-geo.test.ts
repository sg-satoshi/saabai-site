import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { AI_BOTS, llmsFullTxt, llmsTxt, robotsTxt, sitemapXml } from "../lib/geo/index";
import { CODED_PROFILES } from "../lib/geo/profiles";

const ROOT = path.resolve(__dirname, "..");
const SITES = path.join(ROOT, "app", "sites");
const CLIENTS = path.join(ROOT, "public", "clients");

// Sites that do not meet the standard yet. Each needs facts or a decision from Shane.
// Do not add new sites here; fix them instead.
const KNOWN_GAPS_CODED = new Set(["tributum-law-v2"]); // noindex staging copy of tributumlaw.com
const KNOWN_GAPS_STATIC = new Set(["nextinvestment", "nico-moretti", "Tributum Law"]);

test("geo builders: robots welcomes AI crawlers and lists the sitemap", () => {
  const r = robotsTxt({ sitemapUrl: "https://x.test/sitemap.xml" });
  for (const b of AI_BOTS) assert.ok(r.includes(`User-agent: ${b}`), b);
  assert.ok(r.includes("Sitemap: https://x.test/sitemap.xml"));
});

test("geo builders: sitemap and llms use only the given pages", () => {
  const p = { name: "X", url: "https://x.test", summary: "s", pages: [{ path: "/", title: "Home" }, { path: "/a", title: "A" }] };
  const sm = sitemapXml(p, "2026-01-01");
  assert.equal((sm.match(/<loc>/g) ?? []).length, 2);
  assert.ok(llmsTxt(p).includes("https://x.test/a"));
  assert.ok(llmsFullTxt(p).includes("llms-full.txt"));
});

test("coded profiles: no template city pages, no Saabai branding, no street address", () => {
  for (const [slug, p] of Object.entries(CODED_PROFILES)) {
    const text = llmsFullTxt(p) + sitemapXml(p);
    assert.ok(!/saabai/i.test(text), `${slug} mentions Saabai`);
    for (const c of ["sydney", "melbourne", "perth", "canberra", "hobart"]) {
      assert.ok(!p.pages.some((pg) => pg.path === `/${c}`), `${slug} lists /${c}`);
    }
    assert.ok(!p.address, `${slug} has an address`);
  }
});

test("every coded site under app/sites has AI SEO coverage", () => {
  for (const dir of readdirSync(SITES)) {
    if (dir.startsWith("[") || !statSync(path.join(SITES, dir)).isDirectory()) continue;
    if (KNOWN_GAPS_CODED.has(dir)) continue;
    const own = ["robots.txt", "sitemap.xml", "llms.txt", "llms-full.txt"].every((f) => existsSync(path.join(SITES, dir, f, "route.ts")));
    assert.ok(own || CODED_PROFILES[dir], `${dir}: add a CODED_PROFILES entry or own SEO routes (see docs/site-factory-ai-seo.md)`);
  }
});

test("every static client site has robots, sitemap and llms files", () => {
  for (const dir of readdirSync(CLIENTS)) {
    const full = path.join(CLIENTS, dir);
    if (!statSync(full).isDirectory() || KNOWN_GAPS_STATIC.has(dir)) continue;
    for (const f of ["robots.txt", "sitemap.xml", "llms.txt", "llms-full.txt"]) {
      assert.ok(existsSync(path.join(full, f)), `${dir}: missing ${f}`);
    }
    const robots = readFileSync(path.join(full, "robots.txt"), "utf8");
    assert.ok(/GPTBot/.test(robots) && /Sitemap:/.test(robots), `${dir}: robots.txt must allow AI bots and list the sitemap`);
    const html = existsSync(path.join(full, "index.html")) ? readFileSync(path.join(full, "index.html"), "utf8") : "";
    if (html) assert.ok(/application\/ld\+json/.test(html), `${dir}: index.html needs JSON-LD`);
  }
});

test("city-page redirects never apply to client hosts", () => {
  const cfg = readFileSync(path.join(ROOT, "next.config.ts"), "utf8");
  for (const host of ["stuscyclerepairs", "boconsulting", "wholesalehomes", "lifestylemoneymanagement", "nicomoretti"]) {
    assert.ok(cfg.includes(host), `${host} missing from CLIENT_HOST`);
  }
});
