import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
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
      "Provide a clear, structured comparison analysis in plain text.\n" +
      "Use concise paragraphs with clear headings. No markdown formatting.";

    const userPrompt = `Compare the following two legal documents and identify key differences, risks, and recommendations.

Document Type: ${documentType || "Auto-detected"}
Jurisdiction: ${jurisdiction || "Australia"}

DOCUMENT A:
---
${documentA.slice(0, 8000)}
---

DOCUMENT B:
---
${documentB.slice(0, 8000)}
---

Provide your analysis covering:
1. Key differences between the documents
2. Risks present in either document
3. Recommendations for which document is more favorable
4. Specific clauses that differ significantly

Keep the analysis concise but thorough.`;

    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 4000,
    });

    return Response.json({ analysis: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
