"use client";
import { useEffect } from "react";

/**
 * Tiny first-party beacon: impression when the headline is visible, plus cta_click and call_click via
 * data-exp-event attributes and tel: links. No third parties. Skips automation and privacy signals.
 */
export default function ExpBeacon({ exp, slot, scope = "page" }: { exp: string; slot?: string; scope?: "page" | "slot" }) {
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
    const slotEl = document.querySelector(slot ? `[data-exp-slot="${slot}"]` : "[data-exp-slot]");
    let io: IntersectionObserver | undefined;
    const seenKey = `sb_exp_imp_${exp}`;
    if (slotEl && !sessionStorage.getItem(seenKey)) {
      io = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting)) { sessionStorage.setItem(seenKey, "1"); send("impression"); io?.disconnect(); }
      }, { threshold: 0.5 });
      io.observe(slotEl);
    }
    const onClick = (ev: MouseEvent) => {
      const el = (ev.target as Element | null)?.closest?.("a,button");
      if (!el) return;
      // "slot" scope: a click only counts when it is on the tested element itself (a button test).
      const inScope = scope === "page" || (!!slotEl && (el === slotEl || slotEl.contains(el)));
      const tag = el.getAttribute("data-exp-event");
      const href = el.getAttribute("href") || "";
      if (tag === "cta_click" && inScope) send("cta_click");
      else if (tag === "call_click" || href.startsWith("tel:")) send("call_click");
    };
    document.addEventListener("click", onClick, true);
    return () => { io?.disconnect(); document.removeEventListener("click", onClick, true); };
  }, [exp, slot, scope]);
  return null;
}
