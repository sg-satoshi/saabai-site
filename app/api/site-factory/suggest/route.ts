import { NextRequest } from "next/server";
import { generateText } from "ai";
import { getDefaultModel } from "../../../../lib/chat-config";

export const runtime = "nodejs";
export const maxDuration = 30;

const SECTION_POOL: Record<string, string[]> = {
  trades: [
    "Add a FAQ section with 6 common questions customers ask",
    "Add a before & after photo gallery of completed jobs",
    "Add an emergency call-out pricing section",
    "Add a service area map with covered suburbs",
    "Add a quote request form with job type selector",
    "Add a financing/payment plans section",
    "Add a team section with staff photos and bios",
    "Add a seasonal promotion banner at the top",
    "Add a Google Maps embed to the contact section",
    "Add a warranty and guarantee badge section",
  ],
  "allied-health": [
    "Add a FAQ section about treatments and what to expect",
    "Add an online booking widget or calendar link",
    "Add a conditions we treat section with icons",
    "Add a health fund / rebate eligibility section",
    "Add a practitioner bio with qualifications",
    "Add a patient intake form link",
    "Add before & after or case study section",
    "Add a telehealth services section",
    "Add a pricing and packages table",
    "Add a health tips blog section",
  ],
  hospitality: [
    "Add a menu section with categories and pricing",
    "Add an online reservation / booking form",
    "Add a photo gallery of dishes and ambience",
    "Add a gift card or voucher section",
    "Add a private dining / events section",
    "Add a loyalty program or offers section",
    "Add opening hours with public holiday notes",
    "Add a chef or owner story section",
    "Add a catering enquiry form",
    "Add Instagram feed or food photos grid",
  ],
  retail: [
    "Add a featured products or bestsellers section",
    "Add a size guide or product FAQ",
    "Add a loyalty rewards program section",
    "Add customer unboxing photos or UGC gallery",
    "Add a returns and shipping policy section",
    "Add a gift card section",
    "Add a newsletter signup with a discount offer",
    "Add a wholesale / trade enquiry section",
    "Add a brand story or sustainability section",
    "Add a store locator or click & collect section",
  ],
  "professional-services": [
    "Add a FAQ section addressing common client concerns",
    "Add a case studies or results section",
    "Add a pricing transparency or packages table",
    "Add a free consultation booking form",
    "Add a team credentials and qualifications section",
    "Add a client logo wall or partner badges",
    "Add a resources or guides download section",
    "Add a LinkedIn or press coverage section",
    "Add a newsletter signup for industry insights",
    "Add a service comparison table",
  ],
};

const UNIVERSAL = [
  "Add a video background or explainer video to the hero",
  "Make the hero headline more compelling and benefit-focused",
  "Add a sticky 'Get a Quote' button that follows the user on mobile",
  "Add animated number counters to the stats section",
  "Add a chatbot widget for instant visitor questions",
  "Improve mobile layout — make buttons larger and text more readable",
  "Add a trust bar with logos of brands or certifications",
  "Add a referral or word-of-mouth incentive section",
  "Add social proof notifications (e.g. 'Jane from Brisbane just booked')",
  "Add a cookie consent banner",
];

export async function POST(req: NextRequest) {
  try {
    const { lastInstruction, siteName, niche, history } = await req.json();

    const pool = [...(SECTION_POOL[niche] || SECTION_POOL["professional-services"]), ...UNIVERSAL];
    const poolStr = pool.map((s, i) => `${i + 1}. ${s}`).join("\n");

    const recentStr = Array.isArray(history)
      ? history.slice(-4).filter((m: { role: string }) => m.role === "user").map((m: { content: string }) => `- ${m.content}`).join("\n")
      : "";

    const { text } = await generateText({
      model: getDefaultModel(),
      system: `You are a conversion-focused web design advisor for "${siteName}", a ${niche} business website.
Your job is to suggest the 3 best next improvements — short, punchy action phrases a non-technical user would type.
Return ONLY a JSON array of exactly 3 strings. No explanation, no markdown, no code fences.
Each string must be under 70 characters. Start each with an action verb.`,
      prompt: `The last instruction was: "${lastInstruction}"

Recent history:
${recentStr || "(none)"}

Choose the 3 most impactful suggestions from this pool (or create better ones if nothing fits):
${poolStr}

Return exactly: ["suggestion 1","suggestion 2","suggestion 3"]`,
    });

    let suggestions: string[] = [];
    try {
      const clean = text.trim().replace(/^```json?\n?/i, "").replace(/```\s*$/i, "").trim();
      suggestions = JSON.parse(clean);
      if (!Array.isArray(suggestions)) suggestions = [];
      suggestions = suggestions.slice(0, 3).filter(s => typeof s === "string");
    } catch {
      // fallback: pick 3 random from pool
      suggestions = pool.sort(() => Math.random() - 0.5).slice(0, 3);
    }

    return Response.json({ suggestions });
  } catch (e) {
    console.error("Suggest error:", e);
    return Response.json({ suggestions: [] });
  }
}
