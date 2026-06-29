"use client";

import Link from "next/link";
import { ArrowRight, Check, Sparkles, ShieldCheck, Star, Building2 } from "lucide-react";
import { Header } from "./_components/Header";
import { Footer } from "./_components/Footer";
import { ChatWidget } from "./_components/ChatWidget";
import { Section, SectionTitle, Eyebrow } from "./_components/Section";
import { PackageCard } from "./_components/PackageCard";
import { packages } from "./_data/packages";

const builders = ["Metricon", "Stockland", "Mirvac", "Henley", "Simonds", "Burbank"];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* HERO */}
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <img src="/sites/wholesale-homes/hero-home.jpg" alt="" width={1920} height={1280} fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#1A2B3C]/70 via-[#1A2B3C]/55 to-[#1A2B3C]/85" />
          </div>
          <div className="mx-auto flex min-h-[88vh] w-full max-w-7xl flex-col justify-center px-6 py-28 text-white lg:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">In partnership with Metricon</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
              House &amp; Land Packages.<br />
              <span className="text-[#0891b2]">Below Market Price.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80 md:text-xl">
              Exclusive pre-market access to Australia&apos;s best new home builds, before they hit the public market.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/sites/wholesale-homes/packages" className="group inline-flex items-center gap-2 rounded-full bg-[#0891b2] px-7 py-4 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1]">
                Browse Available Packages
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/sites/wholesale-homes/contact" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-7 py-4 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-[#1A2B3C]">
                Book a Discovery Call
              </Link>
            </div>
          </div>
          {/* Trust bar */}
          <div className="border-t border-white/10 bg-[#1A2B3C]/95 backdrop-blur">
            <div className="mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6 py-5 text-xs uppercase tracking-[0.18em] text-white/80 lg:px-10">
              <span className="text-white/70">In partnership with</span>
              {builders.map((b) => (
                <span key={b} className="font-semibold text-white/75">{b}</span>
              ))}
            </div>
          </div>
        </section>

        {/* MARKET INSIGHT */}
        <Section className="bg-[#f5f2eb]/50">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
            <div>
              <SectionTitle
                eyebrow="Market Insight"
                title="The property game has changed. New builds are now the smartest investment in Australia."
                intro="The 2026 Federal Budget fundamentally rewrote the rules. Investors and first-home buyers who act on new construction are picking up a structural tax advantage that established property no longer offers."
              />
              <Link href="/sites/wholesale-homes/tax-advantages" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#0891b2] hover:text-[#0369a1]">
                Read the full breakdown <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ul className="space-y-5">
              {[
                { t: "Negative gearing limited to new builds", d: "From 1 July 2027, negative gearing on established property is being phased out. New construction retains the benefit." },
                { t: "Capital gains advantages preserved for new construction", d: "New builds retain favourable CGT treatment as established property moves to indexation." },
                { t: "$47B government investment in housing supply", d: "Federal funding is now directed at boosting new dwelling supply, not the resale market." },
                { t: "Expanded 5% deposit and Help to Buy schemes", d: "Lower barriers to entry plus government equity contributions for new homes." },
              ].map((item) => (
                <li key={item.t} className="flex gap-4 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#0891b2]/10 text-[#0891b2]">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold tracking-tight">{item.t}</p>
                    <p className="mt-1 text-sm text-[#5C6670]">{item.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* WHOLESALE ADVANTAGE */}
        <Section>
          <SectionTitle eyebrow="The Wholesale Advantage" title="Three reasons our buyers walk in with equity." />
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { icon: Sparkles, t: "Below Market Pricing", d: "We secure inventory from builders before it goes to market. You pay wholesale, not retail. Immediate equity from day one." },
              { icon: Star, t: "Pre-Market Access", d: "While other buyers compete at auction, you're already in. Our network means you see packages before anyone else." },
              { icon: ShieldCheck, t: "Full-Service", d: "From finance through to settlement, our principal advisor handles the complexity. You just choose the right property." },
            ].map((c) => (
              <div key={c.t} className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 transition-shadow hover:shadow-[0_10px_30px_-15px_rgba(26,43,60,0.2)]">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0891b2]/10 text-[#0891b2]">
                  <c.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 text-xl font-semibold tracking-tight">{c.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#5C6670]">{c.d}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* FEATURED PACKAGES */}
        <Section className="bg-[#f5f2eb]/40">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionTitle eyebrow="Featured Packages" title="Live inventory, secured at wholesale." />
            <Link href="/sites/wholesale-homes/packages" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0891b2] hover:text-[#0369a1]">
              View all packages <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-12 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {packages.slice(0, 6).map((pkg) => <PackageCard key={pkg.id} pkg={pkg} />)}
          </div>
        </Section>

        {/* HOW IT WORKS */}
        <Section>
          <SectionTitle eyebrow="How It Works" title="From discovery to keys in four steps." />
          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", t: "Discover", d: "Browse our exclusive packages in growth corridors." },
              { n: "02", t: "Chat", d: "Speak with our principal advisor, both finance and RE qualified." },
              { n: "03", t: "Secure", d: "Lock in your package below market valuation." },
              { n: "04", t: "Build", d: "12-month build timeline. We manage the process." },
            ].map((s) => (
              <div key={s.n} className="border-t-2 border-[#1A2B3C] pt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0891b2]">Step {s.n}</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">{s.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#5C6670]">{s.d}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* TESTIMONIAL */}
        <section className="py-20 md:py-28 bg-[#1A2B3C] text-white">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
              <div className="lg:col-span-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0891b2]">Investor result</p>
                <blockquote className="mt-5 text-2xl font-medium leading-snug tracking-tight md:text-3xl lg:text-4xl">
                  &ldquo;We secured a four-bedder in Tarneit at $68,000 below the bank&apos;s own valuation. The valuer came back stunned. That&apos;s equity we now have working for us from day one.&rdquo;
                </blockquote>
                <div className="mt-8 flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-white/10 font-semibold">DJ</div>
                  <div>
                    <p className="font-semibold">Daniel &amp; Jess</p>
                    <p className="text-sm text-white/60">Investors, Melbourne</p>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2">
                <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
                  <div className="grid grid-cols-2 gap-6 text-center">
                    <div>
                      <p className="text-4xl font-semibold tracking-tight text-[#0891b2]">$68K</p>
                      <p className="mt-1 text-xs uppercase tracking-wider text-white/60">Saved on valuation</p>
                    </div>
                    <div>
                      <p className="text-4xl font-semibold tracking-tight text-[#0891b2]">9.8%</p>
                      <p className="mt-1 text-xs uppercase tracking-wider text-white/60">Below comparable sales</p>
                    </div>
                    <div>
                      <p className="text-4xl font-semibold tracking-tight text-[#0891b2]">12mo</p>
                      <p className="mt-1 text-xs uppercase tracking-wider text-white/60">Build timeline</p>
                    </div>
                    <div>
                      <p className="text-4xl font-semibold tracking-tight text-[#0891b2]">Day 1</p>
                      <p className="mt-1 text-xs uppercase tracking-wider text-white/60">Equity position</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LIFESTYLE STRIP */}
        <section className="grid lg:grid-cols-2">
          <img src="/sites/wholesale-homes/interior-kitchen.jpg" alt="Modern kitchen interior" width={1600} height={1100} loading="lazy" className="h-full w-full object-cover" />
          <div className="flex flex-col justify-center bg-[#f8f4ec] p-10 md:p-16 lg:p-20">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0891b2]">Quality you can stand behind</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Builder inclusions, not investor compromises.</h2>
            <p className="mt-5 text-[#5C6670]">
              Stone benchtops, premium tapware, ducted air, landscaped front yards. Our packages ship with Metricon&apos;s full investor inclusions, the same spec a retail buyer pays full price for.
            </p>
            <ul className="mt-7 grid gap-3 text-sm">
              {["Stone benchtops throughout", "20mm reconstituted stone", "Ducted reverse-cycle air conditioning", "Full landscaping and driveway", "Fixed-price contract, no surprises"].map((f) => (
                <li key={f} className="flex items-center gap-3"><Check className="h-4 w-4 text-[#0891b2]" />{f}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* FINAL CTA */}
        <Section>
          <div className="rounded-3xl bg-[#1A2B3C] p-12 text-center text-white md:p-20">
            <Building2 className="mx-auto h-8 w-8 text-[#0891b2]" />
            <h2 className="mt-6 text-3xl font-semibold tracking-tight md:text-5xl">Ready to secure your package?</h2>
            <p className="mx-auto mt-5 max-w-xl text-white/70">
              A 20-minute conversation about your goals. No obligation, no pressure.
            </p>
            <Link href="/sites/wholesale-homes/contact" className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#0891b2] px-7 py-4 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1]">
              Book Your Free Discovery Call <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Section>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
