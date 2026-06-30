"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "../../_components/Header";
import { Footer } from "../../_components/Footer";
import { ChevronDown } from "lucide-react";
import { DashboardErrorBoundary } from "../../_components/DashboardErrorBoundary";

const AUTH_KEY = "wholesale_client_auth";

type SortOption = "default" | "price-low" | "price-high";

type Package = {
  id: string;
  name: string;
  suburb: string;
  state: string;
  estate: string;
  builder: string;
  beds: number;
  baths: number;
  cars: number;
  retailPrice: number;
  wholesalePrice: number;
  badge: "Below Market" | "New Release" | "Limited Availability";
  image: string;
  highlight: string;
  landSize?: number;
  houseSize?: number;
  grannyBeds?: number;
  grannyBaths?: number;
  grannySize?: number;
  lot?: string;
  landPrice?: number;
  totalBuildPrice?: number;
  yieldVal?: string;
};

const allPackages: Package[] = [
  { id: "parklands-haven-36", name: "Parklands Haven 36", suburb: "Box Hill", state: "NSW", estate: "Parklands Estate", builder: "Metricon", beds: 4, baths: 2, cars: 2, retailPrice: 798000, wholesalePrice: 729000, badge: "New Release", image: "/sites/wholesale-homes/package-2.jpg", highlight: "9% below comparable suburb sales" },
  { id: "edgewater-loft-28", name: "Edgewater Loft 28", suburb: "Caloundra South", state: "QLD", estate: "Aura", builder: "Stockland Partner", beds: 3, baths: 2, cars: 1, retailPrice: 612000, wholesalePrice: 558000, badge: "Limited Availability", image: "/sites/wholesale-homes/package-3.jpg", highlight: "Only 3 lots remaining" },
  { id: "harbourline-villa-32", name: "Harbourline Villa 32", suburb: "Cobbitty", state: "NSW", estate: "Emerald Hills", builder: "Mirvac Partner", beds: 4, baths: 2, cars: 2, retailPrice: 742000, wholesalePrice: 678000, badge: "New Release", image: "/sites/wholesale-homes/interior-kitchen.jpg", highlight: "First release pricing locked in" },
  { id: "sunnydale-terrace-30", name: "Sunnydale Terrace 30", suburb: "Pimpama", state: "QLD", estate: "Gainsborough Greens", builder: "Metricon", beds: 3, baths: 2, cars: 2, retailPrice: 645000, wholesalePrice: 589000, badge: "Below Market", image: "/sites/wholesale-homes/lifestyle-living.jpg", highlight: "Growth corridor, strong rental demand" },
  { id: "kyabram-greens-lot-32", name: "Lot 32 — Main House + Granny Flat", suburb: "Kyabram", state: "VIC", estate: "Kyabram Greens Estate", builder: "Kyabram Greens", beds: 4, baths: 2, cars: 2, retailPrice: 779990, wholesalePrice: 779990, badge: "New Release", image: "/sites/wholesale-homes/kyabram-greens.jpg", highlight: "6.5% forecasted yield with dual income", landSize: 1100, houseSize: 179, grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "32" },
  { id: "the-willows-42", name: "Lot 42 — Main House + Granny Flat", suburb: "Yarrawonga", state: "VIC", estate: "The Willows", builder: "The Willows Yarrawonga", beds: 4, baths: 2, cars: 2, retailPrice: 869990, wholesalePrice: 869990, badge: "New Release", image: "/sites/wholesale-homes/the-willows.jpg", highlight: "5.6% forecasted yield — lakefront dual occupancy", landSize: 783, houseSize: 179, grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "42", landPrice: 330500, totalBuildPrice: 539490, yieldVal: "5.6%" },
  { id: "orchardfield-49", name: "Lot 49 — Main House + Granny Flat", suburb: "Kyabram", state: "VIC", estate: "Orchardfield Estate", builder: "Orchardfield", beds: 4, baths: 2, cars: 2, retailPrice: 789990, wholesalePrice: 789990, badge: "New Release", image: "/sites/wholesale-homes/orchardfield.jpg", highlight: "6.45% forecasted yield — dual income package", landSize: 521, houseSize: 179, grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "49", landPrice: 229000, totalBuildPrice: 560990, yieldVal: "6.45%" },
  { id: "the-outlook-513", name: "Lot 513 — Main House + Granny Flat", suburb: "Mooroopna", state: "VIC", estate: "The Outlook", builder: "The Outlook Mooroopna", beds: 4, baths: 2, cars: 2, retailPrice: 799990, wholesalePrice: 799990, badge: "New Release", image: "/sites/wholesale-homes/the-outlook.jpg", highlight: "6.3% forecasted yield — dual occupancy near reserve", landSize: 612, houseSize: 179, grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "513", landPrice: 255000, totalBuildPrice: 544990, yieldVal: "6.3%" },
  { id: "woodlands-16", name: "Lot 16 — Main House + Granny Flat", suburb: "Nagambie", state: "VIC", estate: "Woodlands Estate", builder: "Woodlands Nagambie", beds: 4, baths: 2, cars: 2, retailPrice: 814990, wholesalePrice: 814990, badge: "New Release", image: "/sites/wholesale-homes/woodlands.jpg", highlight: "6.3–6.7% forecasted yield — dual income near lake", landSize: 581, houseSize: 179, grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "16", landPrice: 271500, totalBuildPrice: 543490, yieldVal: "6.3–6.7%" },
  { id: "winterbrook-36", name: "Lot 36 — Main House + Granny Flat", suburb: "Heyfield", state: "VIC", estate: "Winterbrook", builder: "Winterbrook Heyfield", beds: 4, baths: 2, cars: 2, retailPrice: 769990, wholesalePrice: 769990, badge: "New Release", image: "/sites/wholesale-homes/winterbrook.jpg", highlight: "6.28–6.88% forecasted yield — large 852m² block", landSize: 852, houseSize: 179, grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "36", landPrice: 225000, totalBuildPrice: 544990, yieldVal: "6.28–6.88%" },
];

