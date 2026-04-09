import { streamText } from "ai";
import { getPremiumModel } from "../../../lib/chat-config";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Pulse, a world-class campaign strategist and creative director powered by Saabai AI.
Your role: turn a campaign brief into ready-to-use ad creative that converts.

Output exactly these sections in order (use ## for each section header):

## Headlines
5 headline variations. Numbered 1 through 5. Vary the hook approach — benefit, question, number, urgency, curiosity. Keep under 40 characters for Meta; under 30 for Google.

## Primary Text

**SHORT** (1-2 sentences, under 90 chars — for Stories, Reels, TikTok)
[write copy here]

**MEDIUM** (2-3 sentences — for Feed posts)
[write copy here]

**LONG** (4-5 sentences — for LinkedIn, detailed Google ads)
[write copy here]

## Call to Action
5 CTA button options ranked by expected CTR. Numbered 1 through 5. One per line.

## Creative Concepts
Three visual or video creative concepts. For each, use exactly this structure:

**Concept 1 — [Name]**
Format: [image/video/carousel/story]
Visual: [specific visual description — colours, composition, subject, mood]
Why it converts: [brief conversion psychology reason — one sentence]

**Concept 2 — [Name]**
Format: [image/video/carousel/story]
Visual: [specific visual description]
Why it converts: [brief conversion psychology reason]

**Concept 3 — [Name]**
Format: [image/video/carousel/story]
Visual: [specific visual description]
Why it converts: [brief conversion psychology reason]

## Audience & Targeting
For each platform in the brief, a targeting block:
- Core demographic (age range, gender if relevant, location)
- Interest and behaviour categories
- Custom audience opportunities (retargeting pools, lookalike sources)

## Competitor Positioning
(Include this section only if a competitor was specified in the brief.)
**Lead with:** 3 specific differentiators to own in your messaging
**Don't attack:** 1-2 areas where the competitor is genuinely strong — attacking looks defensive
**Avoid:** messaging that sounds like a concession or imitation of their positioning

Rules: Be specific and punchy. Sound like a senior creative director at a top agency, not an AI. No filler. Every headline and copy line should be something a real copywriter would be proud of.`;

type Brief = {
  product: string;
  audience: string;
  goal: string;
  message: string;
  tone: string;
  platforms: string[];
  budget: string;
  competitor: string;
};

function buildPrompt(brief: Brief): string {
  const parts = [
    `Product / Service: ${brief.product}`,
    `Target Audience: ${brief.audience}`,
    `Campaign Goal: ${brief.goal}`,
    `Key Message / USP: ${brief.message}`,
    `Tone: ${brief.tone}`,
    `Platforms: ${brief.platforms.join(", ")}`,
  ];
  if (brief.budget?.trim()) parts.push(`Budget: ${brief.budget}`);
  if (brief.competitor?.trim()) parts.push(`Competitor: ${brief.competitor}`);
  return parts.join("\n");
}

export async function POST(req: Request) {
  try {
    const brief: Brief = await req.json();

    if (!brief.product?.trim() || !brief.audience?.trim() || !brief.goal?.trim()) {
      return Response.json({ error: "Missing required brief fields" }, { status: 400 });
    }

    const result = streamText({
      model: getPremiumModel(),
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(brief),
      maxOutputTokens: 2400,
    });

    return new Response(result.textStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
