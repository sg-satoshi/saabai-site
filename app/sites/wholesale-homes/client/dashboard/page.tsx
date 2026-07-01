"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClientPortalShell } from "../../_components/ClientPortalShell";
import { ChevronDown, Heart, X, Check, BarChart3, Download, ArrowRight, Calculator, Lock } from "lucide-react";
import { loadJSON as load, saveJSON as save } from "../../_lib/portal";
import { setSelectedProperty } from "../../_lib/selectedProperty";
import { Hero, RISE_CSS } from "../_ui/tearsheet";

const SAVED_KEY = "wh_client_saved";
const COMPARE_KEY = "wh_client_compare";

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
  rentalAppraisal?: { weeklyMain: number; weeklyGranny: number };
  /** Cropped photo-only version of `image`, for thumbnails — some source
   * images are full marketing flyers with price/spec panels baked in;
   * the detail page still shows the original via `image`. */
  thumbImage?: string;
};

const allPackages: Package[] = [
  { id: "parklands-haven-36", name: "Parklands Haven 36", suburb: "Box Hill", state: "NSW", estate: "Parklands Estate", builder: "Metricon", beds: 4, baths: 2, cars: 2, retailPrice: 798000, wholesalePrice: 729000, badge: "New Release", image: "/sites/wholesale-homes/package-2.jpg", highlight: "9% below comparable suburb sales" },
  { id: "edgewater-loft-28", name: "Edgewater Loft 28", suburb: "Caloundra South", state: "QLD", estate: "Aura", builder: "Stockland Partner", beds: 3, baths: 2, cars: 1, retailPrice: 612000, wholesalePrice: 558000, badge: "Limited Availability", image: "/sites/wholesale-homes/package-3.jpg", highlight: "Only 3 lots remaining" },
  { id: "harbourline-villa-32", name: "Harbourline Villa 32", suburb: "Cobbitty", state: "NSW", estate: "Emerald Hills", builder: "Mirvac Partner", beds: 4, baths: 2, cars: 2, retailPrice: 742000, wholesalePrice: 678000, badge: "New Release", image: "/sites/wholesale-homes/interior-kitchen.jpg", highlight: "First release pricing locked in" },
  { id: "sunnydale-terrace-30", name: "Sunnydale Terrace 30", suburb: "Pimpama", state: "QLD", estate: "Gainsborough Greens", builder: "Metricon", beds: 3, baths: 2, cars: 2, retailPrice: 645000, wholesalePrice: 589000, badge: "Below Market", image: "/sites/wholesale-homes/lifestyle-living.jpg", highlight: "Growth corridor, strong rental demand" },
  { id: "kyabram-greens-lot-32", name: "Lot 32 / Main House + Granny Flat", suburb: "Kyabram", state: "VIC", estate: "Kyabram Greens Estate", builder: "Kyabram Greens", beds: 4, baths: 2, cars: 2, retailPrice: 779990, wholesalePrice: 779990, badge: "New Release", image: "/sites/wholesale-homes/kyabram-greens.jpg", thumbImage: "/sites/wholesale-homes/kyabram-greens-thumb.jpg", highlight: "6.5% forecasted yield with dual income", landSize: 1100, houseSize: 159.58, grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "32", rentalAppraisal: { weeklyMain: 580, weeklyGranny: 400 } },
  { id: "the-willows-42", name: "Lot 42 / Main House + Granny Flat", suburb: "Yarrawonga", state: "VIC", estate: "The Willows", builder: "The Willows Yarrawonga", beds: 4, baths: 2, cars: 2, retailPrice: 869990, wholesalePrice: 869990, badge: "New Release", image: "/sites/wholesale-homes/the-willows.jpg", thumbImage: "/sites/wholesale-homes/the-willows-thumb.jpg", highlight: "5.6% forecasted yield / lakefront dual occupancy", landSize: 783, houseSize: 179, grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "42", landPrice: 330500, totalBuildPrice: 539490, yieldVal: "5.6%" },
  { id: "orchardfield-49", name: "Lot 49 / Main House + Granny Flat", suburb: "Kyabram", state: "VIC", estate: "Orchardfield Estate", builder: "Orchardfield", beds: 4, baths: 2, cars: 2, retailPrice: 789990, wholesalePrice: 789990, badge: "New Release", image: "/sites/wholesale-homes/orchardfield.jpg", thumbImage: "/sites/wholesale-homes/orchardfield-thumb.jpg", highlight: "6.45% forecasted yield / dual income package", landSize: 521, houseSize: 179, grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "49", landPrice: 229000, totalBuildPrice: 560990, yieldVal: "6.45%" },
  { id: "the-outlook-513", name: "Lot 513 / Main House + Granny Flat", suburb: "Mooroopna", state: "VIC", estate: "The Outlook", builder: "The Outlook Mooroopna", beds: 4, baths: 2, cars: 2, retailPrice: 799990, wholesalePrice: 799990, badge: "New Release", image: "/sites/wholesale-homes/the-outlook.jpg", thumbImage: "/sites/wholesale-homes/the-outlook-thumb.jpg", highlight: "6.3% forecasted yield / dual occupancy near reserve", landSize: 612, houseSize: 179, grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "513", landPrice: 255000, totalBuildPrice: 544990, yieldVal: "6.3%" },
  { id: "woodlands-16", name: "Lot 16 / Main House + Granny Flat", suburb: "Nagambie", state: "VIC", estate: "Woodlands Estate", builder: "Woodlands Nagambie", beds: 4, baths: 2, cars: 2, retailPrice: 814990, wholesalePrice: 814990, badge: "New Release", image: "/sites/wholesale-homes/woodlands.jpg", thumbImage: "/sites/wholesale-homes/woodlands-thumb.jpg", highlight: "6.3\u20136.7% forecasted yield / dual income near lake", landSize: 581, houseSize: 179, grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "16", landPrice: 271500, totalBuildPrice: 543490, yieldVal: "6.3\u20136.7%" },
  { id: "winterbrook-36", name: "Lot 36 / Main House + Granny Flat", suburb: "Heyfield", state: "VIC", estate: "Winterbrook", builder: "Winterbrook Heyfield", beds: 4, baths: 2, cars: 2, retailPrice: 769990, wholesalePrice: 769990, badge: "New Release", image: "/sites/wholesale-homes/winterbrook.jpg", thumbImage: "/sites/wholesale-homes/winterbrook-thumb.jpg", highlight: "6.28\u20136.88% forecasted yield / large 852m\u00b2 block", landSize: 852, houseSize: 179, grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "36", landPrice: 225000, totalBuildPrice: 544990, yieldVal: "6.28\u20136.88%" },
];

