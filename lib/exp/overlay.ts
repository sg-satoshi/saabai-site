import { isLegalPath, isProtectedText } from "./editor";
import { SLOT_KINDS, type Experiment, type SlotKind } from "./core";

/**
 * Runtime overlay for split tests that have no code wrapper (yet). Edge-safe and pure.
 *
 * How it works: the proxy assigns visitors exactly like native slots (same sb_exp cookie, same experiment id) and
 * hands the page a short-lived first-party cookie (sb_ov) naming the elements to change. A tiny inline head script
 * hides only those elements until the client component (ExpOverlay) has applied the variant after hydration.
 * The HTML crawlers and AI bots fetch is always the control. If the element has since been wrapped natively
 * (data-exp-id present) the overlay steps aside, so the switch to a native slot changes nothing for visitors.
 */
export const OV_COOKIE = "sb_ov";
export const OV_MAX_COOKIE = 3200;
export const OV_MAX_PER_PAGE = 6;
export const SELECTOR_RE = /^[a-z0-9#_\-:>() .]{1,300}$/i;
export const AF_TIMEOUT_MS = 2500;

/** One element in the sb_ov cookie. x/e are the variant copy and are omitted for the control (nothing to change). */
export type OvItem = { i: string; s: string; f: string; t: string; k: SlotKind; l: string; a: string; x?: string; e?: string };
export type OvPayload = { p: string; o: OvItem[] };

export const pageKey = (p: string) => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p);

/** Lower-case, collapsed whitespace, first 120 chars. The element's identity when markup shifts. */
export const fingerprint = (t: string): string => t.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toLowerCase().slice(0, 120);

export function similarity(a: string, b: string): number {
  const A = new Set(fingerprint(a).split(" ").filter(Boolean)), B = new Set(fingerprint(b).split(" ").filter(Boolean));
  if (!A.size || !B.size) return 0;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return n / (A.size + B.size - n);
}

/** Pages overlays may touch: public pages only. Never legal pages, admin, API or customer sites. */
export function overlayPathOk(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//") || /[\s<>"'`?#]/.test(path)) return false;
  if (/\.\w+$/.test(path) || /^\/(?:api|_next|sites|saabai-admin|admin|login|portal|mission-control|rex-|edge|pulse|atlas)/.test(path)) return false;
  return !isLegalPath(path);
}

export const isOverlayExp = (e: Experiment): boolean => !!e.overlay && SELECTOR_RE.test(e.overlay.sel) && !isProtectedText(e.overlay.fp);

/** Overlay tests (running or won) not yet wrapped in code (a slot in seed.ts wins as soon as it ships). */
export function liveOverlays(exps: Experiment[], nativeIds: Set<string>, path: string): Experiment[] {
  return exps.filter((e) => e.path === path && (e.status === "running" || e.status === "won") && isOverlayExp(e) && !nativeIds.has(e.id));
}

/** Builds the cookie value. Drops items (never truncates) to stay under the size cap. Null when nothing to send. */
export function encodeOverlay(path: string, exps: Experiment[], assigned: Record<string, string>): string | null {
  const items: OvItem[] = [];
  for (const e of exps.slice(0, OV_MAX_PER_PAGE)) {
    const won = e.status === "won";
    const vid = won ? e.defaultVariantId : assigned[e.id];
    const v = vid ? e.variants.find((x) => x.id === vid && x.active) : undefined;
    if (!v) continue;
    const ctl = e.variants.find((x) => x.id === "a") ?? e.variants[0]; // the page's own copy is always the original, variant a
    const it: OvItem = { i: e.id, s: e.overlay!.sel, f: e.overlay!.fp, t: e.overlay!.tag, k: e.kind ?? "headline", l: e.slot, a: v.id };
    if (v.id !== ctl.id) { it.x = v.text; if (v.emphasis) it.e = v.emphasis; }
    items.push(it);
  }
  while (items.length) {
    const val = encodeURIComponent(JSON.stringify({ p: path, o: items } satisfies OvPayload));
    if (val.length <= OV_MAX_COOKIE) return val;
    items.pop();
  }
  return null;
}

/** Defensive parse, used by the browser. Anything odd returns null. */
export function decodeOverlay(raw: string | null | undefined): OvPayload | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(decodeURIComponent(raw));
    if (!o || typeof o.p !== "string" || !Array.isArray(o.o)) return null;
    const out: OvItem[] = [];
    for (const it of o.o.slice(0, OV_MAX_PER_PAGE)) {
      if (!it || typeof it.i !== "string" || typeof it.s !== "string" || !SELECTOR_RE.test(it.s) || typeof it.f !== "string" || typeof it.t !== "string" || !/^[a-z0-9]{1,8}$/.test(it.t)) continue;
      if (!SLOT_KINDS.includes(it.k) || typeof it.l !== "string" || typeof it.a !== "string") continue;
      if (it.x !== undefined && (typeof it.x !== "string" || it.x.length > 300)) continue;
      if (it.e !== undefined && (typeof it.e !== "string" || it.e.length > 300)) continue;
      if (/[\u2013\u2014]/.test((it.x ?? "") + (it.e ?? ""))) continue;
      out.push(it as OvItem);
    }
    return { p: o.p, o: out };
  } catch { return null; }
}

/** Inline head script source: hides only the targeted elements (non-control variants) until the overlay has applied. */
export const ANTI_FLICKER_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${OV_COOKIE}=([^;]+)/);if(!m)return;var o=JSON.parse(decodeURIComponent(m[1])),p=location.pathname;if(p.length>1&&p.slice(-1)=="/")p=p.slice(0,-1);if(o.p!==p)return;var re=/^[a-z0-9#_\\-:>() .]{1,300}$/i,c=[];for(var i=0;i<o.o.length;i++){var t=o.o[i];if(t.x&&re.test(t.s))c.push("html.sb-af "+t.s)}if(!c.length)return;var s=document.createElement("style");s.id="sb-af-style";s.textContent=c.join(",")+"{visibility:hidden!important}";document.head.appendChild(s);document.documentElement.classList.add("sb-af");setTimeout(function(){document.documentElement.classList.remove("sb-af")},${AF_TIMEOUT_MS})}catch(e){}})();`;

/** Decide where an element can be targeted. Pure: given what the DOM scan found, pick one or none. */
export type Cand = { text: string; viaSelector: boolean };
export function chooseTarget(fp: string, cands: Cand[]): number {
  const exactSel = cands.map((c, i) => ({ c, i })).filter((x) => x.c.viaSelector && fingerprint(x.c.text) === fp);
  if (exactSel.length === 1) return exactSel[0].i;
  const exact = cands.map((c, i) => ({ c, i })).filter((x) => fingerprint(x.c.text) === fp);
  if (exact.length === 1) return exact[0].i;
  const near = cands.map((c, i) => ({ c, i })).filter((x) => x.c.viaSelector && similarity(x.c.text, fp) >= 0.6);
  return near.length === 1 ? near[0].i : -1;
}
