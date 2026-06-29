"use client";

import Link from "next/link";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { ChatWidget } from "../_components/ChatWidget";
import { Section, SectionTitle, Eyebrow } from "../_components/Section";

export default function TaxAdvantagesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Section className="bg-[#1A2B3C] text-white">
          <div className="mx-auto max-w-4xl">
            <Eyebrow>Policy briefing</Eyebrow>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
              2026 Federal Budget: Why New Homes Are Now The Smartest Property Investment in Australia
            </h1>
            <p className="mt-6 text-lg text-white/70">
              The tax system has been fundamentally redesigned to favour new construction. This is what every Australian investor and first-home buyer should understand before their next property decision.
            </p>
          </div>
        </Section>

        <Section>
          <article className="mx-auto max-w-3xl space-y-12">
            <Block title="The Big Change">
              <p>In the 2026 Federal Budget, the Government committed $47 billion to its &ldquo;Homes for Australia&rdquo; plan, the largest housing-supply package in a generation. Combined with sweeping reforms to negative gearing and capital gains tax, the policy intent is unmistakable: redirect investor capital away from competing for existing housing stock, and toward funding new construction.</p>
              <p>For buyers willing to act on new builds, the structural advantage is significant. For buyers chasing established property, the next decade looks materially harder.</p>
            </Block>

            <Block title="1. Negative Gearing Limited to New Builds (from 1 July 2027)">
              <ul>
                <li>Investors purchasing <strong>new builds</strong> retain full negative-gearing benefits.</li>
                <li>Investors purchasing <strong>established property</strong> have negative gearing abolished from 1 July 2027.</li>
                <li>The result is a permanent two-tier system that rewards new construction with a tax advantage established stock cannot match.</li>
              </ul>
            </Block>

            <Block title="2. Capital Gains Tax Changes">
              <ul>
                <li>The 50% CGT discount is being replaced with an indexation method.</li>
                <li>New builds retain favourable treatment under the transition arrangements.</li>
                <li>A minimum effective tax rate of 30% on gains applies, with new builds partially exempt.</li>
              </ul>
            </Block>

            <Block title="3. Help to Buy Scheme">
              <ul>
                <li>Government contributes up to 40% of the purchase price for eligible new homes.</li>
                <li>Lower deposit requirements, with the Government taking an equity share.</li>
                <li>Available to a wider band of Australians under the expanded income thresholds.</li>
              </ul>
            </Block>

            <Block title="4. First Home Super Saver Scheme Expanded">
              <ul>
                <li>Buyers can now access up to $50,000 from super for a deposit.</li>
                <li>Combined with wholesale pricing, the path to a first home is more accessible than at any point in the past decade.</li>
              </ul>
            </Block>

            <Block title="5. Expanded 5% Deposit Scheme">
              <ul>
                <li>Lower barrier to entry for first-home buyers.</li>
                <li>An additional 75,000 buyers supported across the next decade.</li>
              </ul>
            </Block>

            <div className="rounded-3xl bg-[#0891b2]/10 p-8 ring-1 ring-[#0891b2]/20 md:p-10">
              <p className="text-lg font-semibold tracking-tight text-[#1A2B3C] md:text-xl">The bottom line</p>
              <p className="mt-3 text-[#1A2B3C]/80">
                The tax system has been fundamentally redesigned to favour new construction. Investors who act now secure a structural advantage that will not exist for established property.
              </p>
            </div>

            <p className="border-l-2 border-[rgba(0,0,0,0.08)] pl-5 text-xs text-[#5C6670]">
              This page provides general information only and does not constitute financial or tax advice. Consult your accountant or financial advisor.
            </p>

            <div className="text-center">
              <Link href="/sites/wholesale-homes/contact" className="inline-flex items-center justify-center rounded-full bg-[#1A2B3C] px-7 py-4 text-sm font-semibold text-white hover:bg-[#1A2B3C]/90">
                Speak with our principal advisor
              </Link>
            </div>
          </article>
        </Section>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl text-[#1A2B3C]">{title}</h2>
      <div className="mt-4 space-y-4 leading-relaxed text-[#5C6670] [&_li]:my-1.5 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}
