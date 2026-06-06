/**
 * LeadGen Chat API
 *
 * Handles AI conversation + lead capture for a specific business.
 * Detects [LEAD_CAPTURED] markers in AI output, saves to Redis, and sends email notification.
 */

import { NextRequest } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  getClientBySlug,
  saveLead,
  buildSystemPrompt,
  type LeadGenClient,
} from "../../../../lib/leadgen-config";
import { sendLeadNotification } from "../../../../lib/leadgen-notify";

export const runtime = "nodejs";
export const maxDuration = 30;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Use Claude Haiku for cost efficiency — picks up ANTHROPIC_API_KEY from env
const leadgenModel = anthropic("claude-haiku-4-5-20251001");

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const { slug, messages = [] } = await req.json();
    if (!slug) {
      return Response.json({ error: "slug required" }, { status: 400, headers: CORS });
    }

    const client = await getClientBySlug(slug);
    if (!client || client.status !== "active") {
      return Response.json({ error: "Client not found or inactive" }, { status: 404, headers: CORS });
    }

    const system = client.systemPrompt || buildSystemPrompt(client);

    const chatMessages = messages
      .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
      .slice(-15)
      .map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const { text } = await generateText({
      model: leadgenModel,
      system,
      messages: chatMessages,
    });

    // ── Check for lead capture in the response ─────────────────────────
    let leadCaptured = false;
    if (text.includes("[LEAD_CAPTURED]") && text.includes("[/LEAD_CAPTURED]")) {
      const extracted = extractLeadData(text, client);
      if (extracted && extracted.phone) {
        const lead = await saveLead(slug, {
          ...extracted,
          conversation: chatMessages as Array<{ role: "user" | "assistant"; content: string }>,
        });
        await sendLeadNotification(client, lead);
        leadCaptured = true;
      }
    }

    // Clean the lead markers from the response sent to the user
    let cleanResponse = text
      .replace(/\[LEAD_CAPTURED\][\s\S]*?\[\/LEAD_CAPTURED\]/g, "")
      .trim()
      || "Got it! Someone will call you back shortly.";

    // Hard formatting enforcement - remove ** and em dashes
    cleanResponse = cleanResponse
      .replace(/\*\*/g, "")
      .replace(/—/g, "-")
      .replace(/\s+/g, " ")
      .trim();

    return Response.json({
      content: cleanResponse,
      leadCaptured,
      url: leadCaptured ? `/api/leadgen/leads?slug=${slug}` : undefined,
    }, { headers: CORS });
  } catch (e) {
    const errMsg = e instanceof Error ? `${e.name}: ${e.message}\n${e.stack?.slice(0, 200)}` : String(e);
    console.error("leadgen-chat error:", errMsg);
    return Response.json({ error: "Failed to respond", detail: errMsg.slice(0, 500) }, { status: 500, headers: CORS });
  }
}

function extractLeadData(
  text: string,
  _client: LeadGenClient
): {
  name: string;
  phone: string;
  email?: string;
  service: string;
  address?: string;
  urgency: "emergency" | "soon" | "quote";
  message?: string;
} | null {
  const match = text.match(/\[LEAD_CAPTURED\]([\s\S]*?)\[\/LEAD_CAPTURED\]/);
  if (!match) return null;

  const block = match[1];
  const get = (label: string) => {
    const re = new RegExp(`${label}:\\s*(.+)`, "i");
    const m = block.match(re);
    return m ? m[1].trim() : "";
  };

  const urgency = get("Urgency").toLowerCase();
  const validUrgency = urgency === "emergency" || urgency === "soon" || urgency === "quote"
    ? (urgency as "emergency" | "soon" | "quote")
    : "quote";

  return {
    name: get("Name") || "Unknown",
    phone: get("Phone"),
    email: get("Email") || undefined,
    service: get("Service") || "General inquiry",
    address: get("Address") || undefined,
    urgency: validUrgency,
    message: get("Message") || undefined,
  };
}
