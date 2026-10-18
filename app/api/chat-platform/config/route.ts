import { NextRequest } from "next/server";
import { getSiteBySlug } from "@/lib/site-registry";
import { SLUG_RE } from "@/lib/chat-origin";
import { toPublicConfig } from "@/lib/chatbot/core";
import { getConfig, isEnabled } from "@/lib/chatbot/store";
import { cors, originDecision, optionsResponse } from "@/lib/chatbot/handler";

export const runtime = "nodejs";

export const OPTIONS = (req: NextRequest) => optionsResponse(req);

const cache = new Map<string, { at: number; body: unknown }>();
const TTL = 20_000;
const INACTIVE = { v: 1, active: false };

/**
 * Public widget config for one site: skin, on/off, plan rules (Powered by Saabai) and the off message.
 * Never returns the prompt, knowledge, usage or audit data. Anything wrong returns active:false, so the widget stays hidden.
 */
export async function GET(req: NextRequest) {
  const h = { ...cors(req.headers.get("origin")), "Cache-Control": "public, max-age=15, s-maxage=20, stale-while-revalidate=10" };
  const slug = (new URL(req.url).searchParams.get("site") || "").trim().toLowerCase();
  if (!slug || !SLUG_RE.test(slug)) return Response.json(INACTIVE, { headers: h });
  try {
    const site = await getSiteBySlug(slug);
    if (!site) return Response.json(INACTIVE, { headers: h });
    if ((await originDecision(req, slug, site.domains)) === "block") return Response.json(INACTIVE, { headers: { ...h, "Cache-Control": "no-store" } });
    const hit = cache.get(slug);
    if (hit && Date.now() - hit.at < TTL) return Response.json(hit.body, { headers: h });
    const [active, config] = await Promise.all([isEnabled(slug, site.chatbot?.enabled), getConfig(slug)]);
    const body = toPublicConfig({ active, config, site });
    cache.set(slug, { at: Date.now(), body });
    return Response.json(body, { headers: h });
  } catch (e) {
    console.error("chat-platform config error:", e);
    return Response.json(INACTIVE, { headers: { ...h, "Cache-Control": "no-store" } });
  }
}
