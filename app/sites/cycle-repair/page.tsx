import Link from "next/link";
import { tiers, additionalServiceWork, specialist } from "./services";
import { Logo } from "./Logo";

const drivetrainImg = "/cycle-repair/drivetrain.jpg";
const mechanicImg = "/cycle-repair/mechanic.jpg";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Stu's Cycle Repairs",
  description:
    "Mobile bicycle repairs, servicing, wheel builds and E-Bike work across the Gold Coast.",
  telephone: "+61405225721",
  email: "stuscyclerepairs@gmail.com",
  url: "https://stuscyclerepairs.lovable.app/",
  areaServed: { "@type": "Place", name: "Gold Coast, Queensland, Australia" },
  address: { "@type": "PostalAddress", addressRegion: "QLD", addressCountry: "AU" },
  priceRange: "$$",
  makesOffer: [
    { name: "Bronze Service", price: "119.00" },
    { name: "Silver Service", price: "189.00" },
    { name: "Gold Service (Road Bike)", price: "249.00" },
    { name: "Gold Service (MTB)", price: "299.00" },
  ].map((o) => ({
    "@type": "Offer",
    priceCurrency: "AUD",
    price: o.price,
    itemOffered: {
      "@type": "Service",
      name: o.name,
      serviceType: "Bicycle repair and servicing",
      provider: { "@type": "LocalBusiness", name: "Stu's Cycle Repairs" },
      areaServed: { "@type": "Place", name: "Gold Coast, Queensland, Australia" },
    },
  })),
};

const marqueeItems = [
  "Drivetrain Indexing",
  "Hydraulic Bleeding",
  "Wheel Building",
  "Electronic Shifting Setup",
  "Bottom Bracket Overhaul",
  "Bearing Replacement",
  "E-Bike Diagnostics",
  "Custom Bike Fitting",
];

