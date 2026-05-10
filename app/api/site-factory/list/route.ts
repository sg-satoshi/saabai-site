import { listSites } from "../../../../lib/site-registry";
import { readdirSync, existsSync } from "fs";
import path from "path";

export const runtime = "nodejs";

function scanLegacySites() {
  const clientsDir = path.join(process.cwd(), "public", "clients");
  if (!existsSync(clientsDir)) return [];

  const dirs = readdirSync(clientsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const slug = d.name;
      const nameMap: Record<string, string> = {
        nextinvestment: "Next Investment",
        "lmm-site": "Lifestyle Money Management",
      };
      return {
        id: `legacy_${slug}`,
        slug,
        name: nameMap[slug] || slug,
        niche: "professional-services",
        status: "live",
        url: `https://saabai-site.vercel.app/clients/${slug}/`,
        business: { name: nameMap[slug] || slug },
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
