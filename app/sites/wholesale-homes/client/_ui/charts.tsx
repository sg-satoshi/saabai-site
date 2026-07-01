"use client";

// Shared Recharts theming for the client portal — one consistent look for
// axes, grids, tooltips and gradient fills across every chart.

import { UI } from "./primitives";

export const CHART = {
  grid: "rgba(15,23,42,0.06)",
  axis: UI.faint,
  axisFont: 10,
  animationMs: 700,
} as const;

export const AXIS_TICK = { fontSize: 10, fill: UI.faint } as const;

/** Floating card tooltip. Pass a value formatter (defaults to AUD). */
export function ChartTooltip({
  active,
  payload,
  label,
  labelPrefix = "Year ",
  format = (n: number) => "$" + Math.round(n).toLocaleString("en-AU"),
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string | number;
  labelPrefix?: string;
  format?: (n: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-2xl border bg-white px-3.5 py-2.5"
      style={{ borderColor: UI.line, boxShadow: "0 12px 32px -12px rgba(16,24,40,0.35)" }}
    >
      {label !== undefined && (
        <p className="mb-1 text-[10px] font-medium" style={{ color: UI.muted }}>
          {labelPrefix}
          {label}
        </p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-semibold" style={{ color: p.color ?? UI.ink }}>
          {p.name ? `${p.name}: ` : ""}
          {format(p.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

/** Legend chip row for charts. */
export function LegendChips({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 text-[10px]" style={{ color: UI.muted }}>
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
