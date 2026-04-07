import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import { getNewsData } from "../../lib/news";
import AiNewsClient from "./AiNewsClient";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Latest AI News & Discussions",
  description:
    "Live AI news, research and community discussions updated every 30 minutes. Curated from the top AI subreddits, TechCrunch, VentureBeat, The Verge, MIT Technology Review, and the biggest voices on X.",
};

export default async function AINewsPage() {
  const { reddit, news, x, updatedAt } = await getNewsData({ redditLimit: 6, newsLimit: 6 });

  const lastUpdated = new Date(updatedAt).toLocaleTimeString("en-AU", {
    timeZone: "Australia/Sydney",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--saabai-bg)" }}>
      <Nav activePage="/ai-news" />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20"
            style={{ background: "radial-gradient(ellipse, #62c5d1 0%, transparent 70%)", filter: "blur(60px)" }} />
        </div>
        <div className="max-w-6xl mx-auto relative">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.2em] text-saabai-teal uppercase">
              Live · Updates every 30 min · Last updated {lastUpdated} AEST
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-saabai-text tracking-tight mb-4 leading-tight">
            Latest AI News<br />
            <span className="text-saabai-teal">& Discussions</span>
          </h1>
          <p className="text-saabai-text-muted text-lg max-w-2xl leading-relaxed">
            Curated from the top AI communities, publications, and the biggest voices on X. Select any sources below to build your own custom feed.
          </p>
        </div>
      </section>

      {/* Main content */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <AiNewsClient reddit={reddit} news={news} x={x} />
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-saabai-surface border border-saabai-border rounded-2xl p-10"
            style={{ boxShadow: "0 0 40px rgba(98,197,209,0.08)" }}>
            <p className="text-[10px] font-bold tracking-[0.2em] text-saabai-teal uppercase mb-4">
              Ready to act on it?
            </p>
            <h2 className="text-2xl font-bold text-saabai-text mb-4 tracking-tight">
              AI is moving fast.<br />Your business should too.
            </h2>
            <p className="text-saabai-text-muted mb-8 leading-relaxed">
              Book a free 30-minute strategy call. We will map exactly what AI automation can do for your business — no pitch, just a clear picture.
            </p>
            <a
              href="https://calendly.com/shanegoldberg/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-saabai-teal text-saabai-bg px-8 py-4 rounded-xl font-bold text-sm tracking-wide hover:bg-saabai-teal-bright transition-colors"
              style={{ boxShadow: "0 0 24px rgba(98,197,209,0.35)" }}
            >
              Book a Free Strategy Call
            </a>
            <p className="text-saabai-text-dim text-xs mt-4">Free · 30 minutes · No obligation</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
