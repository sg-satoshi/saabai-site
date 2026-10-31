import { NextRequest } from "next/server";
import { handleChat, optionsResponse } from "../../../lib/chatbot/handler";

// Cached widgets still post here, without a slug. Delete this route after 7 November 2026 (one week).
export const runtime = "nodejs";
export const maxDuration = 30;

const SLUG = "nico-moretti";

export const OPTIONS = (req: NextRequest) => optionsResponse(req);

/** Old widget roles use "bot". The platform handler only accepts user and assistant. */
function platformMessages(input: unknown): unknown {
  if (!Array.isArray(input)) return input;
  return input.map((m) => {
    if (!m || typeof m !== "object") return m;
    const row = m as { role?: unknown; content?: unknown };
    return { role: row.role === "bot" ? "assistant" : row.role, content: row.content };
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const slug = typeof record.slug === "string" && record.slug.trim() ? record.slug : SLUG;
  const next = new NextRequest(req.url, {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify({ ...record, slug, messages: platformMessages(record.messages) }),
  });
  return handleChat(next);
}
