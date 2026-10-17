"use client";

import type { Ref } from "react";
import AnnouncementTimer, { TIMER_CSS } from "./AnnouncementTimer";
import { shadowCss, resolveTheme, type PublicAnnouncement } from "@/lib/announce/core";

/**
 * Presentational announcement (top bar, bottom bar or slide-in card). Used by the public bar and by the admin live
 * preview, so what admins see is the real component. It has no side effects: no fetching, storage or tracking.
 * `preview` makes links inert. `ended` shows the timer end state (message swap) without waiting for the deadline.
 */
export default function AnnouncementView({ ann, ended, offset, onEnd, onClose, onCta, innerRef, preview }: { ann: PublicAnnouncement; ended: boolean; offset: number; onEnd?: () => void; onClose: () => void; onCta?: (url: string) => void; innerRef?: Ref<HTMLDivElement>; preview?: boolean }) {
  const tm = ann.timer;
  const over = !!tm && (tm.expired || ended);
  const endSwap = over && tm?.endMode === "message" && !!tm.endMessage;
  const view: PublicAnnouncement = endSwap && tm ? { ...ann, message: tm.endMessage as string, linkText: tm.endLinkText ?? "", linkUrl: tm.endLinkUrl ?? "" } : ann;
  const t = resolveTheme(ann.theme, ann.colors);
  const timerEl = tm && !over ? <AnnouncementTimer endAt={tm.endAt} offset={offset} style={tm.style} colors={t} onEnd={onEnd} /> : null;
  const link = view.linkText && view.linkUrl ? (
    <a href={view.linkUrl} onClick={(e) => { if (preview) { e.preventDefault(); return; } onCta?.(view.linkUrl); }} className="sb-ann-cta" style={{ color: t.ctaFg, background: t.cta, borderColor: t.cta }}>{view.linkText}</a>
  ) : null;
  const closeBtn = (
    <button type="button" onClick={onClose} aria-label="Close announcement" className="sb-ann-close" style={{ color: t.close }}><span aria-hidden="true">×</span></button>
  );
  const shadow = shadowCss(ann.layout, ann.shadow, ann.shadowColor);
  return (
    <>
      <style>{CSS + TIMER_CSS}</style>
      {ann.layout === "card" ? (
        <div ref={innerRef} role="dialog" aria-label="Announcement" aria-modal="false" className={`sb-ann sb-ann-card${timerEl ? " sb-ann-has-timer" : ""}`} style={{ background: t.bg, color: t.fg, borderColor: t.border, boxShadow: shadow }}>
          {closeBtn}
          {ann.title ? <p className="sb-ann-title">{ann.title}</p> : null}
          <p className="sb-ann-msg" aria-live="polite" aria-atomic="true">{view.message}</p>
          {timerEl}
          {link}
        </div>
      ) : (
        <div ref={innerRef} role="region" aria-label="Announcement" className={`sb-ann sb-ann-${ann.layout}${timerEl ? " sb-ann-has-timer" : ""}`} style={{ background: t.bg, color: t.fg, borderColor: t.border, boxShadow: shadow }}>
          <p className="sb-ann-msg" aria-live="polite" aria-atomic="true">{view.message}</p>
          {timerEl}
          {link}
          {closeBtn}
        </div>
      )}
    </>
  );
}

export const CSS = `
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
