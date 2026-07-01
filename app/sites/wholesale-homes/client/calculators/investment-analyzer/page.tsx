"use client";

import { useState, useMemo, useCallback } from "react";
import { ClientPortalShell } from "../../../_components/ClientPortalShell";
import { Lightbulb, AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import {
  AreaChart as ReAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, Cell,
} from "recharts";
import {
  calcStampDuty, STATE_NAMES, type State,
  fmtNum as fmt, fmtAUD as fmt$, fmtCompact as fmtK,
  MetricMini,
} from "../_shared";

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
    { name: "Gross Yield", value: gy, fill: "#0891b2" },
    { name: "Net Yield", value: nyBL, fill: "#16a34a" },
    { name: "Cash-on-Cash", value: nyOI, fill: "#7c3aed" },
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
    <div id={id} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((i, idx) => (
        <div key={idx} className="min-w-0">
          <label className="block text-[9px] font-medium text-[#5C6670] mb-0.5 truncate">{i.label}</label>
          <div className="relative">
            {i.isSelect ? (
              <select value={i.val} onChange={e => i.set(e.target.value)}
                className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-2 py-1.5 text-[11px] text-[#1A2B3C] outline-none focus:border-[#0891b2] transition-colors appearance-none cursor-pointer"
                disabled={i.disabled}>
                {(i.opts || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input type="number" value={i.val} onChange={e => i.set(Number(e.target.value) || 0)}
                step={i.step ?? 1} disabled={i.disabled}
                className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-2 py-1.5 text-[11px] text-[#1A2B3C] outline-none text-right focus:border-[#0891b2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed" />
            )}
            {i.suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#9CA3AF] pointer-events-none">{i.suffix}</span>}
          </div>
        </div>
      ))}
    </div>
  ), []);

  // ── Custom tooltip ──
  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3 shadow-lg">
        <p className="text-[10px] font-medium text-[#5C6670] mb-1">Year {label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-xs font-semibold" style={{ color: p.color }}>{p.name}: {fmt$(p.value)}</p>
        ))}
      </div>
    );
  };

  return (
    <ClientPortalShell>
      <div style={{ maxWidth: 1120 }}>
        <a href="/client/calculators" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0891b2] hover:underline mb-3">&larr; Back to Calculators</a>

        {/* ── HEADER ── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7c3aed]/10">
            <Zap className="h-6 w-6 text-[#7c3aed]" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7c3aed]">Property Investment Analyzer</p>
            <h1 className="text-xl font-bold tracking-tight text-[#1A2B3C]">Run the Numbers</h1>
            <p className="text-xs text-[#5C6670]">Interactive charts. Instant updates. Complete financial picture.</p>
          </div>
        </div>

        {/* ── COMPACT INPUT STRIP ── */}
        <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 mb-6 shadow-sm">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5C6670] mb-3">Adjust any number. Everything updates instantly.</p>
            <div className="space-y-3">
              {/* LVR Control — replaces standalone Loan Amount */}
              <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3 mb-3 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-[#5C6670]">Loan-to-Value Ratio</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-xl font-bold" style={{ color: lvr > 80 ? "#dc2626" : lvr > 70 ? "#f59e0b" : "#16a34a" }}>{lvr.toFixed(1)}%</span>
                      <span className="text-[10px] text-[#5C6670]">LVR</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-[#5C6670]">Loan Amount</span>
                    <div className="relative mt-0.5" style={{ width: 130 }}>
                      <input type="number" value={la} onChange={e => {
                        const v = Number(e.target.value) || 0;
                        setLa(Math.min(v, pp));
                        setLvrInput(pp > 0 ? Math.round(v / pp * 1000) / 10 : 0);
                      }}
                        className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-2 py-1.5 text-[12px] text-[#1A2B3C] outline-none focus:border-[#0891b2] transition-colors text-right font-semibold" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#9CA3AF] pointer-events-none">$</span>
                    </div>
                  </div>
                </div>
                {/* LVR Progress Bar — click/drag to adjust */}
                <div className="relative h-6 mt-2 cursor-pointer" onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width * 100));
                  setLvrInput(pct);
                  setLa(Math.round(pp * pct / 100));
                }}>
                  <div className="absolute inset-0 rounded-full overflow-hidden bg-gray-100">
                    <div style={{ width: "70%", position: "absolute", inset: 0, background: "#16a34a", opacity: 0.12 }} />
                    <div style={{ width: "10%", left: "70%", position: "absolute", inset: 0, background: "#f59e0b", opacity: 0.12 }} />
                    <div style={{ width: "20%", left: "80%", position: "absolute", inset: 0, background: "#dc2626", opacity: 0.12 }} />
                  </div>
                  <div className="h-full rounded-full transition-all duration-200" style={{
                    width: `${Math.min(lvr, 100)}%`,
                    background: lvr > 80 ? "#dc2626" : lvr > 70 ? "#f59e0b" : "#16a34a",
                  }} />
                  <div className="absolute top-0 h-full w-0.5 bg-white/80" style={{ left: "70%" }} />
                  <div className="absolute top-0 h-full w-0.5 bg-white/80" style={{ left: "80%" }} />
                  {/* Drag handle */}
                  <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-md transition-all" style={{
                    left: `calc(${Math.min(lvr, 100)}% - 8px)`,
                    borderColor: lvr > 80 ? "#dc2626" : lvr > 70 ? "#f59e0b" : "#16a34a",
                  }} />
                </div>
                <div className="flex justify-between mt-0.5 text-[8px] text-[#5C6670]">
                  <span>0%</span>
                  <span style={{ color: "#16a34a" }}>70%</span>
                  <span style={{ color: "#f59e0b" }}>80%</span>
                  <span>100%</span>
                </div>
                <div className="flex justify-between mt-1 text-[9px]">
                  <div>
                    <span className="text-[#5C6670]">Deposit: </span>
                    <span className="font-semibold text-[#1A2B3C]">${Math.round(pp - la).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[#5C6670]">{lvr > 80 ? "LMI applies" : lvr > 70 ? "Borderline" : "No LMI needed"}</span>
                  </div>
                </div>
              </div>
            <InputStrip id="row1" items={[
              { label: "Purchase Price", val: pp, set: (v: number) => { setPp(v); if (isLvrDriven) setLa(Math.round(v * lvrInput / 100)); } , suffix: "$" },
              { label: "State", val: st, set: setSt, isSelect: true, opts: Object.entries(STATE_NAMES).map(([k, v]) => ({ label: v, value: k })) },
              { label: "Loan Amount", val: la, set: (v: number) => { setLa(Math.min(v, pp)); setLvrInput(pp > 0 ? Math.round(v / pp * 1000) / 10 : 0); }, suffix: "$" },
              { label: "Interest Rate", val: ir, set: setIr, step: 0.1, suffix: "%" },
              { label: "Term", val: lt, set: setLt, isSelect: true, opts: [{ label: "20 years", value: "20" }, { label: "25 years", value: "25" }, { label: "30 years", value: "30" }] },
            ]} />
            <InputStrip id="row2" items={[
              { label: "Pay Frequency", val: pf, set: setPf, isSelect: true, opts: [{ label: "Weekly", value: "weekly" }, { label: "Fortnightly", value: "fortnightly" }, { label: "Monthly", value: "monthly" }] },
              { label: "Loan Type", val: ltType, set: setLtType, isSelect: true, opts: [{ label: "Principle & Interest (P&I)", value: "pAndI" }, { label: "Interest Only", value: "interestOnly" }] },
              { label: "IO Period", val: ioPeriod, set: setIoPeriod, suffix: "yr", disabled: ltType !== "interestOnly" },
              { label: "Main Rent /wk", val: mr, set: setMr, suffix: "$" },
              { label: "Granny Rent /wk", val: gr, set: setGr, suffix: "$", disabled: !gf },
            ]} />
            <InputStrip id="row3" items={[
              { label: "Growth Rate", val: cgr, set: setCgr, step: 0.5, suffix: "%" },
              { label: "Vacancy", val: vr, set: setVr, step: 0.5, suffix: "%" },
            ]} />
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={gf} onChange={e => setGf(e.target.checked)} className="rounded border-gray-300 text-[#0891b2] focus:ring-[#0891b2] h-3 w-3" />
                <span className="text-[10px] text-[#5C6670]">Has granny flat</span>
              </label>
              <button onClick={() => setTab("equity")} className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors ${tab === "equity" ? "bg-[#7c3aed]/10 text-[#7c3aed]" : "text-[#5C6670] hover:text-[#1A2B3C]"}`}>Equity</button>
              <button onClick={() => setTab("amort")} className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors ${tab === "amort" ? "bg-[#7c3aed]/10 text-[#7c3aed]" : "text-[#5C6670] hover:text-[#1A2B3C]"}`}>Loan</button>
              <button onClick={() => setTab("yield")} className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors ${tab === "yield" ? "bg-[#7c3aed]/10 text-[#7c3aed]" : "text-[#5C6670] hover:text-[#1A2B3C]"}`}>Yield</button>
            </div>
          </div>
        </div>

        {/* ── BIG CHART ── */}
        <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 md:p-6 mb-5 shadow-sm overflow-hidden">
          {tab === "equity" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670]">Equity &amp; Growth Projection</p>
                  <p className="text-xs text-[#5C6670]">Property value, loan balance, and your equity over time</p>
                </div>
                <div className="flex gap-4 text-[9px]">
                  <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#7c3aed" }}/> Property</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#dc2626" }}/> Loan</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#16a34a" }}/> Equity</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <ReAreaChart data={equityData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="propGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/><stop offset="95%" stopColor="#7c3aed" stopOpacity={0.01}/></linearGradient>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.4}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0.02}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickFormatter={v => v + "y"} />
                  <YAxis tick={{ fontSize: 9, fill: "#9CA3AF" }} tickFormatter={fmtK} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="propertyValue" name="Property Value" stroke="#7c3aed" strokeWidth={2.5} fill="url(#propGrad)" dot={false} />
                  <Area type="monotone" dataKey="loanBalance" name="Loan Balance" stroke="#dc2626" strokeWidth={2} fill="none" strokeDasharray="4 4" dot={false} />
                  <Area type="monotone" dataKey="equity" name="Equity" stroke="#16a34a" strokeWidth={2.5} fill="url(#eqGrad)" dot={false} />
                </ReAreaChart>
              </ResponsiveContainer>
            </>
          )}

          {tab === "amort" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670]">Loan Amortization</p>
                  <p className="text-xs text-[#5C6670]">Principal vs interest paid each year</p>
                </div>
                <div className="flex gap-4 text-[9px]">
                  <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#0891b2" }}/> Principal</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#f59e0b" }}/> Interest</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={amortData.slice(0, 15)} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickFormatter={v => "Y" + v} />
                  <YAxis tick={{ fontSize: 9, fill: "#9CA3AF" }} tickFormatter={fmtK} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 } as any} />
                  <Bar dataKey="principal" name="Principal" stackId="a" fill="#0891b2" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="interest" name="Interest" stackId="a" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}

          {tab === "yield" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670]">Yield Comparison</p>
                  <p className="text-xs text-[#5C6670]">Gross, net, and cash-on-cash returns</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={yieldMeterData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barSize={100}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 9, fill: "#9CA3AF" }} tickFormatter={v => v + "%"} domain={[0, 'auto']} />
                  <Tooltip content={({ active, payload }: any) =>
                    active && payload ? <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3 shadow-lg"><p className="text-xs font-semibold" style={{ color: payload[0]?.color }}>{payload[0]?.payload?.name}: {payload[0]?.value?.toFixed(2)}%</p></div> : null
                  } />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {yieldMeterData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* ── QUICK METRICS ── */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          <MetricMini label="Weekly Cashflow" val={wcfBT >= 0 ? "+" + fmt$(Math.round(wcfBT)) : fmt$(Math.round(wcfBT))} color={wcfBT >= 0 ? "#16a34a" : "#dc2626"} sub={`${pf} payment: $${fmt(Math.round(fp))}`} />
          <MetricMini label="Gross Yield" val={gy.toFixed(1) + "%"} color="#0891b2" sub={fmt$(yrRent) + "/yr"} />
          <MetricMini label="Net Yield" val={nyBL.toFixed(1) + "%"} color="#16a34a" sub={fmt$(nri) + "/yr net"} />
          <MetricMini label="5-Yr ROI" val={yr5.roi + "%"} color={yr5.roi >= 20 ? "#16a34a" : "#f59e0b"} sub={fmt$(yr5.tr)} />
          <MetricMini label={`${ltType === "interestOnly" ? "IO" : "P&I"} Repay`} val={fmt$(Math.round(effectiveRepay))} color="#1A2B3C" sub={`${pf} · ${ltType === "interestOnly" ? ioPeriod + "yr IO then " : ""}${remainingTerm}yr P&I`} />
          <MetricMini label="Rent Needed BE" val={fmt$(Math.round(breakEvenRentWeekly))} color={rentGapWeekly <= 0 ? "#16a34a" : "#dc2626"} sub={`${rentGapWeekly > 0 ? "need +$" + Math.round(rentGapWeekly) + "/wk" : "already break-even"}`} />
          <MetricMini label="Total Interest" val={fmt$(Math.round(tioL))} color="#dc2626" sub={`${ltType === "interestOnly" ? "IO " + ioPeriod + "yr + P&I " + remainingTerm + "yr" : lt + "yr P&I"}`} />
          <MetricMini label="Initial Outlay" val={fmt$(initInv)} color="#7c3aed" sub={fmt$(dep) + " dep + " + fmt$(tbc) + " costs"} />
        </div>

        {/* ── BREAK-EVEN ANALYSIS ── */}
        <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 md:p-5 mb-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670] mb-3">Break-Even Analysis</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[9px] text-[#5C6670]">Rent Required to Break Even</p>
              <p className="text-xl font-bold" style={{ color: "#0891b2" }}>{fmt$(Math.round(breakEvenRentWeekly))}/wk</p>
              <p className="text-[9px] text-[#5C6670]">${Math.round(breakEvenRentAnnual).toLocaleString()}/yr needed</p>
            </div>
            <div>
              <p className="text-[9px] text-[#5C6670]">Current Rent</p>
              <p className="text-xl font-bold" style={{ color: "#16a34a" }}>{fmt$(currentRentWeekly)}/wk</p>
              <p className="text-[9px] text-[#5C6670]">{mr}/wk main {gf ? "+ " + gr + "/wk granny" : ""}</p>
            </div>
            <div>
              <p className="text-[9px] text-[#5C6670]">Weekly Gap</p>
              <p className="text-xl font-bold" style={{ color: rentGapWeekly <= 0 ? "#16a34a" : "#dc2626" }}>
                {rentGapWeekly <= 0 ? "Surplus $" + Math.round(-rentGapWeekly) : "Shortfall $" + Math.round(rentGapWeekly)}
              </p>
              <p className="text-[9px] text-[#5C6670]">{rentGapWeekly <= 0 ? "above break-even" : "below break-even"}</p>
            </div>
            <div>
              <p className="text-[9px] text-[#5C6670]">{breakEvenYear !== null ? "Break-Even in" : "Not projected"}</p>
              <p className="text-xl font-bold" style={{ color: breakEvenYear !== null ? "#16a34a" : "#dc2626" }}>
                {breakEvenYear !== null ? breakEvenYear + " years" : "30+ years"}
              </p>
              <p className="text-[9px] text-[#5C6670]">{breakEvenYear !== null ? "at 3% rent growth" : "at current growth"}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{
                width: `${Math.min(100, currentRentWeekly / breakEvenRentWeekly * 100)}%`,
                background: currentRentWeekly >= breakEvenRentWeekly ? "#16a34a" : "#f59e0b",
              }} />
            </div>
            <span className="text-[9px] font-medium" style={{ color: currentRentWeekly >= breakEvenRentWeekly ? "#16a34a" : "#f59e0b" }}>
              {Math.round(currentRentWeekly / breakEvenRentWeekly * 100)}%
            </span>
          </div>
        </div>

        {/* ── INCOME / COST BREAKDOWN ── */}
        <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 md:p-5 mb-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670] mb-3">Annual Breakdown</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-[9px] text-[#5C6670]">Gross Rent</p>
              <p className="text-sm font-semibold text-green-600">{fmt$(yrRent)}</p>
              <p className="text-[9px] text-[#5C6670]">({mr}/wk main {gf ? "+ " + gr + "/wk granny" : ""})</p>
            </div>
            <div>
              <p className="text-[9px] text-[#5C6670]">Vacancy</p>
              <p className="text-sm font-semibold text-[#dc2626]">-{fmt$(Math.round(yrRent - effRent))}</p>
              <p className="text-[9px] text-[#5C6670]">{vr}% vacancy rate</p>
            </div>
            <div>
              <p className="text-[9px] text-[#5C6670]">Expenses</p>
              <p className="text-sm font-semibold text-[#dc2626]">-{fmt$(tae)}</p>
              <p className="text-[9px] text-[#5C6670]">{mgmt}% mgmt · rates · ins · maint</p>
            </div>
            <div>
              <p className="text-[9px] text-[#5C6670]">Loan Cost</p>
              <p className="text-sm font-semibold text-[#dc2626]">-{fmt$(Math.round(tyLR))}</p>
              <p className="text-[9px] text-[#5C6670]">{ir.toFixed(1)}% · ${fmt(Math.round(fp))} {pf} · {ltType === "interestOnly" ? "IO" : "P&I"}</p>
            </div>
            <div>
              <p className="text-[9px] text-[#5C6670]">Net Rental</p>
              <p className="text-lg font-bold" style={{ color: nri >= 0 ? "#16a34a" : "#dc2626" }}>{fmt$(nri)}</p>
              <p className="text-[9px] text-[#5C6670]">before loan</p>
            </div>
            <div>
              <p className="text-[9px] text-[#5C6670]">Net Cash Flow</p>
              <p className="text-lg font-bold" style={{ color: ycfBT >= 0 ? "#16a34a" : "#dc2626" }}>{ycfBT >= 0 ? "+" : ""}{fmt$(Math.round(ycfBT))}</p>
              <p className="text-[9px] text-[#5C6670]">{wcfBT >= 0 ? "+" : ""}${Math.round(wcfBT)}/wk</p>
            </div>
            <div>
              <p className="text-[9px] text-[#5C6670]">LTV Ratio</p>
              <p className="text-lg font-bold" style={{ color: lvr > 80 ? "#dc2626" : lvr > 70 ? "#f59e0b" : "#16a34a" }}>{lvr.toFixed(1)}%</p>
              <p className="text-[9px] text-[#5C6670]">{lvr > 80 ? "LMI applies" : lvr > 70 ? "Borderline" : "Strong"}</p>
            </div>
            <div>
              <p className="text-[9px] text-[#5C6670]">Rate Sensitivity</p>
              <p className="text-sm font-semibold text-[#f59e0b]">~${Math.round((mrRepay * 12 - (la * ((ir + 1) / 100 / 12) * Math.pow(1 + (ir + 1) / 100 / 12, tpm)) / (Math.pow(1 + (ir + 1) / 100 / 12, tpm) - 1) * 12) / 52)}/wk per 1%</p>
              <p className="text-[9px] text-[#5C6670]">RBA move impact</p>
            </div>
          </div>
        </div>

        {/* ── EQUITY TABLE ── */}
        <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 md:p-5 mb-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670] mb-3">Equity &amp; ROI Timeline</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[rgba(0,0,0,0.06)]">
                  {["Year", "Property Value", "Equity", "Cash Flow", "Net Position", "ROI"].map(h => (
                    <th key={h} className="text-left py-2 px-2 text-[9px] font-semibold uppercase tracking-wider text-[#5C6670]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[yr1, projectYear(3), yr5, projectYear(7), yr10].map(r => (
                  <tr key={r.y} className="border-b border-[rgba(0,0,0,0.04)] hover:bg-[#f8f6f2] transition-colors">
                    <td className="py-2 px-2 text-[11px] font-medium">{r.y}y</td>
                    <td className="py-2 px-2 text-[11px] font-semibold">{fmt$(r.pv)}</td>
                    <td className="py-2 px-2 text-[11px] font-semibold text-green-600">{fmt$(r.eq)}</td>
                    <td className="py-2 px-2 text-[11px]" style={{ color: r.cf >= 0 ? "#16a34a" : "#dc2626" }}>{r.cf >= 0 ? "+" : ""}{fmt$(r.cf)}</td>
                    <td className="py-2 px-2 text-[11px] font-semibold text-[#7c3aed]">{fmt$(r.neq)}</td>
                    <td className="py-2 px-2 text-[11px] font-bold" style={{ color: r.roi >= 15 ? "#16a34a" : "#f59e0b" }}>{r.roi}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[8px] text-[#9CA3AF]">3% rent growth, 2.5% expense inflation applied. Returns after tax depend on marginal rate and depreciation.</p>
        </div>

        {/* ── AI ANALYSIS ── */}
        <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 md:p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-[#d4a84b]" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670]">Investment Analysis</p>
          </div>
          <div className="grid gap-2">
            {analysis.map((a, i) => (
              <div key={i} className={`rounded-xl border p-3 ${a.type === "positive" ? "bg-[#f0fdf4] border-green-100" : a.type === "warning" ? "bg-[#fefce8] border-yellow-200" : "bg-[#f0f9ff] border-[#0891b2]/20"}`}>
                <div className="flex items-start gap-2">
                  {a.type === "positive" ? <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-green-600" /> :
                   a.type === "warning" ? <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-yellow-600" /> :
                   <Lightbulb className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-[#0891b2]" />}
                  <div>
                    <p className={`text-[11px] font-semibold ${a.type === "positive" ? "text-green-800" : a.type === "warning" ? "text-yellow-800" : "text-[#0891b2]"}`}>{a.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-[#5C6670]">{a.detail.replace(/\*\*/g, "")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[8px] text-[#9CA3AF]">Rule-based analysis. Always verify with a qualified advisor.</p>
        </div>
      </div>
    </ClientPortalShell>
  );
}
