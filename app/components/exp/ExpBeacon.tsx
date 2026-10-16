"use client";
import { useEffect } from "react";

/**
 * Tiny first-party beacon: impression when the headline is visible, plus cta_click and call_click via
 * data-exp-event attributes and tel: links. No third parties. Skips automation and privacy signals.
 */
export default function ExpBeacon({ exp }: { exp: string }) {
  useEffect(() => {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.webdriver || nav.globalPrivacyControl || nav.doNotTrack === "1") return;
    const send = (type: string) => {
      const body = JSON.stringify({ type, exp });
      try {
        if (!navigator.sendBeacon?.("/api/exp/event", new Blob([body], { type: "application/json" }))) {
          void fetch("/api/exp/event", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
        }
      } catch { /* ignore */ }
    };
    const slot = document.querySelector("[data-exp-slot]");
    let io: IntersectionObserver | undefined;
    const seenKey = `sb_exp_imp_${exp}`;
    if (slot && !sessionStorage.getItem(seenKey)) {
      io = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting)) { sessionStorage.setItem(seenKey, "1"); send("impression"); io?.disconnect(); }
      }, { threshold: 0.5 });
      io.observe(slot);
    }
    const onClick = (ev: MouseEvent) => {
      const el = (ev.target as Element | null)?.closest?.("a,button");
      if (!el) return;
      const tag = el.getAttribute("data-exp-event");
      const href = el.getAttribute("href") || "";
      if (tag === "cta_click") send("cta_click");
      else if (tag === "call_click" || href.startsWith("tel:")) send("call_click");
    };
    document.addEventListener("click", onClick, true);
    return () => { io?.disconnect(); document.removeEventListener("click", onClick, true); };
  }, [exp]);
  return null;
}