const STATES = ["All States", "VIC", "NSW", "QLD"];

const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);

export default function ClientDashboard() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [filterState, setFilterState] = useState("All States");
  const [sort, setSort] = useState<SortOption>("default");
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) {
      router.replace("/client-login");
    } else {
      setAuthed(true);
    }
  }, [router]);

  if (!authed) return null;

  function handleLogout() {
    localStorage.removeItem(AUTH_KEY);
    router.push("/client-login");
  }

  let filtered = filterState === "All States"
    ? [...allPackages]
    : allPackages.filter((p) => p.state === filterState);

  if (sort === "price-low") {
    filtered.sort((a, b) => a.wholesalePrice - b.wholesalePrice);
  } else if (sort === "price-high") {
    filtered.sort((a, b) => b.wholesalePrice - a.wholesalePrice);
  }

  const sortLabel = sort === "price-low" ? "Price: Low to High" : sort === "price-high" ? "Price: High to Low" : "Sort";

  return (
    <DashboardErrorBoundary>
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-[#f8f6f2]">
        {/* Dashboard header */}
        <section className="border-b border-[rgba(0,0,0,0.08)] bg-white">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
            <div>
              <h1 className="text-lg font-semibold tracking-tight md:text-xl">Client Portal</h1>
              <p className="mt-0.5 text-sm text-[#5C6670]">Access exclusive pre-market inventory.</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-full border border-[rgba(0,0,0,0.12)] px-5 py-2 text-xs font-medium text-[#5C6670] transition-colors hover:bg-[#f5f5f7] md:text-sm"
            >
              Sign Out
            </button>
          </div>
        </section>

        <section className="py-10 md:py-16">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            {/* Heading */}
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">Available Packages</p>
            <h2 className="mt-2 text-[clamp(1.4rem,4vw,2.2rem)] font-semibold leading-tight tracking-tight md:text-3xl">Live inventory, priced below market.</h2>
            <p className="mt-2 text-sm text-[#5C6670] md:text-base">Browse current packages from our builder network. Pricing reflects wholesale — not retail.</p>

            {/* Filters */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {STATES.map((s) => (
                <button
                  key={s}
                  onClick={() => { setFilterState(s); setSortOpen(false); }}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                    filterState === s
                      ? "bg-[#1A2B3C] text-white"
                      : "bg-white text-[#5C6670] border border-[rgba(0,0,0,0.08)] hover:border-[#0891b2]/30"
                  }`}
                >
                  {s}
                </button>
              ))}
              <div className="relative">
                <button
                  onClick={() => setSortOpen(!sortOpen)}
                  className="flex items-center gap-1.5 rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-5 py-2 text-sm font-medium text-[#5C6670] transition-colors hover:border-[#0891b2]/30"
                >
                  {sortLabel} <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {sortOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-1.5 shadow-lg">
                      {[
                        { label: "Default", value: "default" as const },
                        { label: "Price: Low to High", value: "price-low" as const },
                        { label: "Price: High to Low", value: "price-high" as const },
                      ].map((o) => (
                        <button
                          key={o.value}
                          onClick={() => { setSort(o.value); setSortOpen(false); }}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            sort === o.value
                              ? "bg-[#0891b2]/10 text-[#0891b2] font-medium"
                              : "text-[#5C6670] hover:bg-[#f5f5f7]"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Package grid */}
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((pkg) => (
                <Link
                  key={pkg.id}
                  href={`/client/packages/${pkg.id}`}
                  className="group rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white overflow-hidden transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#f5f2eb]">
                    <img
                      src={pkg.image}
                      alt={pkg.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span
                      className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white md:text-xs ${
                        pkg.badge === "Limited Availability"
                          ? "bg-[#0891b2]"
                          : pkg.badge === "New Release"
                          ? "bg-green-600"
                          : "bg-[#1A2B3C]"
                      }`}
                    >
                      {pkg.badge}
                    </span>
                  </div>
                  <div className="p-4 md:p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#5C6670] md:text-xs">
                      {pkg.suburb.toUpperCase()}, {pkg.state}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold tracking-tight md:text-base">{pkg.name}</h3>
                    <p className="mt-1 text-xs text-[#0891b2] md:text-sm">{formatPrice(pkg.wholesalePrice)}</p>
                    <div className="mt-3 flex items-center gap-3 text-[10px] text-[#5C6670] md:text-xs">
                      <span>{pkg.beds} bed{pkg.beds > 1 ? "s" : ""}</span>
                      <span>{pkg.baths} bath{pkg.baths > 1 ? "s" : ""}</span>
                      <span>{pkg.cars} car{pkg.cars > 1 ? "s" : ""}</span>
                      {pkg.landSize && <span>{pkg.landSize}m²</span>}
                      {pkg.grannyBeds && (
                        <span className="text-[#0891b2]">+Granny {pkg.grannyBeds} bed{pkg.grannyBeds > 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {filtered.length === 0 && (
              <p className="mt-12 text-center text-sm text-[#5C6670]">No packages available for this state.</p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
    </DashboardErrorBoundary>
  );
}
