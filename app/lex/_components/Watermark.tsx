"use client";
/** Faint tiled watermark (firm name + your email) over the Lex portal content. Light mode; pointer-events off. */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { showWatermark, watermarkBackground, watermarkText } from "@/lib/lex-watermark";

type Me = { status?: string; firmName?: string; me?: string | null };
export default function Watermark() {
  const path = usePathname() ?? "";
  const onSignup = path.startsWith("/lex/signup");
  const [p, setP] = useState<Me | null>(null);
  useEffect(() => { if (!onSignup) fetch("/api/lex/team").then((r) => (r.ok ? r.json() : null)).then(setP).catch(() => {}); }, [onSignup]);
  if (onSignup || !showWatermark(p)) return null;
  return <div aria-hidden="true" data-lex-watermark style={{ position: "fixed", inset: 0, zIndex: 40, pointerEvents: "none", userSelect: "none", backgroundImage: watermarkBackground(watermarkText(p!.firmName!, p!.me!)), backgroundRepeat: "repeat" }} />;
}
