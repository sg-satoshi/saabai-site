"use client";

import { useMemo, useState } from "react";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { ChatWidget } from "../_components/ChatWidget";
import { Section, SectionTitle } from "../_components/Section";
import { PackageCard } from "../_components/PackageCard";
import { packages } from "../_data/packages";

export default function PackagesPage() {
  const [state, setState] = useState("All");
  const [beds, setBeds] = useState("Any");
  const [maxPrice, setMaxPrice] = useState("Any");
  const [sort, setSort] = useState("price-asc");

  const filtered = useMemo(() => {
    let list = packages.filter((p) => {
      if (state !== "All" && p.state !== state) return false;
      if (beds !== "Any" && p.beds < Number(beds)) return false;
      if (maxPrice !== "Any" && p.wholesalePrice > Number(maxPrice)) return false;
      return true;
    });
    list = list.slice().sort((a, b) => {
      if (sort === "price-asc") return a.wholesalePrice - b.wholesalePrice;
      if (sort === "price-desc") return b.wholesalePrice - a.wholesalePrice;
      return a.landReady.localeCompare(b.landReady);
    });
    return list;
  }, [state, beds, maxPrice, sort]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Section className="border-b border-[rgba(0,0,0,0.08)] bg-[#f5f2eb]/40 !py-14">
          <SectionTitle
            as="h1"
            eyebrow="Live Inventory"
            title="Available House and Land Packages"
            intro="Filter by location, budget, bedrooms and land size. Every package is a fixed-price contract, secured below current market valuation."
          />
          <p className="mt-4 text-sm text-[#5C6670]">{filtered.length} of {packages.length} packages</p>
        </Section>

        <Section className="!py-12">
          <div className="grid gap-4 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-5 md:grid-cols-4">
            <Select label="State" value={state} onChange={setState} options={["All", "VIC", "NSW", "QLD"]} />
            <Select label="Bedrooms" value={beds} onChange={setBeds} options={["Any", "2", "3", "4"]} />
            <Select
              label="Max Price"
              value={maxPrice}
              onChange={setMaxPrice}
              options={["Any", "600000", "700000", "800000", "900000"]}
              display={(v) => (v === "Any" ? "Any" : `$${Number(v).toLocaleString()}`)}
            />
            <Select
              label="Sort"
              value={sort}
              onChange={setSort}
              options={["price-asc", "price-desc", "land-ready"]}
              display={(v) => ({ "price-asc": "Price: Low to High", "price-desc": "Price: High to Low", "land-ready": "Land Ready" }[v]!)}
            />
          </div>

          <div className="mt-10 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => <PackageCard key={p.id} pkg={p} />)}
          </div>
          {filtered.length === 0 && (
            <p className="mt-12 text-center text-[#5C6670]">No packages match those filters. Try widening your search.</p>
          )}
        </Section>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}

function Select({
  label, value, onChange, options, display,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; display?: (v: string) => string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs">
      <span className="font-semibold uppercase tracking-wider text-[#5C6670]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f5f7] px-3 py-2.5 text-sm outline-none focus:border-[#0891b2]"
      >
        {options.map((o) => <option key={o} value={o}>{display ? display(o) : o}</option>)}
      </select>
    </label>
  );
}
