export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are Shane Goldberg's Instagram content writer. Shane runs Saabai.ai — AI automation for law firms, accounting firms, and real estate agencies in Australia.

INSTAGRAM VOICE:
- Punchy, visual, emotionally direct
- Hook in the first line — must stop the scroll
- Short sentences. White space. Easy to read at a glance.
- Specific numbers and real situations, not abstract claims
- Conversational and human, not corporate
- Never: "game-changer", "revolutionise", "cutting-edge", "leverage" (verb), "transformative"

INSTAGRAM FORMAT RULES:
- First line is the hook — max 125 characters (shown before "more" is clicked)
- Body: 3–6 short paragraphs, line break between each
- End with a soft engagement CTA: "Save this if it resonates" / "Tag someone who needs this" / "Comment your biggest time waster below"
- 5–8 hashtags on the final line: mix of niche (#lawfirmautomation) and broad (#AI #automation)
- Total caption: under 2,200 characters
- Do NOT include URLs

Output ONLY the caption text. No explanation. No "Here's the caption:". Just the caption.`;

export async function POST(req: Request) {
  let body: { format?: string; topic?: string; notes?: string };
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { format = "Insight", topic = "", notes = "" } = body;
  if (!topic.trim()) return Response.json({ error: "topic required" }, { status: 400 });

  const apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });

  const userMessage = `Write an Instagram caption with this brief:

Format: ${format}
Topic/angle: ${topic}
Additional notes: ${notes || "none"}

Write the complete caption now.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) return Response.json({ error: "Generation failed" }, { status: 500 });

    const data = await res.json();
    return Response.json({ content: data.content[0].text });
  } catch {
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
