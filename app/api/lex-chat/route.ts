import { streamText, stepCountIs } from "ai";
import type { LanguageModel } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getRedis } from "../../../lib/redis";
import { getClientLLMConfig, buildModelFromConfig } from "../../../lib/client-config";
import { verifySession } from "../../../lib/portal-session";

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

type Msg = { role: "user" | "assistant" | "system"; content: string };

export async function POST(req: Request) {
  const body = await req.json() as { messages?: Msg[]; clientId?: string };
  const messages: Msg[] = Array.isArray(body.messages) ? body.messages : [];
  const clientId: string | undefined = body.clientId;

  // Base formatting rules applied to every Lex response regardless of client config
  const BASE_RULES = `
Formatting rules (always follow these):
- Never use markdown asterisks for bold or italic. No **word** or *word*.
- Never use em dashes (—). Use a comma, colon, or rewrite the sentence instead.
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

  const systemPrompt = clientConfig ? `${clientConfig}\n\n${BASE_RULES}` : BASE_RULES;

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

  // 3. Normalise messages — strip any system messages from client (we set system above)
  const normalized = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));

  const result = streamText({
    model,
    system: systemPrompt,
    messages: normalized,
    stopWhen: stepCountIs(4),
  });

  // 4. Stream in the SSE format both LexWidget and client portal expect:
  //    data: {"type":"text-delta","delta":"<chunk>"}
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          const line = `data: ${JSON.stringify({ type: "text-delta", delta: chunk })}\n\n`;
          controller.enqueue(encoder.encode(line));
        }
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
