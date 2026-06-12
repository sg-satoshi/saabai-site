"use client";

/* ────────────────────────────────────────────────────────────────────────────
   CrmClient.tsx — CRM Pipeline View
   Kanban board, new lead form, lead detail panel, interaction logging.
   ──────────────────────────────────────────────────────────────────────────── */

import { useState, useEffect, useMemo, useCallback, CSSProperties, FormEvent } from "react";

// ── Types ────────────────────────────────────────────────────────────────

type LeadStage =
  | "new" | "contacted" | "discovery"
  | "audit-booked" | "audit-done"
  | "proposal-sent" | "negotiation"
  | "won" | "lost";

interface Interaction {
  date: string;
  type: string;
  notes: string;
}

interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  source: string;
  stage: LeadStage;
  notes: string;
  followUpDate?: string;
  createdAt: string;
  lastContactedAt?: string;
  interactions: Interaction[];
}

interface NewLeadInput {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  source: string;
  stage: LeadStage;
  notes: string;
  followUpDate: string;
}

// ── Tokens ────────────────────────────────────────────────────────────────

const C = {
  bg:         "#f5f5f7",
  surface:    "#ffffff",
  surface2:   "#f3f4f6",
  border:     "rgba(0,0,0,0.08)",
  border2:    "rgba(0,0,0,0.12)",
  teal:       "#0891b2",
  tealBright: "#0284c7",
  tealBg:     "rgba(8,145,178,0.08)",
  tealBdr:    "rgba(8,145,178,0.25)",
  green:      "#16a34a",
  greenBg:    "rgba(22,163,74,0.08)",
  greenBdr:   "rgba(22,163,74,0.25)",
  red:        "#dc2626",
  redBg:      "rgba(220,38,38,0.08)",
  redBdr:     "rgba(220,38,38,0.25)",
  amber:      "#d97706",
  amberBg:    "rgba(217,119,6,0.08)",
  amberBdr:   "rgba(217,119,6,0.25)",
  blue:       "#2563eb",
  blueBg:     "rgba(37,99,235,0.08)",
  blueBdr:    "rgba(37,99,235,0.25)",
  purple:     "#7c3aed",
  purpleBg:   "rgba(124,58,237,0.08)",
  purpleBdr:  "rgba(124,58,237,0.25)",
  text:       "#111827",
  textDim:    "#6b7280",
  muted:      "#9ca3af",
};

// ── Stage config ──────────────────────────────────────────────────────────

const STAGES: { key: LeadStage; label: string; color: string; bg: string; bdr: string }[] = [
  { key: "new",           label: "New",           color: C.blue,   bg: C.blueBg,   bdr: C.blueBdr },
  { key: "contacted",     label: "Contacted",     color: C.teal,  bg: C.tealBg,   bdr: C.tealBdr },
  { key: "discovery",     label: "Discovery",     color: C.amber, bg: C.amberBg,  bdr: C.amberBdr },
  { key: "audit-booked",  label: "Audit Booked",  color: C.blue,  bg: C.blueBg,   bdr: C.blueBdr },
  { key: "audit-done",    label: "Audit Done",    color: C.purple,bg: C.purpleBg, bdr: C.purpleBdr },
  { key: "proposal-sent", label: "Proposal Sent", color: C.teal,  bg: C.tealBg,   bdr: C.tealBdr },
  { key: "negotiation",   label: "Negotiation",   color: C.amber, bg: C.amberBg,  bdr: C.amberBdr },
  { key: "won",           label: "Won",           color: C.green, bg: C.greenBg,  bdr: C.greenBdr },
  { key: "lost",          label: "Lost",          color: C.red,   bg: C.redBg,    bdr: C.redBdr },
];

