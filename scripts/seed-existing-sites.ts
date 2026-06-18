import { createSite } from "../lib/site-registry";

async function seed() {
  // Next Investment
  await createSite({
    slug: "nextinvestment",
    name: "Next Investment",
    niche: "professional-services",
    status: "live",
    source: "factory",
    url: "https://saabai-site.vercel.app/clients/nextinvestment/",
    business: {
      name: "Next Investment",
      tagline: "Adelaide Buyer's Advocate",
      phone: "",
      email: "",
      address: "Suite 39/422 Pulteney Street, Adelaide SA 5000",
    },
    chatbot: {
      enabled: true,
      name: "Sophie",
      greeting: "Hi! I'm Sophie from Next Investment. How can I help you with your property journey today?",
      systemPrompt: "You are Sophie, a friendly and professional buyer's advocate at Next Investment in Adelaide. You help first home buyers and investors purchase wholesale residential property below market price. You focus on Adelaide and South Australian property market.",
    },
  });
  console.log("Registered: nextinvestment");

  // Lifestyle Money Management
  await createSite({
    slug: "lmm-site",
    name: "Lifestyle Money Management",
    niche: "professional-services",
    status: "live",
    source: "factory",
    url: "https://saabai-site.vercel.app/clients/lmm-site/",
    business: {
      name: "Lifestyle Money Management",
      tagline: "Property Wealth Strategy",
      phone: "",
      email: "",
      address: "Brisbane, Queensland",
    },
    chatbot: {
      enabled: true,
      name: "Zara",
      greeting: "Hi! I'm Zara from Lifestyle Money Management. How can I help you build wealth through property today?",
      systemPrompt: "You are Zara, a knowledgeable property wealth strategist at Lifestyle Money Management in Brisbane. You help Australians build long-term wealth through ethical, property-led strategy and financial analysis.",
    },
  });
  console.log("Registered: lmm-site");

  console.log("Done! Existing sites seeded.");
}

seed().catch(console.error);
