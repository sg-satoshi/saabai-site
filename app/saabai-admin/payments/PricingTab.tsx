"use client";
/**
 * Pricing tab for /saabai-admin/payments (Phase B): saved price lines per client, product picker,
 * take payment from saved lines, and which products show in the picker.
 * Light mode only; navy primary buttons (.btn.pri). GST is stored, never charged here.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SubmissionKey, httpOutcome, type SubmitOutcome } from "../../../lib/billing/request-id";

type Interval = "once" | "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly";
interface Client { id: string; name: string; firm?: string; email: string }
interface Item { key: string; source: "catalogue" | "stripe"; refId: string; stripeProductId?: string; name: string; unitAmount: number; interval: Interval; setupAmount?: number; enabled: boolean }
interface Line {
  id?: string; source: "catalogue" | "stripe" | "custom"; refId?: string; stripeProductId?: string; description: string;
  unitAmount: number; quantity: number; interval: Interval; discount?: { kind: "percent" | "amount"; value: number }; gstMode: "none" | "inclusive" | "exclusive";
}
type Method = "invoice" | "subscription_invoice" | "checkout_link" | "card_now" | "saved_card";

const METHODS: { id: Method; label: string }[] = [
  { id: "invoice", label: "Email invoice" },
  { id: "subscription_invoice", label: "Subscription by invoice" },
  { id: "checkout_link", label: "Email Checkout link" },
  { id: "saved_card", label: "Charge saved card" },
  { id: "card_now", label: "Card on the spot" },
];
const INTERVALS: Interval[] = ["once", "weekly", "fortnightly", "monthly", "quarterly", "yearly"];
const ivLabel = (i: Interval) => (i === "once" ? "One-off" : i[0].toUpperCase() + i.slice(1));

const money = (c: number) => `$${(c / 100).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const box: React.CSSProperties = { background: "#fff", border: "1px solid #dfe2ea", borderRadius: 10, padding: 16, marginBottom: 16 };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#5f6580", display: "block", marginBottom: 4 };
const inp: React.CSSProperties = { width: "100%", height: 36, padding: "0 10px", border: "1px solid #c6cad6", borderRadius: 8, fontSize: 14, background: "#fff", color: "#13152a" };
const th: React.CSSProperties = { textAlign: "left", fontSize: 12, color: "#5f6580", fontWeight: 600, padding: "8px 6px", borderBottom: "1px solid #dfe2ea" };
const td: React.CSSProperties = { fontSize: 13, color: "#13152a", padding: "6px", borderBottom: "1px solid #eceef4", verticalAlign: "middle" };

/** Same maths as lib/billing/price-lines lineTotals. */
export function lineNet(l: Pick<Line, "unitAmount" | "quantity" | "discount">): number {
  const gross = l.unitAmount * l.quantity;
  let off = l.discount ? (l.discount.kind === "percent" ? Math.round((gross * l.discount.value) / 100) : Math.round(l.discount.value)) : 0;
  off = Math.min(Math.max(0, off), gross);
  return gross - off;
}

function itemToLines(it: Item): Line[] {
  const base: Line = { source: it.source, refId: it.refId, stripeProductId: it.stripeProductId, description: it.name, unitAmount: it.unitAmount, quantity: 1, interval: it.interval, gstMode: "none" };
  return it.setupAmount ? [base, { ...base, source: "custom", refId: undefined, stripeProductId: undefined, description: `${it.name} setup fee`, unitAmount: it.setupAmount, interval: "once" }] : [base];
}

