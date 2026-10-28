"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { normalizeAuditTier, type AuditEngagement } from "../../../../lib/audit-types";
import {
  creditEndsAt,
  creditUsedCents,
  describeCredit,
  creditModelForEngagement,
  resolveDeliveredAt,
  TIER_CREDIT_CENTS,
  tierCreditName,
} from "../../../../lib/blueprint-credit";
import { formatAud } from "../../../../lib/money";

/**
 * Admin record of a signed quote or deposit against the Blueprint credit.
 * This does not book a call and does not change Stripe.
 */
export function CreditUsePanel({
  eng,
  onSaved,
  inputStyle,
  btn,
}: {
  eng: AuditEngagement;
  onSaved: (engagement: AuditEngagement) => void;
  inputStyle: CSSProperties;
  btn: CSSProperties;
}) {
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"signed_quote" | "deposit">("signed_quote");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const deliveredAt = resolveDeliveredAt(eng);
  const tier = normalizeAuditTier(eng.tier);
  const full = TIER_CREDIT_CENTS[tier];
  const used = creditUsedCents(eng);
  const model = creditModelForEngagement(eng, now);
  const view = model ? describeCredit(model, now) : null;
  const ends = deliveredAt ? creditEndsAt(new Date(deliveredAt)) : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const dollars = Number(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError("Enter the amount in dollars.");
      return;
    }
    const cents = Math.round(dollars * 100);
    setBusy(true);
    try {
      const res = await fetch(`/api/audit/engagements/${eng.id}/credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cents, kind, reference }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not record that credit.");
        return;
      }
      onSaved(data.engagement);
      setAmount("");
      setReference("");
    } catch {
      setError("Could not record that credit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="au-stats">
        <div>
          <div className="au-stat-l">{tierCreditName(eng.tier)} credit</div>
          <div className="au-stat-v">{formatAud(full / 100)}</div>
        </div>
        <div>
          <div className="au-stat-l">Used</div>
          <div className="au-stat-v">{formatAud(used / 100)}</div>
        </div>
        <div>
          <div className="au-stat-l">Remaining</div>
          <div className="au-stat-v">{formatAud(Math.max(0, full - used) / 100)}</div>
        </div>
      </div>
      <p className="au-status">
        {deliveredAt
          ? `Delivered ${new Date(deliveredAt).toLocaleString("en-AU", { timeZone: "Australia/Brisbane" })} Brisbane. Window ends ${ends ? ends.toLocaleString("en-AU", { timeZone: "Australia/Brisbane" }) : ""} Brisbane.`
          : "Not delivered yet. The credit starts when this Blueprint is marked delivered."}
        {view ? ` Portal card: ${view.statusLabel}.` : deliveredAt ? " Portal card is hidden." : ""}
      </p>
      {(eng.creditApplications ?? []).length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: "24px", color: "#334155" }}>
          {eng.creditApplications!.map((row) => (
            <li key={row.id}>
              {row.kind === "deposit" ? "Deposit" : "Signed quote"} · {formatAud(row.cents / 100)}
              {row.reference ? ` · ${row.reference}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {view ? (
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 420 }}>
          <label>
            <span className="au-label">Amount (AUD)</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              style={inputStyle}
              placeholder="500"
            />
          </label>
          <label>
            <span className="au-label">Recorded as</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as "signed_quote" | "deposit")} style={inputStyle}>
              <option value="signed_quote">Signed quote</option>
              <option value="deposit">Deposit</option>
            </select>
          </label>
          <label>
            <span className="au-label">Reference (optional)</span>
            <input value={reference} onChange={(e) => setReference(e.target.value)} style={inputStyle} />
          </label>
          {error ? <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>{error}</p> : null}
          <button type="submit" disabled={busy} style={{ ...btn, justifySelf: "start" }}>
            {busy ? "Saving…" : "Record credit use"}
          </button>
        </form>
      ) : (
        <p className={deliveredAt ? "au-status" : "au-callout"}>
          {deliveredAt
            ? "Nothing further can be applied. The window has closed or the credit is fully used."
            : "Mark the Blueprint delivered before recording a quote or deposit."}
        </p>
      )}
    </div>
  );
}
