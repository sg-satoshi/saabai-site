/**
 * POST /api/lex-help: the in-app Lex help assistant. Signed-in Lex users only (proxy session check
 * plus resolveReviewActor). Rate limits and size caps: the shared chat guard (CHAT_API in lib/chat-guard).
 *
 *   {messages, conversationId}  -> {reply, offer?, offerId?}
 *   {confirmOffer: offerId}     -> files the offered item into the feedback inbox (source "assistant")
 *
 * Guard (lib/lex-help-flow): price questions get a fixed line; a keyword pre-filter and a model classifier on the
 * question (allow-list PRODUCT, fail closed) and on the draft answer (PRODUCT_OK) decline everything else.
 * Per-firm daily cap HELP_DAILY_CAP. Only the user's own questions are sent
 * (client-supplied assistant turns are dropped). The model call goes through LexGateway (masking, fail closed).
 * Logged like Lex chats: logChatTurn with the MASKED text, same 90-day chat-log purge.
 * Offers are kept server-side for 15 minutes, bound to the user, and filed only on confirm.
 */
import { randomBytes } from "node:crypto";
import { resolveReviewActor } from "@/lib/lex-review-access";
import { LexGateway, threadSeed } from "@/lib/lex-privacy/gateway";
import { LexPrivacyError, PRIVACY_SYSTEM_NOTE, privacyFailResponse } from "@/lib/lex-privacy/mask";
import { logChatTurn } from "@/lib/chat-log";
import { getRedis } from "@/lib/redis";
import { alertFeedback, appVersion, saveFeedback, validateFeedback } from "@/lib/lex-feedback";
import { lexAlert } from "@/lib/lex-subscription-emails";
import { cleanRoute, retrieveHelp } from "@/lib/lex-help-knowledge";
import { helpContextText, helpFirmContext } from "@/lib/lex-help-context";
import { HELP_LABEL, helpSystemPrompt, isLegalQuestion, latestQuestion, normaliseHelpMessages, type HelpOffer } from "@/lib/lex-help";
import { HELP_CAP_REPLY, HELP_DAILY_CAP, HELP_DECLINE, helpDayKey, runHelp } from "@/lib/lex-help-flow";
import { PRICE_ANSWER, isPriceQuestion } from "@/lib/lex-help-knowledge";

export const runtime = "nodejs";
export const maxDuration = 30;
const OFFER_TTL = 15 * 60;

/** GET: signed-in check for mounting the panel, plus the caller's own firm context. 401 when signed out. */
export async function GET(req: Request) {
  const actor = await resolveReviewActor(req);
  if (!actor) return Response.json({ error: "Sign in to use help" }, { status: 401 });
  return Response.json({ ok: true, context: await helpFirmContext(actor).catch(() => null) });
}

export async function POST(req: Request) {
  const actor = await resolveReviewActor(req);
  if (!actor) return Response.json({ error: "Sign in to use help" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { messages?: unknown; conversationId?: unknown; confirmOffer?: unknown; page?: unknown } | null;
  const firm = actor.kind === "firm" ? actor.firm : "saabai-staff";
  const user = actor.kind === "firm" ? actor.email : `admin:${actor.id}`;
  const redis = getRedis();

  if (typeof body?.confirmOffer === "string") {
    if (!redis || !/^[a-f0-9]{24}$/.test(body.confirmOffer)) return Response.json({ error: "That offer has expired" }, { status: 400 });
    const key = `lex:help:offer:${body.confirmOffer}`;
    const raw = await redis.get(key);
    const o = (typeof raw === "string" ? JSON.parse(raw) : raw) as (HelpOffer & { user: string }) | null;
    if (!o || o.user !== user) return Response.json({ error: "That offer has expired" }, { status: 400 });
    await redis.del(key);
    const v = validateFeedback({ type: o.type, message: o.summary, page: body.page });
    if (!v.ok) return Response.json({ error: v.error }, { status: 400 });
    const item = await saveFeedback(v.value, { firm, user, browser: req.headers.get("user-agent") ?? "", appVersion: appVersion(), source: "assistant" });
    await alertFeedback(item, lexAlert);
    return Response.json({ ok: true, id: item.id });
  }

  const latest = latestQuestion(body?.messages);
  const messages = normaliseHelpMessages(body?.messages);
  if (!latest.trim() || !messages.length) return Response.json({ error: "messages required" }, { status: 400 });
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId.slice(0, 64) : null;

  // Price questions never reach the model.
  if (isPriceQuestion(latest) && !isLegalQuestion(latest)) {
    return Response.json({ reply: PRICE_ANSWER, offer: null, label: HELP_LABEL, routed: "price" });
  }
  // Per-firm daily cost cap (Brisbane day), on top of the shared per-IP chat limits.
  if (redis) {
    const k = helpDayKey(firm);
    const n = Number(await redis.incr(k));
    if (n === 1) await redis.expire(k, 2 * 86400);
    if (n > HELP_DAILY_CAP) return Response.json({ reply: HELP_CAP_REPLY, offer: null, label: HELP_LABEL, routed: "cap" });
  }

  const gw = await LexGateway.open({ route: "lex-help", firm, model: { kind: "saabai", modelId: "claude-haiku-4-5-20251001" }, thread: threadSeed(conversationId, messages) });
  if (!gw) return privacyFailResponse();
  try {
    const masked = gw.maskMessages(messages);
    const maskedLatest = gw.mask(latest);
    // Retrieval over content/lex-help plus the current screen and the session firm's own context (never body-supplied).
    const route = cleanRoute(body?.page);
    const context = helpContextText(route, await helpFirmContext(actor).catch(() => null));
    let usage: unknown;
    const out = await runHelp(latest, {
      // Classifier calls go through the same gateway, on masked text. Errors decline (fail closed in runHelp).
      classify: async (system, text) => (await gw.generateText({ system, messages: [{ role: "user", content: text === latest ? maskedLatest : gw.mask(text) }], maxOutputTokens: 5 })).maskedText,
      answer: async () => {
        const res = await gw.generateText({ system: helpSystemPrompt(retrieveHelp(latest, route), context) + PRIVACY_SYSTEM_NOTE, messages: masked, maxOutputTokens: 600 });
        usage = res.totalUsage ?? res.usage;
        return res.text;
      },
    });
    logChatTurn({ bot: "lex-help", siteId: firm, conversationId, model: gw.modelId, usage: usage as never, userText: maskedLatest, assistantText: out.routed === "assistant" ? gw.mask(out.reply) : HELP_DECLINE });
    const offer = out.offer;
    let offerId: string | null = null;
    if (offer && redis) {
      offerId = randomBytes(12).toString("hex");
      await redis.set(`lex:help:offer:${offerId}`, JSON.stringify({ ...offer, user }), { ex: OFFER_TTL });
    }
    return Response.json({ reply: out.reply, offer: offerId ? offer : null, offerId, label: HELP_LABEL, routed: out.routed });
  } catch (err) {
    if (err instanceof LexPrivacyError) return privacyFailResponse();
    console.error("[lex-help]", err instanceof Error ? err.name : "error");
    return Response.json({ error: "Help is unavailable right now. Please try again." }, { status: 502 });
  }
}
