"use client";

import { useEffect, useState } from "react";
import { brisbaneText, timerColors, timerUnits, type ThemeColors, type TimerStyle } from "@/lib/announce/core";

/**
 * Fixed-deadline countdown. Digits always come from (deadline - corrected now), never from a per-visitor start time.
 * `offset` = serverNow - deviceNow, so a wrong device clock still counts to the real deadline.
 * Only ever rendered after the announcement was fetched on the client (the bar renders nothing on the server),
 * so there is no server HTML to mismatch. `fixedMs` freezes the display (admin preview, screenshots).
 */
export default function AnnouncementTimer({ endAt, offset, style, colors, fixedMs, onEnd }: { endAt: string; offset: number; style: TimerStyle; colors: ThemeColors; fixedMs?: number; onEnd?: () => void }) {
  const end = Date.parse(endAt);
  const left = () => (fixedMs !== undefined ? fixedMs : end - (Date.now() + offset));
  const [ms, setMs] = useState<number>(left);
  useEffect(() => {
    if (fixedMs !== undefined) { setMs(fixedMs); return; }
    let done = false;
    const tick = () => { const v = end - (Date.now() + offset); setMs(v); if (v <= 0 && !done) { done = true; clearInterval(id); onEnd?.(); } };
    const id = window.setInterval(tick, 1000);
    tick();
    const vis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end, offset, fixedMs]);

  const c = timerColors(colors);
  const units = timerUnits(ms);
  const vars = { "--t-text": c.text, "--t-box": c.box, "--t-digit": c.digit, "--t-line": c.line } as React.CSSProperties;
  // Static label for assistive tech. The ticking digits are aria-hidden and the region never announces updates.
  const label = `Countdown, ends ${brisbaneText(endAt)} Brisbane time`;

  let body: React.ReactNode;
  if (style === "text") {
    body = <span className="sb-t-textline" suppressHydrationWarning>Ends in {units.map((u) => `${u.value}${u.short}`).join(" ")}</span>;
  } else if (style === "pill") {
    const parts = units.filter((u) => u.key !== "d").map((u) => u.value).join(":");
    const d = units[0].key === "d" ? `${units[0].value}d ` : "";
    body = <span className="sb-t-pill" suppressHydrationWarning>{d}{parts}</span>;
  } else {
    body = (
      <span className={`sb-t-cells sb-t-${style}`}>
        {units.map((u) => (
          <span className="sb-t-unit" key={u.key}>
            <span className="sb-t-digits" suppressHydrationWarning>
              {u.value.split("").map((ch, i) => (
                <span className="sb-t-digit" key={i}><span className="sb-t-face" key={style === "flip" ? ch : "x"}>{ch}</span></span>
              ))}
            </span>
            <span className="sb-t-label">{u.label}</span>
          </span>
        ))}
      </span>
    );
  }
  return <span role="timer" aria-live="off" aria-label={label} className={`sb-t sb-t-s-${style}`} style={vars}><span aria-hidden="true" className="sb-t-in">{body}</span></span>;
}

export const TIMER_CSS = `
.sb-t{display:inline-flex;flex:none;font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1;color:var(--t-text)}
.sb-t-in{display:inline-flex}
.sb-t-textline{font-size:15px;line-height:22px;font-weight:600;white-space:nowrap}
.sb-t-pill{display:inline-flex;align-items:center;min-height:32px;padding:0 14px;border:2px solid var(--t-text);border-radius:999px;font-size:15px;font-weight:700;letter-spacing:.02em;white-space:nowrap}
.sb-t-cells{display:inline-flex;gap:8px;align-items:flex-start}
.sb-t-unit{display:inline-flex;flex-direction:column;align-items:center;gap:2px}
.sb-t-digits{display:inline-flex;gap:3px}
.sb-t-digit{position:relative;display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:36px;border-radius:6px;background:var(--t-box);color:var(--t-digit);font-size:20px;font-weight:700;line-height:1;perspective:200px;overflow:hidden}
.sb-t-boxed .sb-t-digit{min-width:22px}
.sb-t-flip .sb-t-digit::after{content:"";position:absolute;left:0;right:0;top:50%;height:2px;margin-top:-1px;background:var(--t-line);opacity:.55;pointer-events:none}
.sb-t-face{display:inline-block}
.sb-t-label{font-size:10px;line-height:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em}
@media (prefers-reduced-motion:no-preference){
  .sb-t-flip .sb-t-face{animation:sbTFlip .45s ease-out;transform-origin:50% 50%}
}
@keyframes sbTFlip{0%{transform:rotateX(-90deg);opacity:.2}60%{transform:rotateX(12deg);opacity:1}100%{transform:none}}
@media (max-width:767px){
  .sb-t-textline,.sb-t-pill{font-size:14px}
  .sb-t-pill{min-height:28px;padding:0 12px}
  .sb-t-cells{gap:6px}
  .sb-t-digit{min-width:20px;height:30px;font-size:17px}
  .sb-t-boxed .sb-t-digit{min-width:19px}
}
`;
