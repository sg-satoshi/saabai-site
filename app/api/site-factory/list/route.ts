import { listSites } from "../../../../lib/site-registry";
import { readdirSync, existsSync } from "fs";
import path from "path";

export const runtime = "nodejs";

interface LegacyMeta {
  name: string;
  niche: string;
  description?: string;
}

const LEGACY_META: Record<string, LegacyMeta> = {
  nextinvestment: { name: "Next Investment", niche: "finance" },
  "lmm-site":     { name: "Lifestyle Money Management", niche: "finance" },
  "nico-moretti": { name: "Nico Moretti", niche: "professional-services", description: "Bespoke companionship for discerning executive women." },
  "heaven-thai-massage": { name: "Heaven Thai Massage", niche: "health-wellness", description: "Traditional Thai massage studio in Worongary." },
};

// App Router sites hardcoded here as a reliable fallback (APP_ROUTER_SITES in site-registry
// can be overridden by Redis slugs — this list always wins if slug not already present).
const PINNED_SITES = [
  {
    id: "bo-consultancy",
    slug: "bo-consultancy",
    name: "BO Consulting",
    niche: "professional-services",
    description: "Blue-collar recruitment & labour hire (App Router, boconsulting.com.au)",
    status: "live",
    url: "https://boconsulting.com.au",
    domains: ["boconsulting.com.au", "www.boconsulting.com.au"],
    business: { name: "BO Consulting", email: "info@boconsulting.com.au" },
    chatbot: { enabled: true, name: "Christina", greeting: "G'day! I'm Christina, the BO Consulting assistant.", systemPrompt: "You are Christina, the BO Consulting assistant.", avatarUrl: "/sites/bo-consultancy/christina-avatar.jpg" },
    createdAt: 1745000000000,
    updatedAt: 1745000000000,
  },
];

function scanLegacySites() {
  const clientsDir = path.join(process.cwd(), "public", "clients");
  const dirs: Array<ReturnType<typeof toSiteResult>> = [];

  // Filesystem-based legacy sites
  if (existsSync(clientsDir)) {
    const entries = readdirSync(clientsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory());
    for (const d of entries) {
      const slug = d.name;
      const meta = LEGACY_META[slug] ?? { name: slug, niche: "professional-services" };
      dirs.push(toSiteResult(slug, meta));
    }
  }

  // Blob-based legacy sites that have no public/clients/ directory
  for (const [slug, meta] of Object.entries(LEGACY_META)) {
    if (!dirs.find(s => s.slug === slug)) {
      dirs.push(toSiteResult(slug, meta));
    }
  }

  return dirs;
}

function toSiteResult(slug: string, meta: LegacyMeta) {
  return {
    id: `legacy_${slug}`,
    slug,
    name: meta.name,
    niche: meta.niche,
    description: meta.description,
    status: "live",
    url: `https://www.saabai.ai/sites/${slug}/`,
    business: { name: meta.name },
    chatbot: { enabled: true, name: "Assistant", greeting: "", systemPrompt: "" },
    createdAt: 0,
    updatedAt: 0,
  };
}

export async function GET() {
  try {
    const redisSites = await listSites();
    const legacySites = scanLegacySites();

    // Merge: Redis/APP_ROUTER first, then legacy, then pinned (fills any gaps)
    const seen = new Set(redisSites.map((s) => s.slug));
    const withLegacy = [...redisSites, ...legacySites.filter((s) => !seen.has(s.slug))];
    const seen2 = new Set(withLegacy.map((s) => s.slug));
    const merged = [...withLegacy, ...PINNED_SITES.filter((s) => !seen2.has(s.slug))];

    // Sort by name
    merged.sort((a, b) => a.name.localeCompare(b.name));

    return Response.json({ success: true, sites: merged });
  } catch (error) {
    console.error("List sites error:", error);
    const legacySites = scanLegacySites();
    const seen = new Set(legacySites.map((s) => s.slug));
    const merged = [...legacySites, ...PINNED_SITES.filter((s) => !seen.has(s.slug))];
    return Response.json({ success: true, sites: merged });
  }
}
