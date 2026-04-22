import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "../../../../lib/portal-session";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");
  const token = parseCookie(cookieHeader, "portal_session");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = verifySession(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { base64?: string; filename?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { base64, filename } = body;
  if (!base64) {
    return NextResponse.json({ error: "Missing base64 content" }, { status: 400 });
  }

  // Validate it looks like base64
  if (!/^[A-Za-z0-9+/]+=*$/.test(base64.replace(/\s/g, ""))) {
    return NextResponse.json({ error: "Invalid base64 content" }, { status: 400 });
  }

  try {
    const result = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      system:
        "You are extracting writing style and content from a legal document. Return the most representative excerpts of the author's writing voice — their sentence structure, word choice, formality level, and characteristic phrases. Focus on prose the lawyer actually wrote, not legal boilerplate. Return max 2000 words of the most style-revealing content.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file",
              data: base64,
              mediaType: "application/pdf",
            },
            {
              type: "text",
              text: `Extract the most style-revealing writing from this document${filename ? ` (${filename})` : ""}. Focus on the lawyer's own voice — characteristic phrases, sentence structure, and writing patterns. Exclude boilerplate, standard clauses, and formulaic legal language.`,
            },
          ],
        },
      ],
    });

    const text = result.text?.trim() ?? "";
    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to process PDF: ${message}` }, { status: 500 });
  }
}
