import Link from "next/link";
import { Bed, Bath, Car, Maximize } from "lucide-react";
import type { Package } from "../_data/packages";
import { formatPrice } from "../_data/packages";

export function PackageCard({ pkg }: { pkg: Package }) {
  const savings = pkg.retailPrice - pkg.wholesalePrice;
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white transition-shadow hover:shadow-[0_30px_60px_-30px_rgba(26,43,60,0.35)]">
      <div className="relative aspect-[3/2] overflow-hidden bg-[#F7F8F9]">
        <img
          src={pkg.image}
          alt={`${pkg.name} in ${pkg.suburb}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute left-4 top-4 rounded-full bg-[#0891b2] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
          {pkg.badge}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5C6670]">
              {pkg.suburb}, {pkg.state}
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-[#1A2B3C]">{pkg.name}</h3>
            <p className="text-xs text-[#5C6670]">{pkg.estate} &middot; by {pkg.builder}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#5C6670]">
          <span className="inline-flex items-center gap-1.5"><Bed className="h-3.5 w-3.5" />{pkg.beds}</span>
          <span className="inline-flex items-center gap-1.5"><Bath className="h-3.5 w-3.5" />{pkg.baths}</span>
          <span className="inline-flex items-center gap-1.5"><Car className="h-3.5 w-3.5" />{pkg.cars}</span>
          <span className="inline-flex items-center gap-1.5"><Maximize className="h-3.5 w-3.5" />{pkg.landSize}m&sup2;</span>
        </div>

        <div className="mt-5 border-t border-[rgba(0,0,0,0.08)] pt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9CA3AF]">Reg. Retail Price</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-[#9CA3AF] line-through">{formatPrice(pkg.retailPrice)}</span>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
              {Math.round(savings / pkg.retailPrice * 100)}% OFF for Members
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0891b2]">Members Price</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-[#1A2B3C]">{formatPrice(pkg.wholesalePrice)}</p>
          <p className="mt-0.5 text-xs font-medium text-green-600">
            ${(savings / 1000).toFixed(0)}k Discount for Members
          </p>
          <p className="mt-1 text-xs text-[#5C6670]">Land ready {pkg.landReady}</p>
        </div>

        <Link
          href={`/packages/${pkg.id}`}
          className="mt-5 inline-flex items-center justify-center rounded-full border border-[#1A2B3C] px-5 py-2.5 text-sm font-medium text-[#1A2B3C] transition-colors hover:bg-[#1A2B3C] hover:text-white"
        >
          View Package
        </Link>
      </div>
    </article>
  );
}
