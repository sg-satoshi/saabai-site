"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "../../../_components/Header";
import { Footer } from "../../../_components/Footer";
import { ArrowLeft, Home, Bath, Car, MapPin, Calendar, Building2, DollarSign } from "lucide-react";

const AUTH_KEY = "wholesale_client_auth";

type Pkg = {
  id: string;
  name: string;
  suburb: string;
  state: string;
  estate: string;
  builder: string;
  beds: number;
  baths: number;
  cars: number;
  landSize?: number;
  houseSize?: number;
  retailPrice: number;
  wholesalePrice: number;
  landReady?: string;
  badge: string;
  image: string;
  highlight: string;
  description: string;
  grannyBeds?: number;
  grannyBaths?: number;
  grannySize?: number;
  lot?: string;
  yieldVal?: string;
  landPrice?: number;
  totalBuildPrice?: number;
};

const allPackages: Pkg[] = [
  { id: "parklands-haven-36", name: "Parklands Haven 36", suburb: "Box Hill", state: "NSW", estate: "Parklands Estate", builder: "Metricon", beds: 4, baths: 2, cars: 2, landSize: 512, houseSize: 218, retailPrice: 798000, wholesalePrice: 729000, landReady: "Jun 2026", badge: "New Release", image: "/sites/wholesale-homes/package-2.jpg", highlight: "9% below comparable suburb sales", description: "A thoughtfully designed four-bedroom home in Sydney's thriving North West Growth Corridor. The Parklands Haven 36 delivers a functional layout with a dedicated study, media room, and an expansive open-plan living area. The kitchen features a walk-in pantry and island bench. Set on a generous 512m² block within the sought-after Parklands Estate, close to the new Box Hill town centre and future rail." },
  { id: "edgewater-loft-28", name: "Edgewater Loft 28", suburb: "Caloundra South", state: "QLD", estate: "Aura", builder: "Stockland Partner", beds: 3, baths: 2, cars: 1, landSize: 312, houseSize: 184, retailPrice: 612000, wholesalePrice: 558000, landReady: "Feb 2026", badge: "Limited Availability", image: "/sites/wholesale-homes/package-3.jpg", highlight: "Only 3 lots remaining", description: "A low-maintenance three-bedroom home perfect for investors and first-home buyers. The Edgewater Loft 28 maximises its 312m² lot with an intelligent split-level design. Open-plan living connects to a private courtyard. Located in Stockland's award-winning Aura community, minutes from the new Caloundra CBD." },
  { id: "harbourline-villa-32", name: "Harbourline Villa 32", suburb: "Cobbitty", state: "NSW", estate: "Emerald Hills", builder: "Mirvac Partner", beds: 4, baths: 2, cars: 2, landSize: 420, houseSize: 232, retailPrice: 742000, wholesalePrice: 678000, landReady: "Aug 2026", badge: "New Release", image: "/sites/wholesale-homes/interior-kitchen.jpg", highlight: "First release pricing locked in", description: "A beautifully proportioned four-bedroom home designed by Mirvac's award-winning architecture team. The Harbourline Villa 32 features a striking facade, a formal entry foyer, and a light-filled open-plan living area that opens onto a covered entertainer's deck." },
  { id: "sunnydale-terrace-30", name: "Sunnydale Terrace 30", suburb: "Pimpama", state: "QLD", estate: "Gainsborough Greens", builder: "Metricon", beds: 3, baths: 2, cars: 2, landSize: 392, houseSize: 198, retailPrice: 645000, wholesalePrice: 589000, landReady: "Apr 2026", badge: "Below Market", image: "/sites/wholesale-homes/lifestyle-living.jpg", highlight: "Growth corridor, strong rental demand", description: "A smart three-bedroom terrace home in one of Queensland's fastest-growing corridors. The Sunnydale Terrace 30 delivers low-maintenance living with a private courtyard and master bedroom with ensuite." },
  { id: "kyabram-greens-lot-32", name: "Lot 32 — Main House + Granny Flat", suburb: "Kyabram", state: "VIC", estate: "Kyabram Greens Estate", builder: "Kyabram Greens", beds: 4, baths: 2, cars: 2, landSize: 1100, houseSize: 179, retailPrice: 779990, wholesalePrice: 779990, badge: "New Release", image: "/sites/wholesale-homes/kyabram-greens.jpg", highlight: "6.5% forecasted yield with dual income", description: "Dual occupancy, dual income. Lot 32 delivers a main residence plus a separate granny flat on a generous 1,100m² lot in Kyabram Greens Estate — one of Regional Victoria's strongest-performing investment strategies. The main house features 4 bedrooms, 2 bathrooms, and open-plan living across 179m². The granny flat adds 2 bedrooms, 1 bathroom, and its own living area, offering the potential for higher rental returns and multiple income streams from a single title. Positioned within an established and growing community with strong rental demand. Forecasted yield of 6.5%.", grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "32", landPrice: 210000, totalBuildPrice: 569990, yieldVal: "6.5%" },
  { id: "the-willows-42", name: "Lot 42 — Main House + Granny Flat", suburb: "Yarrawonga", state: "VIC", estate: "The Willows", builder: "The Willows Yarrawonga", beds: 4, baths: 2, cars: 2, landSize: 783, houseSize: 179, retailPrice: 869990, wholesalePrice: 869990, badge: "New Release", image: "/sites/wholesale-homes/the-willows.jpg", highlight: "5.6% forecasted yield — lakefront dual occupancy", description: "Dual occupancy, dual income. Lot 42 in The Willows Estate, Yarrawonga is a premium dual-income opportunity on a 783m² lot in a master-planned lakefront community. Dual-income properties continue to be one of the strongest-performing investment strategies, and this package delivers: a 4-bedroom main house with 2 bathrooms and open-plan living across 179m², plus a separate granny flat with 2 bedrooms, 1 bathroom, and its own living area — perfect for dual income, extended family, or holiday rental. Established and growing community with strong rental demand. Forecasted yield of 5.6%.", grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "42", landPrice: 330500, totalBuildPrice: 539490, yieldVal: "5.6%" },
  { id: "orchardfield-49", name: "Lot 49 — Main House + Granny Flat", suburb: "Kyabram", state: "VIC", estate: "Orchardfield Estate", builder: "Orchardfield", beds: 4, baths: 2, cars: 2, landSize: 521, houseSize: 179, retailPrice: 789990, wholesalePrice: 789990, badge: "New Release", image: "/sites/wholesale-homes/orchardfield.jpg", highlight: "6.45% forecasted yield — dual income package", description: "Dual occupancy, dual income. Lot 49 in Orchardfield Estate, Kyabram is a fixed-price dual-income opportunity on a 521m² lot within one of Regional Victoria's strongest-performing investment categories. The main house offers 4 bedrooms, 2 bathrooms, and open-plan living across 179m². The granny flat adds 2 bedrooms, 1 bathroom, and its own living area — delivering the potential for multiple income streams from a single title. Located in an established and growing community with strong rental demand. Forecasted yield of 6.45%.", grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "49", landPrice: 229000, totalBuildPrice: 560990, yieldVal: "6.45%" },
  { id: "the-outlook-513", name: "Lot 513 — Main House + Granny Flat", suburb: "Mooroopna", state: "VIC", estate: "The Outlook", builder: "The Outlook Mooroopna", beds: 4, baths: 2, cars: 2, landSize: 612, houseSize: 179, retailPrice: 799990, wholesalePrice: 799990, badge: "New Release", image: "/sites/wholesale-homes/the-outlook.jpg", highlight: "6.3% forecasted yield — dual occupancy near reserve", description: "Dual occupancy, dual income. Lot 513 in The Outlook, Mooroopna is a dual-income package on a 612m² lot in a growing Goulburn Valley community. Dual-income properties continue to be one of the strongest-performing investment strategies. The main house offers 4 bedrooms, 2 bathrooms, and open-plan living across 179m². The granny flat adds 2 bedrooms, 1 bathroom, and its own living area — ideal for higher rental returns and extended family. Situated near a natural bushland reserve in a community with strong rental demand. Forecasted yield of 6.3%.", grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "513", landPrice: 255000, totalBuildPrice: 544990, yieldVal: "6.3%" },
  { id: "woodlands-16", name: "Lot 16 — Main House + Granny Flat", suburb: "Nagambie", state: "VIC", estate: "Woodlands Estate", builder: "Woodlands Nagambie", beds: 4, baths: 2, cars: 2, landSize: 581, houseSize: 179, retailPrice: 814990, wholesalePrice: 814990, badge: "New Release", image: "/sites/wholesale-homes/woodlands.jpg", highlight: "6.3–6.7% forecasted yield — dual income near lake", description: "Dual occupancy, dual income. Lot 16 in Woodlands Estate, Nagambie offers a fixed-price dual-income package on a 581m² lot in a master-planned community. The main house delivers 4 bedrooms, 2 bathrooms, and open-plan living across 179m². The granny flat adds 2 bedrooms, 1 bathroom, and its own living area — providing the opportunity for multiple income streams from a single title. Located near Lake Nagambie in an established and growing regional community with strong rental demand. Forecasted yield of 6.3–6.7%.", grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "16", landPrice: 271500, totalBuildPrice: 543490, yieldVal: "6.3–6.7%" },
  { id: "winterbrook-36", name: "Lot 36 — Main House + Granny Flat", suburb: "Heyfield", state: "VIC", estate: "Winterbrook", builder: "Winterbrook Heyfield", beds: 4, baths: 2, cars: 2, landSize: 852, houseSize: 179, retailPrice: 769990, wholesalePrice: 769990, badge: "New Release", image: "/sites/wholesale-homes/winterbrook.jpg", highlight: "6.28–6.88% forecasted yield — large 852m² block", description: "Dual occupancy, dual income. Lot 36 in Winterbrook, Heyfield is a dual-income opportunity on a generous 852m² lot with mountain views — one of Regional Victoria's strongest-performing investment strategies, offering the potential for higher rental returns from a single title. The main house offers 4 bedrooms, 2 bathrooms, and open-plan living across 179m². The granny flat adds 2 bedrooms, 1 bathroom, and its own living area. Located near the Thomson River in a growing Wellington Shire community. Forecasted yield of 6.28–6.88%.", grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "36", landPrice: 225000, totalBuildPrice: 544990, yieldVal: "6.28–6.88%" },
];

