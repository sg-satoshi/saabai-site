"use client";

import { usePathname } from "next/navigation";
import ChatWidget from "./ChatWidget";
import MobileCtaBar from "./MobileCtaBar";
import NewsTicker from "./NewsTicker";

// Pages where Mia (ChatWidget) should be suppressed — they have their own experience
const SUPPRESS_PATHS = [
  "/onboarding/plon", "/mission-control", "/plon", "/rex-widget", "/lex-widget",
  // Lex platform — has its own full-page experience
  "/lex", "/client-portal", "/legal",
  // Admin pages have their own nav
  "/rex-dashboard", "/rex-analytics", "/rex-changelog", "/login", "/saabai-admin",
  // Client demo sites — their own experience
  "/sites/tributum-law-v2",
  "/sites/bo-consultancy",
  // LeadGen — has its own dedicated widget
  "/leadgen", "/leadgen-widget",
];

// Pages where the NewsTicker/Signal bar should be hidden
const SUPPRESS_TICKER_PATHS = ["/for-law-firms", "/leadgen-widget", "/sites/bo-consultancy"];

export default function ConditionalWidgets() {
  const pathname = usePathname();
  const suppress = SUPPRESS_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

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
