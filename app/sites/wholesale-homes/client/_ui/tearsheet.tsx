"use client";

// Shared "tear sheet" building blocks for the client calculators — the editorial
// private-wealth aesthetic: warm paper cards, hairline rules, a dark serif hero,
// and Fraunces numerals. Every calculator composes these so the whole suite
// reads as one document family.

import { type ReactNode, type CSSProperties } from "react";
import Link from "next/link";
import { UI, FONT_DISPLAY, FONT_UI } from "./primitives";

export const RISE_CSS = `@keyframes whRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}.wh-rise{animation:whRise .6s cubic-bezier(.2,.7,.2,1) both}@media (prefers-reduced-motion:reduce){.wh-rise{animation:none}}`;

export function PageWrap({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{RISE_CSS}</style>
      <div style={{ maxWidth: 1160, margin: "0 auto", fontFamily: FONT_UI, color: UI.ink }}>{children}</div>
    </>
  );
}

export function Masthead({ label }: { label: string }) {
  return (
    <div className="wh-rise" style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 12, paddingBottom: 14, borderBottom: `1px solid ${UI.hair}` }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: UI.teal }}>{label}</span>
      <a href="/client/calculators" style={{ fontSize: 12, fontWeight: 500, color: UI.faintInk, textDecoration: "none" }}>← All calculators</a>
    </div>
  );
}

const CALCULATORS_NAV = [
  { slug: "investment-analyzer", label: "Investment Analyzer" },
  { slug: "dual-income-yield", label: "Dual Income Yield" },
  { slug: "stamp-duty", label: "Stamp Duty" },
  { slug: "borrowing-power", label: "Borrowing Power" },
];

/** Pill switcher so a client can jump between calculators without going back to the hub. */
export function CalculatorNav({ current }: { current: string }) {
  return (
    <div className="wh-rise" style={{ animationDelay: "20ms", display: "flex", flexWrap: "wrap", gap: 8, margin: "16px 0 4px" }}>
      {CALCULATORS_NAV.map((c) => {
        const active = c.slug === current;
        return (
          <Link
            key={c.slug}
            href={`/client/calculators/${c.slug}`}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 600,
              textDecoration: "none",
              whiteSpace: "nowrap",
              background: active ? UI.heroInk : "#fff",
              color: active ? "#e8efe9" : UI.faintInk,
              border: `1px solid ${active ? UI.heroInk : UI.hair}`,
              transition: "all .15s",
            }}
          >
            {c.label}
          </Link>
        );
      })}
    </div>
  );
}

