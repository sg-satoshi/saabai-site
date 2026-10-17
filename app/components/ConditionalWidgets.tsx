"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ChatWidget from "./ChatWidget";
import MobileCtaBar from "./MobileCtaBar";
import NewsTicker from "./NewsTicker";
import { isFocusedFormPath } from "@/lib/focused-paths";
import { showsSaabaiChrome } from "@/lib/client-site-surface";

// Saabai pages where Mia, the mobile CTA and the news ticker stay off.
// Client sites are not listed here: showsSaabaiChrome reads the site registry.
const SUPPRESS_PATHS = [
  "/mission-control", "/lex-widget",
  // Lex platform — has its own full-page experience
  "/lex", "/client-portal", "/legal",
  // Blueprint buyer portal: private, focused, no sales widgets
  "/portal",
  // Focused Blueprint flows: no chat or sticky bars
  "/score", "/blueprint/checkout", "/blueprint/confirmation",
  // Client feedback and unsubscribe: focused, no sales widgets
  "/testimonial", "/unsubscribe",
  // Admin pages have their own nav
  "/login", "/saabai-admin",
  // LeadGen — has its own dedicated widget
  "/leadgen", "/leadgen-widget",
];

// Pages where the NewsTicker/Signal bar should be hidden
const SUPPRESS_TICKER_PATHS = ["/leadgen-widget"];

export default function ConditionalWidgets() {
  const pathname = usePathname();
  // null until mounted: on custom client hosts the server sees the rewritten path
  // (/sites/slug) but the browser sees the public path, so rendering before we
  // know the host caused a hydration mismatch (#418) and a stray Mia avatar request.
  const [hostname, setHostname] = useState<string | null>(null);

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  if (hostname === null) return null;

  const suppress =
    !showsSaabaiChrome(hostname, pathname) ||
    SUPPRESS_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    // Blueprint fact-find: paid customers, no sales widgets
    isFocusedFormPath(pathname);

  if (suppress) return null;

  const suppressTicker = SUPPRESS_TICKER_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  return (
    <>
      <ChatWidget />
      <MobileCtaBar />
      {!suppressTicker && <NewsTicker />}
    </>
  );
}
