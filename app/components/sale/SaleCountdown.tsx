"use client";
import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/sale-price";

/** Ticking countdown. Hides itself at 0 so an ended sale never shows a timer. */
export default function SaleCountdown({ endsAt, className }: { endsAt: string; className?: string }) {
  const [text, setText] = useState(() => formatCountdown(endsAt));
  useEffect(() => {
    const tick = () => setText(formatCountdown(endsAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  if (!text) return null;
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#b45309", fontVariantNumeric: "tabular-nums" }} suppressHydrationWarning>
      <span aria-hidden="true">⏱</span>
      {text}
    </span>
  );
}
