import Link from "next/link";
import { PageShell } from "../PageShell";
import { tiers } from "../services";
import { googleRating, googleReviewCount } from "../reviews";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Mobile bicycle repair and servicing, Gold Coast",
  serviceType: "Bicycle repair and servicing",
  provider: { "@type": "LocalBusiness", "@id": "https://stuscyclerepairs.com/#business", name: "Stu's Cycle Repairs" },
  areaServed: { "@type": "Place", name: "Gold Coast, Queensland, Australia" },
  url: "https://stuscyclerepairs.com/gold-coast",
};

const points = [
  { title: "He comes to you", body: "Stu arrives with a fully equipped pro-grade mobile workshop and services your bike at your home or office, while you work, train or rest. No wrestling bikes into car boots." },
  { title: "All of the Gold Coast", body: "Stu services riders, professional and recreational, from all over the Gold Coast, with local knowledge of the terrain so your set-up suits Gold Coast conditions." },
  { title: "Pick-up and drop-off for bigger jobs", body: "For complex rebuilds, wheel builds or boxed bike assembly, Stu collects your bike and returns it precision-tuned and test-ridden." },
  { title: "E-bikes welcome", body: "Diagnostics and servicing for modern high-torque e-bike systems, including motors, drivetrains, brakes and firmware checks." },
];

export default function GoldCoastPage() {
  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <section className="border-b border-muted-line py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface ring-1 ring-white/10 text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-6">
              <span className="size-2 bg-brand rounded-full" />
              Gold Coast, QLD
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-semibold tracking-tighter leading-[0.98] text-balance max-w-[22ch]">
              Mobile bike mechanic on the Gold Coast
            </h1>
            <p className="mt-6 text-muted-foreground text-lg max-w-[56ch] text-pretty">
              Stu brings 37 years of experience straight to your driveway. Servicing, repairs, wheel builds
              and e-bike work across all of the Gold Coast, with no shop queues.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Rated {googleRating} from {googleReviewCount} Google reviews.
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
            <h2 className="text-xs font-bold tracking-[0.22em] text-brand uppercase mb-8">How it works on the Gold Coast</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {points.map((p) => (
                <div key={p.title} className="p-7 rounded-2xl bg-bg ring-1 ring-white/5 hover:ring-brand/40 transition-colors">
                  <h3 className="font-display font-semibold text-lg mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 border-y border-muted-line bg-surface/20">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-xs font-bold tracking-[0.22em] text-brand uppercase mb-3">Service prices</h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-[60ch]">
              Parts are not included. There is a $70 call-out fee for repairs under $120. See the{" "}
              <Link href="/sites/cycle-repair#services" className="text-brand hover:underline">full price list</Link>.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-muted-line border border-muted-line rounded-2xl overflow-hidden">
              {tiers.map((t) => (
                <div key={t.name} className="bg-bg p-6">
                  <div className="flex justify-between items-baseline gap-3">
                    <h3 className="font-display font-semibold text-xl">{t.name}</h3>
                    <span className="text-2xl font-display font-semibold text-brand">{t.price}</span>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{t.tag}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="text-xs font-bold tracking-[0.22em] text-brand uppercase mb-3">Service area</h2>
              <p className="text-muted-foreground leading-relaxed text-pretty">
                Stu covers all of the Gold Coast, QLD, and also the Tweed Coast, NSW. Not sure if he
                covers your suburb? Send an enquiry or give him a call and he will let you know.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                More questions? Read the <Link href="/sites/cycle-repair/faq" className="text-brand hover:underline">FAQ</Link>.
              </p>
            </div>
            <div className="p-7 rounded-2xl bg-surface ring-1 ring-white/10">
              <h2 className="text-xs font-bold tracking-[0.22em] text-brand uppercase mb-4">Book Stu</h2>
              <a href="tel:0405225721" className="block text-3xl font-display font-semibold hover:text-brand transition-colors">0405 225 721</a>
              <a href="mailto:stuscyclerepairs@gmail.com" className="block mt-2 text-muted-foreground hover:text-brand transition-colors break-all">stuscyclerepairs@gmail.com</a>
              <Link
                href="/sites/cycle-repair/contact"
                className="mt-6 block text-center py-3 rounded-lg font-semibold text-sm bg-brand/15 text-brand ring-1 ring-brand/60 hover:bg-brand hover:text-brand-foreground transition-colors"
              >
                Send an enquiry
              </Link>
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
