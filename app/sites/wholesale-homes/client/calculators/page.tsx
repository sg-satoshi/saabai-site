"use client";

import Link from "next/link";
import { ClientPortalShell } from "../../_components/ClientPortalShell";
import { Calculator, TrendingUp, DollarSign, Home, ArrowRight } from "lucide-react";

const CALCULATORS = [
  {
    slug: "dual-income-yield",
    label: "Dual Income Yield Calculator",
    desc: "Estimate your net rental yield on dual-occupancy packages, main house + granny flat income streams.",
    icon: TrendingUp,
    color: "#0891b2",
  },
  {
    slug: "stamp-duty",
    label: "Stamp Duty Calculator",
    desc: "Calculate stamp duty for properties in NSW, VIC, and QLD including concessions for first home buyers.",
    icon: DollarSign,
    color: "#16a34a",
  },
  {
    slug: "borrowing-power",
    label: "Borrowing Power Estimator",
    desc: "Get a quick estimate of how much you may be able to borrow based on your income, expenses, and deposit.",
    icon: Home,
    color: "#d4a84b",
  },
];

export default function CalculatorsHub() {
  return (
    <ClientPortalShell>
      <div style={{ maxWidth: 900 }}>
        <div style={{ marginBottom: 32 }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">
            Tools
          </p>
          <h1 className="mt-2 text-[clamp(1.4rem,3vw,2rem)] font-semibold leading-tight tracking-tight text-[#1A2B3C]">
            Calculators
          </h1>
          <p className="mt-1.5 text-sm text-[#5C6670]">
            Run the numbers on any property instantly.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CALCULATORS.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.slug}
                href={`/client/calculators/${c.slug}`}
                className="group rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: `${c.color}15`, color: c.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-[#1A2B3C]">{c.label}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#5C6670]">{c.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#0891b2] transition-colors group-hover:text-[#0369a1]">
                  Open Calculator <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </ClientPortalShell>
  );
}
