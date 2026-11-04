"use client";

import { useEffect, useRef, useState } from "react";
import { deleteConfirmText, editLocked } from "../../../../lib/email/contact-copy";
import type { Evidence } from "../../../../lib/consent-evidence";

type Person = {
  id: string;
  email: string;
  first_name: string | null;
  status: string;
  consent_source: string | null;
  consent_text: string | null;
  consent_version: string | null;
  consent_at: string | null;
  confirmed_at: string | null;
  suppressed: boolean;
  reason: string;
  referrals?: number;
  referral_entries?: number;
  review?: boolean;
  referred_by?: string;
  mobile?: string | null;
  evidence?: Evidence | null;
};

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
type Draft = { email: string; firstName: string; mobile: string; status: "keep" | "unsubscribed" };

type Payload = { ok: true; people: Person[]; counts: { confirmed: number; pending: number; unsubscribed: number; suppressed: number } };

function fmtWhen(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) + " AEST";
}

const NR = "Not recorded";
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : "");
function place(country: unknown, region: unknown, city: unknown) {
  return [str(city), str(region), str(country)].filter(Boolean).join(", ");
}

/** Read-only Spam Act consent evidence. Missing values read "Not recorded". */
function ConsentRecord({ p }: { p: Person }) {
  const e = p.evidence || {};
  const utm = (["source", "medium", "campaign", "content", "term"] as const)
    .map((k) => [k, str(e[`utm_${k}` as keyof Evidence])] as const).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(" · ");
  const row = (label: string, value: string, mono = false) => (
    <><span>{label}</span><b className={mono ? "mono" : undefined}>{value || NR}</b></>
  );
  return (
    <div className="sub-ev">
      <details className="sub-consent" open>
        <summary>Signup</summary>
        <div className="in">
          <dl className="em-kv">
            {row("Signed up", fmtWhen(p.consent_at))}
            {row("Form", str(e.form_id) || str(p.consent_source))}
            {row("Page", str(e.page_url), true)}
            {row("Referrer", str(e.source), true)}
            {row("UTM", utm)}
            {row("IP address", str(e.signup_ip), true)}
            {row("Location", place(e.signup_country, e.signup_region, e.signup_city))}
            {row("Device", str(e.user_agent))}
          </dl>
        </div>
      </details>
      <details className="sub-consent" open>
        <summary>Consent shown</summary>
        <div className="in">
          <dl className="em-kv">
            {row("Version", str(p.consent_version))}
            {row("SMS opt-in", e.sms_consent ? `Yes, ${fmtWhen(str(e.sms_consent_at) || null) || "time not recorded"}` : "No")}
          </dl>
          <blockquote>{p.consent_text || "No wording stored."}</blockquote>
          {e.sms_consent && str(e.sms_consent_text) ? <blockquote>{str(e.sms_consent_text)}</blockquote> : null}
        </div>
      </details>
      <details className="sub-consent" open>
        <summary>Double opt-in confirmation</summary>
        <div className="in">
          <dl className="em-kv">
            {row("Confirmed", fmtWhen(p.confirmed_at) || (p.status === "pending" ? "Not yet" : ""))}
            {row("Click recorded", fmtWhen(str(e.confirm_evidence_at) || null))}
            {row("IP address", str(e.confirm_ip), true)}
            {row("Location", place(e.confirm_country, e.confirm_region, e.confirm_city))}
            {row("Device", str(e.confirm_user_agent))}
          </dl>
        </div>
      </details>
      <details className="sub-consent">
        <summary>Referrals</summary>
        <div className="in">
          <dl className="em-kv">
            {row("Referrals", String(p.referrals ?? 0) + (p.review ? " (over 25: check before a draw)" : ""))}
            {row("Referred by", p.referred_by || "None")}
          </dl>
        </div>
      </details>
    </div>
  );
}

function statusChip(p: Person) {
  if (p.suppressed || p.status === "bounced" || p.status === "complained") {
    const why = /complaint/i.test(p.reason) || p.status === "complained" ? "complaint" : "bounce";
    return <span className="badge b-bad">Suppressed: {why}</span>;
  }
  if (p.status === "pending") return <span className="badge b-warn">Pending</span>;
  if (p.status === "unsubscribed") return <span className="badge b-n">Unsubscribed</span>;
  if (p.status === "subscribed") return <span className="badge b-ok">Confirmed</span>;
  return <span className="badge b-n">{p.status}</span>;
}

