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
};

function scanLegacySites() {
  const clientsDir = path.join(process.cwd(), "public", "clients");
  if (!existsSync(clientsDir)) return [];

  const dirs = readdirSync(clientsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const slug = d.name;
      const meta = LEGACY_META[slug] ?? { name: slug, niche: "professional-services" };
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
    });

  return dirs;
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