const SOURCES = ["Website", "Referral", "LinkedIn", "Google", "Phone", "Email", "Event", "Other"];

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const pad = (n: number) => n < 10 ? "0" + n : "" + n;
  return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const pad = (n: number) => n < 10 ? "0" + n : "" + n;
  return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ago(iso: string | undefined): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "just now";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return fmtDate(iso);
}

// ── Inline UI primitives ──────────────────────────────────────────────────

function s(...styles: (CSSProperties | undefined | false)[]): CSSProperties {
  return Object.assign({}, ...styles.filter(Boolean));
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: C.textDim, marginBottom: 5 }}>
        {label}{required && <span style={{ color: C.teal, marginLeft: 4 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ margin: "4px 0 0", fontSize: 11, color: C.muted }}>{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, autoFocus, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean; type?: string;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{
      display: "flex", alignItems: "center",
      background: "#ffffff",
      border: `1px solid ${focus ? C.tealBdr : C.border2}`,
      borderRadius: 8, transition: "border-color 0.1s",
      boxShadow: focus ? "0 0 0 3px rgba(8,145,178,0.10)" : "none",
    }}>
      <input
        type={type} value={value || ""} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} autoFocus={autoFocus}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ flex: 1, padding: "9px 12px", background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 13 }}
      />
    </div>
  );
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{
      display: "flex", alignItems: "center",
      background: "#ffffff",
      border: `1px solid ${focus ? C.tealBdr : C.border2}`,
      borderRadius: 8, transition: "border-color 0.1s",
      boxShadow: focus ? "0 0 0 3px rgba(8,145,178,0.10)" : "none",
    }}>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ flex: 1, padding: "9px 12px", background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 13, cursor: "pointer" }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function TextArea({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{
      background: "#ffffff",
      border: `1px solid ${focus ? C.tealBdr : C.border2}`,
      borderRadius: 8, transition: "border-color 0.1s",
      boxShadow: focus ? "0 0 0 3px rgba(8,145,178,0.10)" : "none",
    }}>
      <textarea
        value={value || ""} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        rows={3}
        style={{ width: "100%", padding: "9px 12px", background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 13, resize: "vertical", fontFamily: "inherit" }}
      />
    </div>
  );
}

function PrimaryBtn({ onClick, children, disabled, danger, type = "button" }: {
  onClick?: () => void; children: React.ReactNode; disabled?: boolean; danger?: boolean; type?: "button" | "submit";
}) {
  const [hover, setHover] = useState(false);
  const bg = disabled
    ? "rgba(0,0,0,0.08)"
    : (danger ? (hover ? "#b91c1c" : C.red) : (hover ? C.tealBright : C.teal));
  const color = disabled ? C.muted : "#ffffff";
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        padding: "8px 16px", background: bg, color, border: "none",
        borderRadius: 8, fontSize: 13, fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.1s",
        display: "inline-flex", alignItems: "center", gap: 6,
      }}
    >{children}</button>
  );
}

function SecondaryBtn({ onClick, children, type = "button" }: {
  onClick?: () => void; children: React.ReactNode; type?: "button" | "submit";
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type={type} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        padding: "8px 14px",
        background: hover ? "rgba(0,0,0,0.05)" : "transparent",
        color: hover ? C.text : C.textDim,
        border: `1px solid ${C.border2}`,
        borderRadius: 8, fontSize: 13, fontWeight: 500,
        transition: "all 0.1s", cursor: "pointer",
      }}
    >{children}</button>
  );
}

