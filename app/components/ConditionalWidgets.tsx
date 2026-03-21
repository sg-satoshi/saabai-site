"use client";

import { usePathname } from "next/navigation";
import ChatWidget from "./ChatWidget";
import MobileCtaBar from "./MobileCtaBar";
import NewsTicker from "./NewsTicker";

// Pages where Mia (ChatWidget) should be suppressed — they have their own experience
const SUPPRESS_PATHS = ["/onboarding/plon"];

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
