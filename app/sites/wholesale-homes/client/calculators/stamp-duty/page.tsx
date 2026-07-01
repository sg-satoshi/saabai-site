"use client";

import { useState, useMemo } from "react";
import { ClientPortalShell } from "../../../_components/ClientPortalShell";
import { DollarSign, Home, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

type State = "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";

const STATE_NAMES: Record<State, string> = {
  NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland",
  WA: "Western Australia", SA: "South Australia", TAS: "Tasmania",
  ACT: "ACT", NT: "Northern Territory",
};

function calcSD(price: number, state: State): number {
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
      let d: number;
      if (price <= 120000) d = price * 0.019;
      else if (price <= 150000) d = 2280 + (price - 120000) * 0.0285;
      else if (price <= 360000) d = 3135 + (price - 150000) * 0.038;
      else if (price <= 725000) d = 11115 + (price - 360000) * 0.0475;
      else d = 28453 + (price - 725000) * 0.0515;
      return d;
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

const STATES: State[] = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const STATE_COLORS: Record<State, string> = {
  NSW: "#0891b2", VIC: "#16a34a", QLD: "#f59e0b", WA: "#7c3aed",
  SA: "#dc2626", TAS: "#d4a84b", ACT: "#1A2B3C", NT: "#6b7280",
};

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

  const fmt$ = (n: number) => "$" + Math.round(n).toLocaleString("en-AU");
  const fmt1k = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : Math.round(n).toLocaleString("en-AU");

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

function MetricMini({ label, val, color, sub }: { label: string; val: string; color: string; sub: string }) {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-[8px] font-semibold uppercase tracking-wider text-[#5C6670] truncate">{label}</p>
      <p className="mt-0.5 text-sm font-bold" style={{ color }}>{val}</p>
      <p className="text-[8px] text-[#9CA3AF] truncate">{sub}</p>
    </div>
  );
}

function Row({ label, val, color, bold }: { label: string; val: string; color?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-xs ${bold ? "font-semibold text-[#1A2B3C]" : "text-[#5C6670]"}`}>{label}</span>
      <span className={`text-xs ${bold ? "font-semibold" : ""}`} style={{ color: color ?? "#1A2B3C" }}>{val}</span>
    </div>
  );
}
