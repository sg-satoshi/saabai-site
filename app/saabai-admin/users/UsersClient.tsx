"use client";

/* ─────────────────────────────────────────────────────────────────────────
   UsersClient.tsx — User Directory page
   Drop-in replacement for app/saabai-admin/users/UsersClient.tsx
   Keeps the same /api/user-directory contract:
     GET    → { users: User[] }
     POST   { name, email, password, role, dashboardUrl }
     PATCH  { originalEmail, name, email, role, dashboardUrl, password? }
     DELETE { email }
   ───────────────────────────────────────────────────────────────────────── */

import { useState, useEffect, useMemo, useRef, CSSProperties, ReactNode, FormEvent } from "react";

// ── Types ────────────────────────────────────────────────────────────────
interface User {
  id?: string;
  name: string;
  email: string;
  role: string;
  source?: string;
  dashboardUrl?: string;
  createdAt?: string | number;
  lastActive?: string | number;
  status?: string;
}

type BulkTarget = { bulk: true; count: number; items: User[] };
type DeleteTarget = User | BulkTarget | null;

// ── Tokens (marketing teal on indigo-navy) ───────────────────────────────
const C = {
  bg:           "#0b092e",
  sidebar:      "#08062a",
  surface:      "#14123a",
  surface2:     "#1a1748",
  rowHover:     "rgba(255,255,255,0.025)",
  rowSelected:  "rgba(98,197,209,0.06)",
  border:       "rgba(255,255,255,0.07)",
  border2:      "rgba(255,255,255,0.10)",
  divider:      "rgba(255,255,255,0.05)",
  teal:         "#62c5d1",
  tealBright:   "#7dd9e3",
  tealBg:       "rgba(98,197,209,0.10)",
  tealBdr:      "rgba(98,197,209,0.30)",
  tealSoft:     "rgba(98,197,209,0.05)",
  green:        "#4ade80",
  greenBg:      "rgba(74,222,128,0.10)",
  greenBdr:     "rgba(74,222,128,0.30)",
  red:          "#f87171",
  redBg:        "rgba(248,113,113,0.10)",
  redBdr:       "rgba(248,113,113,0.30)",
  blue:         "#60a5fa",
  blueBg:       "rgba(96,165,250,0.10)",
  text:         "#e2e4f0",
  textDim:      "#8a90b0",
  muted:        "#505570",
};

const DASHBOARD_PRESETS = [
  { value: "/rex-dashboard", label: "Rex Dashboard", hint: "Trade & e-commerce — Rex agent" },
  { value: "/lex",           label: "Lex Workspace", hint: "Legal — Lex AI assistant" },
  { value: "/client-portal", label: "Client Portal", hint: "Firm config — agent personality, skill packs" },
  { value: "/saabai-admin",  label: "Admin",         hint: "Full Saabai admin (staff only)" },
];

