"use client";

import { useState, useMemo, useCallback } from "react";
import { ClientPortalShell } from "../../../_components/ClientPortalShell";
import {
  TrendingUp, DollarSign, Home, Building2, Percent, Calendar,
  Calculator, Lightbulb, AlertTriangle, CheckCircle2, ArrowRight,
  ChevronDown, ChevronUp, Zap, BarChart3, PieChart, LineChart,
  AreaChart, Gauge,
} from "lucide-react";
import {
  AreaChart as ReAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, Cell, ComposedChart, Line,
} from "recharts";

type State = "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";
type PaymentFreq = "weekly" | "fortnightly" | "monthly";

const STATE_NAMES: Record<State, string> = {
  NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland",
  WA: "Western Australia", SA: "South Australia", TAS: "Tasmania",
  ACT: "ACT", NT: "Northern Territory",
};

const FREQ_LABELS: Record<PaymentFreq, string> = {
  weekly: "Weekly", fortnightly: "Fortnightly", monthly: "Monthly",
};
const FREQ_PER_YEAR: Record<PaymentFreq, number> = { weekly: 52, fortnightly: 26, monthly: 12 };

function calcStampDuty(price: number, state: State): number {
  if (price <= 0) return 0;
  switch (state) {
    case "NSW": {
      if (price <= 16000) return price * 0.0125;
      if (price <= 35000) return 200 + (price - 16000) * 0.015;
      if (price <= 93000) return 485 + (price - 35000) * 0.0175;
      if (price <= 351000) return 1500 + (price - 93000) * 0.035;
      if (price <= 1168000) return 10530 + (price - 351000) * 0.045;
      return 47295 + (price - 1168000) * 0.055;
    }
    case "VIC": {
      if (price <= 25000) return price * 0.014;
      if (price <= 130000) return 350 + (price - 25000) * 0.024;
      if (price <= 960000) return 2870 + (price - 130000) * 0.05;
      if (price <= 2000000) return 44370 + (price - 960000) * 0.055;
      return 110000 + (price - 2000000) * 0.065;
    }
    case "QLD": {
      if (price <= 5000) return 0;
      if (price <= 75000) return (price - 5000) * 0.015;
      if (price <= 540000) return 1050 + (price - 75000) * 0.035;
      if (price <= 1000000) return 17325 + (price - 540000) * 0.045;
      return 38025 + (price - 1000000) * 0.0575;
    }
    case "WA": {
      let duty: number;
      if (price <= 120000) duty = price * 0.019;
      else if (price <= 150000) duty = 2280 + (price - 120000) * 0.0285;
      else if (price <= 360000) duty = 3135 + (price - 150000) * 0.038;
      else if (price <= 725000) duty = 11115 + (price - 360000) * 0.0475;
      else duty = 28453 + (price - 725000) * 0.0515;
      return duty;
    }
    case "SA": {
      if (price <= 12000) return price * 0.01;
      if (price <= 30000) return 120 + (price - 12000) * 0.02;
      if (price <= 50000) return 480 + (price - 30000) * 0.03;
      if (price <= 100000) return 1080 + (price - 50000) * 0.035;
      if (price <= 200000) return 2830 + (price - 100000) * 0.04;
      if (price <= 250000) return 6830 + (price - 200000) * 0.0425;
      if (price <= 300000) return 8955 + (price - 250000) * 0.0475;
      if (price <= 500000) return 11330 + (price - 300000) * 0.05;
      return 21330 + (price - 500000) * 0.055;
    }
    case "TAS": {
      if (price <= 3000) return 50;
      if (price <= 25000) return 50 + (price - 3000) * 0.0175;
      if (price <= 75000) return 435 + (price - 25000) * 0.0225;
      if (price <= 200000) return 1560 + (price - 75000) * 0.035;
      if (price <= 375000) return 5935 + (price - 200000) * 0.04;
      if (price <= 725000) return 12935 + (price - 375000) * 0.0425;
      return 27810 + (price - 725000) * 0.045;
    }
    case "ACT": {
      if (price <= 260000) return price * 0.0028;
      if (price <= 300000) return 728 + (price - 260000) * 0.022;
      if (price <= 500000) return 1608 + (price - 300000) * 0.034;
      if (price <= 750000) return 8408 + (price - 500000) * 0.0432;
      if (price <= 1000000) return 19208 + (price - 750000) * 0.059;
      if (price <= 1455000) return 33958 + (price - 1000000) * 0.064;
      return price * 0.0454;
    }
    case "NT": {
      if (price <= 525000) { const V = price / 1000; return 0.06571441 * V * V + 15 * V; }
      if (price <= 3000000) return price * 0.0495;
      if (price <= 5000000) return price * 0.0575;
      return price * 0.0595;
    }
  }
}

