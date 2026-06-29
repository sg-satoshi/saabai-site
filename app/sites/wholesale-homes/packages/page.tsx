"use client";

import { useMemo, useState } from "react";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { ChatWidget } from "../_components/ChatWidget";
import { PackageCard } from "../_components/PackageCard";
import { packages } from "../_data/packages";

export default function PackagesPage() {
  const [filterState, setFilterState] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc">("price-asc");

  const filtered = useMemo(() => {
    let list = filterState === "all" ? packages : packages.filter((p) => p.state === filterState);
    return [...list].sort((a, b) => sortBy === "price-asc" ? a.wholesalePrice - b.wholesalePrice : b.wholesalePrice - a.wholesalePrice);
  }, [filterState, sortBy]);

  const states = useMemo(() => ["all", ...new Set(packages.map((p) => p.state))], []);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16 md:py-28">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">Available Packages</p>
            <h1 className="mt-3 text-[clamp(1.6rem,5vw,3rem)] font-semibold leading-tight tracking-tight md:text-4xl lg:text-5xl">
              Live inventory, priced below market.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#5C6670] md:mt-5 md:text-base">
              Browse current packages from our builder network. Pricing reflects wholesale — not retail.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4 md:mt-10">
              <div className="flex flex-wrap gap-2">
                {states.map((s) => (
                  <button key={s} onClick={() => setFilterState(s)} className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors md:px-5 md:py-2.5 md:text-sm ${filterState === s ? "bg-[#1A2B3C] text-white" : "bg-[#f0efec] text-[#5C6670] hover:bg-[#e4e2de]"}`}>
                    {s === "all" ? "All States" : s}
                  </button>
                ))}
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="rounded-full border border-[rgba(0,0,0,0.12)] bg-white px-4 py-2 text-xs font-semibold text-[#5C6670] outline-none md:px-5 md:py-2.5 md:text-sm">
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <p className="mt-16 text-center text-sm text-[#5C6670] md:text-base">No packages available in this state yet. Check back soon.</p>
            ) : (
              <div className="mt-10 grid gap-5 md:mt-12 md:grid-cols-2 md:gap-7 lg:grid-cols-3">
                {filtered.map((pkg) => (
                  <PackageCard key={pkg.id} pkg={pkg} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
