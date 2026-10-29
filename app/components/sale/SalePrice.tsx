"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { EffectivePrice } from "@/lib/sale-price";
import { formatCents } from "@/lib/sale-price";
import SaleCountdown from "./SaleCountdown";
import "./sale.css";

/**
 * Public sale price block (Designer spec). Pass `sale` only from getPublicSales(), which is
 * already gated by the flag, policy, checkout and every-surface wiring.
 * No sale: renders `fallback` untouched, so the page is unchanged.
 * At the end time on an open page: drops the sale at once, shows "Sale ended" with the
 * regular price, then refreshes from the server. It never shows the sale after endsAt.
 */
export default function SalePrice({
  sale,
  unit,
  fallback,
}: {
  sale: EffectivePrice | null | undefined;
  unit?: string;
  fallback: React.ReactNode;
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const endMs = sale?.endsAt ? Date.parse(sale.endsAt) : null;

  useEffect(() => {
    if (!sale?.onSale || endMs === null) return;
    const tick = () => setNow(new Date());
    const toNextMinute = 60_000 - (Date.now() % 60_000);
    let iv: ReturnType<typeof setInterval> | undefined;
    const t1 = setTimeout(() => { tick(); iv = setInterval(tick, 60_000); }, toNextMinute);
    const t2 = setTimeout(tick, Math.max(0, endMs - Date.now()) + 50); // exactly at the end
    return () => { clearTimeout(t1); clearTimeout(t2); if (iv) clearInterval(iv); };
  }, [sale?.onSale, endMs]);

  const ended = endMs !== null && now.getTime() >= endMs;
  useEffect(() => {
    if (ended) router.refresh();
  }, [ended, router]);

  if (!sale || !sale.onSale) return <>{fallback}</>;
  if (ended) {
    return (
      <>
        {fallback}
        <p className="sp-ended">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
          Sale ended
        </p>
      </>
    );
  }
  const u = unit && unit !== "one-off" ? ` ${unit}` : "";
  return (
    <div className="sp">
      <s className="sp-was"><span className="sp-sr">Was </span>{formatCents(sale.original)}</s>
      <div className="sp-now">
        <span className="sp-sr">Now </span>
        <span className="sp-amt">{formatCents(sale.effective)}</span>
        {unit ? <span className="sp-per">{unit}</span> : null}
      </div>
      {sale.saveCents >= 100 && (
        <div className="sp-badges">
          <span className="sp-bdg sp-save">Save {formatCents(sale.saveCents)}{u}</span>
          {sale.savePercent > 0 && <span className="sp-bdg sp-pct">{sale.savePercent}% off</span>}
        </div>
      )}
      {sale.showCountdown && sale.endsAt ? <SaleCountdown endsAt={sale.endsAt} now={now} /> : null}
    </div>
  );
}

/** Corner ribbon. The card needs position: relative; the ribbon clips itself to the card. */
export function SaleRibbon({ sale }: { sale: EffectivePrice | null | undefined }) {
  if (!sale?.onSale || !sale.showRibbon) return null;
  return (
    <div className="sp-ribbon-clip" aria-hidden="true">
      <div className="sp-ribbon">Sale</div>
    </div>
  );
}

/** sr-only "(on sale)" after a product name. */
export function OnSaleLabel({ sale }: { sale: EffectivePrice | null | undefined }) {
  if (!sale?.onSale) return null;
  return <span className="sp-sr"> (on sale)</span>;
}
