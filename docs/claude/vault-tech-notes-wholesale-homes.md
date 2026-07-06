# Wholesale Homes tech notes (moved from Obsidian vault 2026-07-06)

Development notes for wholesalehomes.com.au, extracted from the vault note "Wholesale Homes Australia" on 2026-07-06.

- **Header layout:** Client Login sits in the right-side button group (not nav), left of Book Discovery Call, with pl-16 from nav and gap-2 between themselves.
- **Tech stack:** wholesalehomes.com.au runs on Next.js (Vercel) with Recharts calculators: big charts, compact inputs, P&I vs IO toggle. Deploys via git push. Nick Foale is principal advisor.
- **Portal calculators:** dash/pkg/calc includes 4 tools: DualIncome, StampDuty, BorrowPower, InvestAnalyzer.
- **Pricing display:** Struck-through Regular Retail price + %OFF badge + Members Price + [corrupted sentence, verify]
- **Registration:** Start Your Free Trial 7-day badges on sign-up.
- **Sidebar:** isMobile useState + resizeListener for SSR-safe transform (never typeof window inline).
- **Lucide icons:** Colour applied via `<span style={{color}}><Icon/></span>` wrapper.
- **Metadata:** Layout MUST export metadata to override root Saabai title.
