import { CLIENT_EVENT_TYPES, isBot, privacySignal, type EventType } from "@/lib/exp/core";
import { getExperiments } from "@/lib/exp/config";
import { SAABAI_SITE, isSiteEnabled, siteKeyForRequestHost } from "@/lib/exp/sites";
import { attrFromRequest, cookieFromRequest, rateLimited, recordEvent } from "@/lib/exp/track";

export const runtime = "nodejs";

const done = () => new Response(null, { status: 204 });

/**
 * Browser beacon for impression, cta_click and call_click, plus "goal" on client sites. Always 204; invalid, bot and
 * opted-out traffic is ignored. The site comes from the host the beacon was sent to, so a client domain can only
 * ever record against its own tests.
 *
 * "goal" is a client site's conversion (for example the SUNDER waitlist signup), sent by the page AFTER its own form
 * succeeded. It records form_submit (counted as a conversion) for every running test on that site the visitor is in.
 * saabai.ai records form_submit server-side when a lead lands, so "goal" is ignored there (no double counting).
 */
export async function POST(req: Request) {
  try {
    if (isBot(req.headers.get("user-agent")) || privacySignal(req.headers)) return done();
    const body = (await req.json().catch(() => null)) as { type?: string; exp?: string } | null;
    if (!body || typeof body.type !== "string") return done();
    const site = await siteKeyForRequestHost(req.headers.get("host") ?? "");
    if (!site || !(await isSiteEnabled(site))) return done();
    const ck = cookieFromRequest(req);
    if (!ck) return done();
    const exps = await getExperiments(site);
    if (body.type === "goal") {
      if (site === SAABAI_SITE) return done();
      const mine = exps.filter((e) => e.status === "running" && ck.a[e.id] && e.variants.some((v) => v.id === ck.a[e.id]));
      if (!mine.length || (await rateLimited(req))) return done();
      for (const e of mine) await recordEvent(e.id, ck.a[e.id], ck.v, "form_submit", attrFromRequest(req));
      return done();
    }
    if (typeof body.exp !== "string" || !CLIENT_EVENT_TYPES.includes(body.type as EventType)) return done();
    const variantId = ck.a[body.exp];
    if (!variantId) return done();
    const exp = exps.find((e) => e.id === body.exp);
    if (!exp || exp.status !== "running" || !exp.variants.some((v) => v.id === variantId)) return done();
    if (await rateLimited(req)) return done();
    await recordEvent(exp.id, variantId, ck.v, body.type as EventType, attrFromRequest(req));
  } catch { /* never error to the browser */ }
  return done();
}
