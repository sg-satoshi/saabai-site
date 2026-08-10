"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import AdminShell from "../AdminSidebar";
import { CardElement, Elements, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { CatalogueProduct, BillingType, Interval } from "../../../lib/product-catalogue";
import { feeDisplay, type FeeKey, type FeeDisplay } from "../../../lib/product-pricing";

// ── Theme (matches PaymentsClient) ────────────────────────────────────────────
const C = {
  bg: "#f5f5f7",
  card: "#ffffff",
  surface: "#f3f4f6",
  border: "rgba(0,0,0,0.08)",
  text: "#111827",
  muted: "#9ca3af",
  dim: "#6b7280",
  blue: "#2563eb",
  blueBg: "rgba(37,99,235,0.08)",
  green: "#16a34a",
  greenBg: "rgba(22,163,74,0.10)",
  red: "#dc2626",
  redBg: "rgba(220,38,38,0.10)",
  teal: "#0f766e",
};

const INTERVALS: Interval[] = ["weekly", "fortnightly", "monthly", "quarterly", "yearly"];

const INTERVAL_LABEL: Record<Interval, string> = {
  weekly: "week",
  fortnightly: "2 weeks",
  monthly: "month",
  quarterly: "quarter",
  yearly: "year",
};

const FEE_LABEL: Record<FeeKey, string> = {
  setup: "Setup fee",
  recurring: "Recurring",
  one_time: "One-time",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtCents(cents?: number): string {
  if (cents == null) return "";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function dollarsToCents(s: string): number {
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : Math.round(n * 100);
}

function centsToDollars(cents?: number): string {
  return cents != null ? String(cents / 100) : "";
}

function feeKeysFor(bt: BillingType): FeeKey[] {
  return bt === "one_time" ? ["one_time"] : bt === "recurring" ? ["recurring"] : ["setup", "recurring"];
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function fmtUnix(sec?: number | null): string {
  if (!sec) return "";
  return new Date(sec * 1000).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

// ── Was / now / save price display ────────────────────────────────────────────
function PriceBlock({ p }: { p: CatalogueProduct }) {
  const rows: { label: string; fee: FeeDisplay; suffix: string }[] = [];
  if (p.billingType === "one_time") {
    rows.push({ label: "", fee: feeDisplay("one_time", p.oneTimeAmount || 0, p.discount), suffix: " one-off" });
  } else {
    const per = p.interval ? INTERVAL_LABEL[p.interval] : "month";
    if (p.billingType === "setup_monthly") {
      rows.push({ label: "Setup", fee: feeDisplay("setup", p.setupFee || 0, p.discount), suffix: "" });
    }
    rows.push({ label: p.billingType === "setup_monthly" ? "Then" : "", fee: feeDisplay("recurring", p.recurringAmount || 0, p.discount), suffix: "/" + per });
  }

  return (
    <div style={{ marginBottom: 12 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 6, marginBottom: 2 }}>
          {r.label && <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{r.label}</span>}
          {r.fee.isDiscounted ? (
            <>
              <span style={{ fontSize: 12, color: C.muted, textDecoration: "line-through" }}>{fmtCents(r.fee.original)}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.teal }}>{fmtCents(r.fee.discounted)}{r.suffix}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.green, background: C.greenBg, padding: "1px 6px", borderRadius: 4 }}>
                Save {fmtCents(r.fee.saveCents)} ({r.fee.savePercent}%)
              </span>
            </>
          ) : (
            <span style={{ fontSize: 15, fontWeight: 800, color: C.teal }}>{fmtCents(r.fee.original)}{r.suffix}</span>
          )}
        </div>
      ))}
      {p.discount && (p.discount.label || p.discount.endDate) && (
        <p style={{ margin: "2px 0 0", fontSize: 10, fontWeight: 600, color: C.dim }}>
          {p.discount.label}
          {p.discount.label && p.discount.endDate ? " · " : ""}
          {p.discount.endDate ? `ends ${fmtDate(p.discount.endDate)}` : ""}
        </p>
      )}
    </div>
  );
}

