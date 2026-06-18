/**
 * One-shot migration: registers all orphaned sites into the Redis site registry.
 * Run from terminal: node -r esbuild-register scripts/migrate-all-sites.ts
 * Or use tsx: npx tsx scripts/migrate-all-sites.ts
 */
import { createSite, getSiteBySlug } from "../lib/site-registry";

const SITES = [
  {
    slug: "heaven-thai-massage",
    name: "Heaven Thai Massage",
    niche: "allied-health",
    description:
      "Traditional Thai massage studio in Worongary, Gold Coast. Offering authentic Thai massage, remedial massage, and aromatherapy.",
    source: "factory" as const,
    url: "https://www.saabai.ai/sites/heaven-thai-massage/",
    business: {
      name: "Heaven Thai Massage",
      tagline: "Traditional Thai Massage · Worongary",
      phone: "0451 826 539",
      email: "hello@heaventhai.com.au",
      address: "Worongary, Gold Coast QLD 4213",
    },
    chatbot: {
      enabled: true,
      name: "Heaven Thai Assistant",
      greeting: "Welcome to Heaven Thai Massage! How can we help you today?",
      systemPrompt:
        "You are the Heaven Thai Massage assistant. Help visitors learn about traditional Thai massage services, pricing, and booking. Located in Worongary on the Gold Coast.",
    },
  },
  {
    slug: "lmm-site",
    name: "Lifestyle Money Management",
    niche: "finance",
    description: "Property Wealth Strategy in Brisbane.",
    source: "factory" as const,
    url: "https://www.saabai.ai/sites/lmm-site/",
    business: { name: "Lifestyle Money Management", tagline: "Property Wealth Strategy" },
    chatbot: {
      enabled: true,
      name: "Zara",
      greeting:
        "Hi! I'm Zara from Lifestyle Money Management. How can I help you build wealth through property today?",
      systemPrompt:
        "You are Zara, a knowledgeable property wealth strategist at Lifestyle Money Management in Brisbane.",
    },
  },
  {
    slug: "nextinvestment",
    name: "Next Investment",
    niche: "finance",
    description: "Adelaide Buyer's Advocate.",
    source: "factory" as const,
    url: "https://www.saabai.ai/sites/nextinvestment/",
    business: { name: "Next Investment", tagline: "Adelaide Buyer's Advocate" },
    chatbot: {
      enabled: true,
      name: "Sophie",
      greeting:
        "Hi! I'm Sophie from Next Investment. How can I help you with your property journey today?",
      systemPrompt:
        "You are Sophie, a friendly and professional buyer's advocate at Next Investment in Adelaide.",
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
      enabled: true,
      name: "Nico Moretti Assistant",
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
      enabled: true,
      name: "Tributum Assistant",
      greeting: "Hello! How can we help with your tax or trust matter?",
      systemPrompt: "You are the Tributum Law assistant. Help visitors with tax and trust law inquiries.",
    },
  },
];

async function main() {
  for (const s of SITES) {
    const existing = await getSiteBySlug(s.slug);
    if (existing && !existing.id.startsWith("legacy_")) {
      console.log(`⏭  ${s.name} (${s.slug}) — already registered`);
      continue;
    }
    const site = await createSite({ ...s, status: "live" });
    console.log(`✅ ${site.name} (${site.slug}) — registered`);
  }
  console.log("Done!");
}

main().catch(console.error);
