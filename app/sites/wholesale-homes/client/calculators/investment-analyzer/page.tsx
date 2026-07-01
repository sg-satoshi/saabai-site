"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { ClientPortalShell } from "../../../_components/ClientPortalShell";
import {
  AreaChart as ReAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import {
  calcStampDuty, STATE_NAMES, type State,
  fmtNum as fmt, fmtAUD as fmt$, fmtCompact as fmtK,
} from "../_shared";
import { Segmented, InsightCard, AnimatedNumber, UI, FONT_DISPLAY, FONT_UI } from "../../_ui/primitives";
import { ChartTooltip, CHART, AXIS_TICK, LegendChips } from "../../_ui/charts";
import { Card, Eyebrow, Title, LedgerRow } from "../../_ui/tearsheet";
import { loadJSON, saveJSON } from "../../../_lib/portal";

type PaymentFreq = "weekly" | "fortnightly" | "monthly";

const STORAGE_KEY = "wh_calc_investment_analyzer";

export default function InvestmentAnalyzer() {
  // ── State (restored from the last saved scenario, if any) ──
  const [saved] = useState<Record<string, any>>(() => loadJSON(STORAGE_KEY, {}));
  const [pp, setPp] = useState(saved.pp ?? 729000);
  const [st, setSt] = useState<State>(saved.st ?? "NSW");
  const [gf, setGf] = useState(saved.gf ?? true);
  const [sdO, setSdO] = useState<number | null>(saved.sdO ?? null);
  const [la, setLa] = useState(saved.la ?? 583200);
  const [lvrInput, setLvrInput] = useState(saved.lvrInput ?? 80); // LVR in %, synced with loan amount
  const [isLvrDriven, setIsLvrDriven] = useState(saved.isLvrDriven ?? true); // true = LVR slider drives loan, false = loan input drives LVR
  const [ir, setIr] = useState(saved.ir ?? 6.3);
  const [lt, setLt] = useState(saved.lt ?? 30);
  const [ltType, setLtType] = useState<"pAndI" | "interestOnly">(saved.ltType ?? "pAndI");
  const [ioPeriod, setIoPeriod] = useState(saved.ioPeriod ?? 5);
  const [pf, setPf] = useState<PaymentFreq>(saved.pf ?? "monthly");
  const [mr, setMr] = useState(saved.mr ?? 520);
  const [gr, setGr] = useState(saved.gr ?? 320);
  const [cr, setCr] = useState(saved.cr ?? 2500);
  const [ins, setIns] = useState(saved.ins ?? 1800);
  const [mgmt, setMgmt] = useState(saved.mgmt ?? 7);
  const [maint, setMaint] = useState(saved.maint ?? 1500);
  const [sf, setSf] = useState(saved.sf ?? 0);
  const [wc, setWc] = useState(saved.wc ?? 800);
  const [vr, setVr] = useState(saved.vr ?? 3);
  const [cgr, setCgr] = useState(saved.cgr ?? 4);
  const [bc, setBc] = useState<number | null>(saved.bc ?? null);
  const [scp, setScp] = useState(saved.scp ?? 2.5);
  const [ci, setCi] = useState(saved.ci ?? 150000);
  const [tab, setTab] = useState(saved.tab ?? "equity");

  // ── Persist the scenario on every change ──
  useEffect(() => {
    saveJSON(STORAGE_KEY, { pp, st, gf, sdO, la, lvrInput, isLvrDriven, ir, lt, ltType, ioPeriod, pf, mr, gr, cr, ins, mgmt, maint, sf, wc, vr, cgr, bc, scp, ci, tab });
  }, [pp, st, gf, sdO, la, lvrInput, isLvrDriven, ir, lt, ltType, ioPeriod, pf, mr, gr, cr, ins, mgmt, maint, sf, wc, vr, cgr, bc, scp, ci, tab]);

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
          <label className="mb-1 block truncate" style={{ fontFamily: FONT_UI, fontSize: 11, fontWeight: 500, color: UI.muted }}>{i.label}</label>
          <div className="relative">
            {i.isSelect ? (
              <select value={i.val} onChange={e => i.set(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-lg bg-white px-3 py-2 text-[12px] outline-none transition-colors focus:border-[#0891b2]"
                style={{ border: `1px solid ${UI.hair}`, color: UI.ink, fontFamily: FONT_UI }}
                disabled={i.disabled}>
                {(i.opts || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input type="number" value={i.val} onChange={e => i.set(Number(e.target.value) || 0)}
                step={i.step ?? 1} disabled={i.disabled}
                className="w-full rounded-lg bg-white px-3 py-2 text-right text-[13px] outline-none transition-colors focus:border-[#0891b2] disabled:cursor-not-allowed disabled:opacity-50"
                style={{ border: `1px solid ${UI.hair}`, color: UI.ink, fontFamily: FONT_DISPLAY, fontVariantNumeric: "tabular-nums" }} />
            )}
            {i.suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: UI.faint }}>{i.suffix}</span>}
          </div>
        </div>
      ))}
    </div>
  ), []);

  const tabTitle = tab === "equity" ? "Equity & growth" : tab === "amort" ? "Loan amortisation" : "Yield comparison";
  const tabSub = tab === "equity" ? "Property value, loan balance & equity over 30 years" : tab === "amort" ? "Principal vs interest paid each year" : "Gross, net & cash-on-cash returns";

  const rateSens = Math.round((mrRepay * 12 - (la * ((ir + 1) / 100 / 12) * Math.pow(1 + (ir + 1) / 100 / 12, tpm)) / (Math.pow(1 + (ir + 1) / 100 / 12, tpm) - 1) * 12) / 52);
  const bePct = Math.round(currentRentWeekly / breakEvenRentWeekly * 100);

  return (
    <ClientPortalShell>
      <style>{`@keyframes whRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}.wh-rise{animation:whRise .6s cubic-bezier(.2,.7,.2,1) both}@media (prefers-reduced-motion:reduce){.wh-rise{animation:none}}`}</style>

      <div style={{ maxWidth: 1160, margin: "0 auto", fontFamily: FONT_UI, color: UI.ink }}>

        {/* ── MASTHEAD ── */}
        <div className="wh-rise" style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 12, paddingBottom: 14, borderBottom: `1px solid ${UI.hair}` }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: UI.teal }}>Wholesale Homes — Investment Analysis</span>
          <a href="/client/calculators" style={{ fontSize: 12, fontWeight: 500, color: UI.faintInk, textDecoration: "none" }}>← All calculators</a>
        </div>

        {/* ── HERO ── */}
        <div className="wh-rise" style={{ animationDelay: "60ms", position: "relative", overflow: "hidden", borderRadius: 28, background: UI.heroInk, color: "#e8efe9", padding: "clamp(28px,4vw,44px)", margin: "18px 0 22px" }}>
          <div aria-hidden style={{ position: "absolute", top: -140, right: -70, width: 460, height: 460, background: "radial-gradient(circle, rgba(8,145,178,0.38), rgba(8,145,178,0) 66%)", pointerEvents: "none" }} />
          <div aria-hidden style={{ position: "absolute", bottom: -170, left: -80, width: 400, height: 400, background: "radial-gradient(circle, rgba(20,160,120,0.16), rgba(0,0,0,0) 70%)", pointerEvents: "none" }} />
          <div aria-hidden style={{ position: "absolute", inset: 0, opacity: 0.045, pointerEvents: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
          <div style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: 32, justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ maxWidth: 580, minWidth: 260 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(103,197,214,0.85)" }}>The verdict</span>
              <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: "clamp(30px,4.6vw,52px)", lineHeight: 1.04, letterSpacing: "-0.02em", margin: "12px 0 0" }}>
                This home {wcfBT >= 0 ? "pays you" : "costs you"}{" "}
                <span style={{ color: wcfBT >= 0 ? "#5fd4ab" : "#f4a6b6" }}>
                  <AnimatedNumber value={Math.abs(wcfBT)} format={(n) => fmt$(Math.round(n))} />
                </span>{" "}
                a week.
              </h1>
              <p style={{ marginTop: 14, fontSize: 14, lineHeight: 1.6, color: "rgba(232,239,233,0.68)", maxWidth: 520 }}>
                {wcfBT >= 0 ? "Positive" : "Negative"} pre-tax cash flow on a {fmt$(pp)} purchase at {lvr.toFixed(0)}% LVR · {ir.toFixed(1)}% over {lt} years{gf ? " · dual granny-flat income" : ""}.
              </p>
            </div>
            <div style={{ display: "flex", gap: 30 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(232,239,233,0.5)", marginBottom: 8 }}>Equity · year 10</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: "clamp(26px,3.6vw,40px)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  <AnimatedNumber value={yr10.eq} format={(n) => fmt$(Math.round(n))} />
                </div>
              </div>
              <div style={{ borderLeft: "1px solid rgba(232,239,233,0.16)", paddingLeft: 30 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(232,239,233,0.5)", marginBottom: 8 }}>5-year ROI</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: "clamp(26px,3.6vw,40px)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  <AnimatedNumber value={yr5.roi} format={(n) => n.toFixed(1) + "%"} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── FIGURES LEDGER STRIP ── */}
        <Card className="wh-rise" style={{ animationDelay: "120ms", padding: 0, marginBottom: 22 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            {[
              { label: "Weekly cashflow", value: (wcfBT >= 0 ? "+" : "") + fmt$(Math.round(wcfBT)), sub: `${pf} · $${fmt(Math.round(fp))}`, color: wcfBT >= 0 ? UI.green : UI.red },
              { label: "Gross yield", value: gy.toFixed(1) + "%", sub: `${fmt$(yrRent)} / yr`, color: UI.ink },
              { label: "Net yield", value: nyBL.toFixed(1) + "%", sub: `${fmt$(nri)} net`, color: UI.ink },
              { label: `${ltType === "interestOnly" ? "IO" : "P&I"} repayment`, value: fmt$(Math.round(fp)), sub: pf, color: UI.ink },
              { label: "Total interest", value: fmt$(Math.round(tioL)), sub: `over ${lt} yrs`, color: UI.ink },
            ].map((f, i) => (
              <div key={f.label} style={{ padding: "18px 22px", borderLeft: i ? `1px solid ${UI.hair}` : "none" }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: UI.muted }}>{f.label}</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 27, lineHeight: 1.1, marginTop: 6, color: f.color, fontVariantNumeric: "tabular-nums" }}>{f.value}</div>
                <div style={{ fontSize: 11.5, color: UI.faint, marginTop: 2 }}>{f.sub}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── ASSUMPTIONS + CHART ── */}
        <div className="wh-rise" style={{ animationDelay: "180ms", display: "grid", gap: 20, gridTemplateColumns: "minmax(0, 1fr)", marginBottom: 22 }}>
          <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
            {/* Assumptions */}
            <Card>
              <Eyebrow>Assumptions</Eyebrow>
              <Title>Your numbers</Title>
              <p style={{ fontSize: 12.5, color: UI.faintInk, margin: "4px 0 16px" }}>Adjust anything — everything updates live.</p>

              {/* LVR control */}
              <div style={{ borderRadius: 16, border: `1px solid ${UI.hair}`, background: UI.bone, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: UI.muted }}>Loan-to-value</div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 30, lineHeight: 1.1, color: lvr > 80 ? UI.red : lvr > 70 ? UI.amber : UI.ink, fontVariantNumeric: "tabular-nums" }}>{lvr.toFixed(1)}%</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: UI.muted, marginBottom: 4 }}>Loan amount</div>
                    <div style={{ position: "relative", width: 140 }}>
                      <input type="number" value={la} onChange={e => {
                        const v = Number(e.target.value) || 0;
                        setLa(Math.min(v, pp));
                        setLvrInput(pp > 0 ? Math.round(v / pp * 1000) / 10 : 0);
                      }}
                        className="w-full rounded-lg bg-white px-3 py-2 text-right outline-none focus:border-[#0891b2]"
                        style={{ border: `1px solid ${UI.hair}`, color: UI.ink, fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 500, fontVariantNumeric: "tabular-nums" }} />
                      <span className="pointer-events-none" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: UI.faint }}>$</span>
                    </div>
                  </div>
                </div>
                <div style={{ position: "relative", height: 24, marginTop: 8, cursor: "pointer" }} onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width * 100));
                  setLvrInput(pct);
                  setLa(Math.round(pp * pct / 100));
                }}>
                  <div style={{ position: "absolute", inset: 0, borderRadius: 999, overflow: "hidden", background: "rgba(18,30,26,0.06)" }}>
                    <div style={{ width: "70%", position: "absolute", inset: 0, background: UI.green, opacity: 0.1 }} />
                    <div style={{ width: "10%", left: "70%", position: "absolute", inset: 0, background: UI.amber, opacity: 0.12 }} />
                    <div style={{ width: "20%", left: "80%", position: "absolute", inset: 0, background: UI.red, opacity: 0.12 }} />
                  </div>
                  <div style={{ height: "100%", borderRadius: 999, transition: "all .2s", width: `${Math.min(lvr, 100)}%`, background: lvr > 80 ? UI.red : lvr > 70 ? UI.amber : UI.green }} />
                  <div style={{ position: "absolute", top: 0, height: "100%", width: 2, background: "rgba(251,249,244,0.9)", left: "70%" }} />
                  <div style={{ position: "absolute", top: 0, height: "100%", width: 2, background: "rgba(251,249,244,0.9)", left: "80%" }} />
                  <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", height: 16, width: 16, borderRadius: 999, background: "#fff", border: "2px solid", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", left: `calc(${Math.min(lvr, 100)}% - 8px)`, borderColor: lvr > 80 ? UI.red : lvr > 70 ? UI.amber : UI.green }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: UI.faint }}>
                  <span>Deposit ${Math.round(pp - la).toLocaleString()}</span>
                  <span style={{ color: lvr > 80 ? UI.red : lvr > 70 ? UI.amber : UI.green, fontWeight: 500 }}>{lvr > 80 ? "LMI applies" : lvr > 70 ? "Borderline" : "No LMI needed"}</span>
                </div>
              </div>

              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
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
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", paddingTop: 2 }}>
                  <input type="checkbox" checked={gf} onChange={e => setGf(e.target.checked)} style={{ height: 16, width: 16, accentColor: UI.teal }} />
                  <span style={{ fontSize: 12.5, color: UI.muted }}>Property has a granny flat (dual income)</span>
                </label>
              </div>
            </Card>

            {/* Chart */}
            <Card style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                <div>
                  <Eyebrow>Projection</Eyebrow>
                  <Title>{tabTitle}</Title>
                  <p style={{ fontSize: 12, color: UI.faintInk, margin: "3px 0 0" }}>{tabSub}</p>
                </div>
                <Segmented value={tab} onChange={setTab} options={[{ label: "Equity", value: "equity" }, { label: "Loan", value: "amort" }, { label: "Yield", value: "yield" }]} />
              </div>

              {tab === "equity" && (
                <>
                  <ResponsiveContainer width="100%" height={300}>
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
                  <div style={{ marginTop: 12 }}><LegendChips items={[{ label: "Property", color: UI.ink2 }, { label: "Loan", color: UI.faint }, { label: "Equity", color: UI.teal }]} /></div>
                </>
              )}

              {tab === "amort" && (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={amortData.slice(0, 15)} margin={{ top: 5, right: 10, left: -6, bottom: 0 }} barCategoryGap="22%">
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                      <XAxis dataKey="year" tick={AXIS_TICK} tickFormatter={v => "Y" + v} />
                      <YAxis tick={AXIS_TICK} tickFormatter={fmtK} />
                      <Tooltip cursor={{ fill: "rgba(15,23,42,0.03)" }} content={<ChartTooltip />} />
                      <Bar dataKey="principal" name="Principal" stackId="a" fill={UI.teal} animationDuration={CHART.animationMs} />
                      <Bar dataKey="interest" name="Interest" stackId="a" fill={UI.faint} radius={[4, 4, 0, 0]} animationDuration={CHART.animationMs} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: 12 }}><LegendChips items={[{ label: "Principal", color: UI.teal }, { label: "Interest", color: UI.faint }]} /></div>
                </>
              )}

              {tab === "yield" && (
                <ResponsiveContainer width="100%" height={300}>
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
            </Card>
          </div>
        </div>

        {/* ── LEDGERS: BREAK-EVEN + ANNUAL CASH FLOW ── */}
        <div className="wh-rise" style={{ animationDelay: "240ms", display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginBottom: 22 }}>
          <Card>
            <Eyebrow>Break-even</Eyebrow>
            <Title>What it takes to wash its face</Title>
            <div style={{ marginTop: 12 }}>
              <LedgerRow label="Rent to break even" sub={`${fmt$(Math.round(breakEvenRentAnnual))} / yr`} value={`${fmt$(Math.round(breakEvenRentWeekly))}/wk`} />
              <LedgerRow label="Current rent" sub={`${mr}/wk main${gf ? ` + ${gr}/wk granny` : ""}`} value={`${fmt$(currentRentWeekly)}/wk`} />
              <LedgerRow label="Weekly gap" sub={rentGapWeekly <= 0 ? "above break-even" : "below break-even"} value={rentGapWeekly <= 0 ? `+${fmt$(Math.round(-rentGapWeekly))}` : `−${fmt$(Math.round(rentGapWeekly))}`} valueColor={rentGapWeekly <= 0 ? UI.green : UI.red} />
              <LedgerRow last label="Time to break even" sub={breakEvenYear !== null ? "at 3% rent growth" : "at current growth"} value={breakEvenYear !== null ? `${breakEvenYear} yrs` : "30+ yrs"} valueColor={breakEvenYear !== null ? UI.ink : UI.red} />
            </div>
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ height: 6, flex: 1, borderRadius: 999, overflow: "hidden", background: "rgba(18,30,26,0.08)" }}>
                <div style={{ height: "100%", borderRadius: 999, transition: "width .3s", width: `${Math.min(100, bePct)}%`, background: currentRentWeekly >= breakEvenRentWeekly ? UI.green : UI.amber }} />
              </div>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 500, color: currentRentWeekly >= breakEvenRentWeekly ? UI.green : UI.amber }}>{bePct}%</span>
            </div>
          </Card>

          <Card>
            <Eyebrow>Cash flow</Eyebrow>
            <Title>Annual statement</Title>
            <div style={{ marginTop: 12 }}>
              <LedgerRow label="Gross rent" sub={`${mr}/wk main${gf ? ` + ${gr}/wk granny` : ""}`} value={fmt$(yrRent)} />
              <LedgerRow label="Vacancy" sub={`${vr}% allowance`} value={`−${fmt$(Math.round(yrRent - effRent))}`} valueColor={UI.faintInk} />
              <LedgerRow label="Operating expenses" sub={`${mgmt}% mgmt · rates · ins · maint`} value={`−${fmt$(tae)}`} valueColor={UI.faintInk} />
              <LedgerRow label="Loan cost" sub={`${ir.toFixed(1)}% · ${ltType === "interestOnly" ? "IO" : "P&I"}`} value={`−${fmt$(Math.round(tyLR))}`} valueColor={UI.faintInk} />
              <LedgerRow strong last label="Net cash flow" sub={`${wcfBT >= 0 ? "+" : "−"}$${Math.abs(Math.round(wcfBT))}/wk before tax`} value={`${ycfBT >= 0 ? "+" : "−"}${fmt$(Math.abs(Math.round(ycfBT)))}`} valueColor={ycfBT >= 0 ? UI.green : UI.red} />
            </div>
            <p style={{ fontSize: 11, color: UI.faint, marginTop: 12 }}>A 1% rate rise adds ~${rateSens}/wk to repayments.</p>
          </Card>
        </div>

        {/* ── TIMELINE + INSIGHTS ── */}
        <div className="wh-rise" style={{ animationDelay: "300ms", display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <Card>
            <Eyebrow>Timeline</Eyebrow>
            <Title>Equity & ROI over time</Title>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${UI.hair}` }}>
                    {["Year", "Value", "Equity", "Cash flow", "Net position", "ROI"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "0 8px 8px 0", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: UI.muted }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ fontFamily: FONT_DISPLAY, fontVariantNumeric: "tabular-nums" }}>
                  {[yr1, projectYear(3), yr5, projectYear(7), yr10].map(r => (
                    <tr key={r.y} style={{ borderBottom: `1px solid ${UI.hair}` }}>
                      <td style={{ padding: "11px 8px 11px 0", fontSize: 13, fontWeight: 500, color: UI.faintInk }}>{r.y}y</td>
                      <td style={{ padding: "11px 8px 11px 0", fontSize: 14, fontWeight: 500 }}>{fmt$(r.pv)}</td>
                      <td style={{ padding: "11px 8px 11px 0", fontSize: 14, fontWeight: 500, color: UI.teal }}>{fmt$(r.eq)}</td>
                      <td style={{ padding: "11px 8px 11px 0", fontSize: 14, color: r.cf >= 0 ? UI.green : UI.red }}>{r.cf >= 0 ? "+" : "−"}{fmt$(Math.abs(r.cf))}</td>
                      <td style={{ padding: "11px 8px 11px 0", fontSize: 14, fontWeight: 500 }}>{fmt$(r.neq)}</td>
                      <td style={{ padding: "11px 0", fontSize: 14, fontWeight: 500 }}>{r.roi}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 10.5, color: UI.faint, marginTop: 10 }}>3% rent growth, 2.5% expense inflation applied. After-tax returns depend on marginal rate and depreciation.</p>
          </Card>

          <Card>
            <Eyebrow>Analysis</Eyebrow>
            <Title>What the numbers say</Title>
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              {analysis.map((a, i) => (
                <InsightCard key={i} type={a.type} title={a.title} detail={a.detail.replace(/\*\*/g, "")} />
              ))}
            </div>
            <p style={{ fontSize: 10.5, color: UI.faint, marginTop: 12 }}>Rule-based analysis. Always verify with a qualified advisor.</p>
          </Card>
        </div>
      </div>
    </ClientPortalShell>
  );
}

