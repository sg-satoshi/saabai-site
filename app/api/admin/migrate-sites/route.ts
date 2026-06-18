/**
 * POST /api/admin/migrate-sites
 * One-shot: registers all orphaned sites into the Redis site registry.
 * Only works once — skips already-registered sites.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "../../../../lib/auth";
import { createSite, getSiteBySlug } from "../../../../lib/site-registry";

export const runtime = "nodejs";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

const SITES = [
  {
    slug: "heaven-thai-massage",
    name: "Heaven Thai Massage",
    niche: "allied-health",
    description: "Traditional Thai massage studio in Worongary, Gold Coast.",
    source: "factory" as const,
    url: "https://www.saabai.ai/sites/heaven-thai-massage/",
    business: { name: "Heaven Thai Massage" },
    chatbot: {
      enabled: true,
      name: "Heaven Thai Assistant",
      greeting: "Welcome to Heaven Thai Massage! How can we help you today?",
      systemPrompt: "You are the Heaven Thai Massage assistant. Help visitors learn about services, pricing, and booking. Located in Worongary on the Gold Coast.",
    },
  },
  {
    slug: "lmm-site",
    name: "Lifestyle Money Management",
    niche: "finance",
    description: "Property Wealth Strategy in Brisbane.",
    source: "factory" as const,
    url: "https://www.saabai.ai/sites/lmm-site/",
    business: { name: "Lifestyle Money Management" },
    chatbot: {
      enabled: true, name: "Zara",
      greeting: "Hi! I'm Zara from Lifestyle Money Management. How can I help you build wealth through property today?",
      systemPrompt: "You are Zara, a knowledgeable property wealth strategist at Lifestyle Money Management in Brisbane.",
    },
  },
  {
    slug: "nextinvestment",
    name: "Next Investment",
    niche: "finance",
    description: "Adelaide Buyer's Advocate.",
    source: "factory" as const,
    url: "https://www.saabai.ai/sites/nextinvestment/",
    business: { name: "Next Investment" },
    chatbot: {
      enabled: true, name: "Sophie",
      greeting: "Hi! I'm Sophie from Next Investment. How can I help you with your property journey today?",
      systemPrompt: "You are Sophie, a friendly and professional buyer's advocate at Next Investment in Adelaide.",
    },
  },
  {
    slug: "nico-moretti",
    name: "Nico Moretti",
    niche: "professional-services",
    description: "Bespoke companionship for discerning executive women.",
    source: "factory" as const,
    url: "https://www.saabai.ai/sites/nico-moretti/",
    business: { name: "Nico Moretti" },
    chatbot: {
      enabled: true, name: "Nico Moretti Assistant",
      greeting: "Welcome to Nico Moretti. How may I assist you?",
      systemPrompt: "You are the Nico Moretti assistant. Help discerning clientele with inquiries.",
    },
  },
  {
    slug: "Tributum Law",
    name: "Tributum Law",
    niche: "legal",
    source: "factory" as const,
    url: "https://www.saabai.ai/sites/Tributum%20Law/",
    business: { name: "Tributum Law" },
    chatbot: {
      enabled: true, name: "Tributum Assistant",
      greeting: "Hello! How can we help with your tax or trust matter?",
      systemPrompt: "You are the Tributum Law assistant. Help visitors with tax and trust law inquiries.",
    },
  },
];

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session || session.clientId !== ADMIN_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results: Array<{ slug: string; name: string; status: string }> = [];
  for (const s of SITES) {
    const existing = await getSiteBySlug(s.slug);
    if (existing && !existing.id.startsWith("legacy_")) {
      results.push({ slug: s.slug, name: s.name, status: "already registered" });
      continue;
    }
    await createSite({ ...s, status: "live" });
    results.push({ slug: s.slug, name: s.name, status: "registered" });
  }

  return NextResponse.json({ success: true, results });
}
