/**
 * POST /api/site-factory/save-external
 * Create a record for an externally built site (Lovable, Replit, etc.).
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "../../../../lib/auth";
import { createSite } from "../../../../lib/site-registry";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session || session.clientId !== ADMIN_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { slug, name, niche, description, externalUrl, externalPlatform, chatbotEnabled, chatbotName, chatbotGreeting } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    const site = await createSite({
      slug,
      name,
      niche: niche || "other",
      description: description || "",
      status: "live",
      url: externalUrl || `https://www.saabai.ai/sites/${slug}/`,
      source: "external",
      externalUrl: externalUrl || undefined,
      externalPlatform: externalPlatform || undefined,
      business: {
        name,
      },
      chatbot: {
        enabled: chatbotEnabled ?? false,
        name: chatbotName || `${name} Assistant`,
        greeting: chatbotGreeting || "Hi! How can I help?",
        systemPrompt: `You are the assistant for ${name}. Help visitors with their inquiries.`,
      },
    });

    return NextResponse.json({ site });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[site-factory/save-external]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
