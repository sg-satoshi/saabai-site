"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import AnnouncementTimer, { TIMER_CSS } from "./AnnouncementTimer";
import { shadowCss, resolveTheme, isDismissed, pageAllowed, type PublicAnnouncement } from "@/lib/announce/core";

const OWNED_HOST = /^(?:www\.)?saabai\.ai$|\.vercel\.app$|^localhost$/i;
const storeKey = (a: PublicAnnouncement) => `sb_ann_${a.id}_v${a.version}`;

function readStored(a: PublicAnnouncement): number | null {
  try {
    const s = a.reshow === "session" ? sessionStorage : localStorage;
    const v = s.getItem(storeKey(a));
    if (v) return Number(v) || Date.now();
  } catch { /* storage blocked: fall back to cookie */ }
  const m = document.cookie.split("; ").find((c) => c.startsWith(storeKey(a) + "="));
  return m ? Number(m.split("=")[1]) || Date.now() : null;
}
function writeStored(a: PublicAnnouncement) {
  const now = String(Date.now());
  try { (a.reshow === "session" ? sessionStorage : localStorage).setItem(storeKey(a), now); return; } catch { /* use cookie */ }
  document.cookie = `${storeKey(a)}=${now}; Max-Age=${Math.max(1, a.reshowDays) * 86400}; Path=/; SameSite=Lax`;
}
function beacon(type: string, exp: string) {
  try { navigator.sendBeacon("/api/exp/event", new Blob([JSON.stringify({ type, exp })], { type: "application/json" })); } catch { /* ignore */ }
}

/**
 * Site announcement (top bar, bottom bar or slide-in card). Renders nothing unless the server says an announcement is live
 * for this page and device. Admin only: the flag defaults off and only Saabai-owned sites can enable it.
 */
