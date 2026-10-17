/**
 * Announcement bar: pure logic (edge-safe, no Node-only imports).
 * Phase 1: top bar (A), bottom bar (B), slide-in card (C). No email opt-in yet (depends on Feature 0).
 * Nothing renders unless the site flag `announcements_enabled` is on AND an announcement is live.
 */
export const OWNED_SITES = ["saabai"] as const;
export type OwnedSite = (typeof OWNED_SITES)[number];
export const isOwnedSite = (s: unknown): s is OwnedSite => typeof s === "string" && (OWNED_SITES as readonly string[]).includes(s);

export const LAYOUTS = ["top", "bottom", "card"] as const;
export type Layout = (typeof LAYOUTS)[number];
export const STATUSES = ["draft", "scheduled", "live", "ended"] as const;
export type AnnStatus = (typeof STATUSES)[number];
export const DEVICES = ["all", "desktop", "mobile"] as const;
export type Device = (typeof DEVICES)[number];
export const RESHOW = ["never", "days", "session"] as const;
export type Reshow = (typeof RESHOW)[number];

/**
 * Themes. `bg`/`fg` are the bar surface and text, `cta` is the button fill (`ctaFg` its text), `close` the close icon.
 * Brand themes follow the site; alert themes are meant to stand out from it. "custom" uses admin-picked hex colours.
 * Every preset passes WCAG AA (4.5:1) for text and 3:1 for the button and close icon (see tests).
 */
export type ThemeColors = { bg: string; fg: string; cta: string; ctaFg: string; close: string; border: string };
export const THEMES = {
  surface: { label: "Brand: Surface", group: "brand", bg: "#14123a", fg: "#ffffff", cta: "#62c5d1", ctaFg: "#0b092e", close: "#ffffff", border: "rgba(98,197,209,.22)" },
  navy: { label: "Brand: Navy", group: "brand", bg: "#0b092e", fg: "#ffffff", cta: "#62c5d1", ctaFg: "#0b092e", close: "#ffffff", border: "rgba(98,197,209,.22)" },
  teal: { label: "Brand: Teal", group: "brand", bg: "#62c5d1", fg: "#0b092e", cta: "#0b092e", ctaFg: "#ffffff", close: "#0b092e", border: "rgba(11,9,46,.25)" },
  alert_red: { label: "Alert red (white text)", group: "alert", bg: "#b91c1c", fg: "#ffffff", cta: "#ffffff", ctaFg: "#991b1b", close: "#ffffff", border: "rgba(255,255,255,.3)" },
  warning: { label: "Warning yellow (dark text)", group: "alert", bg: "#fbbf24", fg: "#1c1400", cta: "#1c1400", ctaFg: "#fde68a", close: "#1c1400", border: "rgba(28,20,0,.3)" },
  success: { label: "Success green (white text)", group: "alert", bg: "#15803d", fg: "#ffffff", cta: "#ffffff", ctaFg: "#14532d", close: "#ffffff", border: "rgba(255,255,255,.3)" },
  high_contrast: { label: "Black and white (high contrast)", group: "alert", bg: "#000000", fg: "#ffffff", cta: "#ffffff", ctaFg: "#000000", close: "#ffffff", border: "rgba(255,255,255,.4)" },
  yellow_on_dark: { label: "Yellow text on dark", group: "alert", bg: "#111111", fg: "#ffe14d", cta: "#ffe14d", ctaFg: "#111111", close: "#ffe14d", border: "rgba(255,225,77,.4)" },
} as const;
export type PresetKey = keyof typeof THEMES;
export const CUSTOM_THEME = "custom" as const;
export type ThemeKey = PresetKey | typeof CUSTOM_THEME;
export const isThemeKey = (t: unknown): t is ThemeKey => typeof t === "string" && (t === CUSTOM_THEME || Object.prototype.hasOwnProperty.call(THEMES, t));

/** Custom colours: exactly four hex values. */
export type CustomColors = { bg: string; fg: string; cta: string; close: string };
export const COLOR_KEYS = ["bg", "fg", "cta", "close"] as const;
export const DEFAULT_CUSTOM: CustomColors = { bg: "#dc2626", fg: "#ffffff", cta: "#ffffff", close: "#ffffff" };

