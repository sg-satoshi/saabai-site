"use client";

import Link from "next/link";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { ChatWidget } from "../_components/ChatWidget";
import { Section, SectionTitle } from "../_components/Section";

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Section className="bg-[#f5f2eb]/40">
          <SectionTitle as="h1" eyebrow="About" title="A smarter way into Australian property" intro="We use exclusive builder partnerships to secure inventory at wholesale pricing, then pass that pricing to buyers. One advisor. Full transparency. No retail markup." />
        </Section>

        <Section>
          <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
            <div className="lg:col-span-2">
              <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A2B3C] to-[#0369a1]">
                <div className="flex h-full items-end p-8 text-white">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Principal Advisor</p>
                    <p className="mt-2 text-2xl font-semibold">Your Name Here</p>
                    <p className="text-sm text-white/70">Finance Broker &middot; Licensed Real Estate Agent</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-3">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl text-[#1A2B3C]">Real estate and finance, one conversation.</h2>
              <p className="mt-5 text-[#5C6670]">
                Most buyers juggle a real estate agent, a mortgage broker, an accountant and a conveyancer, all with different incentives. Our principal advisor is dual-qualified in finance broking and real estate, which means one accountable point of contact from first conversation through to settlement.
              </p>
              <p className="mt-4 text-[#5C6670]">
                With more than a decade in Australian property finance and direct relationships with Metricon and twelve other leading builders, we secure pre-market inventory and structure the finance to suit your goals, not the bank&apos;s.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-6 border-t border-[rgba(0,0,0,0.08)] pt-8">
                <Stat label="Years in market" value="12+" />
                <Stat label="Builder partners" value="13" />
                <Stat label="Avg saving" value="$54K" />
              </div>
            </div>
          </div>
        </Section>

        <Section className="bg-[#1A2B3C] text-white">
          <SectionTitle eyebrow="Why wholesale" title="The model, explained simply." />
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { t: "We buy in volume", d: "Builders release stock to us in bulk before public listing. That's how the wholesale price exists." },
              { t: "You buy direct", d: "You pay the same wholesale price we secured. No middle markup, no inflated commission." },
              { t: "We're paid by the builder", d: "Our commission is paid by the builder on settlement, not added to your price." },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl bg-white/5 p-8 ring-1 ring-white/10">
                <h3 className="text-lg font-semibold">{c.t}</h3>
                <p className="mt-3 text-sm text-white/70">{c.d}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section>
          <SectionTitle eyebrow="Our values" title="Transparency. Results. No pressure." align="center" />
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <Value t="Transparency" d="Retail vs wholesale price shown side by side on every package. No hidden fees, no fine print." />
            <Value t="Results" d="Every package secured below independent valuation. If it isn't a clear financial win, we don't list it." />
            <Value t="Low pressure" d="A 20-minute call to see if we fit. No follow-up sequences, no aggressive sales." />
          </div>
          <div className="mt-14 text-center">
            <Link href="/sites/wholesale-homes/contact" className="inline-flex items-center justify-center rounded-full bg-[#0891b2] px-7 py-4 text-sm font-semibold text-white hover:bg-[#0369a1]">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-3xl font-semibold tracking-tight text-[#0891b2]">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-[#5C6670]">{label}</p>
    </div>
  );
}

function Value({ t, d }: { t: string; d: string }) {
  return (
    <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-8 text-center">
      <h3 className="text-xl font-semibold tracking-tight text-[#1A2B3C]">{t}</h3>
      <p className="mt-3 text-sm text-[#5C6670]">{d}</p>
    </div>
  );
}
