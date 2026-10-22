import { streamText, stepCountIs } from "ai";
import type { LanguageModel } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getRedis } from "../../../lib/redis";
import { getClientLLMConfig, buildModelFromConfig } from "../../../lib/client-config";
import { verifySession } from "../../../lib/portal-session";
import { normalizeLexChatMessages } from "../../../lib/lex-chat-input";
import { createDashFilter } from "../../../lib/no-dashes";
import { LexMasker, LexPrivacyError, PRIVACY_SYSTEM_NOTE, privacyFailResponse, createRehydrator } from "../../../lib/lex-privacy/mask";
import { lastUserText, logStreamFinish, modelIdFrom } from "../../../lib/chat-log";

export const runtime = "nodejs";
export const maxDuration = 30;

function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) return trimmed.slice(eq + 1);
  }
  return undefined;
}


export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { messages?: unknown; clientId?: unknown } | null;
  const normalized = normalizeLexChatMessages(body?.messages);
  // Nothing to answer: a clean 400 instead of the model throwing (was a 500).
  if (normalized.length === 0 || normalized[normalized.length - 1].role !== "user") {
    return Response.json({ error: "messages required" }, { status: 400 });
  }
  const clientId: string | undefined = typeof body?.clientId === "string" ? body.clientId : undefined;

  // Base formatting rules applied to every Lex response regardless of client config
  const BASE_RULES = `
Formatting rules (always follow these):
- Never use markdown asterisks for bold or italic. No **word** or *word*.
- Never use em dashes or a spaced double hyphen. Use a comma, colon, or rewrite the sentence instead.
- Never use hyphens as list bullets preceded by bold text. Use plain labels with a colon.
- Write in plain conversational prose. No markdown formatting of any kind.
`.trim();

  // 1. Load system prompt — keyed by email from session cookie
  let clientConfig: string | undefined;
  try {
    const sessionToken = parseCookie(req.headers.get("cookie"), "portal_session");
    const session = sessionToken ? verifySession(sessionToken) : null;
    if (session?.email) {
      const redis = getRedis();
      if (redis) {
        const stored = await redis.get<string>(`portal:config:${session.email}`);
        if (stored) clientConfig = typeof stored === "string" ? stored : JSON.stringify(stored);
      }
    }
  } catch {
    // non-fatal — proceed without client config
  }

  const systemPrompt = (clientConfig ? `${clientConfig}\n\n${BASE_RULES}` : BASE_RULES) + PRIVACY_SYSTEM_NOTE;

  // Privacy: always on. Mask client details before the model sees them. Fail closed.
  const masker = new LexMasker();
  let masked: typeof normalized;
  try {
    masked = masker.maskMessages(normalized);
  } catch (err) {
    if (err instanceof LexPrivacyError) return privacyFailResponse();
    throw err;
  }

  // 2. Load client LLM model (API key + model) — keyed by clientId
  //    Fall back to Haiku (fast, cheap) when no client key is saved
  let model: LanguageModel = anthropic("claude-haiku-4-5-20251001");
  if (clientId) {
    try {
      const llmConfig = await getClientLLMConfig(clientId);
      if (llmConfig) {
        const clientModel = buildModelFromConfig(llmConfig);
        if (clientModel) model = clientModel;
      }
    } catch {
      // non-fatal — fall back to default model
    }
  }

  // 3. Messages were normalised at the top (system messages from the client are dropped).

  const result = streamText({
    model,
    system: systemPrompt,
    messages: masked,
    stopWhen: stepCountIs(4),
    onFinish: (event) => {
      logStreamFinish(event, {
        bot: "lex",
        siteId: clientId,
        model: modelIdFrom(model),
        userText: lastUserText(masked),
      });
    },
  });

  // 4. Stream in the SSE format both LexWidget and client portal expect:
  //    data: {"type":"text-delta","delta":"<chunk>"}
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const dashes = createDashFilter();
        const names = createRehydrator(masker.map);
        for await (const chunk of result.textStream) {
          const clean = dashes.push(names.push(chunk));
          if (!clean) continue;
          const line = `data: ${JSON.stringify({ type: "text-delta", delta: clean })}\n\n`;
          controller.enqueue(encoder.encode(line));
        }
        const rest = dashes.push(names.flush()) + dashes.flush();
        if (rest) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text-delta", delta: rest })}\n\n`));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[lex-chat] stream error:", msg);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
