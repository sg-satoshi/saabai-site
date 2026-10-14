"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { GA_ID, gaEvent, gaHostMode, gaPathAllowed } from "../../lib/ga";

/**
 * Loads GA4 only on saabai.ai (and this project's Vercel previews in debug mode).
 * Never on client custom domains or /sites/*. Admin/portal paths are excluded:
 * GA's own opt-out flag is flipped on those routes so even client-side navigation
 * into them sends nothing.
 */
export default function GoogleAnalytics() {
  const pathname = usePathname() || "/";
  const mode = useSyncExternalStore(
    () => () => {},
    () => gaHostMode(window.location.hostname),
    () => null,
  );
  const allowed = gaPathAllowed(pathname);

  // Opt out on excluded paths; opt back in elsewhere.
  useEffect(() => {
    if (!mode) return;
    (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = !allowed;
  }, [mode, allowed]);

  // booking_click: any Calendly link click on tracked pages.
  useEffect(() => {
    if (!mode) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (a && /calendly\.com/i.test(a.href)) {
        gaEvent("booking_click", { link_url: a.href, link_text: (a.textContent || "").trim().slice(0, 60), page_path: window.location.pathname });
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [mode]);

  // Render only on a saabai host and a trackable path. Once loaded, next/script keeps
  // the tag (deduped by id); the opt-out flag above silences excluded routes.
  if (!mode || !allowed) return null;
  const debug = mode === "preview";
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}'${debug ? ",{debug_mode:true}" : ""});`}
      </Script>
    </>
  );
}
