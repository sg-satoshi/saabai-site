"use client";

import { useState, useEffect, useCallback } from "react";
import AdminShell from "../AdminSidebar";
import { CardElement, useStripe, useElements, Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import InvoiceTracker from "./InvoiceTracker";
import type { PaymentRecord } from "../../api/admin/payments/history/route";

// ── Theme ───────────────────────────────────────────────────────────────────

const C = {
  bg:       "#f5f5f7",
  card:     "#ffffff",
  surface:  "#f3f4f6",
  surfaceHi:"#e9eaec",
  border:   "rgba(0,0,0,0.08)",
  borderHi: "rgba(0,0,0,0.12)",
  text:     "#111827",
  muted:    "#9ca3af",
  dim:      "#e5e7eb",
  gold:     "#b45309",
  goldBg:   "rgba(180,83,9,0.08)",
  goldBdr:  "rgba(180,83,9,0.25)",
  green:    "#16a34a",
  greenBg:  "rgba(22,163,74,0.10)",
  blue:     "#2563eb",
  blueBg:   "rgba(37,99,235,0.08)",
  orange:   "#ea580c",
  orangeBg: "rgba(234,88,12,0.08)",
  red:      "#dc2626",
  redBg:    "rgba(220,38,38,0.10)",
  purple:   "#7c3aed",
  purpleBg: "rgba(124,58,237,0.08)",
};

const CARD_STYLE: Record<string, Record<string, string | Record<string, string>>> = {
  base: {
    fontSize: "14px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: C.text,
    "::placeholder": { color: C.muted },
  },
  invalid: { color: C.red },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtDollar(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency", currency: "AUD", maximumFractionDigits: 2,
  }).format(cents / 100);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    succeeded:  { label: "Paid",     color: C.green,  bg: C.greenBg },
    requires_payment_method: { label: "Failed",color: C.red,   bg: C.redBg },
    requires_confirmation: { label: "Pending", color: C.orange, bg: C.orangeBg },
    processing: { label: "Processing", color: C.blue,   bg: C.blueBg },
    requires_action: { label: "Auth needed", color: C.orange, bg: C.orangeBg },
    paid:       { label: "Paid",     color: C.green,  bg: C.greenBg },
    open:       { label: "Sent",     color: C.blue,   bg: C.blueBg },
    draft:      { label: "Draft",    color: C.muted,  bg: "rgba(0,0,0,0.04)" },
    uncollectible: { label: "Uncollectible", color: C.red, bg: C.redBg },
    void:       { label: "Void",     color: C.muted,  bg: "rgba(0,0,0,0.04)" },
  };
  const s = map[status] ?? { label: status, color: C.muted, bg: "rgba(0,0,0,0.04)" };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
      color: s.color, background: s.bg, letterSpacing: 0.5, textTransform: "uppercase",
    }}>
      {s.label}
    </span>
  );
}

function TypeBadge({ type }: { type: "charge" | "invoice" | "subscription" }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    charge:       { label: "Card",     color: C.blue,   bg: C.blueBg },
    invoice:      { label: "Invoice",  color: C.purple, bg: C.purpleBg },
    subscription: { label: "Sub",      color: C.green,  bg: C.greenBg },
  };
  const s = map[type] ?? { label: type, color: C.muted, bg: "rgba(0,0,0,0.04)" };
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
      color: s.color, background: s.bg,
      letterSpacing: 0.3,
    }}>
      {s.label}
    </span>
  );
}

// ── Input block ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 700, color: C.text, letterSpacing: 0.3 }}>{label}</p>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type, disabled }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      type={type || "text"}
      disabled={disabled}
      style={{
        width: "100%", padding: "9px 12px", borderRadius: 8,
        border: `1px solid ${C.border}`, background: C.card,
        fontSize: 13, color: C.text, outline: "none", boxSizing: "border-box",
        transition: "border-color 0.12s",
      }}
      onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
      onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
    />
  );
}

// ── Charge Card Form ────────────────────────────────────────────────────────

function ChargeCardForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();

  const [mode, setMode] = useState<"onetime" | "recurring">("onetime");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [interval, setInterval] = useState("monthly");
  const [customDays, setCustomDays] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSuccess(null);

    if (!stripe || !elements) {
      setError("Stripe is still loading. Please wait.");
      return;
    }

    const amtCents = Math.round(parseFloat(amount) * 100);
    if (!amtCents || amtCents < 50) {
      setError("Enter an amount of at least $0.50");
      return;
    }
    if (!description.trim()) {
      setError("Enter a description");
      return;
    }
    if (mode === "recurring" && !customerEmail.trim()) {
      setError("Customer email is required for subscriptions");
      return;
    }

    setLoading(true);

    try {
      if (mode === "onetime") {
        // ── One-time payment ────────────────────────────────────────────────
        const res = await fetch("/api/admin/payments/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: amtCents,
            description: description.trim(),
            customerName: customerName.trim() || undefined,
            customerEmail: customerEmail.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to create payment");
          setLoading(false);
          return;
        }

        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
          payment_method: { card: elements.getElement(CardElement)! },
        });

        if (confirmError) {
          setError(confirmError.message || "Payment failed");
        } else if (paymentIntent.status === "succeeded") {
          setSuccess(`Payment succeeded — ${fmtDollar(paymentIntent.amount)}`);
          clearForm();
          onSuccess();
        } else {
          setError(`Payment status: ${paymentIntent.status}`);
        }
      } else {
        // ── Recurring subscription ──────────────────────────────────────────
        const res = await fetch("/api/admin/payments/create-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: amtCents,
            description: description.trim(),
            customerName: customerName.trim() || undefined,
            customerEmail: customerEmail.trim(),
            interval,
            customDays: interval === "custom" ? parseInt(customDays) || 30 : undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to create subscription");
          setLoading(false);
          return;
        }

        if (data.clientSecret) {
          const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
            payment_method: { card: elements.getElement(CardElement)! },
          });

          if (confirmError) {
            setError(confirmError.message || "Subscription payment failed");
          } else if (paymentIntent.status === "succeeded") {
            setSuccess(`Subscription started — ${fmtDollar(data.amount)} ${data.interval}`);
            clearForm();
            onSuccess();
          } else {
            setError(`Payment status: ${paymentIntent.status}`);
          }
        } else {
          setSuccess(`Subscription created (status: ${data.status})`);
          clearForm();
          onSuccess();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function clearForm() {
    setAmount("");
    setDescription("");
    setCustomerName("");
    setCustomerEmail("");
  }

  const fmtAmount = amount ? fmtDollar(Math.round(parseFloat(amount || "0") * 100)) : "";

  return (
    <div>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>
        {mode === "onetime" ? "Charge a Card" : "Create a Subscription"}
      </p>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, background: C.surface, borderRadius: 8, padding: 3 }}>
        {[
          { id: "onetime" as const, label: "One-time" },
          { id: "recurring" as const, label: "Recurring" },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            style={{
              flex: 1, padding: "6px 12px", borderRadius: 6, border: "none",
              background: mode === m.id ? C.card : "transparent",
              color: mode === m.id ? C.text : C.muted,
              fontSize: 11, fontWeight: mode === m.id ? 700 : 500,
              cursor: "pointer", boxShadow: mode === m.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <Field label="Amount (AUD)">
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: 9, fontSize: 13, color: C.muted, pointerEvents: "none" }}>$</span>
          <input
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            type="number"
            step="0.01"
            min="0.50"
            style={{
              width: "100%", padding: "9px 12px 9px 28px", borderRadius: 8,
              border: `1px solid ${C.border}`, background: C.card,
              fontSize: 16, fontWeight: 700, color: C.text, outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
            onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
          />
        </div>
      </Field>

      <Field label="Description">
        <Input value={description} onChange={setDescription} placeholder="What's this for?" />
      </Field>

      {mode === "recurring" && (
        <Field label="Billing Interval">
          <select
            value={interval}
            onChange={e => setInterval(e.target.value)}
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 8,
              border: `1px solid ${C.border}`, background: C.card,
              fontSize: 13, color: C.text, outline: "none", fontFamily: "inherit",
            }}
          >
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom (days)</option>
          </select>
          {interval === "custom" && (
            <div style={{ marginTop: 8 }}>
              <Input value={customDays} onChange={setCustomDays} placeholder="Number of days" type="number" />
            </div>
          )}
        </Field>
      )}

      <Field label={mode === "recurring" ? "Customer Name" : "Customer Name (optional)"}>
        <Input value={customerName} onChange={setCustomerName} placeholder="e.g. John Smith" />
      </Field>

      <Field label={mode === "recurring" ? "Customer Email" : "Customer Email (optional)"}>
        <Input value={customerEmail} onChange={setCustomerEmail} placeholder="e.g. john@example.com" type="email" />
      </Field>

      <Field label="Card Details">
        <div style={{
          padding: "10px 12px", borderRadius: 8,
          border: `1px solid ${C.border}`, background: C.card,
        }}>
          <CardElement options={{ style: CARD_STYLE as Record<string, Record<string, string>> }} />
        </div>
      </Field>

      {error && <p style={{ margin: "10px 0 0", fontSize: 12, color: C.red }}>{error}</p>}
      {success && <p style={{ margin: "10px 0 0", fontSize: 12, color: C.green, fontWeight: 600 }}>{success}</p>}

      <button
        onClick={handleSubmit}
        disabled={!stripe || loading}
        style={{
          marginTop: 16, width: "100%", padding: "10px 16px", borderRadius: 8,
          border: "none", background: !stripe || loading ? "#ccc" : mode === "recurring" ? C.purple : C.blue,
          color: "#fff", fontSize: 13, fontWeight: 700, cursor: !stripe || loading ? "not-allowed" : "pointer",
          letterSpacing: 0.2,
        }}
      >
        {loading ? "Processing..." : mode === "onetime"
          ? (fmtAmount ? `Charge ${fmtAmount}` : "Charge")
          : (fmtAmount ? `Start Subscription (${fmtAmount}/${interval})` : "Start Subscription")}
      </button>
    </div>
  );
}

