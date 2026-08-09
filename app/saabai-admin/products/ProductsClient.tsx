"use client";

import { useState, useEffect, useCallback } from "react";
import AdminShell from "../AdminSidebar";
import type { CatalogueProduct, BillingType, Interval } from "../../../lib/product-catalogue";

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

function priceLabel(p: CatalogueProduct): string {
  if (p.billingType === "one_time") return `${fmtCents(p.oneTimeAmount)} one-off`;
  const per = p.interval ? INTERVAL_LABEL[p.interval] : "month";
  if (p.billingType === "recurring") {
    return `${fmtCents(p.recurringAmount)}/${per}${p.trialDays ? ` · ${p.trialDays}d trial` : ""}`;
  }
  return `${fmtCents(p.setupFee)} setup + ${fmtCents(p.recurringAmount)}/${per}`;
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
  };
}

function fromProduct(p: CatalogueProduct): FormState {
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
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        marginBottom: 14,
      }}
    >
      <span
        style={{
          width: 38,
          height: 22,
          borderRadius: 22,
          background: on ? C.green : "#d1d5db",
          position: "relative",
          transition: "background 0.15s",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 18 : 2,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.15s",
          }}
        />
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{label}</span>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProductsClient() {
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

  useEffect(() => {
    load();
  }, [load]);

  function patch(p: Partial<FormState>) {
    setForm((f) => (f ? { ...f, ...p } : f));
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

    try {
      const url = form.id ? `/api/admin/products/${form.id}` : "/api/admin/products";
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
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

  const btnPrimary: React.CSSProperties = {
    padding: "10px 18px",
    borderRadius: 8,
    border: "none",
    background: C.blue,
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  };

  return (
    <AdminShell activePath="/saabai-admin/products">
      <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.text }}>Products</h1>
          <button style={btnPrimary} onClick={() => { setFormError(null); setForm(blankForm()); }}>
            + Add product
          </button>
        </div>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: C.dim }}>
          Create the products you sell. Each one syncs to Stripe as a product and price.
        </p>

        {/* List */}
        {loading ? (
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
              <div
                key={p.id}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  opacity: p.active ? 1 : 0.6,
                }}
              >
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
                    {!p.active && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, background: "rgba(0,0,0,0.05)", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" }}>Inactive</span>
                    )}
                  </div>
                  <p style={{ margin: "0 0 10px", fontSize: 12, color: C.dim, lineHeight: 1.5, flex: 1 }}>
                    {p.description || <span style={{ color: C.muted }}>No description</span>}
                  </p>
                  <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: C.teal }}>
                    {priceLabel(p)}
                    <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginLeft: 6 }}>
                      {p.gstInclusive ? "incl. GST" : "+ GST"}
                    </span>
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => { setFormError(null); setForm(fromProduct(p)); }}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => archive(p)}
                      style={{ padding: "8px 12px", borderRadius: 7, border: `1px solid ${C.redBg}`, background: C.redBg, color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
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
        <div
          onClick={() => !saving && setForm(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto", zIndex: 200 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 480, background: C.bg, borderRadius: 14, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
          >
            <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 800, color: C.text }}>
              {form.id ? "Edit product" : "New product"}
            </h2>

            {!form.id && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: C.dim }}>Quick start from a website tier</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {PRESETS.map((pr) => (
                    <button
                      key={pr.label}
                      type="button"
                      onClick={() => patch({ name: pr.label, billingType: "setup_monthly", interval: "monthly", setup: pr.setup, recurring: pr.recurring })}
                      style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
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
              <textarea
                style={{ ...inputStyle, minHeight: 60, resize: "vertical", fontFamily: "inherit" }}
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Short summary shown on the product card"
              />
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

            <Toggle on={form.gstInclusive} onClick={() => patch({ gstInclusive: !form.gstInclusive })} label="Prices include GST" />
            <Toggle on={form.active} onClick={() => patch({ active: !form.active })} label="Active (available to sell)" />

            {formError && <p style={{ margin: "0 0 12px", fontSize: 12, color: C.red }}>{formError}</p>}

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                onClick={() => setForm(null)}
                disabled={saving}
                style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                style={{ ...btnPrimary, flex: 1, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Saving…" : form.id ? "Save changes" : "Create product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