function fmt(n: number) { return n.toLocaleString("en-AU", { maximumFractionDigits: 0 }); }
function fmtK(n: number) { return n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : fmt(n); }
function fmt$(n: number) { return "$" + fmt(n); }

export default function InvestmentAnalyzer() {
  // ── State ──
  const [pp, setPp] = useState(729000);
  const [st, setSt] = useState<State>("NSW");
  const [gf, setGf] = useState(true);
  const [sdO, setSdO] = useState<number | null>(null);
  const [la, setLa] = useState(583200);
  const [ir, setIr] = useState(6.3);
  const [lt, setLt] = useState(30);
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
  const [csv, setCsv] = useState(50000);
  const [elr, setElr] = useState(0);
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
  const mrRepay = la > 0 && rm > 0 ? (la * rm * Math.pow(1 + rm, tpm)) / (Math.pow(1 + rm, tpm) - 1) : 0;
  const fp = pf === "monthly" ? mrRepay : pf === "fortnightly" ? mrRepay * 12 / 26 : mrRepay * 12 / 52;
  const tyLR = mrRepay * 12;
  const tioL = la > 0 ? mrRepay * tpm - la : 0;
  const nri = effRent - tae;
  const ycfBT = nri - tyLR;
  const wcfBT = ycfBT / 52;
  const initInv = dep + tbc;
  const gy = pp > 0 ? (yrRent / pp) * 100 : 0;
  const nyBL = pp > 0 ? (nri / pp) * 100 : 0;
  const nyOI = initInv > 0 ? (nri / initInv) * 100 : 0;

  // ── Projections ──
  function projectYear(y: number) {
    const gm = Math.pow(1 + cgr / 100, y);
    const pv = pp * gm;
    const eq = pv - la;
    const totalCF = y > 0 ? Array.from({ length: y }, (_, i) => {
      const rg = 1.03 ** i; const eg = 1.025 ** i;
      return (yrRent * (1 - vr / 100) * rg - tae * eg) - mrRepay * 12;
    }).reduce((a, b) => a + b, 0) : 0;
    const neq = eq + Math.max(0, totalCF);
    const tr = neq - initInv;
    const roi = initInv > 0 ? (tr / initInv) * 100 : 0;
    const aroi = y > 0 ? (Math.pow(1 + roi / 100, 1 / y) - 1) * 100 : 0;
    const sc = pv * (scp / 100);
    return { y, pv: Math.round(pv), eq: Math.round(eq), cf: Math.round(totalCF), neq: Math.round(neq), tr: Math.round(tr), roi: Math.round(roi * 10) / 10, aroi: Math.round(aroi * 10) / 10, sc: Math.round(sc) };
  }

  const yr1 = useMemo(() => projectYear(1), [pp, la, cgr, scp, yrRent, vr, tae, mrRepay, initInv]);
  const yr5 = useMemo(() => projectYear(5), [pp, la, cgr, scp, yrRent, vr, tae, mrRepay, initInv]);
  const yr10 = useMemo(() => projectYear(10), [pp, la, cgr, scp, yrRent, vr, tae, mrRepay, initInv]);

  // ── Chart data ──
  const equityData = useMemo(() =>
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30].map(y => {
      const p = projectYear(y);
      return { year: y, propertyValue: p.pv, loanBalance: la, equity: p.eq, cashflow: p.cf };
    }), [pp, la, cgr, scp, yrRent, vr, tae, mrRepay, initInv]);

  const amortData = useMemo(() =>
    Array.from({ length: Math.min(lt, 30) }, (_, i) => {
      const y = i + 1;
      const bal = la * (1 + rm) ** (y * 12) - mrRepay * ((1 + rm) ** (y * 12) - 1) / rm;
      const totalPd = mrRepay * y * 12;
      const intPd = totalPd - (la - Math.max(0, bal));
      const prinPd = totalPd - intPd;
      return {
        year: y,
        remaining: Math.round(Math.max(0, bal)),
        interest: Math.round(intPd),
        principal: Math.round(prinPd),
        totalPaid: Math.round(totalPd),
      };
    }), [la, rm, mrRepay, lt]);

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
    if (gf) {
      const wgf = mr * 52 / pp * 100;
      ins.push({ type: "positive", title: `Granny Flat Adds ${(gy - wgf).toFixed(1)}% Yield`, detail: `Granny flat contributes **$${gr}/week**. Without it: ${wgf.toFixed(1)}% gross yield.` });
    }
    if (ci > 0) {
      const dti = (tyLR / ci) * 100;
      if (dti < 30) ins.push({ type: "positive", title: "Healthy DTI", detail: `${dti.toFixed(0)}% debt-to-income. Strong position to proceed.` });
      else ins.push({ type: "warning", title: `DTI at ${dti.toFixed(0)}%`, detail: `Consider lower entry price or larger deposit.` });
    }
    return ins;
  }, [wcfBT, lvr, gy, cgr, yr5, ir, la, tpm, mrRepay, gf, gr, mr, pp, initInv, ci, tyLR]);

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
            <InputStrip id="row1" items={[
              { label: "Purchase Price", val: pp, set: setPp, suffix: "$" },
              { label: "State", val: st, set: setSt, isSelect: true, opts: Object.entries(STATE_NAMES).map(([k, v]) => ({ label: v, value: k })) },
              { label: "Loan Amount", val: la, set: setLa, suffix: "$" },
              { label: "Interest Rate", val: ir, set: setIr, step: 0.1, suffix: "%" },
              { label: "Term", val: lt, set: setLt, isSelect: true, opts: [{ label: "20 years", value: "20" }, { label: "25 years", value: "25" }, { label: "30 years", value: "30" }] },
            ]} />
            <InputStrip id="row2" items={[
              { label: "Pay Frequency", val: pf, set: setPf, isSelect: true, opts: [{ label: "Weekly", value: "weekly" }, { label: "Fortnightly", value: "fortnightly" }, { label: "Monthly", value: "monthly" }] },
              { label: "Main Rent /wk", val: mr, set: setMr, suffix: "$" },
              { label: "Granny Rent /wk", val: gr, set: setGr, suffix: "$", disabled: !gf },
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
                <ReAreaChart data={yieldMeterData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                  <YAxis tick={{ fontSize: 9, fill: "#9CA3AF" }} tickFormatter={v => v + "%"} domain={[0, 'auto']} />
                  <Tooltip content={<>{null}</>} />
                  <BarChart data={yieldMeterData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <Bar dataKey="value" name="Yield" radius={[6, 6, 0, 0]} barSize={80}>
                      {yieldMeterData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                    <Tooltip content={({ active, payload }: any) => {
                      if (!active || !payload) return null;
                      return <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3 shadow-lg"><p className="text-xs font-semibold" style={{ color: payload[0]?.color }}>{payload[0]?.payload?.name}: {payload[0]?.value?.toFixed(2)}%</p></div>;
                    }} />
                  </BarChart>
                </ReAreaChart>
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
          <MetricMini label="Monthly Repay" val={fmt$(Math.round(mrRepay))} color="#1A2B3C" sub={lt + "yr P&I"} />
          <MetricMini label="Total Interest" val={fmt$(Math.round(tioL))} color="#dc2626" sub="over loan life" />
          <MetricMini label="Initial Outlay" val={fmt$(initInv)} color="#7c3aed" sub={fmt$(dep) + " dep + " + fmt$(tbc) + " costs"} />
          <MetricMini label="10-Yr Value" val={fmt$(yr10.pv)} color="#7c3aed" sub={"+$" + fmt(yr10.pv - pp) + " growth"} />
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
              <p className="text-[9px] text-[#5C6670]">{ir.toFixed(1)}% · ${fmt(Math.round(fp))} {pf}</p>
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

// ── Mini Metric ──
function MetricMini({ label, val, color, sub }: { label: string; val: string; color: string; sub: string }) {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-[8px] font-semibold uppercase tracking-wider text-[#5C6670] truncate">{label}</p>
      <p className="mt-0.5 text-sm font-bold" style={{ color }}>{val}</p>
      <p className="text-[8px] text-[#9CA3AF] truncate">{sub}</p>
    </div>
  );
}
