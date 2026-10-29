import type { EffectivePrice } from "@/lib/sale-price";
import { formatCents } from "@/lib/sale-price";
import SaleCountdown from "./SaleCountdown";

/**
 * Public sale price block. Isolated so Designer's visual spec can replace the styling.
 * Pass `sale` only when it is live and checkout honours it (publicSaleForSlot).
 * No sale: renders `fallback` untouched, so the page is unchanged.
 */
export default function SalePrice({
  sale,
  suffix,
  fallback,
  priceStyle,
}: {
  sale: EffectivePrice | null;
  suffix?: string;
  fallback: React.ReactNode;
  priceStyle?: React.CSSProperties;
}) {
  if (!sale || !sale.onSale) return <>{fallback}</>;
  return (
    <div className="sale-price" style={{ marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 10 }}>
        <span style={{ color: "var(--teal, #0f766e)", fontSize: 28, fontWeight: 700, ...priceStyle }}>
          {formatCents(sale.effective)}
          {suffix ? <span style={{ fontSize: 16, fontWeight: 500 }}> {suffix}</span> : null}
        </span>
        <s style={{ opacity: 0.6, fontSize: 18 }}>
          <span className="sr-only" style={srOnly}>Was </span>
          {formatCents(sale.original)}
        </s>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        <span style={badge}>{formatCents(sale.saveCents)} off</span>
        <span style={badge}>{sale.savePercent}% off</span>
      </div>
      {sale.showCountdown && sale.endsAt ? (
        <div style={{ marginTop: 8 }}>
          <SaleCountdown endsAt={sale.endsAt} />
        </div>
      ) : null}
    </div>
  );
}

const badge: React.CSSProperties = {
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 999,
  background: "#fef3c7",
  color: "#92400e",
  fontSize: 13,
  fontWeight: 700,
};

const srOnly: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};
