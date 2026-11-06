import { NextRequest } from "next/server";
import { domainsForBot } from "@/lib/chatbot/personas";
import { cors, optionsResponse, originDecision } from "@/lib/chatbot/handler";
import { getConfig, recordChatEvent } from "@/lib/chatbot/store";
import { effectiveEngage } from "@/lib/chatbot/engage";
import { parseLead, routeLead } from "@/lib/chatbot/lead-capture";
import { SLUG_RE, slugLimited } from "@/lib/chat-origin";
import { getSiteBySlug } from "@/lib/site-registry";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";

export const OPTIONS = (req: NextRequest) => optionsResponse(req);

const RETAIN_DAYS = 90; // same as chat logs (privacy policy)

/**
 * End-of-chat "email me a copy / follow up" with ticked consent.
 * Off unless BOTH the bot's emailCopy toggle and the CHATBOT_LEAD_CAPTURE_ENABLED flag are on
 * (routeLead returns "off" otherwise). Stores only. Sends nothing.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = cors(origin);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  if (!slug || !SLUG_RE.test(slug)) return Response.json({ ok: false }, { status: 400, headers });
  const site = await getSiteBySlug(slug);
  if (!site) return Response.json({ ok: false }, { status: 404, headers });
  if ((await originDecision(req, slug, domainsForBot(slug, site.domains))) === "block") return Response.json({ ok: false }, { status: 403, headers });
  if (await slugLimited(slug)) return Response.json({ ok: false }, { status: 429, headers });

  const cfg = await getConfig(slug);
  if (!effectiveEngage(cfg.engage).emailCopy) return Response.json({ ok: false, off: true }, { status: 404, headers });
  const lead = parseLead(slug, body);
  if (typeof lead === "string") return Response.json({ ok: false, error: lead }, { status: 400, headers });
  if (routeLead(lead) === "off") return Response.json({ ok: false, off: true }, { status: 404, headers });

  const r = getRedis();
  if (!r) return Response.json({ ok: false }, { status: 503, headers });
  const key = `saabai:chatbot:followups:${slug}`;
  await r.lpush(key, JSON.stringify({ ...lead, sessionId: typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : "" }));
  await r.ltrim(key, 0, 499);
  await r.expire(key, RETAIN_DAYS * 86400);
  await recordChatEvent(slug, "form_submitted");
  return Response.json({ ok: true }, { headers });
}
