"use client";

import Link from "next/link";
import { ArrowRight, Check, Sparkles, ShieldCheck, Star, Building2 } from "lucide-react";
import { Header } from "./_components/Header";
import { Footer } from "./_components/Footer";
import { ChatWidget } from "./_components/ChatWidget";
import { Section } from "./_components/Section";
import { packages } from "./_data/packages";
import { PackageCard } from "./_components/PackageCard";
import heroImg from "@/public/sites/wholesale-homes/hero-home.jpg";
import kitchenImg from "@/public/sites/wholesale-homes/interior-kitchen.jpg";

const featured = packages.slice(0, 3);

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* ── Hero ── */}
        <section
          className="relative isolate overflow-hidden"
          style={{
            backgroundImage: "url('/sites/wholesale-homes/hero-home.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#1A2B3C]/70 via-[#1A2B3C]/55 to-[#1A2B3C]/85 -z-10" />
          <div className="mx-auto flex min-h-[70vh] w-full max-w-7xl flex-col justify-center px-6 py-20 text-white md:min-h-[88vh] md:py-28 lg:px-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 md:text-xs">In partnership with Metricon</p>
            <h1 className="mt-4 max-w-4xl text-[clamp(2rem,7vw,4.5rem)] font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              House & Land Packages.<br />
              <span className="text-[#0891b2]">Below Market Price.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg md:mt-6 md:text-xl">
              Exclusive pre-market access to Australia's best new home builds, before they hit the public market.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 md:mt-10 md:gap-4">
              <Link href="/packages" className="group inline-flex items-center gap-2 rounded-full bg-[#0891b2] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1] md:px-7 md:py-4">
                Browse Available Packages<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#1A2B3C] md:px-7 md:py-4">
                Book a Discovery Call
              </Link>
            </div>
          </div>
          <div className="border-t border-white/10 bg-[#1A2B3C]/95 backdrop-blur">
            <div className="mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2 px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-white/70 md:gap-x-10 md:py-5 md:text-xs lg:px-10">
              <span className="text-white/60">In partnership with</span>
              <span className="font-semibold text-white/70">Metricon</span>
              <span className="font-semibold text-white/70">Stockland</span>
              <span className="font-semibold text-white/70">Mirvac</span>
              <span className="font-semibold text-white/70">Henley</span>
              <span className="font-semibold text-white/70">Simonds</span>
              <span className="font-semibold text-white/70">Burbank</span>
            </div>
          </div>
        </section>

        {/* ── Market Insight ── */}
        <section className="py-16 md:py-28 bg-[#f5f2eb]/50">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-24">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">Market Insight</p>
                <h2 className="mt-3 text-[clamp(1.6rem,5vw,3rem)] font-semibold leading-tight tracking-tight md:text-4xl lg:text-5xl">
                  The property game has changed. New builds are now the smartest investment in Australia.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-[#5C6670] md:mt-5 md:text-base lg:text-lg">
                  The 2026 Federal Budget fundamentally rewrote the rules. Investors and first-home buyers who act on new construction are picking up a structural tax advantage that established property no longer offers.
                </p>
                <Link href="/tax-advantages" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0891b2] hover:text-[#0369a1] md:mt-8">
                  Read the full breakdown <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <ul className="space-y-4 md:space-y-5">
                {[
                  { title: "Negative gearing limited to new builds", desc: "From 1 July 2027, negative gearing on established property is being phased out. New construction retains the benefit." },
                  { title: "Capital gains advantages preserved for new construction", desc: "New builds retain favourable CGT treatment as established property moves to indexation." },
                  { title: "$47B government investment in housing supply", desc: "Federal funding is now directed at boosting new dwelling supply, not the resale market." },
                  { title: "Expanded 5% deposit and Help to Buy schemes", desc: "Lower barriers to entry plus government equity contributions for new homes." },
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-4 md:gap-4 md:p-6">
                    <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0891b2]/10 text-[#0891b2] md:h-9 md:w-9">
                      <Check className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold tracking-tight md:text-base">{item.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-[#5C6670] md:text-sm">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Wholesale Advantage ── */}
        <section className="py-16 md:py-28">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">The Wholesale Advantage</p>
            <h2 className="mt-3 text-[clamp(1.6rem,5vw,3rem)] font-semibold leading-tight tracking-tight md:text-4xl lg:text-5xl">
              Three reasons our buyers walk in with equity.
            </h2>
            <div className="mt-10 grid gap-5 md:mt-14 md:grid-cols-3 md:gap-6">
              {[
                { icon: Sparkles, title: "Below Market Pricing", desc: "We secure inventory from builders before it goes to market. You pay wholesale, not retail. Immediate equity from day one." },
                { icon: Star, title: "Pre-Market Access", desc: "While other buyers compete at auction, you're already in. Our network means you see packages before anyone else." },
                { icon: ShieldCheck, title: "Full-Service", desc: "From finance through to settlement, our principal advisor handles the complexity. You just choose the right property." },
              ].map((item, i) => (
                <div key={i} className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 transition-shadow hover:shadow-[0_10px_30px_-15px_rgba(26,43,60,0.2)] md:p-8">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#0891b2]/10 text-[#0891b2] md:h-12 md:w-12">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight md:mt-6 md:text-xl">{item.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5C6670] md:mt-3 md:text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Featured Packages ── */}
        <section className="py-16 md:py-28 bg-[#f5f2eb]/40">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            <div className="flex flex-wrap items-end justify-between gap-4 md:gap-6">
              <div className="max-w-3xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">Featured Packages</p>
                <h2 className="mt-3 text-[clamp(1.6rem,5vw,3rem)] font-semibold leading-tight tracking-tight md:text-4xl lg:text-5xl">
                  Live inventory, secured at wholesale.
                </h2>
              </div>
              <Link href="/packages" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0891b2] hover:text-[#0369a1]">
                View all packages <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-10 grid gap-5 md:mt-12 md:grid-cols-2 md:gap-7 lg:grid-cols-3">
              {featured.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="py-16 md:py-28">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">How It Works</p>
            <h2 className="mt-3 text-[clamp(1.6rem,5vw,3rem)] font-semibold leading-tight tracking-tight md:text-4xl lg:text-5xl">
              From discovery to keys in four steps.
            </h2>
            <div className="mt-10 grid gap-6 md:mt-14 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
              {[
                { step: "01", title: "Discover", desc: "Browse our exclusive packages in growth corridors." },
                { step: "02", title: "Chat", desc: "Speak with our principal advisor, both finance and RE qualified." },
                { step: "03", title: "Secure", desc: "Lock in your package below market valuation." },
                { step: "04", title: "Build", desc: "12-month build timeline. We manage the process." },
              ].map((item) => (
                <div key={item.step} className="border-t-2 border-[#1A2B3C] pt-5 md:pt-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">Step {item.step}</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight md:text-2xl">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5C6670] md:mt-3">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonial ── */}
        <section className="py-16 md:py-28 bg-[#1A2B3C] text-white">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-5 lg:gap-16">
              <div className="lg:col-span-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">Investor result</p>
                <blockquote className="mt-4 text-xl font-medium leading-snug tracking-tight md:mt-5 md:text-2xl lg:text-3xl lg:leading-snug">
                  &ldquo;We secured a four-bedder in Tarneit at $68,000 below the bank&rsquo;s own valuation. The valuer came back stunned. That&rsquo;s equity we now have working for us from day one.&rdquo;
                </blockquote>
                <div className="mt-6 flex items-center gap-3 md:mt-8 md:gap-4">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-sm font-semibold md:h-12 md:w-12">DJ</div>
                  <div>
                    <p className="font-semibold text-sm md:text-base">Daniel &amp; Jess</p>
                    <p className="text-xs text-white/60 md:text-sm">Investors, Melbourne</p>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2">
                <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 md:p-8">
                  <div className="grid grid-cols-2 gap-4 text-center md:gap-6">
                    {[
                      { value: "$68K", label: "Saved on valuation" },
                      { value: "9.8%", label: "Below comparable sales" },
                      { value: "12mo", label: "Build timeline" },
                      { value: "Day 1", label: "Equity position" },
                    ].map((s) => (
                      <div key={s.label}>
                        <p className="text-2xl font-semibold tracking-tight text-[#0891b2] md:text-3xl lg:text-4xl">{s.value}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-white/60 md:text-xs">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Lifestyle Strip ── */}
        <section className="flex flex-col lg:flex-row">
          <div className="w-full lg:w-1/2">
            <img src="/sites/wholesale-homes/interior-kitchen.jpg" alt="Modern kitchen interior" width={1600} height={1100} loading="lazy" className="aspect-[16/9] h-auto w-full object-cover lg:aspect-auto lg:h-full" />
          </div>
          <div className="flex flex-col justify-center bg-[#f8f4ec] px-6 py-12 md:px-10 md:py-16 lg:w-1/2 lg:p-20">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">Quality you can stand behind</p>
            <h2 className="mt-3 text-[clamp(1.4rem,4vw,2.5rem)] font-semibold tracking-tight md:text-3xl lg:text-4xl">
              Builder inclusions, not investor compromises.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#5C6670] md:mt-5 md:text-base">
              Stone benchtops, premium tapware, ducted air, landscaped front yards. Our packages ship with Metricon&rsquo;s full investor inclusions, the same spec a retail buyer pays full price for.
            </p>
            <ul className="mt-6 grid gap-2 text-sm md:mt-7 md:gap-3">
              {["Stone benchtops throughout", "20mm reconstituted stone", "Ducted reverse-cycle air conditioning", "Full landscaping and driveway", "Fixed-price contract, no surprises"].map((item) => (
                <li key={item} className="flex items-center gap-2 md:gap-3">
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#0891b2] md:h-4 md:w-4" />
                  <span className="text-xs md:text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-16 md:py-28">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            <div className="rounded-3xl bg-[#1A2B3C] px-8 py-14 text-center text-white md:p-16 lg:p-20">
              <Building2 className="mx-auto h-7 w-7 text-[#0891b2] md:h-8 md:w-8" />
              <h2 className="mt-5 text-2xl font-semibold tracking-tight md:mt-6 md:text-4xl lg:text-5xl">
                Ready to secure your package?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm text-white/70 md:mt-5 md:text-base">
                A 20-minute conversation about your goals. No obligation, no pressure.
              </p>
              <Link href="/contact" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#0891b2] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1] md:mt-9 md:px-7 md:py-4">
                Book Your Free Discovery Call <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
