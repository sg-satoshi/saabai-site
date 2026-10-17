import { NextResponse } from "next/server";
import { EXP_COOKIE, EXP_MAX_AGE, EXP_OFF_COOKIE, assign, parseExpCookie, privacySignal, siteKeyForHost, defaultVariant, type Variant } from "@/lib/exp/core";
import { getExperiments } from "@/lib/exp/config";
import { isShadow, normHex, isEmptyValue, isThemeKey, normColors, testIdFor, toPublic, type Announcement, type PublicAnnouncement } from "@/lib/announce/core";
import { liveAnnouncement } from "@/lib/announce/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const none = (cache = true) => NextResponse.json({ announcement: null }, { headers: { "Cache-Control": cache ? "public, s-maxage=30, stale-while-revalidate=60" : "no-store" } });

function fromVariant(a: Announcement, v: Variant): Announcement | null {
  if (isEmptyValue(v.value) || !v.value?.message) return null;
  const x = v.value;
  const o: Announcement = { ...a, layout: (x.layout as Announcement["layout"]) ?? a.layout, message: x.message, linkText: x.linkText ?? a.linkText, linkUrl: x.linkUrl ?? a.linkUrl, theme: (x.theme as Announcement["theme"]) ?? a.theme };
  if (!isThemeKey(o.theme)) o.theme = a.theme;
  if (o.theme === "custom") { const c = normColors({ bg: x.cBg, fg: x.cFg, cta: x.cCta, close: x.cClose }) ?? a.colors; if (c) o.colors = c; else { o.theme = "surface"; delete o.colors; } } else delete o.colors;
  o.shadow = isShadow(x.shadow) ? x.shadow : a.shadow;
  const sc = normHex(x.shadowColor); if (sc) o.shadowColor = sc; else if (!x.shadowColor) { /* inherit */ } else delete o.shadowColor;
  if (x.title) o.title = x.title; else delete o.title;
  return o;
}

/**
 * Public read of the single announcement that may show now. Returns null unless the site flag is on, the host is Saabai-owned
 * and an announcement is live. If a running split test is attached, the visitor's sticky variant decides what they see.
 */
export async function GET(req: Request) {
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
    const site = siteKeyForHost(host);
    if (!site) return none();
    const a = await liveAnnouncement(site);
    if (!a) return none();
    const exp = (await getExperiments(site)).find((e) => e.id === (a.testId ?? testIdFor(a.id)));
    if (!exp || exp.slotType !== "announcement" || exp.status === "draft" || exp.status === "paused") return NextResponse.json({ announcement: toPublic(a) }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
    if (exp.status === "won") {
      const shown = fromVariant(a, defaultVariant(exp));
      return NextResponse.json({ announcement: shown ? toPublic(shown) : null }, { headers: { "Cache-Control": "public, s-maxage=30" } });
    }
    // Running test: sticky per-visitor assignment through the existing engine (bots, GPC and DNT get the control, untracked).
    const jar = Object.fromEntries((req.headers.get("cookie") ?? "").split(/;\s*/).map((p) => { const i = p.indexOf("="); return [p.slice(0, i), p.slice(i + 1)]; }));
    const res = assign(exp, {
      ua: req.headers.get("user-agent"), privacy: privacySignal(req.headers), admin: false, optedOut: jar[EXP_OFF_COOKIE] === "1",
      cookie: parseExpCookie(jar[EXP_COOKIE]), newVisitorId: () => crypto.randomUUID(),
    });
    const shown = fromVariant(a, res.variant);
    const out = NextResponse.json({ announcement: shown ? toPublic(shown, res.track ? exp.id : undefined) : null }, { headers: { "Cache-Control": "private, no-store" } });
    if (res.cookie) out.cookies.set(EXP_COOKIE, res.cookie, { maxAge: EXP_MAX_AGE, path: "/", sameSite: "lax", secure: new URL(req.url).protocol === "https:", httpOnly: true });
    return out;
  } catch { return none(false); }
}
export type ActiveResponse = { announcement: PublicAnnouncement | null };