// ── Send Invoice Form ───────────────────────────────────────────────────────

function SendInvoiceForm({ onSuccess }: { onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ hostedUrl: string } | null>(null);

  async function handleSubmit() {
    setError(null);
    setResult(null);

    const amtCents = Math.round(parseFloat(amount) * 100);
    if (!amtCents || amtCents < 50) {
      setError("Enter an amount of at least $0.50");
      return;
    }
    if (!description.trim()) {
      setError("Enter a description");
      return;
    }
    if (!customerEmail.trim()) {
      setError("Customer email is required for invoices");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/payments/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amtCents,
          description: description.trim(),
          customerName: customerName.trim() || undefined,
          customerEmail: customerEmail.trim(),
          message: message.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create invoice");
      } else {
        setResult(data);
        setAmount("");
        setDescription("");
        setCustomerName("");
        setCustomerEmail("");
        setMessage("");
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 18 }}>
        Send an Invoice
      </p>

      <Field label="Amount (AUD)">
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: 9, fontSize: 13, color: C.muted, pointerEvents: "none" }}>$</span>
          <input
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            type="number"
            step="0.01"
            min="0.50"
            style={{
              width: "100%", padding: "9px 12px 9px 28px", borderRadius: 8,
              border: `1px solid ${C.border}`, background: C.card,
              fontSize: 16, fontWeight: 700, color: C.text, outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
            onBlur={e => { e.currentTarget.style.borderColor = C.border; }}
          />
        </div>
      </Field>

      <Field label="Description">
        <Input value={description} onChange={setDescription} placeholder="What's this for?" />
      </Field>

      <Field label="Customer Name (optional)">
        <Input value={customerName} onChange={setCustomerName} placeholder="e.g. John Smith" />
      </Field>

      <Field label="Customer Email">
        <Input value={customerEmail} onChange={setCustomerEmail} placeholder="e.g. john@example.com" type="email" />
      </Field>

      <Field label="Message (optional)">
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Add a note to the invoice..."
          rows={2}
          style={{
            width: "100%", padding: "9px 12px", borderRadius: 8,
            border: `1px solid ${C.border}`, background: C.card,
            fontSize: 13, color: C.text, outline: "none", resize: "vertical",
            boxSizing: "border-box", fontFamily: "inherit",
          }}
        />
      </Field>

      {error && <p style={{ margin: "10px 0 0", fontSize: 12, color: C.red }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: C.greenBg, border: `1px solid rgba(22,163,74,0.2)` }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.green }}>Invoice sent!</p>
          <a href={result.hostedUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: C.blue, textDecoration: "underline", marginTop: 4, display: "inline-block" }}>
            View invoice &rarr;
          </a>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          marginTop: 16, width: "100%", padding: "10px 16px", borderRadius: 8,
          border: "none", background: loading ? "#ccc" : C.purple,
          color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
          letterSpacing: 0.2,
        }}
      >
        {loading ? "Sending..." : amount ? `Send Invoice (${fmtDollar(Math.round(parseFloat(amount || "0") * 100))})` : "Send Invoice"}
      </button>
    </div>
  );
}

// ── Payment History Table ───────────────────────────────────────────────────

