"use client";

import { useState } from "react";
import { ClientPortalShell } from "../../_components/ClientPortalShell";
import { BookOpen, TrendingUp, FileText, Shield, DollarSign, Home, ArrowRight, X } from "lucide-react";

const HERO_IMAGES: Record<string, string> = {
  "first-home-buyer-guide": "https://v3b.fal.media/files/b/0aa11cbd/7wPD1hJ9buvuUMeNjpB79_bNA7sqq7.png",
  "negative-gearing-explained": "https://v3b.fal.media/files/b/0aa11cbe/acWVKUfHakdlm1FgWpEu3_hUa9hV6O.png",
  "dual-income-strategy": "https://v3b.fal.media/files/b/0aa11cbf/0RyRdkkMGSWI0r9KLczwN_XktX83sM.png",
  "investment-structures": "https://v3b.fal.media/files/b/0aa11cbe/RdZS8KUOUqnkz-91RQbuT_FM2EJGYR.png",
  "deposit-finance-guide": "https://v3b.fal.media/files/b/0aa11cbf/l3VZ0Q6HrmwJE6pAmcvQ6_SG54juM7.png",
};

type Article = {
  slug: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  sections: string[];
  readTime: string;
  content: { heading: string; body: string[] }[];
};

const ARTICLES: Article[] = [
  {
    slug: "first-home-buyer-guide",
    title: "First Home Buyer Guide",
    desc: "Everything you need to know about buying your first home, from saving a deposit to picking up the keys.",
    icon: FileText,
    color: "#0891b2",
    sections: ["Deposit strategies", "FHOG by state", "Stamp duty concessions"],
    readTime: "8 min read",
    content: [
      {
        heading: "The hardest part is getting started",
        body: [
          "Buying your first home feels like standing at the bottom of a cliff looking up.",
          "Everyone tells you it's worth it, but nobody tells you how to actually start climbing. Let's fix that.",
          "The truth is the first home buyer landscape changed significantly in 2026. The rules are finally tilting in your favour if you know where to look.",
        ],
      },
      {
        heading: "How much deposit do you actually need?",
        body: [
          "The old rule was 20% or you pay LMI. That's still true for established homes.",
          "But here's where it gets interesting for new builds. The federal government's Help to Buy scheme lets you purchase with as little as 5% deposit on new construction.",
          "The government takes an equity stake in the property. You don't pay rent on the government's share, and you can buy them out later when your income grows.",
          "It's not a free ride. But it's the closest thing to a shortcut we've seen in Australian housing policy.",
          "For context, a 5% deposit on a $729,000 house and land package is around $36,000. That's achievable for most dual-income couples within 12 to 18 months with disciplined saving.",
        ],
      },
      {
        heading: "First Home Owner Grant by state",
        body: [
          "Every state runs its own FHOG program, and the amounts vary wildly.",
          "In Victoria, the First Home Owner Grant is $10,000 for new homes valued up to $750,000. New South Wales offers up to $10,000 for new homes under $600,000.",
          "Queensland gives $15,000 for new homes under $750,000. Western Australia offers $10,000 and South Australia offers $15,000 for new homes.",
          "The common thread across every state is that the grant is designed for new construction, not established properties. That's deliberate policy. The government wants you building new supply.",
        ],
      },
      {
        heading: "Stamp duty concessions",
        body: [
          "This is where first home buyers can save serious money.",
          "In NSW, first home buyers pay zero stamp duty on new homes up to $800,000 and a reduced rate up to $1,000,000. On a $729,000 package, that saves you around $27,000.",
          "In Victoria, the exemption applies up to $600,000 with a concession up to $750,000. Queensland exempts first home buyers up to $500,000.",
          "The exact thresholds change with each state budget, so always verify. But the principle is the same: buying new construction almost always comes with a stamp duty advantage that established property doesn't offer.",
        ],
      },
      {
        heading: "The step-by-step process",
        body: [
          "Here's how it actually plays out.",
          "Step one: get pre-approved by a lender. This tells you exactly what you can borrow and gives you confidence when you find the right property.",
          "Step two: find your package. This is where Wholesale Homes comes in. We show you properties at wholesale pricing before they hit the public market.",
          "Step three: make an offer and sign a contract. Your conveyancer reviews the contract, and you go unconditional.",
          "Step four: settlement. The property is yours.",
          "Step five: the build begins. With a house and land package, you don't move in immediately. The build takes around 12 months. During that time, you continue saving while your property appreciates in value. By the time you move in, you already have equity.",
        ],
      },
      {
        heading: "The bottom line",
        body: [
          "First home buying has never been easy. But it's more accessible right now than it has been in years.",
          "The combination of government grants, stamp duty concessions, and pre-market pricing through our builder network means your first home can be a better financial decision than renting ever was.",
          "Talk to Nick about which package suits your budget.",
        ],
      },
    ],
  },
  {
    slug: "negative-gearing-explained",
    title: "Negative Gearing Explained",
    desc: "How negative gearing works, what changed in 2026, and why new builds are now the only game in town.",
    icon: DollarSign,
    color: "#16a34a",
    sections: ["2026 changes", "Depreciation benefits", "New build advantage"],
    readTime: "10 min read",
    content: [
      {
        heading: "Negative gearing is not a bad word",
        body: [
          "A lot of investors hear 'negative gearing' and think they're doing something wrong. You're not.",
          "Negative gearing simply means your property costs more to hold than it earns in rent. The loss is tax-deductible against your other income.",
          "That's not a loophole. It's deliberate government policy designed to encourage investment in housing supply.",
          "The idea is you accept a short-term cash flow loss in exchange for long-term capital growth. And the taxman shares some of that loss with you.",
        ],
      },
      {
        heading: "What the 2026 Federal Budget changed",
        body: [
          "This is the big one.",
          "From 1 July 2027, negative gearing on established properties is being phased out. From that date, the tax benefits only apply to new construction.",
          "The government's logic is straightforward: they want to incentivise new housing supply, not drive up prices on existing homes.",
          "For investors, this is a seismic shift. The established property you were planning to negatively gear? The tax benefit disappears in less than a year.",
          "New builds? They retain full negative gearing benefits.",
          "If you've been sitting on the fence wondering whether to buy new or established, this budget decision makes the answer crystal clear.",
        ],
      },
      {
        heading: "How depreciation supercharges new builds",
        body: [
          "Depreciation is the tax deduction you get for the building and its fixtures wearing out over time.",
          "A brand new home generates significantly higher depreciation deductions than an established property.",
          "A typical new house and land package might generate $10,000 to $15,000 per year in depreciation deductions in the first few years.",
          "For an investor in the 37% tax bracket, that's $3,700 to $5,550 in actual tax savings per year. Those savings start from day one.",
          "Combined with negative gearing on the interest costs, new builds offer a tax outcome that established properties simply cannot match.",
        ],
      },
      {
        heading: "Capital gains considerations",
        body: [
          "Under the 2026 changes, new builds retain the CGT discount of 50% for properties held longer than 12 months.",
          "This matters because most property investors don't make their real money from rental income. They make it from capital growth.",
          "A property that grows at 4% per year over 10 years has increased in value by 48%. On a $729,000 property, that's around $350,000 in growth.",
          "With the 50% CGT discount, you pay tax on half of that gain. That's still a significant tax bill, but it's far less than the profit you've made.",
        ],
      },
      {
        heading: "A worked example",
        body: [
          "Let's put numbers to it.",
          "You buy a $729,000 house and land package with a 20% deposit and a 6.3% interest rate. Your rental income is $520 per week.",
          "Holding costs including rates, insurance, management and maintenance total around $8,100 per year. The interest cost is roughly $36,000 per year.",
          "Net result: you're around $22,000 negative each year before tax. But you can claim that $22,000 against your other income.",
          "In the 37% tax bracket, that's about $8,100 back at tax time. Your actual out-of-pocket cost drops from $22,000 to around $13,900. And your property is still growing in value.",
        ],
      },
      {
        heading: "The bottom line",
        body: [
          "Negative gearing is a tool, not a strategy. It works best when you have confidence in long-term capital growth and you're in a tax bracket where the deductions provide real value.",
          "With the 2026 changes restricting negative gearing to new builds, the window of opportunity is clear.",
          "If you've been considering property investment, the combination of below-market wholesale pricing, full negative gearing benefits, and significant depreciation deductions makes new builds the most tax-efficient option available.",
        ],
      },
    ],
  },
  {
    slug: "dual-income-strategy",
    title: "Dual Income Strategy Guide",
    desc: "Why dual-occupancy properties are one of the strongest-performing investment strategies in Australia.",
    icon: TrendingUp,
    color: "#d4a84b",
    sections: ["Yield comparison", "Granny flat demand", "Finance structuring"],
    readTime: "7 min read",
    content: [
      {
        heading: "One property, two income streams",
        body: [
          "Imagine buying a property that pays for itself. That's the promise of dual occupancy.",
          "A main residence plus a separate granny flat, both on the same title, each generating rent.",
          "Instead of one tenant paying $520 per week, you have a main house tenant at $520 and a granny flat tenant at $320. Total weekly income: $840.",
          "On the same land. With one loan. One set of rates. One insurance policy. Two income streams.",
        ],
      },
      {
        heading: "The yield advantage is real",
        body: [
          "The numbers don't lie.",
          "A standard single-dwelling house and land package in Victoria might yield 3.5% to 4.5% gross.",
          "Dual occupancy packages in our portfolio consistently forecast 5.6% to 6.88% gross yield. That's a 40% to 60% yield premium.",
          "On a $789,990 package, that's the difference between $29,700 per year in rent and $47,400 per year.",
          "That yield premium is the difference between negative cash flow and positive cash flow. It's the difference between the bank saying no and the bank saying yes.",
        ],
      },
      {
        heading: "Where granny flat demand comes from",
        body: [
          "Australia's rental market is squeezed. Vacancy rates in regional areas are under 1.5%. Rents have risen 30% in three years.",
          "Young couples can't afford standalone houses. Older Australians are looking to downsize but stay in their community. Single professionals want privacy without the price tag of a full house.",
          "The granny flat solves all of these. It's affordable, private, and usually located in established neighbourhoods with access to transport and services.",
          "The demand is structural, not cyclical. It's not going away when interest rates drop.",
        ],
      },
      {
        heading: "How the numbers stack up",
        body: [
          "Take a typical dual occupancy package at $789,990 with a $620,000 loan at 6.3%.",
          "The main house rents for $420 per week and the granny flat for $280 per week. Total rent is $700 per week or $36,400 per year.",
          "After costs of around $8,000 per year, your net rental income is $28,400. Your loan costs around $38,000 per year.",
          "That puts you about $9,600 negative per year before tax. But with tax deductions and depreciation, that net cost drops significantly.",
          "And your total return including capital growth at 4% works out to around $30,000 in appreciation plus the rental income. An effective total return much higher than a standard single dwelling.",
        ],
      },
      {
        heading: "Financing dual occupancy",
        body: [
          "Lenders generally treat dual occupancy favourably because the rental income is higher and there are two income sources.",
          "Most lenders will use 80% of the rental income in their serviceability assessment. With dual income, that assessed rental income is substantially higher.",
          "The practical effect is you can borrow more or qualify more easily.",
          "Your broker will need to confirm the property is zoned appropriately and that the granny flat is legally constructed. All our packages come with council-approved designs, so this is handled.",
        ],
      },
      {
        heading: "The bottom line",
        body: [
          "Dual occupancy is not a niche strategy. It's becoming the default approach for smart investors in Australian property.",
          "Higher yield, lower vacancy risk, better borrowing capacity, and the same capital growth exposure as a standard house.",
          "If you're building a property portfolio, dual occupancy should be your first conversation.",
        ],
      },
    ],
  },
  {
    slug: "investment-structures",
    title: "Investment Structures",
    desc: "Individual, joint, trust, or company. Which structure is right for your property investment strategy.",
    icon: Shield,
    color: "#8b5cf6",
    sections: ["SMSF property", "Trust structures", "Asset protection"],
    readTime: "9 min read",
    content: [
      {
        heading: "The structure question nobody asks until it's too late",
        body: [
          "Most first-time investors buy in their own name. It's simple, the bank understands it, and there's no legal complexity.",
          "For many people, that's the right answer. But as your portfolio grows, holding everything in your personal name creates problems.",
          "You pay more tax. Your assets are exposed. And refinancing becomes harder.",
          "The right structure depends on your goals, your tax situation, and how many properties you plan to own. Let's run through the options.",
        ],
      },
      {
        heading: "Individual ownership",
        body: [
          "This is the default. You own the property in your name. Rental income is taxed at your marginal rate.",
          "Capital gains are taxed at your marginal rate with the 50% CGT discount after 12 months. It's simple, cheap to set up, and the bank loves it.",
          "The downside is asset protection. If you get sued, the property is on the line.",
          "Individual ownership works best for first-time investors and people who don't expect to own more than two or three properties.",
        ],
      },
      {
        heading: "Joint ownership",
        body: [
          "Buying with a partner or spouse is the most common structure for couples. You can own the property as joint tenants or tenants in common.",
          "Joint tenants means if one of you dies, the other inherits automatically. Tenants in common means each person owns a specific share, which can be left to someone else in a will.",
          "The tax advantage of joint ownership is you can split rental income and capital gains between two people, potentially keeping both in lower tax brackets.",
        ],
      },
      {
        heading: "Trust structures",
        body: [
          "A discretionary trust (or family trust) is a popular structure for serious property investors.",
          "The trust owns the property. The trustee decides how to distribute income and capital gains to beneficiaries each year. This gives you enormous flexibility.",
          "In a good year, you can direct income to lower-taxed beneficiaries. In a bad year, you can retain losses.",
          "The downsides are setup costs (typically $2,000 to $4,000), annual accounting costs, and some lenders are less comfortable with trust structures.",
        ],
      },
      {
        heading: "SMSF property investment",
        body: [
          "A Self-Managed Super Fund can borrow to buy property through a limited recourse borrowing arrangement (LRBA).",
          "The property is held in the super fund. Rental income and capital gains are taxed at 15%, or 0% if the fund is in pension phase.",
          "The catch is you cannot live in the property or rent it to related parties. And the borrowing rules are strict.",
          "SMSF investment works for people with substantial super balances (typically $200,000+) who want to diversify their retirement savings into property.",
        ],
      },
      {
        heading: "Company ownership",
        body: [
          "Buying property through a company is uncommon for individual investors because companies don't get the 50% CGT discount.",
          "But companies offer the strongest asset protection. If someone sues you, the company owns the property, not you.",
          "For most wholesale home buyers, individual or joint ownership is the right starting point.",
        ],
      },
      {
        heading: "The bottom line",
        body: [
          "Start simple. Buy your first property in your own name or jointly with a partner.",
          "As your portfolio grows, revisit the structure question with your accountant.",
          "Adding a trust structure later is possible, but transferring a property already in your name is expensive because you pay stamp duty again. That's why the structure question should be asked before you buy, not after.",
          "Talk to Nick and your accountant about what makes sense for your situation.",
        ],
      },
    ],
  },
  {
    slug: "deposit-finance-guide",
    title: "Deposit & Finance Guide",
    desc: "How much deposit you really need, LMI explained, and how lenders assess investment properties.",
    icon: Home,
    color: "#f59e0b",
    sections: ["Minimum deposits", "LMI explained", "Pre-approval process"],
    readTime: "8 min read",
    content: [
      {
        heading: "The deposit question nobody answers directly",
        body: [
          "How much do you actually need? The honest answer is 'it depends.' But let me give you a better answer than that.",
          "For a house and land package, the minimum deposit ranges from 5% to 20% depending on the lender, your income, and whether you qualify for government schemes.",
          "But here's the thing about deposits: the size of your deposit determines more than just how much you borrow. It determines your interest rate, whether you pay LMI, how much the bank will lend you, and ultimately whether the property cash flows positively or negatively.",
        ],
      },
      {
        heading: "The magic number is 20%",
        body: [
          "If you can put down 20%, you avoid Lenders Mortgage Insurance.",
          "LMI is a one-time premium that protects the lender, not you, if you default. On a $729,000 property with a 10% deposit, LMI costs roughly $12,000 to $18,000.",
          "That's money you're burning for no benefit to you. With a 20% deposit, that cost disappears.",
          "But 20% is a big number. On a $729,000 property, that's $145,800. Most people don't have that sitting in a savings account.",
          "The compromise is a 10% or 15% deposit with LMI baked into the loan. The monthly impact is smaller than you might think.",
        ],
      },
      {
        heading: "Government schemes that reduce your deposit",
        body: [
          "The First Home Guarantee lets eligible first home buyers purchase with as low as 5% deposit without paying LMI.",
          "The government acts as a guarantor for the gap between 5% and 20%. The scheme is limited to 35,000 places per year, so timing matters.",
          "The Help to Buy scheme goes further. The government takes an equity stake of up to 40% for new homes. You only need a 5% deposit, and you don't pay rent on the government's share.",
          "These schemes are designed for new builds specifically. Nick can walk you through eligibility.",
        ],
      },
      {
        heading: "How lenders assess investment property loans",
        body: [
          "Lenders assess investment loans differently from owner-occupier loans.",
          "They use a higher stress test rate (typically the advertised rate plus 3%). They apply a haircut to your expected rental income (usually 80%). And they factor in holding costs like rates and insurance.",
          "The practical effect is you can borrow less for an investment property than for an equivalent owner-occupied property.",
          "But dual occupancy properties can help here. The higher rental income improves your serviceability calculation significantly.",
        ],
      },
      {
        heading: "Pre-approval is your friend",
        body: [
          "Getting pre-approved before you start looking is the single most important step you can take.",
          "It tells you exactly what you can borrow. It gives you confidence when you find the right property. And it means you can move fast when a limited-availability package comes up.",
          "Pre-approval typically lasts 90 days and costs nothing. Nick can connect you with lenders who understand wholesale property transactions.",
        ],
      },
      {
        heading: "Improving your borrowing power",
        body: [
          "Three things improve your borrowing power more than anything else.",
          "First, reduce your credit card limits. Lenders assume you'll max them out, even if you don't. A $10,000 credit card reduces your borrowing capacity by roughly $50,000.",
          "Second, pay down any personal loans or car loans. Every dollar of monthly repayment reduces what you can borrow.",
          "Third, increase your income. This sounds obvious, but even a side hustle earning an extra $500 per month can increase your borrowing capacity by $60,000 to $80,000. Small changes add up.",
        ],
      },
      {
        heading: "The bottom line",
        body: [
          "The deposit is the biggest barrier to entry. But it's more achievable than most people think.",
          "Between government schemes, wholesale pricing that's below market valuation, and the higher yields on dual occupancy properties, the path to property ownership is wider than the banks would have you believe.",
          "Book a discovery call with Nick to get a clear picture of what's realistic for you.",
        ],
      },
    ],
  },
];

