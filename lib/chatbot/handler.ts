import { NextRequest } from "next/server";
import { generateText } from "ai";
import { DEFAULT_MODEL_FALLBACK, getDefaultModel, modelFromSpec, parseModelSpec } from "../chat-config";
import { getSiteBySlug } from "../site-registry";
import { SLUG_RE, allowedHosts, callerHost, cleanMessages, hostAllowed, logOriginMiss, mappedHostsFor, originMode, slugLimited } from "../chat-origin";
import { effectiveGoal, offMessage, promptAdditions } from "./core";
import { effectiveEngage, engagePrompt, parseReview } from "./engage";
import { goalPrompt, parseReply, resolveButtons } from "./goal";
import { DISCLOSURE_ONCE_RULE, NOT_SURE_RULE } from "./disclosure";
import { isNotSureReply } from "./events";
import { buildSystemPrompt, domainsForBot, getPersona, type BotPersona } from "./personas";
import { NO_DASH_RULE, noDashes } from "../no-dashes";
import { fallbackSessionId, getConfig, isEnabled, recordChatEvent, recordTokens, recordUsage } from "./store";
import { lastUserText, logChatTurn, modelIdFrom } from "../chat-log";

export function cors(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin && origin !== "null" ? origin : "*",
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

/** Origin allow-list. "off" is the only mode that lets a foreign host through. "log" still blocks, and records the miss. */
export async function originDecision(req: NextRequest, slug: string, siteDomains: string[] | undefined): Promise<"ok" | "block"> {
  const mode = originMode();
  if (mode === "off") return "ok";
  const host = callerHost(req.headers.get("origin"), req.headers.get("referer"));
  if (hostAllowed(host, allowedHosts(siteDomains, await mappedHostsFor(slug), process.env.NODE_ENV !== "production"))) return "ok";
  await logOriginMiss(slug, host);
  return "block";
}

export function optionsResponse(req: NextRequest) {
  return new Response(null, { status: 204, headers: cors(req.headers.get("origin")) });
}

const say = (content: string, status: number, h: Record<string, string>, extra: Record<string, unknown> = {}) =>
  Response.json({ content, text: content, error: status >= 400 ? content : undefined, ...extra }, { status, headers: h });

const clientIp = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";

/** Model string stored on the message. The provider prefix is how we record which provider answered. */
export function loggedModel(provider: string, model: unknown): string {
  const id = modelIdFrom(model);
  const p = provider.trim().toLowerCase();
  if (!p || id === "unknown") return id;
  if (id.toLowerCase().startsWith(`${p}:`)) return id;
  return `${p}:${id}`;
}

/** How long the persona's own model may take before the fallback model is used. */
export const PERSONA_PRIMARY_TIMEOUT_MS = 12_000;

/**
 * Persona model first, when one is set in code. An error or a hang uses that persona's
 * fallbackModel, or the platform default when the persona has none.
 * Other bots have no persona model, so they never call DeepSeek.
 */
async function generateReply(system: string, messages: { role: "user" | "assistant"; content: string }[], persona?: BotPersona) {
  const primary = persona?.model?.trim();
  if (primary) {
    try {
      const model = modelFromSpec(primary, `persona:${persona?.slug ?? "bot"}`, primary);
      const result = await generateText({
        model,
        system,
        messages,
        maxOutputTokens: 600,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(PERSONA_PRIMARY_TIMEOUT_MS),
      });
      return { result, model, provider: parseModelSpec(primary, primary).provider };
    } catch (err) {
      console.error("persona model failed, using fallback:", err instanceof Error ? err.message : err);
    }
  }
  const pinned = persona?.fallbackModel?.trim();
  const model = pinned ? modelFromSpec(pinned, `persona-fallback:${persona?.slug ?? "bot"}`, pinned) : getDefaultModel();
  const provider = pinned
    ? parseModelSpec(pinned, pinned).provider
    : parseModelSpec(process.env.DEFAULT_CHAT_MODEL, DEFAULT_MODEL_FALLBACK).provider;
  const result = await generateText({ model, system, messages, maxOutputTokens: 600 });
  return { result, model, provider };
}

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

    if ((await originDecision(req, slug, domainsForBot(slug, site.domains))) === "block") return say("Chat is not available from this website.", 403, h);

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
    const usage = await recordUsage(slug, config.plan, sid); // log-only caps
    if (usage.isNewConversation) await recordChatEvent(slug, "conversation_started");

    let system: string;
    const persona = getPersona(slug);
    if (persona) {
      // The persona file is the prompt. A stored copy cannot keep speaking old wording.
      system = buildSystemPrompt(persona);
    } else if (site.chatbot?.systemPrompt) {
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
    if (!system.includes(DISCLOSURE_ONCE_RULE)) system = `${system}\n\n${DISCLOSURE_ONCE_RULE}`;
    if (!system.toLowerCase().includes("not sure")) system = `${system}\n\n${NOT_SURE_RULE}`;
    // House rule for every Saabai chatbot: no em or en dashes.
    system = `${system}\n\n${NO_DASH_RULE}`;
    // Goal-first settings go last and say they never override the rules above. Empty when no goal is set.
    const goal = effectiveGoal(slug, config.goal);
    const gp = goalPrompt(goal);
    if (gp) system = `${system}\n\n${gp}`;
    const engage = effectiveEngage(config.engage);
    const ep = config.engage ? engagePrompt(engage, config.knowledge?.faqs.length ?? 0) : "";
    if (ep) system = `${system}\n\n${ep}`;

    const { result, model, provider } = await generateReply(system, chatMessages, persona);
    const u = result.usage as { inputTokens?: number; outputTokens?: number } | undefined;
    await recordTokens(slug, u?.inputTokens ?? 0, u?.outputTokens ?? 0);
    const parsed = parseReply(noDashes(result.text), goal);
    const rv = parseReview(parsed.content, engage);
    const text = rv.content;
    logChatTurn({
      bot: slug,
      siteId: slug,
      conversationId: sid,
      model: loggedModel(provider, model),
      usage: result.totalUsage ?? result.usage,
      userText: lastUserText(chatMessages),
      assistantText: text,
    });
    if (isNotSureReply(text)) await recordChatEvent(slug, "not_sure");
    if (rv.review) await recordChatEvent(slug, "review_shown");
    const review = rv.review ? { url: engage.reviews.url } : undefined;
    if (!gp) return Response.json({ content: text, ...(review ? { review } : {}) }, { headers: h });
    const buttons = resolveButtons(goal);
    const button = parsed.button === "cta" ? buttons.cta : parsed.button === "fallback" ? buttons.fallback : null;
    if (button) await recordChatEvent(slug, "cta_shown");
    return Response.json({ content: text, quickReplies: parsed.quickReplies, cta: button ? { ...button, kind: parsed.button } : null, ...(review ? { review } : {}) }, { headers: h });
  } catch (e) {
    console.error("chat handler error:", e);
    return say("Failed to respond", 500, h);
  }
}