export default function Index() {
  return (
    <div className="min-h-screen bg-bg text-fg font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Sticky mobile CTA */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md md:hidden">
        <a
          href="tel:0405225721"
          className="flex items-center justify-between bg-brand text-brand-foreground px-4 py-3 rounded-xl shadow-2xl ring-1 ring-brand font-semibold text-sm tracking-tight"
        >
          <span>BOOK MOBILE REPAIR</span>
          <span className="flex items-center gap-2">
            <span className="size-1.5 bg-brand-foreground rounded-full animate-pulse" />
            0405 225 721
          </span>
        </a>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-md border-b border-muted-line">
        <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <a href="#top" className="flex items-center">
            <Logo width={160} height={68} className="h-[58px] sm:h-[68px] w-auto" />
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#services" className="hover:text-brand transition-colors">Services</a>
            <a href="#how" className="hover:text-brand transition-colors">How it Works</a>
            <a href="#about" className="hover:text-brand transition-colors">About</a>
            <Link href="/sites/cycle-repair/contact" className="hover:text-brand transition-colors">Contact</Link>

            <a
              href="tel:0405225721"
              className="bg-brand text-brand-foreground px-4 py-2 rounded-md font-semibold text-xs tracking-wide hover:bg-brand/90 transition-colors"
            >
              0405 225 721
            </a>
          </div>
        </nav>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="relative pt-14 pb-24 border-b border-muted-line">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface ring-1 ring-white/10 text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-6">
                <span className="size-2 bg-brand rounded-full" />
                Gold Coast Mobile Workshop
              </div>
              <h1 className="text-5xl lg:text-7xl font-display font-semibold tracking-tighter leading-[0.95] text-balance mb-8">
                Pro-level mobile bicycle repairs, delivered to your Gold Coast driveway.
              </h1>
              <p className="text-muted-foreground text-lg max-w-[48ch] text-pretty mb-10">
                Stu brings 37 years of elite mechanical experience directly to your home or
                office. No shop queues, no logistics. Just a perfectly tuned ride.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="#services"
                  className="bg-brand text-brand-foreground px-6 py-3 rounded-lg font-semibold text-sm ring-1 ring-brand hover:bg-brand/90 transition-colors"
                >
                  Book a Service
                </a>
                <a
                  href="tel:0405225721"
                  className="px-6 py-3 rounded-lg font-semibold text-sm ring-1 ring-white/15 hover:ring-brand/60 hover:text-brand transition-colors"
                >
                  Call 0405 225 721
                </a>
              </div>
              <div className="mt-10 flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="size-8 rounded-full bg-surface-2 ring-2 ring-bg" />
                  <div className="size-8 rounded-full bg-surface ring-2 ring-bg" />
                  <div className="size-8 rounded-full bg-surface-2 ring-2 ring-bg" />
                </div>
                <span className="text-xs text-muted-foreground font-medium tracking-wide">
                  500+ local riders served on the Gold Coast
                </span>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square w-full rounded-3xl overflow-hidden outline outline-1 -outline-offset-1 outline-white/10 bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={drivetrainImg}
                  alt="Close-up of a freshly serviced bicycle drivetrain"
                  width={1200}
                  height={1200}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="hidden md:flex absolute -bottom-6 -left-6 bg-brand text-brand-foreground p-5 rounded-xl shadow-2xl items-center gap-4">
                <div className="text-3xl font-display font-bold leading-none">37</div>
                <div className="text-[10px] font-bold uppercase tracking-widest leading-tight">
                  Years on
                  <br />
                  the tools
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Marquee */}
        <div className="overflow-hidden py-4 border-b border-muted-line bg-surface/30">
          <div className="flex gap-12 animate-marquee whitespace-nowrap text-[11px] font-bold tracking-[0.22em] uppercase text-muted-foreground">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span key={i} className="flex items-center gap-12">
                {item}
                <span className="text-brand">/</span>
              </span>
            ))}
          </div>
        </div>

        {/* Service Menu */}
        <section id="services" className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
              <div>
                <h2 className="text-xs font-bold tracking-[0.22em] text-brand uppercase mb-3">
                  Service Tiers
                </h2>
                <p className="text-4xl md:text-5xl font-display font-semibold tracking-tighter">
                  The Mechanic&apos;s Menu
                </p>
              </div>
              <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                Four honest tiers. Parts not included. Every job ends with a
                test ride and a signed-off checklist.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 grid-rows-[auto_auto_1fr_auto_auto_auto_auto] gap-px bg-muted-line border border-muted-line rounded-2xl overflow-hidden">
              {tiers.map((t) => (
                <div
                  key={t.name}
                  className={`relative p-8 grid row-span-7 subgrid-rows gap-y-6 ${
                    t.featured ? "bg-surface ring-1 ring-brand/40 z-10" : "bg-bg"
                  }`}
                >
                  <div
                    className={`w-fit inline-flex self-start text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${
                      t.featured
                        ? "bg-brand text-brand-foreground"
                        : "bg-transparent text-transparent"
                    }`}
                    aria-hidden={!t.featured}
                  >
                    Most Popular
                  </div>

                  <div className="flex justify-between items-start">

                    <div>
                      <h3 className="font-display font-semibold text-2xl mb-1">{t.name}</h3>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        {t.tag}
                      </p>
                    </div>
                    <div className="text-3xl font-display font-semibold text-brand">{t.price}</div>
                  </div>
                  <ul className="space-y-3.5">
                    {t.items.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-3">
                        <span className="size-4 mt-0.5 shrink-0 bg-surface-2 rounded grid place-items-center text-[9px] font-bold text-brand">
                          ✓
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/sites/cycle-repair/quote?tier=${encodeURIComponent(t.name)}`}
                    className={`block text-center py-3 rounded-lg font-semibold text-sm transition-colors ${
                      t.featured
                        ? "bg-cta text-cta-foreground hover:bg-cta/90 glow-cta"
                        : "bg-cta text-cta-foreground hover:bg-cta/90"
                    }`}
                  >
                    Lock it in
                  </Link>
                  {t.featured ? (
                    <p className="text-[11px] text-center text-cta font-semibold tracking-wide">
                      *Most Popular choice with Gold Coast riders
                    </p>
                  ) : (
                    <div aria-hidden="true" />
                  )}
                  <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                    Included in this service:
                  </p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {t.note}
                  </p>

                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Additional Service Work */}
        <section className="py-24 border-b border-muted-line">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-12">
              <h2 className="text-xs font-bold tracking-[0.22em] text-brand uppercase mb-3">
                Additional Service Work
              </h2>
              <p className="text-3xl md:text-4xl font-display font-semibold tracking-tighter">
                Fast fixes and precision adjustments
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-muted-line border border-muted-line rounded-2xl overflow-hidden">
              {additionalServiceWork.map((s) => (
                <div
                  key={s.label}
                  className="text-sm font-medium p-5 bg-bg flex justify-between gap-4"
                >
                  <span>{s.label}</span>
                  <span className="text-brand whitespace-nowrap">{s.price}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Specialist + Mobile advantage */}
        <section className="py-24 border-y border-muted-line bg-surface/20">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-4 gap-12">
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.22em] mb-6">
                Specialist Care
              </h2>
              <ul className="space-y-3">
                {specialist.map((s) => (
                  <li
                    key={s.label}
                    className="text-sm font-medium border-b border-muted-line pb-2 flex justify-between gap-4"
                  >
                    <span>{s.label}</span>
                    <span className="text-brand whitespace-nowrap">{s.price}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div id="how" className="lg:col-span-3 grid sm:grid-cols-2 gap-6">
              {[
                {
                  n: "01",
                  title: "The Mobile Advantage",
                  body: "No more wrestling bikes into car boots. Stu arrives with a fully equipped pro-grade mobile workshop and services your bike while you work, train or rest.",
                },
                {
                  n: "02",
                  title: "Pick-up & Drop-off",
                  body: "For complex rebuilds, wheel builds or boxed bike assembly, Stu collects your bike and returns it precision-tuned and test-ridden.",
                },
                {
                  n: "03",
                  title: "Gold Coast Native",
                  body: "Servicing riders from Coolangatta to Paradise Point. Local knowledge of the terrain means your setup is dialled for GC conditions.",
                },
                {
                  n: "04",
                  title: "E-Bike Certified",
                  body: "Diagnostics and servicing for modern high-torque E-Bike systems. Motors, drivetrains, brakes and firmware checks.",
                },
              ].map((c) => (
                <div
                  key={c.n}
                  className="p-7 rounded-2xl bg-bg ring-1 ring-white/5 hover:ring-brand/40 transition-colors"
                >
                  <div className="size-9 bg-surface rounded-lg grid place-items-center mb-5">
                    <span className="text-brand text-xs font-mono font-bold">{c.n}</span>
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">{c.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className="py-24">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 lg:gap-20 items-center">
            <div className="relative">
              <div className="aspect-[4/5] w-full bg-surface rounded-3xl overflow-hidden outline outline-1 -outline-offset-1 outline-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mechanicImg}
                  alt="Portrait of Stu, veteran bicycle mechanic"
                  loading="lazy"
                  width={800}
                  height={1000}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <h2 className="text-xs font-bold tracking-[0.22em] text-brand uppercase mb-4">
                About Stu
              </h2>
              <p className="text-4xl md:text-5xl font-display font-semibold tracking-tighter mb-8 leading-tight">
                37 years of grease &amp; gears.
              </p>
              <div className="space-y-5 text-muted-foreground leading-relaxed">
                <p className="text-pretty">
                  Stu started wrenching before integrated shifters were a thing. With nearly
                  four decades in the Gold Coast cycling scene, there isn&apos;t a mechanical issue
                  he hasn&apos;t solved.
                </p>
                <p className="text-pretty">
                  From carbon race machines to reliable daily commuters and the latest
                  high-torque E-Bikes, every bolt gets the same championship-level precision.
                </p>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-6 border-t border-muted-line pt-8">
                <Stat value="37" label="Years exp" />
                <Stat value="12k+" label="Bikes tuned" />
                <Stat value="5★" label="Local rated" />
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial + Contact */}
        <section className="py-24 border-t border-muted-line bg-surface/30">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-stretch">
            <div className="flex flex-col justify-between">
              <div>
                <h2 className="text-xs font-bold tracking-[0.22em] text-brand uppercase mb-4">
                  Get in Touch
                </h2>
                <p className="font-display text-3xl md:text-4xl font-semibold tracking-tighter mb-8">
                  Ready for a smoother ride?
                </p>
                <div className="space-y-6">
                  <a href="tel:0405225721" className="block group">
                    <span className="text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
                      Call Stu directly
                    </span>
                    <p className="text-3xl font-display font-semibold mt-1 group-hover:text-brand transition-colors">
                      0405 225 721
                    </p>
                  </a>
                  <a href="mailto:stuscyclerepairs@gmail.com" className="block group">
                    <span className="text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
                      Email
                    </span>
                    <p className="text-lg font-medium mt-1 group-hover:text-brand transition-colors">
                      stuscyclerepairs@gmail.com
                    </p>
                  </a>
                  <div>
                    <span className="text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
                      Service area
                    </span>
                    <p className="text-lg font-medium mt-1">Gold Coast, QLD (Coolangatta to Paradise Point)</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-bg p-8 md:p-10 rounded-3xl ring-1 ring-white/5 flex flex-col justify-between">
              <div>
                <div className="text-brand text-4xl font-display leading-none mb-6">&quot;</div>
                <p className="text-lg text-fg/90 italic leading-relaxed mb-8">
                  Stu is the only mechanic I trust with my S-Works. He caught a hairline crack
                  in my fork that two other shops missed. Absolute legend, and he came to me.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-6 border-t border-muted-line">
                <div className="size-11 bg-surface-2 rounded-full grid place-items-center font-display font-bold text-brand">
                  M
                </div>
                <div>
                  <p className="text-sm font-semibold">Marcus C.</p>
                  <p className="text-xs text-muted-foreground">Road cyclist · Burleigh Heads</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-surface/50 border-t border-muted-line pt-16 pb-28 md:pb-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-3">
            <Logo width={118} height={50} className="h-[50px] w-auto opacity-90" />
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-muted-foreground">
              Stu&apos;s Cycle Repairs © {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex gap-8 text-[11px] font-bold tracking-[0.22em] uppercase text-muted-foreground">
            <a href="#services" className="hover:text-brand transition-colors">Services</a>
            <a href="#about" className="hover:text-brand transition-colors">About</a>
            <Link href="/sites/cycle-repair/contact" className="hover:text-brand transition-colors">Contact</Link>
            <a href="tel:0405225721" className="hover:text-brand transition-colors">Call Stu</a>

          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl md:text-4xl font-display font-bold text-brand leading-none">
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-2">
        {label}
      </div>
    </div>
  );
}
