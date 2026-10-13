import type { ReactNode } from "react";

const MAP: Record<string, string> = {
  ok: "b-ok",
  success: "b-ok",
  paid: "b-ok",
  delivered: "b-ok",
  active: "b-ok",
  warn: "b-warn",
  warning: "b-warn",
  deposit: "b-warn",
  bad: "b-bad",
  danger: "b-bad",
  failed: "b-bad",
  info: "b-info",
  progress: "b-info",
  neutral: "b-n",
  n: "b-n",
};

export function Badge({ tone = "neutral", children }: { tone?: string; children: ReactNode }) {
  const cls = MAP[tone.toLowerCase()] || "b-n";
  return <span className={`badge ${cls}`}>{children}</span>;
}

export function ProductTag({ kind, children }: { kind: "bp" | "ws" | "cr"; children: ReactNode }) {
  return <span className={`tag ${kind}`}>{children}</span>;
}
