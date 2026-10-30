/**
 * POST /api/lex-help: the in-app Lex help assistant. Signed-in Lex users only (proxy session check
 * plus resolveReviewActor). Rate limits and size caps: the shared chat guard (CHAT_API in lib/chat-guard).
 * The model call goes through LexGateway, which masks every message and fails closed.
 * Logged like Lex chats: logChatTurn with the MASKED text, same 90-day chat-log retention purge.
 * Never files feedback itself; it returns an offer the user must confirm in the panel.
 */
import { resolveReviewActor } from "@/lib/lex-review-access";
import { LexGateway, threadSeed } from "@/lib/lex-privacy/gateway";
import { LexPrivacyError, PRIVACY_SYSTEM_NOTE, privacyFailResponse } from "@/lib/lex-privacy/mask";
import { logChatTurn } from "@/lib/chat-log";
import { HELP_LABEL, LEGAL_REFUSAL, helpSystemPrompt, isLegalQuestion, normaliseHelpMessages, parseHelpReply } from "@/lib/lex-help";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const actor = await resolveReviewActor(req);
  if (!actor) return Response.json({ error: "Sign in to use help" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { messages?: unknown; conversationId?: unknown } | null;
  const messages = normaliseHelpMessages(body?.messages);
  if (!messages.length || messages[messages.length - 1].role !== "user") return Response.json({ error: "messages required" }, { status: 400 });
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId.slice(0, 64) : null;
  const firm = actor.kind === "firm" ? actor.firm : "saabai-staff";
  const last = messages[messages.length - 1].content;

  if (isLegalQuestion(last)) return Response.json({ reply: LEGAL_REFUSAL, offer: null, label: HELP_LABEL, routed: "legal_refusal" });

  const gw = await LexGateway.open({ route: "lex-help", firm, model: { kind: "saabai", modelId: "claude-haiku-4-5-20251001" }, thread: threadSeed(conversationId, messages) });
  if (!gw) return privacyFailResponse();
  try {
    const masked = gw.maskMessages(messages);
    const res = await gw.generateText({ system: helpSystemPrompt() + PRIVACY_SYSTEM_NOTE, messages: masked, maxOutputTokens: 600 });
    const { reply, offer } = parseHelpReply(res.text);
    logChatTurn({ bot: "lex-help", siteId: firm, conversationId, model: gw.modelId, usage: res.totalUsage ?? res.usage, userText: gw.mask(last), assistantText: res.maskedText });
    return Response.json({ reply, offer, label: HELP_LABEL, routed: "assistant" });
  } catch (err) {
    if (err instanceof LexPrivacyError) return privacyFailResponse();
    console.error("[lex-help]", err instanceof Error ? err.name : "error");
    return Response.json({ error: "Help is unavailable right now. Please try again." }, { status: 502 });
  }
}
