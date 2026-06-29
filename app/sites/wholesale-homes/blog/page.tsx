"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { ChatWidget } from "../_components/ChatWidget";
import { Section, SectionTitle } from "../_components/Section";

const posts = [
  { t: "What the 2026 Budget Means for Property Investors", c: "Policy", d: "The structural change to negative gearing and CGT, in plain English." },
  { t: "5 Reasons House & Land Packages Outperform Established Property", c: "Strategy", d: "Equity at entry, tax treatment, depreciation, growth corridor exposure, and fixed-price certainty." },
  { t: "The Suburbs to Watch in 2026–2027", c: "Market", d: "Growth-corridor analysis across VIC, NSW and QLD with infrastructure overlay." },
  { t: "How Dual Occupancy Maximises Your Land Investment", c: "Strategy", d: "A second dwelling on the same title, the rules, the yields, the design constraints." },
  { t: "Depreciation 101: Why New Builds Win", c: "Tax", d: "Capital works deductions, plant and equipment, and the schedule worth getting on day one." },
];

export default function BlogPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Section className="bg-[#f5f2eb]/40">
          <SectionTitle as="h1" eyebrow="Resources" title="Property insights, plainly written" intro="Strategy, tax and growth-corridor analysis from the team. New posts every fortnight." />
        </Section>
        <Section>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <article key={p.t} className="group flex flex-col rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 transition-shadow hover:shadow-[0_10px_30px_-15px_rgba(26,43,60,0.2)]">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0891b2]">{p.c}</span>
                <h3 className="mt-4 text-xl font-semibold leading-snug tracking-tight text-[#1A2B3C]">{p.t}</h3>
                <p className="mt-3 flex-1 text-sm text-[#5C6670]">{p.d}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0891b2]">
                  Read article <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </article>
            ))}
          </div>
          <div className="mx-auto mt-16 max-w-2xl rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-10 text-center">
            <h3 className="text-2xl font-semibold tracking-tight text-[#1A2B3C]">Get insights in your inbox</h3>
            <p className="mt-3 text-sm text-[#5C6670]">Fortnightly: market updates, new package releases, government scheme changes.</p>
            <form onSubmit={(e) => e.preventDefault()} className="mx-auto mt-6 flex max-w-md gap-2">
              <input type="email" required placeholder="you@email.com" className="flex-1 rounded-full border border-[rgba(0,0,0,0.12)] bg-[#f5f5f7] px-4 py-3 text-sm outline-none focus:border-[#0891b2]" />
              <button className="rounded-full bg-[#0891b2] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0369a1]">Subscribe</button>
            </form>
            <p className="mt-6 text-xs text-[#5C6670]">Want to talk now? <Link href="/sites/wholesale-homes/contact" className="text-[#0891b2] underline">Book a call</Link>.</p>
          </div>
        </Section>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