export default function AnnouncementBar() {
  const path = usePathname() || "/";
  const [ann, setAnn] = useState<PublicAnnouncement | null>(null);
  const [show, setShow] = useState(false);
  const [mobile, setMobile] = useState(false);
  // Timer: offset = server clock minus device clock. `ended` flips when the deadline is reached (or the server says so).
  const [offset, setOffset] = useState(0);
  const [ended, setEnded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef<string>("");

  useEffect(() => {
    if (!OWNED_HOST.test(window.location.hostname)) return;
    let dead = false;
    const t0 = Date.now();
    fetch("/api/announcement/active", { credentials: "same-origin", cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (dead || !j?.announcement) return;
      const t = j.announcement.timer;
      if (t) { setOffset(t.serverNow - (t0 + Date.now()) / 2); setEnded(!!t.expired); }
      setAnn(j.announcement);
    }).catch(() => {});
    return () => { dead = true; };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const f = () => setMobile(mq.matches);
    f(); mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  const eligible = !!ann && pageAllowed(ann, path) && (ann.device === "all" || (ann.device === "mobile") === mobile);

  useEffect(() => {
    setShow(false);
    if (!ann || !eligible || isDismissed(ann, readStored(ann))) return;
    if (ann.layout !== "card") { setShow(true); return; }
    // Card: after a delay or scroll depth, never on first paint.
    let done = false;
    const go = () => { if (!done) { done = true; setShow(true); cleanup(); } };
    const t = ann.delaySec > 0 ? window.setTimeout(go, ann.delaySec * 1000) : undefined;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (ann.scrollPct > 0 && max > 0 && (window.scrollY / max) * 100 >= ann.scrollPct) go();
    };
    if (ann.scrollPct > 0) window.addEventListener("scroll", onScroll, { passive: true });
    const cleanup = () => { if (t) clearTimeout(t); window.removeEventListener("scroll", onScroll); };
    return cleanup;
  }, [ann, eligible, path]);

  // Top bar pushes the page down: publish its height and shift the fixed nav.
  useEffect(() => {
    const el = document.documentElement;
    if (!show || !ann || ann.layout !== "top" || !ref.current) { el.removeAttribute("data-ann-top"); el.style.removeProperty("--ann-h"); return; }
    const set = () => { el.style.setProperty("--ann-h", `${ref.current?.offsetHeight ?? 0}px`); el.setAttribute("data-ann-top", "1"); };
    set();
    const ro = new ResizeObserver(set); ro.observe(ref.current);
    return () => { ro.disconnect(); el.removeAttribute("data-ann-top"); el.style.removeProperty("--ann-h"); };
  }, [show, ann]);

  // Mobile bottom bar: hide if the stack with the sticky call bar would exceed 25% of the viewport.
  useEffect(() => {
    if (show && ann?.layout === "bottom" && mobile && ref.current && (ref.current.offsetHeight + 64) / window.innerHeight > 0.25) ref.current.style.display = "none";
  }, [show, ann, mobile]);

  // Impression once per visitor per day (only when the engine says this visitor is a counted participant).
  useEffect(() => {
    if (!show || !ann?.expId) return;
    const k = `sb_ann_imp_${ann.expId}_${new Date().toISOString().slice(0, 10)}`;
    try { if (localStorage.getItem(k)) return; localStorage.setItem(k, "1"); } catch { if (seen.current === k) return; seen.current = k; }
    beacon("impression", ann.expId);
  }, [show, ann]);

  // Deadline reached on this device: swap or hide straight away, then ask the server (the authority) to confirm.
  // If the device clock was off and the server says it isn't over, correct the offset and keep counting.
  const onEnd = () => {
    if (!ann?.timer) return;
    const confirm = (tries: number) => {
      fetch("/api/announcement/active", { credentials: "same-origin", cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => {
        if (!j) return;
        if (!j.announcement) { setShow(false); return; }
        const t = j.announcement.timer;
        if (t && !t.expired) { setEnded(false); setOffset(t.serverNow - Date.now()); if (tries < 3) window.setTimeout(() => confirm(tries + 1), 3000); }
      }).catch(() => {});
    };
    if (ann.timer.endMode === "hide") setShow(false); else setEnded(true);
    confirm(0);
  };

  const close = () => { if (ann) writeStored(ann); setShow(false); };
  useEffect(() => {
    if (!show) return;
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  });

  if (!ann || !show) return null;
  const tm = ann.timer;
  const over = !!tm && (tm.expired || ended);
  const endSwap = over && tm?.endMode === "message" && !!tm.endMessage;
  const view: PublicAnnouncement = endSwap && tm ? { ...ann, message: tm.endMessage as string, linkText: tm.endLinkText ?? "", linkUrl: tm.endLinkUrl ?? "" } : ann;
  const timerEl = tm && !over ? <AnnouncementTimer endAt={tm.endAt} offset={offset} style={tm.style} colors={resolveTheme(ann.theme, ann.colors)} onEnd={onEnd} /> : null;
  const t = resolveTheme(ann.theme, ann.colors);
  const onLink = () => { if (ann.expId) beacon(view.linkUrl.startsWith("tel:") ? "call_click" : "cta_click", ann.expId); };
  const link = view.linkText && view.linkUrl ? (
    <a href={view.linkUrl} onClick={onLink} className="sb-ann-cta" style={{ color: t.ctaFg, background: t.cta, borderColor: t.cta }}>{view.linkText}</a>
  ) : null;
  const closeBtn = (
    <button type="button" onClick={close} aria-label="Close announcement" className="sb-ann-close" style={{ color: t.close }}><span aria-hidden="true">×</span></button>
  );

  return (
    <>
      <style>{CSS + TIMER_CSS}</style>
      {ann.layout === "card" ? (
        <div ref={ref} role="dialog" aria-label="Announcement" aria-modal="false" className={`sb-ann sb-ann-card${timerEl ? " sb-ann-has-timer" : ""}`} style={{ background: t.bg, color: t.fg, borderColor: t.border, boxShadow: shadowCss(ann.layout, ann.shadow, ann.shadowColor) }}>
          {closeBtn}
          {ann.title ? <p className="sb-ann-title">{ann.title}</p> : null}
          <p className="sb-ann-msg" aria-live="polite" aria-atomic="true">{view.message}</p>
          {timerEl}
          {link}
        </div>
      ) : (
        <div ref={ref} role="region" aria-label="Announcement" className={`sb-ann sb-ann-${ann.layout}${timerEl ? " sb-ann-has-timer" : ""}`} style={{ background: t.bg, color: t.fg, borderColor: t.border, boxShadow: shadowCss(ann.layout, ann.shadow, ann.shadowColor) }}>
          <p className="sb-ann-msg" aria-live="polite" aria-atomic="true">{view.message}</p>
          {timerEl}
          {link}
          {closeBtn}
        </div>
      )}
    </>
  );
}

const CSS = `
.sb-ann{position:fixed;z-index:60;font-family:var(--font-inter,Inter,system-ui,sans-serif);animation:sbAnnIn .2s ease-out}
.sb-ann-top,.sb-ann-bottom{left:0;right:0;display:flex;align-items:center;justify-content:center;gap:16px;min-height:56px;padding:6px 8px 6px 32px;border:0 solid}
.sb-ann-top{top:0;border-bottom-width:1px}
.sb-ann-bottom{bottom:0;border-top-width:1px}
.sb-ann-msg{margin:0;font-size:15px;line-height:22px}
.sb-ann-cta{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border:1px solid;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;white-space:nowrap}
.sb-ann-cta:hover{filter:brightness(.92)}
.sb-ann-cta:hover{text-decoration:underline}
/* Two-tone ring (white inside, black outside) is visible on any background colour. */
.sb-ann a:focus-visible,.sb-ann button:focus-visible{outline:2px solid #fff;outline-offset:0;box-shadow:0 0 0 4px #000}
.sb-ann-close{flex:none;width:44px;height:44px;background:transparent;border:0;cursor:pointer;font-size:24px;line-height:1;display:inline-flex;align-items:center;justify-content:center}
.sb-ann-card{right:24px;bottom:24px;width:380px;max-width:calc(100vw - 16px);padding:24px;border:1px solid;border-radius:16px;display:flex;flex-direction:column;gap:12px;align-items:flex-start}
.sb-ann-card .sb-ann-close{position:absolute;top:4px;right:4px}
.sb-ann-title{margin:0;padding-right:36px;font-size:18px;line-height:24px;font-weight:600}
html[data-ann-top] body{padding-top:var(--ann-h)}
html[data-ann-top]{scroll-padding-top:var(--ann-h)}
html[data-ann-top] nav.fixed.top-0{top:var(--ann-h)}
html[data-ann-top] [id]{scroll-margin-top:calc(var(--ann-h) + 96px)}
@media (max-width:767px){
  .sb-ann-top,.sb-ann-bottom{padding:6px 4px 6px 16px;gap:8px}
  .sb-ann-msg{font-size:14px;line-height:20px}
  .sb-ann-bottom{bottom:64px}
  .sb-ann-top.sb-ann-has-timer,.sb-ann-bottom.sb-ann-has-timer{flex-wrap:wrap;row-gap:4px;padding:6px 48px 6px 12px}
  .sb-ann-has-timer.sb-ann-top .sb-ann-close,.sb-ann-has-timer.sb-ann-bottom .sb-ann-close{position:absolute;top:0;right:0}
  .sb-ann-has-timer .sb-ann-cta{min-height:40px}
  .sb-ann-card{left:8px;right:8px;bottom:72px;width:auto;max-height:45vh;overflow:auto}
}
@keyframes sbAnnIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.sb-ann{animation:none}}
`;
