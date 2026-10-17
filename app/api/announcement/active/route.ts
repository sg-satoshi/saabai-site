import { NextResponse } from "next/server";
import { EXP_COOKIE, EXP_MAX_AGE, EXP_OFF_COOKIE, assign, parseExpCookie, privacySignal, siteKeyForHost, defaultVariant, type Variant } from "@/lib/exp/core";
import { getExperiments } from "@/lib/exp/config";
import { isShadow, normHex, isEmptyValue, isThemeKey, normColors, testIdFor, toPublic, sanitizeRich, visibleText, timerFromValue, timerOver, type Announcement, type PublicAnnouncement } from "@/lib/announce/core";
import { liveAnnouncements } from "@/lib/announce/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Timers need the server clock and the current deadline state on every load, so they are never cached by the CDN. */
const CACHE_TIMER = "private, no-store";
const cacheFor = (a: Announcement | null | undefined, cdn: string) => (a?.timer ? CACHE_TIMER : cdn);
const none = (cache = true) => NextResponse.json({ announcement: null, announcements: [] }, { headers: { "Cache-Control": cache ? "public, s-maxage=30, stale-while-revalidate=60" : "no-store" } });

function fromVariant(a: Announcement, v: Variant): Announcement | null {
  if (isEmptyValue(v.value) || !v.value?.message || !visibleText(v.value.message)) return null;
  const x = v.value;
  const o: Announcement = { ...a, layout: (x.layout as Announcement["layout"]) ?? a.layout, message: sanitizeRich(x.message), linkText: x.linkText ?? a.linkText, linkUrl: x.linkUrl ?? a.linkUrl, theme: (x.theme as Announcement["theme"]) ?? a.theme };
  if (!isThemeKey(o.theme)) o.theme = a.theme;
  if (o.theme === "custom") { const c = normColors({ bg: x.cBg, fg: x.cFg, cta: x.cCta, close: x.cClose }) ?? a.colors; if (c) o.colors = c; else { o.theme = "surface"; delete o.colors; } } else delete o.colors;
  o.shadow = isShadow(x.shadow) ? x.shadow : a.shadow;
  const sc = normHex(x.shadowColor); if (sc) o.shadowColor = sc; else if (!x.shadowColor) { /* inherit */ } else delete o.shadowColor;
  if (x.title) o.title = x.title; else delete o.title;
  const tm = timerFromValue(x, a.timer, o.layout);
  if (tm) o.timer = tm; else delete o.timer;
  if (timerOver(o.timer, Date.now())) return null;
  return o;
}

type Out = { pub: PublicAnnouncement; src: Announcement; priv: boolean };

/**
 * Public read of the announcements that may show now (highest priority first). The browser picks one for the page and visitor.
 * `announcement` is the top one (kept for older clients). If a running split test is attached to a bar, the visitor's sticky variant decides what they see.
 */
export async function GET(req: Request) {
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
    const site = siteKeyForHost(host);
    if (!site) return none();
    const live = await liveAnnouncements(site);
    if (!live.length) return none();
    const exps = await getExperiments(site);
    const jar = Object.fromEntries((req.headers.get("cookie") ?? "").split(/;\s*/).map((p) => { const i = p.indexOf("="); return [p.slice(0, i), p.slice(i + 1)]; }));
    let cookie = parseExpCookie(jar[EXP_COOKIE]), newCookie: string | undefined;
    const outs: Out[] = [];
    for (const a of live) {
      const exp = exps.find((e) => e.id === (a.testId ?? testIdFor(a.id)));
      if (!exp || exp.slotType !== "announcement" || exp.status === "draft" || exp.status === "paused") { outs.push({ pub: toPublic(a), src: a, priv: false }); continue; }
      if (exp.status === "won") { const shown = fromVariant(a, defaultVariant(exp)); if (shown) outs.push({ pub: toPublic(shown), src: shown, priv: false }); continue; }
      // Running test: sticky per-visitor assignment through the existing engine (bots, GPC and DNT get the control, untracked).
      const res = assign(exp, {
        ua: req.headers.get("user-agent"), privacy: privacySignal(req.headers), admin: false, optedOut: jar[EXP_OFF_COOKIE] === "1",
        cookie, newVisitorId: () => crypto.randomUUID(),
      });
      if (res.cookie) { newCookie = res.cookie; cookie = parseExpCookie(res.cookie); }
      const shown = fromVariant(a, res.variant);
      if (shown) outs.push({ pub: toPublic(shown, res.track ? exp.id : undefined), src: shown, priv: true });
    }
    const anyPriv = outs.some((o) => o.priv);
    const body = { announcement: outs[0]?.pub ?? null, announcements: outs.map((o) => o.pub) };
    const cache = anyPriv ? "private, no-store" : cacheFor(outs.find((o) => o.src.timer)?.src, "public, s-maxage=30, stale-while-revalidate=60");
    const out = NextResponse.json(body, { headers: { "Cache-Control": outs.length ? cache : "public, s-maxage=30, stale-while-revalidate=60" } });
    if (newCookie) out.cookies.set(EXP_COOKIE, newCookie, { maxAge: EXP_MAX_AGE, path: "/", sameSite: "lax", secure: new URL(req.url).protocol === "https:", httpOnly: true });
    return out;
  } catch { return none(false); }
}
export type ActiveResponse = { announcement: PublicAnnouncement | null; announcements?: PublicAnnouncement[] };
