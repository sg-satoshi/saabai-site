import { NextRequest } from "next/server";
import { generateText } from "ai";
import { getDefaultModel } from "../chat-config";
import { getSiteBySlug } from "../site-registry";
import { SLUG_RE, allowedHosts, callerHost, cleanMessages, hostAllowed, logOriginMiss, mappedHostsFor, originMode, slugLimited } from "../chat-origin";
import { offMessage, promptAdditions } from "./core";
import { fallbackSessionId, getConfig, isEnabled, recordTokens, recordUsage } from "./store";

export function cors(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin && origin !== "null" ? origin : "*",
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

/** Origin allow-list decision. "block" only in enforce mode; log mode records the miss and lets it through. */
export async function originDecision(req: NextRequest, slug: string, siteDomains: string[] | undefined): Promise<"ok" | "miss" | "block"> {
  const mode = originMode();
  if (mode === "off") return "ok";
  const host = callerHost(req.headers.get("origin"), req.headers.get("referer"));
  if (hostAllowed(host, allowedHosts(siteDomains, await mappedHostsFor(slug), process.env.NODE_ENV !== "production"))) return "ok";
  await logOriginMiss(slug, host);
  return mode === "enforce" ? "block" : "miss";
}

export function optionsResponse(req: NextRequest) {
  return new Response(null, { status: 204, headers: cors(req.headers.get("origin")) });
}

const say = (content: string, status: number, h: Record<string, string>, extra: Record<string, unknown> = {}) =>
  Response.json({ content, text: content, error: status >= 400 ? content : undefined, ...extra }, { status, headers: h });

const clientIp = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";

/**
 * The one chat handler for platform bots. Order matters:
 * slug and site, origin, ON/OFF (no model call and no usage when off), per-site limits,
 * message cleaning, usage and conversation count (log-only caps), then the model.
 */
export async function handleChat(req: NextRequest): Promise<Response> {
  const origin = req.headers.get("origin");
  const h = cors(origin);
  try {
    const body = await req.json().catch(() => ({}));
    const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
    if (!slug || !SLUG_RE.test(slug)) return say("slug required", 400, h);

    const site = await getSiteBySlug(slug);
    if (!site) return say("Chat is not available for this site.", 404, h);

    if ((await originDecision(req, slug, site.domains)) === "block") return say("Chat is not available from this website.", 403, h);

    // OFF: polite message, status 200 so every widget shows it as a normal reply. No model call, nothing counted.
    if (!(await isEnabled(slug, site.chatbot?.enabled))) {
      return say(offMessage(site.business), 200, { ...h, "Cache-Control": "no-store" }, { chatbotOff: true });
    }

    const limited = await slugLimited(slug);
    if (limited) {
      return say("This chat is very busy right now. Please try again shortly, or contact the team directly.", 429, { ...h, "Retry-After": limited === "minute" ? "60" : "3600" });
    }

    const chatMessages = cleanMessages(body?.messages);
    if (!chatMessages.length) return say("Please type a message.", 400, h);

    const config = await getConfig(slug);
    const sid =
      typeof body?.sessionId === "string" && /^[\w-]{8,64}$/.test(body.sessionId)
        ? `s:${body.sessionId}`
        : fallbackSessionId(clientIp(req), req.headers.get("user-agent") || "");
    await recordUsage(slug, config.plan, sid); // log-only caps

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

    const extra = promptAdditions(config);
    if (extra) system = `${system}\n\n${extra}`;

    const result = await generateText({ model: getDefaultModel(), system, messages: chatMessages, maxOutputTokens: 600 });
    const u = result.usage as { inputTokens?: number; outputTokens?: number } | undefined;
    await recordTokens(slug, u?.inputTokens ?? 0, u?.outputTokens ?? 0);
    return Response.json({ content: result.text }, { headers: h });
  } catch (e) {
    console.error("chat handler error:", e);
    return say("Failed to respond", 500, h);
  }
}
