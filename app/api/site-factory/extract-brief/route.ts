import { NextRequest } from "next/server";
import { generateText } from "ai";
import { getPremiumModel } from "../../../../lib/chat-config";

export const runtime = "nodejs";
export const maxDuration = 30;

const VALID_NICHES = [
  "trades", "allied-health", "professional-services",
  "legal", "finance", "retail", "hospitality", "other",
];

async function fetchSiteText(url: string): Promise<string> {
  try {
    if (!url.startsWith("http://") && !url.startsWith("https://")) return "";
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SaabAI/1.0; +https://saabai.ai)" },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  const { brief = "", url = "" } = await req.json();

  if (!brief && !url) {
    return Response.json({ error: "brief or url required" }, { status: 400 });
  }

  let siteText = "";
  if (url) siteText = await fetchSiteText(url);

  const prompt = [
    "Extract structured business information for a website builder.",
    "Return ONLY a valid JSON object — no markdown, no code fences, no explanation.",
    "",
    siteText ? `WEBSITE CONTENT (from ${url}):\n${siteText}\n` : "",
    brief ? `CLIENT BRIEF:\n${brief}\n` : "",
    "",
    "Return exactly this JSON structure (null for any field you cannot determine):",
    `{`,
    `  "businessName": string | null,`,
    `  "niche": "trades" | "allied-health" | "professional-services" | "legal" | "finance" | "retail" | "hospitality" | "other" | null,`,
    `  "location": string | null,`,
    `  "phone": string | null,`,
    `  "email": string | null,`,
    `  "address": string | null,`,
    `  "services": string | null,`,
    `  "description": string | null`,
    `}`,
    "",
    "Niche mapping: legal firms → legal. Doctors/physios/massage/chiro/dental → allied-health. Plumbers/electricians/builders/landscapers → trades. Accountants/consultants/solicitors/advisors → professional-services. Restaurants/cafes/bars/catering → hospitality. Financial planners/mortgage brokers/insurance → finance. Retail/ecommerce/boutiques → retail.",
    "For services: a comma-separated list of the business's main service offerings (5-8 items).",
    "For description: 2-3 sentences capturing tone, target audience, and unique value proposition — written to guide AI website copy generation. Do not use em dashes.",
    "For location: format as 'City, STATE' e.g. 'Sydney, NSW'. Extract from address or context.",
  ].filter(Boolean).join("\n");

  try {
    const { text } = await generateText({
      model: getPremiumModel(),
      messages: [{ role: "user", content: prompt }],
    });

    const cleaned = text
      .trim()
      .replace(/^```json\n?/i, "")
      .replace(/^```\n?/, "")
      .replace(/```\s*$/i, "")
      .trim();

    const data = JSON.parse(cleaned);

    // Sanitise niche
    if (data.niche && !VALID_NICHES.includes(data.niche)) data.niche = null;
    // Strip nulls so client can check field presence simply
    for (const key of Object.keys(data)) {
      if (data[key] === null || data[key] === undefined || data[key] === "") delete data[key];
    }

    return Response.json(data);
  } catch (e) {
    console.error("extract-brief error:", e);
    return Response.json({ error: "Extraction failed" }, { status: 500 });
  }
}
