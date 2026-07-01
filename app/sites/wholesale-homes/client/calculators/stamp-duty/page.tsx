"use client";

import { useState, useMemo } from "react";
import { ClientPortalShell } from "../../../_components/ClientPortalShell";
import { DollarSign } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  calcStampDuty as calcSD, STATE_NAMES, STATES, STATE_COLORS, type State,
  fmtAUD as fmt$, fmtCompact as fmt1k, Row,
} from "../_shared";

export default function StampDutyCalculator() {
  const [price, setPrice] = useState(729000);
  const [state, setState] = useState<State>("NSW");

  const duty = calcSD(price, state);
  const dutyPct = price > 0 ? (duty / price) * 100 : 0;
  const total = price + duty;

  const allStatesData = useMemo(() =>
    STATES.map(s => ({
      name: s,
      value: Math.round(calcSD(price, s)),
      fill: STATE_COLORS[s],
      full: STATE_NAMES[s],
    })), [price]);

  return (
    <ClientPortalShell>
      <div style={{ maxWidth: 1060 }}>
        <a href="/client/calculators" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0891b2] hover:underline mb-3">&larr; Back to Calculators</a>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#16a34a]/10">
            <DollarSign className="h-6 w-6 text-[#16a34a]" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#16a34a]">Calculator</p>
            <h1 className="text-xl font-bold tracking-tight text-[#1A2B3C]">Stamp Duty Calculator</h1>
            <p className="text-xs text-[#5C6670]">Compare stamp duty across every Australian state instantly.</p>
          </div>
        </div>

        {/* ── COMPACT INPUTS ── */}
        <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 mb-5 shadow-sm">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5C6670] mb-3">Adjust any number. Everything updates instantly.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[9px] font-medium text-[#5C6670] mb-0.5">Property Price</label>
              <div className="relative">
                <input type="number" value={price} onChange={e => setPrice(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-2 py-1.5 text-[11px] text-[#1A2B3C] outline-none focus:border-[#16a34a] transition-colors text-right" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#9CA3AF] pointer-events-none">$</span>
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-medium text-[#5C6670] mb-0.5">State</label>
              <select value={state} onChange={e => setState(e.target.value as State)}
                className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-2 py-1.5 text-[11px] text-[#1A2B3C] outline-none focus:border-[#16a34a] transition-colors appearance-none cursor-pointer">
                {STATES.map(s => <option key={s} value={s}>{s} - {STATE_NAMES[s]}</option>)}
              </select>
            </div>
            <div className="rounded-lg bg-[#f0fdf4] border border-green-100 px-3 py-2 flex items-center justify-between">
              <div><p className="text-[8px] font-medium text-green-700">Stamp Duty</p><p className="text-sm font-bold text-green-600">{fmt$(duty)}</p></div>
              <div className="text-right"><p className="text-[8px] font-medium text-green-700">% of Price</p><p className="text-sm font-bold text-green-600">{dutyPct.toFixed(2)}%</p></div>
            </div>
            <div className="rounded-lg bg-[#1A2B3C] px-3 py-2 flex items-center justify-between">
              <div><p className="text-[8px] font-medium text-white/60">Total Upfront</p><p className="text-sm font-bold text-white">{fmt$(total)}</p></div>
              <div className="text-right"><p className="text-[8px] font-medium text-white/60">in {STATE_NAMES[state]}</p></div>
            </div>
          </div>
        </div>

        {/* ── BIG CHART: State Comparison ── */}
        <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 md:p-6 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670]">Stamp Duty by State</p>
              <p className="text-xs text-[#5C6670]">On a {fmt$(price)} property</p>
            </div>
            <div className="flex gap-3 text-[9px]">
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#16a34a" }}/> Selected</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#d1d5db" }}/> Others</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={allStatesData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 9, fill: "#9CA3AF" }} tickFormatter={v => "$" + fmt1k(v)} />
              <Tooltip content={({ active, payload }: any) =>
                active && payload ? <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3 shadow-lg">
                  <p className="text-[10px] font-medium text-[#5C6670]">{payload[0]?.payload?.full}</p>
                  <p className="text-xs font-bold" style={{ color: payload[0]?.color }}>{fmt$(payload[0]?.value || 0)}</p>
                  <p className="text-[9px] text-[#5C6670]">{((payload[0]?.value || 0) / price * 100).toFixed(2)}% of price</p>
                </div> : null
              } />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {allStatesData.map((e, i) => (
                  <Cell key={i} fill={e.name === state ? e.fill : "#e5e7eb"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── RESULTS ── */}
        <div className="grid gap-5 md:grid-cols-2 mb-6">
          <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 md:p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670] mb-3">Cost Breakdown for {STATE_NAMES[state]}</p>
            <div className="space-y-2 text-xs">
              <Row label="Property price" val={fmt$(price)} />
              <Row label="Stamp duty" val={fmt$(duty)} color="#16a34a" bold />
              <div className="border-t border-[rgba(0,0,0,0.06)] my-1" />
              <Row label="Total upfront cost" val={fmt$(total)} color="#1A2B3C" bold />
              <Row label="Stamp duty as % of price" val={dutyPct.toFixed(2) + "%"} color="#16a34a" />
            </div>
          </div>
          <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 md:p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670] mb-3">Quick Comparison</p>
            <div className="space-y-2 text-xs">
              {STATES.filter(s => s !== state).slice(0, 5).map(s => (
                <Row key={s} label={`${s} - ${STATE_NAMES[s]}`} val={fmt$(calcSD(price, s))} color="#5C6670" />
              ))}
              <div className="border-t border-[rgba(0,0,0,0.06)] my-1" />
              <Row label={`Cheapest state: ${allStatesData.reduce((a, b) => a.value < b.value ? a : b).name}`} val={fmt$(Math.min(...allStatesData.map(d => d.value)))} color="#16a34a" bold />
              <Row label={`Most expensive: ${allStatesData.reduce((a, b) => a.value > b.value ? a : b).name}`} val={fmt$(Math.max(...allStatesData.map(d => d.value)))} color="#dc2626" bold />
              <Row label={`Difference`} val={fmt$(Math.max(...allStatesData.map(d => d.value)) - Math.min(...allStatesData.map(d => d.value)))} color="#7c3aed" />
            </div>
          </div>
        </div>

        <p className="text-[9px] text-[#9CA3AF] mb-6">First home buyer concessions and off-the-plan discounts may apply. Verify with your conveyancer.</p>
      </div>
    </ClientPortalShell>
  );
}