const STATES = ["All States", "VIC", "NSW", "QLD"];

const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);

export default function ClientDashboard() {
  const router = useRouter();
  const [filterState, setFilterState] = useState("All States");
  const [sort, setSort] = useState<SortOption>("default");
  const [sortOpen, setSortOpen] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set(load<string[]>(SAVED_KEY, [])));
  const [compare, setCompare] = useState<Set<string>>(new Set(load<string[]>(COMPARE_KEY, [])));
  const [showCompare, setShowCompare] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  function toggleSave(id: string, e: React.MouseEvent) {
    e.stopPropagation(); e.preventDefault();
    const next = new Set(saved);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSaved(next); save(SAVED_KEY, [...next]);
  }

  function toggleCompare(id: string, e: React.MouseEvent) {
    e.stopPropagation(); e.preventDefault();
    const next = new Set(compare);
    if (next.has(id)) next.delete(id); else if (next.size < 3) next.add(id);
    setCompare(next); save(COMPARE_KEY, [...next]);
  }

  function runNumbers(pkg: Package, e: React.MouseEvent) {
    e.stopPropagation(); e.preventDefault();
    setSelectedProperty({
      id: pkg.id, name: pkg.name, price: pkg.wholesalePrice, state: pkg.state, suburb: pkg.suburb,
      mainRent: pkg.rentalAppraisal?.weeklyMain, grannyRent: pkg.rentalAppraisal?.weeklyGranny,
    });
    router.push("/client/calculators/investment-analyzer");
  }

  function getPkg(id: string) { return allPackages.find(p => p.id === id); }

  function printReport() {
    const p = document.createElement("div");
    p.innerHTML = `
      <html><head><style>
        body{font-family:system-ui,sans-serif;padding:40px;color:#1A2B3C;font-size:13px;line-height:1.5}
        h1{font-size:24px;margin-bottom:4px}
        .sub{color:#5C6670;margin-bottom:20px}
        table{width:100%;border-collapse:collapse;margin-bottom:24px}
        th{text-align:left;font-size:10px;text-transform:uppercase;color:#5C6670;padding:8px 12px;border-bottom:1px solid #ddd;letter-spacing:0.06em}
        td{padding:10px 12px;border-bottom:1px solid #eee;font-size:13px}
        .price{font-weight:700;color:#0891b2}
        .discount{color:#16a34a;font-weight:600}
        .foot{color:#9CA3AF;font-size:11px;margin-top:30px;padding-top:20px;border-top:1px solid #ddd}
      </style></head><body>
      <h1>Wholesale Homes Australia</h1>
      <p class="sub">Package Report · ${new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</p>
      <table>
        <thead><tr><th>Package</th><th>Suburb</th><th>Bed/Bath/Car</th><th>Land</th><th>Retail Price</th><th>Members Price</th><th>Discount</th><th>Highlight</th></tr></thead>
        <tbody>${(showSaved ? allPackages.filter(p => saved.has(p.id)) : allPackages).map(p => `
          <tr>
            <td><strong>${p.name}</strong></td>
            <td>${p.suburb}, ${p.state}</td>
            <td>${p.beds}/${p.baths}/${p.cars}${p.grannyBeds ? " +GF " + p.grannyBeds + "/" + p.grannyBaths : ""}</td>
            <td>${p.landSize || "-"}m²</td>
            <td>${formatPrice(p.retailPrice)}</td>
            <td class="price">${formatPrice(p.wholesalePrice)}</td>
            <td class="discount">${formatPrice(p.retailPrice - p.wholesalePrice)}</td>
            <td>${p.highlight}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      <p class="foot">This report is for informational purposes only. Prices subject to change. Speak with Nick for current availability.</p>
      </body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(p.innerHTML); w.document.close(); w.focus(); w.print(); }
  }

  let filtered = filterState === "All States"
    ? [...allPackages]
    : allPackages.filter((p) => p.state === filterState);

  if (showSaved) filtered = filtered.filter(p => saved.has(p.id));

  if (sort === "price-low") filtered.sort((a, b) => a.wholesalePrice - b.wholesalePrice);
  else if (sort === "price-high") filtered.sort((a, b) => b.wholesalePrice - a.wholesalePrice);

  const sortLabel = sort === "price-low" ? "Price: Low to High" : sort === "price-high" ? "Price: High to Low" : "Sort";
  const comparePkgs = [...compare].map(id => getPkg(id)).filter(Boolean) as Package[];
  const avgDiscountPct = Math.round(
    allPackages.reduce((sum, p) => sum + (p.retailPrice - p.wholesalePrice) / p.retailPrice, 0) / allPackages.length * 100
  );

  return (
    <ClientPortalShell userName={"Client"}>
      <style>{RISE_CSS}</style>

      <section className="bg-[#f8f6f2]">
        <div className="mx-auto w-full max-w-7xl px-6 pt-8 lg:px-10">
          <div className="wh-rise mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#1A2B3C]/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1A2B3C]">
            <Lock className="h-3 w-3" /> Members only — not publicly listed
          </div>
          <Hero
            eyebrow="Private client access"
            headline={<>You&rsquo;re inside our <span style={{ color: "#5fd4ab" }}>members-only</span> portal.</>}
            sub="This inventory is never advertised publicly. Every package below is reserved for approved clients, priced below bank valuation, before it reaches the open market."
            stats={[
              { label: "Live packages", value: allPackages.length },
              { label: "Avg. member discount", value: avgDiscountPct + "%" },
            ]}
            delay={20}
          />
          <div className="wh-rise -mt-1 mb-2 flex items-center justify-end gap-3" style={{ animationDelay: "120ms" }}>
            <button onClick={printReport} className="flex items-center gap-1.5 rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-4 py-2 text-xs font-medium text-[#5C6670] transition-colors hover:border-[#0891b2]/30">
              <Download className="h-3.5 w-3.5" /> Report
            </button>
            <button onClick={() => { setShowSaved(!showSaved); setFilterState("All States"); }} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-colors ${showSaved ? "bg-[#0891b2] text-white" : "border border-[rgba(0,0,0,0.08)] bg-white text-[#5C6670] hover:border-[#0891b2]/30"}`}>
              <Heart className={`h-3.5 w-3.5 ${showSaved ? "fill-white" : ""}`} /> Saved ({saved.size})
            </button>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-16">
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">{showSaved ? "Saved Packages" : "Available Packages"}</p>
          <h2 className="mt-2 text-[clamp(1.4rem,4vw,2.2rem)] font-semibold leading-tight tracking-tight text-[#1A2B3C] md:text-3xl">
            {showSaved ? "Your shortlisted properties." : "Live inventory, priced below market."}
          </h2>
          <p className="mt-2 text-sm text-[#5C6670] md:text-base">
            {showSaved
              ? saved.size + " saved package" + (saved.size !== 1 ? "s" : "") + ". Click the heart to unsave."
              : "Browse current packages from our builder network. Save the ones you like."}
          </p>

          {/* Filters */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {STATES.map((s) => (
              <button key={s} onClick={() => { setFilterState(s); setSortOpen(false); setShowSaved(false); }}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${filterState === s ? "bg-[#1A2B3C] text-white" : "bg-white text-[#5C6670] border border-[rgba(0,0,0,0.08)] hover:border-[#0891b2]/30"}`}>
                {s}
              </button>
            ))}
            <div className="relative">
              <button onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-1.5 rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-5 py-2 text-sm font-medium text-[#5C6670] transition-colors hover:border-[#0891b2]/30">
                {sortLabel} <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-1.5 shadow-lg">
                    {[{ label: "Default", value: "default" as const }, { label: "Price: Low to High", value: "price-low" as const }, { label: "Price: High to Low", value: "price-high" as const }].map((o) => (
                      <button key={o.value} onClick={() => { setSort(o.value); setSortOpen(false); }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${sort === o.value ? "bg-[#0891b2]/10 text-[#0891b2] font-medium" : "text-[#5C6670] hover:bg-[#f5f5f7]"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Dual-income messaging */}
          {!showSaved && (filterState === "VIC" || filterState === "All States") && allPackages.some(p => p.state === "VIC" && p.grannyBeds) && (
            <div className="mt-8 mb-8 rounded-2xl bg-[#1A2B3C] p-6 md:p-8">
              <h3 className="text-xl font-bold text-white md:text-2xl">Regional Victoria's Best Dual-Income Opportunities</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <p className="text-sm leading-relaxed text-white/80">Dual-income properties continue to be one of the strongest-performing investment strategies, offering the potential for higher rental returns and multiple income streams from a single title.</p>
                <p className="text-sm leading-relaxed text-white/80">This week's Stock in Focus showcases six fixed-price house and land opportunities across Regional Victoria, each positioned within <strong className="text-[#d4a84b]">established and growing communities with strong rental demand and attractive forecast yields.</strong></p>
              </div>
            </div>
          )}

          {/* Package grid */}
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((pkg) => {
              const isSaved = saved.has(pkg.id);
              const isComp = compare.has(pkg.id);
              const savings = pkg.retailPrice - pkg.wholesalePrice;
              return (
                <div key={pkg.id} className={`group relative rounded-2xl border bg-white overflow-hidden transition-shadow hover:shadow-md ${isComp ? "ring-2 ring-[#0891b2]" : "border-[rgba(0,0,0,0.08)]"}`}>
                  {/* Action buttons overlay */}
                  <div className="absolute top-3 right-3 z-10 flex gap-1.5">
                    <button onClick={(e) => toggleSave(pkg.id, e)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
                      title={isSaved ? "Unsave" : "Save"}>
                      <Heart className={`h-4 w-4 ${isSaved ? "fill-[#dc2626] text-[#dc2626]" : "text-[#5C6670]"}`} />
                    </button>
                    <button onClick={(e) => toggleCompare(pkg.id, e)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-colors ${isComp ? "bg-[#0891b2] text-white" : "bg-white/90 hover:bg-white text-[#5C6670]"}`}
                      title={isComp ? "Remove from compare" : compare.size >= 3 ? "Max 3 to compare" : "Add to compare"}>
                      {isComp ? <Check className="h-4 w-4" /> : <BarChart3 className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={(e) => runNumbers(pkg, e)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#5C6670] shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
                      title="Run the Numbers">
                      <Calculator className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <Link href={`/client/packages/${pkg.id}`} className="block">
                    <div className="relative aspect-[3/2] overflow-hidden bg-[#f5f2eb]">
                      <img src={pkg.thumbImage ?? pkg.image} alt={pkg.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white md:text-xs ${pkg.badge === "Limited Availability" ? "bg-[#0891b2]" : pkg.badge === "New Release" ? "bg-green-600" : "bg-[#1A2B3C]"}`}>{pkg.badge}</span>
                      {pkg.grannyBeds && <span className="absolute left-3 bottom-3 rounded-full bg-[#d4a84b]/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-white md:text-[10px]">Dual Income</span>}
                    </div>
                    <div className="p-4 md:p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#5C6670] md:text-xs">{pkg.suburb.toUpperCase()}, {pkg.state}</p>
                      <h3 className="mt-1 text-sm font-semibold tracking-tight md:text-base">{pkg.name}</h3>
                      <div className="mt-2 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-[#9CA3AF]">Reg. Retail:</span>
                          <span className="text-[10px] text-[#9CA3AF] line-through">{formatPrice(pkg.retailPrice)}</span>
                          <span className="rounded bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700">{Math.round(savings / pkg.retailPrice * 100)}% OFF</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-[#0891b2]">Members Price</span>
                          <span className="text-sm font-bold text-[#1A2B3C] md:text-base">{formatPrice(pkg.wholesalePrice)}</span>
                        </div>
                        <p className="text-[10px] font-medium text-green-600">${(savings / 1000).toFixed(0)}k Discount</p>
                      </div>
                      <div className="mt-3 flex items-center gap-3 text-[10px] text-[#5C6670] md:text-xs">
                        <span>{pkg.beds} bed{pkg.beds > 1 ? "s" : ""}</span>
                        <span>{pkg.baths} bath{pkg.baths > 1 ? "s" : ""}</span>
                        <span>{pkg.cars} car{pkg.cars > 1 ? "s" : ""}</span>
                        {pkg.landSize && <span>{pkg.landSize}m²</span>}
                        {pkg.grannyBeds && <span className="text-[#0891b2]">+Granny {pkg.grannyBeds} bed{pkg.grannyBeds > 1 ? "s" : ""}</span>}
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <p className="mt-12 text-center text-sm text-[#5C6670]">{showSaved ? "No saved packages yet. Browse and save the ones you like." : "No packages available for this state."}</p>
          )}
        </div>
      </section>

      {/* ── Compare Drawer ── */}
      {compare.size >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[rgba(0,0,0,0.08)] bg-white shadow-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-4 w-4 text-[#0891b2]" />
              <span className="text-sm font-medium">{compare.size} package{compare.size > 1 ? "s" : ""} selected</span>
              {comparePkgs.map(p => (
                <span key={p.id} className="flex items-center gap-1 rounded-full bg-[#f0f9ff] px-3 py-1 text-[10px] text-[#0891b2]">
                  {p.name.split(" ").slice(0, 3).join(" ")}
                  <button onClick={() => { const n = new Set(compare); n.delete(p.id); setCompare(n); save(COMPARE_KEY, [...n]); }} className="ml-1 hover:text-[#dc2626]"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setCompare(new Set()); save(COMPARE_KEY, []); }} className="rounded-full border border-[rgba(0,0,0,0.08)] px-4 py-1.5 text-xs font-medium text-[#5C6670] hover:bg-[#f5f5f7]">Clear</button>
              <button onClick={() => setShowCompare(true)} className="rounded-full bg-[#0891b2] px-5 py-1.5 text-xs font-semibold text-white hover:bg-[#0369a1] flex items-center gap-1.5">
                Compare <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Compare Modal ── */}
      {showCompare && comparePkgs.length >= 2 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowCompare(false)}>
          <div className="w-full max-w-5xl rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2]">Package Comparison</p>
                <h2 className="text-lg font-bold text-[#1A2B3C]">Side-by-side</h2>
              </div>
              <button onClick={() => setShowCompare(false)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(0,0,0,0.08)] hover:bg-[#f5f5f7]"><X className="h-4 w-4" /></button>
            </div>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[rgba(0,0,0,0.06)]">
                  <th className="text-left py-3 pr-4 text-[10px] font-semibold uppercase tracking-wider text-[#5C6670] w-32">Feature</th>
                  {comparePkgs.map(p => (
                    <th key={p.id} className="text-left py-3 px-3 text-sm font-semibold text-[#1A2B3C]">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Image", render: (p: Package) => <img src={p.thumbImage ?? p.image} alt="" className="w-full aspect-[3/2] object-cover rounded-xl" /> },
                  { label: "Suburb", render: (p: Package) => <>{p.suburb}, {p.state}</> },
                  { label: "Estate", render: (p: Package) => p.estate },
                  { label: "Builder", render: (p: Package) => p.builder },
                  { label: "Badge", render: (p: Package) => <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white ${p.badge === "Limited Availability" ? "bg-[#0891b2]" : p.badge === "New Release" ? "bg-green-600" : "bg-[#1A2B3C]"}`}>{p.badge}</span> },
                  { label: "Beds / Baths / Cars", render: (p: Package) => <>{p.beds} bed · {p.baths} bath · {p.cars} car{p.grannyBeds ? <span className="text-[#0891b2]"> + GF {p.grannyBeds} bed</span> : ""}</> },
                  { label: "Land Size", render: (p: Package) => p.landSize ? <>{p.landSize}m²</> : "-" },
                  { label: "House Size", render: (p: Package) => p.houseSize ? <>{Math.round(p.houseSize)}m²</> : "-" },
                  { label: "Retail Price", render: (p: Package) => <span className="text-[#9CA3AF] line-through">{formatPrice(p.retailPrice)}</span> },
                  { label: "Members Price", render: (p: Package) => <span className="text-lg font-bold text-[#0891b2]">{formatPrice(p.wholesalePrice)}</span> },
                  { label: "You Save", render: (p: Package) => { const s = p.retailPrice - p.wholesalePrice; return <span className="font-semibold text-green-600">{formatPrice(s)} ({Math.round(s / p.retailPrice * 100)}%)</span>; } },
                  { label: "Highlight", render: (p: Package) => <span className="text-[#0891b2]">{p.highlight}</span> },
                  { label: "Yield", render: (p: Package) => p.yieldVal ? <span className="font-semibold text-green-600">{p.yieldVal}</span> : <span className="text-[#9CA3AF]">-</span> },
                  { label: "Action", render: (p: Package) => <a href={`/client/packages/${p.id}`} className="inline-flex items-center gap-1 rounded-full bg-[#0891b2] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0369a1]">View <ArrowRight className="h-3 w-3" /></a> },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-[rgba(0,0,0,0.04)] hover:bg-[#f8f6f2] transition-colors">
                    <td className="py-3 pr-4 text-[10px] font-medium text-[#5C6670] uppercase tracking-wider">{row.label}</td>
                    {comparePkgs.map(p => (
                      <td key={p.id} className="py-3 px-3">{row.render(p)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Spacer for compare drawer */}
      {compare.size >= 2 && <div className="h-16" />}
    </ClientPortalShell>
  );
}
