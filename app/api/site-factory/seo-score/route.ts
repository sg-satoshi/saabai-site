import { NextRequest } from "next/server";
import { list } from "@vercel/blob";

export const runtime = "nodejs";

interface SeoCheck {
  key: string;
  label: string;
  passed: boolean;
  detail?: string;
  points: number;
}

function runSeoChecks(html: string, slug: string): SeoCheck[] {
  const checks: SeoCheck[] = [];

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "";
  checks.push({
    key: "title", label: "Title tag", points: 8,
    passed: title.length >= 30 && title.length <= 70,
    detail: title.length ? `"${title.slice(0, 55)}${title.length > 55 ? "…" : ""}" (${title.length} chars)` : "Missing",
  });

  const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim()
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1]?.trim() ?? "";
  checks.push({
    key: "meta_desc", label: "Meta description", points: 8,
    passed: desc.length >= 100 && desc.length <= 165,
    detail: desc.length ? `${desc.length} chars` : "Missing",
  });

  const h1s = [...html.matchAll(/<h1[^>]*>/gi)];
  checks.push({
    key: "h1", label: "Single H1 tag", points: 8,
    passed: h1s.length === 1,
    detail: h1s.length === 0 ? "No H1 found" : h1s.length > 1 ? `${h1s.length} H1s (should be 1)` : "Good",
  });

  const hasSchema = /<script[^>]+application\/ld\+json/i.test(html);
  const schemaType = html.match(/"@type"\s*:\s*"([^"]+)"/)?.[1] ?? "";
  checks.push({
    key: "schema", label: "Schema.org markup", points: 12,
    passed: hasSchema,
    detail: hasSchema ? schemaType || "Present" : "Missing — rich results disabled",
  });

  const hasCanonical = /rel=["']canonical["']/i.test(html);
  checks.push({
    key: "canonical", label: "Canonical URL", points: 8,
    passed: hasCanonical,
    detail: hasCanonical ? "Set" : "Missing — duplicate content risk",
  });

  const hasOgTitle = /og:title/i.test(html);
  const hasOgImage = /og:image/i.test(html);
  checks.push({
    key: "og", label: "Open Graph tags", points: 6,
    passed: hasOgTitle && hasOgImage,
    detail: !hasOgTitle ? "og:title missing" : !hasOgImage ? "og:image missing" : "Complete",
  });

  const imgsTotal = [...html.matchAll(/<img[^>]*>/gi)].length;
  const imgsMissingAlt = [...html.matchAll(/<img(?![^>]*alt=)[^>]*>/gi)].length;
  checks.push({
    key: "img_alt", label: "Image alt text", points: 6,
    passed: imgsMissingAlt === 0,
    detail: imgsMissingAlt === 0
      ? `All ${imgsTotal} images have alt text`
      : `${imgsMissingAlt} of ${imgsTotal} images missing alt`,
  });

  const hasViewport = /name=["']viewport["']/i.test(html);
  checks.push({
    key: "viewport", label: "Viewport meta", points: 4,
    passed: hasViewport,
    detail: hasViewport ? "Set" : "Missing — mobile unfriendly",
  });

  const hasTwitter = /twitter:card/i.test(html);
  checks.push({
    key: "twitter", label: "Twitter card", points: 4,
    passed: hasTwitter,
    detail: hasTwitter ? "Set" : "Missing",
  });

  const h2s = [...html.matchAll(/<h2[^>]*>/gi)].length;
  checks.push({
    key: "headings", label: "Heading structure (H2s)", points: 4,
    passed: h2s >= 2,
    detail: h2s === 0 ? "No H2 tags" : `${h2s} H2 sections`,
  });

  const hasFaqSchema = /"@type"\s*:\s*"FAQPage"/i.test(html);
  const hasFaqSection = /<[^>]+(?:id|class)=["'][^"']*faq[^"']*["']/i.test(html);
  checks.push({
    key: "faq_schema", label: "FAQ schema", points: 10,
    passed: !hasFaqSection || hasFaqSchema,
    detail: hasFaqSection && !hasFaqSchema
      ? "FAQ section found but no FAQ schema — missing rich snippets"
      : hasFaqSchema ? "FAQ schema present" : "No FAQ section",
  });

  const hasRobotsMeta = /name=["']robots["']/i.test(html);
  checks.push({
    key: "robots_meta", label: "Robots meta", points: 3,
    passed: hasRobotsMeta,
    detail: hasRobotsMeta ? "Set" : "Missing (minor)",
  });

  const hasAddress = /"address"/i.test(html) || /<address/i.test(html);
  checks.push({
    key: "address", label: "Business address in schema", points: 7,
    passed: hasAddress,
    detail: hasAddress ? "Found" : "Missing — hurts local SEO",
  });

  const hasGeo = /"geo"/i.test(html);
  checks.push({
    key: "geo", label: "Geo coordinates in schema", points: 5,
    passed: hasGeo,
    detail: hasGeo ? "Found" : "Missing — local map ranking affected",
  });

  const hasSitemap = /sitemap/i.test(html);
  checks.push({
    key: "sitemap_ref", label: "Sitemap referenced", points: 5,
    passed: hasSitemap,
    detail: hasSitemap ? "Found" : "Not referenced in HTML",
  });

  return checks;
}

async function getPageSpeed(url: string): Promise<{ mobile: number | null; desktop: number | null; seoScore: number | null }> {
  try {
    const [mobile, desktop] = await Promise.all([
      fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile`, { signal: AbortSignal.timeout(15000) }),
      fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=desktop`, { signal: AbortSignal.timeout(15000) }),
    ]);
    const [md, dd] = await Promise.all([mobile.json(), desktop.json()]);
    return {
      mobile: md.lighthouseResult?.categories?.performance?.score != null
        ? Math.round(md.lighthouseResult.categories.performance.score * 100) : null,
      desktop: dd.lighthouseResult?.categories?.performance?.score != null
        ? Math.round(dd.lighthouseResult.categories.performance.score * 100) : null,
      seoScore: md.lighthouseResult?.categories?.seo?.score != null
        ? Math.round(md.lighthouseResult.categories.seo.score * 100) : null,
    };
  } catch {
    return { mobile: null, desktop: null, seoScore: null };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const withPagespeed = searchParams.get("pagespeed") === "1";
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

  const { blobs } = await list({ prefix: `sites/${slug}/` });
  const liveBlob = blobs.find(b => b.pathname === `sites/${slug}/index.html`);
  const draftBlob = blobs.find(b => b.pathname === `sites/${slug}/draft.html`);
  const blob = draftBlob ?? liveBlob;
  if (!blob) return Response.json({ error: "Site not found" }, { status: 404 });

  const res = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
  const html = await res.text();
  const checks = runSeoChecks(html, slug);

  const maxPoints = checks.reduce((s, c) => s + c.points, 0);
  const earned = checks.filter(c => c.passed).reduce((s, c) => s + c.points, 0);
  const score = Math.round((earned / maxPoints) * 100);

  // Determine the public URL for PageSpeed
  let pageSpeedResult = null;
  if (withPagespeed) {
    // Use live URL — PageSpeed can't reach blob directly
    const liveUrl = `https://www.saabai.ai/sites/${slug}`;
    pageSpeedResult = await getPageSpeed(liveUrl);
  }

  return Response.json({ ok: true, score, checks, pageSpeed: pageSpeedResult });
}
