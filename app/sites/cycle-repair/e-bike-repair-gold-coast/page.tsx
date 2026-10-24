import Link from "next/link";
import { PageShell } from "../PageShell";
import { AREA_SERVED, faqs } from "../seo";

const FAQ_KEYS = [
  "Does Stu work on all e-bike brands?",
  "Can Stu work on e-bikes?",
  "Is there a call-out fee?",
  "Do I need to bring my bike to a shop?",
];

const pageFaqs = FAQ_KEYS.map((q) => faqs.find((f) => f.q === q)).filter((f): f is { q: string; a: string } => Boolean(f));

const prices = [
  { label: "E-bike servicing", price: "$149 to $299" },
  { label: "E-bike wheel build (per end)", price: "$159" },
  { label: "Rear fat e-bike tube", price: "$70" },
  { label: "Call-out fee for repairs under $120", price: "$70" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "E-bike repair and servicing, Gold Coast",
  serviceType: "E-bike repair and servicing",
  description: "Mobile e-bike repair and servicing. Stu works on all e-bike brands at your home or work, from the Northern Rivers to Coomera and Ormeau.",
  provider: { "@type": "LocalBusiness", "@id": "https://stuscyclerepairs.com/#business", name: "Stu's Cycle Repairs" },
  areaServed: AREA_SERVED,
  url: "https://stuscyclerepairs.com/e-bike-repair-gold-coast",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "AUD",
    lowPrice: "149.00",
    highPrice: "299.00",
  },
};

export default function EBikeRepairPage() {
  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <section className="border-b border-muted-line py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface ring-1 ring-white/10 text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-6">
              <span className="size-2 bg-brand rounded-full" />
              E-bikes
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-semibold tracking-tighter leading-[0.98] text-balance max-w-[18ch]">
              E-bike repair on the Gold Coast
            </h1>
            <p className="mt-6 text-muted-foreground text-lg max-w-[58ch] text-pretty">
              Stu services e-bikes at your home or work, from the Northern Rivers to Coomera and Ormeau.
            </p>
            <p className="mt-4 text-muted-foreground text-lg max-w-[58ch] text-pretty">
              Stu works on all e-bike brands.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
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
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tighter mb-3">E-bike service prices</h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-[60ch]">
              Prices are labour only. Parts are not included.
            </p>
            <div className="grid sm:grid-cols-2 gap-px bg-muted-line border border-muted-line rounded-2xl overflow-hidden max-w-3xl">
              {prices.map((item) => (
                <div key={item.label} className="bg-bg p-5 flex justify-between gap-4 text-sm font-medium">
                  <span>{item.label}</span>
                  <span className="text-brand whitespace-nowrap">{item.price}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 border-y border-muted-line bg-surface/20">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tighter mb-6">What e-bike servicing covers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Servicing covers motors, drivetrains, brakes and firmware checks.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              For complex rebuilds or wheel builds, Stu can collect the bike and return it test-ridden.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              See the <Link href="/sites/cycle-repair#services" className="text-brand hover:underline">full price list</Link>
              {" "}or the <Link href="/sites/cycle-repair/gold-coast" className="text-brand hover:underline">suburbs Stu covers</Link>.
            </p>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-display font-semibold tracking-tighter mb-8">E-bike repair questions</h2>
            <div className="divide-y divide-muted-line border-y border-muted-line">
              {pageFaqs.map((f) => (
                <div key={f.q} className="py-7">
                  <h3 className="font-display font-semibold text-xl mb-2">{f.q}</h3>
                  <p className="text-muted-foreground leading-relaxed text-pretty">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