export function PricingTab() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pick, setPick] = useState("");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; url?: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const subKey = useRef(new SubmissionKey());
  const renew = () => subKey.current.renew();

  useEffect(() => {
    fetch("/api/admin/billing-clients").then((r) => r.json()).then((d) => setClients(d.clients || [])).catch(() => {});
    fetch("/api/admin/payments/products").then((r) => r.json()).then((d) => setItems(d.items || [])).catch(() => {});
  }, []);

  const loadLines = useCallback(async (id: string) => {
    setLines([]); setPicked(new Set()); setMsg(null); setDirty(false); renew();
    if (!id) return;
    const d = await fetch(`/api/admin/billing-clients/${id}/lines`).then((r) => r.json()).catch(() => ({}));
    setLines(d.lines || []);
  }, []);

  const edit = (i: number, patch: Partial<Line>) => { setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l))); setDirty(true); renew(); };
  const remove = (i: number) => { setLines((ls) => ls.filter((_, j) => j !== i)); setDirty(true); renew(); };
  function add() {
    if (!pick) return;
    const next: Line[] = pick === "custom" ? [{ source: "custom", description: "", unitAmount: 0, quantity: 1, interval: "once", gstMode: "none" }] : itemToLines(items.find((x) => x.key === pick)!);
    setLines((ls) => [...ls, ...next]); setPick(""); setDirty(true); renew();
  }

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/admin/billing-clients/${clientId}/lines`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lines }) });
      const d = await res.json();
      if (res.ok) { setLines(d.lines); setDirty(false); setMsg({ ok: true, text: "Pricing saved" }); } else setMsg({ ok: false, text: d.error || "Could not save" });
    } catch { setMsg({ ok: false, text: "Network error" }); }
    finally { setBusy(false); renew(); }
  }

  async function take(method: Method) {
    if (busy) return;
    const label = METHODS.find((m) => m.id === method)!.label;
    if (!window.confirm(`${label} for ${money(total)}?`)) return;
    setBusy(true); setMsg(null);
    // Keep the id after ambiguous failures (5xx, network error, timeout, abort): Stripe may already have
    // charged or emailed, and an identical retry is deduplicated. Renew on success or a definite 4xx.
    let outcome: SubmitOutcome = "ambiguous";
    try {
      const res = await fetch(`/api/admin/billing-clients/${clientId}/collect`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, lineIds: [...picked], requestId: subKey.current.key({ clientId, method, lineIds: [...picked], days }), daysUntilDue: days }),
      });
      const d = await res.json();
      if (!res.ok) { outcome = httpOutcome(res.status); setMsg({ ok: false, text: d.error || "Payment failed" }); return; }
      outcome = "success";
      setMsg({ ok: true, text: `${d.note}. ${money(d.amountCents)}`, url: d.url });
      if (method === "card_now" && d.url) window.open(d.url, "_blank", "noopener");
      setPicked(new Set());
    } catch { setMsg({ ok: false, text: "Network error. Retrying with the same details is safe." }); }
    finally { subKey.current.settle(outcome); setBusy(false); }
  }

  const chosen = lines.filter((l) => l.id && picked.has(l.id));
  const total = chosen.reduce((s, l) => s + lineNet(l), 0);
  const client = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);

  return (
    <div>
      <div style={box}>
        <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
          <div style={{ minWidth: 260, flex: 1 }}>
            <label style={lbl}>Client</label>
            <select style={inp} value={clientId} onChange={(e) => { setClientId(e.target.value); void loadLines(e.target.value); }}>
              <option value="">Choose a client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.firm ? `${c.firm} (${c.name})` : c.name}</option>)}
            </select>
          </div>
          <button className="btn" type="button" onClick={() => setShowSettings((s) => !s)}>{showSettings ? "Hide product settings" : "Products in payments"}</button>
        </div>
      </div>

      {showSettings && <PickerSettings onChange={() => fetch("/api/admin/payments/products").then((r) => r.json()).then((d) => setItems(d.items || []))} />}

      {client && (
        <div style={box}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#13152a" }}>Pricing for {client.firm || client.name}</h3>
          <div className="tbl-scroll" style={{ overflowX: "auto", maxWidth: "100%" }}>
            <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse" }}>
              <thead><tr><th style={th}></th><th style={th}>Item</th><th style={th}>Unit $</th><th style={th}>Qty</th><th style={th}>Billing</th><th style={th}>Discount</th><th style={th}>Total</th><th style={th}></th></tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={l.id || `new-${i}`}>
                    <td style={td}><input type="checkbox" aria-label="Include" disabled={!l.id || dirty} checked={!!l.id && picked.has(l.id)} onChange={(e) => { const s = new Set(picked); if (e.target.checked) s.add(l.id!); else s.delete(l.id!); setPicked(s); renew(); }} /></td>
                    <td style={td}><input style={inp} value={l.description} placeholder="Description" onChange={(e) => edit(i, { description: e.target.value })} /></td>
                    <td style={{ ...td, width: 110 }}><input style={inp} type="number" min={0} step="0.01" value={l.unitAmount ? l.unitAmount / 100 : ""} onChange={(e) => edit(i, { unitAmount: Math.round(Number(e.target.value) * 100) })} /></td>
                    <td style={{ ...td, width: 70 }}><input style={inp} type="number" min={1} value={l.quantity} onChange={(e) => edit(i, { quantity: Math.max(1, Math.round(Number(e.target.value))) })} /></td>
                    <td style={{ ...td, width: 130 }}>
                      <select style={inp} value={l.interval} onChange={(e) => edit(i, { interval: e.target.value as Interval })}>{INTERVALS.map((v) => <option key={v} value={v}>{ivLabel(v)}</option>)}</select>
                    </td>
                    <td style={{ ...td, width: 150 }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <input style={inp} type="number" min={0} value={l.discount?.value ? (l.discount.kind === "amount" ? l.discount.value / 100 : l.discount.value) : ""} placeholder="0"
                          onChange={(e) => { const v = Number(e.target.value); const kind = l.discount?.kind || "percent"; edit(i, { discount: v > 0 ? { kind, value: kind === "amount" ? Math.round(v * 100) : v } : undefined }); }} />
                        <select style={{ ...inp, width: 56 }} value={l.discount?.kind || "percent"} onChange={(e) => edit(i, { discount: l.discount ? { kind: e.target.value as "percent" | "amount", value: 0 } : undefined })}>
                          <option value="percent">%</option><option value="amount">$</option>
                        </select>
                      </div>
                    </td>
                    <td style={td}>{money(lineNet(l))}</td>
                    <td style={td}><button className="btn" type="button" onClick={() => remove(i)}>Remove</button></td>
                  </tr>
                ))}
                {!lines.length && <tr><td style={td} colSpan={8}>No saved pricing yet. Add a product or a custom line.</td></tr>}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            <select style={{ ...inp, maxWidth: 340 }} value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Add a product</option>
              <option value="custom">Custom line</option>
              {items.map((it) => <option key={it.key} value={it.key}>{it.name} ({money(it.unitAmount)} {ivLabel(it.interval).toLowerCase()})</option>)}
            </select>
            <button className="btn" type="button" onClick={add} disabled={!pick}>Add</button>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: "#5f6580" }}>GST not applicable</span>
            <button className="btn pri" type="button" onClick={save} disabled={busy || !dirty}>Save pricing</button>
          </div>
        </div>
      )}

      {client && lines.some((l) => l.id) && (
        <div style={box}>
          <h3 style={{ margin: "0 0 6px", fontSize: 15, color: "#13152a" }}>Take payment</h3>
          <div style={{ fontSize: 13, color: "#5f6580", marginBottom: 10 }}>{dirty ? "Save pricing first." : `Tick lines above. Selected total ${money(total)}.`}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
            <div style={{ width: 120 }}><label style={lbl}>Due in (days)</label><input style={inp} type="number" min={0} max={90} value={days} onChange={(e) => { setDays(Number(e.target.value)); renew(); }} /></div>
            {METHODS.map((m) => <button key={m.id} className="btn pri" type="button" disabled={busy || dirty || !chosen.length} onClick={() => take(m.id)}>{m.label}</button>)}
          </div>
        </div>
      )}

      {msg && (
        <div role="status" style={{ ...box, borderColor: msg.ok ? "#b7e0c4" : "#f0b8b8", background: msg.ok ? "#f2fbf5" : "#fdf3f3", fontSize: 14 }}>
          {msg.text}{msg.url && <> <a href={msg.url} target="_blank" rel="noopener noreferrer">Open link</a></>}
        </div>
      )}
    </div>
  );
}

function PickerSettings({ onChange }: { onChange: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => fetch("/api/admin/payments/products?all=1").then((r) => r.json()).then((d) => { setItems(d.items || []); setErr(d.stripeError || null); }), []);
  useEffect(() => { void load(); }, [load]);
  async function toggle(it: Item) {
    await fetch("/api/admin/payments/products", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: it.key, enabled: !it.enabled }) });
    await load(); onChange();
  }
  return (
    <div style={box}>
      <h3 style={{ margin: "0 0 10px", fontSize: 15, color: "#13152a" }}>Products available in payments</h3>
      {err && <div style={{ fontSize: 13, color: "#a33", marginBottom: 8 }}>Stripe products could not be loaded: {err}</div>}
      <div className="tbl-scroll">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>Product</th><th style={th}>From</th><th style={th}>Price</th><th style={th}>Available</th></tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.key}>
                <td style={td}>{it.name}</td>
                <td style={td}>{it.source === "catalogue" ? "Site products" : "Stripe"}</td>
                <td style={td}>{money(it.unitAmount)} {ivLabel(it.interval).toLowerCase()}</td>
                <td style={td}><input type="checkbox" aria-label={`Available in payments: ${it.name}`} checked={it.enabled} onChange={() => toggle(it)} /></td>
              </tr>
            ))}
            {!items.length && <tr><td style={td} colSpan={4}>No products found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
