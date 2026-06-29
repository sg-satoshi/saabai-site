import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-[rgba(0,0,0,0.08)] bg-[#1A2B3C] text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-16 lg:grid-cols-4 lg:px-10">
        <div className="lg:col-span-2">
          <Logo variant="light" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">
            Pre-market access to Australia&apos;s best house and land packages, secured at wholesale pricing through exclusive builder partnerships.
          </p>
          <div className="mt-6 flex flex-col gap-1.5 text-sm text-white/70">
            <a href="tel:1300000000" className="hover:text-white">1300 000 000</a>
            <a href="mailto:hello@wholesalehomes.com.au" className="hover:text-white">hello@wholesalehomes.com.au</a>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Explore</p>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li><Link href="/sites/wholesale-homes/packages" className="hover:text-white">Packages</Link></li>
            <li><Link href="/sites/wholesale-homes/how-it-works" className="hover:text-white">How It Works</Link></li>
            <li><Link href="/sites/wholesale-homes/tax-advantages" className="hover:text-white">Tax Advantages</Link></li>
            <li><Link href="/sites/wholesale-homes/blog" className="hover:text-white">Blog</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Company</p>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li><Link href="/sites/wholesale-homes/about" className="hover:text-white">About</Link></li>
            <li><Link href="/sites/wholesale-homes/faq" className="hover:text-white">FAQ</Link></li>
            <li><Link href="/sites/wholesale-homes/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-6 text-xs text-white/75 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <p>&copy; {new Date().getFullYear()} Wholesale Homes Australia. All rights reserved.</p>
          <p className="max-w-2xl">
            This website provides general information only and does not constitute financial advice. You should seek independent professional advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
