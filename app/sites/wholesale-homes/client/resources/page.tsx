"use client";

import Link from "next/link";
import { ClientPortalShell } from "../../_components/ClientPortalShell";
import { BookOpen, TrendingUp, FileText, Shield, DollarSign, Home, ArrowRight } from "lucide-react";

const RESOURCES = [
  {
    title: "First Home Buyer Guide",
    desc: "The complete step-by-step guide to buying your first home — from deposit to settlement.",
    icon: FileText,
    color: "#0891b2",
    href: "#",
    sections: ["Deposit strategies", "FHOG eligibility by state", "Stamp duty concessions"],
  },
  {
    title: "Negative Gearing Explained",
    desc: "How negative gearing works, when it makes sense, and how to structure your investment for maximum tax efficiency.",
    icon: DollarSign,
    color: "#16a34a",
    href: "#",
    sections: ["What is negative gearing", "Depreciation benefits", "Capital gains considerations"],
  },
  {
    title: "Dual Income Strategy Guide",
    desc: "Why dual-occupancy properties are one of the strongest-performing investment strategies in Australia.",
    icon: TrendingUp,
    color: "#d4a84b",
    href: "#",
    sections: ["Yield comparison vs single dwellings", "Granny flat rental demand", "Finance structuring"],
  },
  {
    title: "Investment Structures",
    desc: "Individual, joint, trust, or company — which structure is right for your property investment strategy.",
    icon: Shield,
    color: "#8b5cf6",
    href: "#",
    sections: ["SMSF property investment", "Trust structures explained", "Asset protection basics"],
  },
  {
    title: "Deposit & Finance Guide",
    desc: "How much deposit you really need, LMI explained, and how lenders assess investment properties.",
    icon: Home,
    color: "#f59e0b",
    href: "#",
    sections: ["Minimum deposits by property type", "LMI vs 80% LVR", "Pre-approval process"],
  },
];

export default function ResourcesHub() {
  return (
    <ClientPortalShell>
      <div style={{ maxWidth: 900 }}>
        <div style={{ marginBottom: 32 }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">
            Learning Centre
          </p>
          <h1 className="mt-2 text-[clamp(1.4rem,3vw,2rem)] font-semibold leading-tight tracking-tight text-[#1A2B3C]">
            Resources
          </h1>
          <p className="mt-1.5 text-sm text-[#5C6670]">
            Guides, tools, and strategies to help you invest with confidence.
          </p>
        </div>

        <div className="space-y-4">
          {RESOURCES.map((r) => {
            const Icon = r.icon;
            return (
              <Link
                key={r.title}
                href={r.href}
                className="group block rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md md:p-6"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${r.color}15`, color: r.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="text-[15px] font-semibold text-[#1A2B3C]">{r.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-[#5C6670]">{r.desc}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.sections.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-[#f8f6f2] px-3 py-1 text-[10px] font-medium text-[#5C6670]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0891b2] transition-colors group-hover:text-[#0369a1]">
                      Read Guide <ArrowRight className="h-3 w-3" />
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
