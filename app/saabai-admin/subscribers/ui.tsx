"use client";
/** Small shared pieces for the Subscribers page (#345): icons, badges, persisted sizes, date and CSV helpers. */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { STATUS_LABEL, type EmailStatus } from "../../../lib/subscriber-rules";

const P: Record<string, ReactNode> = {
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  dl: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  test: <path d="M4 12l16-8-6 16-2-7-8-1z" />,
  tick: <path d="M5 12.5l4.5 4.5L19 7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  left: <path d="M15 6l-6 6 6 6" />,
  right: <path d="M9 6l6 6-6 6" />,
  more: <><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 7M18 14a6 6 0 013.5 6" /></>,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  off: <><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></>,
  warn: <><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></>,
};
export function Icon({ name, size }: { name: keyof typeof P | string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={size ? { width: size, height: size } : undefined}>
      {P[name]}
    </svg>
  );
}

export function StatusBadge({ status }: { status: EmailStatus }) {
  return <span className={`s-badge ${status}`}>{STATUS_LABEL[status]}</span>;
}

const IND_DOT: Record<string, string> = { "Law / Legal": "#6366f1", "Accounting / Finance": "#1595a6", "Real Estate": "#16a34a", Other: "#9aa0b4" };
export function Industry({ value }: { value?: string }) {
  return (
    <span className="s-ind">
      <i style={{ background: value ? IND_DOT[value] ?? "#9aa0b4" : "#c6cad6" }} />
      {value ? value : <span style={{ color: "var(--muted)" }}>Not given</span>}
    </span>
  );
}

const AVC = ["#82d8e2", "#b9e4ea", "#c7d2fe", "#bbf7d0", "#e0e7ff", "#a5f3fc"];
export function Avatar({ name, email, size = 34 }: { name?: string; email: string; size?: number }) {
  const ch = ((name || "").trim()[0] || email[0] || "?").toUpperCase();
  return <div className="s-av" aria-hidden="true" style={{ width: size, height: size, background: AVC[email.charCodeAt(0) % AVC.length] }}>{ch}</div>;
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getDate()} ${MON[d.getMonth()]}`;
}
export function fmtDateTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${fmtTime(d)}`;
}
export function fmtTime(d: Date): string {
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** CSV cell, with spreadsheet formula characters neutralised. */
export function csvCell(v: unknown): string {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** A number kept in localStorage (split widths, table height). */
export function useStoredNumber(key: string, initial: number, min: number, max: number): [number, (n: number) => void] {
  const [v, setV] = useState(initial);
  useEffect(() => {
    try {
      const raw = Number(localStorage.getItem(key));
      if (raw && Number.isFinite(raw)) setV(Math.min(max, Math.max(min, raw)));
    } catch { /* storage blocked */ }
  }, [key, min, max]);
  const set = useCallback((n: number) => {
    const c = Math.min(max, Math.max(min, Math.round(n)));
    setV(c);
    try { localStorage.setItem(key, String(c)); } catch { /* storage blocked */ }
  }, [key, min, max]);
  return [v, set];
}

/** Pointer drag (mouse, pen, touch) and arrow keys on a resize handle. */
export function useDrag(onMove: (dx: number, dy: number) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown(e: React.PointerEvent<HTMLElement>) {
      start.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove(e: React.PointerEvent<HTMLElement>) {
      if (!start.current) return;
      onMove(e.clientX - start.current.x, e.clientY - start.current.y);
      start.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp() { start.current = null; },
    onPointerCancel() { start.current = null; },
  };
}

/** Escape closes, focus moves into the layer and returns when it closes. */
export function useLayer(open: boolean, onClose: () => void, initialFocus?: React.RefObject<HTMLElement | null>) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => initialFocus?.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [open, initialFocus]);
}

/** True below the admin mobile breakpoint (600px), matching .dt and .mo in admin.css. */
export function useIsMobile(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 600px)");
    const on = () => setM(q.matches);
    on();
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  return m;
}
