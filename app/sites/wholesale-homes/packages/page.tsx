import Link from "next/link";
import { Header } from "../_components/Header";
import { Footer } from "../_components/Footer";
import { PackageCard } from "../_components/PackageCard";
import { packages } from "../_data/packages";

// Public package list: photos, locations and specs only. Prices, yields and
// documents are for signed-in members (see /client/dashboard).
export default function PackagesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-[#f8f6f2] text-[#1A2B3C]">
        <section className="py-16 md:py-24">
          <div className="mx-auto w-full max-w-3xl px-6 text-center lg:px-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">House &amp; Land Packages</p>
            <h1 className="mt-3 text-[clamp(1.6rem,5vw,3rem)] font-semibold leading-tight tracking-tight">Pre-market packages from leading builders.</h1>
            <p className="mt-4 text-sm leading-relaxed text-[#5C6670] md:text-base">
              Browse what&apos;s available. Members see wholesale pricing, yields and full documents after signing in.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/client-login" className="rounded-full bg-[#0891b2] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0369a1]">Sign in to see pricing</Link>
              <Link href="/client/register" className="rounded-full border border-[#1A2B3C] px-6 py-2.5 text-sm font-semibold text-[#1A2B3C] hover:bg-[#1A2B3C] hover:text-white">Register for access</Link>
            </div>
          </div>
          <div className="mx-auto mt-12 grid w-full max-w-7xl gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3 lg:px-10">
            {packages.map((p) => <PackageCard key={p.id} pkg={p} />)}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
