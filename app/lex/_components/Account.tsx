"use client";

import { useState } from "react";
import type { FirmUsage } from "../../../lib/lex-review-access";
import { PORTAL_REQUESTS_HREF } from "../../../lib/portal-pages";
import "./dashboard.css";
import "./account.css";

/** Account inside the Lex shell: login details, password change and sign out. No billing logic here. */
export function AccountView(props: {
  firmName: string; email: string | null; admin: boolean; usage: FirmUsage | null;
  onInvoices: () => void; onFirmSettings: () => void;
}) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const domain = props.email?.split("@")[1] ?? null;

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) { setMsg({ ok: false, text: "The new passwords do not match." }); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: cur, newPassword: next }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setMsg({ ok: true, text: "Password changed." }); setCur(""); setNext(""); setConfirm(""); }
      else setMsg({ ok: false, text: typeof d?.error === "string" ? d.error : "Could not change the password." });
    } catch { setMsg({ ok: false, text: "Could not reach the server. Try again." }); }
    setBusy(false);
  }

  return (
    <div className="lx-body lxh lxa">
      <div className="lxh-col">
        <header className="lxh-head">
          <div>
            <span className="lxh-k">Account</span>
            <h1>Your login</h1>
            <p>{props.email ? `Signed in as ${props.email}` : props.admin ? "Signed in as a Saabai admin" : "Signed in"}</p>
          </div>
        </header>
        <div className="lxh-grid">
          <section className="lxh-card" aria-labelledby="lxa-det-h">
            <div className="lxh-card-h"><h2 id="lxa-det-h">Details</h2></div>
            <dl className="lxa-rows">
              <div><dt>Email</dt><dd>{props.email ?? "-"}</dd></div>
              <div><dt>Firm</dt><dd>{props.firmName || "-"}</dd></div>
              <div><dt>Firm workspace</dt><dd>{props.admin ? "Saabai admin" : domain ? `Everyone signed in from @${domain}` : "-"}</dd></div>
              <div><dt>Product</dt><dd>Lex</dd></div>
            </dl>
            <p className="lxh-fine">Matters are shared with everyone at your firm&apos;s email domain. To add or remove someone, contact Saabai.</p>
            <div className="lxa-btns">
              <button type="button" className="lx-btn" onClick={props.onFirmSettings}>Firm settings</button>
              <form method="post" action="/api/auth/logout"><button type="submit" className="lx-btn">Sign out</button></form>
            </div>
          </section>
          <div className="lxh-side">
            {!props.admin && (
              <section className="lxh-card" aria-labelledby="lxa-pw-h">
                <div className="lxh-card-h"><h2 id="lxa-pw-h">Change password</h2></div>
                <form className="lxa-form" data-no-feedback onSubmit={changePassword}>
                  <label>Current password<input id="lxa-cur" type="password" autoComplete="current-password" required value={cur} onChange={(e) => setCur(e.target.value)} /></label>
                  <label>New password<input id="lxa-new" type="password" autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} /></label>
                  <label>Confirm new password<input id="lxa-conf" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
                  {msg && <p className={`lxa-msg ${msg.ok ? "ok" : "bad"}`} role="status">{msg.text}</p>}
                  <button type="submit" className="lx-btn primary" disabled={busy}>{busy ? "Saving..." : "Change password"}</button>
                </form>
              </section>
            )}
            <section className="lxh-card" aria-labelledby="lxa-help-h">
              <div className="lxh-card-h"><h2 id="lxa-help-h">Billing and help</h2></div>
              <button type="button" className="lxh-link lxa-linkbtn" onClick={props.onInvoices}>Invoices<span>Billing history</span></button>
              <a className="lxh-link" href={PORTAL_REQUESTS_HREF}>Contact Saabai<span>Questions, more users or more capacity</span></a>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Invoices inside the Lex shell. Read-only: nothing here creates, charges or changes billing. */
export function InvoicesView(props: { onAccount: () => void }) {
  return (
    <div className="lx-body lxh lxa">
      <div className="lxh-col">
        <header className="lxh-head">
          <div>
            <span className="lxh-k">Billing</span>
            <h1>Invoices</h1>
            <p>Invoices for your Lex subscription.</p>
          </div>
          <button type="button" className="lx-btn" onClick={props.onAccount}>Back to account</button>
        </header>
        <section className="lxh-card" aria-labelledby="lxa-inv-h">
          <div className="lxh-card-h"><h2 id="lxa-inv-h">Billing history</h2></div>
          <div className="lxh-empty">No invoices yet. When Saabai issues an invoice for your firm it is emailed to your billing contact and will list here.</div>
          <p className="lxh-fine">Questions about an invoice or your plan? <a href={PORTAL_REQUESTS_HREF}>Contact Saabai</a>.</p>
        </section>
      </div>
    </div>
  );
}
