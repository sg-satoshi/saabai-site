"use client";

import { useState, useEffect } from "react";
import { ClientPortalShell } from "../../../_components/ClientPortalShell";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ComposedChart, Line,
} from "recharts";
import { fmtAUD as fmt$, fmtCompact as fmt1k, safeDiv } from "../_shared";
import { UI, FONT_DISPLAY, AnimatedNumber } from "../../_ui/primitives";
import { CHART, AXIS_TICK } from "../../_ui/charts";
import { PageWrap, Masthead, Hero, FiguresStrip, Card, Eyebrow, Title, LedgerRow, FieldGrid } from "../../_ui/tearsheet";
import { loadJSON, saveJSON } from "../../../_lib/portal";

const STORAGE_KEY = "wh_calc_borrowing_power";

export default function BorrowingPowerEstimator() {
  const [saved] = useState<Record<string, any>>(() => loadJSON(STORAGE_KEY, {}));
  const [income, setIncome] = useState(saved.income ?? 150000);
  const [pi, setPi] = useState(saved.pi ?? 0);
  const [deposit, setDeposit] = useState(saved.deposit ?? 150000);
  const [other, setOther] = useState(saved.other ?? 300);
  const [cc, setCc] = useState(saved.cc ?? 0);
  const [ir, setIr] = useState(saved.ir ?? 6.3);
  const [lt, setLt] = useState(saved.lt ?? 30);
  const [ltType, setLtType] = useState<"pAndI" | "interestOnly">(saved.ltType ?? "pAndI");
  const [ioPeriod, setIoPeriod] = useState(saved.ioPeriod ?? 5);
  const [rateType, setRateType] = useState<"variable" | "fixed">(saved.rateType ?? "variable");
  const [le, setLe] = useState(saved.le ?? 2500);
  const [expanded, setExpanded] = useState(saved.expanded ?? false);

  useEffect(() => {
    saveJSON(STORAGE_KEY, { income, pi, deposit, other, cc, ir, lt, ltType, ioPeriod, rateType, le, expanded });
  }, [income, pi, deposit, other, cc, ir, lt, ltType, ioPeriod, rateType, le, expanded]);

  const ti = income + pi;
  const mi = ti / 12;
  const rm = ir / 100 / 12;
  const tpm = lt * 12;
  const stress = ir + 3;
  const srm = stress / 100 / 12;
  const avail = Math.max(0, mi - le - other - cc * 0.036);
  const maxB = safeDiv(avail * (1 - Math.pow(1 + srm, -tpm)), srm);
  const pp = maxB + deposit;
  const lvr = pp > 0 ? (maxB / pp) * 100 : 0;
  // P&I repayment
  const pmiRepay = safeDiv(maxB * rm * Math.pow(1 + rm, tpm), Math.pow(1 + rm, tpm) - 1);
  // IO repayment
  const ioRepay = maxB > 0 && rm > 0 ? maxB * rm : 0;
  const remainingTerm = Math.max(1, lt - (ltType === "interestOnly" ? ioPeriod : 0));
  const rt = remainingTerm * 12;
  const postIO = ltType === "interestOnly" && maxB > 0 && rm > 0
    ? safeDiv(maxB * rm * Math.pow(1 + rm, rt), Math.pow(1 + rm, rt) - 1)
    : pmiRepay;
  const effectiveRepay = ltType === "interestOnly" ? ioRepay : pmiRepay;
  const stressedRepay = safeDiv(maxB * srm * Math.pow(1 + srm, tpm), Math.pow(1 + srm, tpm) - 1);
  const lvrColor = lvr > 80 ? UI.red : lvr > 70 ? UI.amber : UI.ink;

  // Affordability data
  const affordData = [
    { name: "Income", value: mi, fill: UI.green },
    { name: "Living", value: -le, fill: UI.faint },
    { name: "Other debt", value: -other, fill: UI.faint },
    { name: "Cards", value: -(cc * 0.036), fill: UI.faint },
    { name: "For loan", value: avail, fill: UI.teal },
  ];

  // Rate sensitivity
  const rateData = [0, 0.5, 1, 1.5, 2, 3].map(delta => {
    const r = (ir + delta) / 100 / 12;
    const pow = Math.pow(1 + r, tpm);
    const repay = safeDiv(maxB * r * pow, pow - 1);
    return { name: "+" + delta + "%", repay: Math.round(repay), delta: Math.round(repay - pmiRepay) };
  });

  return (
    <ClientPortalShell>
      <PageWrap>
        <Masthead label="Wholesale Homes — Borrowing Power" />

        <Hero
          eyebrow="Lending capacity"
          headline={<>You could borrow up to{" "}<span style={{ color: "#5fd4ab" }}><AnimatedNumber value={maxB} format={(n) => fmt$(Math.round(n))} /></span>.</>}
          sub={<>On {fmt$(ti)}/yr income, stress-tested at {stress.toFixed(1)}% (APRA +3% buffer) — enough for a ~{fmt$(Math.round(pp))} purchase with your {fmt$(deposit)} deposit.</>}
          stats={[
            { label: "Est. property", value: <AnimatedNumber value={pp} format={(n) => fmt$(Math.round(n))} /> },
            { label: `${ltType === "interestOnly" ? "IO" : "Monthly"} repay`, value: <AnimatedNumber value={effectiveRepay} format={(n) => fmt$(Math.round(n))} /> },
          ]}
        />

        <FiguresStrip items={[
          { label: "Max borrow", value: fmt$(Math.round(maxB)), sub: `at ${stress.toFixed(1)}% stress` },
          { label: "Est. property", value: fmt$(Math.round(pp)), sub: `+ ${fmt$(deposit)} deposit` },
          { label: "Loan-to-value", value: lvr.toFixed(1) + "%", sub: lvr <= 80 ? "no LMI" : "LMI may apply", color: lvrColor },
          { label: "Monthly repay", value: fmt$(Math.round(effectiveRepay)), sub: `${ir.toFixed(1)}% ${rateType}` },
          { label: "Monthly surplus", value: fmt$(Math.round(avail)), sub: "after expenses", color: avail >= 0 ? UI.green : UI.red },
        ]} />

        <div className="wh-rise" style={{ animationDelay: "180ms", display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginBottom: 22 }}>
          {/* Assumptions */}
          <Card>
            <Eyebrow>Assumptions</Eyebrow>
            <Title>Your position</Title>
            <p style={{ fontSize: 12.5, color: UI.faintInk, margin: "4px 0 16px" }}>Income, deposit and rate — everything updates live.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <FieldGrid items={[
                { label: "Your Income", val: income, set: setIncome, suffix: "$/yr" },
                { label: "Partner Income", val: pi, set: setPi, suffix: "$/yr" },
                { label: "Deposit", val: deposit, set: setDeposit, suffix: "$" },
              ]} />
              <FieldGrid items={[
                { label: "Rate Type", val: rateType, set: (v: string) => setRateType(v as "variable" | "fixed"), isSelect: true, opts: [{ label: "Variable", value: "variable" }, { label: "Fixed", value: "fixed" }] },
                { label: "Interest Rate", val: ir, set: setIr, step: 0.1, suffix: "%" },
                { label: "Loan Term", val: lt, set: (v: string) => setLt(Number(v)), isSelect: true, opts: [{ label: "20 years", value: "20" }, { label: "25 years", value: "25" }, { label: "30 years", value: "30" }] },
              ]} />
              <button onClick={() => setExpanded(!expanded)} style={{ alignSelf: "flex-start", fontSize: 12, fontWeight: 500, color: UI.teal, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                {expanded ? "− Hide" : "+ Show"} expenses & liabilities
              </button>
              {expanded && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4 }}>
                  <FieldGrid items={[
                    { label: "Living Expenses", val: le, set: setLe, suffix: "$/mo" },
                    { label: "Other Loans", val: other, set: setOther, suffix: "$/mo" },
                    { label: "Credit Cards", val: cc, set: setCc, suffix: "$ lim" },
                  ]} />
                  <FieldGrid items={[
                    { label: "Loan Type", val: ltType, set: (v: string) => setLtType(v as "pAndI" | "interestOnly"), isSelect: true, opts: [{ label: "Principle & Interest (P&I)", value: "pAndI" }, { label: "Interest Only", value: "interestOnly" }] },
                    { label: "IO Period", val: ioPeriod, set: setIoPeriod, suffix: "yr", disabled: ltType !== "interestOnly" },
                  ]} />
                </div>
              )}
            </div>
          </Card>

          {/* Affordability */}
          <Card style={{ display: "flex", flexDirection: "column" }}>
            <Eyebrow>Serviceability</Eyebrow>
            <Title>Monthly affordability</Title>
            <p style={{ fontSize: 12, color: UI.faintInk, margin: "3px 0 10px" }}>What's left for a loan after commitments</p>
            <ResponsiveContainer width="100%" height={272}>
              <BarChart data={affordData} margin={{ top: 5, right: 10, left: -6, bottom: 0 }} barSize={44}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="name" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} tickFormatter={v => "$" + fmt1k(v)} />
                <Tooltip cursor={{ fill: "rgba(15,23,42,0.03)" }} content={({ active, payload }: any) =>
                  active && payload && payload.length ? (
                    <div className="rounded-2xl border bg-white px-3.5 py-2.5" style={{ borderColor: UI.line, boxShadow: "0 12px 32px -12px rgba(16,24,40,0.35)" }}>
                      <p style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 500, color: payload[0]?.payload?.fill }}>{payload[0]?.payload?.name}: {fmt$(Math.abs(Math.round(payload[0]?.value || 0)))}</p>
                    </div>
                  ) : null
                } />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={CHART.animationMs}>
                  {affordData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="wh-rise" style={{ animationDelay: "240ms", display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginBottom: 22 }}>
          {/* Rate sensitivity */}
          <Card style={{ display: "flex", flexDirection: "column" }}>
            <Eyebrow>Stress</Eyebrow>
            <Title>Rate sensitivity</Title>
            <p style={{ fontSize: 12, color: UI.faintInk, margin: "3px 0 10px" }}>How rate rises lift your monthly payment</p>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={rateData} margin={{ top: 5, right: 10, left: -6, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="name" tick={AXIS_TICK} />
                <YAxis yAxisId="left" tick={AXIS_TICK} tickFormatter={v => "$" + fmt1k(v)} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} tickFormatter={v => "+$" + fmt1k(v)} />
                <Tooltip cursor={{ fill: "rgba(15,23,42,0.03)" }} content={({ active, payload }: any) =>
                  active && payload && payload.length ? (
                    <div className="rounded-2xl border bg-white px-3.5 py-2.5" style={{ borderColor: UI.line, boxShadow: "0 12px 32px -12px rgba(16,24,40,0.35)" }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: UI.ink }}>{payload[0]?.payload?.name}</p>
                      <p style={{ fontSize: 12, color: UI.teal }}>Repayment: {fmt$(Math.round(payload[0]?.payload?.repay))}</p>
                      <p style={{ fontSize: 12, color: UI.red }}>Extra: {fmt$(Math.round(payload[0]?.payload?.delta))}/mo</p>
                    </div>
                  ) : null
                } />
                <Bar yAxisId="left" dataKey="repay" radius={[4, 4, 0, 0]} barSize={38} fill={UI.teal} animationDuration={CHART.animationMs} />
                <Line yAxisId="right" dataKey="delta" stroke={UI.red} strokeWidth={2} dot={{ r: 3, fill: UI.red }} animationDuration={CHART.animationMs} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          {/* LVR ledger */}
          <Card>
            <Eyebrow>Position</Eyebrow>
            <Title>Loan-to-value</Title>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 34, fontWeight: 500, color: lvrColor, fontVariantNumeric: "tabular-nums" }}>{lvr.toFixed(1)}%</span>
              <span style={{ fontSize: 12, color: UI.faintInk }}>{lvr > 80 ? "LMI likely applies" : lvr > 70 ? "borderline — watch LMI" : "comfortably under 80%"}</span>
            </div>
            <div style={{ position: "relative", height: 10, marginTop: 12, borderRadius: 999, overflow: "hidden", background: "rgba(18,30,26,0.06)" }}>
              <div style={{ width: "70%", position: "absolute", inset: 0, background: UI.green, opacity: 0.12 }} />
              <div style={{ width: "10%", left: "70%", position: "absolute", inset: 0, background: UI.amber, opacity: 0.14 }} />
              <div style={{ width: "20%", left: "80%", position: "absolute", inset: 0, background: UI.red, opacity: 0.14 }} />
              <div style={{ position: "absolute", top: 0, bottom: 0, borderRadius: 999, transition: "width .3s", width: `${Math.min(lvr, 100)}%`, background: lvr > 80 ? UI.red : lvr > 70 ? UI.amber : UI.teal }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 10, color: UI.faint }}>
              <span>0%</span><span>70% no LMI</span><span>80% LMI</span><span>100%</span>
            </div>
            <div style={{ marginTop: 14 }}>
              <LedgerRow label="Loan amount" value={fmt$(Math.round(maxB))} valueColor={UI.teal} />
              <LedgerRow label="Deposit" value={fmt$(deposit)} />
              <LedgerRow label="Stressed repayment" sub={`at ${stress.toFixed(1)}% — the lender's test`} value={fmt$(Math.round(stressedRepay))} valueColor={UI.faintInk} />
              <LedgerRow strong last label="Est. property price" value={fmt$(Math.round(pp))} />
            </div>
            <p style={{ fontSize: 10.5, color: UI.faint, marginTop: 12 }}>Estimate only. Speak with a mortgage broker or Nick for pre-approval figures.</p>
          </Card>
        </div>
      </PageWrap>
    </ClientPortalShell>
  );
}
