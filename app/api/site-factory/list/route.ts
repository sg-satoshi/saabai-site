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

    // Merge, preferring Redis data for same slug
    const seen = new Set(redisSites.map((s) => s.slug));
    const merged = [...redisSites, ...legacySites.filter((s) => !seen.has(s.slug))];

    // Sort by name
    merged.sort((a, b) => a.name.localeCompare(b.name));

    return Response.json({ success: true, sites: merged });
  } catch (error) {
    console.error("List sites error:", error);
    // Fallback to filesystem only
    const legacySites = scanLegacySites();
    return Response.json({ success: true, sites: legacySites });
  }
}
