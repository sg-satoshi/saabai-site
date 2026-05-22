import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import { getSiteBySlug, updateSite } from "../../../../lib/site-registry";

export const runtime = "nodejs";

const redis = Redis.fromEnv();

const VERCEL_TOKEN = process.env.VERCEL_ACCESS_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || "prj_1p5i2LakOMkQJaSDAYd8Y1N3k3Ci";
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || "team_wJsriYxqNXFGvqb3vyolvWJT";

async function vercelAddDomain(domain: string): Promise<{ ok: boolean; error?: string }> {
  if (!VERCEL_TOKEN) return { ok: false, error: "VERCEL_ACCESS_TOKEN not set" };
  const res = await fetch(
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains?teamId=${VERCEL_TEAM_ID}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: domain }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, error: (err as { error?: { message?: string } }).error?.message || `HTTP ${res.status}` };
  }
  return { ok: true };
}

async function vercelRemoveDomain(domain: string): Promise<{ ok: boolean }> {
  if (!VERCEL_TOKEN) return { ok: false };
  await fetch(
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}?teamId=${VERCEL_TEAM_ID}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
  );
  return { ok: true };
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });
  const site = await getSiteBySlug(slug).catch(() => null);
  const domains = site?.domains || [];
  return Response.json({ domains });
}

export async function POST(req: NextRequest) {
  try {
    const { slug, domain } = await req.json();
    if (!slug || !domain) return Response.json({ error: "slug and domain required" }, { status: 400 });

    const cleanDomain = domain.trim().toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");

    // Add to Vercel project
    const vercelResult = await vercelAddDomain(cleanDomain);

    // Store in Redis regardless of Vercel result
    const site = await getSiteBySlug(slug);
    if (site) {
      const existing = site.domains || [];
      if (!existing.includes(cleanDomain)) {
        await updateSite(site.id, { domains: [...existing, cleanDomain] });
      }
      // Reverse lookup: domain → slug (used by middleware for custom domain routing)
      await redis.hset("saabai:domain-map", { [cleanDomain]: site.slug });
    }

    // DNS instructions
    const instructions = [
      { type: "CNAME", name: "www", value: "cname.vercel-dns.com", note: "For www subdomain" },
      { type: "A", name: "@", value: "76.76.21.21", note: "For root/apex domain" },
    ];

    return Response.json({
      ok: true,
      domain: cleanDomain,
      vercelConnected: vercelResult.ok,
      vercelError: vercelResult.error,
      instructions,
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { slug, domain } = await req.json();
    if (!slug || !domain) return Response.json({ error: "slug and domain required" }, { status: 400 });

    const cleanDomain = domain.trim().toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");

    await vercelRemoveDomain(cleanDomain);

    const site = await getSiteBySlug(slug);
    if (site) {
      const existing = site.domains || [];
      await updateSite(site.id, { domains: existing.filter((d) => d !== cleanDomain) });
      await redis.hdel("saabai:domain-map", cleanDomain);
    }

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
