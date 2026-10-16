import Link from "next/link";
import { Logo } from "./Logo";
import PoweredBySaabai from "../../components/PoweredBySaabai";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-fg font-sans">
      <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-md border-b border-muted-line">
        <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/sites/cycle-repair" className="flex items-center">
            <Logo width={160} height={68} className="h-[58px] sm:h-[68px] w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="/sites/cycle-repair#services" className="hover:text-brand transition-colors">Services</Link>
            <Link href="/sites/cycle-repair/gold-coast" className="hover:text-brand transition-colors">Gold Coast</Link>
            <Link href="/sites/cycle-repair/faq" className="hover:text-brand transition-colors">FAQ</Link>
            <Link href="/sites/cycle-repair/contact" className="hover:text-brand transition-colors">Contact</Link>
          </div>
          <a
            href="tel:0405225721"
            className="bg-brand text-brand-foreground px-4 py-2 rounded-md font-semibold text-xs tracking-wide hover:bg-brand/90 transition-colors"
          >
            0405 225 721
          </a>
        </nav>
      </header>
      {children}
      <footer className="bg-surface/50 border-t border-muted-line pt-12 pb-28 md:pb-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-3">
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-muted-foreground">
              Stu&apos;s Cycle Repairs © {new Date().getFullYear()}
            </span>
            <PoweredBySaabai
              site="stuscyclerepairs"
              className="text-[11px] tracking-[0.08em] text-muted-foreground/80 hover:text-brand transition-colors py-2"
            />
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-[11px] font-bold tracking-[0.22em] uppercase text-muted-foreground">
            <Link href="/sites/cycle-repair" className="hover:text-brand transition-colors">Home</Link>
            <Link href="/sites/cycle-repair/gold-coast" className="hover:text-brand transition-colors">Gold Coast</Link>
            <Link href="/sites/cycle-repair/faq" className="hover:text-brand transition-colors">FAQ</Link>
            <Link href="/sites/cycle-repair/contact" className="hover:text-brand transition-colors">Contact</Link>
            <a href="tel:0405225721" className="hover:text-brand transition-colors">Call Stu</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
