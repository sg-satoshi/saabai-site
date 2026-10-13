"use client";
import React, { useState } from "react";
import "./billing.css";
import { STATUS_UI, statusDetail, type BillingRecordSummary } from "./status";

/** Billing Status cell for Site Factory rows: badge, detail line and the next action (mockups 50, 54, 55, 57). */
export function SiteBillingCell({ record, fallback, hasExistingBilling, onSetup, siteDomain, onChanged }: {
  record?: BillingRecordSummary;
  fallback: React.ReactNode;
  hasExistingBilling: boolean;
  onSetup: () => void;
  siteDomain?: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function act(action: string) {
    if (!record) return;
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/admin/billing/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, siteId: record.siteId, siteDomain }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      if (d.url) window.open(d.url, "_blank", "noopener");
      if (action === "resend" || action === "card-link") setMsg(d.emailed ? "Sent" : "Link created, email not sent");
      onChanged();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }
  const ui = record ? STATUS_UI[record.status] || STATUS_UI.none : null;
  let action: React.ReactNode = null;
  if (!record || record.status === "cancelled") {
    action = !hasExistingBilling ? <button className="bl-btn teal sm" onClick={onSetup}>+ Set up billing</button> : null;
  } else if (record.status === "pending") {
    action = <button className="bl-btn sm" disabled={busy} onClick={() => act("resend")}>Resend link</button>;
  } else if (record.status === "link_expired") {
    action = <button className="bl-btn teal sm" disabled={busy} onClick={() => act("resend")}>Send new link</button>;
  } else if (["payment_failed", "past_due", "paused"].includes(record.status)) {
    action = <button className="bl-btn sm" disabled={busy} onClick={() => act("card-link")}>Send card update link</button>;
  } else {
    action = <button className="bl-btn ghost sm" disabled={busy} onClick={() => act("manage")}>Manage in Stripe ↗</button>;
  }
  return (
    <div className="bl" style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start", minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
      {record && ui && record.status !== "cancelled" ? (
        <>
          <span className={`bl-badge ${ui.tone}`}>{ui.label}</span>
          <span className="num" style={{ fontSize: 10.5, color: "#5f6580", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{statusDetail(record)}</span>
        </>
      ) : fallback}
      {action}
      {msg && <span style={{ fontSize: 10.5, color: "#5f6580" }}>{msg}</span>}
    </div>
  );
}
