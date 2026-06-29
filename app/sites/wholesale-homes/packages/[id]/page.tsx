"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bed, Bath, Car, Maximize, Calendar, Building2 } from "lucide-react";
import { Header } from "../../_components/Header";
import { Footer } from "../../_components/Footer";
import { ChatWidget } from "../../_components/ChatWidget";
import { packages, formatPrice } from "../../_data/packages";

export default function PackageDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = params as unknown as { id: string };
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

            <div className="mt-6 grid gap-8 md:mt-8 md:gap-12 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-[#F7F8F9] md:aspect-[4/3]">
                  <img src={pkg.image} alt={pkg.name} className="h-full w-full object-cover" />
                  <span className="absolute left-4 top-4 rounded-full bg-[#0891b2] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white md:left-5 md:top-5 md:text-xs">Below Market</span>
                </div>
              </div>
              <div className="flex flex-col lg:col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">{pkg.suburb}, {pkg.state}</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight md:mt-3 md:text-3xl lg:text-4xl">{pkg.name}</h1>
                <p className="mt-1 text-xs text-[#5C6670] md:text-sm">{pkg.estate} · by {pkg.builder}</p>

                <div className="mt-6 grid grid-cols-2 gap-3 md:mt-8 md:gap-4">
                  {[
                    { icon: Bed, label: "Bedrooms", value: pkg.beds },
                    { icon: Bath, label: "Bathrooms", value: pkg.baths },
                    { icon: Car, label: "Car Spaces", value: pkg.cars },
                    { icon: Maximize, label: "Land Size", value: `${pkg.landSize}m²` },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-4 md:p-5">
                      <Icon className="h-4 w-4 text-[#0891b2] md:h-5 md:w-5" />
                      <p className="mt-2 text-xs text-[#5C6670] md:text-sm">{label}</p>
                      <p className="text-base font-semibold tracking-tight md:text-lg">{value}</p>
                    </div>
                  ))}
                </div>

                {savings > 0 && (
                  <div className="mt-6 rounded-3xl bg-[#0891b2]/5 p-5 ring-1 ring-[#0891b2]/20 md:mt-8 md:p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">Your Wholesale Advantage</p>
                    <div className="mt-3 flex items-baseline gap-2 md:mt-4">
                      <span className="text-sm text-[#5C6670] line-through md:text-base">Retail {formatPrice(pkg.retailPrice)}</span>
                      <span className="rounded-full bg-[#0891b2]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#0891b2] md:text-xs">Save {formatPrice(savings)}</span>
                    </div>
                    <p className="text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">{formatPrice(pkg.wholesalePrice)}</p>
                    <p className="mt-1 text-xs text-[#5C6670] md:text-sm">Land ready {pkg.landReady}</p>
                  </div>
                )}

                <Link href="/sites/wholesale-homes/contact" className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#0891b2] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1] md:mt-8 md:px-7 md:py-4">
                  Enquire About This Package
                </Link>
              </div>
            </div>

            <div className="mt-12 border-t border-[rgba(0,0,0,0.08)] pt-10 md:mt-16 md:pt-12">
              <h2 className="text-lg font-semibold tracking-tight md:text-xl">Investor Case</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#5C6670] md:mt-4 md:text-base">
                Based on a {pkg.beds}-bedroom property in {pkg.suburb}, {pkg.state} (land ready {pkg.landReady}):
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-3 md:gap-6">
                {[
                  { label: "Purchase Price", value: formatPrice(pkg.wholesalePrice) },
                  { label: "Est. Rental Return", value: "4.2–4.8% gross" },
                  { label: "Deposit Required", value: `${pkg.wholesalePrice >= 600000 ? "5" : "10"}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-4 md:p-5">
                    <p className="text-xs text-[#5C6670] md:text-sm">{label}</p>
                    <p className="text-base font-semibold tracking-tight md:text-lg">{value}</p>
                  </div>
                ))}
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
