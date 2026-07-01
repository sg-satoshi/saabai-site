"use client";

import { useState, useMemo, useCallback } from "react";
import { ClientPortalShell } from "../../../_components/ClientPortalShell";
import { Zap } from "lucide-react";
import {
  AreaChart as ReAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import {
  calcStampDuty, STATE_NAMES, type State,
  fmtNum as fmt, fmtAUD as fmt$, fmtCompact as fmtK,
} from "../_shared";
import { Panel, SectionHeader, StatCard, Segmented, InsightCard, UI } from "../../_ui/primitives";
import { ChartTooltip, CHART, AXIS_TICK, LegendChips } from "../../_ui/charts";

type PaymentFreq = "weekly" | "fortnightly" | "monthly";

export default function InvestmentAnalyzer() {
  // ── State ──
  const [pp, setPp] = useState(729000);
  const [st, setSt] = useState<State>("NSW");
  const [gf, setGf] = useState(true);
  const [sdO, setSdO] = useState<number | null>(null);
  const [la, setLa] = useState(583200);
  const [lvrInput, setLvrInput] = useState(80); // LVR in %, synced with loan amount
  const [isLvrDriven, setIsLvrDriven] = useState(true); // true = LVR slider drives loan, false = loan input drives LVR
  const [ir, setIr] = useState(6.3);
  const [lt, setLt] = useState(30);
  const [ltType, setLtType] = useState<"pAndI" | "interestOnly">("pAndI");
  const [ioPeriod, setIoPeriod] = useState(5);
  const [pf, setPf] = useState<PaymentFreq>("monthly");
  const [mr, setMr] = useState(520);
  const [gr, setGr] = useState(320);
  const [cr, setCr] = useState(2500);
  const [ins, setIns] = useState(1800);
  const [mgmt, setMgmt] = useState(7);
  const [maint, setMaint] = useState(1500);
  const [sf, setSf] = useState(0);
  const [wc, setWc] = useState(800);
  const [vr, setVr] = useState(3);
  const [cgr, setCgr] = useState(4);
  const [bc, setBc] = useState<number | null>(null);
  const [scp, setScp] = useState(2.5);
  const [ci, setCi] = useState(150000);
  const [tab, setTab] = useState("equity");

  // ── Derived ──
  const sd = useMemo(() => sdO ?? calcStampDuty(pp, st), [pp, st, sdO]);
  const tbc = bc ?? Math.round(pp * 0.03 + sd);
  const lvr = pp > 0 ? (la / pp) * 100 : 0;
  const dep = pp - la;
  const twr = mr + (gf ? gr : 0);
  const yrRent = twr * 52;
  const effRent = yrRent * (1 - vr / 100);
  const mgmtCost = effRent * (mgmt / 100);
  const tae = cr + ins + mgmtCost + maint + sf + wc;
  const rm = ir / 100 / 12;
  const tpm = lt * 12;
  // P&I repayment
  const mrRepay = la > 0 && rm > 0 ? (la * rm * Math.pow(1 + rm, tpm)) / (Math.pow(1 + rm, tpm) - 1) : 0;
  // IO repayment — interest only
  const ioRepayMonthly = la > 0 && rm > 0 ? la * rm : 0;
  // Active repayment depends on loan type
  const effectiveRepay = ltType === "interestOnly" ? ioRepayMonthly : mrRepay;
  const fp = pf === "monthly" ? effectiveRepay : pf === "fortnightly" ? effectiveRepay * 12 / 26 : effectiveRepay * 12 / 52;
  const tyLR = effectiveRepay * 12;
  // Remaining term after IO period (for post-IO P&I phase)
  const remainingTerm = Math.max(1, lt - (ltType === "interestOnly" ? ioPeriod : 0));
  const remainingMonths = remainingTerm * 12;
  const postIORepay = ltType === "interestOnly" && la > 0 && rm > 0
    ? (la * rm * Math.pow(1 + rm, remainingMonths)) / (Math.pow(1 + rm, remainingMonths) - 1)
    : mrRepay;
  // Total interest over life
  const tioL = ltType === "interestOnly" && la > 0
    ? ioRepayMonthly * ioPeriod * 12 + postIORepay * remainingMonths - la
    : (la > 0 ? mrRepay * tpm - la : 0);
  const nri = effRent - tae;
  const ycfBT = nri - tyLR;
  const wcfBT = ycfBT / 52;
  const initInv = dep + tbc;
  const gy = pp > 0 ? (yrRent / pp) * 100 : 0;
  const nyBL = pp > 0 ? (nri / pp) * 100 : 0;
  const nyOI = initInv > 0 ? (nri / initInv) * 100 : 0;

  // ── Break-even calculations ──
  // Rent required (annual) to cover all costs = (Total Expenses + Total Loan) / (1 - vacancy)
  const breakEvenRentAnnual = (tae + tyLR) / (1 - vr / 100);
  const breakEvenRentWeekly = breakEvenRentAnnual / 52;
  const currentRentWeekly = mr + (gf ? gr : 0);
  const rentGapWeekly = breakEvenRentWeekly - currentRentWeekly; // positive = need more rent
  // Time to break even with rent growth (3%/yr) vs expense growth (2.5%/yr)
  const breakEvenYear = (() => {
    const rentGrowth = 1.03;
    const expGrowth = 1.025;
    for (let y = 0; y <= 30; y++) {
      const projectedRent = currentRentWeekly * 52 * Math.pow(rentGrowth, y) * (1 - vr / 100);
      const projectedExpenses = tae * Math.pow(expGrowth, y);
      const yrRepay = ltType === "interestOnly" && y < ioPeriod ? ioRepayMonthly * 12 : 
                       ltType === "interestOnly" ? postIORepay * 12 : mrRepay * 12;
      if (projectedRent - projectedExpenses - yrRepay >= 0) return y;
    }
    return null;
  })();

  // ── Projections ──
  function projectYear(y: number) {
    const gm = Math.pow(1 + cgr / 100, y);
    const pv = pp * gm;
    // During IO period: no principal paid. After: amortize la over remaining term.
    let loanBalAfter = la;
    if (ltType === "interestOnly" && y > ioPeriod) {
      const postYrs = y - ioPeriod;
      const rateM = rm;
      const n = remainingMonths;
      const balAfterIO = la;
      const repay = postIORepay;
      for (let m = 0; m < postYrs * 12; m++) {
        const intPart = balAfterIO * rateM;
        const prinPart = repay - intPart;
        if (balAfterIO - prinPart < 0) break;
        if (m === postYrs * 12 - 1) loanBalAfter = Math.max(0, balAfterIO - prinPart);
      }
    } else if (ltType === "pAndI") {
      loanBalAfter = la * (1 + rm) ** (y * 12) - mrRepay * ((1 + rm) ** (y * 12) - 1) / rm;
      loanBalAfter = Math.max(0, Math.round(loanBalAfter));
    }
    const eq = pv - loanBalAfter;
    const totalCF = y > 0 ? Array.from({ length: y }, (_, i) => {
      const rg = 1.03 ** i; const eg = 1.025 ** i;
      const yrRepay = i < ioPeriod && ltType === "interestOnly" ? ioRepayMonthly * 12 : postIORepay * 12;
      return (yrRent * (1 - vr / 100) * rg - tae * eg) - yrRepay;
    }).reduce((a, b) => a + b, 0) : 0;
    const neq = eq + Math.max(0, totalCF);
    const tr = neq - initInv;
    const roi = initInv > 0 ? (tr / initInv) * 100 : 0;
    const aroi = y > 0 ? (Math.pow(1 + roi / 100, 1 / y) - 1) * 100 : 0;
    const sc = pv * (scp / 100);
    return { y, pv: Math.round(pv), eq: Math.round(eq), cf: Math.round(totalCF), neq: Math.round(neq), tr: Math.round(tr), roi: Math.round(roi * 10) / 10, aroi: Math.round(aroi * 10) / 10, sc: Math.round(sc) };
  }

  const yr1 = useMemo(() => projectYear(1), [pp, la, cgr, scp, yrRent, vr, tae, mrRepay, initInv, ltType, ioPeriod, rm, remainingMonths, postIORepay]);
  const yr5 = useMemo(() => projectYear(5), [pp, la, cgr, scp, yrRent, vr, tae, mrRepay, initInv, ltType, ioPeriod, rm, remainingMonths, postIORepay]);
  const yr10 = useMemo(() => projectYear(10), [pp, la, cgr, scp, yrRent, vr, tae, mrRepay, initInv, ltType, ioPeriod, rm, remainingMonths, postIORepay]);

  // ── Chart data ──
  const equityData = useMemo(() =>
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30].map(y => {
      const p = projectYear(y);
      return { year: y, propertyValue: p.pv, loanBalance: la, equity: p.eq, cashflow: p.cf };
    }), [pp, la, cgr, scp, yrRent, vr, tae, mrRepay, initInv, ltType, ioPeriod, rm, remainingMonths, postIORepay]);

  const amortData = useMemo(() =>
    Array.from({ length: Math.min(lt, 30) }, (_, i) => {
      const y = i + 1;
      const isIO = ltType === "interestOnly" && y <= ioPeriod;
      const repay = isIO ? ioRepayMonthly * 12 : postIORepay * 12;
      let remaining;
      if (isIO) {
        remaining = la; // no principal paid during IO
      } else if (ltType === "interestOnly") {
        // Post-IO: amortize from la over remaining term
        const postYr = y - ioPeriod;
        remaining = la * (1 + rm) ** (postYr * 12) - postIORepay * ((1 + rm) ** (postYr * 12) - 1) / rm;
        remaining = Math.max(0, Math.round(remaining));
      } else {
        remaining = la * (1 + rm) ** (y * 12) - mrRepay * ((1 + rm) ** (y * 12) - 1) / rm;
        remaining = Math.max(0, Math.round(remaining));
      }
      const totalPd = isIO ? repay * y : (ioRepayMonthly * Math.min(ioPeriod, y) * 12 + postIORepay * Math.max(0, y - ioPeriod) * 12);
      const intPd = isIO ? repay * y : (ioRepayMonthly * Math.min(ioPeriod, y) * 12 + (postIORepay * Math.max(0, y - ioPeriod) * 12 - (la - remaining)));
      const prinPd = totalPd - intPd;
      return {
        year: y,
        remaining: Math.round(remaining),
        interest: Math.round(intPd),
        principal: Math.round(prinPd),
        totalPaid: Math.round(totalPd),
        isIO: isIO,
      };
    }), [la, rm, mrRepay, lt, ltType, ioPeriod, ioRepayMonthly, postIORepay, remainingMonths]);

  const yieldMeterData = useMemo(() => [
    { name: "Gross Yield", value: gy, fill: "#0e7490" },
    { name: "Net Yield", value: nyBL, fill: "#0891b2" },
    { name: "Cash-on-Cash", value: nyOI, fill: "#67c5d6" },
  ], [gy, nyBL, nyOI]);

  // ── Analysis ──
  const analysis = useMemo(() => {
    const ins: { type: "positive" | "warning" | "info"; title: string; detail: string }[] = [];
    if (wcfBT > 0) ins.push({ type: "positive", title: "Positive Cash Flow", detail: `This property generates **$${wcfBT.toFixed(0)}/week** positive cash flow before tax. It pays you to hold it.` });
    else ins.push({ type: "warning", title: `$${Math.abs(wcfBT).toFixed(0)}/wk Deficit`, detail: `Runs at a **$${Math.abs(wcfBT).toFixed(0)}/week** shortfall. A 0.25% rate move shifts this by ~$${(la * 0.0025 / 12 / 52).toFixed(0)}/week.` });
    if (lvr <= 70) ins.push({ type: "positive", title: "Strong Equity Position", detail: `At **${lvr.toFixed(0)}% LVR**, ${(100 - lvr).toFixed(0)}% equity from day one. No LMI. Better rates.` });
    else if (lvr <= 80) ins.push({ type: "info", title: "Standard LVR", detail: `${lvr.toFixed(0)}% LVR is within standard lending. LMI may apply over 80%.` });
    else ins.push({ type: "warning", title: "High LVR", detail: `${lvr.toFixed(0)}% is high-LVR. Limited equity buffer. A 5% dip puts you underwater.` });
    if (gy >= 5) ins.push({ type: "positive", title: "Strong Yield", detail: `${gy.toFixed(1)}% gross yield — well above market average.` });
    else if (gy >= 3.5) ins.push({ type: "info", title: "Average Yield", detail: `${gy.toFixed(1)}% gross yield. Returns come from growth, not income.` });
    else ins.push({ type: "warning", title: "Below-Average Yield", detail: `${gy.toFixed(1)}% — below typical range. Ensure growth prospects justify this.` });
    if (cgr >= 5) ins.push({ type: "positive", title: `$${fmt(yr5.pv)} in 5 years`, detail: `At ${cgr}% growth, +$${fmt(yr5.pv - pp)} appreciation. Strong wealth building.` });
    else ins.push({ type: "info", title: "Modest Growth", detail: `${cgr}% growth is steady but modest. Hold 10+ years for compound effect.` });
    if (yr5.roi >= 40) ins.push({ type: "positive", title: `${yr5.roi}% 5-Year ROI`, detail: `$${fmt(initInv)} outlay → ${yr5.roi}% total return (${yr5.aroi}% annualized).` });
    else if (yr5.roi >= 20) ins.push({ type: "info", title: `${yr5.roi}% 5-Year ROI`, detail: `Solid returns. Best compounding happens in years 5-10.` });
    else ins.push({ type: "warning", title: "Modest Returns", detail: `${yr5.roi}% over 5 years. Negotiate entry price or revisit growth assumptions.` });
    const rUp = ir + 1;
    const rmUp = rUp / 100 / 12;
    const rpUp = la > 0 && rmUp > 0 ? (la * rmUp * Math.pow(1 + rmUp, tpm)) / (Math.pow(1 + rmUp, tpm) - 1) : 0;
    const wi = ((rpUp - mrRepay) * 12) / 52;
    ins.push({ type: "info", title: "Rate Sensitivity", detail: `A 1% rate rise adds **$${wi.toFixed(0)}/week**. 0.25% RBA move = $${(wi / 4).toFixed(0)}/week.` });
    // Break-even analysis
    if (rentGapWeekly > 0) {
      ins.push({ type: "warning", title: `Need $${Math.round(rentGapWeekly)}/wk More Rent to Break Even`, detail: `You need **$${Math.round(breakEvenRentWeekly)}/wk** total rent to cover all costs ($${Math.round(breakEvenRentAnnual).toLocaleString()}/yr). Currently at $${currentRentWeekly}/wk. ${breakEvenYear !== null ? `At 3% annual rent growth, this property reaches break-even in **${breakEvenYear} years**.` : "Even with 3% annual rent growth, this property won't break even within 30 years."} Every $$50/week in rent adds $${Math.round(50 * 52 * (1 - vr / 100) / 12).toLocaleString()}/mo to your bottom line.` });
    } else {
      ins.push({ type: "positive", title: "Already Break-Even", detail: `Your current rent of **$${currentRentWeekly}/wk** exceeds the $${Math.round(breakEvenRentWeekly)}/wk needed to break even. You're cash flow positive from day one — rent is covering all costs including the loan.` });
    }
    if (gf) {
      const wgf = mr * 52 / pp * 100;
      ins.push({ type: "positive", title: `Granny Flat Adds ${(gy - wgf).toFixed(1)}% Yield`, detail: `Granny flat contributes **$${gr}/week**. Without it: ${wgf.toFixed(1)}% gross yield.` });
    }
    if (ci > 0) {
      const dti = (tyLR / ci) * 100;
      if (dti < 30) ins.push({ type: "positive", title: "Healthy DTI", detail: `${dti.toFixed(0)}% debt-to-income. Strong position to proceed.` });
      else ins.push({ type: "warning", title: `DTI at ${dti.toFixed(0)}%`, detail: `Consider lower entry price or larger deposit.` });
    }
    // IO vs P&I comparison
    if (ltType === "interestOnly") {
      const pmiSavings = (mrRepay - effectiveRepay) * 12;
      ins.push({ type: "info", title: "Interest-Only Analysis", detail: `IO saves **$${fmt(Math.round(pmiSavings))}/yr** during the ${ioPeriod}-year IO period compared to P&I ($${fmt(Math.round(effectiveRepay))}/${pf} vs $${fmt(Math.round(mrRepay))}/${pf}). After year ${ioPeriod}, repayments jump to **$${fmt(Math.round(postIORepay))}/mo** (P&I over ${remainingTerm}yr). The cash flow benefit today comes at the cost of higher total interest over the loan life ($${fmt(Math.round(tioL))} vs $${fmt(Math.round(la > 0 ? mrRepay * tpm - la : 0))} for P&I). Best used when you plan to sell or refinance before the IO period ends.` });
    } else {
      ins.push({ type: "info", title: "P&I vs Interest-Only", detail: `Currently on P&I at **$${fmt(Math.round(effectiveRepay))}/${pf}**. Switching to IO (${ioPeriod}yr) would reduce payments to **$${fmt(Math.round(ioRepayMonthly))}/mo** ($${fmt(Math.round((mrRepay - ioRepayMonthly) * 12))}/yr savings), improving cash flow by $${Math.round((mrRepay - ioRepayMonthly) * 12 / 52)}/week. Total interest would increase by $${fmt(Math.round(tioL - (la > 0 ? mrRepay * tpm - la : 0)))} over the loan life.` });
    }
    return ins;
  }, [wcfBT, lvr, gy, cgr, yr5, ir, la, tpm, mrRepay, gf, gr, mr, pp, initInv, ci, tyLR, breakEvenRentWeekly, breakEvenRentAnnual, currentRentWeekly, rentGapWeekly, breakEvenYear, vr]);

  // ── Input control ──
  type InputDef = { label: string; val: number | string; set: (v: any) => void; step?: number; isSelect?: boolean; opts?: { label: string; value: string }[]; disabled?: boolean; suffix?: string };
  const InputStrip = useCallback(({ id, items }: { id: string; items: InputDef[] }) => (
    <div id={id} className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((i, idx) => (
        <div key={idx} className="min-w-0">
          <label className="mb-1 block truncate text-[11px] font-medium text-[#64748b]">{i.label}</label>
          <div className="relative">
            {i.isSelect ? (
              <select value={i.val} onChange={e => i.set(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-[rgba(15,23,42,0.1)] bg-white px-3 py-2 text-[12px] text-[#0f1e2e] outline-none transition-colors focus:border-[#0891b2]"
                disabled={i.disabled}>
                {(i.opts || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input type="number" value={i.val} onChange={e => i.set(Number(e.target.value) || 0)}
                step={i.step ?? 1} disabled={i.disabled}
                className="w-full rounded-xl border border-[rgba(15,23,42,0.1)] bg-white px-3 py-2 text-right text-[13px] text-[#0f1e2e] outline-none transition-colors focus:border-[#0891b2] disabled:cursor-not-allowed disabled:opacity-50" />
            )}
            {i.suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#94a3b8]">{i.suffix}</span>}
          </div>
        </div>
      ))}
    </div>
  ), []);

  const tabTitle = tab === "equity" ? "Equity & Growth" : tab === "amort" ? "Loan Amortization" : "Yield Comparison";
  const tabSub = tab === "equity" ? "Property value, loan balance & equity over 30 years" : tab === "amort" ? "Principal vs interest paid each year" : "Gross, net & cash-on-cash returns";

  return (
    <ClientPortalShell>
      <div style={{ maxWidth: 1180 }} className="mx-auto">
        <a href="/client/calculators" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium hover:underline" style={{ color: UI.teal }}>&larr; Back to Calculators</a>

        {/* ── HEADER ── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `${UI.teal}14` }}>
              <Zap className="h-6 w-6" style={{ color: UI.teal }} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: UI.teal }}>Property Investment Analyzer</p>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: UI.ink }}>Run the Numbers</h1>
            </div>
          </div>
          <div className="rounded-full px-4 py-2 text-sm font-semibold" style={{ background: wcfBT >= 0 ? `${UI.green}14` : `${UI.red}14`, color: wcfBT >= 0 ? UI.green : UI.red }}>
            {wcfBT >= 0 ? `Cash-flow positive · +${fmt$(Math.round(wcfBT))}/wk` : `Cash-flow deficit · ${fmt$(Math.round(wcfBT))}/wk`}
          </div>
        </div>

        {/* ── HERO KPI BAND ── */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Weekly Cashflow" value={wcfBT} format={(n) => (n >= 0 ? "+" : "") + fmt$(Math.round(n))} tone={wcfBT >= 0 ? "green" : "red"} sub={`${pf} · $${fmt(Math.round(fp))}`} />
          <StatCard label="5-Year ROI" value={yr5.roi} format={(n) => n.toFixed(1) + "%"} tone="teal" sub={`${fmt$(yr5.tr)} total`} />
          <StatCard label="Gross Yield" value={gy} format={(n) => n.toFixed(1) + "%"} tone="neutral" sub={`${fmt$(yrRent)} rent/yr`} />
          <StatCard label="Equity @ 10yr" value={yr10.eq} format={(n) => fmt$(Math.round(n))} tone="neutral" sub={`${fmt$(initInv)} invested`} />
          <StatCard label="Loan-to-Value" value={lvr} format={(n) => n.toFixed(1) + "%"} tone={lvr > 80 ? "red" : lvr > 70 ? "amber" : "neutral"} chip={lvr > 80 ? "LMI applies" : lvr > 70 ? "Borderline" : "No LMI"} chipTone={lvr > 80 ? "red" : lvr > 70 ? "amber" : "teal"} />
        </div>

        {/* ── INPUTS + CHART ── */}
        <div className="mb-6 grid gap-5 lg:grid-cols-5">
          {/* Assumptions */}
          <div className="lg:col-span-2">
            <Panel>
              <SectionHeader eyebrow="Assumptions" title="Your numbers" subtitle="Adjust anything — everything updates live." />

              {/* LVR control */}
              <div className="rounded-2xl border p-3.5" style={{ borderColor: UI.line, background: "#fbfcfe" }}>
                <div className="mb-1 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: UI.muted }}>Loan-to-Value Ratio</span>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <span className="text-2xl font-bold" style={{ color: lvr > 80 ? UI.red : lvr > 70 ? UI.amber : UI.green }}>{lvr.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px]" style={{ color: UI.muted }}>Loan Amount</span>
                    <div className="relative mt-0.5" style={{ width: 140 }}>
                      <input type="number" value={la} onChange={e => {
                        const v = Number(e.target.value) || 0;
                        setLa(Math.min(v, pp));
                        setLvrInput(pp > 0 ? Math.round(v / pp * 1000) / 10 : 0);
                      }}
                        className="w-full rounded-xl border bg-white px-3 py-2 text-right text-[13px] font-semibold outline-none transition-colors focus:border-[#0891b2]"
                        style={{ borderColor: UI.line, color: UI.ink }} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: UI.faint }}>$</span>
                    </div>
                  </div>
                </div>
                {/* LVR bar — click to set */}
                <div className="relative mt-2 h-6 cursor-pointer" onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width * 100));
                  setLvrInput(pct);
                  setLa(Math.round(pp * pct / 100));
                }}>
                  <div className="absolute inset-0 overflow-hidden rounded-full bg-gray-100">
                    <div style={{ width: "70%", position: "absolute", inset: 0, background: UI.green, opacity: 0.12 }} />
                    <div style={{ width: "10%", left: "70%", position: "absolute", inset: 0, background: UI.amber, opacity: 0.12 }} />
                    <div style={{ width: "20%", left: "80%", position: "absolute", inset: 0, background: UI.red, opacity: 0.12 }} />
                  </div>
                  <div className="h-full rounded-full transition-all duration-200" style={{ width: `${Math.min(lvr, 100)}%`, background: lvr > 80 ? UI.red : lvr > 70 ? UI.amber : UI.green }} />
                  <div className="absolute top-0 h-full w-0.5 bg-white/80" style={{ left: "70%" }} />
                  <div className="absolute top-0 h-full w-0.5 bg-white/80" style={{ left: "80%" }} />
                  <div className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 bg-white shadow-md transition-all" style={{ left: `calc(${Math.min(lvr, 100)}% - 8px)`, borderColor: lvr > 80 ? UI.red : lvr > 70 ? UI.amber : UI.green }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px]" style={{ color: UI.faint }}>
                  <span>Deposit ${Math.round(pp - la).toLocaleString()}</span>
                  <span style={{ color: lvr > 80 ? UI.red : lvr > 70 ? UI.amber : UI.green }}>{lvr > 80 ? "LMI applies" : lvr > 70 ? "Borderline" : "No LMI needed"}</span>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                <InputStrip id="row1" items={[
                  { label: "Purchase Price", val: pp, set: (v: number) => { setPp(v); if (isLvrDriven) setLa(Math.round(v * lvrInput / 100)); }, suffix: "$" },
                  { label: "State", val: st, set: setSt, isSelect: true, opts: Object.entries(STATE_NAMES).map(([k, v]) => ({ label: v, value: k })) },
                  { label: "Interest Rate", val: ir, set: setIr, step: 0.1, suffix: "%" },
                ]} />
                <InputStrip id="row2" items={[
                  { label: "Term", val: lt, set: setLt, isSelect: true, opts: [{ label: "20 years", value: "20" }, { label: "25 years", value: "25" }, { label: "30 years", value: "30" }] },
                  { label: "Pay Frequency", val: pf, set: setPf, isSelect: true, opts: [{ label: "Weekly", value: "weekly" }, { label: "Fortnightly", value: "fortnightly" }, { label: "Monthly", value: "monthly" }] },
                  { label: "Loan Type", val: ltType, set: setLtType, isSelect: true, opts: [{ label: "Principle & Interest (P&I)", value: "pAndI" }, { label: "Interest Only", value: "interestOnly" }] },
                ]} />
                <InputStrip id="row3" items={[
                  { label: "IO Period", val: ioPeriod, set: setIoPeriod, suffix: "yr", disabled: ltType !== "interestOnly" },
                  { label: "Main Rent /wk", val: mr, set: setMr, suffix: "$" },
                  { label: "Granny Rent /wk", val: gr, set: setGr, suffix: "$", disabled: !gf },
                ]} />
                <InputStrip id="row4" items={[
                  { label: "Growth Rate", val: cgr, set: setCgr, step: 0.5, suffix: "%" },
                  { label: "Vacancy", val: vr, set: setVr, step: 0.5, suffix: "%" },
                ]} />
                <label className="flex cursor-pointer items-center gap-2 pt-1">
                  <input type="checkbox" checked={gf} onChange={e => setGf(e.target.checked)} className="h-4 w-4 rounded border-gray-300" style={{ accentColor: UI.teal }} />
                  <span className="text-xs" style={{ color: UI.muted }}>Property has a granny flat (dual income)</span>
                </label>
              </div>
            </Panel>
          </div>

          {/* Chart */}
          <div className="lg:col-span-3">
            <Panel className="flex h-full flex-col">
              <SectionHeader
                eyebrow="Projection"
                title={tabTitle}
                subtitle={tabSub}
                right={<Segmented value={tab} onChange={setTab} options={[{ label: "Equity", value: "equity" }, { label: "Loan", value: "amort" }, { label: "Yield", value: "yield" }]} />}
              />

              {tab === "equity" && (
                <>
                  <ResponsiveContainer width="100%" height={320}>
                    <ReAreaChart data={equityData} margin={{ top: 5, right: 10, left: -6, bottom: 0 }}>
                      <defs>
                        <linearGradient id="propGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={UI.ink2} stopOpacity={0.16} /><stop offset="95%" stopColor={UI.ink2} stopOpacity={0.01} /></linearGradient>
                        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={UI.teal} stopOpacity={0.34} /><stop offset="95%" stopColor={UI.teal} stopOpacity={0.02} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                      <XAxis dataKey="year" tick={AXIS_TICK} tickFormatter={v => v + "y"} />
                      <YAxis tick={AXIS_TICK} tickFormatter={fmtK} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="propertyValue" name="Property Value" stroke={UI.ink2} strokeWidth={2.5} fill="url(#propGrad)" dot={false} animationDuration={CHART.animationMs} />
                      <Area type="monotone" dataKey="loanBalance" name="Loan Balance" stroke={UI.faint} strokeWidth={2} fill="none" strokeDasharray="4 4" dot={false} animationDuration={CHART.animationMs} />
                      <Area type="monotone" dataKey="equity" name="Equity" stroke={UI.teal} strokeWidth={2.5} fill="url(#eqGrad)" dot={false} animationDuration={CHART.animationMs} />
                    </ReAreaChart>
                  </ResponsiveContainer>
                  <div className="mt-3"><LegendChips items={[{ label: "Property", color: UI.ink2 }, { label: "Loan", color: UI.faint }, { label: "Equity", color: UI.teal }]} /></div>
                </>
              )}

              {tab === "amort" && (
                <>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={amortData.slice(0, 15)} margin={{ top: 5, right: 10, left: -6, bottom: 0 }} barCategoryGap="22%">
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                      <XAxis dataKey="year" tick={AXIS_TICK} tickFormatter={v => "Y" + v} />
                      <YAxis tick={AXIS_TICK} tickFormatter={fmtK} />
                      <Tooltip cursor={{ fill: "rgba(15,23,42,0.03)" }} content={<ChartTooltip />} />
                      <Bar dataKey="principal" name="Principal" stackId="a" fill={UI.teal} animationDuration={CHART.animationMs} />
                      <Bar dataKey="interest" name="Interest" stackId="a" fill={UI.faint} radius={[4, 4, 0, 0]} animationDuration={CHART.animationMs} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-3"><LegendChips items={[{ label: "Principal", color: UI.teal }, { label: "Interest", color: UI.faint }]} /></div>
                </>
              )}

              {tab === "yield" && (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={yieldMeterData} margin={{ top: 5, right: 10, left: -6, bottom: 0 }} barSize={90}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis dataKey="name" tick={{ ...AXIS_TICK, fontWeight: 600 }} />
                    <YAxis tick={AXIS_TICK} tickFormatter={v => v + "%"} domain={[0, "auto"]} />
                    <Tooltip cursor={{ fill: "rgba(15,23,42,0.03)" }} content={({ active, payload }: any) =>
                      active && payload && payload.length ? (
                        <div className="rounded-2xl border bg-white px-3.5 py-2.5" style={{ borderColor: UI.line, boxShadow: "0 12px 32px -12px rgba(16,24,40,0.35)" }}>
                          <p className="text-xs font-semibold" style={{ color: payload[0]?.payload?.fill }}>{payload[0]?.payload?.name}: {payload[0]?.value?.toFixed(2)}%</p>
                        </div>
                      ) : null
                    } />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={CHART.animationMs}>
                      {yieldMeterData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>
        </div>

        {/* ── BREAK-EVEN ── */}
        <Panel className="mb-6">
          <SectionHeader eyebrow="Break-even" title="What it takes to wash its face" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-[11px]" style={{ color: UI.muted }}>Rent to break even</p>
              <p className="text-xl font-bold" style={{ color: UI.ink }}>{fmt$(Math.round(breakEvenRentWeekly))}/wk</p>
              <p className="text-[11px]" style={{ color: UI.faint }}>${Math.round(breakEvenRentAnnual).toLocaleString()}/yr needed</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: UI.muted }}>Current rent</p>
              <p className="text-xl font-bold" style={{ color: UI.ink }}>{fmt$(currentRentWeekly)}/wk</p>
              <p className="text-[11px]" style={{ color: UI.faint }}>{mr}/wk main {gf ? "+ " + gr + "/wk granny" : ""}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: UI.muted }}>Weekly gap</p>
              <p className="text-xl font-bold" style={{ color: rentGapWeekly <= 0 ? UI.green : UI.red }}>
                {rentGapWeekly <= 0 ? "Surplus $" + Math.round(-rentGapWeekly) : "Shortfall $" + Math.round(rentGapWeekly)}
              </p>
              <p className="text-[11px]" style={{ color: UI.faint }}>{rentGapWeekly <= 0 ? "above break-even" : "below break-even"}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: UI.muted }}>{breakEvenYear !== null ? "Break-even in" : "Not projected"}</p>
              <p className="text-xl font-bold" style={{ color: breakEvenYear !== null ? UI.ink : UI.red }}>
                {breakEvenYear !== null ? breakEvenYear + " years" : "30+ years"}
              </p>
              <p className="text-[11px]" style={{ color: UI.faint }}>{breakEvenYear !== null ? "at 3% rent growth" : "at current growth"}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "#eef2f6" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, currentRentWeekly / breakEvenRentWeekly * 100)}%`, background: currentRentWeekly >= breakEvenRentWeekly ? UI.green : UI.amber }} />
            </div>
            <span className="text-xs font-semibold" style={{ color: currentRentWeekly >= breakEvenRentWeekly ? UI.green : UI.amber }}>
              {Math.round(currentRentWeekly / breakEvenRentWeekly * 100)}%
            </span>
          </div>
        </Panel>

        {/* ── ANNUAL BREAKDOWN ── */}
        <Panel className="mb-6">
          <SectionHeader eyebrow="Cash flow" title="Annual breakdown" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-[11px]" style={{ color: UI.muted }}>Gross Rent</p>
              <p className="text-lg font-bold" style={{ color: UI.ink }}>{fmt$(yrRent)}</p>
              <p className="text-[11px]" style={{ color: UI.faint }}>{mr}/wk main {gf ? "+ " + gr + "/wk granny" : ""}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: UI.muted }}>Vacancy</p>
              <p className="text-lg font-bold" style={{ color: UI.ink }}>-{fmt$(Math.round(yrRent - effRent))}</p>
              <p className="text-[11px]" style={{ color: UI.faint }}>{vr}% vacancy rate</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: UI.muted }}>Expenses</p>
              <p className="text-lg font-bold" style={{ color: UI.ink }}>-{fmt$(tae)}</p>
              <p className="text-[11px]" style={{ color: UI.faint }}>{mgmt}% mgmt · rates · ins · maint</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: UI.muted }}>Loan Cost</p>
              <p className="text-lg font-bold" style={{ color: UI.ink }}>-{fmt$(Math.round(tyLR))}</p>
              <p className="text-[11px]" style={{ color: UI.faint }}>{ir.toFixed(1)}% · ${fmt(Math.round(fp))} {pf} · {ltType === "interestOnly" ? "IO" : "P&I"}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: UI.muted }}>Net Rental</p>
              <p className="text-lg font-bold" style={{ color: nri >= 0 ? UI.green : UI.red }}>{fmt$(nri)}</p>
              <p className="text-[11px]" style={{ color: UI.faint }}>before loan</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: UI.muted }}>Net Cash Flow</p>
              <p className="text-lg font-bold" style={{ color: ycfBT >= 0 ? UI.green : UI.red }}>{ycfBT >= 0 ? "+" : ""}{fmt$(Math.round(ycfBT))}</p>
              <p className="text-[11px]" style={{ color: UI.faint }}>{wcfBT >= 0 ? "+" : ""}${Math.round(wcfBT)}/wk</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: UI.muted }}>LVR</p>
              <p className="text-lg font-bold" style={{ color: lvr > 80 ? UI.red : lvr > 70 ? UI.amber : UI.ink }}>{lvr.toFixed(1)}%</p>
              <p className="text-[11px]" style={{ color: UI.faint }}>{lvr > 80 ? "LMI applies" : lvr > 70 ? "Borderline" : "Strong"}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: UI.muted }}>Rate Sensitivity</p>
              <p className="text-lg font-bold" style={{ color: UI.ink }}>~${Math.round((mrRepay * 12 - (la * ((ir + 1) / 100 / 12) * Math.pow(1 + (ir + 1) / 100 / 12, tpm)) / (Math.pow(1 + (ir + 1) / 100 / 12, tpm) - 1) * 12) / 52)}/wk</p>
              <p className="text-[11px]" style={{ color: UI.faint }}>per +1% rate</p>
            </div>
          </div>
        </Panel>

        {/* ── TABLE + INSIGHTS ── */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <SectionHeader eyebrow="Timeline" title="Equity & ROI over time" />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: UI.line }}>
                    {["Year", "Value", "Equity", "Cash Flow", "Net Position", "ROI"].map(h => (
                      <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: UI.muted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[yr1, projectYear(3), yr5, projectYear(7), yr10].map(r => (
                    <tr key={r.y} className="border-b transition-colors hover:bg-[#f8fafc]" style={{ borderColor: UI.line }}>
                      <td className="px-2 py-2.5 text-[12px] font-medium">{r.y}y</td>
                      <td className="px-2 py-2.5 text-[12px] font-semibold">{fmt$(r.pv)}</td>
                      <td className="px-2 py-2.5 text-[12px] font-semibold" style={{ color: UI.teal }}>{fmt$(r.eq)}</td>
                      <td className="px-2 py-2.5 text-[12px]" style={{ color: r.cf >= 0 ? UI.green : UI.red }}>{r.cf >= 0 ? "+" : ""}{fmt$(r.cf)}</td>
                      <td className="px-2 py-2.5 text-[12px] font-semibold" style={{ color: UI.ink }}>{fmt$(r.neq)}</td>
                      <td className="px-2 py-2.5 text-[12px] font-bold" style={{ color: UI.ink }}>{r.roi}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px]" style={{ color: UI.faint }}>3% rent growth, 2.5% expense inflation applied. After-tax returns depend on marginal rate and depreciation.</p>
          </Panel>

          <Panel>
            <SectionHeader eyebrow="Analysis" title="What the numbers say" />
            <div className="grid gap-2">
              {analysis.map((a, i) => (
                <InsightCard key={i} type={a.type} title={a.title} detail={a.detail.replace(/\*\*/g, "")} />
              ))}
            </div>
            <p className="mt-3 text-[10px]" style={{ color: UI.faint }}>Rule-based analysis. Always verify with a qualified advisor.</p>
          </Panel>
        </div>
      </div>
    </ClientPortalShell>
  );
}
