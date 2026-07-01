"use client";

import { useState, useMemo } from "react";
import { ClientPortalShell } from "../../../_components/ClientPortalShell";
import { Home, DollarSign, Percent, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ComposedChart, Line, Area,
} from "recharts";

export default function BorrowingPowerEstimator() {
  const [income, setIncome] = useState(150000);
  const [pi, setPi] = useState(0);
  const [deposit, setDeposit] = useState(150000);
  const [other, setOther] = useState(300);
  const [cc, setCc] = useState(0);
  const [ir, setIr] = useState(6.3);
  const [lt, setLt] = useState(30);
  const [le, setLe] = useState(2500);
  const [expanded, setExpanded] = useState(false);

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
  const estRepay = safeDiv(maxB * rm * Math.pow(1 + rm, tpm), Math.pow(1 + rm, tpm) - 1);
  const below80 = lvr <= 80;

  const fmt$ = (n: number) => "$" + Math.round(n).toLocaleString("en-AU");
  const fmt1k = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : Math.round(n).toLocaleString("en-AU");

  // Affordability data
  const affordData = [
    { name: "Monthly Income", value: mi, fill: "#16a34a" },
    { name: "Living Expenses", value: -le, fill: "#dc2626" },
    { name: "Other Loans", value: -other, fill: "#f59e0b" },
    { name: "Card Liability", value: -(cc * 0.036), fill: "#dc2626" },
    { name: "Available for Loan", value: avail, fill: "#0891b2" },
  ];

  // LVR color zones
  const lvrData = [
    { name: "Equity", value: 100 - Math.min(lvr, 100), fill: "#16a34a" },
    { name: "Loan", value: Math.min(lvr, 100), fill: lvr > 80 ? "#dc2626" : lvr > 70 ? "#f59e0b" : "#0891b2" },
  ];

  // Rate sensitivity
  const rateData = [0, 0.5, 1, 1.5, 2, 3].map(delta => {
    const r = (ir + delta) / 100 / 12;
    const pow = Math.pow(1 + r, tpm);
    const repay = safeDiv(maxB * r * pow, pow - 1);
    return { name: "+" + delta + "%", repay: Math.round(repay), delta: Math.round(repay - estRepay) };
  });

  return (
    <ClientPortalShell>
      <div style={{ maxWidth: 1060 }}>
        <a href="/client/calculators" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0891b2] hover:underline mb-3">&larr; Back to Calculators</a>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d4a84b]/10">
            <Home className="h-6 w-6 text-[#d4a84b]" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d4a84b]">Calculator</p>
            <h1 className="text-xl font-bold tracking-tight text-[#1A2B3C]">Borrowing Power Estimator</h1>
            <p className="text-xs text-[#5C6670]">How much can you borrow? Income, expenses, and lender stress testing.</p>
          </div>
        </div>

        {/* ── COMPACT INPUTS ── */}
        <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 mb-5 shadow-sm">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5C6670] mb-3">Adjust any number. Everything updates instantly.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Your Income", val: income, set: setIncome, suffix: "$/yr" },
              { label: "Partner Income", val: pi, set: setPi, suffix: "$/yr" },
              { label: "Deposit", val: deposit, set: setDeposit, suffix: "$" },
              { label: "Interest Rate", val: ir, set: setIr, suffix: "%", step: 0.1 },
              { label: "Loan Term", val: lt, set: setLt, isSelect: true, opts: [{ label: "20yr", value: "20" }, { label: "25yr", value: "25" }, { label: "30yr", value: "30" }] },
            ].map((f: any, i) => (
              <div key={i}>
                <label className="block text-[9px] font-medium text-[#5C6670] mb-0.5">{f.label}</label>
                {f.isSelect ? (
                  <select value={f.val} onChange={e => f.set(Number(e.target.value))}
                    className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-2 py-1.5 text-[11px] text-[#1A2B3C] outline-none focus:border-[#d4a84b] transition-colors appearance-none cursor-pointer">
                    {f.opts.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <div className="relative">
                    <input type="number" value={f.val} onChange={e => f.set(Number(e.target.value) || 0)}
                      step={f.step ?? 1}
                      className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-2 py-1.5 text-[11px] text-[#1A2B3C] outline-none focus:border-[#d4a84b] transition-colors text-right" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#9CA3AF] pointer-events-none">{f.suffix}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => setExpanded(!expanded)} className="mt-3 text-[10px] font-medium text-[#0891b2] hover:underline">
            {expanded ? "Hide" : "Show"} expenses &amp; liabilities
          </button>
          {expanded && (
            <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-[rgba(0,0,0,0.06)]">
              {[
                { label: "Living Expenses", val: le, set: setLe, suffix: "$/mo" },
                { label: "Other Loans", val: other, set: setOther, suffix: "$/mo" },
                { label: "Credit Cards", val: cc, set: setCc, suffix: "$ limit" },
              ].map((f: any, i) => (
                <div key={i}>
                  <label className="block text-[9px] font-medium text-[#5C6670] mb-0.5">{f.label}</label>
                  <div className="relative">
                    <input type="number" value={f.val} onChange={e => f.set(Number(e.target.value) || 0)}
                      className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-2 py-1.5 text-[11px] text-[#1A2B3C] outline-none focus:border-[#d4a84b] transition-colors text-right" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#9CA3AF] pointer-events-none">{f.suffix}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── KEY METRICS ── */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          <MetricMini label="Max Borrow" val={fmt$(Math.round(maxB))} color="#0891b2" sub={`stressed at ${stress.toFixed(1)}%`} />
          <MetricMini label="Est. Property" val={fmt$(Math.round(pp))} color="#d4a84b" sub={`loan + $${Math.round(deposit).toLocaleString()} dep`} />
          <MetricMini label="Loan-to-Value" val={lvr.toFixed(1) + "%"} color={lvr > 80 ? "#dc2626" : lvr > 70 ? "#f59e0b" : "#16a34a"} sub={below80 ? "Under 80% - no LMI" : "Over 80% - LMI may apply"} />
          <MetricMini label="Monthly Repay" val={fmt$(Math.round(estRepay))} color="#16a34a" sub={`${ir.toFixed(1)}% over ${lt}yr P&I`} />
          <MetricMini label="Total Income" val={fmt$(Math.round(ti))} color="#16a34a" sub={`$${Math.round(mi).toLocaleString()}/mo`} />
          <MetricMini label="Monthly Surplus" val={fmt$(Math.round(avail))} color={avail >= 0 ? "#0891b2" : "#dc2626"} sub="after expenses" />
          <MetricMini label="Stress Rate" val={stress.toFixed(1) + "%"} color="#f59e0b" sub="APRA +3% buffer" />
          <MetricMini label="Stressed Repay" val={fmt$(Math.round(safeDiv(maxB * srm * Math.pow(1 + srm, tpm), Math.pow(1 + srm, tpm) - 1)))} color="#dc2626" sub={`at ${stress.toFixed(1)}%`} />
        </div>

        {/* ── BIG CHARTS ── */}
        <div className="grid gap-5 md:grid-cols-2 mb-5">
          {/* Affordability */}
          <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 md:p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670] mb-3">Monthly Affordability</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={affordData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barSize={45}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#9CA3AF" }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 9, fill: "#9CA3AF" }} tickFormatter={v => "$" + fmt1k(v)} />
                <Tooltip content={({ active, payload }: any) =>
                  active && payload ? <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3 shadow-lg">
                    <p className="text-xs font-semibold" style={{ color: payload[0]?.color }}>{payload[0]?.payload?.name}: {fmt$(Math.abs(Math.round(payload[0]?.value || 0)))}</p>
                  </div> : null
                } />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {affordData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Rate Sensitivity */}
          <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 md:p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670] mb-3">Rate Sensitivity</p>
            <p className="text-[9px] text-[#5C6670] mb-2">How rate rises affect your monthly payment</p>
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={rateData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "#9CA3AF" }} tickFormatter={v => "$" + fmt1k(v)} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "#9CA3AF" }} tickFormatter={v => "+$" + fmt1k(v)} />
                <Tooltip content={({ active, payload }: any) =>
                  active && payload ? <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3 shadow-lg">
                    <p className="text-xs font-semibold text-[#1A2B3C]">{payload[0]?.payload?.name}</p>
                    <p className="text-xs" style={{ color: "#0891b2" }}>Repayment: ${Math.round(payload[0]?.payload?.repay).toLocaleString()}</p>
                    <p className="text-xs" style={{ color: "#dc2626" }}>Extra: ${Math.round(payload[0]?.payload?.delta).toLocaleString()}/mo</p>
                  </div> : null
                } />
                <Bar yAxisId="left" dataKey="repay" radius={[4, 4, 0, 0]} barSize={40} fill="#0891b2" />
                <Line yAxisId="right" dataKey="delta" stroke="#dc2626" strokeWidth={2} dot={{ r: 4, fill: "#dc2626" }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2 text-[8px] text-[#5C6670]">
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-1 rounded bg-[#0891b2]"/> Repayment</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-0.5 rounded bg-[#dc2626]"/> Extra cost</span>
            </div>
          </div>
        </div>

        {/* ── LVR VISUALIZATION ── */}
        <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 md:p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670]">Loan-to-Value Ratio</p>
            <p className="text-lg font-bold" style={{ color: lvr > 80 ? "#dc2626" : lvr > 70 ? "#f59e0b" : "#16a34a" }}>{lvr.toFixed(1)}%</p>
          </div>
          <div className="h-4 w-full rounded-full bg-gray-100 overflow-hidden relative">
            <div className="absolute inset-0 flex" style={{ width: "100%" }}>
              <div style={{ width: "70%", background: "#16a34a", opacity: 0.15 }} />
              <div style={{ width: "10%", background: "#f59e0b", opacity: 0.15 }} />
              <div style={{ width: "20%", background: "#dc2626", opacity: 0.15 }} />
            </div>
            <div className="h-full rounded-full transition-all duration-300" style={{
              width: `${Math.min(lvr, 100)}%`,
              background: lvr > 80 ? "#dc2626" : lvr > 70 ? "#f59e0b" : "#16a34a",
            }} />
            <div className="absolute top-0 left-[70%] h-full w-0.5 bg-[#16a34a]" style={{ opacity: 0.6 }} />
            <div className="absolute top-0 left-[80%] h-full w-0.5 bg-[#f59e0b]" style={{ opacity: 0.6 }} />
          </div>
          <div className="flex justify-between mt-1 text-[8px] text-[#5C6670]">
            <span>0%</span>
            <span style={{ color: "#16a34a" }}>70% No LMI</span>
            <span style={{ color: "#f59e0b" }}>80% LMI zone</span>
            <span>100%</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg bg-[#f0fdf4] p-3 border border-green-100">
              <p className="text-[9px] text-green-700">Loan Amount</p>
              <p className="text-sm font-bold text-green-600">{fmt$(Math.round(maxB))}</p>
            </div>
            <div className="rounded-lg bg-[#f0f9ff] p-3 border border-[#0891b2]/20">
              <p className="text-[9px] text-[#0891b2]">Deposit</p>
              <p className="text-sm font-bold text-[#0891b2]">{fmt$(deposit)}</p>
            </div>
            <div className="rounded-lg bg-[#1A2B3C] p-3 border border-[rgba(255,255,255,0.08)]">
              <p className="text-[9px] text-white/60">Property Price</p>
              <p className="text-sm font-bold text-white">{fmt$(Math.round(pp))}</p>
            </div>
          </div>
          <p className="mt-3 text-[9px] text-[#9CA3AF]">This is an estimate only. Speak with a mortgage broker or Nick for pre-approval figures.</p>
        </div>
      </div>
    </ClientPortalShell>
  );
}

function MetricMini({ label, val, color, sub }: { label: string; val: string; color: string; sub: string }) {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-[8px] font-semibold uppercase tracking-wider text-[#5C6670] truncate">{label}</p>
      <p className="mt-0.5 text-sm font-bold" style={{ color }}>{val}</p>
      <p className="text-[8px] text-[#9CA3AF] truncate">{sub}</p>
    </div>
  );
}

function safeDiv(a: number, b: number): number {
  return b === 0 || !isFinite(b) || a <= 0 ? 0 : a / b;
}
