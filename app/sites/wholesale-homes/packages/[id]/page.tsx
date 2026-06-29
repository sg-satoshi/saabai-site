"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bed, Bath, Car, Maximize, Calendar, Building2 } from "lucide-react";
import { Header } from "../../_components/Header";
import { Footer } from "../../_components/Footer";
import { ChatWidget } from "../../_components/ChatWidget";
import { Section } from "../../_components/Section";
import { PackageCard } from "../../_components/PackageCard";
import { packages, formatPrice } from "../../_data/packages";

export default function PackageDetail({ params }: { params: { id: string } }) {
  const pkg = packages.find((p) => p.id === params.id);
  if (!pkg) notFound();

  const savings = pkg.retailPrice - pkg.wholesalePrice;
  const similar = packages.filter((p) => p.id !== pkg.id).slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="border-b border-[rgba(0,0,0,0.08)] bg-[#f5f2eb]/40">
          <div className="mx-auto w-full max-w-7xl px-6 py-5 lg:px-10">
            <Link href="/sites/wholesale-homes/packages" className="inline-flex items-center gap-2 text-sm text-[#5C6670] hover:text-[#1A2B3C]">
              <ArrowLeft className="h-4 w-4" /> All Packages
            </Link>
          </div>
        </div>

        <Section className="!py-12">
          <div className="grid gap-10 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <div className="overflow-hidden rounded-3xl bg-[#F7F8F9]">
                <img src={pkg.image} alt={pkg.name} className="h-full w-full object-cover" />
              </div>
            </div>

            <div className="lg:col-span-2">
              <span className="inline-block rounded-full bg-[#0891b2] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
                {pkg.badge}
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#5C6670]">
                {pkg.suburb}, {pkg.state} &middot; {pkg.estate}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl text-[#1A2B3C]">{pkg.name}</h1>
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-[#5C6670]">
                <Building2 className="h-4 w-4" /> Built by {pkg.builder}
              </p>

              <div className="mt-7 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6">
                <div className="flex items-baseline gap-3">
                  <span className="text-base text-[#5C6670] line-through">{formatPrice(pkg.retailPrice)}</span>
                  <span className="rounded-full bg-[#0891b2]/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#0891b2]">
                    Save {formatPrice(savings)}
                  </span>
                </div>
                <p className="mt-1 text-4xl font-semibold tracking-tight">{formatPrice(pkg.wholesalePrice)}</p>
                <p className="mt-3 inline-flex items-center gap-2 text-sm text-[#5C6670]">
                  <Calendar className="h-4 w-4" /> Land ready {pkg.landReady}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <Spec icon={Bed} label="Bedrooms" value={pkg.beds} />
                <Spec icon={Bath} label="Bathrooms" value={pkg.baths} />
                <Spec icon={Car} label="Garage" value={pkg.cars} />
                <Spec icon={Maximize} label="Land" value={`${pkg.landSize}m²`} />
                <Spec icon={Maximize} label="House" value={`${pkg.houseSize}m²`} />
                <Spec icon={Calendar} label="Build" value="~12 months" />
              </div>

              <div className="mt-7 flex flex-col gap-3">
                <Link href="/sites/wholesale-homes/contact" className="inline-flex items-center justify-center rounded-full bg-[#0891b2] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#0369a1]">
                  Enquire About This Package
                </Link>
                <Link href="/sites/wholesale-homes/contact" className="inline-flex items-center justify-center rounded-full border border-[#1A2B3C] px-6 py-3.5 text-sm font-semibold text-[#1A2B3C] hover:bg-[#1A2B3C] hover:text-white">
                  Book a Discovery Call
                </Link>
              </div>
            </div>
          </div>
        </Section>

        <Section className="bg-[#f5f2eb]/40">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Why this package works for investors</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { t: "Strong rental yield", d: `Comparable rentals in ${pkg.suburb} returning 4.6 to 5.2% gross.` },
              { t: "Depreciation benefits", d: "New build, full depreciation schedule from day one." },
              { t: "Growth corridor", d: `${pkg.estate} sits inside a designated growth precinct with infrastructure investment.` },
              { t: pkg.highlight, d: "An investor-grade outcome locked at pre-market pricing." },
              { t: "Negative gearing retained", d: "New construction retains negative gearing post-2027 reforms." },
              { t: "Fixed-price contract", d: "Builder fixed-price contract with full inclusions, no surprises." },
            ].map((b) => (
              <div key={b.t} className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6">
                <p className="font-semibold">{b.t}</p>
                <p className="mt-2 text-sm text-[#5C6670]">{b.d}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section>
          <h2 className="text-2xl font-semibold tracking-tight">Similar packages</h2>
          <div className="mt-8 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {similar.map((p) => <PackageCard key={p.id} pkg={p} />)}
          </div>
        </Section>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}

function Spec({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-[#5C6670]">
        <Icon className="h-3.5 w-3.5" />{label}
      </div>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
