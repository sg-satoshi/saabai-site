import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Insights — AI Automation for Professional Firms | Saabai",
  description:
    "Real patterns from building AI automation systems for law firms, accounting practices, and real estate agencies.",
  alternates: { canonical: "https://www.saabai.ai/insights" },
  openGraph: {
    url: "https://www.saabai.ai/insights",
    title: "Insights — AI Automation for Professional Firms | Saabai",
    description:
      "Real patterns from building AI automation systems for law firms, accounting practices, and real estate agencies.",
  },
};

const articles = [
  {
    category: "Law Firms",
    title: "The Hidden Cost of Manual Intake: What 12 Law Firms Told Us",
    excerpt:
      "Manual intake is costing law firms 8–15 hours per week per fee earner in non-billable admin. Here's what we found — and what they did about it.",
    slug: "/insights/law-firm-intake-automation",
    date: "April 2026",
    published: true,
  },
  {
    category: "Accounting Firms",
    title: "How Accounting Firms Are Using AI to Win More Clients",
    excerpt:
      "The firms growing fastest aren't spending more on marketing. They're responding faster, qualifying better, and following up automatically.",
    slug: null,
    date: "Coming soon",
    published: false,
  },
  {
    category: "Real Estate",
    title: "Real Estate AI: Why Response Speed Is the Only KPI That Matters",
    excerpt:
      "In property, the agent who responds first wins the listing. Here's how top agencies are using AI to be first — every time, around the clock.",
    slug: null,
    date: "Coming soon",
    published: false,
  },
  {
    category: "Professional Services",
    title: "The 60-Day Automation Playbook for Professional Services",
    excerpt:
      "A practical week-by-week breakdown of how professional services firms move from fully manual to largely automated in under two months.",
    slug: null,
    date: "Coming soon",
    published: false,
  },
];

export default function InsightsPage() {
  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">
      <Nav />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-52 pb-28 px-6 text-center max-w-5xl mx-auto overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% 30%, var(--saabai-glow-mid) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 40% 30% at 50% 20%, var(--saabai-glow) 0%, transparent 70%)",
          }}
        />

        <div className="relative inline-flex items-center gap-2.5 mb-10">
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
          <p className="text-xs font-medium tracking-[0.2em] text-saabai-text-dim uppercase">
            From the field
          </p>
          <span className="w-1 h-1 rounded-full bg-saabai-teal inline-block" />
        </div>

        <h1 className="relative text-6xl md:text-7xl lg:text-[80px] font-semibold tracking-[-0.03em] leading-[1.05] mb-8">
          What we&apos;re learning
          <br />
          <span className="text-gradient">building AI for professional firms</span>
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-2xl mx-auto leading-relaxed">
          We work inside law firms, accounting practices, and real estate agencies every week.
          These are the real patterns we&apos;re seeing — what breaks, what works, and what
          makes automation actually stick.
        </p>

        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent, var(--saabai-bg))",
          }}
        />
      </section>

      {/* ── Article Grid ────────────────────────────────────────────────── */}
      <section className="py-16 px-6 max-w-6xl mx-auto border-t border-saabai-border">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article, i) => (
            <ArticleCard key={i} article={article} />
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
      <section className="relative py-32 px-6 text-center border-t border-saabai-border overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, var(--saabai-glow-strong) 0%, transparent 65%)",
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-saabai-teal/50 to-transparent" />

        <p className="relative text-[11px] font-medium tracking-[0.2em] text-saabai-text-dim uppercase mb-6">
          Work with us
        </p>
        <h2 className="relative text-4xl md:text-5xl font-semibold tracking-[-0.02em] mb-6 max-w-xl mx-auto leading-[1.1]">
          Ready to stop reading
          <br />
          <span className="text-gradient">and start automating?</span>
        </h2>
        <p className="relative text-saabai-text-muted text-lg mb-10 max-w-lg mx-auto leading-relaxed">
          Book a free 30-minute strategy call. We&apos;ll map your current workflows and show you
          exactly where automation creates the biggest return.
        </p>
        <a
          href="https://calendly.com/shanegoldberg/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="relative inline-block bg-saabai-teal text-saabai-bg px-12 py-4 rounded-xl font-bold text-base hover:opacity-90 transition-opacity tracking-wide shadow-[0_0_40px_var(--saabai-glow-mid)]"
        >
          Book Your Free Strategy Call
        </a>
      </section>

      <Footer />
    </div>
  );
}

function ArticleCard({
  article,
}: {
  article: {
    category: string;
    title: string;
    excerpt: string;
    slug: string | null;
    date: string;
    published: boolean;
  };
}) {
  const cardContent = (
    <div
      className={`relative flex flex-col h-full rounded-2xl border p-8 transition-all duration-200 ${
        article.published
          ? "bg-saabai-surface border-saabai-border hover:border-saabai-teal/40 hover:shadow-[0_0_40px_var(--saabai-glow)]"
          : "bg-saabai-surface border-saabai-border opacity-50 cursor-default"
      }`}
    >
      {/* Category tag */}
      <div className="flex items-center justify-between mb-5">
        <span
          className={`inline-block text-[10px] font-semibold tracking-[0.18em] uppercase px-3 py-1 rounded-full border ${
            article.published
              ? "text-saabai-teal border-saabai-teal/30 bg-saabai-teal/10"
              : "text-saabai-text-dim border-saabai-border bg-saabai-surface-raised"
          }`}
        >
          {article.category}
        </span>
        <span className="text-xs text-saabai-text-dim">{article.date}</span>
      </div>

      {/* Title */}
      <h2
        className={`text-lg font-semibold leading-snug tracking-tight mb-3 ${
          article.published ? "text-saabai-text" : "text-saabai-text-dim"
        }`}
      >
        {article.title}
      </h2>

      {/* Excerpt — two-line clamp */}
      <p className="text-saabai-text-muted text-sm leading-relaxed line-clamp-2 flex-1">
        {article.excerpt}
      </p>

      {/* Read link */}
      <div className="mt-6">
        {article.published ? (
          <span className="text-sm font-medium text-saabai-teal group-hover:underline">
            Read article →
          </span>
        ) : (
          <span className="text-sm text-saabai-text-dim italic">Coming soon</span>
        )}
      </div>
    </div>
  );

  if (article.published && article.slug) {
    return (
      <a href={article.slug} className="group block h-full">
        {cardContent}
      </a>
    );
  }

  return <div className="h-full">{cardContent}</div>;
}
