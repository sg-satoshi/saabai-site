import { CLIENT_EVENT_TYPES, isBot, privacySignal, type EventType } from "@/lib/exp/core";
import { getExperiments } from "@/lib/exp/config";
import { cookieFromRequest, rateLimited, recordEvent } from "@/lib/exp/track";

export const runtime = "nodejs";

const done = () => new Response(null, { status: 204 });

/** Browser beacon for impression, cta_click and call_click. Always 204; invalid, bot and opted-out traffic is ignored. */
export async function POST(req: Request) {
  try {
    if (isBot(req.headers.get("user-agent")) || privacySignal(req.headers)) return done();
    const body = (await req.json().catch(() => null)) as { type?: string; exp?: string } | null;
    if (!body || typeof body.type !== "string" || typeof body.exp !== "string") return done();
    if (!CLIENT_EVENT_TYPES.includes(body.type as EventType)) return done();
    const ck = cookieFromRequest(req);
    const variantId = ck?.a[body.exp];
    if (!ck || !variantId) return done();
    const exp = (await getExperiments("saabai")).find((e) => e.id === body.exp);
    if (!exp || exp.status !== "running" || !exp.variants.some((v) => v.id === variantId)) return done();
    if (await rateLimited(req)) return done();
    await recordEvent(exp.id, variantId, ck.v, body.type as EventType);
  } catch { /* never error to the browser */ }
  return done();
}
