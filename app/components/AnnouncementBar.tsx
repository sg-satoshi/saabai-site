"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { THEMES, isDismissed, pageAllowed, type PublicAnnouncement } from "@/lib/announce/core";

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
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef<string>("");

  useEffect(() => {
    if (!OWNED_HOST.test(window.location.hostname)) return;
    let dead = false;
    fetch("/api/announcement/active", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (!dead && j?.announcement) setAnn(j.announcement); }).catch(() => {});
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

  const close = () => { if (ann) writeStored(ann); setShow(false); };
  useEffect(() => {
    if (!show) return;
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  });

  if (!ann || !show) return null;
  const t = THEMES[ann.theme] ?? THEMES.surface;
  const onLink = () => { if (ann.expId) beacon(ann.linkUrl.startsWith("tel:") ? "call_click" : "cta_click", ann.expId); };
  const link = ann.linkText && ann.linkUrl ? (
    <a href={ann.linkUrl} onClick={onLink} className="sb-ann-cta" style={{ color: t.fg, borderColor: t.accent }}>{ann.linkText}</a>
  ) : null;
  const closeBtn = (
    <button type="button" onClick={close} aria-label="Close announcement" className="sb-ann-close" style={{ color: t.fg }}><span aria-hidden="true">×</span></button>
  );

  return (
    <>
      <style>{CSS}</style>
      {ann.layout === "card" ? (
        <div ref={ref} role="dialog" aria-label="Announcement" aria-modal="false" className="sb-ann sb-ann-card" style={{ background: t.bg, color: t.fg, borderColor: t.border }}>
          {closeBtn}
          {ann.title ? <p className="sb-ann-title">{ann.title}</p> : null}
          <p className="sb-ann-msg">{ann.message}</p>
          {link}
        </div>
      ) : (
        <div ref={ref} role="region" aria-label="Announcement" className={`sb-ann sb-ann-${ann.layout}`} style={{ background: t.bg, color: t.fg, borderColor: t.border }}>
          <p className="sb-ann-msg">{ann.message}</p>
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
.sb-ann a:focus-visible,.sb-ann button:focus-visible{outline:2px solid #62c5d1;outline-offset:4px}
.sb-ann-close{flex:none;width:44px;height:44px;background:transparent;border:0;cursor:pointer;font-size:24px;line-height:1;display:inline-flex;align-items:center;justify-content:center}
.sb-ann-card{right:24px;bottom:24px;width:380px;max-width:calc(100vw - 16px);padding:24px;border:1px solid;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:12px;align-items:flex-start}
.sb-ann-card .sb-ann-close{position:absolute;top:4px;right:4px}
.sb-ann-title{margin:0;padding-right:36px;font-size:18px;line-height:24px;font-weight:600}
html[data-ann-top] body{padding-top:var(--ann-h)}
html[data-ann-top] nav.fixed.top-0{top:var(--ann-h)}
@media (max-width:767px){
  .sb-ann-top,.sb-ann-bottom{padding:6px 4px 6px 16px;gap:8px}
  .sb-ann-msg{font-size:14px;line-height:20px}
  .sb-ann-bottom{bottom:64px}
  .sb-ann-card{left:8px;right:8px;bottom:72px;width:auto;max-height:45vh;overflow:auto}
}
@keyframes sbAnnIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.sb-ann{animation:none}}
`;
