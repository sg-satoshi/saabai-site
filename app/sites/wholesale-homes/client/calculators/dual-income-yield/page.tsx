"use client";

import { useState } from "react";
import { ClientPortalShell } from "../../../_components/ClientPortalShell";
import { Building2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { fmtAUD as fmt$, fmtCompact as fmt1k, MetricMini, Row } from "../_shared";

export default function DualIncomeYieldCalculator() {
  const [pp, setPp] = useState(789990);
  const [mr, setMr] = useState(420);
  const [gr, setGr] = useState(280);
  const [cr, setCr] = useState(2500);
  const [ins, setIns] = useState(1800);
  const [mgmt, setMgmt] = useState(7);
  const [maint, setMaint] = useState(1500);

  const twr = mr + gr;
  const yrRent = twr * 52;
  const mgmtCost = yrRent * (mgmt / 100);
  const tae = cr + ins + mgmtCost + maint;
  const nri = yrRent - tae;
  const gy = pp > 0 ? (yrRent / pp) * 100 : 0;
  const ny = pp > 0 ? (nri / pp) * 100 : 0;
  const wcf = nri / 52;
  const mcf = nri / 12;

  const yieldData = [
    { name: "Gross Yield", value: gy, fill: "#0891b2" },
    { name: "Net Yield", value: ny, fill: "#16a34a" },
    { name: "Income Return on Cash", value: pp > 0 ? (nri / (pp * 0.2)) * 100 : 0, fill: "#7c3aed" },
  ];

  return (
    <ClientPortalShell>
      <div style={{ maxWidth: 1060 }}>
        <a href="/client/calculators" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0891b2] hover:underline mb-3">&larr; Back to Calculators</a>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0891b2]/10">
            <Building2 className="h-6 w-6 text-[#0891b2]" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2]">Calculator</p>
            <h1 className="text-xl font-bold tracking-tight text-[#1A2B3C]">Dual Income Yield</h1>
            <p className="text-xs text-[#5C6670]">Estimate returns on house + granny flat investments.</p>
          </div>
        </div>

        {/* ── COMPACT INPUTS ── */}
        <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 mb-5 shadow-sm">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5C6670] mb-3">Adjust any number. Everything updates instantly.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Purchase Price", val: pp, set: setPp, suffix: "$" },
              { label: "Main Rent /wk", val: mr, set: setMr, suffix: "$" },
              { label: "Granny Flat /wk", val: gr, set: setGr, suffix: "$" },
              { label: "Council Rates", val: cr, set: setCr, suffix: "$" },
              { label: "Insurance", val: ins, set: setIns, suffix: "$" },
              { label: "Mgmt Fee", val: mgmt, set: setMgmt, suffix: "%", step: 0.5 },
              { label: "Maintenance", val: maint, set: setMaint, suffix: "$" },
            ].map((f, i) => (
              <div key={i}>
                <label className="block text-[9px] font-medium text-[#5C6670] mb-0.5">{f.label}</label>
                <div className="relative">
                  <input type="number" value={f.val} onChange={e => f.set(Number(e.target.value) || 0)}
                    step={f.step ?? 1}
                    className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] bg-white px-2 py-1.5 text-[11px] text-[#1A2B3C] outline-none focus:border-[#0891b2] transition-colors text-right" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#9CA3AF] pointer-events-none">{f.suffix}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── KEY METRICS ── */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          <MetricMini label="Gross Annual Rent" val={fmt$(yrRent)} color="#0891b2" sub={`${mr}/wk main + ${gr}/wk granny`} />
          <MetricMini label="Net Annual Income" val={fmt$(nri)} color={nri >= 0 ? "#16a34a" : "#dc2626"} sub="after all costs" />
          <MetricMini label="Weekly Cashflow" val={fmt$(Math.round(wcf))} color={wcf >= 0 ? "#16a34a" : "#dc2626"} sub="before loan" />
          <MetricMini label="Expenses /yr" val={fmt$(tae)} color="#dc2626" sub={`${mgmt}% mgmt · rates · ins · maint`} />
          <MetricMini label="Gross Yield" val={gy.toFixed(2) + "%"} color="#0891b2" sub={fmt$(yrRent) + "/yr ÷ " + fmt$(pp)} />
          <MetricMini label="Net Yield" val={ny.toFixed(2) + "%"} color="#16a34a" sub={fmt$(nri) + "/yr net"} />
          <MetricMini label="Net Monthly" val={fmt$(Math.round(mcf))} color="#7c3aed" sub="net rental income" />
          <MetricMini label="Total Weekly Rent" val={fmt$(twr)} color="#f59e0b" sub={`Main ${mr} + Granny ${gr}`} />
        </div>

        {/* ── BIG CHARTS ── */}
        <div className="grid gap-5 md:grid-cols-2 mb-5">
          {/* Yield Comparison */}
          <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 md:p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670] mb-3">Yield Comparison</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={yieldData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barSize={70}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                <YAxis tick={{ fontSize: 9, fill: "#9CA3AF" }} tickFormatter={v => v + "%"} domain={[0, "auto"]} />
                <Tooltip content={({ active, payload }: any) =>
                  active && payload ? <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3 shadow-lg"><p className="text-xs font-semibold" style={{ color: payload[0]?.color }}>{payload[0]?.payload?.name}: {payload[0]?.value?.toFixed(2)}%</p></div> : null
                } />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {yieldData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Income Breakdown */}
          <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 md:p-5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670] mb-3">Income Breakdown</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[
                { name: "Main Rent", value: mr * 52, fill: "#0891b2" },
                { name: "Granny Flat", value: gr * 52, fill: "#16a34a" },
                { name: "Total Rent", value: yrRent, fill: "#f59e0b" },
                { name: "Expenses", value: -tae, fill: "#dc2626" },
                { name: "Net Income", value: nri, fill: nri >= 0 ? "#7c3aed" : "#dc2626" },
              ]} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barSize={50}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9CA3AF" }} />
                <YAxis tick={{ fontSize: 9, fill: "#9CA3AF" }} tickFormatter={v => "$" + fmt1k(v)} />
                <Tooltip content={({ active, payload }: any) =>
                  active && payload ? <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3 shadow-lg"><p className="text-xs font-semibold" style={{ color: payload[0]?.color }}>{payload[0]?.payload?.name}: ${Math.abs(payload[0]?.value || 0).toLocaleString("en-AU")}</p></div> : null
                } />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[
                    { name: "Main Rent", value: mr * 52, fill: "#0891b2" },
                    { name: "Granny Flat", value: gr * 52, fill: "#16a34a" },
                    { name: "Total Rent", value: yrRent, fill: "#f59e0b" },
                    { name: "Expenses", value: -tae, fill: "#dc2626" },
                    { name: "Net Income", value: nri, fill: nri >= 0 ? "#7c3aed" : "#dc2626" },
                  ].map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── DETAILED BREAKDOWN ── */}
        <div className="rounded-2xl border border-[rgba(0,0,0,0.06)] bg-white p-4 md:p-5 mb-6 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670] mb-3">Annual Breakdown</p>
          <div className="space-y-2 text-xs">
            <Row label="Gross annual rent" val={fmt$(yrRent)} color="#0891b2" />
            <Row label={`Less property management (${mgmt}%)`} val={"-" + fmt$(mgmtCost)} color="#dc2626" />
            <Row label="Less council rates" val={"-" + fmt$(cr)} color="#dc2626" />
            <Row label="Less insurance" val={"-" + fmt$(ins)} color="#dc2626" />
            <Row label="Less maintenance reserve" val={"-" + fmt$(maint)} color="#dc2626" />
            <div className="border-t border-[rgba(0,0,0,0.06)] my-1" />
            <Row label="Net annual income" val={fmt$(nri)} color={nri >= 0 ? "#16a34a" : "#dc2626"} bold />
            <Row label="Weekly cash flow" val={fmt$(Math.round(wcf))} color={wcf >= 0 ? "#16a34a" : "#dc2626"} />
          </div>
          <p className="mt-3 text-[9px] text-[#9CA3AF]">This calculator provides an estimate only. Speak with Nick for personalised figures.</p>
        </div>
      </div>
    </ClientPortalShell>
  );
}

