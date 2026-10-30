"use client";
/**
 * Clients tab and Audit tab for /saabai-admin/payments (Phase A).
 * Light mode only; navy primary buttons (.btn.pri). GST is stored, never charged here.
 */
import { useCallback, useEffect, useRef, useState } from "react";

interface Address { line1?: string; line2?: string; city?: string; state?: string; postcode?: string; country?: string }
interface Client {
  id: string; name: string; firm?: string; email: string; phone?: string; address?: Address; abn?: string;
  gst: "not_registered" | "registered"; notes?: string; stripeCustomerId?: string; lexFirmId?: string; createdAt: string; updatedAt: string;
}
interface StripeView {
  customer: { id: string; name?: string | null; email?: string | null; deleted?: boolean };
  payments: { id: string; amount: number; status: string; created: number; description: string | null }[];
  invoices: { id: string; number: string | null; amount: number; status: string | null; created: number; url: string | null }[];
  subscriptions: { id: string; status: string; created: number; amount: number | null; interval: string | null }[];
}

const money = (c: number | null | undefined) => (c == null ? "" : `$${(c / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const day = (u: number) => new Date(u * 1000).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Brisbane" });
const dash = (s: string | null | undefined) => s || "Not set";
const gstText = (g: Client["gst"]) => (g === "registered" ? "GST flag on (charging comes later)" : "GST not applicable");
const stripeUrl = (path: string) => `https://dashboard.stripe.com/${path}`;

const box: React.CSSProperties = { background: "#fff", border: "1px solid #dfe2ea", borderRadius: 10, padding: 16 };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#5f6580", display: "block", marginBottom: 4 };
const inp: React.CSSProperties = { width: "100%", height: 36, padding: "0 10px", border: "1px solid #c6cad6", borderRadius: 8, fontSize: 14, background: "#fff", color: "#13152a" };
const th: React.CSSProperties = { textAlign: "left", fontSize: 12, color: "#5f6580", fontWeight: 600, padding: "8px 10px", borderBottom: "1px solid #dfe2ea" };
const td: React.CSSProperties = { fontSize: 13, color: "#13152a", padding: "8px 10px", borderBottom: "1px solid #eceef4" };

type Form = {
  name: string; firm: string; email: string; phone: string; abn: string; gst: Client["gst"]; notes: string; lexFirmId: string;
  line1: string; line2: string; city: string; state: string; postcode: string; country: string;
};
const emptyForm: Form = { name: "", firm: "", email: "", phone: "", abn: "", gst: "not_registered", notes: "", lexFirmId: "", line1: "", line2: "", city: "", state: "", postcode: "", country: "AU" };
const toForm = (c: Client): Form => ({
  name: c.name, firm: c.firm || "", email: c.email, phone: c.phone || "", abn: c.abn || "", gst: c.gst, notes: c.notes || "", lexFirmId: c.lexFirmId || "",
  line1: c.address?.line1 || "", line2: c.address?.line2 || "", city: c.address?.city || "", state: c.address?.state || "", postcode: c.address?.postcode || "", country: c.address?.country || "AU",
});

function ClientForm({ initial, onSaved, onCancel }: { initial: Client | null; onSaved: (c: Client) => void; onCancel: () => void }) {
  const [f, setF] = useState<Form>(initial ? toForm(initial) : emptyForm);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function save() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setErr(null);
    try {
      const body = {
        name: f.name, firm: f.firm, email: f.email, phone: f.phone, abn: f.abn, gst: f.gst, notes: f.notes, lexFirmId: f.lexFirmId,
        address: { line1: f.line1, line2: f.line2, city: f.city, state: f.state, postcode: f.postcode, country: f.country },
      };
      const res = await fetch(initial ? `/api/admin/billing-clients/${initial.id}` : "/api/admin/billing-clients", {
        method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.client && (res.ok || res.status === 502)) {
        if (!res.ok) setErr(data.error);
        onSaved(data.client);
      } else setErr(data.error || "Could not save");
    } catch { setErr("Network error"); }
    finally { inFlight.current = false; setBusy(false); }
  }

  const field = (k: keyof Form, label: string, ph = "") => (
    <div><label style={lbl}>{label}</label><input style={inp} value={f[k]} onChange={set(k)} placeholder={ph} disabled={busy} /></div>
  );
  return (
    <div style={box}>
      <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#13152a" }}>{initial ? "Edit client" : "New client"}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
        {field("name", "Contact name")}
        {field("firm", "Business or firm")}
        {field("email", "Email")}
        {field("phone", "Phone")}
        {field("abn", "ABN", "11 digits")}
        <div><label style={lbl}>GST</label>
          <select style={inp} value={f.gst} onChange={set("gst")} disabled={busy}>
            <option value="not_registered">GST not applicable</option>
            <option value="registered">GST flag on (no GST charged yet)</option>
          </select>
        </div>
        {field("line1", "Address line 1")}
        {field("line2", "Address line 2")}
        {field("city", "Suburb or city")}
        {field("state", "State")}
        {field("postcode", "Postcode")}
        {field("country", "Country code", "AU")}
        {field("lexFirmId", "Linked Lex firm id (optional)")}
      </div>
      <div style={{ marginTop: 12 }}><label style={lbl}>Notes</label>
        <textarea style={{ ...inp, height: 70, padding: 10 }} value={f.notes} onChange={set("notes")} disabled={busy} />
      </div>
      {err && <p style={{ color: "#dc2626", fontSize: 13, margin: "10px 0 0" }}>{err}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button className="btn pri" onClick={save} disabled={busy} aria-busy={busy}>{busy ? "Saving..." : initial ? "Save and sync to Stripe" : "Create and sync to Stripe"}</button>
        <button className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </div>
  );
}

function ClientDetail({ id, onEdit }: { id: string; onEdit: (c: Client) => void }) {
  const [data, setData] = useState<{ client: Client; stripe: StripeView | null; error?: string } | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/admin/billing-clients/${id}`).then((r) => r.json()).then((d) => live && setData(d)).catch(() => live && setData(null));
    return () => { live = false; };
  }, [id]);
  if (!data) return <div style={box}>Loading...</div>;
  const { client: c, stripe: s } = data;
  return (
    <div style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, color: "#13152a" }}>{c.firm || c.name}</h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5f6580" }}>{c.name} · {c.email} · {dash(c.phone)}</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5f6580" }}>ABN {dash(c.abn)} · {gstText(c.gst)}{c.lexFirmId ? ` · Lex firm ${c.lexFirmId}` : ""}</p>
          {c.notes && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#13152a", whiteSpace: "pre-wrap" }}>{c.notes}</p>}
        </div>
        <button className="btn" onClick={() => onEdit(c)}>Edit</button>
      </div>
      <h4 style={{ margin: "16px 0 6px", fontSize: 13, color: "#13152a" }}>Stripe customer</h4>
      {!c.stripeCustomerId ? <p style={{ fontSize: 13, color: "#5f6580" }}>Not linked yet. Save the client to sync.</p> : (
        <p style={{ fontSize: 13 }}>
          <a href={stripeUrl(`customers/${c.stripeCustomerId}`)} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>{c.stripeCustomerId}</a>
          {s?.customer.deleted ? " (deleted in Stripe, save to relink)" : ""}
        </p>
      )}
      {data.error && <p style={{ color: "#dc2626", fontSize: 13 }}>Stripe: {data.error}</p>}
      {s && (
        <>
          <Section title="Payments" empty={!s.payments.length}>
            {s.payments.map((p) => <tr key={p.id}><td style={td}>{day(p.created)}</td><td style={td}>{p.description || p.id}</td><td style={td}>{money(p.amount)}</td><td style={td}>{p.status}</td></tr>)}
          </Section>
          <Section title="Invoices" empty={!s.invoices.length}>
            {s.invoices.map((i) => <tr key={i.id}><td style={td}>{day(i.created)}</td><td style={td}>{i.url ? <a href={i.url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>{i.number || i.id}</a> : (i.number || i.id)}</td><td style={td}>{money(i.amount)}</td><td style={td}>{i.status}</td></tr>)}
          </Section>
          <Section title="Subscriptions" empty={!s.subscriptions.length}>
            {s.subscriptions.map((x) => <tr key={x.id}><td style={td}>{day(x.created)}</td><td style={td}>{x.id}</td><td style={td}>{money(x.amount)}{x.interval ? ` / ${x.interval}` : ""}</td><td style={td}>{x.status}</td></tr>)}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return (
    <>
      <h4 style={{ margin: "14px 0 6px", fontSize: 13, color: "#13152a" }}>{title}</h4>
      {empty ? <p style={{ fontSize: 13, color: "#5f6580", margin: 0 }}>None yet.</p> : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}><table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse" }}><thead><tr><th style={th}>Date</th><th style={th}>Item</th><th style={th}>Amount</th><th style={th}>Status</th></tr></thead><tbody>{children}</tbody></table></div>
      )}
    </>
  );
}

export function BillingClientsTab() {
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<Client | "new" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/billing-clients");
      const d = await res.json();
      if (!res.ok) setErr(d.error || "Could not load clients"); else { setClients(d.clients); setErr(null); }
    } catch { setErr("Network error"); }
    setLoading(false);
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const s = q.trim().toLowerCase();
  const shown = s ? clients.filter((c) => [c.name, c.firm, c.email, c.phone, c.abn, c.stripeCustomerId].some((v) => v?.toLowerCase().includes(s))) : clients;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input style={{ ...inp, maxWidth: 320 }} placeholder="Search name, firm, email, ABN" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search clients" />
        <button className="btn pri" onClick={() => { setEditing("new"); setSelected(null); }}>New client</button>
      </div>
      {editing && (
        <ClientForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={(c) => { setEditing(null); setSelected(c.id); setRev((r) => r + 1); load(); }}
        />
      )}
      <div style={box}>
        {err && <p style={{ color: "#dc2626", fontSize: 13 }}>{err}</p>}
        {loading && !clients.length ? <p style={{ fontSize: 13, color: "#5f6580" }}>Loading...</p> : !shown.length ? <p style={{ fontSize: 13, color: "#5f6580" }}>No clients yet.</p> : (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}><table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Client</th><th style={th}>Email</th><th style={th}>GST</th><th style={th}>Stripe</th></tr></thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} tabIndex={0} role="button" aria-label={`Open ${c.firm || c.name}`} aria-pressed={selected === c.id} onClick={() => { setSelected(c.id); setEditing(null); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(c.id); setEditing(null); } }} style={{ cursor: "pointer", background: selected === c.id ? "#f4f5f9" : undefined }}>
                  <td style={td}><strong>{c.firm || c.name}</strong>{c.firm ? <div style={{ fontSize: 12, color: "#5f6580" }}>{c.name}</div> : null}</td>
                  <td style={td}>{c.email}</td>
                  <td style={td}>{gstText(c.gst)}</td>
                  <td style={td}>{c.stripeCustomerId ? "Linked" : "Not linked"}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
      {selected && <ClientDetail key={`${selected}:${rev}`} id={selected} onEdit={(c) => setEditing(c)} />}
    </div>
  );
}

interface AuditEntry { at: string; actor: string; action: string; amountCents?: number; clientId?: string; clientEmail?: string; stripeIds?: Record<string, string>; ok: boolean; note?: string }

export function MoneyAuditTab() {
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/admin/payments/audit").then(async (r) => { const d = await r.json(); if (r.ok) setRows(d.entries); else setErr(d.error || "Could not load"); }).catch(() => setErr("Network error"));
  }, []);
  return (
    <div style={box}>
      <h3 style={{ margin: "0 0 10px", fontSize: 15, color: "#13152a" }}>Money audit log</h3>
      {err && <p style={{ color: "#dc2626", fontSize: 13 }}>{err}</p>}
      {!rows ? <p style={{ fontSize: 13, color: "#5f6580" }}>Loading...</p> : !rows.length ? <p style={{ fontSize: 13, color: "#5f6580" }}>No money actions recorded yet.</p> : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}><table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>Time (Brisbane)</th><th style={th}>Who</th><th style={th}>Action</th><th style={th}>Amount</th><th style={th}>Client</th><th style={th}>Stripe ids</th><th style={th}>Result</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.at}-${i}`}>
                <td style={td}>{new Date(r.at).toLocaleString("en-AU", { timeZone: "Australia/Brisbane" })}</td>
                <td style={td}>{r.actor}</td>
                <td style={td}>{r.action}</td>
                <td style={td}>{money(r.amountCents)}</td>
                <td style={td}>{r.clientEmail || r.clientId || ""}</td>
                <td style={{ ...td, fontSize: 12 }}>{Object.entries(r.stripeIds || {}).map(([k, v]) => `${k}: ${v}`).join(", ")}</td>
                <td style={{ ...td, color: r.ok ? "#16a34a" : "#dc2626" }}>{r.ok ? "OK" : `Failed${r.note ? `: ${r.note}` : ""}`}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
