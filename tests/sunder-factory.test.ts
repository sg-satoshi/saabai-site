/**
 * SUNDER factory shell: host map, pickleball 301s, noindex, and the seed
 * the Site Factory admin writes when the legacy row is opened.
 *
 * Run: npx tsx --test tests/sunder-factory.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  STATIC_DOMAIN_MAP,
  canonicalDomainsFromHostMap,
  clientSiteRequestDecision,
  clientSiteRobots,
  hostRedirect,
  showsSaabaiChrome,
  slugForHost,
} from "../lib/client-site-surface";
import {
  SUNDER_FACTORY_SEED,
  SUNDER_HEADLINE,
  sunderGeoProfile,
  sunderRobotsHeaders,
} from "../lib/sunder-factory-seed";

const html = readFileSync("public/clients/sunder/index.html", "utf8");

test("sunder hosts map to the factory slug and stay noindex", () => {
  assert.equal(slugForHost("sunder.com.au"), "sunder");
  assert.equal(slugForHost("www.sunder.com.au"), "sunder");
  assert.equal(slugForHost("WWW.SUNDER.COM.AU"), "sunder");
  assert.equal(STATIC_DOMAIN_MAP["sunder.com.au"], "sunder");
  assert.equal(showsSaabaiChrome("sunder.com.au", "/"), false);
  assert.equal(showsSaabaiChrome("www.sunder.com.au", "/"), false);
  assert.equal(showsSaabaiChrome("www.saabai.ai", "/"), true);
  assert.deepEqual(clientSiteRobots("sunder.com.au", null), { index: false, follow: false });
  assert.deepEqual(clientSiteRobots("www.sunder.com.au", null), { index: false, follow: false });
  assert.equal(clientSiteRobots("stuscyclerepairs.com", null).index, true);
  assert.equal(clientSiteRobots("boconsulting.com.au", null).index, true);
  assert.equal(clientSiteRequestDecision({ host: "sunder.com.au", pathname: "/sites/sunder" }).action, "noindex");
  assert.equal(clientSiteRequestDecision({ host: "www.sunder.com.au", pathname: "/sites/sunder" }).action, "noindex");
  assert.equal(clientSiteRequestDecision({ host: "stuscyclerepairs.com", pathname: "/sites/cycle-repair" }).action, "index");

  const extra = canonicalDomainsFromHostMap(STATIC_DOMAIN_MAP);
  const prod = clientSiteRequestDecision({ host: "www.saabai.ai", pathname: "/sites/sunder", extraDomains: extra });
  assert.deepEqual(prod, { action: "redirect", location: "https://sunder.com.au/", status: 301 });
  const lmm = clientSiteRequestDecision({ host: "www.saabai.ai", pathname: "/sites/lmm-site/contact", extraDomains: extra });
  assert.deepEqual(lmm, { action: "redirect", location: "https://lifestylemoneymanagement.com.au/contact", status: 301 });
  assert.equal(
    clientSiteRequestDecision({ host: "saabai-site-git-x.vercel.app", pathname: "/sites/sunder", extraDomains: extra }).action,
    "noindex",
  );
});

test("pickleball hosts 301 to the sunder apex and other hosts do not", () => {
  for (const host of [
    "sunderpickleball.com",
    "www.sunderpickleball.com",
    "sunderpickleball.com.au",
    "www.sunderpickleball.com.au",
  ]) {
    assert.deepEqual(hostRedirect(host, "/", ""), { location: "https://sunder.com.au/", status: 301 });
    assert.deepEqual(hostRedirect(host, "/faq", "?x=1"), { location: "https://sunder.com.au/faq?x=1", status: 301 });
  }
  for (const host of ["sunder.com.au", "www.sunder.com.au", "stuscyclerepairs.com", "www.saabai.ai", "boconsulting.com.au"]) {
    assert.equal(hostRedirect(host, "/", ""), null, host);
  }
});

test("factory seed is the record Site Factory writes, with no origin or approval claim", () => {
  assert.equal(SUNDER_FACTORY_SEED.slug, "sunder");
  assert.equal(SUNDER_FACTORY_SEED.name, "SUNDER");
  assert.equal(SUNDER_FACTORY_SEED.source, "factory");
  assert.equal(SUNDER_FACTORY_SEED.status, "draft");
  assert.equal(SUNDER_FACTORY_SEED.url, "https://sunder.com.au");
  assert.deepEqual(SUNDER_FACTORY_SEED.domains, ["sunder.com.au", "www.sunder.com.au"]);
  assert.equal(SUNDER_FACTORY_SEED.chatbot.enabled, false);
  assert.equal(SUNDER_HEADLINE.control, "Get first hit.");
  assert.equal(SUNDER_HEADLINE.variant, "Feel the power. Keep the control.");
  assert.match(sunderGeoProfile().summary, /pickleball paddle/);
  assert.equal(/\$\d|launch(es)? (on|in) [A-Z]|made in/i.test(JSON.stringify(sunderGeoProfile())), false);
  const blob = JSON.stringify(SUNDER_FACTORY_SEED) + JSON.stringify(sunderGeoProfile()) + html;
  assert.equal(/made in australia/i.test(blob), false);
  assert.equal(/usa pickleball/i.test(blob), false);
  assert.match(readFileSync("app/api/site-factory/migrate-legacy/route.ts", "utf8"), /SUNDER_FACTORY_SEED/);
  assert.match(readFileSync("lib/factory-sites.ts", "utf8"), /SUNDER_LEGACY_META/);
  const cfg = readFileSync("next.config.ts", "utf8");
  assert.ok(cfg.includes("sunder\\\\.com\\\\.au"));
  assert.ok(cfg.includes("sunderpickleball\\\\.com"));
});

test("r3b waitlist page is live-safe: noindex, wired submit", () => {
  assert.match(html, /Get first hit\./);
  assert.match(html, /Feel the power\. Keep the control\./);
  assert.match(html, /Split the game open\./);
  assert.match(html, /id="first"/);
  assert.match(html, /id="email"/);
  assert.match(html, /\/api\/sunder-waitlist/);
  assert.equal(/<form[^>]*action=/.test(html), false);
  assert.match(html, /\/clients\/sunder\/img\/hero-paddle-strike-desktop-2560x1440\.jpg/);
  assert.equal(/(src|href)="(img|fonts)\//.test(html), false);
  assert.match(html, /content="noindex, nofollow"/);
  assert.match(html, /application\/ld\+json/);
  assert.equal(/[—–]/.test(html), false);
  assert.equal(sunderRobotsHeaders("sunder", { "Content-Type": "text/html" })["X-Robots-Tag"], "noindex, nofollow");
  assert.equal("X-Robots-Tag" in sunderRobotsHeaders("cycle-repair", { "Content-Type": "text/html" }), false);
  assert.equal("X-Robots-Tag" in sunderRobotsHeaders("lmm-site", { "Content-Type": "text/html" }), false);
});

test("proxy redirects alias hosts, serves sunder noindex, and leaves Stu's alone", async () => {
  process.env.UPSTASH_REDIS_REST_URL ||= "http://127.0.0.1:9";
  process.env.UPSTASH_REDIS_REST_TOKEN ||= "test";
  process.env.SAABAI_SESSION_SECRET ||= "test-secret-test-secret-test-secret-1234";
  process.env.PORTAL_SESSION_SECRET ||= "portal-test-secret-portal-test-secret";
  const { NextRequest } = await import("next/server");
  const { proxy } = await import("../proxy");
  const hit = async (host: string, path: string) => {
    const res = await proxy(new NextRequest(`https://${host}${path}`, { headers: { host } }));
    return {
      status: res.status,
      location: res.headers.get("location"),
      robots: res.headers.get("x-robots-tag"),
      rewrite: res.headers.get("x-middleware-rewrite"),
    };
  };

  assert.deepEqual(await hit("sunderpickleball.com", "/"), {
    status: 301,
    location: "https://sunder.com.au/",
    robots: null,
    rewrite: null,
  });
  assert.deepEqual(await hit("www.sunderpickleball.com.au", "/faq?x=1"), {
    status: 301,
    location: "https://sunder.com.au/faq?x=1",
    robots: null,
    rewrite: null,
  });

  const home = await hit("sunder.com.au", "/");
  assert.equal(home.status, 200);
  assert.equal(home.location, null);
  assert.equal(home.robots, "noindex, nofollow");
  assert.match(home.rewrite ?? "", /\/sites\/sunder$/);

  const www = await hit("www.sunder.com.au", "/");
  assert.equal(www.location, null);
  assert.equal(www.robots, "noindex, nofollow");
  assert.match(www.rewrite ?? "", /\/sites\/sunder$/);

  const stu = await hit("stuscyclerepairs.com", "/");
  assert.equal(stu.location, null);
  assert.equal(stu.robots, null);
  assert.match(stu.rewrite ?? "", /\/sites\/cycle-repair$/);

  const prod = await hit("www.saabai.ai", "/sites/sunder");
  assert.equal(prod.status, 301);
  assert.equal(prod.location, "https://sunder.com.au/");

  const preview = await hit("saabai-site-git-x.vercel.app", "/sites/sunder");
  assert.notEqual(preview.status, 301);
  assert.equal(preview.location, null);
  assert.equal(preview.robots, "noindex, nofollow");
});