// ── Form types ────────────────────────────────────────────────────────────────
interface FormState {
  id: string | null;
  name: string;
  description: string;
  imageUrl: string;
  billingType: BillingType;
  oneTime: string;
  recurring: string;
  interval: Interval;
  setup: string;
  trialDays: string;
  gstInclusive: boolean;
  active: boolean;
  // discount
  discountOn: boolean;
  discKind: "percent" | "fixed";
  discValue: string;
  discApplies: Record<FeeKey, boolean>;
  discEnd: string;
  discLabel: string;
}

function blankForm(): FormState {
  return {
    id: null,
    name: "",
    description: "",
    imageUrl: "",
    billingType: "setup_monthly",
    oneTime: "",
    recurring: "",
    interval: "monthly",
    setup: "",
    trialDays: "",
    gstInclusive: true,
    active: true,
    discountOn: false,
    discKind: "percent",
    discValue: "",
    discApplies: { setup: true, recurring: true, one_time: true },
    discEnd: "",
    discLabel: "",
  };
}

function fromProduct(p: CatalogueProduct): FormState {
  const d = p.discount;
  return {
    id: p.id,
    name: p.name,
    description: p.description || "",
    imageUrl: p.imageUrl || "",
    billingType: p.billingType,
    oneTime: centsToDollars(p.oneTimeAmount),
    recurring: centsToDollars(p.recurringAmount),
    interval: p.interval || "monthly",
    setup: centsToDollars(p.setupFee),
    trialDays: p.trialDays ? String(p.trialDays) : "",
    gstInclusive: p.gstInclusive,
    active: p.active,
    discountOn: !!d,
    discKind: d?.kind || "percent",
    discValue: d ? (d.kind === "fixed" ? centsToDollars(d.value) : String(d.value)) : "",
    discApplies: {
      setup: d ? d.appliesTo.includes("setup") : true,
      recurring: d ? d.appliesTo.includes("recurring") : true,
      one_time: d ? d.appliesTo.includes("one_time") : true,
    },
    discEnd: d?.endDate || "",
    discLabel: d?.label || "",
  };
}

const PRESETS: { label: string; setup: string; recurring: string }[] = [
  { label: "Presence", setup: "2000", recurring: "100" },
  { label: "Growth", setup: "4000", recurring: "200" },
  { label: "Signature", setup: "6500", recurring: "300" },
];

