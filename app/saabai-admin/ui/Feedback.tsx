"use client";

/**
 * Admin feedback: toasts and confirm dialogs that replace browser alert()/confirm().
 * Call notify.error/success/info or `await confirmDialog(...)` from anywhere in the
 * admin; <FeedbackHost /> (mounted once by AdminShell) renders them.
 */
import { useEffect, useRef, useState } from "react";

type Tone = "error" | "success" | "info";
type Toast = { id: number; tone: Tone; message: string };
type Confirm = { id: number; message: string; confirmLabel: string; danger: boolean; resolve: (ok: boolean) => void };
type State = { toasts: Toast[]; confirm: Confirm | null };

let state: State = { toasts: [], confirm: null };
let seq = 0;
const listeners = new Set<(s: State) => void>();
const emit = () => listeners.forEach((l) => l(state));

function push(tone: Tone, message: unknown) {
  const text = message instanceof Error ? message.message : String(message ?? "");
  const id = ++seq;
  state = { ...state, toasts: [...state.toasts, { id, tone, message: text || "Something went wrong" }].slice(-4) };
  emit();
  setTimeout(() => {
    state = { ...state, toasts: state.toasts.filter((t) => t.id !== id) };
    emit();
  }, tone === "error" ? 8000 : 4000);
}

export const notify = {
  error: (m: unknown) => push("error", m),
  success: (m: unknown) => push("success", m),
  info: (m: unknown) => push("info", m),
};

/** Promise-based replacement for window.confirm(). Falls back to window.confirm if no host is mounted. */
export function confirmDialog(message: string, opts: { confirmLabel?: string; danger?: boolean } = {}): Promise<boolean> {
  if (listeners.size === 0 && typeof window !== "undefined") return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => {
    state.confirm?.resolve(false);
    state = { ...state, confirm: { id: ++seq, message, confirmLabel: opts.confirmLabel ?? "Confirm", danger: opts.danger ?? /delete|remove|archive|deny|deactivate/i.test(message), resolve } };
    emit();
  });
}

function closeConfirm(ok: boolean) {
  const c = state.confirm;
  state = { ...state, confirm: null };
  emit();
  c?.resolve(ok);
}

const toneStyle: Record<Tone, { bg: string; fg: string; bd: string }> = {
  error: { bg: "#fdecec", fg: "#9b1c1c", bd: "#f5c2c2" },
  success: { bg: "#e9f7ef", fg: "#14653a", bd: "#bfe5cd" },
  info: { bg: "#fff", fg: "var(--n-900)", bd: "var(--n-200)" },
};

export function FeedbackHost() {
  const [s, setS] = useState<State>(state);
  const okRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    listeners.add(setS);
    return () => { listeners.delete(setS); };
  }, []);
  useEffect(() => {
    if (!s.confirm) return;
    // Destructive confirms start on Cancel, so Enter never deletes by accident (#345).
    (s.confirm.danger ? cancelRef : okRef).current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeConfirm(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.confirm]);

  return (
    <>
      <div aria-live="polite" style={{ position: "fixed", zIndex: 120, left: 12, right: 12, bottom: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "none" }}>
        {s.toasts.map((t) => (
          <div key={t.id} role={t.tone === "error" ? "alert" : "status"} style={{ pointerEvents: "auto", maxWidth: 480, width: "100%", padding: "11px 14px", borderRadius: "var(--r-md, 10px)", border: `1px solid ${toneStyle[t.tone].bd}`, background: toneStyle[t.tone].bg, color: toneStyle[t.tone].fg, fontSize: 13.5, fontWeight: 500, boxShadow: "var(--sh-3, 0 8px 24px rgba(0,0,0,.12))", whiteSpace: "pre-wrap" }}>
            {t.message}
          </div>
        ))}
      </div>
      {s.confirm && (
        <div role="dialog" aria-modal="true" aria-label="Confirm" onClick={() => closeConfirm(false)} style={{ position: "fixed", inset: 0, zIndex: 130, background: "rgba(7,6,31,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "min(100%, 420px)", padding: 20, background: "#fff" }}>
            <p style={{ margin: "0 0 18px", fontSize: 14.5, lineHeight: 1.5, color: "var(--n-900)", whiteSpace: "pre-wrap" }}>{s.confirm.message}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" ref={cancelRef} className="btn" onClick={() => closeConfirm(false)}>Cancel</button>
              <button type="button" ref={okRef} className={`btn ${s.confirm.danger ? "ds" : "pri"}`} onClick={() => closeConfirm(true)}>{s.confirm.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