// ── Stage badge ───────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: LeadStage }) {
  const cfg = STAGES.find(s => s.key === stage) || STAGES[0];
  const isTerminal = stage === "won" || stage === "lost";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 4,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.bdr}`,
      fontSize: 10, fontWeight: 700,
      letterSpacing: "0.04em",
      ...(isTerminal ? { opacity: 0.85 } : {}),
    }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────

function Modal({ open, onClose, title, subtitle, width = 480, children }: {
  open: boolean; onClose: () => void;
  title: string; subtitle?: string;
  width?: number; children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(8,6,30,0.7)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: width,
        background: C.surface, border: `1px solid ${C.border2}`,
        borderRadius: 14, boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
        maxHeight: "calc(100vh - 40px)", display: "flex", flexDirection: "column",
      }}>
        <div style={{
          padding: "18px 22px 14px", borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>{title}</h2>
            {subtitle && <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textDim }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} title="Close (Esc)" style={{
            width: 28, height: 28, borderRadius: 6,
            border: "1px solid transparent", background: "transparent",
            color: C.textDim, fontSize: 16, lineHeight: 1, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>×</button>
        </div>
        <div style={{ padding: "20px 22px", overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Slide-out panel ───────────────────────────────────────────────────────

function SlidePanel({ open, onClose, children }: {
  open: boolean; onClose: () => void; children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 150,
          background: open ? "rgba(8,6,30,0.4)" : "transparent",
          pointerEvents: open ? "auto" : "none",
          transition: "background 0.25s ease",
        }}
      />
      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: Math.min(480, window.innerWidth),
        maxWidth: "100vw",
        zIndex: 151,
        background: C.surface,
        borderLeft: `1px solid ${C.border}`,
        boxShadow: open ? "-8px 0 30px rgba(0,0,0,0.10)" : "none",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s cubic-bezier(.4,0,.2,1), box-shadow 0.25s ease",
        display: "flex", flexDirection: "column",
        pointerEvents: open ? "auto" : "none",
      }}>
        {children}
      </div>
    </>
  );
}

// ── New Lead / Edit Lead Form ────────────────────────────────────────────

function LeadForm({ initial, mode, onSubmit, onCancel }: {
  initial?: Lead;
  mode: "add" | "edit";
  onSubmit: (data: NewLeadInput) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [companyName, setCompanyName] = useState(initial?.companyName || "");
  const [contactName, setContactName] = useState(initial?.contactName || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [source, setSource] = useState(initial?.source || "Website");
  const [stage, setStage] = useState<LeadStage>(initial?.stage || "new");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [followUpDate, setFollowUpDate] = useState(initial?.followUpDate || "");
  const [submitting, setSubmitting] = useState(false);

  const valid = companyName.trim() && contactName.trim() && phone.trim() && email.includes("@") && source.trim();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ companyName, contactName, phone, email, source, stage, notes, followUpDate });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Company Name" required>
        <TextInput value={companyName} onChange={setCompanyName} placeholder="Acme Corp" autoFocus={mode === "add"} />
      </Field>
      <Field label="Contact Name" required>
        <TextInput value={contactName} onChange={setContactName} placeholder="John Smith" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Phone" required>
          <TextInput value={phone} onChange={setPhone} placeholder="+61 400 000 000" />
        </Field>
        <Field label="Email" required>
          <TextInput value={email} onChange={setEmail} placeholder="john@acme.com" type="email" />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Source" required>
          <Select value={source} onChange={setSource} options={SOURCES.map(s => ({ value: s, label: s }))} />
        </Field>
        <Field label="Stage" required>
          <Select value={stage} onChange={v => setStage(v as LeadStage)} options={STAGES.map(s => ({ value: s.key, label: s.label }))} />
        </Field>
      </div>
      <Field label="Follow-up Date">
        <TextInput value={followUpDate} onChange={setFollowUpDate} type="date" />
      </Field>
      <Field label="Notes">
        <TextArea value={notes} onChange={setNotes} placeholder="Any relevant details…" />
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
        <SecondaryBtn onClick={onCancel}>Cancel</SecondaryBtn>
        <PrimaryBtn type="submit" disabled={!valid || submitting}>
          {submitting ? "Saving…" : (mode === "add" ? "Create Lead" : "Save Changes")}
        </PrimaryBtn>
      </div>
    </form>
  );
}

// ── Interaction Form ──────────────────────────────────────────────────────

function InteractionForm({ onSubmit, onCancel }: {
  onSubmit: (data: { type: string; notes: string }) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [type, setType] = useState("Call");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const valid = type.trim() && notes.trim();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ type, notes });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: C.surface2, borderRadius: 10, padding: 14, border: `1px solid ${C.border}` }}>
      <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: C.text }}>Log Interaction</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <Select
          value={type}
          onChange={setType}
          options={[
            { value: "Call", label: "📞 Call" },
            { value: "Email", label: "✉️ Email" },
            { value: "Meeting", label: "🤝 Meeting" },
            { value: "Demo", label: "🖥️ Demo" },
            { value: "Note", label: "📝 Note" },
            { value: "Other", label: "🔹 Other" },
          ]}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <TextArea value={notes} onChange={setNotes} placeholder="Notes about this interaction…" />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <SecondaryBtn onClick={onCancel}>Cancel</SecondaryBtn>
        <PrimaryBtn type="submit" disabled={!valid || submitting}>
          {submitting ? "Saving…" : "Log"}
        </PrimaryBtn>
      </div>
    </form>
  );
}

// ── Kanban Card ───────────────────────────────────────────────────────────

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const stageCfg = STAGES.find(s => s.key === lead.stage) || STAGES[0];
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "rgba(0,0,0,0.025)" : C.surface,
        border: `1px solid ${hover ? C.border2 : C.border}`,
        borderRadius: 10,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "all 0.12s ease",
        boxShadow: hover ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: C.text, lineHeight: 1.3, flex: 1, minWidth: 0 }}>
          {lead.companyName}
        </div>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: stageCfg.color, flexShrink: 0, marginTop: 4 }} />
      </div>
      <div style={{ fontSize: 11, color: C.textDim, marginBottom: 4 }}>
        {lead.contactName}
      </div>
      {lead.lastContactedAt && (
        <div style={{ fontSize: 10, color: C.muted }}>
          Last: {ago(lead.lastContactedAt)}
        </div>
      )}
    </div>
  );
}

// ── Lead Detail Panel ─────────────────────────────────────────────────────

function LeadDetail({ lead, onClose, onStageChange, onDelete, onAddInteraction }: {
  lead: Lead;
  onClose: () => void;
  onStageChange: (stage: LeadStage) => void;
  onDelete: () => void;
  onAddInteraction: (data: { type: string; notes: string }) => Promise<void>;
}) {
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [stage, setStage] = useState(lead.stage);

  useEffect(() => {
    setStage(lead.stage);
    setShowInteractionForm(false);
    setConfirmDelete(false);
  }, [lead.id]);

  function handleStageChange(v: string) {
    setStage(v as LeadStage);
    onStageChange(v as LeadStage);
  }

  return (
    <SlidePanel open={!!lead} onClose={onClose}>
      {/* Header */}
      <div style={{
        padding: "18px 20px 14px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>{lead.companyName}</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: C.textDim }}>{lead.contactName}</p>
        </div>
        <button onClick={onClose} title="Close (Esc)" style={{
          width: 28, height: 28, borderRadius: 6,
          border: "1px solid transparent", background: "transparent",
          color: C.textDim, fontSize: 16, lineHeight: 1, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>×</button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {/* Stage selector */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted, margin: "0 0 6px" }}>Stage</p>
          <select
            value={stage}
            onChange={e => handleStageChange(e.target.value)}
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 8,
              border: `1px solid ${C.border2}`,
              background: "#ffffff", color: C.text, fontSize: 13,
              cursor: "pointer",
            }}
          >
            {STAGES.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted, margin: "0 0 3px" }}>Phone</p>
            <p style={{ margin: 0, fontSize: 13, color: C.text }}>{lead.phone || "—"}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted, margin: "0 0 3px" }}>Email</p>
            <p style={{ margin: 0, fontSize: 13, color: C.text }}>{lead.email || "—"}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted, margin: "0 0 3px" }}>Source</p>
            <p style={{ margin: 0, fontSize: 13, color: C.text }}>{lead.source || "—"}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted, margin: "0 0 3px" }}>Created</p>
            <p style={{ margin: 0, fontSize: 13, color: C.text }}>{fmtDate(lead.createdAt)}</p>
          </div>
          {lead.followUpDate && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted, margin: "0 0 3px" }}>Follow-Up</p>
              <p style={{ margin: 0, fontSize: 13, color: C.amber }}>{fmtDate(lead.followUpDate)}</p>
            </div>
          )}
          {lead.lastContactedAt && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted, margin: "0 0 3px" }}>Last Contacted</p>
              <p style={{ margin: 0, fontSize: 13, color: C.text }}>{ago(lead.lastContactedAt)}</p>
            </div>
          )}
        </div>

        {/* Notes */}
        {lead.notes && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted, margin: "0 0 5px" }}>Notes</p>
            <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{lead.notes}</p>
          </div>
        )}

        {/* Log Interaction */}
        <div style={{ marginBottom: 18 }}>
          {showInteractionForm ? (
            <InteractionForm
              onSubmit={async (data) => {
                await onAddInteraction(data);
                setShowInteractionForm(false);
              }}
              onCancel={() => setShowInteractionForm(false)}
            />
          ) : (
            <PrimaryBtn onClick={() => setShowInteractionForm(true)}>+ Log Interaction</PrimaryBtn>
          )}
        </div>

        {/* Interaction History */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted, margin: "0 0 8px" }}>
            Interaction History {lead.interactions?.length > 0 && `(${lead.interactions.length})`}
          </p>
          {(!lead.interactions || lead.interactions.length === 0) ? (
            <p style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>No interactions logged yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...lead.interactions].reverse().map((ix, i) => (
                <div key={i} style={{
                  padding: "10px 12px", borderRadius: 8,
                  background: C.surface2, border: `1px solid ${C.border}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "1px 6px", borderRadius: 3,
                      background: C.blueBg, color: C.blue,
                      fontSize: 10, fontWeight: 700,
                    }}>
                      {ix.type}
                    </span>
                    <span style={{ fontSize: 10, color: C.muted }}>{fmtDateTime(ix.date)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: C.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{ix.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          {confirmDelete ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: C.red }}>Delete this lead?</span>
              <PrimaryBtn danger onClick={onDelete}>Confirm Delete</PrimaryBtn>
              <SecondaryBtn onClick={() => setConfirmDelete(false)}>Cancel</SecondaryBtn>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: C.muted, fontSize: 12, padding: "4px 0",
              }}
            >Delete Lead</button>
          )}
        </div>
      </div>
    </SlidePanel>
  );
}

