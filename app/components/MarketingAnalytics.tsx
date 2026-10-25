"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  CALENDLY_WIDGET_CSS,
  CALENDLY_WIDGET_SRC,
  calendlyClickAction,
  calendlyPopupUrl,
} from "../../lib/marketing/calendly";
import {
  isCalendlyScheduledMessage,
  marketingHostMode,
  marketingPathAllowed,
  metaPixelId,
  telClickUrl,
  viewContentFor,
} from "../../lib/marketing/public";
import {
  trackMarketingPageView,
  trackMarketingPhoneClick,
  trackMarketingSchedule,
  trackMarketingViewContent,
} from "../../lib/marketing/browser";

type CalendlyWindow = Window & {
  Calendly?: { initPopupWidget: (opts: { url: string }) => void };
  __saabaiCalendlyFailed?: boolean;
};

/**
 * Meta pixel (NEXT_PUBLIC_META_PIXEL_ID) and extra GA4 events on the tag
 * already loaded by GoogleAnalytics. No second gtag. The pixel renders nothing
 * when its env var is unset. Booking links open Calendly's popup.
 * saabai.ai and this project's Vercel previews only. Never admin, portal, or /sites.
 */
export default function MarketingAnalytics() {
  const pathname = usePathname() || "/";
  const mode = useSyncExternalStore(
    () => () => {},
    () => marketingHostMode(window.location.hostname),
    () => null,
  );
  const allowed = marketingPathAllowed(pathname);
  const active = !!mode && allowed;
  const sawPage = useRef(false);

  useEffect(() => {
    if (!active) return;
    // The existing GA config already sent the first page_view. Later route changes still count.
    const skipGa = !sawPage.current;
    sawPage.current = true;
    trackMarketingPageView(pathname, { skipGa });
    const content = viewContentFor(pathname, window.location.search);
    if (content) trackMarketingViewContent(content);
  }, [active, pathname]);

  useEffect(() => {
    if (!active) return;
    const onMessage = (event: MessageEvent) => {
      if (isCalendlyScheduledMessage(event.origin, event.data)) trackMarketingSchedule();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const url = calendlyPopupUrl(anchor.href);
      const w = window as CalendlyWindow;
      const action = calendlyClickAction({
        href: anchor.href,
        button: event.button,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        defaultPrevented: event.defaultPrevented,
        widgetReady: typeof w.Calendly?.initPopupWidget === "function",
        widgetFailed: !!w.__saabaiCalendlyFailed,
      });
      if (action === "native" || !url) return;
      event.preventDefault();
      ensureCalendlyCss();
      if (action === "popup") {
        w.Calendly?.initPopupWidget({ url });
        return;
      }
      waitForCalendly().then((ready) => {
        const live = window as CalendlyWindow;
        if (ready && live.Calendly?.initPopupWidget) {
          live.Calendly.initPopupWidget({ url });
          return;
        }
        window.open(url, "_blank", "noopener,noreferrer");
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const url = telClickUrl(anchor.href);
      if (!url) return;
      trackMarketingPhoneClick(url);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [active]);

  if (!active) return null;
  const pixelId = metaPixelId();

  return (
    <>
      <Script
        id="saabai-calendly-widget"
        src={CALENDLY_WIDGET_SRC}
        strategy="lazyOnload"
        onLoad={() => ensureCalendlyCss()}
        onError={() => { (window as CalendlyWindow).__saabaiCalendlyFailed = true; }}
      />
      {pixelId && (
        <Script id="saabai-meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');window.__saabaiPixel=1;`}
        </Script>
      )}
    </>
  );
}

function ensureCalendlyCss(): void {
  if (typeof document === "undefined") return;
  if (document.querySelector("link[data-saabai-calendly]")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = CALENDLY_WIDGET_CSS;
  link.dataset.saabaiCalendly = "1";
  document.head.appendChild(link);
}

function waitForCalendly(): Promise<boolean> {
  const w = window as CalendlyWindow;
  if (typeof w.Calendly?.initPopupWidget === "function") return Promise.resolve(true);
  if (w.__saabaiCalendlyFailed) return Promise.resolve(false);
  return new Promise((resolve) => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      const live = window as CalendlyWindow;
      if (typeof live.Calendly?.initPopupWidget === "function") {
        window.clearInterval(timer);
        resolve(true);
        return;
      }
      if (live.__saabaiCalendlyFailed || Date.now() - started > 8000) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, 200);
  });
}
