"use client";

import { useMemo, useState } from "react";
import { LEX_INTAKE_MATTER_TYPES, LEX_INTAKE_MATTER_TYPE_DEFAULT } from "../../../lib/lex-intake-matter-types";
import { MATTER_STATUS_LABEL, type Matter, type MatterItem, type MatterStatus } from "../../../lib/lex-matters";
import { Icon } from "./icons";
import "./matters.css";

const TZ = "Australia/Brisbane";
export const shortDate = (d: string | number) =>
  new Date(typeof d === "string" ? `${d}T00:00:00+10:00` : d).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: TZ });
const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
const daysUntil = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00+10:00`) - Date.parse(`${todayIso()}T00:00:00+10:00`)) / 86400000);
const updated = (ms: number) => {
  const d = Math.floor((Date.now() - ms) / 86400000);
  return d <= 0 ? "Today" : d === 1 ? "Yesterday" : shortDate(ms);
};

export function statusPill(m: Matter): { label: string; tone: string } {
  if (m.status === "closed") return { label: "Closed", tone: "neu" };
  if (m.status === "on_hold") return { label: "On hold", tone: "neu" };
  if (m.deadline) {
    const n = daysUntil(m.deadline);
    const what = m.deadlineLabel || "Deadline";
    if (n < 0) return { label: `Overdue: ${what}`, tone: "bad" };
    if (n <= 14) return { label: `${what} ${shortDate(m.deadline)}`, tone: "warn" };
  }
  return { label: "On track", tone: "ok" };
}

const KIND_LABEL: Record<MatterItem["kind"], string> = { research: "Research", draft: "Draft", review: "Doc review" };
const KIND_ICON: Record<MatterItem["kind"], string> = { research: "research", draft: "draft", review: "review" };

export function MattersView(p: {
  matters: Matter[]; loading: boolean; error: string | null; activeId: string | null;
  onNew: () => void; onOpen: (id: string) => void; onRetry: () => void;
}) {
  const [q, setQ] = useState("");
  const [area, setArea] = useState("all");
  const [showClosed, setShowClosed] = useState(false);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return p.matters.filter((m) => (showClosed || m.status !== "closed") && (area === "all" || m.area === area)
      && (!s || `${m.id} ${m.name} ${m.client}`.toLowerCase().includes(s)));
  }, [p.matters, q, area, showClosed]);
  const open = p.matters.filter((m) => m.status !== "closed");
  const upcoming = open.filter((m) => m.deadline && daysUntil(m.deadline) >= 0 && daysUntil(m.deadline) <= 14)
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!));
  const overdue = open.filter((m) => m.deadline && daysUntil(m.deadline) < 0).length;
  const items = p.matters.reduce((n, m) => n + (m.itemCount || 0), 0);

  return (
    <div className="lx-body lxm">
      <div className="lxm-col">
        <div className="lxm-tools">
          <label className="lxm-search"><Icon name="search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search matters, clients, IDs" aria-label="Search matters" /></label>
          <select value={area} onChange={(e) => setArea(e.target.value)} aria-label="Practice area">
            <option value="all">All practice areas</option>
            {LEX_INTAKE_MATTER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="lxm-check"><input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />Show closed</label>
          <button type="button" className="lx-btn primary" onClick={p.onNew}><Icon name="plus" />New matter</button>
        </div>

        <div className="lxm-stats">
          <div><span>Open matters</span><b>{open.length}</b></div>
          <div><span>Deadlines in 14 days</span><b>{upcoming.length}</b></div>
          <div><span>Overdue</span><b>{overdue}</b></div>
          <div><span>Research, drafts and reviews</span><b>{items}</b></div>
        </div>

        {p.error ? (
          <div className="lx-err" role="alert"><div><b>Matters could not load</b><p>{p.error}</p></div><button type="button" className="lx-btn sm" onClick={p.onRetry}>Retry</button></div>
        ) : p.loading && p.matters.length === 0 ? (
          <div className="lxm-empty">Loading matters...</div>
        ) : p.matters.length === 0 ? (
          <div className="lxm-empty">
            <h2>No matters yet</h2>
            <p>Create a matter to keep research, drafts and document reviews together. Everyone at your firm can see it.</p>
            <button type="button" className="lx-btn primary" onClick={p.onNew}><Icon name="plus" />New matter</button>
          </div>
        ) : (
          <div className="lxm-table" role="table" aria-label="Matters">
            <div className="lxm-tr lxm-th" role="row">
              <span role="columnheader">ID</span><span role="columnheader">Matter</span><span role="columnheader">Area</span>
              <span role="columnheader">Status</span><span role="columnheader">Items</span><span role="columnheader">Updated</span>
            </div>
            {list.length === 0 && <div className="lxm-empty sm">No matters match.</div>}
            {list.map((m) => {
              const st = statusPill(m);
              return (
                <button type="button" key={m.id} role="row" className={`lxm-tr${m.id === p.activeId ? " on" : ""}`} onClick={() => p.onOpen(m.id)}>
                  <span className="id" role="cell">{m.id}</span>
                  <span className="nm" role="cell"><b>{m.name}</b>{m.client && <small>{m.client}</small>}</span>
                  <span role="cell" className="ar">{m.area}</span>
                  <span role="cell"><span className={`lx-pill t-${st.tone}`}>{st.label}</span></span>
                  <span role="cell" className="n">{m.itemCount || 0}</span>
                  <span role="cell" className="up">{updated(m.updatedAt)}</span>
                </button>
              );
            })}
          </div>
        )}

        {upcoming.length > 0 && (
          <>
            <h3 className="lxm-h">Upcoming deadlines <small>next 14 days</small></h3>
            <div className="lxm-dl">
              {upcoming.slice(0, 6).map((m) => (
                <button type="button" key={m.id} onClick={() => p.onOpen(m.id)}>
                  <span className="d"><small>{new Date(`${m.deadline}T00:00:00+10:00`).toLocaleDateString("en-AU", { month: "short", timeZone: TZ }).toUpperCase()}</small>
                    <b>{new Date(`${m.deadline}T00:00:00+10:00`).toLocaleDateString("en-AU", { day: "2-digit", timeZone: TZ })}</b></span>
                  <span><b>{m.deadlineLabel || "Deadline"}</b><small>{m.id}: {m.name}</small></span>
                </button>
              ))}
            </div>
          </>
        )}
        <p className="lxm-note">Matters are shared with everyone signed in from your firm&apos;s email domain.</p>
      </div>
    </div>
  );
}

export function MatterDetail(p: {
  matter: Matter; items: MatterItem[] | null; active: boolean; busy: boolean; error: string | null;
  onBack: () => void; onWorkIn: () => void; onLeave: () => void;
  onUpdate: (f: Partial<Matter>) => void; onOpenItem: (i: MatterItem) => void; onRemoveItem: (ref: string) => void;
  onNewResearch: () => void; onDraft: () => void; onReview: () => void;
}) {
  const m = p.matter;
  const st = statusPill(m);
  const [editing, setEditing] = useState(false);
  const [d, setD] = useState({ deadline: m.deadline ?? "", deadlineLabel: m.deadlineLabel, status: m.status as MatterStatus, description: m.description });
  return (
    <div className="lx-body lxm">
      <div className="lxm-col">
        <button type="button" className="lx-btn ghost lxm-back" onClick={p.onBack}>&larr; All matters</button>
        <header className="lxm-head">
          <div>
            <span className="lxm-k">{m.id} · {m.area}{m.client ? ` · ${m.client}` : ""}</span>
            <h1>{m.name}</h1>
            <div className="lxm-meta"><span className={`lx-pill t-${st.tone}`}>{st.label}</span><span>Opened {shortDate(m.createdAt)} by {m.createdBy.replace(/^admin:.*/, "Saabai")}</span></div>
          </div>
          <div className="lxm-acts">
            {p.active
              ? <button type="button" className="lx-btn" onClick={p.onLeave}>Stop working in this matter</button>
              : <button type="button" className="lx-btn primary" onClick={p.onWorkIn}><Icon name="matters" />Work in this matter</button>}
            <button type="button" className="lx-btn" onClick={() => setEditing((e) => !e)}><Icon name="settings" />{editing ? "Cancel" : "Edit"}</button>
          </div>
        </header>
        {p.error && <div className="lx-err" role="alert"><div><b>Something went wrong</b><p>{p.error}</p></div></div>}

        {editing && (
          <div className="lxm-card lxm-edit">
            <label>Status<select value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as MatterStatus })}>
              {(Object.keys(MATTER_STATUS_LABEL) as MatterStatus[]).map((s) => <option key={s} value={s}>{MATTER_STATUS_LABEL[s]}</option>)}
            </select></label>
            <label>Next deadline<input type="date" value={d.deadline} onChange={(e) => setD({ ...d, deadline: e.target.value })} /></label>
            <label>What is due<input value={d.deadlineLabel} onChange={(e) => setD({ ...d, deadlineLabel: e.target.value })} placeholder="e.g. Lodge notice of objection" /></label>
            <label className="wide">Notes<textarea rows={3} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} /></label>
            <div className="wide row"><button type="button" className="lx-btn primary" disabled={p.busy}
              onClick={() => { p.onUpdate({ ...d, deadline: d.deadline || null }); setEditing(false); }}>Save changes</button></div>
          </div>
        )}
        {!editing && m.description && <p className="lxm-desc">{m.description}</p>}

        <div className="lxm-start">
          <button type="button" onClick={p.onNewResearch}><Icon name="research" />New research in this matter</button>
          <button type="button" onClick={p.onDraft}><Icon name="draft" />Draft a document</button>
          <button type="button" onClick={p.onReview}><Icon name="review" />Review a document</button>
        </div>

        <section className="lxm-card">
          <div className="lxm-card-h"><h2>Research, drafts and reviews</h2><small>{p.items?.length ?? 0}</small></div>
          {p.items == null ? <div className="lxm-empty sm">Loading...</div>
            : p.items.length === 0 ? <div className="lxm-empty sm">Nothing attached yet. Choose Work in this matter, then research, draft or review as usual. Each finished answer, draft and review is saved here for the whole firm.</div>
            : (
              <ul className="lxm-items">
                {p.items.map((i) => (
                  <li key={i.ref}>
                    <button type="button" className="open" onClick={() => p.onOpenItem(i)}>
                      <Icon name={KIND_ICON[i.kind]} />
                      <span><b>{i.title}</b><small>{KIND_LABEL[i.kind]} · {shortDate(i.at)} · {i.by.replace(/^admin:.*/, "Saabai")}</small></span>
                    </button>
                    <button type="button" className="lx-btn ghost sm" aria-label={`Remove ${i.title} from this matter`} onClick={() => p.onRemoveItem(i.ref)}>Remove</button>
                  </li>
                ))}
              </ul>
            )}
        </section>
      </div>
    </div>
  );
}

export function MatterBar({ matter, onOpen, onLeave }: { matter: Matter; onOpen: () => void; onLeave: () => void }) {
  const st = statusPill(matter);
  return (
    <div className="lxm-bar" role="region" aria-label="Current matter">
      <Icon name="matters" />
      <button type="button" className="t" onClick={onOpen} title="Open this matter">
        <span className="id">{matter.id}</span><b>{matter.name}</b><span className="ar">{matter.area}</span>
      </button>
      <span className={`lx-pill t-${st.tone}`}>{st.label}</span>
      <span className="sp" />
      <span className="hint">Saved to this matter for your firm</span>
      <button type="button" className="lx-btn ghost sm" onClick={onLeave}>Leave matter</button>
    </div>
  );
}

export function NewMatterDialog({ onClose, onCreate, busy, error }: {
  onClose: () => void; busy: boolean; error: string | null;
  onCreate: (f: { name: string; client: string; area: string; urgency: string; description: string; deadline: string | null; deadlineLabel: string }) => void;
}) {
  const [client, setClient] = useState("");
  const [name, setName] = useState("");
  const [area, setArea] = useState<string>(LEX_INTAKE_MATTER_TYPE_DEFAULT);
  const [urgency, setUrgency] = useState("medium");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [deadlineLabel, setDeadlineLabel] = useState("");
  const title = name.trim() || (client.trim() ? `${client.trim()}, ${area.toLowerCase()}` : "");
  return (
    <div className="lx-modal-wrap center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <div className="lx-dialog" role="dialog" aria-label="New matter" data-no-feedback>
        <div className="head"><h3>New matter</h3><button type="button" className="x" aria-label="Close" onClick={onClose}>×</button></div>
        <div className="field"><label htmlFor="lxm-client">Client name</label>
          <input id="lxm-client" value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Smith Holdings Pty Ltd" autoFocus /></div>
        <div className="field"><label htmlFor="lxm-name">Matter name</label>
          <input id="lxm-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={client ? `${client}, ${area.toLowerCase()}` : "e.g. Objection to amended assessment"} /></div>
        <div className="field"><label htmlFor="lxm-area">Matter type</label>
          <select id="lxm-area" value={area} onChange={(e) => setArea(e.target.value)}>{LEX_INTAKE_MATTER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
        <div className="field"><label>Urgency</label>
          <div className="segs" role="group" aria-label="Urgency">
            {(["low", "medium", "high"] as const).map((u) => <button type="button" key={u} className={urgency === u ? "on" : ""} aria-pressed={urgency === u} onClick={() => setUrgency(u)}>{u}</button>)}
          </div></div>
        <div className="field two">
          <div><label htmlFor="lxm-dl">Next deadline (optional)</label><input id="lxm-dl" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
          <div><label htmlFor="lxm-dll">What is due</label><input id="lxm-dll" value={deadlineLabel} onChange={(e) => setDeadlineLabel(e.target.value)} placeholder="e.g. Lodge objection" /></div>
        </div>
        <div className="field"><label htmlFor="lxm-desc">Brief description</label>
          <textarea id="lxm-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Briefly describe the matter..." rows={3} /></div>
        {error && <div className="lx-attached bad" role="alert">{error}</div>}
        <div className="row">
          <button type="button" className="lx-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="lx-btn primary" disabled={!title || busy}
            onClick={() => onCreate({ name: title, client: client.trim(), area, urgency, description, deadline: deadline || null, deadlineLabel })}>
            {busy ? "Creating..." : "Create matter"}
          </button>
        </div>
      </div>
    </div>
  );
}
