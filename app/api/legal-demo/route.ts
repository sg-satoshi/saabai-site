import { streamText } from "ai";
import { getDefaultModel } from "../../../lib/chat-config";
import { lastUserText, logChatTurn, modelIdFrom } from "../../../lib/chat-log";
import { cleanMessages } from "../../../lib/chat-origin";
import { createDashFilter } from "../../../lib/no-dashes";
import {
  DEMO_FALLBACK,
  DEMO_LIMIT,
  DEMO_MAX_OUTPUT_TOKENS,
  DEMO_UNAVAILABLE,
  LEX_DEMO_SYSTEM,
  createBannedWordFilter,
  missingModelKey,
  reserveDemoMessage,
  scrubDemoText,
  visitorIdFrom,
} from "../../../lib/legal-demo";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

function json(content: string, status: number, extra: Record<string, unknown> = {}) {
  return Response.json(
    { content, text: content, ...extra },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function safeErr(err: unknown): string {
  const msg = err instanceof Error ? err.message : "model error";
  return msg.replace(/\b(sk-|xai-|sk-ant-)[A-Za-z0-9_\-]{4,}/g, "[key]").slice(0, 180);
}

/**
 * Inline Lex demo for /legal.
 * Same default model provider as the site chatbot platform. No tools and no lead capture.
 * Kept off the /api/lex-* prefix so the research privacy gateway (built for signed-in matter work) is not on this public marketing path.
 */
export async function POST(req: Request) {
  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return json("Please type a message.", 400);
  }

  const messages = cleanMessages(body?.messages, 8, 600);
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return json("Please type a message.", 400);
  }

  const missing = missingModelKey();
  if (missing) {
    console.error(`[legal-demo] missing env ${missing}`);
    return json(DEMO_UNAVAILABLE, 503, { missingEnv: missing, degraded: true });
  }

  const slot = await reserveDemoMessage(visitorIdFrom(req));
  if (slot === "capped") return json(DEMO_LIMIT, 429);

  let result: ReturnType<typeof streamText>;
  try {
    const model = getDefaultModel();
    result = streamText({
      model,
      system: LEX_DEMO_SYSTEM,
      messages,
      maxOutputTokens: DEMO_MAX_OUTPUT_TOKENS,
      temperature: 0.2,
      abortSignal: AbortSignal.timeout(20_000),
      onFinish: (event) => {
        logChatTurn({
          bot: "legal-demo",
          siteId: "legal-demo",
          model: modelIdFrom(model),
          usage: event.totalUsage ?? event.usage,
          userText: lastUserText(messages),
          assistantText: scrubDemoText(event.text ?? ""),
        });
      },
    });
  } catch (err) {
    console.error("[legal-demo] model start failed:", safeErr(err));
    return json(DEMO_UNAVAILABLE, 200, { degraded: true });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const dashes = createDashFilter();
      const banned = createBannedWordFilter();
      let sent = "";
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      const pushClean = (chunk: string): boolean => {
        const step = banned.push(chunk);
        if (step.banned) return false;
        if (step.text) {
          sent += step.text;
          send({ type: "text-delta", delta: step.text });
        }
        return true;
      };
      try {
        for await (const chunk of result.textStream) {
          const clean = dashes.push(chunk);
          if (clean && !pushClean(clean)) {
            send({ type: "replace", text: DEMO_FALLBACK });
            return;
          }
        }
        const rest = dashes.flush();
        if (rest && !pushClean(rest)) {
          send({ type: "replace", text: DEMO_FALLBACK });
          return;
        }
        const tail = banned.flush();
        if (tail.banned) {
          send({ type: "replace", text: DEMO_FALLBACK });
          return;
        }
        if (tail.text) {
          sent += tail.text;
          send({ type: "text-delta", delta: tail.text });
        }
        const finalText = scrubDemoText(sent);
        if (finalText === DEMO_FALLBACK && sent.trim()) {
          send({ type: "replace", text: DEMO_FALLBACK });
        } else if (!sent.trim()) {
          send({ type: "replace", text: DEMO_FALLBACK });
        }
      } catch (err) {
        console.error("[legal-demo] stream error:", safeErr(err));
        if (!sent.trim()) send({ type: "replace", text: DEMO_UNAVAILABLE });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}
