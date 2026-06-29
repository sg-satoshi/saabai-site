"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { ChatWidget } from "../_components/ChatWidget";

const steps = [
  { number: "1", title: "Browse Packages", desc: "Explore our exclusive inventory — VIC, NSW, QLD. Every package already priced below market." },
  { number: "2", title: "Book a Discovery Call", desc: "A no-obligation chat with our principal advisor. They handle finance AND real estate in one conversation." },
  { number: "3", title: "Get Pre-Approved", desc: "Through our partner lending panel. We know exactly what each builder's lenders require." },
  { number: "4", title: "Choose & Lock", desc: "Select your package. We secure it at wholesale pre-market pricing — before it hits the general market." },
  { number: "5", title: "Settlement & Build", desc: "Turn-key land settlement and build commencement. 12-month construction timeline, fully managed." },
  { number: "6", title: "Handover", desc: "Walk into a completed home with landscaping, driveway, and inclusions — same spec as full retail." },
];

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16 md:py-28">
          <div className="mx-auto w-full max-w-3xl px-6 text-center lg:px-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">How It Works</p>
            <h1 className="mt-3 text-[clamp(1.6rem,5vw,3rem)] font-semibold leading-tight tracking-tight md:text-4xl lg:text-5xl">
              From discovery to keys.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[#5C6670] md:mt-5 md:text-base">
              A simple process designed to save you time, stress, and money.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-3xl space-y-6 px-6 md:mt-14 md:space-y-8 lg:px-10">
            {steps.map((step) => (
              <div key={step.number} className="flex gap-5 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-5 md:gap-6 md:p-8">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0891b2] text-xs font-bold text-white md:h-10 md:w-10 md:text-sm">{step.number}</div>
                <div>
                  <h2 className="text-base font-semibold tracking-tight md:text-lg">{step.title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-[#5C6670] md:mt-1.5 md:text-sm">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-10 max-w-3xl px-6 text-center lg:px-10">
            <Link href="/sites/wholesale-homes/contact" className="inline-flex items-center gap-2 rounded-full bg-[#0891b2] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1] md:px-7 md:py-4">
              Start Your Journey <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
