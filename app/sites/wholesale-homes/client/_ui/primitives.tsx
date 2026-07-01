"use client";

// Premium "light fintech" primitives for the Wholesale Homes client portal.
// Shared across the investor dashboard and calculators so every surface uses
// the same cards, headers, controls and animated numbers.

import { useEffect, useRef, useState, type ReactNode } from "react";

// ── Tokens ────────────────────────────────────────────────────────────────────
// Professional light-fintech palette: teal is the single brand accent, refined
// emerald/rose carry money +/- signals, amber is reserved for a real caution
// state, and everything structural sits on an ink/slate neutral ramp.
export const UI = {
  ink: "#0f1e2e",      // primary text / neutral "authoritative" numbers
  ink2: "#334155",     // slate-700 — secondary data series
  muted: "#64748b",    // slate-500 — labels
  faint: "#94a3b8",    // slate-400 — sub-text + neutral chart series
  line: "rgba(15,23,42,0.07)",
  teal: "#0891b2",     // brand accent (matches the rest of the site)
  tealDk: "#0e7490",   // deep teal — strong fills / ramp end
  tealLt: "#67c5d6",   // light teal — ramp start
  gold: "#d4a84b",     // legacy token (unused in calculators)
  green: "#059669",    // emerald-600 — positive money (distinct from brand teal)
  amber: "#b45309",    // amber-700 — caution only
  red: "#be123c",      // rose-700 — negative money
  violet: "#7c3aed",   // legacy token (unused in calculators)
  canvas: "#f6f8fb",
  card: "#ffffff",
  // Tear-sheet editorial layer
  bone: "#f3efe7",     // warm paper canvas
  boneCard: "#fbf9f4", // raised paper surface
  heroInk: "#0c1a16",  // near-black green-ink hero
  hair: "rgba(18,30,26,0.12)", // hairline rule
  faintInk: "rgba(18,30,26,0.55)",
} as const;

export const FONT_DISPLAY = "var(--font-fraunces), Georgia, serif";
export const FONT_UI = "var(--font-manrope), ui-sans-serif, system-ui, sans-serif";

export type Tone = "neutral" | "teal" | "green" | "amber" | "red" | "violet" | "gold";

const TONE_COLOR: Record<Tone, string> = {
  neutral: UI.ink,
  teal: UI.teal,
  green: UI.green,
  amber: UI.amber,
  red: UI.red,
  violet: UI.violet,
  gold: UI.gold,
};

// ── Panel ───────────────────────────────────────────────────────────────────
// Glassy white card with a soft layered shadow — the base surface everywhere.
export function Panel({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border bg-white/90 backdrop-blur-sm ${padded ? "p-5 md:p-6" : ""} ${className}`}
      style={{
        borderColor: UI.line,
        boxShadow: "0 1px 2px rgba(16,24,40,0.04), 0 18px 40px -24px rgba(16,24,40,0.35)",
      }}
    >
      {children}
    </div>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: UI.teal }}>
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1 text-base font-semibold tracking-tight md:text-lg" style={{ color: UI.ink }}>
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs md:text-[13px]" style={{ color: UI.muted }}>{subtitle}</p>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}

// ── AnimatedNumber ──────────────────────────────────────────────────────────
// Count-up tween whenever `value` changes. Honours prefers-reduced-motion.
export function AnimatedNumber({
  value,
  format,
  className,
  durationMs = 550,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
  durationMs?: number;
}) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    const to = value;
    if (reduce || from === to || !isFinite(from) || !isFinite(to)) {
      fromRef.current = to;
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = to;
    };
  }, [value, durationMs]);

  return <span className={className}>{format(display)}</span>;
}

// ── StatCard ──────────────────────────────────────────────────────────────────
// Hero KPI tile: big animated number, label, optional delta chip + sub-line.
export function StatCard({
  label,
  value,
  format = (n) => String(Math.round(n)),
  tone = "neutral",
  sub,
  chip,
  chipTone,
  icon,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  tone?: Tone;
  sub?: string;
  chip?: string;
  chipTone?: Tone;
  icon?: ReactNode;
}) {
  const color = TONE_COLOR[tone];
  const ct = chipTone ?? tone;
  return (
    <Panel padded={false} className="group p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: UI.muted }}>
          {label}
        </p>
        {icon && <span style={{ color }} className="opacity-70">{icon}</span>}
      </div>
      <div className="mt-1.5" style={{ color }}>
        <AnimatedNumber
          value={value}
          format={format}
          className="text-[26px] font-bold leading-none tracking-tight md:text-[28px]"
        />
      </div>
      {(chip || sub) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {chip && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: `${TONE_COLOR[ct]}14`, color: TONE_COLOR[ct] }}
            >
              {chip}
            </span>
          )}
          {sub && <span className="text-[11px] leading-tight" style={{ color: UI.faint }}>{sub}</span>}
        </div>
      )}
    </Panel>
  );
}

// ── Segmented control ─────────────────────────────────────────────────────────
export function Segmented({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-3 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs";
  return (
    <div className="inline-flex rounded-full p-1" style={{ background: "#eef2f6" }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-full font-semibold transition-all ${pad}`}
            style={{
              background: active ? "#fff" : "transparent",
              color: active ? UI.teal : UI.muted,
              boxShadow: active ? "0 1px 3px rgba(16,24,40,0.14)" : "none",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── InsightCard ─────────────────────────────────────────────────────────────
export function InsightCard({
  type,
  title,
  detail,
}: {
  type: "positive" | "warning" | "info";
  title: string;
  detail: string;
}) {
  const map = {
    positive: { bg: "#f0fdf4", border: "#bbf7d0", fg: "#15803d", dot: UI.green },
    warning: { bg: "#fffbeb", border: "#fde68a", fg: "#b45309", dot: UI.amber },
    info: { bg: "#f0f9ff", border: "#bae6fd", fg: UI.tealDk, dot: UI.teal },
  }[type];
  return (
    <div className="rounded-2xl border p-3.5" style={{ background: map.bg, borderColor: map.border }}>
      <div className="flex items-start gap-2.5">
        <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: map.dot }} />
        <div>
          <p className="text-[12px] font-semibold" style={{ color: map.fg }}>{title}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: UI.ink2 }}>{detail}</p>
        </div>
      </div>
    </div>
  );
}
