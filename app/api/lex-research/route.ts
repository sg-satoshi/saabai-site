import { lexErrorResponse, stripErrorAnswers } from "../../../lib/lex-errors";
import { streamText, stepCountIs, type SystemModelMessage } from "ai";
import { getLexConfig } from "../../../lib/lex-config";
import { getLexModelForFirm } from "../../../lib/lex-model";
import { buildLexResearchTools, finalStepAnswers, LEX_RESEARCH_MAX_STEPS } from "../../../lib/lex-research-tools";
import { getPortalSettings, buildSystemPromptAddition } from "../../../lib/portal-config";
import { verifySession } from "../../../lib/portal-session";
import { tokenizePII, rehydrateTokens } from "../../../lib/pii-scanner";

// Lex Research uses LEX_RESEARCH_MODEL (falls back to PREMIUM_CHAT_MODEL), or the
// firm's own model when one is saved. Never route legal research to a cheap model.

export const runtime = "nodejs";
export const maxDuration = 120; // Sonnet 4.6 research with tool steps can take up to a minute

export async function POST(req: Request) {
  try {
    const { messages, clientId, privacyMode } = await req.json();

    const config = getLexConfig(clientId);

    // Load portal settings for the logged-in user.
    // Use the session cookie email (the firm's login) — settings are saved per login email.
    // Fall back to config.email.teamEmail for non-browser callers.
    let systemPromptContent = config.systemPrompt;
    try {
      const cookieHeader = req.headers.get("cookie") ?? "";
      const sessionToken = cookieHeader
        .split(";")
        .map(p => p.trim())
        .find(p => p.startsWith("portal_session="))
        ?.slice("portal_session=".length);
      const session = sessionToken ? verifySession(sessionToken) : null;
      const settingsEmail = session?.email ?? config.email.teamEmail;

      const portalSettings = await getPortalSettings(settingsEmail);
      if (portalSettings) {
        systemPromptContent = config.systemPrompt + buildSystemPromptAddition(portalSettings);
      }
    } catch {
      // Non-fatal — fall back to base system prompt if Redis is unavailable
    }

    if (!Array.isArray(messages)) return lexErrorResponse(400, "messages required");
    // Old threads may hold a saved error message; it is not an answer and never goes to the model.
    const coreMessages = stripErrorAnswers(messages as Array<{ role: string; content: string }>)
      .filter(m => m.role !== "system" && typeof m.content === "string" && m.content.trim())
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    // ── PRIVACY MODE: Tokenize PII before sending to LLM ──
    let tokenMap: Record<string, string> = {};
    let tokenizedMessages = coreMessages;
    let privacyStats = { tokensReplaced: 0, types: {} as Record<string, number> };

    if (privacyMode) {
      const combinedTokenMap: Record<string, string> = {};
      tokenizedMessages = coreMessages.map(m => {
        const { tokenized, tokenMap: localMap, stats } = tokenizePII(m.content);
        Object.assign(combinedTokenMap, localMap);
        privacyStats.tokensReplaced += stats.tokensReplaced;
        for (const [type, count] of Object.entries(stats.types)) {
          privacyStats.types[type] = (privacyStats.types[type] ?? 0) + count;
        }
        return { ...m, content: tokenized };
      });
      tokenMap = combinedTokenMap;

      // Add privacy instruction to system prompt
      systemPromptContent += `

---
PRIVACY MODE ACTIVE: This conversation has been anonymized. You will see placeholder tokens like {{PERSON_1}}, {{TRUST_1}}, {{EMAIL_1}}, etc. You MUST preserve these exact tokens in your responses. Do not expand, guess, or replace them with real names or values. Treat all {{TYPE_N}} tokens as opaque placeholders. Your tools will receive tokenized queries — search using legal doctrine and general terms, not personal identifiers.`;
    }

    const cachedSystem: SystemModelMessage = {
      role: "system",
      content: systemPromptContent,
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    };

    // The firm's own API key + model if configured; otherwise Lex's research model.
    const model = await getLexModelForFirm(config.id);

    const result = streamText({
      model,
      system: cachedSystem,
      messages: tokenizedMessages,
      stopWhen: stepCountIs(LEX_RESEARCH_MAX_STEPS),
      prepareStep: finalStepAnswers(LEX_RESEARCH_MAX_STEPS),
      tools: buildLexResearchTools(config),
    });

    // ── PRIVACY MODE: Buffer stream, detokenize, re-stream ──
    if (privacyMode) {
      const fullText = await result.text;
      const detokenized = rehydrateTokens(fullText, tokenMap);

      // Emit as SSE compatible with the Lex widget client
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Break into natural chunks (sentences / clauses) for streaming effect
          const chunks = detokenized.split(/(?<=[.!?]\s+)/);
          let i = 0;
          function send() {
            if (i >= chunks.length) {
              controller.close();
              return;
            }
            const payload = JSON.stringify({ type: "text-delta", delta: chunks[i] });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            i++;
            // Small delay for visual streaming effect
            setTimeout(send, 15);
          }
          send();
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

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[lex-research]", err);
    return lexErrorResponse(500, "research_failed");
  }
}
