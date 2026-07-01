"use client";

import { useState } from "react";
import { ClientPortalShell } from "../../../_components/ClientPortalShell";
import { TrendingUp, DollarSign, Percent, Home } from "lucide-react";

export default function DualIncomeYieldCalculator() {
  const [purchasePrice, setPurchasePrice] = useState(789990);
  const [mainRent, setMainRent] = useState(420);
  const [grannyRent, setGrannyRent] = useState(280);
  const [rates, setRates] = useState(2500);
  const [insurance, setInsurance] = useState(1800);
  const [management, setManagement] = useState(7);
  const [maintenance, setMaintenance] = useState(1500);

  const totalWeeklyRent = mainRent + grannyRent;
  const yearlyRent = totalWeeklyRent * 52;
  const mgmtCosts = yearlyRent * (management / 100);
  const totalExpenses = rates + insurance + mgmtCosts + maintenance;
  const netYearlyIncome = yearlyRent - totalExpenses;
  const grossYield = (yearlyRent / purchasePrice) * 100;
  const netYield = (netYearlyIncome / purchasePrice) * 100;
  const weeklyCashflow = netYearlyIncome / 52;

  return (
    <ClientPortalShell>
      <div style={{ maxWidth: 900 }}>
        {/* Back link */}
        <a
          href="/client/calculators"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 12, fontWeight: 600, color: "#0891b2",
            textDecoration: "none", marginBottom: 16,
          }}
        >
          &larr; Back to Calculators
        </a>

        <div style={{ marginBottom: 28 }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">
            Calculator
          </p>
          <h1 className="mt-2 text-[clamp(1.3rem,3vw,1.8rem)] font-semibold leading-tight tracking-tight text-[#1A2B3C]">
            Dual Income Yield Calculator
          </h1>
          <p className="mt-1 text-sm text-[#5C6670]">
            Estimate your net rental yield on house + granny flat investment packages.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-5">
          {/* Inputs */}
          <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-5 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5C6670] mb-4">Property Details</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#5C6670]">Purchase Price ($)</label>
                <input
                  type="number"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-sm outline-none focus:border-[#0891b2]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#5C6670]">Main House Weekly Rent ($)</label>
                <input
                  type="number"
                  value={mainRent}
                  onChange={(e) => setMainRent(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-sm outline-none focus:border-[#0891b2]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#5C6670]">Granny Flat Weekly Rent ($)</label>
                <input
                  type="number"
                  value={grannyRent}
                  onChange={(e) => setGrannyRent(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-sm outline-none focus:border-[#0891b2]"
                />
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider text-[#5C6670] mt-6 mb-4">Annual Costs</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#5C6670]">Council Rates ($)</label>
                <input
                  type="number"
                  value={rates}
                  onChange={(e) => setRates(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-sm outline-none focus:border-[#0891b2]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#5C6670]">Insurance ($)</label>
                <input
                  type="number"
                  value={insurance}
                  onChange={(e) => setInsurance(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-sm outline-none focus:border-[#0891b2]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#5C6670]">Property Management (%)</label>
                <input
                  type="number"
                  value={management}
                  onChange={(e) => setManagement(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-sm outline-none focus:border-[#0891b2]"
                  step="0.5"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#5C6670]">Maintenance Reserve ($)</label>
                <input
                  type="number"
                  value={maintenance}
                  onChange={(e) => setMaintenance(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-sm outline-none focus:border-[#0891b2]"
                />
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="md:col-span-3">
            <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5C6670] mb-5">Results</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-[#f0fdf4] p-4 border border-green-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-green-700">Gross Yield</p>
                  <p className="mt-1 text-2xl font-bold text-green-600">{grossYield.toFixed(2)}%</p>
                  <p className="text-xs text-green-700/70">${yearlyRent.toLocaleString()}/yr rent</p>
                </div>
                <div className="rounded-xl bg-[#f0f9ff] p-4 border border-[#0891b2]/20">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#0891b2]">Net Yield</p>
                  <p className="mt-1 text-2xl font-bold text-[#0891b2]">{netYield.toFixed(2)}%</p>
                  <p className="text-xs text-[#0891b2]/70">After all costs</p>
                </div>
                <div className="rounded-xl bg-[#1A2B3C] p-4 border border-[rgba(255,255,255,0.08)]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Weekly Cashflow</p>
                  <p className="mt-1 text-2xl font-bold text-white">${weeklyCashflow.toFixed(0)}</p>
                  <p className="text-xs text-white/60">per week</p>
                </div>
                <div className="rounded-xl bg-[#fefce8] p-4 border border-yellow-200">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-yellow-800">Total Weekly Rent</p>
                  <p className="mt-1 text-2xl font-bold text-yellow-700">${totalWeeklyRent}</p>
                  <p className="text-xs text-yellow-800/70">Main ${mainRent} + Granny ${grannyRent}</p>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-[#f8f6f2] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670] mb-2">Income Breakdown</p>
                <div className="space-y-2">
                  <Row label="Gross annual rent" value={`$${yearlyRent.toLocaleString()}`} />
                  <Row label="Less property management" value={`-$${mgmtCosts.toLocaleString()}`} negative />
                  <Row label="Less council rates" value={`-$${rates.toLocaleString()}`} negative />
                  <Row label="Less insurance" value={`-$${insurance.toLocaleString()}`} negative />
                  <Row label="Less maintenance reserve" value={`-$${maintenance.toLocaleString()}`} negative />
                  <div className="border-t border-[rgba(0,0,0,0.08)] pt-2">
                    <Row label="Net annual income" value={`$${netYearlyIncome.toLocaleString()}`} bold />
                  </div>
                </div>
              </div>

              <p className="mt-4 text-[10px] text-[#9CA3AF] leading-relaxed">
                This calculator provides an estimate only. Actual yields depend on purchase costs,
                vacancy rates, interest rates, and individual property characteristics.
                Speak with Nick for personalised figures.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ClientPortalShell>
  );
}

function Row({ label, value, negative, bold }: { label: string; value: string; negative?: boolean; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span className={`text-xs ${bold ? "font-semibold text-[#1A2B3C]" : "text-[#5C6670]"}`}>{label}</span>
      <span className={`text-xs font-semibold ${negative ? "text-red-500" : bold ? "text-[#0891b2]" : "text-[#1A2B3C]"}`}>{value}</span>
    </div>
  );
}
