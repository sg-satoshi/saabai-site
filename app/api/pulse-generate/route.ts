import { streamText } from "ai";
import { getDefaultModel } from "../../../lib/chat-config";
import { requireAdminSession } from "../../../lib/admin-guard";
import { cleanBrief, PULSE_SECTIONS, type PulseBrief, type PulseSection } from "../../../lib/pulse/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SECTION_SPEC: Record<PulseSection, string> = {
  Headlines: "5 headlines, numbered 1 to 5. Vary the hook: benefit, question, number, urgency, curiosity. Keep each within the strictest character limit given.",
  "Primary Text": "Three numbered lines: 1. Short: (under 90 characters) 2. Medium: (2-3 sentences, under 125 characters if Meta is a platform) 3. Long: (4-5 sentences). Start each with the label.",
  "Call to Action": "5 CTA button labels, numbered 1 to 5, under 20 characters each, ranked by expected CTR.",
  "Creative Concepts": "3 concepts, numbered 1 to 3. Each line: **Name**: format, the visual, and one sentence on why it converts.",
  "Audience & Targeting": "One bullet list per platform: core demographic, interests and behaviours, custom audience ideas. Prefix each bullet with the platform name.",
  "Competitor Positioning": "Bullets: 3 differentiators to lead with, 1-2 areas not to attack, and what to avoid. Only if a competitor was given.",
};

const SYSTEM = `You are Pulse, Saabai's internal campaign strategist. Turn a brief into ready-to-run ad creative for Australian businesses.
Write in Australian English. Specific and punchy, like a senior copywriter. No filler, no emoji, no em dashes.
Use "## " headings with these exact section names, in order, and nothing else outside them.`;

function prompt(b: PulseBrief, only?: PulseSection): string {
  const sections = (only ? [only] : PULSE_SECTIONS.filter((s) => s !== "Competitor Positioning" || b.competitor)).map(
    (s) => `## ${s}\n${SECTION_SPEC[s]}`,
  );
  return [
    `Product / service: ${b.product}`,
    `Audience: ${b.audience}`,
    `Goal: ${b.goal}`,
    b.message && `Key message: ${b.message}`,
    `Tone: ${b.tone}`,
    `Platforms: ${b.platforms.join(", ")} (limits: Google headline 30, Meta headline 40, Meta primary text 125, CTA 20)`,
    b.budget && `Budget: ${b.budget}`,
    b.competitor && `Competitor: ${b.competitor}`,
    "",
    "Write these sections:",
    ...sections,
  ].filter(Boolean).join("\n");
}

export async function POST(req: Request) {
  if (!(await requireAdminSession())) return Response.json({ error: "Your session expired. Sign in again." }, { status: 401 });
  let body: { brief?: unknown; section?: unknown };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  const brief = cleanBrief(body.brief);
  if (!brief) return Response.json({ error: "Product, audience and goal are required" }, { status: 400 });
  const section = PULSE_SECTIONS.find((s) => s === body.section);
  try {
    const result = streamText({
      model: getDefaultModel(), // cheaper default model; ad copy doesn't need the premium tier
      system: SYSTEM,
      prompt: prompt(brief, section),
      maxOutputTokens: section ? 700 : 2400,
    });
    return new Response(result.textStream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[pulse-generate]", err);
    return Response.json({ error: "Generation failed. Try again." }, { status: 500 });
  }
}
