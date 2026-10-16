import Link from "next/link";
import { PageShell } from "../PageShell";
import { faqs } from "../seo";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FaqPage() {
  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="max-w-4xl mx-auto px-6 py-14 pb-24">
        <h2 className="text-xs font-bold tracking-[0.22em] text-brand uppercase mb-3">FAQ</h2>
        <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tighter text-balance">
          Mobile bike servicing, your questions answered
        </h1>
        <div className="mt-12 divide-y divide-muted-line border-y border-muted-line">
          {faqs.map((f) => (
            <div key={f.q} className="py-7">
              <h3 className="font-display font-semibold text-xl mb-2">{f.q}</h3>
              <p className="text-muted-foreground leading-relaxed text-pretty">{f.a}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-4">
          <Link
            href="/sites/cycle-repair/quote"
            className="bg-brand text-brand-foreground px-6 py-3 rounded-lg font-semibold text-sm hover:bg-brand/90 transition-colors"
          >
            Get a quote
          </Link>
          <a
            href="tel:0405225721"
            className="px-6 py-3 rounded-lg font-semibold text-sm ring-1 ring-white/15 hover:ring-brand/60 hover:text-brand transition-colors"
          >
            Call 0405 225 721
          </a>
        </div>
      </main>
    </PageShell>
  );
}
