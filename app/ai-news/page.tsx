import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import { getNewsData, type NewsItem } from "../../lib/news";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Latest AI News & Discussions",
  description:
    "Live AI news, research and community discussions updated every 30 minutes. Curated from the top AI subreddits, TechCrunch, VentureBeat, The Verge, MIT Technology Review, and the biggest voices on X.",
};


function RedditCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.permalink ?? item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-saabai-surface border border-saabai-border hover:border-saabai-teal/40 rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded tracking-wider uppercase"
          style={{ background: "rgba(255,99,0,0.15)", color: "#ff6535" }}
        >
          {item.source}
        </span>
      </div>
      <p className="text-sm font-medium text-saabai-text leading-snug mb-4 group-hover:text-saabai-teal-bright transition-colors line-clamp-3">
        {item.title}
      </p>
      <span className="flex items-center gap-1 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity text-saabai-teal">
        View thread
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 8l6-6M3 2h5v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
    </a>
  );
}

// X icon SVG
function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.849L1.683 2.25H8.12l4.265 5.638 5.858-5.638Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function XCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: "rgba(0,0,0,0.45)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <span className="text-[10px] font-bold text-white">
              {item.authorName?.charAt(0) ?? "X"}
            </span>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-white leading-tight">{item.authorName}</p>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{item.source}</p>
          </div>
        </div>
        <span style={{ color: "rgba(255,255,255,0.3)" }}>
          <XIcon size={13} />
        </span>
      </div>
      <p className="text-sm leading-relaxed mb-4 line-clamp-4" style={{ color: "rgba(255,255,255,0.85)" }}>
        {item.title}
      </p>
      <span className="flex items-center gap-1 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "rgba(255,255,255,0.4)" }}>
        View on X
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 8l6-6M3 2h5v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
    </a>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-saabai-surface border border-saabai-border hover:border-saabai-teal/40 rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded tracking-wider uppercase"
          style={{ background: "rgba(98,197,209,0.1)", color: "#62c5d1" }}
        >
          {item.source}
        </span>
      </div>
      <p className="text-sm font-medium text-saabai-text leading-snug mb-4 group-hover:text-saabai-teal-bright transition-colors line-clamp-3">
        {item.title}
      </p>
      <span className="flex items-center gap-1 text-[11px] text-saabai-text-dim opacity-0 group-hover:opacity-100 transition-opacity text-saabai-teal">
        Read article
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 8l6-6M3 2h5v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
    </a>
  );
}

export default async function AINewsPage() {
  const { reddit, news, x, updatedAt } = await getNewsData({ redditLimit: 6, newsLimit: 6 });

  const lastUpdated = new Date(updatedAt).toLocaleTimeString("en-AU", {
    timeZone: "Australia/Sydney",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--saabai-bg)" }}>
      <Nav activePage="ai-news" />

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
            Curated from the top AI communities, publications, and the biggest voices on X. Research breakthroughs, industry news, real practitioner discussions — all in one place.
          </p>
        </div>
      </section>

      {/* Sources row */}
      <section className="px-6 pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] text-saabai-text-dim tracking-widest uppercase mr-2">Sources</span>
            {["r/AINews", "r/artificial", "r/MachineLearning", "r/singularity", "r/LocalLLaMA", "r/ChatGPT"].map((s) => (
              <span key={s} className="text-[10px] font-semibold px-2 py-1 rounded tracking-wide"
                style={{ background: "rgba(255,99,0,0.1)", color: "#ff6535" }}>{s}</span>
            ))}
            {["TechCrunch", "VentureBeat", "The Verge", "Hacker News", "MIT Tech Review", "Wired", "Ars Technica", "ZDNet", "The Register", "AI News", "MarkTechPost"].map((s) => (
              <span key={s} className="text-[10px] font-semibold px-2 py-1 rounded tracking-wide"
                style={{ background: "rgba(98,197,209,0.08)", color: "#62c5d1" }}>{s}</span>
            ))}
            {["@sama", "@karpathy", "@ylecun", "@OpenAI", "@AnthropicAI", "@GoogleDeepMind", "@huggingface", "@mistralai", "@openclaw", "@juliangoldieseo", "@milesdeutscher", "@aiedge_", "@gregisenberg", "@startupideaspod", "@alexfinn"].map((s) => (
              <span key={s} className="text-[10px] font-semibold px-2 py-1 rounded tracking-wide"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto space-y-16">

          {/* Reddit discussions */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[9px] font-bold px-2 py-1 rounded tracking-wider uppercase"
                style={{ background: "rgba(255,99,0,0.15)", color: "#ff6535" }}>Reddit</span>
              <h2 className="text-lg font-semibold text-saabai-text">Community Discussions</h2>
              <div className="flex-1 h-px bg-saabai-border" />
            </div>
            {reddit.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reddit.map((item, i) => (
                  <RedditCard key={i} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-saabai-text-dim text-sm">Loading discussions...</p>
            )}
          </div>

          {/* X posts */}
          {x.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[9px] font-bold px-2 py-1 rounded tracking-wider uppercase flex items-center gap-1"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}>
                  <XIcon size={10} /> X
                </span>
                <h2 className="text-lg font-semibold text-saabai-text">AI Voices on X</h2>
                <div className="flex-1 h-px bg-saabai-border" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {x.map((item, i) => (
                  <XCard key={i} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* News articles */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[9px] font-bold px-2 py-1 rounded tracking-wider uppercase"
                style={{ background: "rgba(98,197,209,0.1)", color: "#62c5d1" }}>News</span>
              <h2 className="text-lg font-semibold text-saabai-text">Industry & Research</h2>
              <div className="flex-1 h-px bg-saabai-border" />
            </div>
            {news.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {news.map((item, i) => (
                  <NewsCard key={i} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-saabai-text-dim text-sm">Loading articles...</p>
            )}
          </div>

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
              Book a free 30-minute strategy call. We'll map exactly what AI automation can do for your business — no pitch, just a clear picture.
            </p>
            <a
              href="https://calendly.com/shanegoldberg/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-saabai-teal text-saabai-bg px-8 py-4 rounded-xl font-bold text-sm tracking-wide hover:bg-saabai-teal-bright transition-colors"
              style={{ boxShadow: "0 0 24px rgba(98,197,209,0.35)" }}
            >
              Book a Free Strategy Call →
            </a>
            <p className="text-saabai-text-dim text-xs mt-4">Free · 30 minutes · No obligation</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