export function Hero({
  eyebrow,
  headline,
  sub,
  stats,
  delay = 60,
}: {
  eyebrow: string;
  headline: ReactNode;
  sub?: ReactNode;
  stats?: { label: string; value: ReactNode }[];
  delay?: number;
}) {
  return (
    <div className="wh-rise" style={{ animationDelay: `${delay}ms`, position: "relative", overflow: "hidden", borderRadius: 28, background: UI.heroInk, color: "#e8efe9", padding: "clamp(28px,4vw,44px)", margin: "18px 0 22px" }}>
      <div aria-hidden style={{ position: "absolute", top: -140, right: -70, width: 460, height: 460, background: "radial-gradient(circle, rgba(8,145,178,0.38), rgba(8,145,178,0) 66%)", pointerEvents: "none" }} />
      <div aria-hidden style={{ position: "absolute", bottom: -170, left: -80, width: 400, height: 400, background: "radial-gradient(circle, rgba(20,160,120,0.16), rgba(0,0,0,0) 70%)", pointerEvents: "none" }} />
      <div aria-hidden style={{ position: "absolute", inset: 0, opacity: 0.045, pointerEvents: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 32, justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ maxWidth: 600, minWidth: 260 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(103,197,214,0.85)" }}>{eyebrow}</span>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: "clamp(28px,4.4vw,50px)", lineHeight: 1.05, letterSpacing: "-0.02em", margin: "12px 0 0" }}>{headline}</h1>
          {sub && <p style={{ marginTop: 14, fontSize: 14, lineHeight: 1.6, color: "rgba(232,239,233,0.68)", maxWidth: 540 }}>{sub}</p>}
        </div>
        {stats && stats.length > 0 && (
          <div style={{ display: "flex", gap: 30 }}>
            {stats.map((s, i) => (
              <div key={s.label} style={{ borderLeft: i ? "1px solid rgba(232,239,233,0.16)" : "none", paddingLeft: i ? 30 : 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(232,239,233,0.5)", marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: "clamp(24px,3.4vw,38px)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function FiguresStrip({
  items,
  delay = 120,
}: {
  items: { label: string; value: string; sub?: string; color?: string }[];
  delay?: number;
}) {
  return (
    <Card className="wh-rise" style={{ animationDelay: `${delay}ms`, padding: 0, marginBottom: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {items.map((f, i) => (
          <div key={f.label} style={{ padding: "18px 22px", borderLeft: i ? `1px solid ${UI.hair}` : "none" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: UI.muted }}>{f.label}</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 27, lineHeight: 1.1, marginTop: 6, color: f.color ?? UI.ink, fontVariantNumeric: "tabular-nums" }}>{f.value}</div>
            {f.sub && <div style={{ fontSize: 11.5, color: UI.faint, marginTop: 2 }}>{f.sub}</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function Card({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div className={className} style={{ background: UI.boneCard, border: `1px solid ${UI.hair}`, borderRadius: 20, padding: "22px 24px", boxShadow: "0 1px 2px rgba(16,24,40,0.03), 0 16px 40px -28px rgba(16,24,40,0.4)", ...style }}>
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p style={{ fontFamily: FONT_UI, fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: UI.teal, margin: 0 }}>{children}</p>;
}

export function Title({ children }: { children: ReactNode }) {
  return <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 500, color: UI.ink, letterSpacing: "-0.01em", margin: "5px 0 0" }}>{children}</h3>;
}

export function LedgerRow({ label, sub, value, valueColor, strong, last }: { label: string; sub?: string; value: string; valueColor?: string; strong?: boolean; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, padding: "13px 0", borderBottom: last ? "none" : `1px solid ${UI.hair}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT_UI, fontSize: 13.5, fontWeight: strong ? 600 : 500, color: UI.ink }}>{label}</div>
        {sub && <div style={{ fontFamily: FONT_UI, fontSize: 11.5, color: UI.faintInk, marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: strong ? 26 : 21, fontWeight: 500, color: valueColor ?? UI.ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

// Shared input control used across calculators (paper-friendly, serif figures).
export type FieldDef = { label: string; val: number | string; set: (v: any) => void; step?: number; isSelect?: boolean; opts?: { label: string; value: string }[]; disabled?: boolean; suffix?: string };

export function FieldGrid({ items }: { items: FieldDef[] }) {
  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((i, idx) => (
        <div key={idx} className="min-w-0">
          <label className="mb-1 block truncate" style={{ fontFamily: FONT_UI, fontSize: 11, fontWeight: 500, color: UI.muted }}>{i.label}</label>
          <div className="relative">
            {i.isSelect ? (
              <select value={i.val} onChange={e => i.set(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-lg bg-white px-3 py-2 text-[12px] outline-none focus:border-[#0891b2]"
                style={{ border: `1px solid ${UI.hair}`, color: UI.ink, fontFamily: FONT_UI }}
                disabled={i.disabled}>
                {(i.opts || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input type="number" value={i.val} onChange={e => i.set(Number(e.target.value) || 0)}
                step={i.step ?? 1} disabled={i.disabled}
                className="w-full rounded-lg bg-white px-3 py-2 text-right text-[13px] outline-none focus:border-[#0891b2] disabled:cursor-not-allowed disabled:opacity-50"
                style={{ border: `1px solid ${UI.hair}`, color: UI.ink, fontFamily: FONT_DISPLAY, fontVariantNumeric: "tabular-nums" }} />
            )}
            {i.suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: UI.faint }}>{i.suffix}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
