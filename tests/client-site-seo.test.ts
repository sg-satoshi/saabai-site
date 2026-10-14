/**
 * Guard: factory client sites must not inherit or point at Saabai's SEO identity
 * (title template, canonical, JSON-LD), and each must carry the tagged
 * "Powered by Saabai.ai" footer credit. Run: npx tsx --test tests/client-site-seo.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { clientSiteMetadata, ensurePoweredBy, poweredByUrl, POWERED_BY_TEXT } from "../lib/client-site";

const ROOT = path.join(__dirname, "..");
const SITES_DIR = path.join(ROOT, "app", "sites");
const CLIENTS_DIR = path.join(ROOT, "public", "clients");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|html)$/.test(f) ? [p] : [];
  });
}

const appSites = readdirSync(SITES_DIR).filter(
  (d) => !d.startsWith("[") && statSync(path.join(SITES_DIR, d)).isDirectory()
);

const SAABAI_URL = /https?:\/\/(www\.)?saabai\.ai/;

test("there are App Router client sites to check", () => {
  assert.ok(appSites.length >= 4, `found ${appSites.join(",")}`);
});

for (const site of appSites) {
  const dir = path.join(SITES_DIR, site);
  const files = walk(dir);
  const all = files.map((f) => readFileSync(f, "utf8")).join("\n");
  const layoutPath = path.join(dir, "layout.tsx");

  test(`${site}: has its own root layout metadata`, () => {
    assert.ok(existsSync(layoutPath), "missing layout.tsx (would inherit Saabai metadata)");
    const layout = readFileSync(layoutPath, "utf8");
    assert.match(layout, /export const metadata/);
    // Must override the root "%s | Saabai" template and Saabai canonical.
    assert.ok(/clientSiteMetadata\(/.test(layout) || /template:/.test(layout), "no title template override");
    assert.ok(/clientSiteMetadata\(/.test(layout) || /canonical:/.test(layout), "no canonical override");
    // A plain string or title.default still gets the root "%s | Saabai" template; it must be absolute.
    assert.ok(/clientSiteMetadata\(/.test(layout) || /title:\s*\{\s*absolute:/.test(layout), "root title must use title.absolute");
    assert.ok(/clientSiteMetadata\(/.test(layout) || /metadataBase:/.test(layout), "no metadataBase override");
  });

  test(`${site}: titles, canonicals and JSON-LD never point at saabai.ai`, () => {
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const line of src.split("\n")) {
        if (/(canonical|metadataBase|"@id"|url:\s|siteName)/.test(line)) {
          assert.ok(!SAABAI_URL.test(line), `${path.relative(ROOT, f)}: ${line.trim()}`);
        }
        if (/title[:=]/.test(line)) {
          assert.ok(!/\|\s*Saabai\b/.test(line), `${path.relative(ROOT, f)}: ${line.trim()}`);
        }
      }
      assert.ok(!/organizationSchema|seo-entity/.test(src), `${path.relative(ROOT, f)} imports Saabai's entity schema`);
    }
  });

  test(`${site}: has its own JSON-LD`, () => {
    assert.match(all, /application\/ld\+json/);
  });

  test(`${site}: footer carries the tagged Powered by Saabai.ai credit`, () => {
    assert.ok(
      /<PoweredBySaabai\b/.test(all) || (all.includes(POWERED_BY_TEXT) && /utm_medium=footer/.test(all)),
      "missing Powered by Saabai.ai footer credit"
    );
  });
}

test("root layout only emits Saabai's Organization JSON-LD outside app/sites", () => {
  const layout = readFileSync(path.join(ROOT, "app", "layout.tsx"), "utf8");
  assert.ok(!/organizationSchema/.test(layout), "root layout must not inject organizationSchema directly");
  const comp = readFileSync(path.join(ROOT, "app", "components", "SaabaiJsonLd.tsx"), "utf8");
  assert.match(comp, /segment === "sites"\) return null/);
});

test("stored-HTML client sites don't claim a saabai.ai canonical", () => {
  if (!existsSync(CLIENTS_DIR)) return;
  for (const d of readdirSync(CLIENTS_DIR)) {
    const f = path.join(CLIENTS_DIR, d, "index.html");
    if (!existsSync(f)) continue;
    const html = readFileSync(f, "utf8");
    const canon = html.match(/rel="canonical"\s+href="([^"]+)"/)?.[1];
    if (canon) assert.ok(!SAABAI_URL.test(canon), `${d}: canonical ${canon}`);
    assert.ok(!/"@id"\s*:\s*"https:\/\/www\.saabai\.ai/.test(html), `${d}: Saabai JSON-LD`);
  }
});

test("clientSiteMetadata overrides every Saabai root field", () => {
  const m = clientSiteMetadata({ siteUrl: "https://example.com.au", name: "Example Co", title: "Example", description: "d" });
  assert.equal(String(m.metadataBase), "https://example.com.au/");
  assert.deepEqual(m.title, { absolute: "Example", template: "%s | Example Co" });
  assert.equal(m.keywords, null);
  assert.equal(m.manifest, null);
  assert.deepEqual(m.alternates, { canonical: "/" });
  assert.equal((m.openGraph as { siteName?: string }).siteName, "Example Co");
  assert.ok(!JSON.stringify(m).includes("saabai"));
});

test("ensurePoweredBy tags an existing credit and adds one when missing", () => {
  const url = poweredByUrl("lmm");
  assert.equal(url, "https://www.saabai.ai/?utm_source=lmm&utm_medium=footer");
  const tagged = ensurePoweredBy("lmm", '<body><a href="https://www.saabai.ai" target="_blank" rel="noopener">Powered by Saabai.ai</a></body>');
  assert.ok(tagged.includes(`href="${url}"`));
  assert.equal(tagged.match(/Powered by Saabai\.ai/g)?.length, 1);
  const added = ensurePoweredBy("x", "<html><body><p>hi</p></body></html>");
  assert.match(added, /data-saabai-credit[\s\S]*Powered by Saabai\.ai<\/a><\/div><\/body>/);
  assert.equal(ensurePoweredBy("x", added), added.replace("utm_source=x", "utm_source=x"));
});

// ── GA4 guard: Saabai's GA property must never load on factory client sites ──
import { GA_ID, gaHostMode, gaPathAllowed } from "../lib/ga";

const GA_PATTERN = /gtag|googletagmanager|G-9KVV3KKZZH/;

test("GA4: no client site source references gtag or Saabai's measurement ID", () => {
  const files = [...walk(SITES_DIR), ...(existsSync(CLIENTS_DIR) ? walk(CLIENTS_DIR) : [])];
  const hits = files.filter((f) => GA_PATTERN.test(readFileSync(f, "utf8"))).map((f) => path.relative(ROOT, f));
  assert.deepEqual(hits, [], `GA found in client site files: ${hits.join(", ")}`);
});

test("GA4: only saabai.ai hosts (and this project's previews) load GA", () => {
  assert.equal(GA_ID, process.env.NEXT_PUBLIC_GA_ID || "G-9KVV3KKZZH");
  assert.equal(gaHostMode("www.saabai.ai"), "prod");
  assert.equal(gaHostMode("saabai.ai"), "prod");
  assert.equal(gaHostMode("saabai-site-git-x-shanegoldbergs-projects.vercel.app"), "preview");
  for (const h of [
    "stuscyclerepairs.com", "www.stuscyclerepairs.com", "boconsulting.com.au", "www.boconsulting.com.au",
    "wholesalehomes.com.au", "www.wholesalehomes.com.au", "lifestylemoneymanagement.com.au",
    "client.saabai.ai", "other-project.vercel.app", "localhost", "evil-saabai.ai", "saabai.ai.evil.com",
  ]) assert.equal(gaHostMode(h), null, h);
});

test("GA4: /sites/*, admin and portal paths are excluded on saabai.ai", () => {
  for (const p of ["/sites/cycle-repair", "/sites/bo-consultancy/about", "/sites/wholesale-homes", "/sites/x", "/saabai-admin", "/saabai-admin/products", "/pulse", "/client-portal", "/dashboard/x", "/admin", "/login", "/mission-control"])
    assert.equal(gaPathAllowed(p), false, p);
  for (const p of ["/", "/score", "/blueprint", "/blueprint/checkout", "/blueprint/confirmation", "/websites", "/pay/done", "/privacy"])
    assert.equal(gaPathAllowed(p), true, p);
});

test("GA4: the root layout mounts GA only through the guarded component", () => {
  const layout = readFileSync(path.join(ROOT, "app", "layout.tsx"), "utf8");
  assert.ok(!GA_PATTERN.test(layout), "root layout must not inline gtag");
  const comp = readFileSync(path.join(ROOT, "app", "components", "GoogleAnalytics.tsx"), "utf8");
  assert.match(comp, /gaHostMode\(/);
  assert.match(comp, /gaPathAllowed\(/);
});
