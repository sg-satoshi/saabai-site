/**
 * Every registered client site: production /sites/<slug> redirects to the
 * custom domain or is noindex; saabai.ai's sitemap lists no /sites URLs;
 * Saabai chrome stays off client routes; Saabai's own pages still index and
 * still show the announcement bar.
 *
 * Run: npx tsx --test tests/client-site-surface.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { APP_ROUTER_SITES } from "../lib/site-registry";
import { CLIENT_SITE_DIRECTORY } from "../lib/client-site-directory";
import { clientSiteMetadata } from "../lib/client-site";
import {
  canonicalHost,
  clientSiteRequestDecision,
  clientSiteRobots,
  isAdminSitePreview,
  showsSaabaiChrome,
  slugForHost,
  type SurfaceDecision,
} from "../lib/client-site-surface";
import sitemap from "../app/sitemap";
import robots from "../app/robots";

const ROOT = path.join(__dirname, "..");

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function locationOf(decision: SurfaceDecision): string {
  assert.equal(decision.action, "redirect");
  if (decision.action !== "redirect") throw new Error("unreachable");
  return decision.location;
}

test("the site directory and the app-router registry are the same sites", () => {
  assert.ok(APP_ROUTER_SITES.length >= 4);
  assert.deepEqual(
    APP_ROUTER_SITES.map((site) => ({ slug: site.slug, url: site.url, ...(site.domains ? { domains: site.domains } : {}) })),
    CLIENT_SITE_DIRECTORY,
  );
});

test("a site registered only in the directory is covered, with no other opt-in", () => {
  const sites = [
    ...CLIENT_SITE_DIRECTORY,
    { slug: "new-client", url: "https://newclient.example", domains: ["newclient.example", "www.newclient.example"] },
  ];
  const decision = clientSiteRequestDecision({ host: "www.saabai.ai", pathname: "/sites/new-client/about", sites });
  assert.deepEqual(decision, { action: "redirect", location: "https://newclient.example/about", status: 301 });
  assert.equal(showsSaabaiChrome("newclient.example", "/about", sites), false);
  assert.equal(showsSaabaiChrome("www.saabai.ai", "/sites/new-client", sites), false);
  assert.equal(clientSiteRequestDecision({ host: "preview.vercel.app", pathname: "/sites/new-client", sites }).action, "noindex");
});

for (const site of APP_ROUTER_SITES) {
  const domain = canonicalHost(site);
  const home = `/sites/${site.slug}`;
  const sub = `/sites/${site.slug}/contact`;

  test(`${site.slug}: saabai.ai /sites path redirects or is noindex`, () => {
    for (const host of ["saabai.ai", "www.saabai.ai"]) {
      const root = clientSiteRequestDecision({ host, pathname: home });
      const child = clientSiteRequestDecision({ host, pathname: sub, search: "?utm=x" });
      if (domain) {
        assert.equal(locationOf(root), `https://${domain}/`);
        assert.equal(locationOf(child), `https://${domain}/contact?utm=x`);
        assert.ok(!locationOf(root).includes("/sites/"));
        assert.equal(clientSiteRobots(domain, null).index, true);
      } else {
        assert.equal(root.action, "noindex");
        assert.equal(child.action, "noindex");
        assert.deepEqual(clientSiteRobots(host, "noindex, nofollow"), { index: false, follow: false });
      }
    }
    assert.equal(clientSiteRequestDecision({ host: "saabai-site-abc123.vercel.app", pathname: home }).action, "noindex");
    assert.equal(clientSiteRequestDecision({ host: "localhost", pathname: sub }).action, "noindex");
    assert.deepEqual(clientSiteRobots("saabai-site-abc123.vercel.app", null), { index: false, follow: false });
    assert.deepEqual(clientSiteRobots("www.saabai.ai", null), { index: false, follow: false });
  });

  test(`${site.slug}: custom-domain render stays indexable and does not redirect`, () => {
    if (!domain) return;
    assert.equal(clientSiteRequestDecision({ host: domain, pathname: sub }).action, "index");
    assert.equal(clientSiteRequestDecision({ host: `www.${domain}`, pathname: home }).action, "index");
    assert.equal(clientSiteRequestDecision({ host: domain, pathname: "/contact" }).action, "pass");
  });

  test(`${site.slug}: Saabai chrome is hidden on the client route and the client host`, () => {
    for (const host of ["www.saabai.ai", "saabai.ai", "saabai-site-abc123.vercel.app", "localhost"]) {
      assert.equal(showsSaabaiChrome(host, home), false, host);
      assert.equal(showsSaabaiChrome(host, `${sub}?t=1`), false, host);
    }
    if (domain) {
      assert.equal(showsSaabaiChrome(domain, "/"), false);
      assert.equal(showsSaabaiChrome(`www.${domain}`, "/contact"), false);
    }
  });

  test(`${site.slug}: static assets are not redirected`, () => {
    assert.equal(clientSiteRequestDecision({ host: "www.saabai.ai", pathname: `${home}/logo.webp` }).action, "pass");
    assert.equal(clientSiteRequestDecision({ host: "www.saabai.ai", pathname: `${home}/favicon.ico` }).action, "pass");
  });
}

test("admin preview of a custom-domain site keeps /sites and is noindex", () => {
  assert.equal(isAdminSitePreview({ hasSessionCookie: true, referer: null }), true);
  assert.equal(isAdminSitePreview({ hasSessionCookie: false, referer: "https://www.saabai.ai/saabai-admin/site-factory" }), true);
  assert.equal(isAdminSitePreview({ hasSessionCookie: false, referer: "https://www.saabai.ai/blueprint" }), false);
  const decision = clientSiteRequestDecision({
    host: "www.saabai.ai",
    pathname: "/sites/cycle-repair/faq",
    adminPreview: true,
  });
  assert.equal(decision.action, "noindex");
});

test("api, chatbot and saabai pages are not treated as client-site redirects", () => {
  for (const pathname of ["/api/cycle-repair/lead", "/api/announcement/active", "/api/chat-platform/message", "/embed/chat.v1.js", "/", "/blueprint", "/websites", "/faq"]) {
    assert.equal(clientSiteRequestDecision({ host: "www.saabai.ai", pathname }).action, "pass", pathname);
  }
});

test("saabai.ai pages stay indexable and still show the announcement bar", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /robots:\s*\{[\s\S]*index:\s*true/);
  assert.match(layout, /<AnnouncementBar\s*\/>/);
  for (const pathname of ["/", "/blueprint", "/websites", "/contact", "/legal"]) {
    assert.equal(showsSaabaiChrome("www.saabai.ai", pathname), true, pathname);
    assert.equal(showsSaabaiChrome("saabai.ai", pathname), true, pathname);
    assert.equal(showsSaabaiChrome("saabai-site-abc123.vercel.app", pathname), true, pathname);
  }
  assert.equal(clientSiteRobots("stuscyclerepairs.com", "noindex, nofollow").index, false);
});

test("saabai.ai sitemap and robots.txt do not list or disallow /sites", () => {
  const urls = sitemap().map((entry) => entry.url);
  assert.ok(urls.length > 10);
  assert.ok(urls.some((url) => url === "https://www.saabai.ai/blueprint"));
  assert.deepEqual(urls.filter((url) => url.includes("/sites")), []);
  const body = JSON.stringify(robots());
  assert.ok(!body.includes("/sites"));
  assert.ok(!read("app/robots.ts").includes("/sites"));
  assert.ok(!read("app/sitemap.ts").includes("/sites"));
});

test("chrome, middleware and site metadata use the shared helper", () => {
  for (const file of [
    "app/components/AnnouncementBar.tsx",
    "app/components/ConditionalWidgets.tsx",
    "app/components/EmailCapturePopup.tsx",
    "app/components/exp/ExpOverlay.tsx",
  ]) {
    const src = read(file);
    assert.match(src, /showsSaabaiChrome\(/, file);
    assert.ok(!src.includes("stuscyclerepairs.com"), file);
    assert.ok(!src.includes("boconsulting.com.au"), file);
    assert.ok(!src.includes("wholesalehomes.com.au"), file);
  }
  const proxy = read("proxy.ts");
  assert.match(proxy, /clientSiteRequestDecision\(/);
  assert.match(proxy, /X-Robots-Tag/);
  assert.match(proxy, /isAdminSitePreview\(/);
  const sitesLayout = read("app/sites/layout.tsx");
  assert.match(sitesLayout, /clientSiteRobots\(/);
  const meta = clientSiteMetadata({ siteUrl: "https://example.com.au", name: "Example", title: "Example", description: "d" });
  assert.equal("robots" in meta, false);
});

test("no client site hard-codes an indexable robots export", () => {
  const files = walk(path.join(ROOT, "app", "sites")).filter((file) => file.endsWith(".tsx") && !file.endsWith(`${path.sep}app${path.sep}sites${path.sep}layout.tsx`));
  const hits = files.filter((file) => /index:\s*true/.test(readFileSync(file, "utf8"))).map((file) => path.relative(ROOT, file));
  assert.deepEqual(hits, []);
});

test("code-mapped static sites redirect from /sites/<slug> too", () => {
  const decision = clientSiteRequestDecision({
    host: "www.saabai.ai",
    pathname: "/sites/lmm-site/contact",
    extraDomains: { "lmm-site": "lifestylemoneymanagement.com.au" },
  });
  assert.equal(locationOf(decision), "https://lifestylemoneymanagement.com.au/contact");
  assert.equal(showsSaabaiChrome("lifestylemoneymanagement.com.au", "/"), false);
  assert.equal(slugForHost("lifestylemoneymanagement.com.au"), "lmm-site");
  assert.equal(slugForHost("www.stuscyclerepairs.com"), "cycle-repair");
  assert.equal(slugForHost("www.saabai.ai"), null);
  assert.equal(slugForHost("saabai-site-abc.vercel.app"), null);
});
