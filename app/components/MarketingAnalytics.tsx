"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import {
  ga4MeasurementId,
  isCalendlyScheduledMessage,
  marketingBrowserOn,
  marketingHostMode,
  marketingPathAllowed,
  marketingSeparateGa4,
  metaPixelId,
  viewContentFor,
} from "../../lib/marketing/public";
import {
  trackMarketingPageView,
  trackMarketingSchedule,
  trackMarketingViewContent,
} from "../../lib/marketing/browser";

/**
 * GA4 (NEXT_PUBLIC_GA4_ID) and the Meta pixel (NEXT_PUBLIC_META_PIXEL_ID).
 * Loads only on saabai.ai and this project's Vercel previews, and never on
 * admin, portal, or /sites paths. Renders nothing when the env vars are unset.
 */
export default function MarketingAnalytics() {
  const pathname = usePathname() || "/";
  const mode = useSyncExternalStore(
    () => () => {},
    () => marketingHostMode(window.location.hostname),
    () => null,
  );
  const allowed = marketingPathAllowed(pathname);
  const active = !!mode && allowed && marketingBrowserOn();

  useEffect(() => {
    if (!active) return;
    const first = !window.__saabaiMarketingNav;
    window.__saabaiMarketingNav = true;
    // The existing GA tag already sent the first page_view when it is the same property.
    const skipSharedGa = first && !!ga4MeasurementId() && !marketingSeparateGa4();
    trackMarketingPageView(pathname, { skipGa: skipSharedGa });
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

  if (!active) return null;
  const debug = mode === "preview";
  const separateGa = marketingSeparateGa4();
  const ga4Id = ga4MeasurementId();
  const pixelId = metaPixelId();

  return (
    <>
      {separateGa && ga4Id && (
        <>
          <Script id="saabai-ga4-stub" strategy="afterInteractive">
            {`window.saabaiMarketingLayer=window.saabaiMarketingLayer||[];window.saabaiGtag=function(){window.saabaiMarketingLayer.push(arguments);};window.saabaiGtag('js',new Date());window.saabaiGtag('config','${ga4Id}',{send_page_view:false${debug ? ",debug_mode:true" : ""}});`}
          </Script>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}&l=saabaiMarketingLayer`} strategy="afterInteractive" />
        </>
      )}
      {pixelId && (
        <Script id="saabai-meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');window.__saabaiPixel=1;`}
        </Script>
      )}
    </>
  );
}

declare global {
  interface Window {
    __saabaiMarketingNav?: boolean;
  }
}
