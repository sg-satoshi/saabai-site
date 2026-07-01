"use client";

import { useState } from "react";
import { ClientPortalShell } from "../../../_components/ClientPortalShell";

type State = "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";

const STATE_NAMES: Record<State, string> = {
  NSW: "New South Wales",
  VIC: "Victoria",
  QLD: "Queensland",
  WA: "Western Australia",
  SA: "South Australia",
  TAS: "Tasmania",
  ACT: "Australian Capital Territory",
  NT: "Northern Territory",
};

function calcStampDuty(price: number, state: State): { duty: number; concession?: string } {
  if (price <= 0) return { duty: 0 };

  switch (state) {
    case "NSW": {
      let duty: number;
      if (price <= 16000) duty = price * 0.0125;
      else if (price <= 35000) duty = 200 + (price - 16000) * 0.015;
      else if (price <= 93000) duty = 485 + (price - 35000) * 0.0175;
      else if (price <= 351000) duty = 1500 + (price - 93000) * 0.035;
      else if (price <= 1168000) duty = 10530 + (price - 351000) * 0.045;
      else duty = 47295 + (price - 1168000) * 0.055;
      const fhbExemption = price <= 800000;
      return { duty, concession: fhbExemption ? "First home buyer may qualify for concession" : undefined };
    }

    case "VIC": {
      let duty: number;
      if (price <= 25000) duty = price * 0.014;
      else if (price <= 130000) duty = 350 + (price - 25000) * 0.024;
      else if (price <= 960000) duty = 2870 + (price - 130000) * 0.05;
      else if (price <= 2000000) duty = 44370 + (price - 960000) * 0.055;
      else duty = 110000 + (price - 2000000) * 0.065;
      const fhbPossible = price <= 750000;
      return { duty, concession: fhbPossible ? "First home buyer may qualify for FHOG on new builds" : undefined };
    }

    case "QLD": {
      let duty: number;
      if (price <= 5000) duty = 0;
      else if (price <= 75000) duty = (price - 5000) * 0.015;
      else if (price <= 540000) duty = 1050 + (price - 75000) * 0.035;
      else if (price <= 1000000) duty = 17325 + (price - 540000) * 0.045;
      else duty = 38025 + (price - 1000000) * 0.0575;
      return { duty };
    }

    case "WA": {
      let duty: number;
      if (price <= 120000) duty = price * 0.019;
      else if (price <= 150000) duty = 2280 + (price - 120000) * 0.0285;
      else if (price <= 360000) duty = 3135 + (price - 150000) * 0.038;
      else if (price <= 725000) duty = 11115 + (price - 360000) * 0.0475;
      else duty = 28453 + (price - 725000) * 0.0515;
      return { duty };
    }

    case "SA": {
      let duty: number;
      if (price <= 12000) duty = price * 0.01;
      else if (price <= 30000) duty = 120 + (price - 12000) * 0.02;
      else if (price <= 50000) duty = 480 + (price - 30000) * 0.03;
      else if (price <= 100000) duty = 1080 + (price - 50000) * 0.035;
      else if (price <= 200000) duty = 2830 + (price - 100000) * 0.04;
      else if (price <= 250000) duty = 6830 + (price - 200000) * 0.0425;
      else if (price <= 300000) duty = 8955 + (price - 250000) * 0.0475;
      else if (price <= 500000) duty = 11330 + (price - 300000) * 0.05;
      else duty = 21330 + (price - 500000) * 0.055;
      return { duty };
    }

    case "TAS": {
      let duty: number;
      if (price <= 3000) duty = 50;
      else if (price <= 25000) duty = 50 + (price - 3000) * 0.0175;
      else if (price <= 75000) duty = 435 + (price - 25000) * 0.0225;
      else if (price <= 200000) duty = 1560 + (price - 75000) * 0.035;
      else if (price <= 375000) duty = 5935 + (price - 200000) * 0.04;
      else if (price <= 725000) duty = 12935 + (price - 375000) * 0.0425;
      else duty = 27810 + (price - 725000) * 0.045;
      return { duty };
    }

    case "ACT": {
      let duty: number;
      if (price <= 260000) duty = price * 0.0028;
      else if (price <= 300000) duty = 728 + (price - 260000) * 0.022;
      else if (price <= 500000) duty = 1608 + (price - 300000) * 0.034;
      else if (price <= 750000) duty = 8408 + (price - 500000) * 0.0432;
      else if (price <= 1000000) duty = 19208 + (price - 750000) * 0.059;
      else if (price <= 1455000) duty = 33958 + (price - 1000000) * 0.064;
      else duty = price * 0.0454;
      return { duty };
    }

    case "NT": {
      let duty: number;
      if (price <= 525000) {
        const V = price / 1000;
        duty = 0.06571441 * V * V + 15 * V;
      } else if (price <= 3000000) {
        duty = price * 0.0495;
      } else if (price <= 5000000) {
        duty = price * 0.0575;
      } else {
        duty = price * 0.0595;
      }
      return { duty };
    }
  }
}