const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);

export default function ClientPackageDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(AUTH_KEY)) {
      router.replace("/client-login");
    } else {
      setAuthed(true);
    }
  }, [router]);

  const pkg = allPackages.find((p) => p.id === params.id);

  if (!authed) return null;
  if (!pkg) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center px-6">
          <div className="text-center">
            <p className="text-lg font-semibold">Package not found</p>
            <Link href="/client/dashboard" className="mt-4 inline-flex items-center gap-2 text-sm text-[#0891b2] hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to packages
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-[#f8f6f2]">
        <section className="py-8 md:py-12">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
            {/* Back link */}
            <Link href="/client/dashboard" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0891b2] hover:underline md:text-sm">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to all packages
            </Link>

            {/* Hero Image */}
            <div className="mt-6 overflow-hidden rounded-3xl bg-[#f5f2eb]">
              <img src={pkg.image} alt={pkg.name} className="aspect-[21/9] w-full object-cover md:aspect-[3/1]" />
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
                  <h1 className="mt-3 text-xl font-semibold tracking-tight md:text-2xl">{pkg.name}</h1>
                  <p className="mt-1 text-sm text-[#5C6670]">{pkg.suburb}, {pkg.state}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#5C6670]">Package Price</p>
                  <p className="text-2xl font-bold text-[#0891b2] md:text-3xl">{formatPrice(pkg.wholesalePrice)}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="my-6 border-t border-[rgba(0,0,0,0.06)]" />

              {/* Price Breakdown & Yield */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {pkg.landPrice && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670]">Land</p>
                    <p className="text-sm font-semibold">{formatPrice(pkg.landPrice)}</p>
                    <p className="text-[10px] text-[#5C6670]">{pkg.landSize}m²</p>
                  </div>
                )}
                {pkg.totalBuildPrice && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5C6670]">Build</p>
                    <p className="text-sm font-semibold">{formatPrice(pkg.totalBuildPrice)}</p>
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
                      pkg.houseSize && { icon: Home, label: "Size", value: `${pkg.houseSize}m²` },
                      pkg.landSize && { icon: MapPin, label: "Land", value: `${pkg.landSize}m²` },
                      { icon: Home, label: "Beds", value: pkg.beds },
                      { icon: Bath, label: "Baths", value: pkg.baths },
                      { icon: Car, label: "Cars", value: pkg.cars },
                    ].filter(Boolean).map((s: any) => (
                      <div key={s.label} className="flex items-center gap-1.5 rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f8f6f2] px-3 py-2">
                        <s.icon className="h-3.5 w-3.5 text-[#0891b2]" />
                        <div>
                          <p className="text-[10px] text-[#5C6670]">{s.label}</p>
                          <p className="text-xs font-semibold">{s.value}</p>
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
                            <p className="text-xs font-semibold">{s.value}</p>
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
                <h2 className="text-base font-semibold md:text-lg">About this package</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#5C6670] md:text-base">{pkg.description}</p>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-10 rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 md:mt-8 md:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold md:text-lg">Interested in this package?</h3>
                  <p className="mt-1 text-sm text-[#5C6670]">Contact your advisor to secure this property.</p>
                </div>
                <a href="tel:1300000000" className="inline-flex items-center gap-2 rounded-full bg-[#0891b2] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0369a1] whitespace-nowrap">
                  Call Nick Foale
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
