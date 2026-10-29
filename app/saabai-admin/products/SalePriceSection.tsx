"use client";
import { useMemo, useState } from "react";
import type { CatalogueProduct } from "../../../lib/product-catalogue";
import {
  basePriceCents,
  brisbaneAt,
  brisbaneEndOfDay,
  brisbaneYmd,
  endAfterDays,
  formatBrisbaneDate,
  formatCents,
  getEffectivePrice,
  lastPriceChangeAt,
  policyBlockReason,
  priceChangeGuard,
  saleReview,
  saleFeeOf,
  PUBLIC_SLOTS,
  publicBlockReason,
  saleStatus,
  saleSummary,
  validateSalePrice,
  type PublicSlotId,
  type SaleFee,
  type SaleStatus,
} from "../../../lib/sale-price";
import { SALE_POLICY } from "../../../lib/sale-policy";

const NAVY = "#1e3a5f";
// Light mode, navy actions. Inputs use #5f6580 (3:1 on white, WCAG 1.4.11). Notices are blue/red, never gold.
const C = { card: "#ffffff", border: "rgba(0,0,0,0.08)", inputBorder: "#5f6580", text: "#111827", dim: "#4b5563", red: "#b91c1c", redBg: "#fef2f2", note: "#1e3a5f", noteBg: "#eff6ff", ok: "#0f766e" };
const input: React.CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 8, border: `1px solid ${C.inputBorder}`, background: "#fff", color: C.text, fontSize: 13, boxSizing: "border-box" };
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

