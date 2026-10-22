import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { gateCompare } from "../../../lib/lex-review-access";
import { cleanLexOutput } from "../../../lib/lex-output";
import { LexMasker, LexPrivacyError, PRIVACY_SYSTEM_NOTE, privacyFailResponse } from "../../../lib/lex-privacy/mask";
import { logChatTurn, modelIdFrom } from "../../../lib/chat-log";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Lex firm users and admins only, with a per-firm daily compare cap (LEX_COMPARE_DAILY_CAP).
 * A request that fails is refunded so it does not use up the firm's allowance.
 */
export async function POST(request: Request): Promise<Response> {
  const gate = await gateCompare(request);
  if (!gate.ok) return gate.response;
  const res = await runCompare(request);
  if (!res.ok) await gate.refund();
  return res;
}

async function runCompare(request: Request): Promise<Response> {
  try {
    const body = await request.json() as {
      documentA: string;
      documentB: string;
      documentType?: string;
      jurisdiction?: string;
    };

    const { documentA, documentB, documentType, jurisdiction } = body;

    if (!documentA || !documentB) {
      return Response.json(
        { error: "Missing required fields: documentA, documentB" },
        { status: 400 }
      );
    }

    const systemPrompt =
      "You are Lex, an expert AI legal document reviewer specialising in Australian law.\n" +
      "You compare two legal documents with the precision of a senior partner.\n" +
      "Write plain prose. Put each heading on its own line, then short paragraphs.\n" +
      "No markdown: no asterisks, hashes, or backticks.\n" +
      "No decorative dividers or rules. Do not draw lines of equals signs, hyphens, or box-drawing characters.\n" +
      "No em dashes and no spaced double hyphen. Use a comma, a colon, or a full stop." + PRIVACY_SYSTEM_NOTE;

    // Privacy: always on. Both documents share one placeholder map, masked before the model sees them. Fail closed.
    const masker = new LexMasker();
    let maskedA: string, maskedB: string;
    try {
      maskedA = masker.mask(String(documentA).slice(0, 8000));
      maskedB = masker.mask(String(documentB).slice(0, 8000));
    } catch (err) {
      if (err instanceof LexPrivacyError) return privacyFailResponse();
      throw err;
    }

    const userPrompt = `Compare the following two legal documents and identify key differences, risks, and recommendations.

Document Type: ${documentType || "Auto-detected"}
Jurisdiction: ${jurisdiction || "Australia"}

DOCUMENT A:
---
${maskedA}
---

DOCUMENT B:
---
${maskedB}
---

Provide your analysis covering:
1. Key differences between the documents
2. Risks present in either document
3. Recommendations for which document is more favorable
4. Specific clauses that differ significantly

Keep the analysis concise but thorough.`;

    const model = anthropic("claude-sonnet-4-6");
    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 4000,
    });
    const text = result.text;
    logChatTurn({
      bot: "lex-compare",
      model: modelIdFrom(model),
      usage: result.totalUsage ?? result.usage,
      userText: userPrompt,
      assistantText: text,
    });

    return Response.json({ analysis: cleanLexOutput(masker.rehydrate(text)) });
  } catch (err) {
    console.error("[lex-compare]", err);
    return Response.json({ error: "compare_failed" }, { status: 500 });
  }
}
