"use client";

import Link from "next/link";
import { ClientPortalShell } from "../../../_components/ClientPortalShell";
import { ArrowLeft, Home, Bath, Car, MapPin, Calendar, Building2, DollarSign, Phone, Calculator, Check, FileText } from "lucide-react";
import { EnquiryForm } from "../../../_components/EnquiryForm";
import { setSelectedProperty } from "../../../_lib/selectedProperty";
import { useWhBase } from "../../../_lib/base-context";

import type { PackageDetail as Pkg } from "../../../_data/member-packages";


const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);

export default function PackageDetailClient({ pkg }: { pkg: Pkg | null }) {
  const base = useWhBase();
  if (!pkg) {
    return (
      <ClientPortalShell>
        <div className="flex flex-1 items-center justify-center px-6 py-24">
          <div className="text-center">
            <p className="text-lg font-semibold text-[#1A2B3C]">Package not found</p>
            <Link href={`${base}/client/dashboard`} className="mt-4 inline-flex items-center gap-2 text-sm text-[#0891b2] hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to packages
            </Link>
          </div>
        </div>
      </ClientPortalShell>
    );
  }

  return (
    <ClientPortalShell>
      <main className="flex-1 bg-[#f8f6f2]">
        <section className="py-8 md:py-12">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            {/* Back link */}
            <Link href={`${base}/client/dashboard`} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0891b2] hover:underline md:text-sm">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to all packages
            </Link>

            {/* Hero Image — flyer-style images (with thumbImage set) show the full,
                uncropped original here; clean stock photos keep a cover crop. */}
            <div className="mt-6 overflow-hidden rounded-3xl bg-[#f5f2eb]">
              <img
                src={pkg.image}
                alt={pkg.name}
                className={pkg.thumbImage ? "w-full object-contain" : "aspect-[3/2] w-full object-cover md:aspect-[16/9]"}
              />
            </div>

            {/* Info Panel — below the image like the promo templates */}
            <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm md:p-8">
              {/* Header Row */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className={`inline-block rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white md:text-xs ${
                    pkg.badge === "Limited Availability" ? "bg-[#0891b2]" : pkg.badge === "New Release" ? "bg-green-600" : "bg-[#1A2B3C]"
                  }`}>
                    {pkg.badge}
                  </span>
                  <h1 className="mt-3 text-xl font-semibold tracking-tight text-[#1A2B3C] md:text-2xl">{pkg.name}</h1>
                  <p className="mt-1 text-sm text-[#5C6670]">{pkg.suburb}, {pkg.state}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[10px] text-[#9CA3AF]">Reg. Retail</span>
                    <span className="text-xs text-[#9CA3AF] line-through">{formatPrice(pkg.retailPrice)}</span>
                    <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                      {Math.round((pkg.retailPrice - pkg.wholesalePrice) / pkg.retailPrice * 100)}% OFF
                    </span>
                  </div>
                  <div className="mt-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0891b2]">Members Price</span>
                  </div>
                  <p className="text-2xl font-bold text-[#1A2B3C] md:text-3xl">{formatPrice(pkg.wholesalePrice)}</p>
                  <p className="text-xs font-medium text-green-600">
                    ${((pkg.retailPrice - pkg.wholesalePrice) / 1000).toFixed(0)}k Discount for Members
                  </p>
                  <Link
                    href={`${base}/client/calculators/investment-analyzer`}
                    onClick={() => setSelectedProperty({
                      id: pkg.id, name: pkg.name, price: pkg.wholesalePrice, state: pkg.state, suburb: pkg.suburb,
                      mainRent: pkg.rentalAppraisal?.weeklyMain, grannyRent: pkg.rentalAppraisal?.weeklyGranny,
                    })}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#1A2B3C] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0d1b2a]"
                  >
                    <Calculator className="h-3.5 w-3.5" /> Run the Numbers
                  </Link>
                </div>
              </div>

              {/* Divider */}
              <div className="my-6 border-t border-[rgba(0,0,0,0.06)]" />

              {/* Price Breakdown & Yield */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {pkg.landPrice && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670]">Land</p>
                    <p className="text-sm font-semibold text-[#1A2B3C]">{formatPrice(pkg.landPrice)}</p>
                    <p className="text-[10px] text-[#5C6670]">{pkg.landSize}m²</p>
                  </div>
                )}
                {pkg.totalBuildPrice && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670]">Build</p>
                    <p className="text-sm font-semibold text-[#1A2B3C]">{formatPrice(pkg.totalBuildPrice)}</p>
                    <p className="text-[10px] text-[#5C6670]">incl. main + granny</p>
                  </div>
                )}
                {pkg.yieldVal && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670]">Forecasted Yield</p>
                    <p className="text-sm font-bold text-green-600">{pkg.yieldVal}</p>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="my-6 border-t border-[rgba(0,0,0,0.06)]" />

              {/* Specs */}
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Main House */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#5C6670]">Main House</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      pkg.houseSize && { icon: Home, label: "Size", value: `${Math.round(pkg.houseSize)}m²` },
                      pkg.landSize && { icon: MapPin, label: "Land", value: `${pkg.landSize}m²` },
                      { icon: Home, label: "Beds", value: pkg.beds },
                      { icon: Bath, label: "Baths", value: pkg.baths },
                      { icon: Car, label: "Cars", value: pkg.cars },
                    ].filter(Boolean).map((s: any) => (
                      <div key={s.label} className="flex items-center gap-1.5 rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f8f6f2] px-3 py-2">
                        <s.icon className="h-3.5 w-3.5 text-[#0891b2]" />
                        <div>
                          <p className="text-[10px] text-[#5C6670]">{s.label}</p>
                          <p className="text-xs font-semibold text-[#1A2B3C]">{s.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {pkg.landReady && (
                    <p className="mt-2 text-xs text-[#5C6670]">Land ready: {pkg.landReady}</p>
                  )}
                </div>

                {/* Granny Flat */}
                {pkg.grannyBeds && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#0891b2]">Granny Flat</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        pkg.grannySize && { icon: Home, label: "Size", value: `${pkg.grannySize}m²` },
                        { icon: Home, label: "Beds", value: pkg.grannyBeds },
                        { icon: Bath, label: "Baths", value: pkg.grannyBaths },
                      ].filter(Boolean).map((s: any) => (
                        <div key={s.label} className="flex items-center gap-1.5 rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f8f6f2] px-3 py-2">
                          <s.icon className="h-3.5 w-3.5 text-[#0891b2]" />
                          <div>
                            <p className="text-[10px] text-[#5C6670]">{s.label}</p>
                            <p className="text-xs font-semibold text-[#1A2B3C]">{s.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Highlight */}
              <p className="mt-5 text-sm leading-relaxed text-[#0891b2]">{pkg.highlight}</p>
            </div>

            {/* Description */}
            <div className="mt-6">
              <div className="max-w-3xl">
                <h2 className="text-base font-semibold text-[#1A2B3C] md:text-lg">About this package</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#5C6670] md:text-base">{pkg.description}</p>
              </div>
            </div>

            {/* Documents, inclusions & rental appraisal */}
            {(pkg.brochureUrl || pkg.rentalAppraisal || pkg.inclusions) && (
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                {pkg.inclusions && (
                  <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#5C6670]">Highlighted Inclusions</p>
                    <ul className="mt-3 space-y-1.5">
                      {pkg.inclusions.map((i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#5C6670]">
                          <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#0891b2]" /> {i}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(pkg.rentalAppraisal || pkg.brochureUrl) && (
                  <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#0891b2]">Professional Rental Appraisal</p>
                    {pkg.rentalAppraisal && (
                      <>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-[#1A2B3C]">${pkg.rentalAppraisal.weeklyMain + pkg.rentalAppraisal.weeklyGranny}/wk</span>
                          <span className="text-xs text-[#5C6670]">combined</span>
                        </div>
                        <p className="mt-1 text-xs text-[#5C6670]">Main house ${pkg.rentalAppraisal.weeklyMain}/wk + Granny flat ${pkg.rentalAppraisal.weeklyGranny}/wk</p>
                        <p className="mt-3 text-xs leading-relaxed text-[#5C6670]">
                          Appraised by <strong className="text-[#1A2B3C]">{pkg.rentalAppraisal.appraiser}</strong>, {pkg.rentalAppraisal.company} — based on comparable rental evidence, property condition and current market conditions. Use these figures directly in the calculators for accurate cash-flow projections.
                        </p>
                      </>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {pkg.brochureUrl && (
                        <a href={pkg.brochureUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,0,0,0.08)] px-4 py-2 text-xs font-semibold text-[#1A2B3C] transition-colors hover:border-[#0891b2]/30">
                          <FileText className="h-3.5 w-3.5" /> Sales Brochure (PDF)
                        </a>
                      )}
                      {pkg.rentalAppraisal && (
                        <a href={pkg.rentalAppraisal.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,0,0,0.08)] px-4 py-2 text-xs font-semibold text-[#1A2B3C] transition-colors hover:border-[#0891b2]/30">
                          <FileText className="h-3.5 w-3.5" /> Rental Appraisal (PDF)
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CTA — Enquiry Section */}
            <div className="mt-10 rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 md:mt-8 md:p-8">
              <div className="grid gap-6 md:grid-cols-5">
                <div className="md:col-span-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">Your Next Step</p>
                  <h3 className="mt-2 text-xl font-bold leading-tight tracking-tight text-[#1A2B3C] md:text-2xl">
                    Lock In Your Yield. Secure This Dual-Income Package Today
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#5C6670]">
                    At {formatPrice(pkg.wholesalePrice)} with a proven {pkg.yieldVal} net yield, this house + granny flat combination is already performing below replacement cost in one of Regional Victoria's tightest rental markets. Properties like this rarely last. Once they're gone, the next equivalent will cost more and yield less. Let's get your numbers locked in now while the package is still available.
                  </p>
                  <p className="mt-3 text-xs text-[#5C6670]">
                    Or call <a href="tel:0488165908" className="font-semibold text-[#0891b2] hover:underline">0488 165 908</a> to speak with Nick directly.
                  </p>
                </div>
                <div className="md:col-span-3">
                  <EnquiryForm
                    propertyName={pkg.name}
                    propertyId={pkg.id}
                    propertyPrice={formatPrice(pkg.wholesalePrice)}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      </ClientPortalShell>
  );
}
