"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Building2, Award } from "lucide-react";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { ChatWidget } from "../_components/ChatWidget";

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-[#f8f6f2]">
        <section className="py-16 md:py-28">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            <div className="grid gap-10 md:gap-14 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">About</p>
                <h1 className="mt-3 text-[clamp(1.6rem,5vw,3rem)] font-semibold leading-tight tracking-tight md:text-4xl lg:text-5xl">
                  We connect buyers to wholesale property before it hits the open market.
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-[#5C6670] md:mt-5 md:text-base lg:text-lg">
                  Wholesale Homes Australia was founded to solve a simple problem: new house and land packages are sold through display villages and realestate.com.au, marked up by 8–12%. Our network buys direct from builders, pre-market, and passes those savings on to you.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-[#5C6670] md:text-base">
                  Our principal advisor holds qualifications in both finance (credit license) and real estate. With 25+ years in banking, mortgage broking, and property development.
                </p>
              </div>
              <div className="lg:col-span-2">
                <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white overflow-hidden">
                  <div className="aspect-[1/1] w-full overflow-hidden bg-[#f5f2eb]">
                    <img src="/sites/wholesale-homes/nick-foale.jpg" alt="Nick Foale" className="h-full w-full object-cover" />
                  </div>
                  <div className="px-5 pb-5 md:px-6 md:pb-6">
                    <h2 className="text-lg font-semibold tracking-tight md:text-xl">Nick Foale</h2>
                    <p className="text-xs text-[#5C6670] md:text-sm">Principal Advisor · Finance &amp; Real Estate</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-[#f5f2eb]/40">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            <div className="grid gap-6 md:grid-cols-3 md:gap-8">
              {[
                { icon: Building2, title: "Builder Partnerships", desc: "We work directly with Metricon, Mirvac, Stockland, Henley, and 8 other builders to secure inventory pre-market." },
                { icon: ShieldCheck, title: "Dual Qualification", desc: "Your principal advisor holds a credit license AND real estate license. Two hats, one conversation. No hand-offs." },
                { icon: Award, title: "Wholesale Network", desc: "Our model bypasses retail channels. You access the same product at builder-direct pricing, available before the general public." },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6 md:p-8">
                  <Icon className="h-6 w-6 text-[#0891b2] md:h-7 md:w-7" />
                  <h2 className="mt-4 text-base font-semibold tracking-tight md:mt-5 md:text-lg">{title}</h2>
                  <p className="mt-2 text-xs leading-relaxed text-[#5C6670] md:mt-3 md:text-sm">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-[#1A2B3C] text-white text-center">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl lg:text-4xl">Ready to start?</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-white/70 md:mt-5 md:text-base">Speak with our principal advisor. No obligation, no pressure.</p>
            <Link href="/contact" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#0891b2] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1] md:mt-9 md:px-7 md:py-4">
              Book Your Discovery Call <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