/** Strict hex check. Accepts #rgb or #rrggbb and returns lowercase #rrggbb, or null. Nothing else ever reaches CSS. */
export function normHex(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(v.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return "#" + h.toLowerCase();
}
export function normColors(v: unknown): CustomColors | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const out: Partial<CustomColors> = {};
  for (const k of COLOR_KEYS) { const h = normHex(o[k]); if (!h) return null; out[k] = h; }
  return out as CustomColors;
}

/** Black or white, whichever reads best on `bg`. */
export function bestText(bg: string): "#000000" | "#ffffff" {
  return contrast("#000000", bg) >= contrast("#ffffff", bg) ? "#000000" : "#ffffff";
}

export const SHADOWS = ["none", "soft", "strong"] as const;
export type Shadow = (typeof SHADOWS)[number];
export const isShadow = (v: unknown): v is Shadow => typeof v === "string" && (SHADOWS as readonly string[]).includes(v);
/** CSS box-shadow for a layout. `color` must already be a validated hex (anything else falls back to black). */
export function shadowCss(layout: string, shadow: string | undefined, color?: string): string {
  if (!isShadow(shadow) || shadow === "none") return "none";
  const hex = normHex(color) ?? "#000000";
  const n = parseInt(hex.slice(1), 16);
  const rgba = (a: number) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  const strong = shadow === "strong";
  const y = layout === "top" ? 1 : layout === "bottom" ? -1 : 0.5;
  const blur = strong ? 28 : 14, off = strong ? 10 : 4;
  return `0 ${Math.round(y * off)}px ${blur}px ${rgba(strong ? 0.55 : 0.25)}`;
}

/** Final colours for rendering. Unknown themes fall back to Surface. Custom colours are re-validated here. */
export function resolveTheme(theme: string, colors?: unknown): ThemeColors {
  if (theme === CUSTOM_THEME) {
    const c = normColors(colors);
    if (c) return { bg: c.bg, fg: c.fg, cta: c.cta, ctaFg: bestText(c.cta), close: c.close, border: "rgba(128,128,128,.4)" };
    return THEMES.surface;
  }
  return isThemeKey(theme) && theme !== CUSTOM_THEME ? THEMES[theme] : THEMES.surface;
}

export const MIN_BLOCK = 3, MIN_WARN = 4.5;
export type ContrastCheck = { key: string; label: string; ratio: number; level: "ok" | "warn" | "block"; suggest?: "#000000" | "#ffffff" };
/** Live contrast report used by the admin and by server validation. Text must reach 4.5 (warn) and 3 (block). */
export function checkColors(t: ThemeColors): ContrastCheck[] {
  const row = (key: string, label: string, fg: string, bg: string, text: boolean): ContrastCheck => {
    const ratio = contrast(fg, bg);
    const level = ratio < MIN_BLOCK ? "block" : text && ratio < MIN_WARN ? "warn" : "ok";
    return { key, label, ratio, level, ...(level !== "ok" ? { suggest: bestText(bg) } : {}) };
  };
  return [
    row("fg", "Text on background", t.fg, t.bg, true),
    row("ctaFg", "Button text on button", t.ctaFg, t.cta, true),
    row("cta", "Button against background", t.cta, t.bg, false),
    row("close", "Close icon on background", t.close, t.bg, false),
  ];
}

export const DEFAULT_EXCLUDES = ["/checkout", "/checkout/*", "/blueprint/pay*", "/blueprint/checkout*", "/admin", "/admin/*", "/saabai-admin", "/saabai-admin/*", "/unsubscribe", "/unsubscribe/*", "/privacy", "/terms"];

export type Announcement = {
  id: string;
  siteKey: string;
  name: string;
  status: AnnStatus;
  layout: Layout;
  /** Bar message (max 120). For the card this is the body (max 140). */
  message: string;
  /** Card title (max 60). */
  title?: string;
  linkText: string;
  linkUrl: string;
  theme: ThemeKey;
  /** Only when theme is "custom". Validated hex values. */
  colors?: CustomColors;
  /** Drop shadow strength and optional hex colour (default black). */
  shadow?: Shadow;
  shadowColor?: string;
  /** ISO UTC. Admin enters Australia/Brisbane; stored as UTC. */
  startsAt?: string;
  endsAt?: string;
  include: string[];
  exclude: string[];
  device: Device;
  reshow: Reshow;
  reshowDays: number;
  /** Seconds. Card default 8. */
  delaySec: number;
  /** Scroll percent that triggers the card. Card default 40. */
  scrollPct: number;
  /** Bumped when message, title, link or layout changes. Re-shows to everyone. */
  version: number;
  /** Linked split test (experiment id), if any. */
  testId?: string;
  createdAt: string;
  updatedAt: string;
};