// ── Small UI atoms ──────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 700, color: C.text, letterSpacing: 0.3 }}>{label}</p>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: C.card,
  fontSize: 13,
  color: C.text,
  outline: "none",
  boxSizing: "border-box",
};

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 14 }}
    >
      <span style={{ width: 38, height: 22, borderRadius: 22, background: on ? C.green : "#d1d5db", position: "relative", transition: "background 0.15s", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{label}</span>
    </button>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "10px 18px", borderRadius: 8, border: "none", background: C.blue, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
};

// ── Coupons tab ─────────────────────────────────────────────────────────────
interface CouponCode {
  id: string;
  code: string;
  active: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: number | null;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  duration: string;
  durationMonths: number | null;
  restrictedProducts: string[];
  appliesTo: string;
}

function CouponsPanel({ products }: { products: CatalogueProduct[] }) {
  const [codes, setCodes] = useState<CouponCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [f, setF] = useState({
    code: "",
    kind: "percent" as "percent" | "fixed",
    value: "",
    appliesTo: "both" as "setup" | "recurring" | "both",
    duration: "once" as "once" | "forever" | "repeating",
    durationMonths: "3",
    maxRedemptions: "",
    expiresAt: "",
    productId: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load codes");
      setCodes(data.codes || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    setSaving(true);
    setFormErr(null);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: f.code,
          kind: f.kind,
          value: parseFloat(f.value),
          appliesTo: f.appliesTo,
          duration: f.duration,
          durationMonths: f.duration === "repeating" ? parseInt(f.durationMonths, 10) : undefined,
          maxRedemptions: f.maxRedemptions ? parseInt(f.maxRedemptions, 10) : undefined,
          expiresAt: f.expiresAt || undefined,
          productId: f.productId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      setF({ ...f, code: "", value: "", maxRedemptions: "", expiresAt: "", productId: "" });
      await load();
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: string) {
    if (!confirm("Deactivate this code? Customers will no longer be able to use it.")) return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  function offLabel(c: CouponCode): string {
    if (c.percentOff != null) return `${c.percentOff}% off`;
    if (c.amountOff != null) return `${fmtCents(c.amountOff)} off`;
    return "";
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 340px) 1fr", gap: 24, alignItems: "start" }}>
      {/* Create form */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: C.text }}>New coupon code</h3>

        <Field label="Code">
          <input style={{ ...inputStyle, textTransform: "uppercase" }} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="e.g. LAUNCH25" />
        </Field>

        <Field label="Discount">
          <div style={{ display: "flex", gap: 8 }}>
            <select style={{ ...inputStyle, width: 110 }} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as "percent" | "fixed" })}>
              <option value="percent">% off</option>
              <option value="fixed">$ off</option>
            </select>
            <input style={inputStyle} type="number" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} placeholder={f.kind === "percent" ? "25" : "50"} />
          </div>
        </Field>

        <Field label="Applies to">
          <select style={inputStyle} value={f.appliesTo} onChange={(e) => setF({ ...f, appliesTo: e.target.value as "setup" | "recurring" | "both" })}>
            <option value="both">Both (setup + recurring)</option>
            <option value="setup">Setup fee only</option>
            <option value="recurring">Recurring only</option>
          </select>
        </Field>

        <Field label="Duration (for subscriptions)">
          <select style={inputStyle} value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value as "once" | "forever" | "repeating" })}>
            <option value="once">Once (first payment)</option>
            <option value="repeating">Repeating (X months)</option>
            <option value="forever">Forever</option>
          </select>
        </Field>

        {f.duration === "repeating" && (
          <Field label="Number of months">
            <input style={inputStyle} type="number" value={f.durationMonths} onChange={(e) => setF({ ...f, durationMonths: e.target.value })} placeholder="3" />
          </Field>
        )}

        <Field label={f.appliesTo === "both" ? "Restrict to product (optional)" : "Product (required for this scope)"}>
          <select style={inputStyle} value={f.productId} onChange={(e) => setF({ ...f, productId: e.target.value })}>
            <option value="">{f.appliesTo === "both" ? "Any product" : "Select a product…"}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {f.appliesTo === "setup" && (
            <p style={{ margin: "5px 0 0", fontSize: 10, color: C.dim }}>Only setup + monthly products have a separate setup fee to target.</p>
          )}
        </Field>

        <Field label="Max redemptions (optional)">
          <input style={inputStyle} type="number" value={f.maxRedemptions} onChange={(e) => setF({ ...f, maxRedemptions: e.target.value })} placeholder="e.g. 50" />
        </Field>

        <Field label="Expires (optional)">
          <input style={inputStyle} type="date" value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} />
        </Field>

        {formErr && <p style={{ margin: "0 0 10px", fontSize: 12, color: C.red }}>{formErr}</p>}

        <button style={{ ...btnPrimary, width: "100%", opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={create}>
          {saving ? "Creating…" : "Create code"}
        </button>
        <p style={{ margin: "10px 0 0", fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
          Codes are stored in Stripe and become redeemable once the checkout piece is live.
        </p>
      </div>

      {/* List */}
      <div>
        {loading ? (
          <p style={{ color: C.muted, fontSize: 13 }}>Loading codes…</p>
        ) : err ? (
          <p style={{ color: C.red, fontSize: 13 }}>{err}</p>
        ) : codes.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: C.dim }}>No coupon codes yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {codes.map((c) => {
              const prodName = c.restrictedProducts.length
                ? products.find((p) => c.restrictedProducts.includes(p.stripeProductId) || (p.stripeSetupProductId != null && c.restrictedProducts.includes(p.stripeSetupProductId)))?.name || "1 product"
                : null;
              const scopeLabel = c.appliesTo === "setup" ? "Setup only" : c.appliesTo === "recurring" ? "Recurring only" : null;
              return (
                <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, opacity: c.active ? 1 : 0.55 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 14, fontWeight: 800, color: C.text }}>{c.code}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.teal, background: "rgba(15,118,110,0.08)", padding: "1px 7px", borderRadius: 4 }}>{offLabel(c)}</span>
                      {scopeLabel && <span style={{ fontSize: 10, fontWeight: 700, color: C.blue, background: C.blueBg, padding: "1px 7px", borderRadius: 4 }}>{scopeLabel}</span>}
                      {!c.active && <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase" }}>Inactive</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: C.dim }}>
                      {c.duration === "repeating" ? `${c.durationMonths} months` : c.duration}
                      {" · "}
                      {c.timesRedeemed} used{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}
                      {c.expiresAt ? ` · expires ${fmtUnix(c.expiresAt)}` : ""}
                      {prodName ? ` · ${prodName} only` : ""}
                    </p>
                  </div>
                  {c.active && (
                    <button
                      onClick={() => deactivate(c.id)}
                      style={{ padding: "7px 12px", borderRadius: 7, border: `1px solid ${C.redBg}`, background: C.redBg, color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sell panel ────────────────────────────────────────────────────────────────
const CARD_STYLE = {
  base: { fontSize: "14px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: C.text, "::placeholder": { color: C.muted } },
  invalid: { color: C.red },
};

interface QuoteLine { key: "setup" | "recurring" | "one_time"; label: string; original: number; final: number }
interface QuoteResp {
  quote: { lines: QuoteLine[]; couponCode: string | null; couponAmountOff: number | null };
  couponError: string | null;
  billingType: BillingType;
  interval: Interval | null;
  trialDays: number | null;
  gstInclusive: boolean;
  productName: string;
}

function lineSuffix(line: QuoteLine, interval: Interval | null): string {
  if (line.key === "one_time") return " one-off";
  if (line.key === "setup") return " setup";
  return "/" + (interval ? INTERVAL_LABEL[interval] : "month");
}

function SellPanel({ product, onClose, onSold }: { product: CatalogueProduct; onClose: () => void; onSold: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resp, setResp] = useState<QuoteResp | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchQuote = useCallback(async (withCode: string) => {
    try {
      const res = await fetch("/api/admin/sell/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, code: withCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setCouponMsg(data.error || "Could not load pricing"); return; }
      setResp(data);
      if (data.couponError) setCouponMsg(data.couponError);
      else if (withCode && data.quote.couponCode) setCouponMsg(`Code ${data.quote.couponCode} applied`);
      else setCouponMsg(null);
    } catch (e) {
      setCouponMsg(e instanceof Error ? e.message : String(e));
    }
  }, [product.id]);

  useEffect(() => { fetchQuote(""); }, [fetchQuote]);

  async function chargeNow() {
    setError(null); setSuccess(null);
    if (!email.trim()) { setError("Customer email is required"); return; }
    if (!stripe || !elements) { setError("Payment form is still loading"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/sell/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, customerName: name.trim(), customerEmail: email.trim(), code: code.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Charge failed"); setBusy(false); return; }
      if (data.clientSecret) {
        const { error: confErr, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
          payment_method: { card: elements.getElement(CardElement)! },
        });
        if (confErr) setError(confErr.message || "Payment failed");
        else if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
          setSuccess("Payment successful. Client account created and welcome email sent.");
          onSold();
        } else setError(`Payment status: ${paymentIntent?.status}`);
      } else {
        setSuccess("Subscription started (no upfront charge). Client account created.");
        onSold();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function genLink() {
    setError(null); setSuccess(null); setLinkUrl(null); setCopied(false);
    if (!email.trim()) { setError("Customer email is required"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/sell/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, customerName: name.trim(), customerEmail: email.trim(), code: code.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Could not create link");
      else setLinkUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const q = resp?.quote;
  const interval = resp?.interval ?? product.interval ?? null;

  return (
    <div onClick={() => !busy && onClose()} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto", zIndex: 200 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: C.bg, borderRadius: 14, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: C.text }}>Sell — {product.name}</h2>

        {/* Live price */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, margin: "12px 0 16px" }}>
          {q ? (
            <>
              {q.lines.map((ln) => (
                <div key={ln.key} style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, width: 56 }}>{ln.label}</span>
                  {ln.final < ln.original ? (
                    <>
                      <span style={{ fontSize: 12, color: C.muted, textDecoration: "line-through" }}>{fmtCents(ln.original)}</span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: C.teal }}>{fmtCents(ln.final)}{lineSuffix(ln, interval)}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 15, fontWeight: 800, color: C.teal }}>{fmtCents(ln.final)}{lineSuffix(ln, interval)}</span>
                  )}
                </div>
              ))}
              {q.couponAmountOff ? (
                <p style={{ margin: "6px 0 0", fontSize: 11, color: C.green, fontWeight: 600 }}>Coupon {q.couponCode}: {fmtCents(q.couponAmountOff)} off applied at checkout</p>
              ) : null}
              {resp?.trialDays ? <p style={{ margin: "4px 0 0", fontSize: 11, color: C.dim }}>{resp.trialDays}-day free trial</p> : null}
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Loading price…</p>
          )}
        </div>

        <Field label="Customer name">
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" />
        </Field>
        <Field label="Customer email">
          <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@firm.com.au" />
        </Field>

        <Field label="Coupon code (optional)">
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...inputStyle, textTransform: "uppercase" }} value={code} onChange={(e) => setCode(e.target.value)} placeholder="LAUNCH25" />
            <button type="button" onClick={() => fetchQuote(code.trim())} style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
              Apply
            </button>
          </div>
          {couponMsg && (
            <p style={{ margin: "6px 0 0", fontSize: 11, fontWeight: 600, color: resp?.couponError ? C.red : C.green }}>{couponMsg}</p>
          )}
        </Field>

        {/* Card entry for charge-now */}
        <Field label="Card (for charge now)">
          <div style={{ ...inputStyle, padding: "12px" }}>
            <CardElement options={{ style: CARD_STYLE }} />
          </div>
        </Field>

        {error && <p style={{ margin: "0 0 10px", fontSize: 12, color: C.red }}>{error}</p>}
        {success && <p style={{ margin: "0 0 10px", fontSize: 12, color: C.green, fontWeight: 600 }}>{success}</p>}

        {linkUrl && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: C.dim }}>Payment link</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input readOnly value={linkUrl} style={{ ...inputStyle, fontSize: 11 }} onFocus={(e) => e.currentTarget.select()} />
              <button type="button" onClick={() => { navigator.clipboard?.writeText(linkUrl); setCopied(true); }} style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: C.text, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button onClick={genLink} disabled={busy} style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
            Generate link
          </button>
          <button onClick={chargeNow} disabled={busy} style={{ ...btnPrimary, flex: 1, opacity: busy ? 0.6 : 1 }}>
            {busy ? "Working…" : "Charge card now"}
          </button>
        </div>
        <button onClick={() => onClose()} disabled={busy} style={{ width: "100%", marginTop: 10, padding: "9px 0", borderRadius: 8, border: "none", background: "transparent", color: C.dim, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Close
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProductsClient({ publishableKey }: { publishableKey: string | null }) {
  const stripePromise = useMemo(() => (publishableKey ? loadStripe(publishableKey) : null), [publishableKey]);
  const [selling, setSelling] = useState<CatalogueProduct | null>(null);
  const [tab, setTab] = useState<"products" | "coupons">("products");
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load products");
      setProducts(data.products || []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function patch(p: Partial<FormState>) {
    setForm((cur) => (cur ? { ...cur, ...p } : cur));
  }

  function patchApplies(key: FeeKey, on: boolean) {
    setForm((cur) => (cur ? { ...cur, discApplies: { ...cur.discApplies, [key]: on } } : cur));
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setFormError(null);

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      billingType: form.billingType,
      gstInclusive: form.gstInclusive,
      active: form.active,
    };
    if (form.billingType === "one_time") {
      payload.oneTimeAmount = dollarsToCents(form.oneTime);
    } else {
      payload.recurringAmount = dollarsToCents(form.recurring);
      payload.interval = form.interval;
      if (form.trialDays.trim()) payload.trialDays = parseInt(form.trialDays, 10);
      if (form.billingType === "setup_monthly") payload.setupFee = dollarsToCents(form.setup);
    }

    if (form.discountOn && form.discValue.trim()) {
      const applies = feeKeysFor(form.billingType).filter((k) => form.discApplies[k]);
      const value = form.discKind === "fixed" ? dollarsToCents(form.discValue) : parseFloat(form.discValue);
      if (applies.length && value > 0) {
        payload.discount = {
          kind: form.discKind,
          value,
          appliesTo: applies,
          endDate: form.discEnd || undefined,
          label: form.discLabel.trim() || undefined,
        };
      }
    }

    try {
      const url = form.id ? `/api/admin/products/${form.id}` : "/api/admin/products";
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setForm(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function archive(p: CatalogueProduct) {
    if (!confirm(`Archive "${p.name}"? It will stop being billable and leave the catalogue.`)) return;
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Archive failed");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  const tabBtn = (key: "products" | "coupons", label: string) => (
    <button
      onClick={() => setTab(key)}
      style={{
        padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
        background: tab === key ? C.text : "transparent",
        color: tab === key ? "#fff" : C.dim,
      }}
    >
      {label}
    </button>
  );

  return (
    <AdminShell activePath="/saabai-admin/products">
      <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.text }}>Products</h1>
          {tab === "products" && (
            <button style={btnPrimary} onClick={() => { setFormError(null); setForm(blankForm()); }}>
              + Add product
            </button>
          )}
        </div>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: C.dim }}>
          Create the products you sell, set discounts, and manage coupon codes. Everything syncs to Stripe.
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 22, background: C.surface, padding: 4, borderRadius: 10, width: "fit-content" }}>
          {tabBtn("products", "Products")}
          {tabBtn("coupons", "Coupons")}
        </div>

        {tab === "coupons" ? (
          <CouponsPanel products={products} />
        ) : loading ? (
          <p style={{ color: C.muted, fontSize: 13 }}>Loading products…</p>
        ) : loadError ? (
          <p style={{ color: C.red, fontSize: 13 }}>{loadError}</p>
        ) : products.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}>
            <p style={{ margin: 0, fontSize: 14, color: C.dim }}>No products yet. Add your first one to get started.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {products.map((p) => (
              <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", opacity: p.active ? 1 : 0.6 }}>
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: 140, objectFit: "cover", background: C.surface }} />
                ) : (
                  <div style={{ width: "100%", height: 140, background: `linear-gradient(135deg, ${C.surface}, #e5e7eb)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 30, fontWeight: 800, color: "#c4c8d0" }}>{p.name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>{p.name}</h3>
                    {!p.active && <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, background: "rgba(0,0,0,0.05)", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" }}>Inactive</span>}
                  </div>
                  <p style={{ margin: "0 0 10px", fontSize: 12, color: C.dim, lineHeight: 1.5, flex: 1 }}>
                    {p.description || <span style={{ color: C.muted }}>No description</span>}
                  </p>
                  <PriceBlock p={p} />
                  <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 600, color: C.muted }}>
                    {p.gstInclusive ? "incl. GST" : "+ GST"}
                  </p>
                  {p.active && (
                    <button
                      onClick={() => setSelling(p)}
                      style={{ width: "100%", marginBottom: 8, padding: "9px 0", borderRadius: 7, border: "none", background: C.teal, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      Sell
                    </button>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setFormError(null); setForm(fromProduct(p)); }} style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Edit
                    </button>
                    <button onClick={() => archive(p)} style={{ padding: "8px 12px", borderRadius: 7, border: `1px solid ${C.redBg}`, background: C.redBg, color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Archive
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / edit modal */}
      {form && (
        <div onClick={() => !saving && setForm(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto", zIndex: 200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: C.bg, borderRadius: 14, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 800, color: C.text }}>{form.id ? "Edit product" : "New product"}</h2>

            {!form.id && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: C.dim }}>Quick start from a website tier</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {PRESETS.map((pr) => (
                    <button key={pr.label} type="button" onClick={() => patch({ name: pr.label, billingType: "setup_monthly", interval: "monthly", setup: pr.setup, recurring: pr.recurring })} style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      {pr.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Field label="Name">
              <input style={inputStyle} value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Growth website" />
            </Field>

            <Field label="Description">
              <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical", fontFamily: "inherit" }} value={form.description} onChange={(e) => patch({ description: e.target.value })} placeholder="Short summary shown on the product card" />
            </Field>

            <Field label="Image URL (optional)">
              <input style={inputStyle} value={form.imageUrl} onChange={(e) => patch({ imageUrl: e.target.value })} placeholder="https://…" />
            </Field>

            <Field label="Price type">
              <select style={inputStyle} value={form.billingType} onChange={(e) => patch({ billingType: e.target.value as BillingType })}>
                <option value="setup_monthly">Setup fee + recurring</option>
                <option value="recurring">Recurring only</option>
                <option value="one_time">One-time</option>
              </select>
            </Field>

            {form.billingType === "one_time" && (
              <Field label="Amount (AUD)">
                <input style={inputStyle} type="number" value={form.oneTime} onChange={(e) => patch({ oneTime: e.target.value })} placeholder="e.g. 3500" />
              </Field>
            )}

            {form.billingType !== "one_time" && (
              <>
                {form.billingType === "setup_monthly" && (
                  <Field label="Setup fee (AUD, one-off)">
                    <input style={inputStyle} type="number" value={form.setup} onChange={(e) => patch({ setup: e.target.value })} placeholder="e.g. 1000" />
                  </Field>
                )}
                <Field label="Recurring amount (AUD)">
                  <input style={inputStyle} type="number" value={form.recurring} onChange={(e) => patch({ recurring: e.target.value })} placeholder="e.g. 100" />
                </Field>
                <Field label="Billing interval">
                  <select style={inputStyle} value={form.interval} onChange={(e) => patch({ interval: e.target.value as Interval })}>
                    {INTERVALS.map((iv) => (
                      <option key={iv} value={iv}>{iv.charAt(0).toUpperCase() + iv.slice(1)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Free trial (days, optional)">
                  <input style={inputStyle} type="number" value={form.trialDays} onChange={(e) => patch({ trialDays: e.target.value })} placeholder="e.g. 14" />
                </Field>
              </>
            )}

            {/* Discount */}
            <div style={{ borderTop: `1px solid ${C.border}`, margin: "6px 0 14px", paddingTop: 14 }}>
              <Toggle on={form.discountOn} onClick={() => patch({ discountOn: !form.discountOn })} label="Add a discount (sale price)" />
              {form.discountOn && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                  <Field label="Discount">
                    <div style={{ display: "flex", gap: 8 }}>
                      <select style={{ ...inputStyle, width: 110 }} value={form.discKind} onChange={(e) => patch({ discKind: e.target.value as "percent" | "fixed" })}>
                        <option value="percent">% off</option>
                        <option value="fixed">$ off</option>
                      </select>
                      <input style={inputStyle} type="number" value={form.discValue} onChange={(e) => patch({ discValue: e.target.value })} placeholder={form.discKind === "percent" ? "25" : "50"} />
                    </div>
                  </Field>
                  <Field label="Applies to">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                      {feeKeysFor(form.billingType).map((k) => (
                        <label key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.text, cursor: "pointer" }}>
                          <input type="checkbox" checked={form.discApplies[k]} onChange={(e) => patchApplies(k, e.target.checked)} />
                          {FEE_LABEL[k]}
                        </label>
                      ))}
                    </div>
                  </Field>
                  <Field label="Sale ends (optional)">
                    <input style={inputStyle} type="date" value={form.discEnd} onChange={(e) => patch({ discEnd: e.target.value })} />
                  </Field>
                  <Field label="Label (optional)">
                    <input style={inputStyle} value={form.discLabel} onChange={(e) => patch({ discLabel: e.target.value })} placeholder="e.g. Launch offer" />
                  </Field>
                </div>
              )}
            </div>

            <Toggle on={form.gstInclusive} onClick={() => patch({ gstInclusive: !form.gstInclusive })} label="Prices include GST" />
            <Toggle on={form.active} onClick={() => patch({ active: !form.active })} label="Active (available to sell)" />

            {formError && <p style={{ margin: "0 0 12px", fontSize: 12, color: C.red }}>{formError}</p>}

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={() => setForm(null)} disabled={saving} style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving} style={{ ...btnPrimary, flex: 1, opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving…" : form.id ? "Save changes" : "Create product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell panel */}
      {selling && (
        <Elements stripe={stripePromise}>
          <SellPanel product={selling} onClose={() => setSelling(null)} onSold={load} />
        </Elements>
      )}
    </AdminShell>
  );
}
