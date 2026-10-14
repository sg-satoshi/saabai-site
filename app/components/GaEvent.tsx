"use client";

import { useEffect } from "react";
import { gaEvent, gaEventOnce } from "../../lib/ga";

/** Fire a GA4 event once on mount (from server-rendered pages). */
export default function GaEvent({ name, params, onceKey }: { name: string; params?: Record<string, unknown>; onceKey?: string }) {
  useEffect(() => {
    // gtag loads afterInteractive; retry briefly until it exists.
    let tries = 0;
    const t = setInterval(() => {
      const w = window as unknown as { gtag?: unknown };
      if (w.gtag || ++tries > 20) {
        clearInterval(t);
        if (onceKey) gaEventOnce(onceKey, name, params); else gaEvent(name, params);
      }
    }, 250);
    return () => clearInterval(t);
  }, [name, onceKey, params]);
  return null;
}
