import Link from "next/link";
import { redirect } from "next/navigation";
import { Bed, Bath, Car, Maximize, Home, MapPin, Building2, Calendar, Lock, ArrowLeft } from "lucide-react";
import { Header } from "../../_components/Header";
import { Footer } from "../../_components/Footer";
import { packages, getPublicPackage } from "../../_data/packages";

export function generateStaticParams() {
  return packages.map((p) => ({ id: p.id }));
}

// Public package page: photo, location, specs and description, with a call
// to action to sign in or register for pricing. No prices, yields or rents.
export default async function PackageDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pkg = getPublicPackage(id);
  // Not a public package (e.g. a members-only listing someone shared): send
  // them to the members page, which asks non-members to sign in first.
  if (!pkg) redirect(`/client/packages/${encodeURIComponent(id)}`);

  const facts = [
    { icon: Bed, label: "Bedrooms", value: String(pkg.beds) },
    { icon: Bath, label: "Bathrooms", value: String(pkg.baths) },
    { icon: Car, label: "Car spaces", value: String(pkg.cars) },
    { icon: Maximize, label: "Land", value: `${pkg.landSize}m²` },
    ...(pkg.houseSize ? [{ icon: Home, label: "House", value: `${pkg.houseSize}m²` }] : []),
    ...(pkg.landReady ? [{ icon: Calendar, label: "Land ready", value: pkg.landReady }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-[#f8f6f2] text-[#1A2B3C]">
        <section className="py-8 md:py-12">
          <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
            <Link href="/packages" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0891b2] hover:underline md:text-sm">
              <ArrowLeft className="h-3.5 w-3.5" /> All packages
            </Link>
            <div className="mt-6 overflow-hidden rounded-3xl bg-[#f5f2eb]">
              <img src={pkg.image} alt={`${pkg.name} in ${pkg.suburb}`} className="aspect-[3/2] w-full object-cover md:aspect-[16/9]" />
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
              <div>
                <span className="rounded-full bg-[#0891b2] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">{pkg.badge}</span>
                <h1 className="mt-4 text-[clamp(1.6rem,4vw,2.5rem)] font-semibold leading-tight tracking-tight">{pkg.name}</h1>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#5C6670]">
                  <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{pkg.suburb}, {pkg.state}</span>
                  <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4" />{pkg.estate} &middot; {pkg.builder}</span>
                </p>
                {pkg.highlight && <p className="mt-4 text-sm font-medium text-[#0891b2]">{pkg.highlight}</p>}
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {facts.map((f) => (
                    <div key={f.label} className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
                      <f.icon className="h-4 w-4 text-[#0891b2]" />
                      <p className="mt-2 text-[11px] uppercase tracking-wider text-[#5C6670]">{f.label}</p>
                      <p className="text-base font-semibold">{f.value}</p>
                    </div>
                  ))}
                </div>
                {pkg.description && <p className="mt-8 text-sm leading-relaxed text-[#5C6670] md:text-base">{pkg.description}</p>}
              </div>

              <aside className="h-fit rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6">
                <div className="flex items-center gap-2 text-[#0891b2]"><Lock className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wider">Members pricing</span></div>
                <h2 className="mt-3 text-lg font-semibold tracking-tight">Sign in or register to see the price</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#5C6670]">
                  Wholesale pricing, yields, rental appraisals and brochures are available to approved members.
                </p>
                <Link href={`/client/packages/${pkg.id}`} className="mt-5 flex w-full items-center justify-center rounded-full bg-[#0891b2] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0369a1]">
                  Sign in to see pricing
                </Link>
                <Link href="/client/register" className="mt-3 flex w-full items-center justify-center rounded-full border border-[#1A2B3C] px-6 py-3 text-sm font-semibold text-[#1A2B3C] hover:bg-[#1A2B3C] hover:text-white">
                  Register for access
                </Link>
                <Link href="/contact" className="mt-4 block text-center text-xs font-medium text-[#5C6670] hover:underline">Or talk to an advisor</Link>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
