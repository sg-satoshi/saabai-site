"use client";
import { formatCountdown, srEndText } from "@/lib/sale-price";
import { SALE_POLICY } from "@/lib/sale-policy";

/**
 * Countdown line. Rendered by SalePrice, which owns the once-a-minute clock.
 * Over 24h: the fixed end date. Under 24h: boxed "Ends in hh mm". No seconds.
 */
export default function SaleCountdown({ endsAt, now }: { endsAt: string; now: Date }) {
  const text = formatCountdown(endsAt, now);
  if (!text) return null;
  const urgent = Date.parse(endsAt) - now.getTime() <= SALE_POLICY.countdownFixedDateAboveHours * 3_600_000;
  const m = urgent ? /^Ends in (.+)$/.exec(text) : null;
  return (
    <div className={`sp-cd${urgent ? " sp-urgent" : ""}`} aria-live="off">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
      <span aria-hidden="true" suppressHydrationWarning>{m ? <>Ends in <b>{m[1]}</b></> : text}</span>
      <span className="sp-sr">{srEndText(endsAt)}</span>
    </div>
  );
}