// ── Table View ────────────────────────────────────────────────────────────

function TableView({ leads, onLeadClick }: { leads: Lead[]; onLeadClick: (lead: Lead) => void }) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return l.companyName.toLowerCase().includes(q)
        || l.contactName.toLowerCase().includes(q)
        || l.email.toLowerCase().includes(q)
        || l.phone.toLowerCase().includes(q);
    });
  }, [leads, search, stageFilter]);

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search leads…"
          style={{
            flex: 1, maxWidth: 280, padding: "8px 12px",
            border: `1px solid ${C.border2}`, borderRadius: 8,
            fontSize: 13, outline: "none", color: C.text,
            background: "#ffffff",
          }}
        />
        <select
          value={stageFilter} onChange={e => setStageFilter(e.target.value)}
          style={{
            padding: "8px 10px", borderRadius: 8,
            border: `1px solid ${C.border2}`,
            fontSize: 13, color: C.text, background: "#ffffff", cursor: "pointer",
          }}
        >
          <option value="all">All Stages</option>
          {STAGES.map(s => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: C.muted }}>{filtered.length} lead{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div style={{
        background: C.surface, borderRadius: 12,
        border: `1px solid ${C.border}`,
        overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
              {["Company", "Contact", "Phone", "Email", "Source", "Stage", "Last Contacted", "Created"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "24px", textAlign: "center", color: C.muted, fontSize: 13 }}>
                  No leads found.
                </td>
              </tr>
            ) : (
              filtered.map(lead => (
                <tr
                  key={lead.id}
                  onClick={() => onLeadClick(lead)}
                  style={{
                    borderBottom: `1px solid ${C.border}`,
                    cursor: "pointer", transition: "background 0.08s",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.02)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  <td style={{ padding: "10px 12px", fontWeight: 600, color: C.text }}>{lead.companyName}</td>
                  <td style={{ padding: "10px 12px", color: C.textDim }}>{lead.contactName}</td>
                  <td style={{ padding: "10px 12px", color: C.textDim }}>{lead.phone}</td>
                  <td style={{ padding: "10px 12px", color: C.textDim }}>{lead.email}</td>
                  <td style={{ padding: "10px 12px" }}><span style={{ fontSize: 11, color: C.textDim }}>{lead.source}</span></td>
                  <td style={{ padding: "10px 12px" }}><StageBadge stage={lead.stage} /></td>
                  <td style={{ padding: "10px 12px", color: C.textDim, fontSize: 12 }}>{lead.lastContactedAt ? ago(lead.lastContactedAt) : "—"}</td>
                  <td style={{ padding: "10px 12px", color: C.textDim, fontSize: 12 }}>{fmtDate(lead.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Kanban View ───────────────────────────────────────────────────────────

function KanbanView({ leads, onLeadClick }: { leads: Lead[]; onLeadClick: (lead: Lead) => void }) {
  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const s of STAGES) map[s.key] = [];
    for (const l of leads) {
      if (map[l.stage]) map[l.stage].push(l);
    }
    return map;
  }, [leads]);

  return (
    <div style={{
      display: "flex", gap: 10,
      overflowX: "auto", paddingBottom: 8,
      minHeight: "calc(100vh - 220px)",
    }}>
      {STAGES.map(stage => {
        const stageLeads = leadsByStage[stage.key] || [];
        return (
          <div key={stage.key} style={{
            flex: "0 0 220px",
            minWidth: 200,
            display: "flex", flexDirection: "column",
          }}>
            {/* Column header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 10px", marginBottom: 8,
              borderRadius: 8, background: stage.bg,
              border: `1px solid ${stage.bdr}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: stage.color }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: stage.color }}>{stage.label}</span>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, color: stage.color,
                background: stage.bg, padding: "1px 6px", borderRadius: 4,
                border: `1px solid ${stage.bdr}`,
                opacity: 0.8,
              }}>{stageLeads.length}</span>
            </div>

            {/* Cards */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {stageLeads.length === 0 ? (
                <div style={{
                  padding: "20px 10px", textAlign: "center", color: C.muted,
                  fontSize: 11, fontStyle: "italic",
                }}>
                  No leads
                </div>
              ) : (
                stageLeads.map(lead => (
                  <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main CRM Client ───────────────────────────────────────────────────────

export default function CrmClient() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [showNewLead, setShowNewLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // ── Fetch leads ──────────────────────────────────────────────────────────

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/saabai-crm");
      if (!res.ok) throw new Error(`Failed to load leads (${res.status})`);
      const data = await res.json();
      setLeads(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // ── Create lead ──────────────────────────────────────────────────────────

  async function handleCreateLead(data: NewLeadInput) {
    const res = await fetch("/api/saabai-crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create lead");
    }
    await fetchLeads();
    setShowNewLead(false);
  }

  // ── Update lead stage ────────────────────────────────────────────────────

  async function handleStageChange(lead: Lead, newStage: LeadStage) {
    const res = await fetch(`/api/saabai-crm?id=${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    setSelectedLead(updated);
  }

  // ── Add interaction ──────────────────────────────────────────────────────

  async function handleAddInteraction(leadId: string, data: { type: string; notes: string }) {
    const res = await fetch("/api/saabai-crm/interaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, ...data }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to log interaction");
    }
    const updated = await res.json();
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    setSelectedLead(updated);
  }

  // ── Delete lead ──────────────────────────────────────────────────────────

  async function handleDeleteLead(lead: Lead) {
    const res = await fetch(`/api/saabai-crm?id=${lead.id}`, { method: "DELETE" });
    if (!res.ok) return;
    setLeads(prev => prev.filter(l => l.id !== lead.id));
    setSelectedLead(null);
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = leads.length;
    const won = leads.filter(l => l.stage === "won").length;
    const lost = leads.filter(l => l.stage === "lost").length;
    const active = total - won - lost;
    return { total, active, won, lost };
  }, [leads]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "24px 28px", minHeight: "100vh", background: C.bg }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>CRM</h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: C.textDim }}>
            {stats.total} lead{stats.total !== 1 ? "s" : ""} · {stats.active} active · {stats.won} won · {stats.lost} lost
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* View toggle */}
          <div style={{
            display: "flex", background: C.surface2,
            borderRadius: 8, border: `1px solid ${C.border}`,
            padding: 3, gap: 2,
          }}>
            <button
              onClick={() => setView("kanban")}
              style={{
                padding: "6px 12px", borderRadius: 6,
                border: "none", cursor: "pointer",
                background: view === "kanban" ? C.surface : "transparent",
                color: view === "kanban" ? C.text : C.textDim,
                fontWeight: view === "kanban" ? 600 : 400,
                fontSize: 12, transition: "all 0.1s",
                boxShadow: view === "kanban" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >Kanban</button>
            <button
              onClick={() => setView("table")}
              style={{
                padding: "6px 12px", borderRadius: 6,
                border: "none", cursor: "pointer",
                background: view === "table" ? C.surface : "transparent",
                color: view === "table" ? C.text : C.textDim,
                fontWeight: view === "table" ? 600 : 400,
                fontSize: 12, transition: "all 0.1s",
                boxShadow: view === "table" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >Table</button>
          </div>
          <PrimaryBtn onClick={() => setShowNewLead(true)}>+ New Lead</PrimaryBtn>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          padding: "10px 14px", borderRadius: 8,
          background: C.redBg, border: `1px solid ${C.redBdr}`,
          color: C.red, fontSize: 13, marginBottom: 16,
        }}>
          {error}
          <button
            onClick={fetchLeads}
            style={{
              marginLeft: 12, background: "none", border: "none",
              color: C.red, fontWeight: 700, cursor: "pointer",
              fontSize: 13, textDecoration: "underline",
            }}
          >Retry</button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "80px 0", color: C.muted, fontSize: 14,
        }}>
          Loading leads…
        </div>
      ) : (
        <>
          {/* Kanban or Table */}
          {view === "kanban" ? (
            <KanbanView leads={leads} onLeadClick={setSelectedLead} />
          ) : (
            <TableView leads={leads} onLeadClick={setSelectedLead} />
          )}
        </>
      )}

      {/* New Lead Modal */}
      <Modal open={showNewLead} onClose={() => setShowNewLead(false)} title="New Lead" subtitle="Add a new lead to the pipeline.">
        <LeadForm mode="add" onSubmit={handleCreateLead} onCancel={() => setShowNewLead(false)} />
      </Modal>

      {/* Lead Detail Panel */}
      {selectedLead && (
        <LeadDetail
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onStageChange={(stage) => handleStageChange(selectedLead, stage)}
          onDelete={() => handleDeleteLead(selectedLead)}
          onAddInteraction={(data) => handleAddInteraction(selectedLead.id, data)}
        />
      )}
    </div>
  );
}
