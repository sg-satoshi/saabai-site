"use client";

import Link from "next/link";
import { ClientPortalShell } from "../../_components/ClientPortalShell";
import { Calculator, TrendingUp, DollarSign, Home, ArrowRight, Zap } from "lucide-react";

const CALCULATORS = [
  {
    slug: "investment-analyzer",
    label: "Property Investment Analyzer",
    desc: "Complete financial analysis — loan repayments, cash flow, yields, ROI projections, equity growth, weekly deficit/surplus, and expert investment analysis.",
    icon: Calculator,
    color: "#7c3aed",
    featured: true,
  },
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
            const isFeatured = (c as any).featured;
            return (
              <Link
                key={c.slug}
                href={`/client/calculators/${c.slug}`}
                className={`group rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  isFeatured ? 'sm:col-span-2 lg:col-span-3 relative overflow-hidden' : ''
                }`}
              >
                {isFeatured && (
                  <div className="absolute top-0 right-0 bg-[#7c3aed] text-white text-[8px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl flex items-center gap-1">
                    <Zap className="h-2.5 w-2.5" />
                    New
                  </div>
                )}
                <div className={`flex ${isFeatured ? 'items-center gap-5' : ''}`}>
                  <div
                    className={`flex items-center justify-center rounded-xl flex-shrink-0 ${
                      isFeatured ? 'h-14 w-14' : 'h-10 w-10'
                    }`}
                    style={{ background: `${c.color}15`, color: c.color }}
                  >
                    <Icon className={isFeatured ? 'h-7 w-7' : 'h-5 w-5'} />
                  </div>
                  <div className={isFeatured ? 'flex-1' : ''}>
                    <h3 className={`${isFeatured ? 'mt-0 text-base' : 'mt-4'} font-semibold text-[#1A2B3C]`}>{c.label}</h3>
                    <p className={`${isFeatured ? 'mt-1' : 'mt-2'} text-xs leading-relaxed text-[#5C6670]`}>{c.desc}</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold text-[#0891b2] transition-colors group-hover:text-[#0369a1] ${
                      isFeatured ? 'mt-2' : 'mt-4'
                    }`}>
                      Open Calculator <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </ClientPortalShell>
  );
}
