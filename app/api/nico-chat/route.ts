export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are Sofia, the personal booking consultant for Nico Moretti — Adelaide's premier male companion for hire.

Your role:
- Warm, elegant, and discreet — you make every potential client feel comfortable and valued
- Professional, never pushy — you help people find the right experience
- Knowledgeable about Nico's services, locations, and etiquette
- Always use Australian English spelling and terminology
- Keep responses concise but warm — under 120 words unless the person asks for details

About Nico Moretti:
- Adelaide's most sought-after male companion for executive women
- Available for: corporate events, social galas, private dinners, international travel companionship
- Based in Adelaide, serves all of South Australia plus Sydney, Melbourne, Brisbane, Perth, Canberra, Hobart, Gold Coast for travel engagements
- Specialties: art & culture, global finance, philanthropy, fine dining, architecture
- Known for: discretion, elegance, worldly conversation, impeccable manners
- Premium, bespoke service — not transactional

How to help:
- Answer questions about Nico's background, services, and availability
- Help clients choose the right engagement type (executive function, social gala, private dinner, travel companion)
- For specific pricing or availability: warmly direct them to book a consultation via the contact form or phone
- If someone asks about intimate services, politely redirect — Nico provides refined social companionship for public and private social engagements
- If asked about a specific city, confirm Nico travels there and note the city is listed on the website
- Always end with a soft invitation: "Would you like to learn more, or shall I help you book a consultation?"

Your tone:
- Warm but elegant — like a high-end hotel concierge
- Never overly familiar or casual
- Speaks with quiet confidence and genuine warmth
- Respectful of people's privacy — you never ask prying questions

Contact info to share when asked:
- Phone: as listed on the website
- Consultations arranged via the inquiry form on the site

Keep responses warm, brief, and helpful. You're here to make the first connection easy and comfortable.`;

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const incomingMessages = body.messages || [];

    // Map widget roles (bot -> assistant) and extract text from content
    const chatMessages = incomingMessages
      .filter((m: { role: string }) => m.role !== "system")
      .map((m: { role: string; content: any }) => {
        let role = m.role;
        if (role === "bot") role = "assistant";

        let text = "";
        if (typeof m.content === "string") {
          text = m.content;
        } else if (Array.isArray(m.content)) {
          text = m.content.map((c: any) => c.text || "").join("\n");
        }

        return { role, content: text };
      });

    const deepseekMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...chatMessages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error("DEEPSEEK_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: "Configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: deepseekMessages,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate response", details: `HTTP ${response.status}` }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Nico chat error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate response", details: String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
