"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CLICK_KINDS, IMAGE_PATH_RE } from "@/lib/exp/core";
import { OV_COOKIE, decodeOverlay, fingerprint, pageKey, type OvItem } from "@/lib/exp/overlay";
import { findTarget, sigOf } from "@/lib/exp/overlay-dom";
import { captureOrig, previewInto } from "@/lib/exp/editor-dom";
import { showsSaabaiChrome } from "@/lib/client-site-surface";
import ExpBeacon from "./ExpBeacon";

/**
 * Applies runtime-overlay variants after hydration (changing server-rendered text before React hydrates would cause a
 * hydration mismatch). The inline head script hides the targeted elements until this has run. Renders nothing visible.
 * Steps aside for any test already wrapped natively (data-exp-id present), so a merged wrap PR changes nothing for visitors.
 */
export default function ExpOverlay() {
  const pathname = usePathname();
  const [live, setLive] = useState<OvItem[]>([]);

  useEffect(() => {
    const done = () => document.documentElement.classList.remove("sb-af");
    if (!showsSaabaiChrome(window.location.hostname, pathname)) { done(); setLive([]); return; }
    const m = document.cookie.match(new RegExp(`(?:^|; )${OV_COOKIE}=([^;]+)`));
    const payload = decodeOverlay(m?.[1]);
    if (!payload || payload.p !== pageKey(pathname)) { done(); setLive([]); return; }
    const cleanups: Array<() => void> = [];
    const applied: OvItem[] = [];
    for (const it of payload.o) {
      try {
        if (document.querySelector(`[data-exp-id="${CSS.escape(it.i)}"]`)) continue; // native slot wins
        const el = findTarget(document, it);
        if (!el) continue;
        const orig = captureOrig(el);
        const want = it.x === undefined ? null : { text: it.x, emphasis: it.e };
        if (it.k === "image" && want && !IMAGE_PATH_RE.test(want.text)) continue;
        const apply = () => { previewInto(el, orig, it.k, want); };
        const before = sigOf(el);
        if (want) apply();
        el.setAttribute("data-exp-slot", it.l);
        el.setAttribute("data-exp-id", it.i);
        el.setAttribute("data-exp-variant", it.a);
        el.setAttribute("data-exp-kind", it.k);
        el.setAttribute("data-exp-overlay", "1");
        if (CLICK_KINDS.includes(it.k) && !el.hasAttribute("data-exp-event")) el.setAttribute("data-exp-event", "cta_click");
        applied.push(it);
        if (want) {
          // If the app re-renders the element and drops our copy, re-apply (bounded, so it can never loop).
          let n = 0, busy = false;
          const target = fingerprint(sigOf(el));
          const mo = new MutationObserver(() => {
            if (busy || n >= 3 || fingerprint(sigOf(el)) === target || fingerprint(sigOf(el)) !== fingerprint(before)) return;
            busy = true; n++; apply(); setTimeout(() => { busy = false; }, 0);
          });
          mo.observe(el, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["src", "placeholder"] });
          cleanups.push(() => { mo.disconnect(); previewInto(el, orig, it.k, null); ["data-exp-slot", "data-exp-id", "data-exp-variant", "data-exp-kind", "data-exp-overlay"].forEach((a) => el.removeAttribute(a)); });
        } else {
          cleanups.push(() => ["data-exp-slot", "data-exp-id", "data-exp-variant", "data-exp-kind", "data-exp-overlay"].forEach((a) => el.removeAttribute(a)));
        }
      } catch { /* one bad target never affects the page */ }
    }
    setLive(applied);
    done();
    return () => { cleanups.forEach((c) => c()); setLive([]); };
  }, [pathname]);

  return <>{live.map((it) => <ExpBeacon key={it.i} exp={it.i} slot={it.l} scope={CLICK_KINDS.includes(it.k) ? "slot" : "page"} />)}</>;
}
