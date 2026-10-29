"use client";
import { useMemo, useState } from "react";
import type { CatalogueProduct } from "../../../lib/product-catalogue";
import {
  basePriceCents,
  brisbaneEndOfDay,
  brisbaneStartOfDay,
  endAfterDays,
  formatBrisbaneDate,
  formatCents,
  getEffectivePrice,
  PUBLIC_SLOTS,
  publicBlockReason,
  saleStatus,
  saleSummary,
  validateSalePrice,
  type PublicSlotId,
  type SaleStatus,
} from "../../../lib/sale-price";

const NAVY = "#1e3a5f";
const C = { card: "#ffffff", border: "rgba(0,0,0,0.08)", text: "#111827", dim: "#6b7280", red: "#dc2626", amber: "#92400e", amberBg: "#fef3c7" };
const input: React.CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.text, fontSize: 13, boxSizing: "border-box" };
const label: React.CSSProperties = { display: "block", margin: "0 0 5px", fontSize: 11, fontWeight: 700, color: C.dim };
const navyBtn: React.CSSProperties = { padding: "9px 14px", borderRadius: 8, border: "none", background: NAVY, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const ghostBtn: React.CSSProperties = { padding: "9px 14px", borderRadius: 8, border: `1px solid ${NAVY}`, background: "#fff", color: NAVY, fontSize: 13, fontWeight: 700, cursor: "pointer" };

type Mode = "open" | "days" | "date";

const CHIP: Record<SaleStatus, { text: string; bg: string; fg: string }> = {
  none: { text: "No sale", bg: "#f3f4f6", fg: "#6b7280" },
  scheduled: { text: "Scheduled", bg: "#dbeafe", fg: "#1e40af" },
  live: { text: "Live", bg: "#dcfce7", fg: "#166534" },
  ended: { text: "Ended", bg: "#f3f4f6", fg: "#374151" },
  invalid: { text: "Invalid", bg: "#fee2e2", fg: "#991b1b" },
};

function bneYmd(iso: string): string {
  return formatBrisbaneDate(iso, { year: "numeric", month: "2-digit", day: "2-digit" }).split("/").reverse().join("-");
}

/** Sale Price section for one saved product. Saves on its own route: no Stripe calls. */
export default function SalePriceSection({
  product,
  publicEnabled,
  onSaved,
}: {
  product: CatalogueProduct;
  publicEnabled: boolean;
  onSaved: (p: CatalogueProduct) => void;
}) {
  const original = basePriceCents(product);
  const s = product.sale || null;
  const [price, setPrice] = useState(s ? String(s.salePrice / 100) : "");
  const [mode, setMode] = useState<Mode>(s?.saleEndsAt ? "date" : "open");
  const [days, setDays] = useState("7");
  const [endDate, setEndDate] = useState(s?.saleEndsAt ? bneYmd(s.saleEndsAt) : "");
  const [startDate, setStartDate] = useState(() => (s && Date.parse(s.saleStartsAt) > Date.now() ? bneYmd(s.saleStartsAt) : ""));
  const [countdown, setCountdown] = useState(s?.showCountdown ?? false);
  const [slot, setSlot] = useState<PublicSlotId | "">(s?.publicSlot ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cents = Math.round(parseFloat(price) * 100);
  const priceErr = price ? validateSalePrice(cents, original) : null;
  const startIso = startDate ? brisbaneStartOfDay(startDate) : null;
  const endIso = useMemo(() => {
    if (mode === "open") return null;
    if (mode === "days") return endAfterDays(startIso || new Date().toISOString(), parseInt(days, 10));
    return endDate ? brisbaneEndOfDay(endDate) : null;
  }, [mode, days, endDate, startIso]);

  const status = saleStatus(s, original);
  const ep = getEffectivePrice(product);
  const block = publicBlockReason({ ...product, sale: s ? { ...s, publicSlot: slot || undefined } : { salePrice: 1, saleStartsAt: "", saleEndsAt: null, showCountdown: false, publicSlot: slot || undefined } });

  async function call(method: "PUT" | "POST" | "DELETE", body?: unknown) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/sale`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved(data.product);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!price || priceErr) return setErr(priceErr || "Enter a sale price.");
    if (mode !== "open" && !endIso) return setErr(mode === "days" ? "Days must be 1 to 365." : "Pick an end date.");
    call("PUT", {
      salePrice: cents,
      saleStartsAt: startIso || undefined,
      saleEndsAt: endIso,
      showCountdown: countdown,
      publicSlot: slot || null,
    });
  }

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, margin: "6px 0 14px", paddingTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>Sale Price</p>
        <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: CHIP[status].bg, color: CHIP[status].fg }}>{CHIP[status].text}</span>
      </div>

      {!publicEnabled && (
        <p style={{ margin: "0 0 10px", fontSize: 12, color: C.dim }}>Public display is off. Sales saved here won&apos;t show on the website until it is turned on.</p>
      )}

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: C.dim }}>
          Original {product.billingType === "one_time" ? "price" : "recurring price"}: <strong style={{ color: C.text }}>{formatCents(original)}</strong>
        </p>

        <label style={label} htmlFor="sale-price">Sale price (AUD)</label>
        <input id="sale-price" style={input} type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 397" />
        <p style={{ margin: "6px 0 12px", fontSize: 12, fontWeight: 700, color: priceErr ? C.red : C.amber }}>
          {price ? priceErr || saleSummary(original, cents) : " "}
        </p>

        <label style={label} htmlFor="sale-mode">How long</label>
        <select id="sale-mode" style={input} value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
          <option value="open">Until further notice</option>
          <option value="days">For a number of days</option>
          <option value="date">Until a set date</option>
        </select>
        {mode === "days" && (
          <input style={{ ...input, marginTop: 8 }} type="number" min="1" max="365" value={days} onChange={(e) => setDays(e.target.value)} aria-label="Number of days" />
        )}
        {mode === "date" && (
          <input style={{ ...input, marginTop: 8 }} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-label="End date" />
        )}
        <p style={{ margin: "6px 0 12px", fontSize: 12, color: C.dim }}>
          {endIso ? `Ends ${formatBrisbaneDate(endIso, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })} Brisbane time` : mode === "open" ? "Runs until you end it." : " "}
        </p>

        <label style={label} htmlFor="sale-start">Starts (optional, Brisbane date; blank means now)</label>
        <input id="sale-start" style={input} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />

        <label style={{ ...label, marginTop: 12 }} htmlFor="sale-slot">Public price this product stands for</label>
        <select id="sale-slot" style={input} value={slot} onChange={(e) => setSlot(e.target.value as PublicSlotId | "")}>
          <option value="">None (admin only)</option>
          {Object.values(PUBLIC_SLOTS).map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, color: C.text }}>
          <input type="checkbox" checked={countdown} onChange={(e) => setCountdown(e.target.checked)} />
          Show countdown publicly
        </label>

        {block && slot && (
          <p role="alert" style={{ margin: "12px 0 0", padding: "8px 10px", borderRadius: 8, background: C.amberBg, color: C.amber, fontSize: 12 }}>
            Public display stays off for this product. {block} We never show a sale price the customer isn&apos;t actually charged.
          </p>
        )}

        <p style={{ margin: "12px 0 0", fontSize: 11, color: C.dim }}>
          The struck-through price must be a genuine price this product was recently sold at. Showing an inflated &quot;was&quot; price breaks Australian Consumer Law.
        </p>

        {ep.onSale && (
          <p style={{ margin: "10px 0 0", fontSize: 12, color: C.text }}>
            Live now: {formatCents(ep.effective)}, {saleSummary(ep.original, ep.effective)}.
          </p>
        )}

        {err && <p style={{ margin: "10px 0 0", fontSize: 12, color: C.red }}>{err}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button type="button" style={{ ...navyBtn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={save}>Save sale</button>
          {(status === "live" || status === "scheduled") && (
            <button type="button" style={ghostBtn} disabled={busy} onClick={() => call("POST", { action: "end" })}>End sale now</button>
          )}
          {s && (
            <button type="button" style={{ ...ghostBtn, borderColor: C.border, color: C.dim }} disabled={busy} onClick={() => call("DELETE")}>Remove sale</button>
          )}
        </div>
      </div>
    </div>
  );
}
