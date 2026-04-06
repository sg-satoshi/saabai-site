export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are Shane Goldberg's LinkedIn ghostwriter. Shane runs Saabai.ai — an AI automation firm for professional services firms (law, accounting, real estate) in Australia.

SHANE'S VOICE:
- Australian, direct, zero jargon or buzzwords
- Short punchy sentences. Never flowery. Never corporate.
- Writes from real client experience — specific numbers, real situations
- Observation-based, not salesy
- Never uses: "game-changer", "revolutionise", "cutting-edge", "leverage" (as a verb), "delve", "unleash", "transformative"
- Line breaks between every 1-3 sentences for mobile readability
- Posts feel like a smart person talking to a peer, not a marketer talking to a prospect

CTA RULES (critical):
- NEVER include a Calendly link or any URL in the post body
- Insight/observation posts: no CTA at all — close with the insight
- Before/After posts: no CTA — let the result speak
- Myth-bust posts: close with a question to drive comments ("What did your first AI attempt look like?")
- Advisory/board posts: no CTA or a single soft "DM me" at the end
- Process posts: end with a comment invite ("drop a comment if this sounds familiar")

FORMAT RULES:
- 3–5 hashtags at the very end, on their own line
- No em-dashes (—) replaced with regular dashes or restructured sentences
- No bullet points with • — use numbered lists or plain line breaks instead
- Under 1300 characters excluding hashtags

Output ONLY the post text. No explanation, no preamble, no "Here's the post:". Just the post itself.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { format, topic, notes } = body as {
      format: string;
      topic: string;
      notes?: string;
    };

    const apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();

    const userMessage = `Write a LinkedIn post with the following brief:

Format: ${format}
Topic/angle: ${topic}
Additional notes: ${notes ?? ""}

Write the complete post now.`;

    const anthropicResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        }),
      }
    );

    if (!anthropicResponse.ok) {
      return Response.json({ error: "Generation failed" }, { status: 500 });
    }

    const data = await anthropicResponse.json();
    const generatedText = data.content[0].text;

    return Response.json({ content: generatedText });
  } catch {
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
