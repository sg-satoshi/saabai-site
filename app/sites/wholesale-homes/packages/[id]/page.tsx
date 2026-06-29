"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import { use } from "react";
import { ArrowLeft, Bed, Bath, Car, Maximize, Calendar, Building2, Ruler, Home, Check, ArrowRight } from "lucide-react";
import { Header } from "../../_components/Header";
import { Footer } from "../../_components/Footer";
import { ChatWidget } from "../../_components/ChatWidget";
import { packages, formatPrice } from "../../_data/packages";

export default function PackageDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const pkg = packages.find((p) => p.id === id);
  if (!pkg) notFound();

  const savings = pkg.retailPrice - pkg.wholesalePrice;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-10 md:py-16">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            <Link href="/sites/wholesale-homes/packages" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C6670] hover:text-[#1A2B3C] md:text-sm">
              <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" /> Back to packages
            </Link>

            {/* ── Hero Image ── */}
            <div className="mt-5">
              <div className="relative aspect-[21/9] overflow-hidden rounded-2xl bg-[#F7F8F9] md:rounded-3xl">
                <img src={pkg.image} alt={pkg.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <span className="absolute left-5 top-5 rounded-full bg-[#0891b2] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white md:left-7 md:top-7 md:text-xs">{pkg.badge}</span>
              </div>
            </div>

            {/* ── Header + Specs ── */}
            <div className="mt-8 grid gap-8 md:mt-10 md:gap-12 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">{pkg.suburb}, {pkg.state}</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight md:mt-3 md:text-3xl lg:text-4xl">{pkg.name}</h1>
                <p className="mt-1 text-xs text-[#5C6670] md:text-sm">{pkg.estate} · by {pkg.builder}</p>

                <p className="mt-5 text-sm leading-relaxed text-[#5C6670] md:mt-6 md:text-base">{pkg.description}</p>
              </div>

              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-5 md:p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">Pricing</p>

                  {savings > 0 && (
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-sm text-[#5C6670] line-through md:text-base">Retail {formatPrice(pkg.retailPrice)}</span>
                      <span className="rounded-full bg-[#0891b2]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#0891b2] md:text-xs">Save {formatPrice(savings)}</span>
                    </div>
                  )}

                  <p className="text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">{formatPrice(pkg.wholesalePrice)}</p>
                  <p className="mt-1 text-xs text-[#5C6670] md:text-sm">Land ready {pkg.landReady}</p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {[
                      { icon: Bed, label: "Beds", value: pkg.beds },
                      { icon: Bath, label: "Baths", value: pkg.baths },
                      { icon: Car, label: "Car", value: pkg.cars },
                      { icon: Maximize, label: "Land", value: `${pkg.landSize}m²` },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-2 rounded-xl bg-[#f5f2eb]/60 px-3 py-2.5">
                        <Icon className="h-4 w-4 shrink-0 text-[#0891b2]" />
                        <div>
                          <p className="text-[10px] text-[#5C6670]">{label}</p>
                          <p className="text-sm font-semibold tracking-tight">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Link href="/sites/wholesale-homes/contact" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0891b2] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1] md:py-4">
                    Enquire About This Package
                  </Link>
                </div>
              </div>
            </div>

            {/* ── Floorplan Specs ── */}
            <div className="mt-12 border-t border-[rgba(0,0,0,0.08)] pt-10 md:mt-16 md:pt-12">
              <h2 className="text-lg font-semibold tracking-tight md:text-xl">Floorplan Specifications</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-4 md:gap-6">
                {[
                  { icon: Home, label: "House Size", value: `${pkg.houseSize}m²` },
                  { icon: Maximize, label: "Land Size", value: `${pkg.landSize}m²` },
                  { icon: Ruler, label: "Ceiling Height", value: "2.59m (living)" },
                  { icon: Calendar, label: "Est. Completion", value: pkg.landReady },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4 md:p-5">
                    <Icon className="h-4 w-4 text-[#0891b2] md:h-5 md:w-5" />
                    <p className="mt-2 text-xs text-[#5C6670] md:text-sm">{label}</p>
                    <p className="text-base font-semibold tracking-tight md:text-lg">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f5f2eb]/40 p-6 md:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5C6670]">Floor Plan — Ground Level</p>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 md:text-base">
                  <div className="flex items-center gap-3"><Check className="h-4 w-4 shrink-0 text-[#0891b2]" /> Open-plan kitchen, dining &amp; living</div>
                  <div className="flex items-center gap-3"><Check className="h-4 w-4 shrink-0 text-[#0891b2]" /> Covered alfresco / courtyard</div>
                  <div className="flex items-center gap-3"><Check className="h-4 w-4 shrink-0 text-[#0891b2]" /> Powder room (guest toilet)</div>
                  <div className="flex items-center gap-3"><Check className="h-4 w-4 shrink-0 text-[#0891b2]" /> Laundry with external access</div>
                  <div className="flex items-center gap-3"><Check className="h-4 w-4 shrink-0 text-[#0891b2]" /> Walk-in pantry</div>
                  <div className="flex items-center gap-3"><Check className="h-4 w-4 shrink-0 text-[#0891b2]" /> Double garage internal access</div>
                </div>
                {pkg.beds >= 4 && (
                  <>
                    <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[#5C6670]">Floor Plan — Upper Level</p>
                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 md:text-base">
                      <div className="flex items-center gap-3"><Check className="h-4 w-4 shrink-0 text-[#0891b2]" /> Master bedroom with WIR &amp; ensuite</div>
                      <div className="flex items-center gap-3"><Check className="h-4 w-4 shrink-0 text-[#0891b2]" /> {pkg.beds - 1} additional bedrooms with BIRs</div>
                      <div className="flex items-center gap-3"><Check className="h-4 w-4 shrink-0 text-[#0891b2]" /> Main bathroom (separate bath &amp; shower)</div>
                      {pkg.baths >= 3 && <div className="flex items-center gap-3"><Check className="h-4 w-4 shrink-0 text-[#0891b2]" /> Additional ensuite / third bathroom</div>}
                      <div className="flex items-center gap-3"><Check className="h-4 w-4 shrink-0 text-[#0891b2]" /> Activity / rumpus room</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Inclusions ── */}
            <div className="mt-10 border-t border-[rgba(0,0,0,0.08)] pt-10 md:mt-14 md:pt-12">
              <h2 className="text-lg font-semibold tracking-tight md:text-xl">Standard Inclusions</h2>
              <div className="mt-6 grid gap-3 md:grid-cols-2 md:gap-4">
                {[
                  "Stone benchtops (kitchen, bathrooms, ensuite)",
                  "20mm reconstituted stone island bench",
                  "900mm freestanding gas cooker &amp; rangehood",
                  "Stainless steel dishwasher",
                  "Ducted reverse-cycle air conditioning",
                  "Downlights throughout",
                  "Quality timber-look flooring (living areas)",
                  "Carpet to bedrooms &amp; hallway",
                  "Window furnishings (curtains or blinds)",
                  "Landscaping — front yard, turf &amp; garden beds",
                  "Driveway, paths &amp; fencing",
                  "Letterbox, clothesline &amp; external tap",
                  "7mm laminate benchtops (laundry)",
                  "Single coat of paint throughout",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0891b2]" />
                    <span className="text-sm text-[#5C6670] md:text-base">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Investor Case ── */}
            <div className="mt-12 border-t border-[rgba(0,0,0,0.08)] pt-10 md:mt-16 md:pt-12">
              <h2 className="text-lg font-semibold tracking-tight md:text-xl">Investor Case</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#5C6670] md:mt-4 md:text-base">
                Based on a {pkg.beds}-bedroom property in {pkg.suburb}, {pkg.state} (land ready {pkg.landReady}):
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-3 md:gap-6">
                {[
                  { label: "Wholesale Purchase Price", value: formatPrice(pkg.wholesalePrice) },
                  { label: "Est. Rental Return", value: "4.2–4.8% gross" },
                  { label: "Deposit Required", value: `${pkg.wholesalePrice >= 600000 ? "5" : "10"}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-4 md:p-5">
                    <p className="text-xs text-[#5C6670] md:text-sm">{label}</p>
                    <p className="text-base font-semibold tracking-tight md:text-lg">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl bg-[#0891b2]/5 p-5 ring-1 ring-[#0891b2]/20 md:p-6">
                <p className="text-xs font-semibold md:text-sm">{pkg.highlight}</p>
                <p className="mt-2 text-xs leading-relaxed text-[#5C6670] md:text-sm">
                  This package represents wholesale pre-market pricing. Comparable properties in {pkg.suburb} are currently listed at {formatPrice(pkg.retailPrice)}+ retail. By securing at wholesale, your equity position is established at settlement — not years down the track. Speak with our advisor for a full investment analysis tailored to your portfolio.
                </p>
              </div>
            </div>

            {/* ── CTA ── */}
            <div className="mt-12 rounded-3xl bg-[#1A2B3C] p-8 text-center text-white md:mt-16 md:p-12">
              <Building2 className="mx-auto h-7 w-7 text-[#0891b2]" />
              <h2 className="mt-4 text-xl font-semibold tracking-tight md:text-2xl">Want to secure this package?</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm text-white/70">Speak with our principal advisor. A 20-minute call covers your finance, timeline, and next steps.</p>
              <Link href="/sites/wholesale-homes/contact" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0891b2] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1] md:px-7 md:py-4">
                Enquire Now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
