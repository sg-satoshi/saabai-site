"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "../../../_components/Header";
import { Footer } from "../../../_components/Footer";
import { ArrowLeft, Home, Bath, Car, MapPin, Calendar } from "lucide-react";

const AUTH_KEY = "wholesale_client_auth";

const allPackages = [
  { id: "northbridge-rise-42", name: "The Northbridge 42", suburb: "Tarneit", state: "VIC", estate: "Northbridge Rise", builder: "Metricon", beds: 4, baths: 2, cars: 2, landSize: 448, houseSize: 248, retailPrice: 689000, wholesalePrice: 621000, landReady: "Mar 2026", badge: "Below Market", image: "/sites/wholesale-homes/package-1.jpg", highlight: "Saved $68K vs current valuation", description: "A spacious four-bedroom family home designed for modern living. The Northbridge 42 features an open-plan kitchen, dining and living area that flows onto a covered alfresco. The master suite includes a walk-in robe and ensuite, while the remaining bedrooms are serviced by a main bathroom with separate bath and shower. Located in Metricon's master-planned Northbridge Rise estate with parkland and future school precinct." },
  { id: "parklands-haven-36", name: "Parklands Haven 36", suburb: "Box Hill", state: "NSW", estate: "Parklands Estate", builder: "Metricon", beds: 4, baths: 2, cars: 2, landSize: 512, houseSize: 218, retailPrice: 798000, wholesalePrice: 729000, landReady: "Jun 2026", badge: "New Release", image: "/sites/wholesale-homes/package-2.jpg", highlight: "9% below comparable suburb sales", description: "A thoughtfully designed four-bedroom home in Sydney's thriving North West Growth Corridor. The Parklands Haven 36 delivers a functional layout with a dedicated study, media room, and an expansive open-plan living area. The kitchen features a walk-in pantry and island bench. Set on a generous 512m² block within the sought-after Parklands Estate, close to the new Box Hill town centre and future rail." },
  { id: "edgewater-loft-28", name: "Edgewater Loft 28", suburb: "Caloundra South", state: "QLD", estate: "Aura", builder: "Stockland Partner", beds: 3, baths: 2, cars: 1, landSize: 312, houseSize: 184, retailPrice: 612000, wholesalePrice: 558000, landReady: "Feb 2026", badge: "Limited Availability", image: "/sites/wholesale-homes/package-3.jpg", highlight: "Only 3 lots remaining", description: "A low-maintenance three-bedroom home perfect for investors and first-home buyers. The Edgewater Loft 28 maximises its 312m² lot with an intelligent split-level design. Open-plan living connects to a private courtyard. Located in Stockland's award-winning Aura community, minutes from the new Caloundra CBD." },
  { id: "ridgeview-prestige-48", name: "Ridgeview Prestige 48", suburb: "Officer", state: "VIC", estate: "Arcadia", builder: "Metricon", beds: 4, baths: 3, cars: 2, landSize: 560, houseSize: 286, retailPrice: 849000, wholesalePrice: 772000, landReady: "May 2026", badge: "Below Market", image: "/sites/wholesale-homes/hero-home.jpg", highlight: "Premium corner lot, north-facing", description: "A premium four-bedroom family residence on one of the largest lots in the Arcadia estate. The Ridgeview Prestige 48 offers dual living zones, a grand master retreat with ensuite and walk-in robe, and a gourmet kitchen with butler's pantry." },
  { id: "harbourline-villa-32", name: "Harbourline Villa 32", suburb: "Cobbitty", state: "NSW", estate: "Emerald Hills", builder: "Mirvac Partner", beds: 4, baths: 2, cars: 2, landSize: 420, houseSize: 232, retailPrice: 742000, wholesalePrice: 678000, landReady: "Aug 2026", badge: "New Release", image: "/sites/wholesale-homes/interior-kitchen.jpg", highlight: "First release pricing locked in", description: "A beautifully proportioned four-bedroom home designed by Mirvac's award-winning architecture team. The Harbourline Villa 32 features a striking facade, a formal entry foyer, and a light-filled open-plan living area that opens onto a covered entertainer's deck." },
  { id: "sunnydale-terrace-30", name: "Sunnydale Terrace 30", suburb: "Pimpama", state: "QLD", estate: "Gainsborough Greens", builder: "Metricon", beds: 3, baths: 2, cars: 2, landSize: 392, houseSize: 198, retailPrice: 645000, wholesalePrice: 589000, landReady: "Apr 2026", badge: "Below Market", image: "/sites/wholesale-homes/lifestyle-living.jpg", highlight: "Growth corridor, strong rental demand", description: "A smart three-bedroom terrace home in one of Queensland's fastest-growing corridors. The Sunnydale Terrace 30 delivers low-maintenance living with a private courtyard and master bedroom with ensuite." },
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

            <div className="mt-6 grid gap-8 md:grid-cols-5">
              {/* Image */}
              <div className="md:col-span-3">
                <div className="aspect-[16/10] overflow-hidden rounded-3xl bg-[#f5f2eb]">
                  <img src={pkg.image} alt={pkg.name} className="h-full w-full object-cover" />
                </div>
              </div>

              {/* Details */}
              <div className="md:col-span-2">
                <span className={`inline-block rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white md:text-xs ${
                  pkg.badge === "Limited Availability" ? "bg-[#0891b2]" : pkg.badge === "New Release" ? "bg-green-600" : "bg-[#1A2B3C]"
                }`}>
                  {pkg.badge}
                </span>
                <h1 className="mt-3 text-xl font-semibold tracking-tight md:text-2xl">{pkg.name}</h1>
                <p className="mt-1 text-sm text-[#5C6670]">{pkg.suburb}, {pkg.state}</p>

                <div className="mt-6 space-y-4 border-t border-[rgba(0,0,0,0.06)] pt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#5C6670]">Wholesale Price</span>
                    <span className="text-lg font-bold text-[#0891b2]">{formatPrice(pkg.wholesalePrice)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#5C6670]">Retail Value</span>
                    <span className="text-sm text-[#5C6670] line-through">{formatPrice(pkg.retailPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[rgba(0,0,0,0.06)] pt-4">
                    <span className="text-sm text-[#5C6670]">You Save</span>
                    <span className="text-sm font-semibold text-green-600">{formatPrice(pkg.retailPrice - pkg.wholesalePrice)}</span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {[
                    { icon: Home, label: "House", value: `${pkg.houseSize}m²` },
                    { icon: MapPin, label: "Land", value: `${pkg.landSize}m²` },
                    { icon: Home, label: "Bedrooms", value: pkg.beds },
                    { icon: Bath, label: "Bathrooms", value: pkg.baths },
                    { icon: Car, label: "Car Spaces", value: pkg.cars },
                    { icon: Calendar, label: "Land Ready", value: pkg.landReady },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-2 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white px-3.5 py-2.5">
                      <s.icon className="h-3.5 w-3.5 text-[#0891b2]" />
                      <div>
                        <p className="text-[10px] text-[#5C6670]">{s.label}</p>
                        <p className="text-xs font-semibold">{s.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-5 text-sm leading-relaxed text-[#0891b2]">{pkg.highlight}</p>
              </div>
            </div>

            {/* Description */}
            <div className="mt-10 md:mt-14">
              <div className="max-w-3xl">
                <h2 className="text-base font-semibold md:text-lg">About this package</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#5C6670] md:text-base">{pkg.description}</p>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-10 rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 md:mt-14 md:p-8">
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
