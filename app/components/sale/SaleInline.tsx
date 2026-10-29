import type { EffectivePrice } from "@/lib/sale-price";
import { formatCents } from "@/lib/sale-price";
import "./sale.css";

/** Compact inline price for body copy and lists: <s>$497</s> $397 [20% off]. No countdown, no ribbon. */
export default function SaleInline({ sale, fallback, unit }: { sale: EffectivePrice | null | undefined; fallback: React.ReactNode; unit?: string }) {
  if (!sale?.onSale) return <>{fallback}</>;
  return (
    <span className="sp-inline">
      <s><span className="sp-sr">Was </span>{formatCents(sale.original)}</s>{" "}
      <b><span className="sp-sr">Now </span>{formatCents(sale.effective)}</b>
      {unit ? ` ${unit}` : ""}
      {sale.savePercent > 0 && <span className="sp-ipct">{sale.savePercent}% off</span>}
    </span>
  );
}
