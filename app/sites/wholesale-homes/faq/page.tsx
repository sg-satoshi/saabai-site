"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import Link from "next/link";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { ChatWidget } from "../_components/ChatWidget";

const faqs = [
  { q: "What makes a property 'wholesale'?", a: "We pre-purchase inventory from builders before it goes to market. That means you pay the builder's wholesale rate, not the retail price that would include marketing, display costs, and retail margins. Typically 8–12% below comparable market listings." },
  { q: "Do I need to be a property investor?", a: "Not at all. First-home buyers and upgraders are welcome. Our packages suit owner-occupiers and investors alike." },
  { q: "Can I use my own lender or solicitor?", a: "Yes. We recommend getting independent legal and financial advice. Our principal advisor can also handle the entire transaction end-to-end." },
  { q: "What's included in the package price?", a: "House construction, fixed-price builder contract, land (titled or near-titled), full landscaping, driveway, fencing, and all builder inclusions (stone benchtops, ducted air, premium tapware). Stamp duty and legal fees are additional." },
  { q: "How long does the build take?", a: "Typically 10–14 months from site start to handover, depending on the builder and estate stage." },
  { q: "What areas does Wholesale Homes cover?", a: "We currently operate in VIC (Tarneit, Werribee), NSW (Cobbitty, Gregory Hills), and QLD (Pimpama, Ormeau). We're expanding to SA and WA in late 2026." },
  { q: "Can I visit the land or display home?", a: "Absolutely. We arrange site visits to the estate and display homes after your discovery call." },
  { q: "Is there a fee for buyers?", a: "No. Our revenue comes from builder commissions. You pay the same price — or less — than you would approaching the builder directly." },
  { q: "What if I'm not ready to buy yet?", a: "No pressure. Book a call to learn the process. You can take months to browse before committing." },
  { q: "Do you offer SMSF investment options?", a: "Yes. New house and land packages can be structured within a self-managed super fund. Ask our advisor on the call." },
  { q: "What if I change my mind after securing a package?", a: "Most builders have a cooling-off period (typically 3–5 business days). We'll explain the terms before you sign anything." },
];

export default function FAQPage() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16 md:py-28">
          <div className="mx-auto w-full max-w-3xl px-6 lg:px-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">FAQ</p>
            <h1 className="mt-3 text-[clamp(1.6rem,5vw,3rem)] font-semibold leading-tight tracking-tight md:text-4xl lg:text-5xl">
              Frequently asked questions.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[#5C6670] md:mt-5 md:text-base">
              Everything you need to know about wholesale house &amp; land packages.
            </p>

            <div className="mt-8 space-y-3 md:mt-12 md:space-y-4">
              {faqs.map((faq) => {
                const isOpen = open === faq.q;
                return (
                  <div key={faq.q} className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white">
                    <button onClick={() => setOpen(isOpen ? null : faq.q)} className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold tracking-tight md:px-7 md:py-5 md:text-base">
                      {faq.q}
                      {isOpen ? <Minus className="h-4 w-4 shrink-0 text-[#0891b2]" /> : <Plus className="h-4 w-4 shrink-0 text-[#0891b2]" />}
                    </button>
                    {isOpen && <div className="border-t border-[rgba(0,0,0,0.06)] px-5 pb-5 pt-4 text-xs leading-relaxed text-[#5C6670] md:px-7 md:pb-6 md:text-sm">{faq.a}</div>}
                  </div>
                );
              })}
            </div>

            <div className="mt-10 text-center md:mt-12">
              <p className="text-sm text-[#5C6670] md:text-base">Still have questions?</p>
              <Link href="/contact" className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#0891b2] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1] md:px-7 md:py-4">Get in touch</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
