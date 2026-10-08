import Link from "next/link";
import { Bed, Bath, Car, Maximize, Lock } from "lucide-react";
import type { PublicPackage } from "../_data/packages";

/** Public package teaser. No prices or other members-only figures. */
export function PackageCard({ pkg }: { pkg: PublicPackage }) {
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5C6670]">
          {pkg.suburb}, {pkg.state}
        </p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight text-[#1A2B3C]">{pkg.name}</h3>
        <p className="text-xs text-[#5C6670]">{pkg.estate} &middot; by {pkg.builder}</p>

        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#5C6670]">
          <span className="inline-flex items-center gap-1.5"><Bed className="h-3.5 w-3.5" />{pkg.beds}</span>
          <span className="inline-flex items-center gap-1.5"><Bath className="h-3.5 w-3.5" />{pkg.baths}</span>
          <span className="inline-flex items-center gap-1.5"><Car className="h-3.5 w-3.5" />{pkg.cars}</span>
          <span className="inline-flex items-center gap-1.5"><Maximize className="h-3.5 w-3.5" />{pkg.landSize}m&sup2;</span>
        </div>

        <div className="mt-5 flex items-center gap-2 border-t border-[rgba(0,0,0,0.08)] pt-4 text-xs font-medium text-[#0891b2]">
          <Lock className="h-3.5 w-3.5" /> Members pricing: sign in or register to see it
        </div>
        {pkg.landReady && <p className="mt-1 text-xs text-[#5C6670]">Land ready {pkg.landReady}</p>}

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
