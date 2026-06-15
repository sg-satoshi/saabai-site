import { NextRequest } from "next/server";
import { put, list } from "@vercel/blob";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { createSite, getSiteBySlug } from "../../../../lib/site-registry";

export const runtime = "nodejs";

const LEGACY_META: Record<string, { name: string; niche: string; description?: string }> = {
  nextinvestment: { name: "Next Investment", niche: "finance" },
  "lmm-site":     { name: "Lifestyle Money Management", niche: "finance" },
  "nico-moretti": { name: "Nico Moretti", niche: "professional-services", description: "Bespoke companionship for discerning executive women." },
};

export async function POST(req: NextRequest) {
  const { slug } = await req.json();
  if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

  // If already a proper Redis site, return it
  const existing = await getSiteBySlug(slug);
  if (existing && !existing.id.startsWith("legacy_")) {
    return Response.json({ success: true, site: existing, alreadyMigrated: true });
  }

  // Read HTML from filesystem
  const htmlPath = path.join(process.cwd(), "public", "clients", slug, "index.html");
  if (!existsSync(htmlPath)) {
    return Response.json({ error: "Legacy site file not found" }, { status: 404 });
  }

  const html = readFileSync(htmlPath, "utf-8");

  // Upload to Blob if not already there
  const { blobs } = await list({ prefix: `sites/${slug}/index.html` });
  if (!blobs.length) {
    await put(`sites/${slug}/index.html`, html, { access: "public", contentType: "text/html" });
  }

  // Register in Redis
  const meta = LEGACY_META[slug] ?? { name: slug, niche: "professional-services" };
  const site = await createSite({
    slug,
    name: meta.name,
    niche: meta.niche,
    description: meta.description,
    status: "live",
    url: `https://www.saabai.ai/sites/${slug}/`,
    business: { name: meta.name },
    chatbot: {
      enabled: true,
      name: `${meta.name} Assistant`,
      greeting: "Hi! How can I help you today?",
      systemPrompt: `You are a helpful assistant for ${meta.name}.`,
    },
  });

  return Response.json({ success: true, site });
}
