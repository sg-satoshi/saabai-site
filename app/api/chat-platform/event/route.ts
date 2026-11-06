import { NextRequest } from "next/server";
import { domainsForBot } from "@/lib/chatbot/personas";
import { isWidgetEvent, type WidgetEventName } from "@/lib/chatbot/events";
import { cors, optionsResponse, originDecision } from "@/lib/chatbot/handler";
import { recordChatEvent } from "@/lib/chatbot/store";
import { SLUG_RE } from "@/lib/chat-origin";
import { getSiteBySlug } from "@/lib/site-registry";
import { eventRateLimited } from "@/lib/chatbot/ratelimit";

export const runtime = "nodejs";

export const OPTIONS = (req: NextRequest) => optionsResponse(req);

/**
 * Widget beacon for a handoff, CTA or fallback button click. Counts the event and sends nothing.
 * A client chat is never notified. There is no admin send here either: if that is added,
 * it must use adminTelegramDestination and send nothing when that returns null.
 * This route does not post to a lead endpoint.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = cors(origin);
  const body = await req.json().catch(() => ({}));
  const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
  if (!slug || !SLUG_RE.test(slug)) return Response.json({ ok: false }, { status: 400, headers });
  if (!isWidgetEvent(body?.event)) return Response.json({ ok: false }, { status: 400, headers });

  // Rate limit per visitor IP and per bot, so a script cannot inflate a client's funnel counts.
  if (await eventRateLimited(req, slug)) return Response.json({ ok: false }, { status: 429, headers });
  const site = await getSiteBySlug(slug);
  if (!site) return Response.json({ ok: false }, { status: 404, headers });
  if ((await originDecision(req, slug, domainsForBot(slug, site.domains))) === "block") {
    return Response.json({ ok: false }, { status: 403, headers });
  }

  // A CTA click counts as the goal reached. A fallback click counts as the fallback goal reached.
  const event = body.event as WidgetEventName;
  await recordChatEvent(slug, event);
  if (event === "cta_click") await recordChatEvent(slug, "goal_reached");
  if (event === "fallback_click") await recordChatEvent(slug, "fallback_reached");
  // Field events say a field was filled, never its value. form_submitted is server-side only.
  return Response.json({ ok: true }, { headers });
}