export const LIMITS = { name: 80, message: 120, cardBody: 140, title: 60, link: 40, url: 300 };

export function contrast(fg: string, bg: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const a = lum(fg), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Link must be a site path, https URL, tel: or mailto:. Never javascript: or data:. */
export function safeUrl(u: string): boolean {
  if (!u || u.length > LIMITS.url) return false;
  if (/^\/(?!\/)[A-Za-z0-9_\-./?=&#%+:~]*$/.test(u)) return true;
  if (/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?(\/[^\s]*)?$/.test(u)) return true;
  if (/^tel:\+?[0-9 ()-]{6,20}$/.test(u)) return true;
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u)) return true;
  return false;
}
const PATTERN_RE = /^\/[A-Za-z0-9_\-./*]*$/;
const noDash = (s: string) => !/[\u2013\u2014]/.test(s);
const tidy = (s: unknown) => (typeof s === "string" ? s.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim() : "");
const isIso = (s: unknown) => typeof s === "string" && !Number.isNaN(Date.parse(s));

/** Path matcher: exact, or a trailing "*" wildcard ("/blog/*", "/blueprint/pay*"). */
export function pathMatches(pattern: string, path: string): boolean {
  const p = path.split("?")[0].split("#")[0].replace(/(.)\/+$/, "$1") || "/";
  if (pattern === "*" || pattern === "/*") return true;
  if (pattern.endsWith("*")) {
    const base = pattern.slice(0, -1);
    if (base.endsWith("/")) return p === base.slice(0, -1) || p.startsWith(base);
    return p.startsWith(base);
  }
  return p === (pattern.replace(/(.)\/+$/, "$1") || "/");
}
export function pageAllowed(a: Pick<Announcement, "include" | "exclude">, path: string): boolean {
  if (DEFAULT_EXCLUDES.some((x) => pathMatches(x, path))) return false;
  if (a.exclude.some((x) => pathMatches(x, path))) return false;
  if (a.include.length && !a.include.some((x) => pathMatches(x, path))) return false;
  return true;
}

/** Whether the announcement is live right now (status plus schedule). "draft" and "ended" never show. */
export function isLiveNow(a: Pick<Announcement, "status" | "startsAt" | "endsAt">, now: Date = new Date()): boolean {
  if (a.status !== "live" && a.status !== "scheduled") return false;
  const t = now.getTime();
  if (a.status === "scheduled" && !a.startsAt) return false;
  if (a.startsAt && t < Date.parse(a.startsAt)) return false;
  if (a.endsAt && t >= Date.parse(a.endsAt)) return false;
  return true;
}

export type Input = Partial<Announcement> & { id?: string };
export type Checked = { ok: true; value: Announcement } | { ok: false; error: string };

/** Validates and normalises an announcement. `prev` is the stored version (to bump `version` on content change). */
export function validateAnnouncement(input: Input, prev: Announcement | null, now: Date = new Date()): Checked {
  const bad = (error: string): Checked => ({ ok: false, error });
  const id = prev?.id ?? tidy(input.id).toLowerCase();
  if (!/^[a-z0-9-]{3,32}$/.test(id)) return bad("Use 3 to 32 lowercase letters, numbers or dashes for the id.");
  const siteKey = prev?.siteKey ?? input.siteKey ?? "saabai";
  if (!isOwnedSite(siteKey)) return bad("Announcements are only available on Saabai-owned sites.");
  const name = tidy(input.name ?? prev?.name);
  if (!name || name.length > LIMITS.name) return bad(`Give it a name (up to ${LIMITS.name} characters).`);
  const layout = (input.layout ?? prev?.layout ?? "top") as Layout;
  if (!LAYOUTS.includes(layout)) return bad("Unknown layout.");
  const message = tidy(input.message ?? prev?.message);
  const max = layout === "card" ? LIMITS.cardBody : LIMITS.message;
  if (!message || message.length > max) return bad(`The message needs 1 to ${max} characters.`);
  const title = tidy(input.title ?? prev?.title);
  if (layout === "card" && (!title || title.length > LIMITS.title)) return bad(`The card needs a title of up to ${LIMITS.title} characters.`);
  if (title.length > LIMITS.title) return bad(`Keep the title under ${LIMITS.title} characters.`);
  const linkText = tidy(input.linkText ?? prev?.linkText), linkUrl = tidy(input.linkUrl ?? prev?.linkUrl);
  if ((linkText && !linkUrl) || (!linkText && linkUrl)) return bad("Add both the link text and the link URL, or neither.");
  if (linkText.length > LIMITS.link) return bad(`Keep the link text under ${LIMITS.link} characters.`);
  if (linkUrl && !safeUrl(linkUrl)) return bad("The link must be a site path (/book), an https URL, tel: or mailto:.");
  if (!noDash(name + message + title + linkText)) return bad("Please avoid long dashes (en and em dashes). Use a comma or full stop instead.");
  const theme = (input.theme ?? prev?.theme ?? "surface") as ThemeKey;
  if (!isThemeKey(theme)) return bad("Pick one of the listed themes.");
  let colors: CustomColors | undefined;
  if (theme === CUSTOM_THEME) {
    colors = normColors(input.colors ?? prev?.colors) ?? undefined;
    if (!colors) return bad("Custom colours must be hex values like #dc2626 for background, text, button and close icon.");
  }
  const worst = checkColors(resolveTheme(theme, colors)).find((c) => c.level === "block");
  if (worst) return bad(`${worst.label} has a contrast of ${worst.ratio.toFixed(1)}:1. It must be at least ${MIN_BLOCK}:1 (aim for ${MIN_WARN}:1) so people can read it.`);
  const shadow = (input.shadow ?? prev?.shadow ?? (layout === "card" ? "soft" : "none")) as Shadow;
  if (!isShadow(shadow)) return bad("Shadow must be none, soft or strong.");
  const rawSc = input.shadowColor === "" ? undefined : (input.shadowColor ?? prev?.shadowColor);
  const shadowColor = rawSc === undefined ? undefined : (normHex(rawSc) ?? null);
  if (shadowColor === null) return bad("Shadow colour must be a hex value like #000000.");
  const status = (input.status ?? prev?.status ?? "draft") as AnnStatus;
  if (!STATUSES.includes(status)) return bad("Unknown status.");
  const startsAt = input.startsAt === "" ? undefined : (input.startsAt ?? prev?.startsAt);
  const endsAt = input.endsAt === "" ? undefined : (input.endsAt ?? prev?.endsAt);
  if (startsAt !== undefined && !isIso(startsAt)) return bad("Start date is not valid.");
  if (endsAt !== undefined && !isIso(endsAt)) return bad("End date is not valid.");
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) return bad("The end must be after the start.");
  const list = (v: unknown, fallback: string[]) => (Array.isArray(v) ? v : fallback).map(tidy).filter(Boolean);
  const include = list(input.include, prev?.include ?? []), exclude = list(input.exclude, prev?.exclude ?? []);
  if (include.length > 30 || exclude.length > 30 || [...include, ...exclude].some((p) => !PATTERN_RE.test(p) || p.length > 120)) return bad("Page rules must be paths like /pricing or /blog/* (max 30 each).");
  const device = (input.device ?? prev?.device ?? "all") as Device;
  if (!DEVICES.includes(device)) return bad("Unknown device setting.");
  const reshow = (input.reshow ?? prev?.reshow ?? (layout === "card" ? "days" : "days")) as Reshow;
  if (!RESHOW.includes(reshow)) return bad("Unknown re-show rule.");
  const reshowDays = Math.round(Number(input.reshowDays ?? prev?.reshowDays ?? (layout === "card" ? 14 : 7)));
  if (!(reshowDays >= 1 && reshowDays <= 365)) return bad("Re-show days must be 1 to 365.");
  const delaySec = Math.round(Number(input.delaySec ?? prev?.delaySec ?? (layout === "card" ? 8 : 0)));
  const scrollPct = Math.round(Number(input.scrollPct ?? prev?.scrollPct ?? (layout === "card" ? 40 : 0)));
  if (!(delaySec >= 0 && delaySec <= 120) || !(scrollPct >= 0 && scrollPct <= 100)) return bad("Delay is 0 to 120 seconds and scroll is 0 to 100 percent.");
  if (status === "live" && layout === "card" && delaySec === 0 && scrollPct === 0) return bad("A slide-in card needs a delay or a scroll trigger so it never shows on first paint.");
  const contentChanged = !prev || prev.message !== message || prev.title !== (title || undefined) || prev.linkUrl !== linkUrl || prev.linkText !== linkText || prev.layout !== layout;
  const value: Announcement = {
    id, siteKey, name, status, layout, message, ...(title ? { title } : {}), linkText, linkUrl, theme, ...(colors ? { colors } : {}), shadow, ...(shadowColor ? { shadowColor } : {}),
    ...(startsAt ? { startsAt } : {}), ...(endsAt ? { endsAt } : {}), include, exclude, device, reshow, reshowDays, delaySec, scrollPct,
    version: prev ? prev.version + (contentChanged ? 1 : 0) : 1,
    ...(prev?.testId ? { testId: prev.testId } : {}),
    createdAt: prev?.createdAt ?? now.toISOString(), updatedAt: now.toISOString(),
  };
  return { ok: true, value };
}

/** What a browser needs to render. Never includes admin-only fields. */
export type PublicAnnouncement = Pick<Announcement, "id" | "layout" | "message" | "title" | "linkText" | "linkUrl" | "theme" | "colors" | "shadow" | "shadowColor" | "device" | "reshow" | "reshowDays" | "delaySec" | "scrollPct" | "version" | "include" | "exclude"> & { expId?: string };
export const toPublic = (a: Announcement, expId?: string): PublicAnnouncement => ({
  id: a.id, layout: a.layout, message: a.message, ...(a.title ? { title: a.title } : {}), linkText: a.linkText, linkUrl: a.linkUrl, theme: a.theme, ...(a.theme === CUSTOM_THEME && a.colors ? { colors: a.colors } : {}), shadow: a.shadow ?? "none", ...(a.shadowColor ? { shadowColor: a.shadowColor } : {}), device: a.device,
  reshow: a.reshow, reshowDays: a.reshowDays, delaySec: a.delaySec, scrollPct: a.scrollPct, version: a.version, include: a.include, exclude: a.exclude, ...(expId ? { expId } : {}),
});

/** Client-side dismissal check. `stored` is the timestamp (ms) saved when closed, or null. */
export function isDismissed(a: Pick<PublicAnnouncement, "reshow" | "reshowDays">, stored: number | null, now = Date.now()): boolean {
  if (stored === null) return false;
  if (a.reshow === "never") return true;
  if (a.reshow === "session") return false; // session dismissals use sessionStorage, handled by the caller
  return now - stored < a.reshowDays * 86400_000;
}

// ---- Split test mapping (existing engine, new 'announcement' slot type) ----
export const testIdFor = (annId: string) => `ann-${annId}`.slice(0, 48);
export const GOALS = ["call_click", "form_submit", "cta_click"] as const;
export type Goal = (typeof GOALS)[number];
export const MIN_TEST_DAYS = 14;

/** Flat string map stored in Variant.value (the engine allows string values up to 300 chars each). Empty object = no bar. */
export function announcementValue(a: Pick<Announcement, "layout" | "message" | "title" | "linkText" | "linkUrl" | "theme" | "colors" | "shadow" | "shadowColor">): Record<string, string> {
  return { layout: a.layout, message: a.message, ...(a.title ? { title: a.title } : {}), linkText: a.linkText, linkUrl: a.linkUrl, theme: a.theme, ...(a.theme === CUSTOM_THEME && a.colors ? { cBg: a.colors.bg, cFg: a.colors.fg, cCta: a.colors.cta, cClose: a.colors.close } : {}), ...(a.shadow ? { shadow: a.shadow } : {}), ...(a.shadowColor ? { shadowColor: a.shadowColor } : {}) };
}
export const isEmptyValue = (v: Record<string, string> | undefined) => !v || Object.keys(v).length === 0;
