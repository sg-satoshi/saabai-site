"use client";
/** Plans & Add-ons manager (mockups 70, 71). Create, edit, price, hide and reorder. */
import React, { useEffect, useState } from "react";
import "../../components/billing/billing.css";
import { aud } from "../../components/billing/status";

type Plan = { id: string; name: string; blurb: string; priceCents: number; features: string[]; visible: boolean; order: number; priceVersion: number };
type Addon = { id: string; name: string; description: string; billing: "one_off" | "monthly"; priceCents: number; fromPrice?: boolean; checkout: "stripe" | "quote"; visible: boolean; order: number; feature?: string; priceVersion: number };
type Catalog = { plans: Plan[]; addons: Addon[]; gstRegistered: boolean; updatedAt: string };
type Editing = { kind: "plan"; item: Plan; isNew: boolean } | { kind: "addon"; item: Addon; isNew: boolean } | null;

const FEATURE_KEYS = [{ v: "", l: "None (manual)" }, { v: "chatbot", l: "AI chatbot module" }, { v: "reviews", l: "Reviews carousel module" }, { v: "booking", l: "Booking module" }];

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => { const f = () => setM(window.innerWidth < 720); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  return m;
}

export default function PlansClient() {
  const [cat, setCat] = useState<Catalog | null>(null);
  const [counts, setCounts] = useState<{ plans: Record<string, number>; addons: Record<string, number> }>({ plans: {}, addons: {} });
  const [editing, setEditing] = useState<Editing>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const mobile = useIsMobile();

  useEffect(() => { fetch("/api/admin/billing/catalog").then((r) => r.json()).then((d) => { setCat(d.catalog); setCounts(d.counts || { plans: {}, addons: {} }); }).catch(() => setErr("Couldn't load the catalogue")); }, []);

  async function save(next: Catalog, note = "Saved") {
    setSaving(true); setErr("");
    try {
      const r = await fetch("/api/admin/billing/catalog", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ catalog: next }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save failed");
      setCat(d.catalog); setCounts(d.counts); setToast(note); setTimeout(() => setToast(""), 2200);
      return true;
    } catch (e) { setErr((e as Error).message); return false; } finally { setSaving(false); }
  }

  function move<T extends { order: number }>(list: T[], i: number, dir: -1 | 1): T[] {
    const j = i + dir; if (j < 0 || j >= list.length) return list;
    const a = [...list]; [a[i], a[j]] = [a[j], a[i]];
    return a.map((x, k) => ({ ...x, order: k }));
  }

  if (!cat) return <div className="bl" style={{ padding: 8 }}>{err || "Loading…"}</div>;

  const planCols = mobile ? "24px 1fr auto" : "24px 1fr 110px 70px 130px 64px";
  const addonCols = mobile ? "24px 1fr auto" : "24px 1fr 90px 100px 130px 60px 110px 64px";

  const Toggle = ({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button type="button" className={`bl-sw ${on ? "on" : ""}`} role="switch" aria-checked={on} aria-label={label} onClick={onChange} disabled={saving} />
      {!mobile && <span style={{ fontSize: 13, color: on ? "#13152a" : "#5f6580" }}>{on ? "Visible" : "Hidden"}</span>}
    </span>
  );

  return (
    <div className="bl" style={{ maxWidth: 1100 }}>
      <div className="mc-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 className="mc-h1">Plans &amp; Add-ons</h1>
          <p className="mc-sub">What clients can buy in the portal Upgrades page. Prices in AUD, {cat.gstRegistered ? "GST added at checkout" : "GST not applicable"}.</p>
        </div>
        <div className="bl-stack" style={{ display: "flex", gap: 8 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <button type="button" className={`bl-sw ${cat.gstRegistered ? "on" : ""}`} role="switch" aria-checked={cat.gstRegistered} aria-label="GST registered" onClick={() => save({ ...cat, gstRegistered: !cat.gstRegistered }, cat.gstRegistered ? "GST off" : "GST on")} />
            GST registered
          </label>
          <a className="bl-btn" href="/client-portal?page=upgrades" target="_blank" rel="noreferrer">Preview in portal ↗</a>
        </div>
      </div>
      {err && <div className="bl-err" style={{ marginBottom: 12 }}>{err}</div>}
      {toast && <div className="bl-ok" style={{ marginBottom: 12 }}>{toast}</div>}

      <div className="bl-card">
        <div className="bl-ch">
          <div><h2>Plans</h2><div className="sub">Use the arrows to reorder. Order is how clients see them. Existing clients keep their price when you change one.</div></div>
          <button className="bl-btn pri sm" onClick={() => setEditing({ kind: "plan", isNew: true, item: { id: "", name: "", blurb: "", priceCents: 0, features: [""], visible: false, order: cat.plans.length, priceVersion: 1 } })}>+ New plan</button>
        </div>
        {!mobile && <div className="bl-tr h" style={{ gridTemplateColumns: planCols }}><span /><span>Plan</span><span>Price</span><span>Sites</span><span>Visible to clients</span><span /></div>}
        {cat.plans.map((p, i) => (
          <div key={p.id} className="bl-tr" style={{ gridTemplateColumns: planCols }}>
            <div className="bl-ord"><button aria-label="Move up" onClick={() => save({ ...cat, plans: move(cat.plans, i, -1) }, "Reordered")}>▲</button><button aria-label="Move down" onClick={() => save({ ...cat, plans: move(cat.plans, i, 1) }, "Reordered")}>▼</button></div>
            <div style={{ minWidth: 0 }}>
              <div className="nm">{p.name}</div>
              <div className="ds">{mobile ? `${aud(p.priceCents).replace(".00", "")}/mo · ${counts.plans[p.id] || 0} ${(counts.plans[p.id] || 0) === 1 ? "site" : "sites"}` : p.blurb}</div>
            </div>
            {!mobile && <span className="num">{aud(p.priceCents).replace(".00", "")}<span style={{ color: "#5f6580" }}>/mo</span></span>}
            {!mobile && <span className="num">{counts.plans[p.id] || 0}</span>}
            {!mobile && <Toggle on={p.visible} label={`${p.name} visible`} onChange={() => save({ ...cat, plans: cat.plans.map((x) => (x.id === p.id ? { ...x, visible: !x.visible } : x)) }, p.visible ? `${p.name} hidden` : `${p.name} visible`)} />}
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
              {mobile && <Toggle on={p.visible} label={`${p.name} visible`} onChange={() => save({ ...cat, plans: cat.plans.map((x) => (x.id === p.id ? { ...x, visible: !x.visible } : x)) })} />}
              <button className="bl-btn sm" onClick={() => setEditing({ kind: "plan", isNew: false, item: { ...p, features: [...p.features] } })}>Edit</button>
            </div>
          </div>
        ))}
      </div>

      <div className="bl-card">
        <div className="bl-ch">
          <div><h2>Add-ons</h2><div className="sub">Fixed price items check out with Stripe. Quote items open a change request. Prices are placeholders until you set them.</div></div>
          <button className="bl-btn pri sm" onClick={() => setEditing({ kind: "addon", isNew: true, item: { id: "", name: "", description: "", billing: "one_off", priceCents: 0, checkout: "stripe", visible: false, order: cat.addons.length, priceVersion: 1 } })}>+ New add-on</button>
        </div>
        {!mobile && <div className="bl-tr h" style={{ gridTemplateColumns: addonCols }}><span /><span>Add-on</span><span>Billing</span><span>Price</span><span>Checkout</span><span>Active</span><span>Visible</span><span /></div>}
        {cat.addons.map((a, i) => (
          <div key={a.id} className="bl-tr" style={{ gridTemplateColumns: addonCols }}>
            <div className="bl-ord"><button aria-label="Move up" onClick={() => save({ ...cat, addons: move(cat.addons, i, -1) }, "Reordered")}>▲</button><button aria-label="Move down" onClick={() => save({ ...cat, addons: move(cat.addons, i, 1) }, "Reordered")}>▼</button></div>
            <div style={{ minWidth: 0 }}>
              <div className="nm">{a.name}</div>
              {mobile && <div className="ds">{a.fromPrice ? "From " : ""}{aud(a.priceCents).replace(".00", "")}{a.billing === "monthly" ? "/mo" : " one-off"} · {a.checkout === "stripe" ? "Stripe" : "Quote"}</div>}
            </div>
            {!mobile && <span>{a.billing === "monthly" ? "Monthly" : "One-off"}</span>}
            {!mobile && <span className="num">{a.fromPrice ? "From " : ""}{aud(a.priceCents).replace(".00", "")}{a.billing === "monthly" ? <span style={{ color: "#5f6580" }}>/mo</span> : ""}</span>}
            {!mobile && <span><span className={`bl-chip ${a.checkout === "stripe" ? "s" : ""}`}>{a.checkout === "stripe" ? "Stripe checkout" : "Quote via request"}</span></span>}
            {!mobile && <span className="num">{counts.addons[a.id] || 0}</span>}
            {!mobile && <Toggle on={a.visible} label={`${a.name} visible`} onChange={() => save({ ...cat, addons: cat.addons.map((x) => (x.id === a.id ? { ...x, visible: !x.visible } : x)) }, a.visible ? `${a.name} hidden` : `${a.name} visible`)} />}
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
              {mobile && <Toggle on={a.visible} label={`${a.name} visible`} onChange={() => save({ ...cat, addons: cat.addons.map((x) => (x.id === a.id ? { ...x, visible: !x.visible } : x)) })} />}
              <button className="bl-btn sm" onClick={() => setEditing({ kind: "addon", isNew: false, item: { ...a } })}>Edit</button>
            </div>
          </div>
        ))}
      </div>

      {editing && <EditDrawer editing={editing} saving={saving} onClose={() => setEditing(null)} onSave={async (item) => {
        const ok = editing.kind === "plan"
          ? await save({ ...cat, plans: editing.isNew ? [...cat.plans, item as Plan] : cat.plans.map((x) => (x.id === editing.item.id ? (item as Plan) : x)) }, `${item.name} saved`)
          : await save({ ...cat, addons: editing.isNew ? [...cat.addons, item as Addon] : cat.addons.map((x) => (x.id === editing.item.id ? (item as Addon) : x)) }, `${item.name} saved`);
        if (ok) setEditing(null);
      }} />}
    </div>
  );
}

function EditDrawer({ editing, saving, onClose, onSave }: { editing: NonNullable<Editing>; saving: boolean; onClose: () => void; onSave: (item: Plan | Addon) => void }) {
  const [item, setItem] = useState<Plan | Addon>(editing.item);
  const [price, setPrice] = useState(editing.item.priceCents ? (editing.item.priceCents / 100).toFixed(2) : "");
  const isPlan = editing.kind === "plan";
  const plan = item as Plan, addon = item as Addon;
  const set = (patch: Partial<Plan & Addon>) => setItem((x) => ({ ...x, ...patch }) as Plan | Addon);
  const priceChanged = !editing.isNew && Math.round((parseFloat(price) || 0) * 100) !== editing.item.priceCents;

  function submit() {
    const priceCents = Math.round((parseFloat(price) || 0) * 100);
    const id = item.id || item.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    onSave({ ...item, id, priceCents, ...(isPlan ? { features: plan.features.filter((f) => f.trim()) } : {}) } as Plan | Addon);
  }

  return (
    <div className="bl">
      <div className="bl-ov" style={{ zIndex: 3000 }} onClick={onClose} />
      <aside className="bl-drawer" role="dialog" aria-modal="true" aria-label={`Edit ${isPlan ? "plan" : "add-on"}`}>
        <div className="bl-mh">
          <p className="bl-step">{editing.isNew ? "New" : "Edit"} {isPlan ? "plan" : "add-on"}</p>
          <h3>{item.name || (isPlan ? "Untitled plan" : "Untitled add-on")}</h3>
          <button className="bl-x" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="bl-mb">
          <div className="bl-lbl">Name</div>
          <input className="bl-in" value={item.name} onChange={(e) => set({ name: e.target.value })} />
          <div className="bl-lbl">{isPlan ? "Short description" : "Description"}</div>
          {isPlan ? <input className="bl-in" value={plan.blurb} onChange={(e) => set({ blurb: e.target.value })} /> : <textarea className="bl-in" value={addon.description} onChange={(e) => set({ description: e.target.value })} />}
          {!isPlan && (
            <div className="bl-g2" style={{ marginTop: 14 }}>
              <div><div className="bl-sl">Billing</div><select className="bl-in" value={addon.billing} onChange={(e) => set({ billing: e.target.value as Addon["billing"] })}><option value="one_off">One-off</option><option value="monthly">Monthly</option></select></div>
              <div><div className="bl-sl">Checkout</div><select className="bl-in" value={addon.checkout} onChange={(e) => set({ checkout: e.target.value as Addon["checkout"] })}><option value="stripe">Stripe checkout</option><option value="quote">Quote via request</option></select></div>
            </div>
          )}
          <div className="bl-lbl">Price {isPlan || addon.billing === "monthly" ? <span className="opt">per month, AUD</span> : <span className="opt">AUD</span>}</div>
          <div className="bl-pre"><span>$</span><input className="bl-in num" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          {priceChanged && <div className="bl-help" style={{ color: "#a15c07" }}>Existing subscribers stay on {aud(editing.item.priceCents)} until you move them. New sign-ups pay the new price.</div>}
          {!isPlan && addon.checkout === "quote" && (
            <label className="bl-tog" style={{ margin: "10px 0 0" }}><button type="button" className={`bl-sw ${addon.fromPrice ? "on" : ""}`} role="switch" aria-checked={!!addon.fromPrice} onClick={() => set({ fromPrice: !addon.fromPrice })} /><span style={{ fontSize: 13 }}>Show as &quot;From&quot; price</span></label>
          )}
          {!isPlan && (
            <>
              <div className="bl-lbl">Shared module</div>
              <select className="bl-in" value={addon.feature || ""} onChange={(e) => set({ feature: e.target.value || undefined })}>{FEATURE_KEYS.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}</select>
              <div className="bl-help">Switched on for the site automatically when the client pays.</div>
            </>
          )}
          {isPlan && (
            <>
              <div className="bl-lbl">What&apos;s included <button type="button" className="bl-link" onClick={() => set({ features: [...plan.features, ""] })}>+ Add line</button></div>
              {plan.features.map((f, i) => (
                <div className="bl-feat" key={i}>
                  <input className="bl-in" value={f} aria-label={`Feature ${i + 1}`} onChange={(e) => set({ features: plan.features.map((x, k) => (k === i ? e.target.value : x)) })} />
                  <button type="button" className="bl-btn sm" aria-label="Remove line" style={{ height: 40 }} onClick={() => set({ features: plan.features.filter((_, k) => k !== i) })}>×</button>
                </div>
              ))}
            </>
          )}
          <label className="bl-tog"><button type="button" className={`bl-sw ${item.visible ? "on" : ""}`} role="switch" aria-checked={item.visible} onClick={() => set({ visible: !item.visible })} /><span style={{ fontSize: 13 }}>Visible to clients</span></label>
        </div>
        <div className="bl-mf">
          <button className="bl-btn" onClick={onClose}>Cancel</button>
          <button className="bl-btn pri" disabled={saving || !item.name.trim()} onClick={submit}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </aside>
    </div>
  );
}