const bneYmd = brisbaneYmd;
const FEE_LABEL: Record<SaleFee, string> = { one_time: "One-off price", setup: "Setup fee", recurring: "Monthly fee" };

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
  const s = product.sale || null;
  const [fee, setFee] = useState<SaleFee>(s?.appliesTo ?? saleFeeOf(product));
  const original = basePriceCents(product, fee);
  const [ribbon, setRibbon] = useState(s?.showRibbon ?? false);
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
  const startIso = startDate ? brisbaneAt(startDate) : null;
  const endIso = useMemo(() => {
    if (mode === "open") return null;
    if (mode === "days") return endAfterDays(startIso || new Date().toISOString(), parseInt(days, 10));
    return endDate ? brisbaneEndOfDay(endDate) : null;
  }, [mode, days, endDate, startIso]);

  const status = saleStatus(s, original);
  const ep = getEffectivePrice(product);
  const draftSale = { id: s?.id ?? "sale_draft", appliesTo: fee, salePrice: cents || 1, saleStartsAt: startIso || new Date().toISOString(), saleEndsAt: endIso, showCountdown: countdown, showRibbon: ribbon, publicSlot: slot || undefined };
  const draft = { ...product, sale: draftSale };
  const block = publicBlockReason(draft);
  const policyBlock = policyBlockReason(draft);
  const guard = priceChangeGuard(draft, draftSale.saleStartsAt);
  const lastChange = lastPriceChangeAt(product, fee);
  const review = saleReview(s);
  const history = (product.priceHistory || []).filter((h) => h.fee === fee).slice(-5).reverse();

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
    if (policyBlock) return setErr(policyBlock);
    if (!guard.ok) return setErr("The regular price changed too recently. See the note above.");
    call("PUT", {
      id: s?.id,
      appliesTo: fee,
      showRibbon: ribbon,
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
        {product.billingType === "setup_monthly" && (
          <>
            <label style={label} htmlFor="sale-fee">Sale applies to</label>
            <select id="sale-fee" style={{ ...input, marginBottom: 12 }} value={fee} onChange={(e) => setFee(e.target.value as SaleFee)}>
              <option value="setup">Setup fee</option>
              <option value="recurring">Monthly fee</option>
            </select>
          </>
        )}
        <label style={label} htmlFor="sale-was">Was price (regular {FEE_LABEL[fee].toLowerCase()}, read only)</label>
        <input id="sale-was" style={{ ...input, background: "#f3f4f6", color: C.dim, marginBottom: 6 }} value={formatCents(original)} readOnly aria-readonly="true" />
        <p style={{ margin: "0 0 12px", fontSize: 12, color: C.dim }}>
          {lastChange
            ? `Regular price last changed ${formatBrisbaneDate(lastChange, { day: "numeric", month: "short", year: "numeric" })}.`
            : "No regular price change on record."}
        </p>

        {!guard.ok && (
          <div role="alert" style={{ margin: "0 0 12px", padding: "10px 12px", borderRadius: 8, background: C.redBg, color: C.red, fontSize: 12 }}>
            <strong>Can&apos;t start this sale yet.</strong> The regular price changed {guard.daysBefore} days before the start. The &quot;was&quot; price must have been charged for at least {SALE_POLICY.priceStableDays} days. Earliest start: {guard.earliestStart ? formatBrisbaneDate(guard.earliestStart, { day: "numeric", month: "short", year: "numeric" }) : "unknown"}.
            {history.length > 0 && (
              <table style={{ marginTop: 8, fontSize: 12, borderCollapse: "collapse", color: C.text }}>
                <thead><tr><th style={{ textAlign: "left", paddingRight: 12 }}>Date</th><th style={{ textAlign: "left", paddingRight: 12 }}>From</th><th style={{ textAlign: "left" }}>To</th></tr></thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.at}><td style={{ paddingRight: 12 }}>{formatBrisbaneDate(h.at, { day: "numeric", month: "short", year: "numeric" })}</td><td style={{ paddingRight: 12 }}>{h.fromCents == null ? "None" : formatCents(h.fromCents)}</td><td>{formatCents(h.toCents)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {policyBlock && (
          <p role="alert" style={{ margin: "0 0 12px", padding: "8px 10px", borderRadius: 8, background: C.redBg, color: C.red, fontSize: 12 }}>{policyBlock}</p>
        )}

        <label style={label} htmlFor="sale-price">Sale price (AUD)</label>
        <input id="sale-price" style={input} type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 397" />
        <p style={{ margin: "6px 0 12px", fontSize: 12, fontWeight: 700, color: priceErr ? C.red : C.ok }}>
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
          {mode === "open" ? `Runs until you end it. Review reminder at ${SALE_POLICY.openSaleReviewDays} days; it ends automatically at ${SALE_POLICY.openSaleMaxDays} days.` : endIso ? `Ends ${formatBrisbaneDate(endIso, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })} Brisbane time` : " "}
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

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, color: mode === "open" ? C.dim : C.text }}>
          <input type="checkbox" checked={countdown && mode !== "open"} disabled={mode === "open"} onChange={(e) => setCountdown(e.target.checked)} />
          Show countdown publicly{mode === "open" ? " (needs an end date)" : ""}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13, color: C.text }}>
          <input type="checkbox" checked={ribbon} onChange={(e) => setRibbon(e.target.checked)} />
          Show SALE corner ribbon
        </label>
        {review.needsReview && (
          <p role="status" style={{ margin: "12px 0 0", padding: "8px 10px", borderRadius: 8, background: C.noteBg, color: C.note, fontSize: 12 }}>
            This sale has run {review.days} days. A sale price that runs for months can become the real price under Australian Consumer Law. Review it, or it ends automatically at {SALE_POLICY.openSaleMaxDays} days.
          </p>
        )}

        {block && slot && (
          <p role="alert" style={{ margin: "12px 0 0", padding: "8px 10px", borderRadius: 8, background: C.noteBg, color: C.note, fontSize: 12 }}>
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
            <button type="button" style={ghostBtn} disabled={busy} onClick={() => { if (window.confirm("End this sale now? The regular price shows again within a minute.")) call("POST", { action: "end" }); }}>End sale now</button>
          )}
          {s && (
            <button type="button" style={{ ...ghostBtn, borderColor: C.inputBorder, color: C.dim }} disabled={busy} onClick={() => call("DELETE")}>Remove sale</button>
          )}
        </div>
      </div>
    </div>
  );
}
