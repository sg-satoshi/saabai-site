"use client";
/**
 * Mounts Lex Assist only for signed-in Lex users on app screens (not sign-in or signup).
 * GET /api/lex-help is auth-gated (401 signed out). The panel itself is swappable: replace HelpAssistant
 * with the Designer build; it receives the signed-in firm's own context.
 */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import HelpAssistant from "./HelpAssistant";

const PUBLIC = /^\/lex\/(signup|login|sign-in|reset|forgot|accept)/;

export default function HelpAssistantMount() {
  const path = usePathname() ?? "";
  const isPublic = PUBLIC.test(path);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (isPublic) return;
    let live = true;
    fetch("/api/lex-help", { credentials: "same-origin" })
      .then((r) => { if (live) setSignedIn(r.ok); })
      .catch(() => { if (live) setSignedIn(false); });
    return () => { live = false; };
  }, [isPublic]);
  if (isPublic || !signedIn) return null;
  return <HelpAssistant />;
}
