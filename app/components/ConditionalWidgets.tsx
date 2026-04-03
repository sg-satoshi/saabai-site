"use client";

import { usePathname } from "next/navigation";
import ChatWidget from "./ChatWidget";
import MobileCtaBar from "./MobileCtaBar";
import NewsTicker from "./NewsTicker";

// Pages where Mia (ChatWidget) should be suppressed — they have their own experience
const SUPPRESS_PATHS = [
  "/onboarding/plon", "/mission-control", "/plon", "/rex-widget",
  // Client portal — admin pages have their own nav
  "/rex-dashboard", "/rex-analytics", "/rex-changelog", "/login", "/saabai-admin",
];

export default function ConditionalWidgets() {
  const pathname = usePathname();
  const suppress = SUPPRESS_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (suppress) return null;

  return (
    <>
      <ChatWidget />
      <MobileCtaBar />
      <NewsTicker />
    </>
  );
}