function calcTotalUpfront(price: number, duty: number): number {
  return price + duty;
}

export default function StampDutyCalculator() {
  const [price, setPrice] = useState(729000);
  const [state, setState] = useState<State>("NSW");

  const { duty, concession } = calcStampDuty(price, state);
  const total = calcTotalUpfront(price, duty);
  const dutyPct = price > 0 ? (duty / price) * 100 : 0;

  return (
    <ClientPortalShell>
      <div style={{ maxWidth: 900 }}>
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
            Stamp Duty Calculator
          </h1>
          <p className="mt-1 text-sm text-[#5C6670]">
            Calculate stamp duty for any Australian state or territory.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-5">
          {/* Inputs */}
          <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-5 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#5C6670] mb-4">Property Details</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#5C6670]">Property Price ($)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm text-[#1A2B3C] outline-none focus:border-[#0891b2]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#5C6670]">State / Territory</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value as State)}
                  className="mt-1 w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm text-[#1A2B3C] outline-none focus:border-[#0891b2] appearance-none"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3e%3c/svg%3e\")", backgroundPosition: "right 8px center", backgroundRepeat: "no-repeat", backgroundSize: "20px", paddingRight: "32px" }}
                >
                  <option value="NSW">NSW - New South Wales</option>
                  <option value="VIC">VIC - Victoria</option>
                  <option value="QLD">QLD - Queensland</option>
                  <option value="WA">WA - Western Australia</option>
                  <option value="SA">SA - South Australia</option>
                  <option value="TAS">TAS - Tasmania</option>
                  <option value="ACT">ACT - Australian Capital Territory</option>
                  <option value="NT">NT - Northern Territory</option>
                </select>
              </div>
            </div>

            {concession && (
              <div className="mt-4 rounded-xl bg-[#f0fdf4] p-3 border border-green-100">
                <p className="text-xs font-medium text-green-700">{concession}</p>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="md:col-span-3">
            <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5C6670] mb-5">
                Results for {STATE_NAMES[state]}
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-[#f0f9ff] p-4 border border-[#0891b2]/20">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#0891b2]">Stamp Duty</p>
                  <p className="mt-1 text-2xl font-bold text-[#0891b2]">${duty.toLocaleString("en-AU", { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="rounded-xl bg-[#1A2B3C] p-4 border border-[rgba(255,255,255,0.08)]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Stamp Duty %</p>
                  <p className="mt-1 text-2xl font-bold text-white">{dutyPct.toFixed(2)}%</p>
                  <p className="text-xs text-white/60">of purchase price</p>
                </div>
                <div className="rounded-xl bg-[#fefce8] p-4 border border-yellow-200 sm:col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-yellow-800">Total Upfront Cost</p>
                  <p className="mt-1 text-2xl font-bold text-yellow-700">
                    ${total.toLocaleString("en-AU", { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-yellow-800/70">
                    Purchase price + stamp duty. Does not include conveyancing, inspections, or loan costs.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-[#f8f6f2] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670] mb-2">Breakdown</p>
                <div className="space-y-2">
                  <Row label="Property price" value={`$${price.toLocaleString("en-AU", { maximumFractionDigits: 0 })}`} />
                  <Row label="Stamp duty" value={`$${duty.toLocaleString("en-AU", { maximumFractionDigits: 0 })}`} highlight />
                  <div className="border-t border-[rgba(0,0,0,0.08)] pt-2">
                    <Row label="Total upfront cost" value={`$${total.toLocaleString("en-AU", { maximumFractionDigits: 0 })}`} bold />
                  </div>
                </div>
              </div>

              <p className="mt-4 text-[10px] text-[#9CA3AF] leading-relaxed">
                Stamp duty rates are based on current thresholds for principal place of residence and investment properties.
                First home buyer concessions, off-the-plan discounts, and other exemptions may apply.
                This is an estimate only. Always verify with your conveyancer or state revenue office.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ClientPortalShell>
  );
}

function Row({ label, value, highlight, bold }: { label: string; value: string; highlight?: boolean; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span className={`text-xs ${bold ? "font-semibold text-[#1A2B3C]" : "text-[#5C6670]"}`}>{label}</span>
      <span className={`text-xs font-semibold ${highlight ? "text-[#0891b2]" : bold ? "text-[#1A2B3C]" : "text-[#5C6670]"}`}>{value}</span>
    </div>
  );
}
