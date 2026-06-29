"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { ChatWidget } from "../_components/ChatWidget";

export default function TaxAdvantagesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16 md:py-28">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">2026 Federal Budget</p>
            <h1 className="mt-3 max-w-3xl text-[clamp(1.6rem,5vw,3rem)] font-semibold leading-tight tracking-tight md:text-4xl lg:text-5xl">
              New construction is the only game left for property investors.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#5C6670] md:mt-5 md:text-base lg:text-lg">
              The 2026 Budget rewrote the rules. Here&rsquo;s what changed and why new house &amp; land packages now have a structural advantage.
            </p>
          </div>
        </section>

        <section className="pb-16 md:pb-28">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            <div className="grid gap-8 md:gap-10 lg:grid-cols-2 lg:gap-14">
              {[
                {
                  title: "Negative Gearing — New Builds Only",
                  body: "From 1 July 2027, negative gearing on established residential property is being phased out. New construction retains the benefit in full. Every dollar your new property runs at a loss is still deductible against your salary or other investment income. Established property investors lose this advantage.",
                },
                {
                  title: "CGT — Favours New Construction",
                  body: "The Budget reduces the CGT discount from 50% to 33% for most assets — but new construction retains the full 50% discount. For an investor selling a new build after 12 months, that could mean tens of thousands in reduced capital gains tax versus an established property.",
                },
                {
                  title: "$47B Housing Supply Boost",
                  body: "The government is funnelling $47 billion into new housing supply — infrastructure grants, land release incentives, and direct construction funding. This creates the conditions for strong capital growth in growth corridors where new estates are being built.",
                },
                {
                  title: "Help to Buy & Shared Equity",
                  body: "Expanded 5% deposit schemes and government equity contributions are now available for new homes. First-home buyers and investors can enter the market sooner with less capital, specifically for new construction.",
                },
                {
                  title: "Depreciation Benefits",
                  body: "New builds unlock significant depreciation schedules — typically $8,000–$15,000 per year in non-cash deductions for the first 10 years. Established properties offer minimal to no depreciation. This is cash-flow positive equity that established buyers miss entirely.",
                },
                {
                  title: "Builder Incentives & Wholesale Pricing",
                  body: "Builders are running incentives to move inventory: upgraded inclusions, reduced deposits, fixed-price contracts. Combined with wholesale pricing from our network, buyers can enter at 8–12% below comparable retail, building equity from day one — and accessing a market the general public never sees.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-5 md:p-7 lg:p-8">
                  <Check className="h-5 w-5 text-[#0891b2] md:h-6 md:w-6" />
                  <h2 className="mt-3 text-base font-semibold tracking-tight md:mt-4 md:text-lg lg:text-xl">{item.title}</h2>
                  <p className="mt-2 text-xs leading-relaxed text-[#5C6670] md:mt-3 md:text-sm lg:text-base">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-[#1A2B3C] text-white">
          <div className="mx-auto w-full max-w-7xl px-6 text-center lg:px-10">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl lg:text-4xl">The window is open. But not forever.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-white/70 md:mt-5 md:text-base">
              Negative gearing on new builds is still available now, but political headwinds are growing. The Budget signals the direction.
            </p>
            <Link href="/sites/wholesale-homes/contact" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#0891b2] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1] md:mt-9 md:px-7 md:py-4">
              Book a Discovery Call <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
