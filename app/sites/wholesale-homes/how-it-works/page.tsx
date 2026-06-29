"use client";

import Link from "next/link";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { ChatWidget } from "../_components/ChatWidget";
import { Section, SectionTitle } from "../_components/Section";

const steps = [
  { t: "Discovery Call (20 min)", d: "Speak with our principal advisor, both finance broker and qualified real estate agent. We learn your budget, goals and preferred locations. No obligation, no pressure." },
  { t: "Package Selection", d: "We match you with pre-market packages that fit your criteria. Review designs, locations and full transparent pricing. Compare retail vs wholesale side by side." },
  { t: "Finance & Approval", d: "Our in-house finance team structures your loan. We leverage builder incentives and government grants. Pre-approval arranged before you commit." },
  { t: "Secure Your Package", d: "Deposit paid through standard builder terms. Fixed-price contract signed at wholesale price. Your property is locked in, no auction, no competition, no cost surprises." },
  { t: "Build & Settlement", d: "Builder completes construction in about 12 months. Regular progress updates throughout. Settlement at completion, property typically valued above purchase price." },
  { t: "Rental or Occupancy", d: "Move in or place a tenant. Property management referrals available. Negative gearing benefits apply, new builds remain eligible under new laws." },
];

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Section className="bg-[#f5f2eb]/40">
          <SectionTitle as="h1" eyebrow="The Process" title="From first conversation to keys in hand" intro="A guided, transparent process. One advisor from start to finish. Six clear steps." />
        </Section>
        <Section>
          <ol className="mx-auto max-w-4xl space-y-4">
            {steps.map((s, i) => (
              <li key={s.t} className="grid grid-cols-[auto_1fr] gap-6 rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 md:gap-10 md:p-10">
                <div className="text-4xl font-semibold tracking-tight text-[#0891b2] md:text-5xl">{String(i + 1).padStart(2, "0")}</div>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight md:text-2xl text-[#1A2B3C]">{s.t}</h3>
                  <p className="mt-3 text-[#5C6670]">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-14 text-center">
            <Link href="/sites/wholesale-homes/contact" className="inline-flex items-center justify-center rounded-full bg-[#0891b2] px-7 py-4 text-sm font-semibold text-white hover:bg-[#0369a1]">
              Start with a 20-minute call
            </Link>
          </div>
        </Section>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
