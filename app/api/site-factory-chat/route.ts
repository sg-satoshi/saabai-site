import { NextRequest } from "next/server";
import { generateText } from "ai";
import { getDefaultModel } from "../../../lib/chat-config";
import { getSiteBySlug } from "../../../lib/site-registry";
import {
  SLUG_RE,
  allowedHosts,
  callerHost,
  cleanMessages,
  hostAllowed,
  logOriginMiss,
  mappedHostsFor,
  originMode,
  slugLimited,
} from "../../../lib/chat-origin";

export const runtime = "nodejs";
export const maxDuration = 30;

function cors(origin: string | null): Record<string, string> {
  // Reflect only a real origin; the allow-list decision is made in POST.
  return {
    "Access-Control-Allow-Origin": origin && origin !== "null" ? origin : "*",
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: cors(req.headers.get("origin")) });
}

const say = (content: string, status: number, h: Record<string, string>) =>
  Response.json({ content, text: content, error: content }, { status, headers: h });

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const h = cors(origin);
  try {
    const body = await req.json().catch(() => ({}));
    const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
    if (!slug || !SLUG_RE.test(slug)) return say("slug required", 400, h);

    // The slug alone is public, so the site must exist. The bot's prompt always comes from
    // the stored site config, never from the request.
    const site = await getSiteBySlug(slug);
    if (!site) return say("Chat is not available for this site.", 404, h);

    const mode = originMode();
    if (mode !== "off") {
      const host = callerHost(origin, req.headers.get("referer"));
      const ok = hostAllowed(host, allowedHosts(site.domains, await mappedHostsFor(slug), process.env.NODE_ENV !== "production"));
      if (!ok) {
        await logOriginMiss(slug, host);
        if (mode === "enforce") return say("Chat is not available from this website.", 403, h);
      }
    }

    const limited = await slugLimited(slug);
    if (limited) {
      return say(
        "This chat is very busy right now. Please try again shortly, or contact the team directly.",
        429,
        { ...h, "Retry-After": limited === "minute" ? "60" : "3600" }
      );
    }

    const chatMessages = cleanMessages(body?.messages);
    if (!chatMessages.length) return say("Please type a message.", 400, h);

    let system: string;
    if (site.chatbot?.systemPrompt) {
      system = site.chatbot.systemPrompt;
    } else {
      const name = site.business?.name || site.name || slug;
      const niche = site.niche || "business";
      const location = site.business?.address || "Australia";
      const phone = site.business?.phone || "";
      const email = site.business?.email || "";
      system = `You are a helpful assistant for ${name}, a ${niche} business${location ? ` in ${location}` : ""}.
Be warm, friendly and concise. Answer questions about the business and its services.
${phone ? `Phone: ${phone}` : ""}${email ? ` Email: ${email}` : ""}
Keep responses under 120 words. End with a helpful next step when relevant.`;
    }

    const { text } = await generateText({
      model: getDefaultModel(),
      system,
      messages: chatMessages,
      maxOutputTokens: 600,
    });

    return Response.json({ content: text }, { headers: h });
  } catch (e) {
    console.error("site-factory-chat error:", e);
    return say("Failed to respond", 500, h);
  }
}