export default function Subscribers() {
  const [data, setData] = useState<Payload | null>(null);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<Person | null>(null);
  const [csv, setCsv] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flash(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3200);
  }

  function openRow(p: Person) {
    setOpen(p);
    setFieldErr({});
    setDraft({ email: p.email, firstName: p.first_name || "", mobile: p.mobile || "", status: "keep" });
  }

  function toggle(id: string) {
    setSelected((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return res.json().catch(() => ({ ok: false, error: "Check your connection and try again." }));
  }

  async function saveEdit() {
    if (!open || !draft) return;
    const errs: Record<string, string> = {};
    if (!EMAIL_RE.test(draft.email.trim())) errs.email = "Enter one valid email address.";
    if (draft.firstName.trim().length > 60) errs.firstName = "Keep the name under 60 characters.";
    setFieldErr(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const j = await post({ action: "updateContact", id: open.id, email: draft.email, firstName: draft.firstName, mobile: draft.mobile, status: draft.status });
    setSaving(false);
    if (!j.ok) { setFieldErr(j.fields || {}); if (!j.fields) setFieldErr({ form: j.error || "That did not save." }); return; }
    setOpen(null); setDraft(null);
    flash(j.changed?.length ? "Subscriber saved" : "No changes to save");
    load();
  }

  async function doDelete() {
    if (!confirmIds) return;
    setSaving(true);
    const j = await post({ action: "deleteContacts", ids: confirmIds });
    setSaving(false);
    if (!j.ok) { setConfirmIds(null); setNote(j.error || "Delete did not run. Nothing was changed."); return; }
    setConfirmIds(null); setOpen(null); setDraft(null);
    setSelected(new Set());
    flash(`Deleted ${j.deleted} subscriber${j.deleted === 1 ? "" : "s"}${j.cancelled ? `, cancelled ${j.cancelled} queued email${j.cancelled === 1 ? "" : "s"}` : ""}`);
    load();
  }

  function load(nextStatus = status, nextQ = q) {
    const params = new URLSearchParams({ view: "subscribers", status: nextStatus, q: nextQ });
    fetch(`/api/admin/email?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) setErr(j.error || "Could not load subscribers.");
        else { setErr(""); setData(j); const ids = new Set((j.people as Person[]).map((p) => p.id)); setSelected((cur) => new Set([...cur].filter((id) => ids.has(id)))); }
      })
      .catch(() => setErr("Check your connection and try again. Nothing was changed."));
  }
  useEffect(() => { load("all", ""); }, []);

  async function doImport() {
    const res = await fetch("/api/admin/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import", csv }) });
    const json = await res.json().catch(() => ({}));
    if (!json.ok) { setNote(json.error || "Import did not run."); return; }
    setNote(`Added ${json.added}. Skipped ${json.skipped} already on the list. New rows stay pending until they confirm.`);
    setImportOpen(false);
    load();
  }

  function exp() {
    const rows = data?.people || [];
    const body = ["email,status,consent_source,consent_at", ...rows.map((p) => [p.email, p.status, p.consent_source || "", p.consent_at || ""].join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
    a.download = "sunder-subscribers.csv";
    a.click();
  }

  const people = data?.people || [];
  const allOn = people.length > 0 && people.every((p) => selected.has(p.id));
  const someOn = !allOn && people.some((p) => selected.has(p.id));

  return (
    <div className="em-page">
      <div className="ph">
        <div>
          <h1>Subscribers</h1>
          <p className="sub">Double opt-in. Pending means the confirm email has not been clicked yet. Pending people get no marketing email. Every row keeps consent source, wording, version and time.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn" onClick={exp} disabled={!data?.people.length}>Export</button>
          <button type="button" className="btn pri" onClick={() => setImportOpen(true)}>Import CSV</button>
        </div>
      </div>
      {note && <div className="em-alert info" style={{ marginBottom: 12 }}>{note}</div>}
      <div className="kpis">
        <div className="card kpi"><div className="l">Confirmed</div><div className="v">{data ? data.counts.confirmed.toLocaleString("en-AU") : "..."}</div></div>
        <div className="card kpi"><div className="l">Pending confirm</div><div className="v">{data ? data.counts.pending.toLocaleString("en-AU") : "..."}</div></div>
        <div className="card kpi"><div className="l">Unsubscribed</div><div className="v">{data ? data.counts.unsubscribed.toLocaleString("en-AU") : "..."}</div></div>
        <div className="card kpi"><div className="l">Suppressed</div><div className="v">{data ? data.counts.suppressed.toLocaleString("en-AU") : "..."}</div><div className="d">Bounce or complaint</div></div>
      </div>
      <div className="card">
        <div className="fbar">
          <label className="inp" style={{ width: "min(100%, 360px)", flex: "1 1 220px" }}><input aria-label="Search email" value={q} placeholder="Search email" onChange={(e) => setQ(e.target.value)} style={{ border: 0, width: "100%", font: "inherit", background: "transparent" }} /></label>
          <label className="em-help">Status
            <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); load(e.target.value, q); }} style={{ marginLeft: 8, height: 36 }}>
              <option value="all">All</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="suppressed">Suppressed</option>
            </select>
          </label>
          <button type="button" className="btn sm" onClick={() => { setQ(""); setStatus("all"); load("all", ""); }}>Clear</button>
          <span className="em-help" style={{ marginLeft: "auto" }}>{data ? `${data.people.length} shown` : ""}</span>
        </div>
        {selected.size > 0 && (
          <div className="sub-selbar" role="region" aria-label="Selected subscribers">
            <b>{selected.size} selected</b>
            <button type="button" className="btn sm" onClick={() => setSelected(new Set())}>Clear selection</button>
            <button type="button" className="btn sm dg" onClick={() => setConfirmIds([...selected])}>Delete {selected.size}</button>
          </div>
        )}
        {err && <div className="bd"><div className="em-alert bad">{err}</div></div>}
        {!!data?.people.some((p) => p.review) && <div className="bd"><div className="em-alert warn">{data.people.filter((p) => p.review).length} shown with over 25 referral entries. Check them by hand before a draw.</div></div>}
        {data && !data.people.length && (
          <div className="em-empty"><h2>No subscribers match these filters</h2><p>Try another status or clear the filters.</p></div>
        )}
        {!!data?.people.length && (
          <>
          <div className="em-mob">
            {data.people.map((p) => (
              <div key={p.id} className={`oc sub-row${selected.has(p.id) ? " on" : ""}`} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <input type="checkbox" className="sub-cb" aria-label={`Select ${p.email}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                <button type="button" onClick={() => openRow(p)} style={{ flex: 1, textAlign: "left", background: "transparent", border: 0, font: "inherit", padding: 0, cursor: "pointer" }}>
                  <b>{p.email}</b>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>{statusChip(p)}<span className="em-help">{p.consent_at ? new Date(p.consent_at).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short" }) : ""}</span></div>
                </button>
              </div>
            ))}
          </div>
          <table className="em-desk sub-table">
            <thead><tr><th className="sub-cbcell"><input type="checkbox" className="sub-cb" aria-label="Select all shown" checked={allOn} ref={(el) => { if (el) el.indeterminate = someOn; }} onChange={() => setSelected(allOn ? new Set() : new Set(people.map((p) => p.id)))} /></th><th>Name</th><th>Email</th><th>Status</th><th>Consent source</th><th>Consent time</th><th>Referrals</th><th>Referred by</th><th></th></tr></thead>
            <tbody>
              {data.people.map((p) => (
                <tr key={p.id} className={`sub-row${selected.has(p.id) ? " on" : ""}`} tabIndex={0} aria-label={`Edit ${p.email}`} onClick={() => openRow(p)} onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) openRow(p); }}>
                  <td className="sub-cbcell" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="sub-cb" aria-label={`Select ${p.email}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>
                  <td>{p.first_name || <span className="em-help">None</span>}</td>
                  <td>{p.email}</td>
                  <td>{statusChip(p)}</td>
                  <td>{p.consent_source || "Waitlist"}</td>
                  <td>{p.consent_at ? new Date(p.consent_at).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : ""}</td>
                  <td>{p.referrals ?? 0}{p.review && <> <span className="badge b-warn" title="Over 25 referral entries: check before a draw">Review</span></>}</td>
                  <td>{p.referred_by || ""}</td>
                  <td className="sub-go" aria-hidden="true">Edit</td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>
      <div className="em-alert warn" style={{ marginTop: 12 }}>Suppressed and unsubscribed people are never mailed and cannot be re-added from here. They can only rejoin by signing up again.</div>

      {open && draft && (() => {
        const locked = editLocked(open.status, open.suppressed);
        const dirty = draft.email.trim().toLowerCase() !== open.email || draft.firstName.trim() !== (open.first_name || "") || draft.mobile.trim() !== (open.mobile || "") || draft.status !== "keep";
        const close = () => { if (dirty && !window.confirm("Discard your unsaved changes?")) return; setOpen(null); setDraft(null); };
        return (
        <div className="drawer-detail" role="presentation" onClick={close}>
          <aside className="panel sub-panel" role="dialog" aria-modal="true" aria-labelledby="sub-edit-h" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape") close(); }}>
            <div className="hd"><h2 id="sub-edit-h">{locked ? "Subscriber" : "Edit subscriber"}</h2><button type="button" className="btn sm" onClick={close}>Close</button></div>
            <div className="bd">
              <div>{statusChip(open)}</div>
              {fieldErr.form && <div className="em-alert bad">{fieldErr.form}</div>}
              {locked && <p className="em-help">Bounced or complained people are read only so the suppression record stays intact. You can still delete them.</p>}
              <div className="sub-sec sub-first">Details</div>
              <label className={`em-field${fieldErr.firstName ? " err" : ""}`}>First name
                <input value={draft.firstName} disabled={locked} maxLength={60} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
                {fieldErr.firstName && <span className="em-help e">{fieldErr.firstName}</span>}
              </label>
              <label className={`em-field${fieldErr.email ? " err" : ""}`}>Email
                <input type="email" value={draft.email} disabled={locked} onChange={(e) => setDraft({ ...draft, email: e.target.value })} aria-invalid={!!fieldErr.email} />
                {fieldErr.email && <span className="em-help e">{fieldErr.email}</span>}
              </label>
              <label className={`em-field${fieldErr.mobile ? " err" : ""}`}>Mobile
                <input type="tel" value={draft.mobile} disabled={locked} placeholder="Optional" onChange={(e) => setDraft({ ...draft, mobile: e.target.value })} />
                {fieldErr.mobile ? <span className="em-help e">{fieldErr.mobile}</span> : <span className="em-help">Clearing it also turns off SMS consent.</span>}
              </label>
              {!locked && open.status !== "unsubscribed" && (
                <label className="em-field">Status
                  <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Draft["status"] })}>
                    <option value="keep">Keep as {open.status === "subscribed" ? "confirmed" : open.status}</option>
                    <option value="unsubscribed">Unsubscribe</option>
                  </select>
                  {fieldErr.status ? <span className="em-help e">{fieldErr.status}</span> : <span className="em-help">People can only be confirmed by clicking their own confirm email.</span>}
                </label>
              )}
              <div className="sub-sec">Record</div>
              <ConsentRecord p={open} />
            </div>
            <div className="sub-foot">
              <button type="button" className="btn dg" onClick={() => setConfirmIds([open.id])}>Delete</button>
              <span style={{ flex: 1 }} />
              <button type="button" className="btn" onClick={close}>Cancel</button>
              {!locked && <button type="button" className="btn pri" disabled={saving || !dirty} onClick={saveEdit}>{saving ? "Saving..." : "Save"}</button>}
            </div>
          </aside>
        </div>
        );
      })()}

      {confirmIds && (
        <div className="em-modal" style={{ zIndex: 95 }}>
          <div className="em-dialog" role="alertdialog" aria-modal="true" aria-labelledby="del-h" aria-describedby="del-d">
            <h2 id="del-h">Delete {confirmIds.length === 1 ? "1 subscriber" : `${confirmIds.length} subscribers`}</h2>
            <p id="del-d" className="em-help" style={{ fontSize: 13.5 }}>{deleteConfirmText(confirmIds.length)}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button type="button" className="btn" disabled={saving} onClick={() => setConfirmIds(null)} autoFocus>Cancel</button>
              <button type="button" className="btn danger-solid" disabled={saving} onClick={doDelete}>{saving ? "Deleting..." : `Delete ${confirmIds.length}`}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="sub-toast" role="status" aria-live="polite">{toast}</div>}

      {importOpen && (
        <div className="em-modal">
          <div className="em-dialog" role="dialog" aria-modal="true" aria-labelledby="imp-h">
            <h2 id="imp-h">Import CSV</h2>
            <p className="em-help">Header: email, first_name, consent_source. Every row needs a consent source. Imported people stay pending until they confirm. They are not mailed before that.</p>
            <textarea rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} aria-label="CSV" style={{ width: "100%", font: "inherit" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button type="button" className="btn" onClick={() => setImportOpen(false)}>Cancel</button>
              <button type="button" className="btn pri" onClick={doImport}>Import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