function PaymentHistory() {
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/payments/history");
      const data = await res.json();
      if (res.ok) setRecords(data.records || []);
      else setError(data.error || "Failed to load history");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>Recent Transactions</p>
        <button
          onClick={fetchHistory}
          style={{
            padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`,
            background: "transparent", fontSize: 11, color: C.muted, cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {loading && records.length === 0 && (
        <p style={{ margin: 0, fontSize: 12, color: C.muted, textAlign: "center", padding: "32px 0" }}>Loading...</p>
      )}
      {error && <p style={{ margin: 0, fontSize: 12, color: C.red, textAlign: "center", padding: "20px 0" }}>{error}</p>}
      {!loading && !error && records.length === 0 && (
        <p style={{ margin: 0, fontSize: 12, color: C.muted, textAlign: "center", padding: "32px 0" }}>No transactions yet.</p>
      )}

      {records.length > 0 && (
        <div style={{ borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          {/* Header */}
          <div style={{
            display: "grid", gridTemplateColumns: "100px 1fr 100px 80px 60px",
            gap: 8, padding: "9px 14px", background: C.surface,
            borderBottom: `1px solid ${C.border}`,
          }}>
            {["Date", "Description", "Amount", "Status", "Type"].map(h => (
              <p key={h} style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: 1.2, textTransform: "uppercase" }}>{h}</p>
            ))}
          </div>

          {records.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: "grid", gridTemplateColumns: "100px 1fr 100px 80px 60px",
                gap: 8, padding: "10px 14px",
                borderBottom: i < records.length - 1 ? `1px solid ${C.border}` : "none",
                background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)",
                alignItems: "center",
              }}
            >
              <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{fmtDate(r.date)}</p>
              <p style={{
                margin: 0, fontSize: 11, color: C.text,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {r.description || "-"}
              </p>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>{fmtDollar(r.amount)}</p>
              <StatusBadge status={r.status} />
              <TypeBadge type={r.type} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Client Component ───────────────────────────────────────────────────

export default function PaymentsClient({ publishableKey }: { publishableKey: string | null }) {
  const [refreshKey, setRefreshKey] = useState(0);

  if (!publishableKey) {
    return (
      <AdminShell activePath="/saabai-admin/payments">
        <div style={{ maxWidth: 700, margin: "40px auto", padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>💳</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: C.text }}>Stripe Not Configured</h2>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
            To take payments, add your Stripe publishable key to Vercel environment variables.
          </p>
          <div style={{
            padding: "16px 20px", borderRadius: 10, background: C.surface,
            border: `1px solid ${C.border}`, textAlign: "left",
            marginBottom: 16,
          }}>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: C.text }}>Steps:</p>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: C.muted, lineHeight: 1.8 }}>
              <li>Go to <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" style={{ color: C.blue }}>Stripe Dashboard &rarr; API keys</a></li>
              <li>Copy your <strong>Publishable key</strong> (starts with <code>pk_live_</code> or <code>pk_test_</code>)</li>
              <li>Run: <code style={{ background: C.surfaceHi, padding: "1px 5px", borderRadius: 3 }}>vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code></li>
              <li>Redeploy or run <code style={{ background: C.surfaceHi, padding: "1px 5px", borderRadius: 3 }}>vercel pull --environment=production</code> locally</li>
            </ol>
          </div>
        </div>
      </AdminShell>
    );
  }

  const stripePromise = loadStripe(publishableKey);
  const [tab, setTab] = useState<"payments" | "invoices">("payments");

  return (
    <AdminShell activePath="/saabai-admin/payments">
      <div style={{ padding: "32px 40px", maxWidth: 1040, margin: "0 auto" }}>
        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: -0.3 }}>Payments</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>Charge cards, send invoices, and manage your bookkeeping</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
          {([
            { id: "payments" as const, label: "Payments", desc: "Card charges & Stripe invoices" },
            { id: "invoices" as const, label: "Invoices", desc: "Bookkeeping tracker" },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "10px 18px", border: "none", borderBottom: tab === t.id ? `2px solid ${C.blue}` : "2px solid transparent",
                background: "transparent", cursor: "pointer", textAlign: "left",
                opacity: tab === t.id ? 1 : 0.6, transition: "all 0.12s",
              }}
            >
              <p style={{ margin: 0, fontSize: 13, fontWeight: tab === t.id ? 700 : 500, color: C.text }}>{t.label}</p>
              <p style={{ margin: "2px 0 0", fontSize: 10, color: C.muted }}>{t.desc}</p>
            </button>
          ))}
        </div>

        {tab === "payments" ? (
          <>
            {/* Two-panel form */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20,
              marginBottom: 36,
            }}>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
                <Elements stripe={stripePromise}>
                  <ChargeCardForm onSuccess={() => setRefreshKey(k => k + 1)} />
                </Elements>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
                <SendInvoiceForm onSuccess={() => setRefreshKey(k => k + 1)} />
              </div>
            </div>

            {/* History */}
            <div key={refreshKey}>
              <PaymentHistory />
            </div>
          </>
        ) : (
          <InvoiceTracker />
        )}
      </div>
    </AdminShell>
  );
}