// ── Helpers ──────────────────────────────────────────────────────────────
function ago(ms: number): string {
  if (!ms || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

function fmtDate(ts: string | number | undefined): string {
  if (!ts) return "—";
  const d = new Date(typeof ts === "string" ? Date.parse(ts) : ts);
  if (isNaN(d.getTime())) return "—";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const pad = (n: number) => n < 10 ? "0" + n : "" + n;
  return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function tsOf(v: string | number | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = Date.parse(v);
  return isNaN(n) ? 0 : n;
}

const AVATAR_PALETTES: [string, string][] = [
  ["#3b1d1d", "#f87171"],
  ["#1e2a18", "#86efac"],
  ["#1b2440", "#93c5fd"],
  ["#2b1f3a", "#c4b5fd"],
  ["#3a2a18", "#fbbf24"],
  ["#1a2e30", "#5eead4"],
  ["#2c1a35", "#f0abfc"],
  ["#1a2638", "#a5b4fc"],
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ── Small components ─────────────────────────────────────────────────────
function Avatar({ name, email, size = 28, role = "user" }: {
  name: string; email: string; size?: number; role?: string;
}) {
  const isAdmin = role === "admin";
  const palette: [string, string] = isAdmin
    ? [C.tealBg, C.teal]
    : AVATAR_PALETTES[hashStr(email || name || "") % AVATAR_PALETTES.length];
  const initial = (name || email || "?").charAt(0).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: palette[0],
      border: `1px solid ${isAdmin ? C.tealBdr : "rgba(255,255,255,0.07)"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: palette[1],
      fontSize: Math.max(11, size * 0.40),
      fontWeight: 700,
      flexShrink: 0,
      letterSpacing: "-0.01em",
    }}>{initial}</div>
  );
}

function StatusDot({ status }: { status?: string }) {
  const isActive = status !== "dormant";
  return (
    <span title={isActive ? "Active" : "Dormant"} style={{
      width: 6, height: 6, borderRadius: "50%",
      background: isActive ? C.green : C.muted,
      boxShadow: isActive ? "0 0 6px rgba(74,222,128,0.45)" : "none",
      display: "inline-block",
    }} />
  );
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 8px",
      background: isAdmin ? C.tealBg : C.greenBg,
      color: isAdmin ? C.teal : C.green,
      border: `1px solid ${isAdmin ? C.tealBdr : C.greenBdr}`,
      borderRadius: 4,
      fontSize: 10, fontWeight: 700,
      letterSpacing: "0.06em", textTransform: "uppercase",
    }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: isAdmin ? C.teal : C.green }} />
      {role}
    </span>
  );
}

function Checkbox({ checked, onChange, indeterminate }: {
  checked: boolean; onChange: () => void; indeterminate?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label
      style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}
      onClick={e => e.stopPropagation()}
    >
      <input
        ref={ref} type="checkbox" checked={checked}
        onChange={onChange}
        style={{ width: 14, height: 14, accentColor: C.teal, cursor: "pointer" }}
      />
    </label>
  );
}

function IconBtn({ children, title, danger, onClick }: {
  children: ReactNode; title?: string; danger?: boolean; onClick?: (e: React.MouseEvent) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick && onClick(e); }}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 26, height: 26, borderRadius: 6,
        border: `1px solid ${hover ? "rgba(255,255,255,0.10)" : "transparent"}`,
        background: hover ? "rgba(255,255,255,0.05)" : "transparent",
        color: danger ? (hover ? C.red : "rgba(248,113,113,0.7)") : (hover ? C.text : C.textDim),
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.1s",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ── Form primitives ──────────────────────────────────────────────────────
function Field({ label, hint, required, children }: {
  label: ReactNode; hint?: ReactNode; required?: boolean; children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 600,
        letterSpacing: "0.05em", textTransform: "uppercase",
        color: C.textDim, marginBottom: 6,
      }}>
        {label}{required && <span style={{ color: C.teal, marginLeft: 4 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ margin: "5px 0 0", fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", autoFocus }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; autoFocus?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{
      display: "flex", alignItems: "center",
      background: "rgba(0,0,0,0.30)",
      border: `1px solid ${focus ? C.tealBdr : C.border2}`,
      borderRadius: 8,
      transition: "border-color 0.1s",
      boxShadow: focus ? "0 0 0 3px rgba(98,197,209,0.10)" : "none",
    }}>
      <input
        type={type} value={value || ""} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} autoFocus={autoFocus}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          flex: 1, padding: "10px 12px",
          background: "transparent", border: "none", outline: "none",
          color: C.text, fontSize: 14,
        }}
      />
    </div>
  );
}

function RoleSegment({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = [
    { value: "user",  hint: "Portal access only" },
    { value: "admin", hint: "Full Saabai admin" },
  ];
  return (
    <div style={{
      display: "grid", gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: 6,
      padding: 4, background: "rgba(0,0,0,0.25)",
      border: `1px solid ${C.border2}`, borderRadius: 8,
    }}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value} type="button" onClick={() => onChange(opt.value)}
            style={{
              padding: "9px 10px", borderRadius: 6,
              border: `1px solid ${active ? C.tealBdr : "transparent"}`,
              background: active ? C.tealBg : "transparent",
              color: active ? C.teal : C.textDim,
              fontSize: 13, fontWeight: active ? 600 : 500,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              transition: "all 0.12s", cursor: "pointer",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: active ? C.teal : C.muted }} />
              <span style={{ textTransform: "capitalize" }}>{opt.value}</span>
            </span>
            <span style={{ fontSize: 10, color: active ? C.teal : C.muted, fontWeight: 400 }}>{opt.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

function DashboardPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {DASHBOARD_PRESETS.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value} type="button" onClick={() => onChange(opt.value)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px", borderRadius: 8,
              border: `1px solid ${active ? C.tealBdr : C.border}`,
              background: active ? C.tealBg : "rgba(0,0,0,0.15)",
              color: C.text, textAlign: "left",
              transition: "all 0.12s", cursor: "pointer",
            }}
          >
            <span style={{
              width: 14, height: 14, borderRadius: "50%",
              border: `1px solid ${active ? C.teal : "rgba(255,255,255,0.15)"}`,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.teal }} />}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{opt.hint}</div>
            </div>
            <code style={{
              fontFamily: "ui-monospace, monospace", fontSize: 11,
              color: active ? C.teal : C.muted,
              background: "rgba(0,0,0,0.25)",
              padding: "2px 7px", borderRadius: 4, flexShrink: 0,
            }}>{opt.value}</code>
          </button>
        );
      })}
    </div>
  );
}

function PrimaryBtn({ onClick, children, disabled, danger, type = "button" }: {
  onClick?: () => void; children: ReactNode; disabled?: boolean; danger?: boolean;
  type?: "button" | "submit";
}) {
  const [hover, setHover] = useState(false);
  const bg = disabled
    ? "rgba(255,255,255,0.05)"
    : (danger ? (hover ? "#fa8d8d" : C.red) : (hover ? C.tealBright : C.teal));
  const color = disabled ? C.muted : (danger ? "#1a0808" : C.bg);
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        padding: "9px 18px", background: bg, color, border: "none",
        borderRadius: 8, fontSize: 13, fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.1s",
        display: "inline-flex", alignItems: "center", gap: 6,
      }}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({ onClick, children, type = "button" }: {
  onClick?: () => void; children: ReactNode; type?: "button" | "submit";
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type={type} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        padding: "9px 14px",
        background: hover ? "rgba(255,255,255,0.04)" : "transparent",
        color: hover ? C.text : C.textDim,
        border: `1px solid ${C.border2}`,
        borderRadius: 8, fontSize: 13, fontWeight: 500,
        transition: "all 0.1s", cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ── Modal shell ──────────────────────────────────────────────────────────
function Modal({ open, onClose, title, subtitle, width = 480, children, danger }: {
  open: boolean; onClose: () => void;
  title: ReactNode; subtitle?: ReactNode;
  width?: number; children: ReactNode; danger?: boolean;
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
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(8,6,30,0.7)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: width,
          background: C.surface,
          border: `1px solid ${danger ? C.redBdr : C.border2}`,
          borderRadius: 14,
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          maxHeight: "calc(100vh - 40px)",
          display: "flex", flexDirection: "column",
        }}
      >
        <div style={{
          padding: "18px 22px 14px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>{title}</h2>
            {subtitle && <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textDim, lineHeight: 1.5 }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose} title="Close (Esc)"
            style={{
              width: 28, height: 28, borderRadius: 6,
              border: `1px solid transparent`, background: "transparent",
              color: C.textDim, fontSize: 16, lineHeight: 1, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >×</button>
        </div>
        <div style={{ padding: "20px 22px", overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// ── User form (Add / Edit) ───────────────────────────────────────────────
function UserForm({ initial, mode, onSubmit, onCancel }: {
  initial?: User; mode: "add" | "edit";
  onSubmit: (data: { name: string; email: string; password: string; role: string; dashboardUrl: string; sendInvite: boolean }) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(initial?.role || "user");
  const [dashboardUrl, setDashboardUrl] = useState(initial?.dashboardUrl || "/rex-dashboard");
  const [sendInvite, setSendInvite] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = mode === "edit";
  const valid = name.trim() && email.includes("@") && (isEdit || password.length >= 8);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ name, email, password, role, dashboardUrl, sendInvite });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Full name" required>
        <TextInput value={name} onChange={setName} placeholder="Jane Smith" autoFocus={!isEdit} />
      </Field>

      <Field label="Email" required>
        <TextInput value={email} onChange={setEmail} placeholder="jane@firm.com.au" type="email" />
      </Field>

      <Field
        label={isEdit ? "Reset password (optional)" : "Password"}
        required={!isEdit}
        hint={isEdit
          ? "Leave blank to keep the existing password. Minimum 8 characters when set."
          : "Minimum 8 characters. The user will be prompted to change it on first sign-in."}
      >
        <TextInput
          value={password} onChange={setPassword}
          placeholder={isEdit ? "Leave blank to keep current" : "••••••••"}
          type="password"
        />
      </Field>

      <Field label="Role">
        <RoleSegment value={role} onChange={setRole} />
      </Field>

      <Field label="Dashboard route" hint="Which surface this user lands on after signing in.">
        <DashboardPicker value={dashboardUrl} onChange={setDashboardUrl} />
      </Field>

      {!isEdit && (
        <Field label="Onboarding">
          <label style={{
            display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
            padding: "8px 12px", background: "rgba(0,0,0,0.15)",
            border: `1px solid ${C.border}`, borderRadius: 8,
          }}>
            <input
              type="checkbox" checked={sendInvite}
              onChange={e => setSendInvite(e.target.checked)}
              style={{ accentColor: C.teal, width: 15, height: 15 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: C.text }}>Send welcome email with sign-in link</div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 1 }}>Uses Resend · sender: hello@saabai.ai</div>
            </div>
          </label>
        </Field>
      )}

      <div style={{
        marginTop: 20, paddingTop: 14,
        borderTop: `1px solid ${C.border}`,
        display: "flex", justifyContent: "flex-end", gap: 8,
      }}>
        <SecondaryBtn onClick={onCancel}>Cancel</SecondaryBtn>
        <PrimaryBtn type="submit" disabled={!valid || submitting}>
          {submitting ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save changes" : "Create user")}
        </PrimaryBtn>
      </div>
    </form>
  );
}

// ── Sort menu ────────────────────────────────────────────────────────────
function SortMenu({ sort, setSort }: { sort: string; setSort: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function on(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", on);
    return () => document.removeEventListener("mousedown", on);
  }, []);

  const options = [
    { key: "name-asc",     label: "Name (A→Z)" },
    { key: "name-desc",    label: "Name (Z→A)" },
    { key: "created-desc", label: "Recently added" },
    { key: "created-asc",  label: "Oldest first" },
    { key: "active-desc",  label: "Most recently active" },
    { key: "active-asc",   label: "Least recently active" },
  ];
  const current = options.find(o => o.key === sort);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          padding: "8px 12px",
          background: "rgba(0,0,0,0.25)",
          border: `1px solid ${C.border2}`,
          borderRadius: 8, color: C.textDim, fontSize: 12,
          display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 3.5h8M3.5 6h5M5 8.5h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span style={{ color: C.text }}>{current?.label || "Sort"}</span>
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ opacity: 0.5 }}>
          <path d="M1 3l3.5 3.5L8 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 4px)",
          background: C.surface, border: `1px solid ${C.border2}`,
          borderRadius: 8, padding: 4, minWidth: 200, zIndex: 50,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}>
          {options.map(o => (
            <button
              key={o.key}
              onClick={() => { setSort(o.key); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "7px 10px", borderRadius: 6,
                background: sort === o.key ? C.tealBg : "transparent",
                color: sort === o.key ? C.teal : C.text,
                border: "none", fontSize: 12, fontWeight: sort === o.key ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Toolbar (filter chips + search + sort + add) ─────────────────────────
function UsersToolbar({ q, setQ, filter, setFilter, counts, sort, setSort, onAdd }: {
  q: string; setQ: (s: string) => void;
  filter: string; setFilter: (f: string) => void;
  counts: { all: number; admin: number; user: number; env: number };
  sort: string; setSort: (s: string) => void;
  onAdd: () => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "16px 28px",
      borderBottom: `1px solid ${C.border}`,
      background: "rgba(255,255,255,0.015)",
      flexWrap: "wrap",
    }}>
      <div style={{
        display: "flex", gap: 4, padding: 3, borderRadius: 8,
        border: `1px solid ${C.border2}`, background: "rgba(0,0,0,0.25)",
      }}>
        {[
          { key: "all",   label: "All",   count: counts.all },
          { key: "admin", label: "Admin", count: counts.admin },
          { key: "user",  label: "User",  count: counts.user },
          { key: "env",   label: "Env",   count: counts.env },
        ].map(f => {
          const active = filter === f.key;
          return (
            <button
              key={f.key} onClick={() => setFilter(f.key)}
              style={{
                padding: "5px 12px", borderRadius: 6, border: "none",
                background: active ? C.tealBg : "transparent",
                color: active ? C.teal : C.textDim,
                fontSize: 12, fontWeight: active ? 600 : 500,
                display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.1s", cursor: "pointer",
              }}
            >
              <span>{f.label}</span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: active ? C.teal : C.muted,
                background: active ? "rgba(98,197,209,0.10)" : "rgba(255,255,255,0.05)",
                padding: "0 6px", borderRadius: 4,
                minWidth: 18, textAlign: "center",
              }}>{f.count}</span>
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ position: "relative", width: 260 }}>
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.muted, pointerEvents: "none" }}
        >
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search name or email…"
          style={{
            width: "100%",
            padding: "8px 32px 8px 32px",
            background: "rgba(0,0,0,0.25)",
            border: `1px solid ${C.border2}`,
            borderRadius: 8, color: C.text, fontSize: 13, outline: "none",
          }}
        />
        {q && (
          <button
            onClick={() => setQ("")}
            style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: C.muted, fontSize: 14, lineHeight: 1, padding: 4,
              cursor: "pointer",
            }}
          >×</button>
        )}
      </div>

      <SortMenu sort={sort} setSort={setSort} />

      <button
        onClick={onAdd}
        style={{
          background: C.teal, color: C.bg,
          border: `1px solid ${C.teal}`,
          padding: "8px 16px", borderRadius: 8,
          fontSize: 13, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 6,
          cursor: "pointer",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        Add User
      </button>
    </div>
  );
}

// ── Table ────────────────────────────────────────────────────────────────
function UsersTable({ users, density, showLastActive, showCreated, selected, setSelected, onEdit, onDelete }: {
  users: User[]; density: "compact" | "comfortable";
  showLastActive: boolean; showCreated: boolean;
  selected: Record<string, boolean>;
  setSelected: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onEdit: (u: User) => void;
  onDelete: (u: User) => void;
}) {
  const rowH = density === "compact" ? 44 : 56;
  const allSelected = users.length > 0 && users.every(u => selected[keyOf(u)]);
  const someSelected = users.some(u => selected[keyOf(u)]) && !allSelected;

  function toggleAll() {
    if (allSelected) setSelected({});
    else {
      const next: Record<string, boolean> = {};
      users.forEach(u => { next[keyOf(u)] = true; });
      setSelected(next);
    }
  }
  function toggleRow(id: string) {
    setSelected(prev => {
      const n = { ...prev };
      if (n[id]) delete n[id]; else n[id] = true;
      return n;
    });
  }

  const cols = [
    "36px",
    "minmax(260px, 1fr)",
    "92px",
    "220px",
    showLastActive ? "140px" : null,
    showCreated ? "120px" : null,
    "112px",
  ].filter(Boolean).join(" ");

  const headStyle: CSSProperties = {
    padding: "0 16px", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.10em", textTransform: "uppercase",
    color: C.muted, display: "flex", alignItems: "center", height: 36,
  };

  return (
    <div style={{
      margin: "0 28px 24px",
      background: "rgba(255,255,255,0.012)",
      border: `1px solid ${C.border}`,
      borderRadius: 10, overflow: "hidden",
    }}>
      <div style={{
        display: "grid", gridTemplateColumns: cols,
        borderBottom: `1px solid ${C.border}`,
        background: "rgba(0,0,0,0.18)",
      }}>
        <div style={{ ...headStyle, justifyContent: "center" }}>
          <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
        </div>
        <div style={headStyle}>User</div>
        <div style={headStyle}>Role</div>
        <div style={headStyle}>Dashboard</div>
        {showLastActive && <div style={headStyle}>Last active</div>}
        {showCreated && <div style={headStyle}>Added</div>}
        <div style={{ ...headStyle, justifyContent: "flex-end" }}>Actions</div>
      </div>

      {users.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", color: C.textDim }}>
          <div style={{ fontSize: 14, marginBottom: 6 }}>No users match this view</div>
          <div style={{ fontSize: 12, color: C.muted }}>Try clearing the search or filter.</div>
        </div>
      ) : users.map((u, i) => (
        <Row
          key={keyOf(u)}
          user={u} density={density} rowH={rowH} cols={cols}
          showLastActive={showLastActive} showCreated={showCreated}
          selected={!!selected[keyOf(u)]}
          toggle={() => toggleRow(keyOf(u))}
          onEdit={onEdit} onDelete={onDelete}
          isLast={i === users.length - 1}
        />
      ))}
    </div>
  );
}

function keyOf(u: User): string { return u.id || u.email; }

function Row({ user, density, rowH, cols, showLastActive, showCreated, selected, toggle, onEdit, onDelete, isLast }: {
  user: User; density: "compact" | "comfortable"; rowH: number; cols: string;
  showLastActive: boolean; showCreated: boolean;
  selected: boolean; toggle: () => void;
  onEdit: (u: User) => void; onDelete: (u: User) => void;
  isLast: boolean;
}) {
  const [hover, setHover] = useState(false);
  const isEnv = user.source === "env";

  let bg = "transparent";
  if (selected) bg = C.rowSelected;
  if (hover && !selected) bg = C.rowHover;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => !isEnv && onEdit(user)}
      style={{
        display: "grid", gridTemplateColumns: cols,
        height: rowH, background: bg,
        borderBottom: isLast ? "none" : `1px solid ${C.divider}`,
        transition: "background 0.08s",
        cursor: isEnv ? "default" : "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Checkbox checked={selected} onChange={toggle} />
      </div>

      <div style={{ padding: "0 16px", display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <Avatar name={user.name} email={user.email} size={density === "compact" ? 26 : 30} role={user.role} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{
              fontSize: 13, fontWeight: 600, color: C.text,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{user.name}</span>
            <StatusDot status={user.status} />
            {isEnv && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase",
                color: C.blue, background: C.blueBg,
                border: `1px solid rgba(96,165,250,0.25)`,
                padding: "1px 5px", borderRadius: 3,
              }}>env</span>
            )}
          </div>
          <div style={{
            fontSize: density === "compact" ? 11 : 12,
            color: density === "compact" ? C.muted : C.textDim,
            marginTop: density === "compact" ? 0 : 1,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{user.email}</div>
        </div>
      </div>

      <div style={{ padding: "0 16px", display: "flex", alignItems: "center" }}>
        <RoleBadge role={user.role} />
      </div>

      <div style={{ padding: "0 16px", display: "flex", alignItems: "center" }}>
        <code style={{
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          fontSize: 11.5, color: C.textDim,
          background: "rgba(255,255,255,0.025)",
          border: `1px solid ${C.border}`,
          padding: "2px 7px", borderRadius: 4,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          maxWidth: "100%",
        }}>{user.dashboardUrl || "—"}</code>
      </div>

      {showLastActive && (
        <div style={{
          padding: "0 16px", display: "flex", alignItems: "center",
          fontSize: 12, color: user.status === "active" ? C.text : C.muted,
        }}>
          {user.lastActive ? ago(Date.now() - tsOf(user.lastActive)) : "—"}
        </div>
      )}

      {showCreated && (
        <div style={{ padding: "0 16px", display: "flex", alignItems: "center", fontSize: 12, color: C.textDim }}>
          {fmtDate(user.createdAt)}
        </div>
      )}

      <div style={{
        padding: "0 12px", display: "flex", alignItems: "center", justifyContent: "flex-end",
        gap: 2, opacity: hover ? 1 : 0.35, transition: "opacity 0.1s",
      }}>
        {!isEnv && (
          <IconBtn title="Edit user" onClick={() => onEdit(user)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9.5 2.5l2 2L5 11l-2.5.5L3 9l6.5-6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconBtn>
        )}
        <IconBtn
          title="Copy email"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.clipboard) {
              navigator.clipboard.writeText(user.email);
            }
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="4" y="4" width="7" height="8" rx="1.3" stroke="currentColor" strokeWidth="1.4" />
            <path d="M3 9V3.3a1.3 1.3 0 011.3-1.3H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </IconBtn>
        {!isEnv && (
          <IconBtn title="Delete user" danger onClick={() => onDelete(user)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 4h8M5.5 4V3a1 1 0 011-1h1a1 1 0 011 1v1M4 4l.5 7a1 1 0 001 1h3a1 1 0 001-1L10 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconBtn>
        )}
      </div>
    </div>
  );
}

// ── Pagination ───────────────────────────────────────────────────────────
function Pagination({ page, pageCount, pageSize, setPage, setPageSize, total }: {
  page: number; pageCount: number; pageSize: number;
  setPage: (p: number) => void; setPageSize: (n: number) => void;
  total: number;
}) {
  function pageBtnStyle(active: boolean, disabled: boolean): CSSProperties {
    return {
      minWidth: 28, height: 28, padding: "0 8px", borderRadius: 6,
      border: `1px solid ${active ? C.tealBdr : "transparent"}`,
      background: active ? C.tealBg : "transparent",
      color: active ? C.teal : (disabled ? C.muted : C.textDim),
      fontSize: 12, fontWeight: active ? 700 : 500,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "all 0.1s",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
    };
  }

  const pages: (number | "…")[] = [];
  const win = 1;
  const first = Math.max(1, page - win);
  const last = Math.min(pageCount, page + win);
  if (first > 1) pages.push(1);
  if (first > 2) pages.push("…");
  for (let i = first; i <= last; i++) pages.push(i);
  if (last < pageCount - 1) pages.push("…");
  if (last < pageCount) pages.push(pageCount);

  const fromIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toIdx = Math.min(total, page * pageSize);

  return (
    <div style={{
      padding: "12px 28px",
      borderTop: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 12,
    }}>
      <div style={{ fontSize: 12, color: C.textDim, display: "flex", alignItems: "center", gap: 12 }}>
        <span>Showing <strong style={{ color: C.text, fontWeight: 600 }}>{fromIdx}–{toIdx}</strong> of <strong style={{ color: C.text, fontWeight: 600 }}>{total}</strong></span>
        <span style={{ color: C.muted }}>·</span>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span>Rows per page</span>
          <select
            value={pageSize} onChange={e => setPageSize(parseInt(e.target.value, 10))}
            style={{
              padding: "3px 8px", background: "rgba(0,0,0,0.25)",
              border: `1px solid ${C.border2}`, borderRadius: 6,
              color: C.text, fontSize: 12,
            }}
          >
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
          style={pageBtnStyle(false, page === 1)}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M6.5 1.5L3 5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} style={{ color: C.muted, padding: "0 6px", fontSize: 12 }}>…</span>
          ) : (
            <button key={p} onClick={() => setPage(p)} style={pageBtnStyle(p === page, false)}>{p}</button>
          )
        )}
        <button
          onClick={() => setPage(Math.min(pageCount, page + 1))}
          disabled={page === pageCount || pageCount === 0}
          style={pageBtnStyle(false, page === pageCount || pageCount === 0)}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M3.5 1.5L7 5 3.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Bulk action bar ──────────────────────────────────────────────────────
function BulkBar({ count, onClear, onDelete, onChangeRole, onExport }: {
  count: number; onClear: () => void;
  onDelete: () => void; onChangeRole: () => void; onExport: () => void;
}) {
  if (count === 0) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      display: "flex", alignItems: "center", gap: 6,
      padding: "8px 8px 8px 16px",
      background: C.surface,
      border: `1px solid ${C.tealBdr}`,
      borderRadius: 10,
      boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
      zIndex: 90,
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: C.teal,
        background: C.tealBg, padding: "3px 8px",
        borderRadius: 4, letterSpacing: "0.04em",
      }}>{count}</span>
      <span style={{ fontSize: 13, color: C.text, marginRight: 8 }}>selected</span>

      <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)" }} />

      <BulkBtn onClick={onChangeRole}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M7 1.5l1.5 3 3.5.5-2.5 2.5.5 3.5L7 9.5 3 11l.5-3.5L1 5l3.5-.5L7 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
        Change role
      </BulkBtn>
      <BulkBtn onClick={onExport}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M7 1.5v7M4 5.5L7 8.5l3-3M2 11.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Export CSV
      </BulkBtn>
      <BulkBtn onClick={onDelete} danger>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M3 4h8M5.5 4V3a1 1 0 011-1h1a1 1 0 011 1v1M4 4l.5 7a1 1 0 001 1h3a1 1 0 001-1L10 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Delete
      </BulkBtn>

      <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)" }} />

      <button
        onClick={onClear}
        style={{
          background: "transparent", border: "none", color: C.muted,
          padding: "6px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer",
        }}
      >Clear</button>
    </div>
  );
}

function BulkBtn({ children, danger, onClick }: { children: ReactNode; danger?: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const color = danger ? C.red : C.text;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 10px", borderRadius: 6,
        border: `1px solid ${hover ? "rgba(255,255,255,0.12)" : "transparent"}`,
        background: hover ? "rgba(255,255,255,0.04)" : "transparent",
        color, fontSize: 12, fontWeight: 500,
        transition: "all 0.1s", cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ── CSV export helper ────────────────────────────────────────────────────
function downloadCsv(rows: User[], filename: string) {
  const header = ["name", "email", "role", "source", "dashboardUrl", "createdAt"];
  const lines = [header.join(",")];
  for (const u of rows) {
    lines.push(header.map(k => {
      const v = (u as unknown as Record<string, unknown>)[k];
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    }).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Main client ──────────────────────────────────────────────────────────
export default function UsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("created-desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [roleTarget, setRoleTarget] = useState<User[] | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState(""); // type-delete confirm
  const [bulkRole, setBulkRole] = useState("user");

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { setPage(1); }, [q, filter, sort, pageSize]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('input[placeholder^="Search"]');
        if (input) input.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (deleteTarget && "bulk" in deleteTarget) setBulkConfirm(""); }, [deleteTarget]);
  useEffect(() => { if (roleTarget) setBulkRole("user"); }, [roleTarget]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/user-directory");
      const data = await res.json();
      if (data.users) setUsers(data.users as User[]);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function createUser(data: { name: string; email: string; password: string; role: string; dashboardUrl: string; sendInvite: boolean }) {
    try {
      const res = await fetch("/api/user-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name, email: data.email, password: data.password,
          role: data.role, dashboardUrl: data.dashboardUrl,
        }),
      });
      const out = await res.json();
      if (out.success) {
        setAddOpen(false);
        fetchUsers();
        showToast(`Created ${data.name}${data.sendInvite ? " · welcome email queued" : ""}`);
      } else {
        showToast(out.error || "Failed to create user", false);
      }
    } catch {
      showToast("Error creating user", false);
    }
  }

  async function saveUser(updated: User & { password?: string }) {
    if (!editUser) return;
    try {
      const body: Record<string, unknown> = {
        originalEmail: editUser.email,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        dashboardUrl: updated.dashboardUrl,
      };
      if (updated.password && updated.password.trim()) body.password = updated.password;
      const res = await fetch("/api/user-directory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const out = await res.json();
      if (out.success) {
        setEditUser(null);
        fetchUsers();
        showToast(`Saved changes to ${updated.name}`);
      } else {
        showToast(out.error || "Failed to update", false);
      }
    } catch {
      showToast("Error updating user", false);
    }
  }

  async function deleteSingle(u: User) {
    try {
      const res = await fetch("/api/user-directory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: u.email }),
      });
      const out = await res.json();
      if (out.success) {
        setUsers(prev => prev.filter(x => x.email !== u.email));
        setSelected(prev => { const n = { ...prev }; delete n[keyOf(u)]; return n; });
        showToast(`Deleted ${u.name}`);
      } else {
        showToast(out.error || "Failed to delete", false);
      }
    } catch {
      showToast("Error deleting user", false);
    }
  }

  async function deleteBulk(items: User[]) {
    let ok = 0, fail = 0;
    for (const u of items) {
      try {
        const res = await fetch("/api/user-directory", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: u.email }),
        });
        const out = await res.json();
        if (out.success) ok++; else fail++;
      } catch { fail++; }
    }
    setSelected({});
    fetchUsers();
    showToast(`Deleted ${ok} user${ok === 1 ? "" : "s"}${fail ? ` · ${fail} failed` : ""}`, fail === 0);
  }

  async function bulkUpdateRole(items: User[], newRole: string) {
    let ok = 0, fail = 0;
    for (const u of items) {
      try {
        const res = await fetch("/api/user-directory", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalEmail: u.email,
            name: u.name,
            email: u.email,
            role: newRole,
            dashboardUrl: u.dashboardUrl,
          }),
        });
        const out = await res.json();
        if (out.success) ok++; else fail++;
      } catch { fail++; }
    }
    fetchUsers();
    showToast(`Updated ${ok} user${ok === 1 ? "" : "s"} → ${newRole}${fail ? ` · ${fail} failed` : ""}`, fail === 0);
  }

  // ── Derived data ───────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    all: users.length,
    admin: users.filter(u => u.role === "admin").length,
    user: users.filter(u => u.role === "user").length,
    env: users.filter(u => u.source === "env").length,
  }), [users]);

  const filtered = useMemo(() => users.filter(u => {
    if (filter === "admin" && u.role !== "admin") return false;
    if (filter === "user" && u.role !== "user") return false;
    if (filter === "env" && u.source !== "env") return false;
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      if (!u.name.toLowerCase().includes(s) && !u.email.toLowerCase().includes(s)) return false;
    }
    return true;
  }), [users, filter, q]);

  const sorted = useMemo(() => {
    const out = [...filtered];
    out.sort((a, b) => {
      switch (sort) {
        case "name-asc":     return a.name.localeCompare(b.name);
        case "name-desc":    return b.name.localeCompare(a.name);
        case "created-asc":  return tsOf(a.createdAt) - tsOf(b.createdAt);
        case "created-desc": return tsOf(b.createdAt) - tsOf(a.createdAt);
        case "active-asc":   return tsOf(a.lastActive) - tsOf(b.lastActive);
        case "active-desc":  return tsOf(b.lastActive) - tsOf(a.lastActive);
        default: return 0;
      }
    });
    return out;
  }, [filtered, sort]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const selectedUsers = users.filter(u => selected[keyOf(u)]);
  const selectedCount = selectedUsers.length;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      {/* Page header */}
      <header style={{
        padding: "22px 28px 22px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
      }}>
        <div>
          <h1 style={{
            margin: "0 0 4px",
            fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span>User Directory</span>
            <span style={{
              fontSize: 11, color: C.textDim,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${C.border}`,
              padding: "2px 8px", borderRadius: 4, fontWeight: 600,
            }}>{counts.all}</span>
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: C.textDim }}>
            Manage portal users, roles, and dashboard access.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => downloadCsv(users, `saabai-users-${new Date().toISOString().slice(0, 10)}.csv`)}
            style={{
              fontSize: 12, color: C.textDim, background: "transparent", border: "none",
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 10px", borderRadius: 6, cursor: "pointer",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5v7M4 5.5L7 8.5l3-3M2 11.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export
          </button>
          <button
            onClick={() => setAddOpen(true)}
            style={{
              fontSize: 12, color: C.textDim, background: "transparent", border: "none",
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 10px", borderRadius: 6, cursor: "pointer",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 8.5V11M7 11l-2-2M7 11l2-2M3 6h8M3 6a1.5 1.5 0 011.5-1.5h5A1.5 1.5 0 0111 6v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Invite via email
          </button>
        </div>
      </header>

      <UsersToolbar
        q={q} setQ={setQ}
        filter={filter} setFilter={setFilter}
        counts={counts}
        sort={sort} setSort={setSort}
        onAdd={() => setAddOpen(true)}
      />

      <div style={{ paddingTop: 18 }}>
        {loading ? (
          <div style={{ padding: "60px 28px", color: C.textDim, fontSize: 13 }}>Loading users…</div>
        ) : (
          <UsersTable
            users={visible}
            density="comfortable"
            showLastActive={true}
            showCreated={true}
            selected={selected}
            setSelected={setSelected}
            onEdit={u => setEditUser(u)}
            onDelete={u => setDeleteTarget(u)}
          />
        )}
      </div>

      <div style={{ marginTop: "auto" }}>
        <Pagination
          page={safePage} pageCount={pageCount} pageSize={pageSize}
          setPage={setPage} setPageSize={setPageSize}
          total={total}
        />
      </div>

      <BulkBar
        count={selectedCount}
        onClear={() => setSelected({})}
        onDelete={() => setDeleteTarget({ bulk: true, count: selectedCount, items: selectedUsers })}
        onChangeRole={() => setRoleTarget(selectedUsers)}
        onExport={() => downloadCsv(selectedUsers, `saabai-users-selected-${new Date().toISOString().slice(0, 10)}.csv`)}
      />

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 250,
          padding: "10px 16px 10px 14px",
          background: C.surface,
          border: `1px solid ${toast.ok ? C.tealBdr : C.redBdr}`,
          borderRadius: 10,
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
          color: C.text, fontSize: 13,
        }}>
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 18, height: 18, borderRadius: "50%",
            background: toast.ok ? "rgba(98,197,209,0.20)" : "rgba(248,113,113,0.20)",
            color: toast.ok ? C.teal : C.red,
          }}>
            {toast.ok ? (
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2.5 5.5L4.5 7.5 8.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M3 3l5 5M8 3L3 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            )}
          </span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Add user modal */}
      <Modal
        open={addOpen} onClose={() => setAddOpen(false)}
        title="Add user"
        subtitle="Create a new portal account and assign their dashboard."
        width={520}
      >
        <UserForm mode="add" onCancel={() => setAddOpen(false)} onSubmit={createUser} />
      </Modal>

      {/* Edit user modal */}
      <Modal
        open={!!editUser} onClose={() => setEditUser(null)}
        title={editUser ? `Edit ${editUser.name}` : ""}
        subtitle={editUser?.email}
        width={520}
      >
        {editUser && (
          <>
            <UserForm
              mode="edit"
              initial={editUser}
              onCancel={() => setEditUser(null)}
              onSubmit={(data) => saveUser({ ...editUser, ...data })}
            />
            <div style={{
              marginTop: 20, padding: "14px 16px",
              background: "rgba(248,113,113,0.04)",
              border: `1px solid ${C.redBdr}`,
              borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.red, marginBottom: 2 }}>Delete this user</div>
                <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.4 }}>
                  Their account, sessions, and portal access are removed immediately. This cannot be undone.
                </div>
              </div>
              <button
                onClick={() => { const u = editUser; setEditUser(null); setDeleteTarget(u); }}
                style={{
                  padding: "7px 14px", borderRadius: 7,
                  background: "transparent", border: `1px solid ${C.redBdr}`,
                  color: C.red, fontSize: 12, fontWeight: 600,
                  whiteSpace: "nowrap", cursor: "pointer",
                }}
              >Delete user</button>
            </div>
          </>
        )}
      </Modal>

      {/* Delete confirm (single + bulk) */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        width={460}
        danger
        title={deleteTarget && "bulk" in deleteTarget
          ? `Delete ${deleteTarget.count} users`
          : deleteTarget ? `Delete ${(deleteTarget as User).name}?` : ""}
        subtitle={deleteTarget && "bulk" in deleteTarget
          ? "This permanently removes all selected accounts, their sessions, and portal access."
          : deleteTarget ? `${(deleteTarget as User).email} — their account, sessions, and access are removed immediately. This cannot be undone.` : ""}
      >
        {deleteTarget && "bulk" in deleteTarget && (
          <>
            <div style={{
              padding: "12px 14px", background: "rgba(0,0,0,0.25)",
              border: `1px solid ${C.border}`, borderRadius: 8,
              marginBottom: 14, maxHeight: 180, overflowY: "auto",
            }}>
              {deleteTarget.items.slice(0, 8).map(u => (
                <div key={keyOf(u)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12, color: C.text }}>
                  <Avatar name={u.name} email={u.email} size={20} role={u.role} />
                  <span>{u.name}</span>
                  <span style={{ color: C.muted }}>·</span>
                  <span style={{ color: C.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</span>
                </div>
              ))}
              {deleteTarget.items.length > 8 && (
                <div style={{ fontSize: 11, color: C.muted, padding: "4px 0", textAlign: "center" }}>
                  + {deleteTarget.items.length - 8} more
                </div>
              )}
            </div>

            <Field label={<>Type <code style={{ color: C.red, fontFamily: "ui-monospace, monospace" }}>delete</code> to confirm</>}>
              <TextInput value={bulkConfirm} onChange={setBulkConfirm} placeholder="delete" />
            </Field>
          </>
        )}

        <div style={{ marginTop: 4, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <SecondaryBtn onClick={() => setDeleteTarget(null)}>Cancel</SecondaryBtn>
          <PrimaryBtn
            danger
            disabled={!!(deleteTarget && "bulk" in deleteTarget) && bulkConfirm !== "delete"}
            onClick={() => {
              if (!deleteTarget) return;
              if ("bulk" in deleteTarget) deleteBulk(deleteTarget.items);
              else deleteSingle(deleteTarget);
              setDeleteTarget(null);
            }}
          >
            {deleteTarget && "bulk" in deleteTarget
              ? `Delete ${deleteTarget.count} users`
              : "Delete user"}
          </PrimaryBtn>
        </div>
      </Modal>

      {/* Change role (bulk) */}
      <Modal
        open={!!roleTarget}
        onClose={() => setRoleTarget(null)}
        width={460}
        title={roleTarget ? `Change role for ${roleTarget.length} users` : ""}
        subtitle="Bulk-update the role assigned to every selected user."
      >
        {roleTarget && (
          <>
            <div style={{
              padding: "10px 12px", background: "rgba(0,0,0,0.25)",
              border: `1px solid ${C.border}`, borderRadius: 8,
              marginBottom: 16,
              display: "flex", alignItems: "center", gap: 14, fontSize: 12,
            }}>
              <span style={{ color: C.textDim }}>Currently:</span>
              <span style={{ color: C.teal, fontWeight: 600 }}>
                {roleTarget.filter(u => u.role === "admin").length} admin
              </span>
              <span style={{ color: C.muted }}>·</span>
              <span style={{ color: C.green, fontWeight: 600 }}>
                {roleTarget.filter(u => u.role === "user").length} user
              </span>
            </div>

            <Field label="New role for all selected">
              <RoleSegment value={bulkRole} onChange={setBulkRole} />
            </Field>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
              <SecondaryBtn onClick={() => setRoleTarget(null)}>Cancel</SecondaryBtn>
              <PrimaryBtn
                onClick={() => {
                  bulkUpdateRole(roleTarget, bulkRole);
                  setRoleTarget(null);
                }}
              >Apply to {roleTarget.length} users</PrimaryBtn>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