export default function ResourcesHub() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const article = ARTICLES.find((a) => a.slug === activeSlug);

  return (
    <ClientPortalShell>
      <div style={{ maxWidth: 900 }}>
        {!article ? (
          <>
            <div style={{ marginBottom: 32 }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0891b2] md:text-xs">
                Learning Centre
              </p>
              <h1 className="mt-2 text-[clamp(1.4rem,3vw,2rem)] font-semibold leading-tight tracking-tight text-[#1A2B3C]">
                Resources
              </h1>
              <p className="mt-1.5 text-sm text-[#5C6670]">
                Guides, tools, and strategies written by people who actually invest in property. No fluff, no filler.
              </p>
            </div>

            <div className="space-y-4">
              {ARTICLES.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.slug}
                    onClick={() => setActiveSlug(r.slug)}
                    className="group block w-full text-left rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="md:flex">
                      <div className="md:w-48 h-32 md:h-auto shrink-0 overflow-hidden bg-[#f5f2eb]">
                        <img
                          src={HERO_IMAGES[r.slug]}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-5 md:p-6 flex-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                            style={{ background: `${r.color}15`, color: r.color }}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <h3 className="text-[15px] font-semibold text-[#1A2B3C]">{r.title}</h3>
                          <span className="text-[9px] text-[#9CA3AF]">{r.readTime}</span>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-[#5C6670]">{r.desc}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {r.sections.map((s) => (
                            <span
                              key={s}
                              className="rounded-full bg-[#f8f6f2] px-3 py-1 text-[10px] font-medium text-[#5C6670]"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0891b2] transition-colors group-hover:text-[#0369a1]">
                          Read Guide <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div>
            <button
              onClick={() => setActiveSlug(null)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0891b2] hover:underline mb-6"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Back to Resources
            </button>

            <div className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white overflow-hidden">
              {/* Hero Image */}
              <div className="aspect-[21/9] overflow-hidden bg-[#f5f2eb]">
                <img
                  src={HERO_IMAGES[article.slug]}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: `${article.color}15`, color: article.color }}
                  >
                    <article.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: article.color }}>
                      Resource Guide
                    </p>
                    <h1 className="text-xl font-bold tracking-tight text-[#1A2B3C]">{article.title}</h1>
                  </div>
                </div>
                <p className="mt-1 text-xs text-[#9CA3AF]">{article.readTime}</p>

                <div className="mt-6 space-y-6">
                  {article.content.map((section, i) => (
                    <div key={i}>
                      <h2 className="text-base font-semibold text-[#1A2B3C]">{section.heading}</h2>
                      <div className="mt-2 space-y-2">
                        {section.body.map((p, j) => (
                          <p key={j} className="text-sm leading-relaxed text-[#5C6670]">{p}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-xl bg-[#f0f9ff] p-5 border border-[#0891b2]/20">
                  <p className="text-xs font-semibold text-[#0891b2]">Want to talk it through?</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#5C6670]">
                    Guides are great, but nothing beats a conversation. Book a free 20-minute discovery call with Nick to
                    see how these strategies apply to your specific situation. No obligation, no pressure.
                  </p>
                  <a
                    href="/contact"
                    className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#0891b2] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0369a1] transition-colors"
                  >
                    Book Your Discovery Call <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClientPortalShell>
  );
}
