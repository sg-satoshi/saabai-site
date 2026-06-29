"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import Link from "next/link";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { ChatWidget } from "../_components/ChatWidget";
import { Section, SectionTitle } from "../_components/Section";

const faqs = [
  { q: "How is your pricing below market?", a: "We secure builder inventory in volume, ahead of public release. Builders give us wholesale pricing on that volume, which we pass directly to you. The builder still pays our commission on settlement, so there's no markup on your side." },
  { q: "What's the minimum deposit?", a: "Standard builder terms generally require a 5 to 10% deposit on contract signing. Several of our packages are eligible for the expanded 5% government deposit scheme." },
  { q: "How long does a build take?", a: "Around 12 months from land registration to settlement, depending on the builder, design and weather. We provide regular progress updates throughout." },
  { q: "Can I use these for investment properties?", a: "Yes. The majority of our clients are investors. New builds also retain full negative gearing benefits under the 2027 reforms." },
  { q: "Do you help with finance?", a: "Yes. Our principal advisor is a licensed finance broker. We structure your loan, leverage builder incentives and government grants, and arrange pre-approval before you commit." },
  { q: "Are the packages guaranteed fixed price?", a: "Yes. Every package is contracted on a fixed-price basis with the builder, with full inclusions itemised in your contract." },
  { q: "What areas do you cover?", a: "Currently VIC, NSW and QLD growth corridors. We're expanding into WA and SA in 2026." },
  { q: "Can I choose my own builder?", a: "Our packages are tied to specific builder partnerships, which is what unlocks the wholesale pricing. If you want a custom builder, we can refer you, but it won't be at wholesale pricing." },
  { q: "What's the difference between wholesale and retail pricing?", a: "Retail is what a walk-in buyer pays through the builder's display centre. Wholesale is the discounted price reserved for volume partners. We make that wholesale price available directly to individual buyers." },
  { q: "Is there a cooling-off period?", a: "Yes. Cooling-off varies by state. We walk you through your exact rights before any contract is signed." },
  { q: "Can first-home buyers use these packages?", a: "Absolutely. First-home buyers are eligible for all current government schemes, including First Home Owner Grant, stamp duty concessions, the First Home Super Saver Scheme and Help to Buy." },
];

export default function FaqPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Section className="bg-[#f5f2eb]/40">
          <SectionTitle as="h1" eyebrow="FAQ" title="The questions buyers ask most" intro="Short, honest answers. Want more detail? Book a 20-minute call." />
        </Section>
        <Section>
          <div className="mx-auto max-w-3xl space-y-3">
            {faqs.map((f, i) => <Item key={i} q={f.q} a={f.a} />)}
          </div>
          <div className="mx-auto mt-12 max-w-3xl rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 text-center">
            <p className="text-lg font-semibold tracking-tight">Still have questions?</p>
            <p className="mt-2 text-sm text-[#5C6670]">A 20-minute call with our principal advisor will cover anything not listed here.</p>
            <Link href="/sites/wholesale-homes/contact" className="mt-5 inline-flex items-center justify-center rounded-full bg-[#0891b2] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0369a1]">
              Book a Discovery Call
            </Link>
          </div>
        </Section>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 p-6 text-left">
        <span className="font-semibold tracking-tight">{q}</span>
        {open ? <Minus className="h-4 w-4 shrink-0 text-[#0891b2]" /> : <Plus className="h-4 w-4 shrink-0 text-[#0891b2]" />}
      </button>
      {open && <div className="border-t border-[rgba(0,0,0,0.08)] px-6 py-5 text-sm leading-relaxed text-[#5C6670]">{a}</div>}
    </div>
  );
}
