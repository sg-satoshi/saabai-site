"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ClientPortalShell } from "../../../_components/ClientPortalShell";
import { ArrowLeft, Home, Bath, Car, MapPin, Calendar, Building2, DollarSign, Phone, Calculator, Check, FileText } from "lucide-react";
import { EnquiryForm } from "../../../_components/EnquiryForm";
import { setSelectedProperty } from "../../../_lib/selectedProperty";

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
  /** Cropped photo-only version of `image`, for thumbnails — some source
   * images are full marketing flyers with price/spec panels baked in;
   * this detail page shows the original via `image` instead. */
  thumbImage?: string;
  brochureUrl?: string;
  inclusions?: string[];
  rentalAppraisal?: {
    url: string;
    weeklyMain: number;
    weeklyGranny: number;
    appraiser: string;
    company: string;
  };
};

const allPackages: Pkg[] = [
  { id: "parklands-haven-36", name: "Parklands Haven 36", suburb: "Box Hill", state: "NSW", estate: "Parklands Estate", builder: "Metricon", beds: 4, baths: 2, cars: 2, landSize: 512, houseSize: 218, retailPrice: 798000, wholesalePrice: 729000, landReady: "Jun 2026", badge: "New Release", image: "/sites/wholesale-homes/package-2.jpg", highlight: "9% below comparable suburb sales", description: "A thoughtfully designed four-bedroom home in Sydney's thriving North West Growth Corridor. The Parklands Haven 36 delivers a functional layout with a dedicated study, media room, and an expansive open-plan living area. The kitchen features a walk-in pantry and island bench. Set on a generous 512m² block within the sought-after Parklands Estate, close to the new Box Hill town centre and future rail." },
  { id: "edgewater-loft-28", name: "Edgewater Loft 28", suburb: "Caloundra South", state: "QLD", estate: "Aura", builder: "Stockland Partner", beds: 3, baths: 2, cars: 1, landSize: 312, houseSize: 184, retailPrice: 612000, wholesalePrice: 558000, landReady: "Feb 2026", badge: "Limited Availability", image: "/sites/wholesale-homes/package-3.jpg", highlight: "Only 3 lots remaining", description: "A low-maintenance three-bedroom home perfect for investors and first-home buyers. The Edgewater Loft 28 maximises its 312m² lot with an intelligent split-level design. Open-plan living connects to a private courtyard. Located in Stockland's award-winning Aura community, minutes from the new Caloundra CBD." },
  { id: "harbourline-villa-32", name: "Harbourline Villa 32", suburb: "Cobbitty", state: "NSW", estate: "Emerald Hills", builder: "Mirvac Partner", beds: 4, baths: 2, cars: 2, landSize: 420, houseSize: 232, retailPrice: 742000, wholesalePrice: 678000, landReady: "Aug 2026", badge: "New Release", image: "/sites/wholesale-homes/interior-kitchen.jpg", highlight: "First release pricing locked in", description: "A beautifully proportioned four-bedroom home designed by Mirvac's award-winning architecture team. The Harbourline Villa 32 features a striking facade, a formal entry foyer, and a light-filled open-plan living area that opens onto a covered entertainer's deck." },
  { id: "sunnydale-terrace-30", name: "Sunnydale Terrace 30", suburb: "Pimpama", state: "QLD", estate: "Gainsborough Greens", builder: "Metricon", beds: 3, baths: 2, cars: 2, landSize: 392, houseSize: 198, retailPrice: 645000, wholesalePrice: 589000, landReady: "Apr 2026", badge: "Below Market", image: "/sites/wholesale-homes/lifestyle-living.jpg", highlight: "Growth corridor, strong rental demand", description: "A smart three-bedroom terrace home in one of Queensland's fastest-growing corridors. The Sunnydale Terrace 30 delivers low-maintenance living with a private courtyard and master bedroom with ensuite." },
  { id: "kyabram-greens-lot-32", name: "Lot 32 / Main House + Granny Flat", suburb: "Kyabram", state: "VIC", estate: "Kyabram Greens Estate", builder: "Kyabram Greens", beds: 4, baths: 2, cars: 2, landSize: 1100, houseSize: 159.58, retailPrice: 779990, wholesalePrice: 779990, badge: "New Release", image: "/sites/wholesale-homes/kyabram-greens.jpg", thumbImage: "/sites/wholesale-homes/kyabram-greens-thumb.jpg", highlight: "6.5% forecasted yield with dual income", description: "Dual occupancy, dual income. Lot 32 delivers a main residence plus a separate granny flat on a generous 1,100m² lot in Kyabram Greens Estate. One of Regional Victoria's strongest-performing investment strategies. The main house features 4 bedrooms, 2 bathrooms, and open-plan living across 159.58m². The granny flat adds 2 bedrooms, 1 bathroom, and its own living area, offering the potential for higher rental returns and multiple income streams from a single title. Positioned within an established and growing community with strong rental demand — Kyabram is a regional hub of ~7,300 residents in the Goulburn Valley, anchored by dairy and food-manufacturing employment. Forecasted yield of 6.5%.", grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "32", landPrice: 210000, totalBuildPrice: 569990, yieldVal: "6.5%",
    brochureUrl: "/sites/wholesale-homes/documents/kyabram-greens-lot-32-brochure.pdf",
    inclusions: ["2590mm ceiling height", "20mm Caesarstone benchtop to kitchen, bathroom & ensuite", "900mm stainless steel upright cooker & rangehood", "Coloured through concrete driveway & granny flat path", "Flyscreens to all openable windows & sliding doors", "Concrete perimeter path around entire home", "Colorbond motorised sectional garage door with remote", "Roller blinds throughout", "Front & rear landscaping, letterbox & clothesline"],
    rentalAppraisal: {
      url: "/sites/wholesale-homes/documents/kyabram-greens-lot-32-rental-appraisal.pdf",
      weeklyMain: 580,
      weeklyGranny: 400,
      appraiser: "Ian Koh",
      company: "Koham Property",
    },
  },
  { id: "the-willows-42", name: "Lot 42 / Main House + Granny Flat", suburb: "Yarrawonga", state: "VIC", estate: "The Willows", builder: "The Willows Yarrawonga", beds: 4, baths: 2, cars: 2, landSize: 783, houseSize: 179, retailPrice: 869990, wholesalePrice: 869990, badge: "New Release", image: "/sites/wholesale-homes/the-willows.jpg", thumbImage: "/sites/wholesale-homes/the-willows-thumb.jpg", highlight: "5.6% forecasted yield / lakefront dual occupancy", description: "Dual occupancy, dual income. Lot 42 in The Willows Estate, Yarrawonga is a premium dual-income opportunity on a 783m² lot in a master-planned lakefront community. Dual-income properties continue to be one of the strongest-performing investment strategies, and this package delivers: a 4-bedroom main house with 2 bathrooms and open-plan living across 179m², plus a separate granny flat with 2 bedrooms, 1 bathroom, and its own living area. Perfect for dual income, extended family, or holiday rental. Established and growing community with strong rental demand. Forecasted yield of 5.6%.", grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "42", landPrice: 330500, totalBuildPrice: 539490, yieldVal: "5.6%" },
  { id: "orchardfield-49", name: "Lot 49 / Main House + Granny Flat", suburb: "Kyabram", state: "VIC", estate: "Orchardfield Estate", builder: "Orchardfield", beds: 4, baths: 2, cars: 2, landSize: 521, houseSize: 179, retailPrice: 789990, wholesalePrice: 789990, badge: "New Release", image: "/sites/wholesale-homes/orchardfield.jpg", thumbImage: "/sites/wholesale-homes/orchardfield-thumb.jpg", highlight: "6.45% forecasted yield / dual income package", description: "Dual occupancy, dual income. Lot 49 in Orchardfield Estate, Kyabram is a fixed-price dual-income opportunity on a 521m² lot within one of Regional Victoria's strongest-performing investment categories. The main house offers 4 bedrooms, 2 bathrooms, and open-plan living across 179m². The granny flat adds 2 bedrooms, 1 bathroom, and its own living area. Delivering the potential for multiple income streams from a single title. Located in an established and growing community with strong rental demand. Forecasted yield of 6.45%.", grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "49", landPrice: 229000, totalBuildPrice: 560990, yieldVal: "6.45%" },
  { id: "the-outlook-513", name: "Lot 513 / Main House + Granny Flat", suburb: "Mooroopna", state: "VIC", estate: "The Outlook", builder: "The Outlook Mooroopna", beds: 4, baths: 2, cars: 2, landSize: 612, houseSize: 179, retailPrice: 799990, wholesalePrice: 799990, badge: "New Release", image: "/sites/wholesale-homes/the-outlook.jpg", thumbImage: "/sites/wholesale-homes/the-outlook-thumb.jpg", highlight: "6.3% forecasted yield / dual occupancy near reserve", description: "Dual occupancy, dual income. Lot 513 in The Outlook, Mooroopna is a dual-income package on a 612m² lot in a growing Goulburn Valley community. Dual-income properties continue to be one of the strongest-performing investment strategies. The main house offers 4 bedrooms, 2 bathrooms, and open-plan living across 179m². The granny flat adds 2 bedrooms, 1 bathroom, and its own living area. Ideal for higher rental returns and extended family. Situated near a natural bushland reserve in a community with strong rental demand. Forecasted yield of 6.3%.", grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "513", landPrice: 255000, totalBuildPrice: 544990, yieldVal: "6.3%" },
  { id: "woodlands-16", name: "Lot 16 / Main House + Granny Flat", suburb: "Nagambie", state: "VIC", estate: "Woodlands Estate", builder: "Woodlands Nagambie", beds: 4, baths: 2, cars: 2, landSize: 581, houseSize: 179, retailPrice: 814990, wholesalePrice: 814990, badge: "New Release", image: "/sites/wholesale-homes/woodlands.jpg", thumbImage: "/sites/wholesale-homes/woodlands-thumb.jpg", highlight: "6.3\u20136.7% forecasted yield / dual income near lake", description: "Dual occupancy, dual income. Lot 16 in Woodlands Estate, Nagambie offers a fixed-price dual-income package on a 581m² lot in a master-planned community. The main house delivers 4 bedrooms, 2 bathrooms, and open-plan living across 179m². The granny flat adds 2 bedrooms, 1 bathroom, and its own living area. Providing the opportunity for multiple income streams from a single title. Located near Lake Nagambie in an established and growing regional community with strong rental demand. Forecasted yield of 6.3\u20136.7%.", grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "16", landPrice: 271500, totalBuildPrice: 543490, yieldVal: "6.3\u20136.7%" },
  { id: "winterbrook-36", name: "Lot 36 / Main House + Granny Flat", suburb: "Heyfield", state: "VIC", estate: "Winterbrook", builder: "Winterbrook Heyfield", beds: 4, baths: 2, cars: 2, landSize: 852, houseSize: 179, retailPrice: 769990, wholesalePrice: 769990, badge: "New Release", image: "/sites/wholesale-homes/winterbrook.jpg", thumbImage: "/sites/wholesale-homes/winterbrook-thumb.jpg", highlight: "6.28\u20136.88% forecasted yield / large 852m\u00b2 block", description: "Dual occupancy, dual income. Lot 36 in Winterbrook, Heyfield is a dual-income opportunity on a generous 852m² lot with mountain views. One of Regional Victoria's strongest-performing investment strategies, offering the potential for higher rental returns from a single title. The main house offers 4 bedrooms, 2 bathrooms, and open-plan living across 179m². The granny flat adds 2 bedrooms, 1 bathroom, and its own living area. Located near the Thomson River in a growing Wellington Shire community. Forecasted yield of 6.28\u20136.88%.", grannyBeds: 2, grannyBaths: 1, grannySize: 59, lot: "36", landPrice: 225000, totalBuildPrice: 544990, yieldVal: "6.28\u20136.88%" },
];

const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);

export default function ClientPackageDetail() {
  const params = useParams<{ id: string }>();
  const pkg = allPackages.find((p) => p.id === params.id);
  if (!pkg) {
    return (
      <ClientPortalShell>
        <div className="flex flex-1 items-center justify-center px-6 py-24">
          <div className="text-center">
            <p className="text-lg font-semibold text-[#1A2B3C]">Package not found</p>
            <Link href="/client/dashboard" className="mt-4 inline-flex items-center gap-2 text-sm text-[#0891b2] hover:underline">
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
            <Link href="/client/dashboard" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0891b2] hover:underline md:text-sm">
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
                    href="/client/calculators/investment-analyzer"
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
                    Or call <a href="tel:1300000000" className="font-semibold text-[#0891b2] hover:underline">1300 000 000</a> to speak with Nick directly.
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
