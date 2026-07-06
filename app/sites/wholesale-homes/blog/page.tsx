"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { ChatWidget } from "../_components/ChatWidget";

const articles = [
  { title: "Why New Builds Will Dominate Australian Property in 2026", snippet: "The 2026 Federal Budget rewrote the rules for property investors. Here's why new construction is now the clear winner.", slug: "new-builds-dominate-2026" },
  { title: "Wholesale vs Retail: What You're Actually Paying For", snippet: "Most buyers never see the wholesale price. We break down the 8–12% gap and how it becomes your equity.", slug: "wholesale-vs-retail" },
  { title: "The Suburbs Where Builders Are Competing for Buyers", snippet: "Which growth corridors are offering the best incentives right now? Our monthly market snapshot.", slug: "builders-competing-suburbs" },
  { title: "First Home Buyer Guide to House & Land Packages", snippet: "Deposit schemes, grants, and the wholesale advantage. Everything a first-timer needs to know.", slug: "first-home-buyer-guide" },
  { title: "Depreciation Schedules: The $10K Tax Deduction Most Investors Miss", snippet: "New builds unlock significant non-cash deductions. Here's how to maximise them.", slug: "depreciation-schedules" },
];

export default function BlogPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-[#f8f6f2] text-[#1A2B3C]">
        <section className="py-16 md:py-28">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">Resources</p>
            <h1 className="mt-3 text-[clamp(1.6rem,5vw,3rem)] font-semibold leading-tight tracking-tight md:text-4xl lg:text-5xl">
              Insights &amp; resources.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[#5C6670] md:mt-5 md:text-base">
              Market analysis, investor guides, and updates from the wholesale property market.
            </p>

            <div className="mt-10 grid gap-5 md:mt-12 md:grid-cols-2 md:gap-7 lg:grid-cols-3">
              {articles.map((article) => (
                <article key={article.slug} className="group flex flex-col rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-5 transition-shadow hover:shadow-[0_10px_30px_-15px_rgba(26,43,60,0.15)] md:p-6">
                  <Link href={`/blog/${article.slug}`} className="no-underline">
                  <p className="text-xs text-[#0891b2] font-semibold uppercase tracking-wider">Article</p>
                  <h2 className="mt-2 text-sm font-semibold tracking-tight md:text-base">{article.title}</h2>
                  <p className="mt-2 text-xs leading-relaxed text-[#5C6670] md:text-sm">{article.snippet}</p>
                  <div className="mt-auto pt-4">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0891b2] group-hover:text-[#0369a1] md:text-sm">
                      Read more <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                  </Link>
                </article>
              ))}
            </div>

            <div className="mt-12 rounded-3xl bg-[#1A2B3C] p-8 text-white text-center md:mt-16 md:p-12">
              <h2 className="text-lg font-semibold tracking-tight md:text-xl">Get the weekly market update</h2>
              <p className="mt-2 text-sm text-white/70">New packages, policy changes, and market intelligence. Straight to your inbox.</p>
              <div className="mt-5 mx-auto flex max-w-md gap-3">
                <input type="email" placeholder="Your email" className="flex-1 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm text-white placeholder-white/40 outline-none" />
                <button className="rounded-full bg-[#0891b2] px-5 py-3 text-sm font-semibold transition-colors hover:bg-[#0369a1]">Subscribe</button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
