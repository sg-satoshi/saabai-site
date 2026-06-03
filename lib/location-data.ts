/**
 * Location data: single source of truth for the 9 Australian city SEO pages.
 *
 * Each LocationConfig drives the entire content of one /[city] landing page,
 * rendered by the shared LocationPage component. Content is written to be
 * genuinely unique per city so each page reads as a standalone resource.
 *
 * Canonical domain: https://www.saabai.ai
 */

const BASE_URL = "https://www.saabai.ai";

export interface LocationFaq {
  q: string;
  a: string;
}

export interface LocationCaseStudy {
  client: string;
  industry: string;
  context: string;
  outcome: string;
}

export interface LocationIndustryLink {
  /** e.g. "Law Firms" */
  industry: string;
  /** e.g. "/for-law-firms" */
  href: string;
  /** City-specific 1-2 sentence description for use as contextual link text */
  context: string;
}

export interface LocationConfig {
  city: string;
  slug: string;
  state: string;
  stateCode: string;
  heroHeadline: string;
  heroSubheading: string;
  industries: string[];
  /** 3-4 paragraphs, ~80-120 words each */
  marketContext: string[];
  challengesIntro: string;
  /** 5 per city */
  challenges: Array<{ title: string; detail: string }>;
  howWeHelpIntro: string;
  /** 6 per city */
  services: Array<{ title: string; detail: string }>;
  caseStudy: LocationCaseStudy;
  /** 3 per city, linking to existing industry pages */
  industryLinks: LocationIndustryLink[];
  /** 7 per city, genuinely city-specific questions */
  faqs: LocationFaq[];
  ctaHeadline: string;
  ctaSubtext: string;
  seo: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    canonical: string;
  };
}

// ---------------------------------------------------------------------------
// BRISBANE
// ---------------------------------------------------------------------------
export const BRISBANE: LocationConfig = {
  city: "Brisbane",
  slug: "brisbane",
  state: "Queensland",
  stateCode: "QLD",
  heroHeadline: "AI Automation Consulting for Brisbane Businesses",
  heroSubheading:
    "We help Brisbane firms turn repetitive admin into automated workflows, so your team spends time on the work that actually grows the business, not on the busywork around it.",
  industries: [
    "Professional Services",
    "Construction & Trades",
    "Manufacturing",
    "Technology",
    "Property & Real Estate",
    "Growth Corridor Businesses",
  ],
  marketContext: [
    "Brisbane is in the middle of a once-in-a-generation build-up. With the 2032 Olympics anchoring more than a decade of infrastructure and venue investment, the city's construction, professional services and property sectors are expanding faster than most local teams can hire. That growth is good news, but it also means more quoting, more compliance paperwork and more client correspondence landing on the same number of people.",
    "The southeast growth corridor (Ipswich, Logan, Moreton Bay and the western suburbs) is where a lot of this expansion is happening. Trades businesses, building suppliers and sub-contractors here are taking on more work than ever, often while still running quotes, invoices and supplier orders through spreadsheets and email. The admin load grows in lockstep with the job book, and it tends to land on the owner after hours.",
    "Brisbane's professional services sector is maturing alongside the boom. Law firms, accounting practices and advisory businesses that once competed mostly on relationships are now competing on responsiveness too. Clients expect same-day replies, clear documentation and a smooth onboarding experience: expectations set by larger Sydney and Melbourne firms but now applied to every practice, regardless of size.",
    "What ties these sectors together is a familiar bottleneck: skilled people doing low-value administrative work because there was never time to build a better system. That is exactly where targeted AI automation pays off. The goal is not to replace anyone. It is to take the repetitive, rules-based parts of the day and hand them to software, so the experienced staff you fought to hire can focus on judgement, relationships and delivery.",
  ],
  challengesIntro:
    "Brisbane businesses tend to share a recognisable set of operational pressures as they scale through the current growth cycle. These are the ones we see most often.",
  challenges: [
    {
      title: "Quoting can't keep pace with the work",
      detail:
        "Trades, suppliers and project businesses are winning more work than ever, but quotes still get built by hand. A backlog of un-priced jobs is lost revenue, and slow quotes lose tenders to faster competitors.",
    },
    {
      title: "Admin lands on senior people",
      detail:
        "When hiring is tight, owners and senior staff end up doing data entry, chasing invoices and copying details between systems: the highest-paid people doing the lowest-value work.",
    },
    {
      title: "Client response times set the standard",
      detail:
        "Brisbane clients increasingly expect the responsiveness of a large firm. Enquiries that sit unanswered overnight or over a weekend quietly leak to competitors who reply first.",
    },
    {
      title: "Disconnected systems create double handling",
      detail:
        "Most growing firms run a patchwork of tools (accounting, CRM, job management, email) that don't talk to each other. Staff bridge the gaps manually, and details get re-keyed three or four times.",
    },
    {
      title: "Growth outpaces process",
      detail:
        "Systems that worked at ten staff break at thirty. Onboarding, compliance and reporting that were once handled informally become bottlenecks exactly when the business can least afford delay.",
    },
  ],
  howWeHelpIntro:
    "We start by mapping where time actually goes, then automate the highest-impact, lowest-risk tasks first. Every engagement is grounded in your existing tools, not a rip-and-replace.",
  services: [
    {
      title: "AI Operational Efficiency Audit",
      detail:
        "A structured review of your workflows that identifies exactly where automation will return the most time and money, ranked by effort. You get a clear, prioritised roadmap before any build work begins.",
    },
    {
      title: "Automated quoting & estimating",
      detail:
        "Custom AI agents that price jobs from your own rules and rate cards, particularly valuable for Brisbane's busy trades, suppliers and project businesses fighting to turn quotes around faster.",
    },
    {
      title: "Customer enquiry & intake automation",
      detail:
        "AI-powered intake that answers, qualifies and routes enquiries around the clock, so weekend and after-hours leads are captured instead of lost to a faster competitor.",
    },
    {
      title: "Document & compliance automation",
      detail:
        "Drafting, populating and checking the repetitive documents your business produces (contracts, reports, certificates and onboarding packs), with a human reviewing before anything goes out.",
    },
    {
      title: "Systems integration",
      detail:
        "Connecting your accounting, CRM and job-management tools so data flows automatically instead of being re-keyed, eliminating the double handling that grows with headcount.",
    },
    {
      title: "Internal knowledge assistants",
      detail:
        "Private AI assistants trained on your own procedures and documentation, so staff find the right answer in seconds rather than interrupting a senior colleague.",
    },
  ],
  caseStudy: {
    client: "PlasticOnline (Holland Plastics)",
    industry: "Manufacturing & Industrial Supply",
    context:
      "Holland Plastics sells cut-to-size plastics where every order needs individual pricing based on material, dimensions and finishing. Quoting was a manual, expert-dependent task that capped how many enquiries the team could handle in a day.",
    outcome:
      "We built Rex, a custom AI pricing agent that quotes cut-to-size orders instantly from the company's own pricing logic. Enquiries are answered in seconds rather than hours, freeing the team to focus on complex orders and customer relationships while routine pricing runs itself.",
  },
  industryLinks: [
    {
      industry: "Law Firms",
      href: "/for-law-firms",
      context:
        "Brisbane law firms are competing on responsiveness as much as expertise. See how we automate client intake, document drafting and matter admin for legal practices.",
    },
    {
      industry: "Accounting Firms",
      href: "/for-accounting-firms",
      context:
        "Brisbane accounting practices face relentless seasonal admin. Explore how we automate onboarding, data collection and document handling for accounting firms.",
    },
    {
      industry: "Real Estate",
      href: "/for-real-estate",
      context:
        "With Brisbane property moving quickly, speed of response wins listings. See how we automate enquiry handling and admin for real estate agencies.",
    },
  ],
  faqs: [
    {
      q: "Do you work with Brisbane businesses in person, or only remotely?",
      a: "We work with Brisbane and southeast Queensland businesses both remotely and on-site where it helps. Most discovery and build work is done remotely and efficiently, but we're happy to meet in person for scoping and key milestones, particularly for businesses across the Ipswich, Logan and Moreton Bay growth corridor.",
    },
    {
      q: "Is AI automation worth it for a small Brisbane trades or supply business?",
      a: "Often yes. Small businesses tend to see the fastest payback because the owner is usually the one absorbing the admin. Automating quoting, enquiry handling and invoicing frees up the most expensive person in the business. We always start with an audit so you know the return before committing to a build.",
    },
    {
      q: "How does the 2032 Olympics build-up affect the case for automating now?",
      a: "The build-up means more work flowing to Brisbane's construction, property and professional services firms over the next decade, but hiring can't always keep pace. Automating admin now lets you absorb more of that growth without proportionally growing headcount, which is a real advantage in a tight labour market.",
    },
    {
      q: "We already use accounting and job-management software. Can you work with what we have?",
      a: "Yes. We deliberately build around your existing tools rather than replacing them. Most of our work involves connecting systems you already pay for so data flows automatically, plus adding AI agents on top for tasks those tools don't handle.",
    },
    {
      q: "Will automation replace our staff?",
      a: "No. The goal is to remove repetitive work, not people. In a tight Brisbane labour market, the bigger problem is usually that skilled staff are stuck doing low-value admin. Automation hands that work to software so your team can focus on judgement, delivery and client relationships.",
    },
    {
      q: "How long before we see results?",
      a: "The audit delivers a prioritised roadmap within a couple of weeks. First automations (typically quoting or enquiry handling) are often live within a few weeks after that. We sequence the highest-impact, lowest-risk wins first so you see returns early.",
    },
    {
      q: "What does an engagement with Saabai.ai cost?",
      a: "It depends on scope, which is why we start with a fixed-scope AI audit. That gives you a clear picture of opportunities and expected return before any build commitment, so you can make the decision on real numbers rather than a guess.",
    },
  ],
  ctaHeadline: "Ready to free your Brisbane team from busywork?",
  ctaSubtext:
    "Book an AI Operational Efficiency Audit and get a clear, prioritised roadmap for where automation will save your business the most time and money.",
  seo: {
    title: "AI Automation Consulting Brisbane | Saabai.ai",
    description:
      "AI automation for Brisbane: quoting, intake and admin for professional services, trades and manufacturers. Book a free AI efficiency audit.",
    ogTitle: "AI Automation Consulting for Brisbane Businesses | Saabai.ai",
    ogDescription:
      "Turn repetitive admin into automated workflows. Saabai.ai helps Brisbane firms automate quoting, client intake and document handling. Book an AI efficiency audit.",
    canonical: `${BASE_URL}/brisbane`,
  },
};

// ---------------------------------------------------------------------------
// GOLD COAST
// ---------------------------------------------------------------------------
export const GOLD_COAST: LocationConfig = {
  city: "Gold Coast",
  slug: "gold-coast",
  state: "Queensland",
  stateCode: "QLD",
  heroHeadline: "AI Automation Consulting for Gold Coast Businesses",
  heroSubheading:
    "From trades and property to tourism and retail, we help lean Gold Coast teams automate the admin that eats their evenings, so a small crew can run like a much bigger one.",
  industries: [
    "Trades & Construction",
    "Property Development",
    "Tourism & Hospitality",
    "Professional Services",
    "Retail",
    "Health & Wellness",
  ],
  marketContext: [
    "The Gold Coast runs on small, agile businesses. Far more than in the capital cities, the local economy is built around owner-operators and lean teams: the builder who also does the quoting, the practice owner who also handles reception, the cafe group running on a skeleton back office. That structure keeps the city entrepreneurial, but it also means admin has nowhere to go but onto people who are already stretched.",
    "Trades and construction are a huge part of the local story, riding strong population growth and a steady pipeline of residential and commercial development. These businesses live and die on how fast they can quote and how reliably they invoice. Yet most still build quotes manually and chase payments by hand, capping how much work a busy crew can realistically take on without the owner working nights.",
    "Tourism and hospitality bring a different challenge: seasonality. Enquiries, bookings and staffing swing hard between peak and off-peak, and the businesses that cope best are the ones whose systems handle the surge automatically. When a venue or operator is fielding triple the enquiries in school holidays, manual handling is where bookings get dropped and reviews suffer.",
    "Property development and professional services round out the picture, both defined by coordination: keeping trades, clients, contracts and approvals moving in sync. The common thread across every sector here is the same: small teams doing the work of larger ones, held back by manual admin. Well-targeted AI automation lets a lean Gold Coast business punch well above its headcount.",
  ],
  challengesIntro:
    "Gold Coast businesses share a distinct profile: small, fast-moving and admin-heavy. These are the pressures we hear about most.",
  challenges: [
    {
      title: "The owner is the bottleneck",
      detail:
        "In lean Gold Coast businesses, the owner often handles quoting, enquiries and invoicing personally. Every hour on admin is an hour not spent winning or delivering work, and growth stalls at the owner's capacity.",
    },
    {
      title: "Quoting backlogs cost jobs",
      detail:
        "Trades and construction businesses lose work simply because quotes take too long to turn around. In a competitive local market, the fastest quote often wins the job.",
    },
    {
      title: "Seasonal enquiry surges overwhelm small teams",
      detail:
        "Tourism, hospitality and retail face sharp peaks. When enquiries triple in holiday periods, a manual process can't keep up and bookings or sales slip through the cracks.",
    },
    {
      title: "After-hours leads go cold",
      detail:
        "A lot of Gold Coast enquiries arrive evenings and weekends. Without automated intake, those leads sit until the next business day, by which point many have already booked elsewhere.",
    },
    {
      title: "Coordination eats time",
      detail:
        "Property developers and project businesses spend hours chasing trades, clients and approvals across email and phone. This coordination work is repetitive but rarely systematised.",
    },
  ],
  howWeHelpIntro:
    "We focus on getting the most leverage from small teams. That means automating the tasks that consume the owner's day first, using the tools you already run.",
  services: [
    {
      title: "AI Operational Efficiency Audit",
      detail:
        "A focused review that pinpoints where automation will buy back the most time for a lean team, ranked by effort and impact. You get a clear roadmap before any build begins.",
    },
    {
      title: "Automated quoting & estimating",
      detail:
        "AI agents that build quotes from your own pricing rules, so trades and construction businesses turn jobs around in minutes and stop losing work to slower-quoting competitors.",
    },
    {
      title: "Booking & enquiry automation",
      detail:
        "Round-the-clock AI intake that handles enquiries and bookings through seasonal surges, so peak-period demand is captured instead of dropped. Built for tourism, hospitality and wellness operators.",
    },
    {
      title: "Invoicing & payment follow-up",
      detail:
        "Automated invoicing and gentle payment chasing that keeps cash flow healthy without the owner personally hounding clients every week.",
    },
    {
      title: "Systems integration",
      detail:
        "Connecting your booking, accounting and CRM tools so a small team isn't re-keying the same details across three apps all day.",
    },
    {
      title: "Internal knowledge assistants",
      detail:
        "Private AI assistants that give staff instant answers from your own procedures, so the owner isn't the only person who knows how everything works.",
    },
  ],
  caseStudy: {
    client: "PlasticOnline (Holland Plastics)",
    industry: "Manufacturing & Industrial Supply",
    context:
      "Gold Coast-based Holland Plastics sells cut-to-size plastics, where every order is individually priced on material, size and finishing. Manual quoting limited how many enquiries the small team could process and tied up expert staff in routine pricing.",
    outcome:
      "We built Rex, an AI pricing agent that quotes cut-to-size orders instantly from the company's own pricing logic. The lean team now handles far more enquiries without adding headcount, with routine quoting running itself and people freed for complex orders and relationships.",
  },
  industryLinks: [
    {
      industry: "Law Firms",
      href: "/for-law-firms",
      context:
        "Boutique Gold Coast law firms run lean and feel admin acutely. See how we automate intake, drafting and matter admin so a small practice runs like a larger one.",
    },
    {
      industry: "Accounting Firms",
      href: "/for-accounting-firms",
      context:
        "Gold Coast accounting practices juggle seasonal peaks with small teams. Explore how we automate client onboarding and document collection for accounting firms.",
    },
    {
      industry: "Real Estate",
      href: "/for-real-estate",
      context:
        "In the fast-moving Gold Coast property market, the quickest response wins. See how we automate enquiry handling and admin for real estate agencies.",
    },
  ],
  faqs: [
    {
      q: "I run a small Gold Coast business. Is AI automation overkill for me?",
      a: "Quite the opposite. Smaller businesses usually get the biggest benefit because the owner is the one absorbing the admin. Automating quoting, bookings and invoicing frees up the most valuable person in the business. We scope to fit small budgets and start with the highest-impact task first.",
    },
    {
      q: "How do you handle the seasonal swings tourism and hospitality businesses face?",
      a: "Automation shines exactly when demand spikes. AI intake and booking handling scale instantly to absorb holiday-period surges that would otherwise overwhelm a small team, then sit quietly during off-peak. You capture peak demand without hiring temporary staff just to answer enquiries.",
    },
    {
      q: "Can you help us capture leads that come in after hours and on weekends?",
      a: "Yes, this is one of the most common Gold Coast wins. A lot of enquiries arrive evenings and weekends when nobody's at the desk. Automated AI intake answers, qualifies and captures those leads instantly, so they don't go cold or book with a competitor before Monday.",
    },
    {
      q: "Do you work on-site on the Gold Coast or only remotely?",
      a: "Both. Most work is done remotely and efficiently, but we're happy to meet in person on the Coast for scoping and key milestones. Being close to Brisbane and the broader southeast Queensland region, in-person sessions are easy to arrange when they add value.",
    },
    {
      q: "We're a trades business losing jobs because quotes take too long. Can you fix that?",
      a: "That's a core use case. We build AI quoting agents that price jobs from your own rules and rate cards in minutes instead of hours, so you respond while the lead is still warm. Faster quotes routinely translate directly into a higher win rate.",
    },
    {
      q: "How quickly will we see a return?",
      a: "The audit gives you a prioritised roadmap within a couple of weeks, and first automations are typically live a few weeks after that. We deliberately sequence quick, high-impact wins first so the value shows up early rather than at the end of a long project.",
    },
    {
      q: "What does it cost to get started?",
      a: "We start with a fixed-scope AI audit so you see the opportunities and expected return before committing to any build. That keeps the entry point affordable for small businesses and means you decide based on real numbers, not a guess.",
    },
  ],
  ctaHeadline: "Make your lean Gold Coast team run like a bigger one",
  ctaSubtext:
    "Book an AI Operational Efficiency Audit and find out exactly where automation will buy back the most time in your business.",
  seo: {
    title: "AI Automation Consulting Gold Coast | Saabai.ai",
    description:
      "AI automation for Gold Coast businesses. Automate quoting, bookings and admin for trades, tourism and professional services. Book a free AI audit.",
    ogTitle: "AI Automation Consulting for Gold Coast Businesses | Saabai.ai",
    ogDescription:
      "Help your lean Gold Coast team run like a bigger one. Saabai.ai automates quoting, bookings and admin for trades, tourism and professional services. Book an AI audit.",
    canonical: `${BASE_URL}/gold-coast`,
  },
};

// ---------------------------------------------------------------------------
// SYDNEY
// ---------------------------------------------------------------------------
export const SYDNEY: LocationConfig = {
  city: "Sydney",
  slug: "sydney",
  state: "New South Wales",
  stateCode: "NSW",
  heroHeadline: "AI Automation Consulting for Sydney Businesses",
  heroSubheading:
    "In Australia's highest-cost labour market, every hour of manual admin is expensive. We help Sydney firms automate the repetitive work so your people deliver more without the headcount.",
  industries: [
    "Law Firms",
    "Accounting & Advisory",
    "Financial Services & Fintech",
    "Property & Construction",
    "Technology",
    "Insurance & Risk",
  ],
  marketContext: [
    "Sydney is Australia's most expensive place to employ people, and that single fact changes the economics of everything. When salaries and office space cost more than anywhere else in the country, every hour a skilled professional spends on manual admin carries a higher price tag. The firms that thrive in Sydney are increasingly the ones that get more output from the same expensive headcount, and automation is the most direct lever they have.",
    "The professional services market here is also the most competitive in the country. Law firms, accounting practices and advisory businesses cluster densely, which means clients have choices and they exercise them. Responsiveness, polish and turnaround speed have become competitive battlegrounds in their own right. A firm that takes a day to respond to an enquiry is now visibly slower than the one down the road that responds in minutes.",
    "Compliance and documentation load is heavier in Sydney's regulated sectors than almost anywhere. Financial services, fintech, insurance and legal work all generate volumes of repeatable, rules-bound paperwork: exactly the kind of work that is expensive to do by hand and well suited to careful automation with a human in the loop for sign-off.",
    "Then there is the talent crunch. Sydney firms compete hard for skilled staff, and once hired, those people are too valuable to spend on data entry and copy-paste work. Targeted AI automation lets a Sydney business deploy its expensive talent where it actually creates value, while routine work runs in the background. In a market defined by cost and competition, that is a structural advantage rather than a nice-to-have.",
  ],
  challengesIntro:
    "Sydney's high-cost, high-competition environment produces a particular set of pressures. These are the ones we're brought in to solve most often.",
  challenges: [
    {
      title: "Expensive staff doing cheap work",
      detail:
        "In the country's highest-cost labour market, having well-paid professionals re-keying data and chasing paperwork is a direct hit to margin. Every hour matters more here than almost anywhere.",
    },
    {
      title: "Response speed is now a competitive weapon",
      detail:
        "In a dense professional services market, clients notice who replies first. Firms that respond in minutes win work from those that take a day, regardless of who is more qualified.",
    },
    {
      title: "Heavy compliance and documentation load",
      detail:
        "Financial services, legal and insurance work generates large volumes of repeatable, rules-bound documents. Producing and checking these by hand is slow, costly and error-prone.",
    },
    {
      title: "Talent is too scarce to waste",
      detail:
        "Skilled staff are hard to win and harder to keep. Burning their time on low-value admin both wastes money and frustrates the people you most want to retain.",
    },
    {
      title: "Scaling without ballooning overhead",
      detail:
        "Growing a Sydney firm by simply adding people is punishingly expensive. The challenge is increasing capacity without a matching increase in headcount and office cost.",
    },
  ],
  howWeHelpIntro:
    "Our approach is built around return on the most expensive resource you have: your people's time. We automate the highest-cost manual work first, integrating with the systems you already run.",
  services: [
    {
      title: "AI Operational Efficiency Audit",
      detail:
        "A rigorous review that quantifies where automation returns the most against Sydney-level labour costs, ranked by effort. You get a prioritised, ROI-led roadmap before any build commitment.",
    },
    {
      title: "Client intake & response automation",
      detail:
        "AI-powered intake that responds, qualifies and routes enquiries instantly, so your firm wins the work that goes to whoever replies first in a crowded market.",
    },
    {
      title: "Document & compliance automation",
      detail:
        "Drafting, populating and checking the high-volume, rules-bound documents your regulated business produces, with human review before anything is finalised.",
    },
    {
      title: "Workflow & systems integration",
      detail:
        "Connecting your CRM, practice management and finance systems so expensive staff stop re-keying data between tools that should already talk to each other.",
    },
    {
      title: "Internal knowledge assistants",
      detail:
        "Secure AI assistants trained on your firm's own precedents and procedures, so staff get accurate answers instantly instead of pulling senior colleagues off billable work.",
    },
    {
      title: "Reporting & analysis automation",
      detail:
        "Automating the recurring reports and data pulls that quietly consume hours each month, delivering them on schedule without manual assembly.",
    },
  ],
  caseStudy: {
    client: "LocalSearch",
    industry: "Digital Marketing Platform",
    context:
      "LocalSearch is a Sydney-headquartered digital marketing platform serving businesses nationally. Like many scaling tech-enabled firms, it needed to grow output and client coverage without a proportional increase in expensive operational headcount.",
    outcome:
      "We worked with LocalSearch on AI readiness and automation across its operations, identifying where AI could lift capacity and consistency. The engagement showed how a scaling platform can deploy automation to handle volume that would otherwise demand costly new hires in a high-wage market.",
  },
  industryLinks: [
    {
      industry: "Law Firms",
      href: "/for-law-firms",
      context:
        "Sydney law firms carry the country's highest staff costs, so every saved admin hour matters more. See how we automate intake, drafting and matter management for legal practices.",
    },
    {
      industry: "Accounting Firms",
      href: "/for-accounting-firms",
      context:
        "Sydney accounting and advisory firms compete on responsiveness in a crowded market. Explore how we automate onboarding, data collection and document handling.",
    },
    {
      industry: "Real Estate",
      href: "/for-real-estate",
      context:
        "In Sydney's fast, high-value property market, response speed wins listings and buyers. See how we automate enquiry handling and admin for real estate agencies.",
    },
  ],
  faqs: [
    {
      q: "Why does AI automation make particular sense for a Sydney business?",
      a: "Because Sydney has the highest labour costs in the country, the value of every hour you free from manual admin is greater here than almost anywhere. Automation that returns time to expensive professionals delivers a stronger financial case in Sydney than in lower-cost markets.",
    },
    {
      q: "We're in a heavily regulated sector. Is automation safe for compliance-sensitive work?",
      a: "Yes, when designed correctly. We build automation with a human in the loop for anything that requires sign-off, so AI handles the repetitive drafting and checking while a qualified person approves the output. This is standard practice for our legal, financial services and insurance clients.",
    },
    {
      q: "Can automation actually help us win more work, not just save time?",
      a: "Often, yes. In Sydney's competitive professional services market, responding to enquiries first is a genuine advantage. Automated intake that replies and qualifies instantly converts more of your existing enquiries, so the impact shows up in revenue, not just efficiency.",
    },
    {
      q: "How does this help us scale without adding expensive headcount?",
      a: "By increasing what your current team can handle. Automating routine work lets each person cover more volume, so you grow capacity without the proportional rise in salaries and office cost that simply hiring more people would bring. That is a meaningful saving at Sydney rates.",
    },
    {
      q: "Do we need to replace our existing systems?",
      a: "No. We build around the CRM, practice-management and finance tools you already use, connecting them so data flows automatically and layering AI on top for tasks they can't handle. Rip-and-replace is rarely necessary or advisable.",
    },
    {
      q: "Do you meet with Sydney clients in person?",
      a: "We can. Most work is done remotely and efficiently, but we're happy to meet in person in Sydney for scoping and key project milestones where that adds value to the engagement.",
    },
    {
      q: "How do we know it'll pay off before we commit to a big build?",
      a: "We start with a fixed-scope AI audit that quantifies the opportunities and expected return against your actual labour costs. You get a clear, ROI-led picture before any build commitment, so the decision rests on numbers rather than a guess.",
    },
  ],
  ctaHeadline: "Get more from Sydney's most expensive resource: your team's time",
  ctaSubtext:
    "Book an AI Operational Efficiency Audit and get a prioritised, ROI-led roadmap for where automation pays off fastest at Sydney labour rates.",
  seo: {
    title: "AI Automation Consulting Sydney | Saabai.ai",
    description:
      "AI automation for Sydney firms. Automate intake, documents and admin for law, accounting, financial services and property. Free AI efficiency audit.",
    ogTitle: "AI Automation Consulting for Sydney Businesses | Saabai.ai",
    ogDescription:
      "In Australia's highest-cost labour market, automation pays off fastest. Saabai.ai helps Sydney firms automate intake, documents and admin. Book an AI efficiency audit.",
    canonical: `${BASE_URL}/sydney`,
  },
};

// ---------------------------------------------------------------------------
// MELBOURNE
// ---------------------------------------------------------------------------
export const MELBOURNE: LocationConfig = {
  city: "Melbourne",
  slug: "melbourne",
  state: "Victoria",
  stateCode: "VIC",
  heroHeadline: "AI Automation Consulting for Melbourne Businesses",
  heroSubheading:
    "Home to Australia's deepest concentration of professional services, healthcare and manufacturing, Melbourne runs on admin-heavy work. We help local firms automate it and reclaim their capacity.",
  industries: [
    "Professional Services",
    "Healthcare & Allied Health",
    "Education",
    "Technology",
    "Manufacturing",
    "Legal & Compliance",
  ],
  marketContext: [
    "Melbourne carries one of the largest concentrations of professional services firms in the country. Law, accounting, advisory, consulting and corporate services are densely represented across the CBD and the inner suburbs, and that depth makes the market both rich in opportunity and intensely competitive. Firms here are under constant pressure to deliver more, faster, without letting quality or compliance slip. Much of what slows them down is repetitive administrative work rather than the actual professional judgement clients pay for.",
    "Healthcare and allied health are a defining part of Melbourne's economy, from major hospital networks to the thousands of clinics and allied health practices across the metro area. These businesses run on paperwork: bookings, referrals, intake forms, billing and follow-ups. Administrative load is one of the biggest drains on clinical time, and reducing it directly improves both practice economics and the patient experience.",
    "Manufacturing remains a significant Melbourne sector, increasingly focused on advanced and specialised production. As these businesses modernise, the gap between sophisticated production floors and dated back-office processes becomes obvious. Quoting, order processing and production documentation often still run on manual systems that haven't kept pace with the rest of the operation.",
    "Across professional services, healthcare, education and manufacturing, the common pattern in Melbourne is skilled people spending too much of their day on repeatable administrative tasks. Targeted AI automation addresses this directly by taking the rules-based, repetitive work off the plates of clinicians, professionals and operators so they can focus on the work that genuinely needs them.",
  ],
  challengesIntro:
    "Melbourne's mix of professional services, healthcare and manufacturing produces a recognisable set of operational drags. These are the ones we most often help resolve.",
  challenges: [
    {
      title: "Admin crowds out professional work",
      detail:
        "In a deep professional services market, fee-earners and clinicians spend too much of the day on intake, data entry and document handling instead of the high-value work clients and patients actually need.",
    },
    {
      title: "Healthcare paperwork drains clinical time",
      detail:
        "Bookings, referrals, intake forms, billing and follow-ups consume hours that clinics would rather spend on care, hurting both practice economics and patient experience.",
    },
    {
      title: "Competing in a crowded market",
      detail:
        "Melbourne's density of firms means clients have choices. Slow turnaround and clunky onboarding cost work to competitors who simply make the experience smoother.",
    },
    {
      title: "Back office lagging modern operations",
      detail:
        "Manufacturers modernising their production floors are often still quoting and processing orders manually, leaving an obvious efficiency gap between the factory and the office.",
    },
    {
      title: "Compliance documentation overhead",
      detail:
        "Legal, education and regulated sectors generate repeatable, rules-bound documentation that is slow and costly to produce and check entirely by hand.",
    },
  ],
  howWeHelpIntro:
    "We map where time disappears and automate the highest-impact tasks first, always working with the systems your firm already relies on. Practical wins before grand plans.",
  services: [
    {
      title: "AI Operational Efficiency Audit",
      detail:
        "A structured review that identifies where automation returns the most time across your firm, ranked by effort and impact, delivered as a clear roadmap before any build begins.",
    },
    {
      title: "Patient & client intake automation",
      detail:
        "AI-powered intake, booking and follow-up that reduces front-desk and clinical admin load, particularly valuable for Melbourne's large healthcare and allied health sector.",
    },
    {
      title: "Document & compliance automation",
      detail:
        "Drafting, populating and checking the repetitive documents your business produces (legal, educational and regulatory), with a qualified human reviewing before sign-off.",
    },
    {
      title: "Quoting & order processing automation",
      detail:
        "AI agents that bring manufacturers' back-office quoting and order handling up to the speed of their modernised production floors.",
    },
    {
      title: "Systems integration",
      detail:
        "Connecting practice-management, CRM, finance and clinical systems so data flows automatically rather than being re-entered across disconnected tools.",
    },
    {
      title: "Internal knowledge assistants",
      detail:
        "Secure AI assistants trained on your own procedures and documentation, giving staff instant, accurate answers without interrupting senior colleagues.",
    },
  ],
  caseStudy: {
    client: "Ink FX Printing",
    industry: "Commercial Printing",
    context:
      "Ink FX is a Melbourne commercial printing business where every job needs custom pricing based on stock, quantity, finishing and turnaround. Manual quoting was a time-consuming, expertise-dependent task that limited how quickly the team could respond to enquiries.",
    outcome:
      "We helped Ink FX automate its quoting workflow so custom print jobs are priced quickly and consistently from the business's own rules. The team now turns enquiries around faster and spends less time on manual estimating, freeing capacity for production and customer service.",
  },
  industryLinks: [
    {
      industry: "Law Firms",
      href: "/for-law-firms",
      context:
        "Melbourne's dense legal market rewards firms that respond fast and onboard smoothly. See how we automate intake, drafting and matter management for law firms.",
    },
    {
      industry: "Accounting Firms",
      href: "/for-accounting-firms",
      context:
        "Melbourne accounting and advisory firms face heavy seasonal admin. Explore how we automate client onboarding, data collection and document handling.",
    },
    {
      industry: "Real Estate",
      href: "/for-real-estate",
      context:
        "In Melbourne's competitive property market, responsiveness wins listings. See how we automate enquiry handling and admin for real estate agencies.",
    },
  ],
  faqs: [
    {
      q: "Can AI automation realistically help a healthcare or allied health practice?",
      a: "Yes, it's one of the highest-value applications we see in Melbourne. Automating bookings, intake forms, referrals and follow-ups removes a large share of front-desk and clinical admin, which improves both practice economics and patient experience. We always design with appropriate care around sensitive information.",
    },
    {
      q: "How do you handle privacy and sensitive data in healthcare or legal work?",
      a: "Carefully and deliberately. We design automation with privacy in mind, keep humans in the loop for anything requiring professional sign-off, and scope data handling to your obligations. The audit stage covers exactly how sensitive information will and won't be used before any build starts.",
    },
    {
      q: "We're a manufacturer with a modern factory but a dated back office. Can you close that gap?",
      a: "That's a common Melbourne scenario. We automate the back-office side (quoting, order processing and production documentation) so it runs at the same speed as your modernised production floor, removing the bottleneck that sits between a job won and a job started.",
    },
    {
      q: "There are a lot of firms like ours in Melbourne. How does automation help us stand out?",
      a: "In a crowded market, experience is the differentiator. Automated intake, faster turnaround and smoother onboarding make your firm noticeably easier to deal with than competitors still running everything manually, which directly affects who wins and keeps clients.",
    },
    {
      q: "Will we need to replace the systems we already use?",
      a: "No. We build around your existing practice-management, clinical, CRM and finance tools, connecting them and layering AI on top. Replacing core systems is rarely necessary and we avoid it wherever we can.",
    },
    {
      q: "Do you work with Melbourne clients in person?",
      a: "We can. Most work is done remotely and efficiently, but we're glad to meet in person in Melbourne for scoping sessions and key milestones when that helps the engagement.",
    },
    {
      q: "How do we know it will be worth it before committing?",
      a: "We start with a fixed-scope AI audit that identifies the opportunities and expected return for your specific business. You get a clear, prioritised roadmap before any build commitment, so the decision is based on real findings rather than a leap of faith.",
    },
  ],
  ctaHeadline: "Reclaim your Melbourne team's capacity from admin",
  ctaSubtext:
    "Book an AI Operational Efficiency Audit and get a clear, prioritised roadmap for where automation will free the most time across your firm.",
  seo: {
    title: "AI Automation Consulting Melbourne | Saabai.ai",
    description:
      "AI automation for Melbourne: professional services, healthcare, manufacturing and legal firms. Automate admin and intake. Book a free AI audit.",
    ogTitle: "AI Automation Consulting for Melbourne Businesses | Saabai.ai",
    ogDescription:
      "Reclaim your team's capacity from admin. Saabai.ai helps Melbourne professional services, healthcare and manufacturing firms automate routine work. Book an AI audit.",
    canonical: `${BASE_URL}/melbourne`,
  },
};

// ---------------------------------------------------------------------------
// PERTH
// ---------------------------------------------------------------------------
export const PERTH: LocationConfig = {
  city: "Perth",
  slug: "perth",
  state: "Western Australia",
  stateCode: "WA",
  heroHeadline: "AI Automation Consulting for Perth Businesses",
  heroSubheading:
    "From mining and METS to engineering and industrial services, Perth runs on documentation and coordination. We help WA businesses automate it and scale without drowning in paperwork.",
  industries: [
    "Mining & Resources",
    "Engineering & METS",
    "Industrial Services",
    "Construction",
    "Professional Services",
    "Logistics & Supply Chain",
  ],
  marketContext: [
    "Perth's economy is anchored by mining and resources, and that shapes the business landscape in a way no other Australian capital shares. Around the resource sector sits a vast ecosystem of mining equipment, technology and services (METS) businesses, engineering firms, industrial suppliers and logistics operators. These businesses are technically sophisticated, but their back offices often carry enormous documentation and coordination loads that haven't been modernised at the same pace as their field operations.",
    "A defining feature of WA's resource economy is the FIFO workforce. Coordinating fly-in fly-out rosters, mobilisation, certifications, inductions and compliance for a workforce spread across remote sites is an administrative undertaking in itself. The businesses that manage it best are those whose systems handle the repetitive coordination automatically rather than relying on people manually tracking spreadsheets and emails.",
    "Compliance and documentation are unusually heavy in the resource sector. Safety records, certifications, tender responses, quality documentation and reporting requirements generate large volumes of repeatable, rules-bound paperwork. For METS and engineering firms in particular, the ability to produce accurate documentation quickly is often what determines whether they can scale to take on larger contracts.",
    "Remote site operations add another layer. Supplying, servicing and coordinating work across sites hundreds of kilometres from Perth means communication and logistics that are easy to get wrong and costly when they go wrong. Across all of it, the opportunity is the same: targeted AI automation that takes the repetitive documentation and coordination work off skilled people, letting WA businesses scale into the resource sector's demands without simply adding back-office headcount.",
  ],
  challengesIntro:
    "Perth businesses operating in and around the resource sector share a distinct set of operational pressures. These are the ones we're most often asked to address.",
  challenges: [
    {
      title: "FIFO workforce coordination overhead",
      detail:
        "Managing rosters, mobilisation, inductions and certifications for a remote, rotating workforce is a heavy administrative load that consumes hours and is prone to costly errors when done manually.",
    },
    {
      title: "Resource-sector compliance documentation",
      detail:
        "Safety records, certifications, quality documentation and reporting generate large volumes of repeatable, rules-bound paperwork that is slow and expensive to produce and check by hand.",
    },
    {
      title: "Tender and proposal production bottlenecks",
      detail:
        "Winning larger resource-sector contracts means producing detailed, compliant tender responses quickly. Manual document assembly limits how many opportunities a firm can pursue.",
    },
    {
      title: "Scaling METS operations without ballooning admin",
      detail:
        "METS and engineering firms taking on bigger contracts often find back-office work growing faster than revenue, with documentation and coordination becoming the limiting factor.",
    },
    {
      title: "Remote site coordination is error-prone",
      detail:
        "Supplying and servicing sites hundreds of kilometres away relies on communication and logistics that are easy to get wrong and expensive to fix when they fail.",
    },
  ],
  howWeHelpIntro:
    "We focus on the documentation and coordination work that defines WA's resource economy, automating the highest-impact, lowest-risk tasks first and integrating with your existing systems.",
  services: [
    {
      title: "AI Operational Efficiency Audit",
      detail:
        "A structured review that pinpoints where automation returns the most across your documentation and coordination load, ranked by effort, delivered as a clear roadmap before any build.",
    },
    {
      title: "Compliance & documentation automation",
      detail:
        "Drafting, populating and checking the safety, quality and certification documentation the resource sector demands, with a qualified human reviewing before sign-off.",
    },
    {
      title: "Tender & proposal automation",
      detail:
        "AI agents that assemble and tailor compliant tender responses from your own content library, so you pursue more resource-sector contracts without a proportional rise in effort.",
    },
    {
      title: "Workforce & coordination automation",
      detail:
        "Automating the repetitive parts of FIFO coordination (inductions, certifications tracking and mobilisation admin) to cut error-prone manual tracking.",
    },
    {
      title: "Systems integration",
      detail:
        "Connecting your ERP, project, finance and field systems so data flows automatically between office and remote sites instead of being re-keyed and emailed around.",
    },
    {
      title: "Internal knowledge assistants",
      detail:
        "Secure AI assistants trained on your procedures, specs and compliance requirements, giving field and office staff instant, accurate answers.",
    },
  ],
  caseStudy: {
    client: "PlasticOnline (Holland Plastics)",
    industry: "Industrial Supply to Resources Sector",
    context:
      "PlasticOnline is a Queensland-based industrial materials supplier that counts resource sector businesses among its customers. Their product range includes industrial-grade plastics sold to buyers in WA's mining and engineering sectors. Every order is individually priced on material, dimensions and finishing, and manual quoting was the bottleneck limiting response speed to industrial buyers.",
    outcome:
      "We built Rex, an AI pricing agent that quotes cut-to-size orders instantly from the company's own pricing logic. This reference engagement is directly relevant to Perth's resource services businesses: Rex handles exactly the kind of pricing and product enquiries that industrial buyers in WA need answered quickly, without waiting for a salesperson to be available.",
  },
  industryLinks: [
    {
      industry: "Law Firms",
      href: "/for-law-firms",
      context:
        "Perth law firms serving the resource sector handle document-heavy, compliance-driven work. See how we automate intake, drafting and matter management for legal practices.",
    },
    {
      industry: "Accounting Firms",
      href: "/for-accounting-firms",
      context:
        "Perth accounting firms support a resource-linked client base with complex reporting needs. Explore how we automate onboarding, data collection and document handling.",
    },
    {
      industry: "Real Estate",
      href: "/for-real-estate",
      context:
        "Perth's property market moves with the resource cycle, and response speed wins business. See how we automate enquiry handling and admin for real estate agencies.",
    },
  ],
  faqs: [
    {
      q: "Can automation help us manage FIFO workforce coordination?",
      a: "Yes, it's one of the more impactful WA-specific applications. We automate the repetitive parts of FIFO coordination, such as tracking certifications and inductions and handling mobilisation admin, which cuts the manual spreadsheet-and-email tracking that's both time-consuming and prone to costly errors.",
    },
    {
      q: "We produce a lot of compliance and safety documentation. Can AI handle that reliably?",
      a: "It can handle the repetitive drafting, populating and checking, with a qualified person reviewing before anything is finalised. This keeps you in control of compliance-critical output while removing the slow, manual work of assembling and cross-checking documents by hand.",
    },
    {
      q: "Could automating tender responses help us win bigger resource-sector contracts?",
      a: "Often, yes. Larger contracts demand detailed, compliant tenders produced quickly. AI agents that assemble and tailor responses from your own content library let you pursue more opportunities without your team being buried in document assembly each time.",
    },
    {
      q: "How does this help a METS or engineering firm scale?",
      a: "By keeping back-office work from growing faster than revenue. As you take on bigger contracts, documentation and coordination usually become the limiting factor. Automating those lets you scale capacity without simply adding administrative headcount to keep up.",
    },
    {
      q: "Can you help coordinate work across remote sites far from Perth?",
      a: "Yes. We automate and integrate the communication, documentation and data flow between your Perth office and remote sites, reducing the manual handling that makes remote coordination error-prone and expensive when something slips.",
    },
    {
      q: "Do you work with Perth businesses given the time-zone difference?",
      a: "Absolutely. We work with WA businesses remotely and structure communication around your hours. The time difference is a non-issue for how we run audits and build projects, and we're glad to meet in person in Perth for scoping where it helps.",
    },
    {
      q: "How do we know automation will pay off before committing to a build?",
      a: "We start with a fixed-scope AI audit that identifies the highest-value opportunities across your documentation and coordination load and the expected return. You get a clear roadmap before any build commitment, so the decision rests on real findings.",
    },
  ],
  ctaHeadline: "Scale into the resource sector without drowning in paperwork",
  ctaSubtext:
    "Book an AI Operational Efficiency Audit and get a prioritised roadmap for where automation will cut the most documentation and coordination load.",
  seo: {
    title: "AI Automation Consulting Perth | Saabai.ai",
    description:
      "AI automation for Perth and WA. Mining, METS, engineering and industrial firms: automate compliance docs, tenders and coordination. Book an AI audit.",
    ogTitle: "AI Automation Consulting for Perth Businesses | Saabai.ai",
    ogDescription:
      "Automate the documentation and coordination that defines WA's resource economy. Saabai.ai helps Perth mining, METS and engineering firms scale. Book an AI audit.",
    canonical: `${BASE_URL}/perth`,
  },
};

// ---------------------------------------------------------------------------
// ADELAIDE
// ---------------------------------------------------------------------------
export const ADELAIDE: LocationConfig = {
  city: "Adelaide",
  slug: "adelaide",
  state: "South Australia",
  stateCode: "SA",
  heroHeadline: "AI Automation Consulting for Adelaide Businesses",
  heroSubheading:
    "Adelaide's defence and advanced manufacturing economy runs on precision documentation and tender work. We help SA businesses automate it and push through capacity constraints as they grow.",
  industries: [
    "Defence Industry",
    "Advanced Manufacturing",
    "Engineering",
    "Professional Services",
    "Food & Beverage",
    "Health & Life Sciences",
  ],
  marketContext: [
    "Adelaide has reinvented itself around defence and advanced manufacturing. With major naval shipbuilding and defence programs anchored in the state, a deep ecosystem of engineering firms, specialist manufacturers and suppliers has grown up to support them. These businesses operate to exacting standards, and that means documentation, traceability and compliance are not optional extras; they are core to winning and keeping work in the defence supply chain.",
    "The defence sector's documentation and compliance requirements are among the most demanding of any industry. Tender responses, quality records, certifications and reporting must be precise, complete and produced to tight deadlines. For SA firms in the supply chain, the ability to produce this paperwork accurately and quickly is often the difference between being able to bid for a contract and having to let it pass.",
    "Advanced manufacturing in Adelaide is moving steadily toward Industry 4.0, with smarter production and tighter integration on the factory floor. But as on shop floors everywhere, the back office often lags behind. Quoting, order processing and production documentation frequently still run on manual systems that don't match the sophistication of the production itself, leaving an obvious efficiency gap.",
    "Many Adelaide businesses share a particular inflection point: they are growing into larger contracts and opportunities but hitting capacity constraints in their back office before their production or delivery capacity runs out. Targeted AI automation addresses exactly this by taking the documentation, tender and coordination load off skilled people so SA firms can push through that constraint and scale into defence and advanced manufacturing opportunities without simply hiring more administrators.",
  ],
  challengesIntro:
    "Adelaide's defence and advanced manufacturing focus produces a specific set of operational pressures, especially for firms scaling toward larger contracts. These are the ones we see most.",
  challenges: [
    {
      title: "Defence-grade compliance documentation",
      detail:
        "Defence supply-chain work demands precise, complete documentation (quality records, certifications and traceability) that is slow, costly and risky to produce and check entirely by hand.",
    },
    {
      title: "Tender preparation eats capacity",
      detail:
        "Bidding for defence and manufacturing contracts means producing detailed, compliant tenders to tight deadlines. Manual assembly limits how many opportunities a firm can realistically pursue.",
    },
    {
      title: "Back office lagging Industry 4.0 production",
      detail:
        "Manufacturers modernising their production floors often still quote and process orders manually, leaving an efficiency gap between sophisticated production and dated back-office work.",
    },
    {
      title: "Capacity constraints at the growth inflection",
      detail:
        "Many SA firms hit back-office limits before production limits as they scale, with documentation and coordination becoming the bottleneck just as bigger opportunities arrive.",
    },
    {
      title: "Skilled staff stuck on repetitive admin",
      detail:
        "Engineers and specialists spend too much time on document assembly and data handling, work that is repetitive and rules-bound rather than a use of their expertise.",
    },
  ],
  howWeHelpIntro:
    "We target the documentation, tender and coordination work that defines SA's defence and manufacturing economy, automating the highest-impact tasks first and building around your existing systems.",
  services: [
    {
      title: "AI Operational Efficiency Audit",
      detail:
        "A structured review that identifies where automation returns the most across your documentation and tender load, ranked by effort, delivered as a clear roadmap before any build.",
    },
    {
      title: "Compliance & traceability documentation automation",
      detail:
        "Drafting, populating and checking the quality records, certifications and traceability documentation defence supply-chain work demands, with a qualified human reviewing before sign-off.",
    },
    {
      title: "Tender & proposal automation",
      detail:
        "AI agents that assemble and tailor compliant tender responses from your own content library, so you pursue more defence and manufacturing contracts without overloading your team.",
    },
    {
      title: "Quoting & order processing automation",
      detail:
        "AI agents that bring back-office quoting and order handling up to the speed and sophistication of your modernised production floor.",
    },
    {
      title: "Systems integration",
      detail:
        "Connecting your ERP, quality, project and finance systems so data flows automatically rather than being re-keyed between disconnected tools.",
    },
    {
      title: "Internal knowledge assistants",
      detail:
        "Secure AI assistants trained on your procedures, specifications and compliance requirements, giving staff instant, accurate answers without pulling experts off core work.",
    },
  ],
  caseStudy: {
    client: "Tributum Law",
    industry: "Tax Law",
    context:
      "Tributum Law is an Adelaide tax law firm where client intake and matter setup involved significant manual handling: gathering details, qualifying enquiries and preparing the information lawyers needed before they could begin advising.",
    outcome:
      "We built Lex, an AI intake agent that handles initial client interaction, gathers and structures the right information and prepares matters for the lawyers. The firm now captures and qualifies enquiries consistently while freeing its specialists from repetitive intake admin to focus on advisory work.",
  },
  industryLinks: [
    {
      industry: "Law Firms",
      href: "/for-law-firms",
      context:
        "Adelaide law firms supporting defence and manufacturing clients handle document-heavy, compliance-driven work. See how we automate intake, drafting and matter management.",
    },
    {
      industry: "Accounting Firms",
      href: "/for-accounting-firms",
      context:
        "Adelaide accounting firms serve a manufacturing and engineering client base with detailed reporting needs. Explore how we automate onboarding and document handling.",
    },
    {
      industry: "Real Estate",
      href: "/for-real-estate",
      context:
        "In Adelaide's steady property market, responsiveness still wins listings. See how we automate enquiry handling and admin for real estate agencies.",
    },
  ],
  faqs: [
    {
      q: "Is AI automation suitable for defence supply-chain work with strict compliance?",
      a: "Yes, when designed correctly. We automate the repetitive drafting, populating and checking of compliance documentation while keeping a qualified person in the loop to review and approve. You keep control of compliance-critical output while removing the slow, manual document work around it.",
    },
    {
      q: "Can automating tenders help us bid for more defence and manufacturing contracts?",
      a: "Often, yes. These contracts require detailed, compliant tenders to tight deadlines, and manual assembly limits how many you can pursue. AI agents that build and tailor responses from your own content library let you go after more opportunities without burying your team each time.",
    },
    {
      q: "We're a manufacturer modernising production but our back office is dated. Can you help?",
      a: "That's a very common Adelaide situation. We automate the back-office side (quoting, order processing and production documentation) so it runs at the speed and sophistication of your modernised floor, closing the gap between a job won and a job underway.",
    },
    {
      q: "We're hitting back-office limits as we grow. Is that something automation solves?",
      a: "Directly. Many SA firms hit documentation and coordination limits before production limits as they scale. Automating that work lets you push through the constraint and take on larger contracts without simply hiring more administrators to keep pace.",
    },
    {
      q: "Do we need to replace our existing ERP and quality systems?",
      a: "No. We build around the ERP, quality, project and finance systems you already use, connecting them and layering AI on top for tasks they can't handle. Replacing core systems is rarely necessary and we avoid it where we can.",
    },
    {
      q: "Do you work with Adelaide businesses in person?",
      a: "We can. Most work is done remotely and efficiently, but we're happy to meet in person in Adelaide for scoping sessions and key milestones where that adds value to the engagement.",
    },
    {
      q: "How do we know it'll be worth it before committing to a build?",
      a: "We start with a fixed-scope AI audit that identifies the highest-value opportunities across your documentation and tender load and the expected return. You get a clear, prioritised roadmap before any build commitment, so the decision rests on real findings.",
    },
  ],
  ctaHeadline: "Push through your back-office bottleneck and scale",
  ctaSubtext:
    "Book an AI Operational Efficiency Audit and get a prioritised roadmap for where automation will free the most capacity for tender, compliance and growth work.",
  seo: {
    title: "AI Automation Consulting Adelaide | Saabai.ai",
    description:
      "AI automation for Adelaide and SA. Defence, advanced manufacturing and engineering: automate compliance docs, tenders and admin. Book an AI audit.",
    ogTitle: "AI Automation Consulting for Adelaide Businesses | Saabai.ai",
    ogDescription:
      "Automate the documentation and tender work that defines SA's defence and manufacturing economy. Saabai.ai helps Adelaide firms scale. Book an AI audit.",
    canonical: `${BASE_URL}/adelaide`,
  },
};

// ---------------------------------------------------------------------------
// CANBERRA
// ---------------------------------------------------------------------------
export const CANBERRA: LocationConfig = {
  city: "Canberra",
  slug: "canberra",
  state: "Australian Capital Territory",
  stateCode: "ACT",
  heroHeadline: "AI Automation Consulting for Canberra Businesses",
  heroSubheading:
    "Canberra's government-adjacent economy runs on tenders, panel compliance and knowledge work. We help ACT firms automate the documentation and admin behind it without compromising rigour.",
  industries: [
    "Government Consulting",
    "ICT Services",
    "Professional Services",
    "Defence Contractors",
    "Legal",
    "Research & Education",
  ],
  marketContext: [
    "Canberra's economy is unlike any other in Australia because so much of it orbits the Commonwealth Government. Consulting firms, ICT service providers, defence contractors, legal practices and professional services businesses here largely sell to government, and that shapes how they operate. Government as a client means rigour, documentation and compliance at a level few other markets demand, and the firms that succeed are those that can meet that bar efficiently rather than by throwing people at it.",
    "Government tender and proposal work is a defining feature of doing business in Canberra. Responding to RFTs and approaches to market means producing detailed, compliant, precisely structured documents to firm deadlines. For many ACT firms, the volume and intensity of tender work is the single biggest constraint on how much government business they can pursue, because each response demands significant skilled effort to assemble.",
    "Panel arrangements add another layer. Being on a government panel comes with ongoing compliance, reporting and administrative obligations that recur predictably and consume time. Managing panel paperwork, capability statements and recurring submissions is exactly the kind of repeatable, rules-bound work that suits careful automation.",
    "Knowledge management is the quieter challenge. Canberra firms accumulate enormous institutional knowledge (past proposals, capability content, project records and APS-grade procedural documentation) that is hard to find and reuse when it's scattered across drives and inboxes. Targeted AI automation helps on every front: assembling tenders, managing panel compliance and making institutional knowledge instantly retrievable, all while keeping humans in control of anything that must meet APS-grade standards.",
  ],
  challengesIntro:
    "Canberra's government-adjacent market produces operational pressures you won't find in the same form elsewhere. These are the ones we're most often asked to address.",
  challenges: [
    {
      title: "Government tender production is relentless",
      detail:
        "Responding to RFTs and approaches to market means assembling detailed, compliant documents to firm deadlines. The skilled effort each response demands caps how much government work a firm can pursue.",
    },
    {
      title: "Panel arrangement compliance overhead",
      detail:
        "Sitting on government panels brings recurring reporting, capability statements and administrative obligations. This predictable, repeatable work quietly consumes time month after month.",
    },
    {
      title: "Institutional knowledge is hard to reuse",
      detail:
        "Past proposals, capability content and project records are scattered across drives and inboxes, so staff rebuild from scratch instead of reusing what the firm already knows.",
    },
    {
      title: "APS-grade rigour at sustainable effort",
      detail:
        "Government clients demand a level of documentation and compliance few other markets do. Meeting that bar by adding people is expensive and hard given Canberra's tight professional labour market.",
    },
    {
      title: "Skilled consultants stuck assembling documents",
      detail:
        "Experienced consultants and bid staff spend too much time on document assembly and formatting rather than the strategy and analysis that actually wins work.",
    },
  ],
  howWeHelpIntro:
    "We target the tender, compliance and knowledge work that defines Canberra's government-adjacent economy, automating the highest-impact tasks first while keeping rigour and human control intact.",
  services: [
    {
      title: "AI Operational Efficiency Audit",
      detail:
        "A structured review that identifies where automation returns the most across your tender, compliance and knowledge load, ranked by effort, delivered as a clear roadmap before any build.",
    },
    {
      title: "Tender & proposal automation",
      detail:
        "AI agents that assemble and tailor compliant responses from your own content library, so you pursue more government work without each tender consuming days of skilled effort.",
    },
    {
      title: "Panel compliance automation",
      detail:
        "Automating the recurring reporting, capability statements and submissions that panel arrangements demand, with a qualified person reviewing before anything is submitted.",
    },
    {
      title: "Knowledge management assistants",
      detail:
        "Secure AI assistants trained on your past proposals, capability content and procedures, so staff instantly retrieve and reuse institutional knowledge instead of rebuilding it.",
    },
    {
      title: "Document & compliance automation",
      detail:
        "Drafting, populating and checking the APS-grade documents your firm produces, with human review before sign-off to keep rigour and accountability intact.",
    },
    {
      title: "Systems integration",
      detail:
        "Connecting your CRM, document management and finance systems so data and content flow automatically instead of being re-keyed across tools.",
    },
  ],
  caseStudy: {
    client: "LocalSearch",
    industry: "Multi-Service Digital Platform",
    context:
      "LocalSearch is a complex, multi-service business of the kind that benefits from a clear-eyed view of where AI can add value before building anything. The challenge was assessing AI readiness across a broad operation rather than guessing where to start.",
    outcome:
      "We delivered an AI readiness assessment that mapped the business's processes and identified, with prioritisation, where automation would create the most value. This kind of structured, rigour-first assessment is exactly the approach Canberra's government-adjacent firms value before committing to a build.",
  },
  industryLinks: [
    {
      industry: "Law Firms",
      href: "/for-law-firms",
      context:
        "Canberra law firms handle government and compliance-heavy matters with exacting documentation standards. See how we automate intake, drafting and matter management.",
    },
    {
      industry: "Accounting Firms",
      href: "/for-accounting-firms",
      context:
        "Canberra accounting and advisory firms serve government-linked clients with detailed reporting needs. Explore how we automate onboarding and document handling.",
    },
    {
      industry: "Real Estate",
      href: "/for-real-estate",
      context:
        "In Canberra's stable, public-service-driven property market, responsiveness still wins business. See how we automate enquiry handling and admin for real estate agencies.",
    },
  ],
  faqs: [
    {
      q: "Can automation help us produce government tenders faster?",
      a: "Yes, it's one of the most valuable Canberra applications. AI agents assemble and tailor compliant responses from your own approved content library, so each tender consumes far less skilled effort. That lets you pursue more government opportunities without your bid team being overwhelmed by document assembly.",
    },
    {
      q: "Will automated documents still meet APS-grade rigour and compliance standards?",
      a: "Yes, because we keep a qualified person in the loop to review and approve anything that must meet those standards. AI handles the repetitive drafting and assembly; your people retain control and accountability for the final output. Rigour is preserved, not compromised.",
    },
    {
      q: "Can you help us reuse the institutional knowledge buried in past proposals?",
      a: "That's a core offering. We build secure knowledge assistants trained on your past proposals, capability content and procedures, so staff can instantly find and reuse what the firm already knows rather than rebuilding content from scratch for every submission.",
    },
    {
      q: "We're on several government panels with ongoing obligations. Can automation reduce that load?",
      a: "Yes. Panel arrangements bring recurring reporting, capability statements and submissions. This predictable, repeatable work is well suited to automation. We automate the assembly and preparation while a qualified person reviews before submission, cutting the time this quietly consumes.",
    },
    {
      q: "How do you handle security and sensitive government-related information?",
      a: "Carefully and deliberately. We design automation with security and your obligations front of mind, scope data handling appropriately and keep humans in control of sensitive output. The audit stage covers exactly how information will and won't be used before any build begins.",
    },
    {
      q: "Do you work with Canberra firms in person?",
      a: "We can. Most work is done remotely and efficiently, but we're glad to meet in person in Canberra for scoping sessions and key milestones where that adds value to the engagement.",
    },
    {
      q: "How do we know it'll be worth it before committing to a build?",
      a: "We start with a fixed-scope AI audit, much like the readiness assessments we run for complex businesses, that identifies the highest-value opportunities and expected return. You get a clear, prioritised roadmap before any build commitment, in keeping with the rigour government-adjacent firms expect.",
    },
  ],
  ctaHeadline: "Meet government-grade rigour with less manual effort",
  ctaSubtext:
    "Book an AI Operational Efficiency Audit and get a prioritised roadmap for where automation will free the most time across tender, panel and knowledge work.",
  seo: {
    title: "AI Automation Consulting Canberra | Saabai.ai",
    description:
      "AI automation for Canberra and ACT. Government, ICT, defence and legal firms: automate tenders, panel compliance and knowledge work. Free AI audit.",
    ogTitle: "AI Automation Consulting for Canberra Businesses | Saabai.ai",
    ogDescription:
      "Meet government-grade rigour with less manual effort. Saabai.ai helps Canberra firms automate tenders, panel compliance and knowledge management. Book an AI audit.",
    canonical: `${BASE_URL}/canberra`,
  },
};

// ---------------------------------------------------------------------------
// DARWIN
// ---------------------------------------------------------------------------
export const DARWIN: LocationConfig = {
  city: "Darwin",
  slug: "darwin",
  state: "Northern Territory",
  stateCode: "NT",
  heroHeadline: "AI Automation Consulting for Darwin Businesses",
  heroSubheading:
    "Remote operations, seasonal swings and a gateway-to-Asia logistics role make Darwin's admin uniquely demanding. We help NT businesses automate it and run leaner across the distance.",
  industries: [
    "Mining & Resources",
    "Construction & Infrastructure",
    "Logistics & Supply Chain",
    "Government Services",
    "Tourism",
    "Defence",
  ],
  marketContext: [
    "Darwin operates at a distance from the rest of Australia, and that distance shapes how its businesses work. Mining and resource operations, construction and infrastructure projects, and the firms that service them are frequently coordinating work across remote sites spread over vast areas of the Territory. Communication, logistics and documentation that would be straightforward in a capital-city office become genuinely demanding when sites are hundreds of kilometres apart and connectivity isn't guaranteed.",
    "The Wet and Dry seasons govern the rhythm of much of the Territory's economy. Tourism in particular swings hard between the busy Dry and the quiet Wet, and construction and field operations have to be planned around the weather. Businesses that handle these seasonal swings best are those whose systems flex with demand automatically rather than relying on people to scramble during the peaks and idle through the troughs.",
    "Darwin's role as Australia's gateway to Southeast Asia gives its logistics and supply chain sector an outsized importance. Moving goods and coordinating freight between Asia, the Territory and the rest of Australia involves documentation, customs and coordination that is repetitive, detail-sensitive and costly to get wrong. This is fertile ground for automation that handles the paperwork accurately and consistently.",
    "Across mining, construction, logistics, government services and defence, the common thread is operating effectively across distance and seasonality with lean local teams. Targeted AI automation takes the repetitive coordination and documentation work off those teams, letting NT businesses run leaner and more reliably despite the remoteness that defines doing business in the Territory.",
  ],
  challengesIntro:
    "Darwin and the wider NT face operational pressures shaped by distance, climate and a frontier logistics role. These are the ones we're most often brought in to solve.",
  challenges: [
    {
      title: "Coordinating remote site operations",
      detail:
        "Mining, construction and field work spread across vast distances with patchy connectivity makes communication, logistics and documentation demanding and error-prone when handled manually.",
    },
    {
      title: "Seasonal demand swings",
      detail:
        "The Wet and Dry seasons drive sharp swings in tourism and field activity. Manual processes struggle to flex, leaving teams scrambling in the peaks and underused in the troughs.",
    },
    {
      title: "Gateway logistics documentation load",
      detail:
        "Darwin's role linking Southeast Asia and the rest of Australia means freight, customs and coordination paperwork that is repetitive, detail-sensitive and expensive to get wrong.",
    },
    {
      title: "Lean teams covering large operations",
      detail:
        "NT businesses often run with small local teams managing operations that would have far larger back offices in a capital city, so admin lands heavily on a few people.",
    },
    {
      title: "Distance amplifies small errors",
      detail:
        "A documentation or coordination mistake that's a minor fix in a city becomes costly when the site, supplier or shipment is hundreds of kilometres or a border away.",
    },
  ],
  howWeHelpIntro:
    "We focus on the coordination and documentation work that distance and seasonality make hard in the Territory, automating the highest-impact tasks first and integrating with your existing systems.",
  services: [
    {
      title: "AI Operational Efficiency Audit",
      detail:
        "A structured review that pinpoints where automation returns the most across your coordination and documentation load, ranked by effort, delivered as a clear roadmap before any build.",
    },
    {
      title: "Remote coordination automation",
      detail:
        "Automating and integrating the communication, documentation and data flow between your Darwin base and remote sites, reducing the manual handling that makes distance error-prone.",
    },
    {
      title: "Logistics & documentation automation",
      detail:
        "Drafting, populating and checking the freight, customs and coordination paperwork Darwin's gateway role demands, with a qualified human reviewing before anything goes out.",
    },
    {
      title: "Booking & enquiry automation",
      detail:
        "Round-the-clock AI intake that flexes with seasonal demand, so Dry-season tourism surges are captured without scrambling and Wet-season quiet doesn't tie up staff.",
    },
    {
      title: "Systems integration",
      detail:
        "Connecting your project, finance, logistics and field systems so data flows automatically between base and remote sites instead of being re-keyed and emailed around.",
    },
    {
      title: "Internal knowledge assistants",
      detail:
        "Secure AI assistants trained on your procedures and documentation, giving lean local teams instant answers without depending on one or two key people.",
    },
  ],
  caseStudy: {
    client: "PlasticOnline (Holland Plastics)",
    industry: "Industrial Supply to Remote Operations",
    context:
      "PlasticOnline is a Queensland-based industrial supplier whose customers include operations at remote sites. This reference engagement highlights a challenge familiar to NT businesses: industrial clients at remote locations need pricing information quickly, at any hour, without depending on a salesperson being available to respond.",
    outcome:
      "We built Rex, an AI pricing agent that quotes cut-to-size orders instantly from the company's own pricing logic. The NT-relevant insight is that remote-site customers get accurate quotes immediately, around the clock, regardless of time zone or business hours. That kind of always-on responsiveness is exactly what resource and infrastructure businesses operating across the Territory need.",
  },
  industryLinks: [
    {
      industry: "Law Firms",
      href: "/for-law-firms",
      context:
        "Darwin law firms serving resource, construction and government clients handle document-heavy work across distance. See how we automate intake, drafting and matter management.",
    },
    {
      industry: "Accounting Firms",
      href: "/for-accounting-firms",
      context:
        "Darwin accounting firms support a resource and project-linked client base with lean teams. Explore how we automate onboarding, data collection and document handling.",
    },
    {
      industry: "Real Estate",
      href: "/for-real-estate",
      context:
        "In Darwin's seasonally driven property market, responsiveness wins business. See how we automate enquiry handling and admin for real estate agencies.",
    },
  ],
  faqs: [
    {
      q: "Can you help us coordinate work across remote NT sites?",
      a: "Yes, it's one of the most valuable Territory applications. We automate and integrate the communication, documentation and data flow between your Darwin base and remote sites, reducing the manual handling that makes coordinating across distance both error-prone and expensive when something slips.",
    },
    {
      q: "How does automation cope with the Wet and Dry seasonal swings?",
      a: "Automation flexes with demand without you adjusting staff. AI intake and booking handling absorb Dry-season tourism and activity surges that would otherwise overwhelm a lean team, then sit quietly through the Wet, so you capture the peaks without scrambling or carrying idle capacity.",
    },
    {
      q: "We handle freight between Asia and Australia. Can automation help with that paperwork?",
      a: "Yes. Darwin's gateway role generates repetitive, detail-sensitive freight, customs and coordination documentation that's costly to get wrong. We automate the drafting, populating and checking of that paperwork, with a person reviewing before it goes out, to make it faster and more consistent.",
    },
    {
      q: "Our local team is small but covers a big operation. Is automation realistic for us?",
      a: "Very much so. Lean teams covering large operations get the most from automation. Taking repetitive coordination and documentation off a few people lets them manage far more without burning out, which is exactly the leverage NT businesses need given the distances involved.",
    },
    {
      q: "Do you work with Darwin businesses given the distance and time difference?",
      a: "Absolutely. We work with NT businesses remotely as standard and structure communication around your hours. Distance is a non-issue for how we run audits and build projects, and remote operation is precisely the kind of challenge our automation is built to ease.",
    },
    {
      q: "Distance makes small mistakes expensive for us. Does automation reduce errors?",
      a: "Yes. Much of what goes wrong across distance comes from manual re-keying and inconsistent handling. Automating documentation and coordination makes the process consistent and reduces the small errors that become costly when a site, supplier or shipment is hundreds of kilometres or a border away.",
    },
    {
      q: "How do we know automation will pay off before committing to a build?",
      a: "We start with a fixed-scope AI audit that identifies the highest-value opportunities across your coordination and documentation load and the expected return. You get a clear roadmap before any build commitment, so the decision rests on real findings rather than a guess.",
    },
  ],
  ctaHeadline: "Run leaner across the distance and the seasons",
  ctaSubtext:
    "Book an AI Operational Efficiency Audit and get a prioritised roadmap for where automation will cut the most coordination and documentation load.",
  seo: {
    title: "AI Automation Consulting Darwin | Saabai.ai",
    description:
      "AI automation for Darwin and NT. Mining, construction and logistics: automate remote coordination, freight docs and admin. Book a free AI audit.",
    ogTitle: "AI Automation Consulting for Darwin Businesses | Saabai.ai",
    ogDescription:
      "Run leaner across distance and the seasons. Saabai.ai helps Darwin and NT businesses automate remote coordination, logistics docs and admin. Book an AI audit.",
    canonical: `${BASE_URL}/darwin`,
  },
};

// ---------------------------------------------------------------------------
// HOBART
// ---------------------------------------------------------------------------
export const HOBART: LocationConfig = {
  city: "Hobart",
  slug: "hobart",
  state: "Tasmania",
  stateCode: "TAS",
  heroHeadline: "AI Automation Consulting for Hobart Businesses",
  heroSubheading:
    "A tourism boom and a tight labour market are stretching Hobart's small businesses. We help local owner-operators automate the admin so a small team can keep up with growing demand.",
  industries: [
    "Tourism & Hospitality",
    "Professional Services",
    "Food & Beverage",
    "Construction",
    "Healthcare",
    "Education & Research",
  ],
  marketContext: [
    "Hobart has been transformed by tourism. MONA reshaped the city's profile and helped drive a sustained visitor boom, and around it a dense ecosystem of hospitality, accommodation, food, wine and experience businesses has grown. Much of this economy is built on small, owner-operated businesses, which gives Hobart its distinctive character but also means the admin behind a busy season has nowhere to go but onto owners and small teams who are already fully committed to running the operation.",
    "The labour market is tight. Tasmania's smaller population and the seasonal nature of much of the work make it genuinely hard for Hobart businesses to hire and keep staff, particularly through peak periods. When you can't simply add people to cope with demand, the alternative is to make the team you have more productive, which is exactly what well-targeted automation does by removing the repetitive admin that consumes their time.",
    "Food, wine and beverage is a standout Tasmanian sector with a growing export dimension. Selling Tasmanian produce and wine beyond the state introduces complexity (orders, logistics, compliance and documentation) that small producers often handle manually on top of actually making the product. The paperwork around growth can quietly become a brake on it.",
    "Across tourism, hospitality, professional services, food and beverage and the trades, the common Hobart story is a small business trying to keep up with rising demand without a back office to match. Targeted AI automation gives these businesses leverage by handling bookings, enquiries, invoicing and documentation automatically, so a small Hobart team can meet growing demand without the owner working every evening to keep the admin under control.",
  ],
  challengesIntro:
    "Hobart's small-business, tourism-driven economy produces a recognisable set of pressures, sharpened by a tight labour market. These are the ones we hear about most.",
  challenges: [
    {
      title: "Owner-operators absorbing all the admin",
      detail:
        "In Hobart's small businesses, owners typically handle bookings, enquiries and invoicing themselves. Every hour on admin is an hour not spent running or growing the business, and growth stalls at the owner's capacity.",
    },
    {
      title: "Tourism demand outpacing small teams",
      detail:
        "The visitor boom drives enquiries and bookings that small hospitality and experience businesses struggle to handle manually, especially through peak season when everyone is already flat out.",
    },
    {
      title: "A tight labour market limits hiring",
      detail:
        "Tasmania's small population and seasonal work make staff hard to hire and keep. When you can't add people, productivity has to come from better systems instead.",
    },
    {
      title: "Export complexity for food and wine producers",
      detail:
        "Selling Tasmanian produce and wine beyond the state adds orders, logistics, compliance and documentation that small producers often handle manually on top of making the product.",
    },
    {
      title: "After-hours and seasonal enquiries go cold",
      detail:
        "Many tourism and hospitality enquiries arrive outside business hours or during peak surges. Without automated intake, those leads sit unanswered and bookings slip away.",
    },
  ],
  howWeHelpIntro:
    "We focus on giving small Hobart teams the leverage of a larger one, automating the tasks that consume the owner's day first and working with the tools you already run.",
  services: [
    {
      title: "AI Operational Efficiency Audit",
      detail:
        "A focused review that pinpoints where automation will buy back the most time for a small team, ranked by effort and impact, delivered as a clear roadmap before any build begins.",
    },
    {
      title: "Booking & enquiry automation",
      detail:
        "Round-the-clock AI intake that handles enquiries and bookings through seasonal surges, so peak tourism demand is captured instead of dropped. Built for Hobart's hospitality and experience operators.",
    },
    {
      title: "Food and Beverage Export Automation",
      detail:
        "Automating wholesale order management, certification tracking, export documentation and distributor communications for Hobart's food producers, wineries and distilleries selling beyond Tasmania.",
    },
    {
      title: "Invoicing & payment follow-up",
      detail:
        "Automated invoicing and gentle payment chasing that keeps cash flow healthy without the owner personally chasing every account each week.",
    },
    {
      title: "Order & documentation automation",
      detail:
        "Automating the orders, logistics and compliance paperwork food and wine producers face when selling beyond Tasmania, so growth doesn't mean drowning in admin.",
    },
    {
      title: "Internal knowledge assistants",
      detail:
        "Secure AI assistants that give staff instant answers from your own procedures, so the owner isn't the only person who knows how everything runs.",
    },
  ],
  caseStudy: {
    client: "Tributum Law",
    industry: "Tax Law (Small Professional Services)",
    context:
      "Tributum Law is a small professional services firm where client intake involved significant manual handling: gathering details, qualifying enquiries and preparing information before work could begin. It's a profile familiar to many small Hobart practices stretched between client work and admin.",
    outcome:
      "We built Lex, an AI intake agent that handles initial client interaction, gathers and structures the right information and prepares matters for the team. The firm now captures and qualifies enquiries consistently while freeing people from repetitive intake admin. That is the same leverage a small Hobart business needs to keep up with demand.",
  },
  industryLinks: [
    {
      industry: "Law Firms",
      href: "/for-law-firms",
      context:
        "Small Hobart law firms feel admin acutely with lean teams. See how we automate client intake, drafting and matter management so a small practice runs like a larger one.",
    },
    {
      industry: "Accounting Firms",
      href: "/for-accounting-firms",
      context:
        "Hobart accounting practices juggle seasonal peaks with small teams and a tight labour market. Explore how we automate onboarding and document handling for accounting firms.",
    },
    {
      industry: "Real Estate",
      href: "/for-real-estate",
      context:
        "In Hobart's tourism-influenced property market, fast response wins business. See how we automate enquiry handling and admin for real estate agencies.",
    },
  ],
  faqs: [
    {
      q: "I run a small Hobart business and do everything myself. Can automation actually help?",
      a: "Yes, and small owner-operated businesses usually benefit most. When you're the one handling bookings, enquiries and invoicing, automating those tasks frees up the most valuable person in the business. We scope to fit small budgets and start with whatever's eating the most of your day.",
    },
    {
      q: "We can't find staff to hire. Is automation a realistic alternative?",
      a: "In Hobart's tight labour market, it often is. When you can't add people, the practical path is making your existing team more productive. Automating repetitive admin lets the staff you have handle more demand, which directly addresses the hiring squeeze rather than working around it.",
    },
    {
      q: "How do you handle the seasonal tourism surges our business faces?",
      a: "Automation flexes with demand. AI intake and booking handling absorb peak-season surges that would otherwise overwhelm a small team, then sit quietly off-peak. You capture the boom without hiring temporary staff just to answer enquiries and take bookings.",
    },
    {
      q: "We're a food or wine producer starting to sell beyond Tasmania. Can you help with that admin?",
      a: "Yes. Selling beyond the state brings orders, logistics, compliance and documentation that small producers often handle manually. We automate that paperwork so the growth of selling interstate or overseas doesn't bury you in admin on top of actually making the product.",
    },
    {
      q: "Can you capture enquiries that come in after hours or during a rush?",
      a: "That's a common Hobart win. A lot of tourism and hospitality enquiries arrive outside business hours or during peak surges when nobody can get to them. Automated AI intake answers and captures those leads instantly, so they don't go cold or book elsewhere before you respond.",
    },
    {
      q: "Do you work with Hobart businesses remotely?",
      a: "Yes, as standard. We work with Tasmanian businesses remotely and efficiently, structuring communication around your hours. Distance is a non-issue for running an audit and building automations, so being in Hobart is no barrier to working with us.",
    },
    {
      q: "How quickly will we see a return, and what does it cost to start?",
      a: "We start with a fixed-scope AI audit that gives you a prioritised roadmap within a couple of weeks, with first automations often live a few weeks after. The audit keeps the entry point affordable for small businesses, so you decide based on real numbers rather than a guess.",
    },
  ],
  ctaHeadline: "Keep up with demand without working every evening",
  ctaSubtext:
    "Book an AI Operational Efficiency Audit and find out exactly where automation will buy back the most time in your Hobart business.",
  seo: {
    title: "AI Automation Consulting Hobart | Saabai.ai",
    description:
      "AI automation for Hobart and Tasmania. Tourism, hospitality, food and wine: automate bookings, intake and admin. Book a free AI audit.",
    ogTitle: "AI Automation Consulting for Hobart Businesses | Saabai.ai",
    ogDescription:
      "Keep up with a tourism boom in a tight labour market. Saabai.ai helps Hobart small businesses automate bookings, intake and admin. Book an AI efficiency audit.",
    canonical: `${BASE_URL}/hobart`,
  },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
export const LOCATION_CONFIGS: Record<string, LocationConfig> = {
  brisbane: BRISBANE,
  "gold-coast": GOLD_COAST,
  sydney: SYDNEY,
  melbourne: MELBOURNE,
  perth: PERTH,
  adelaide: ADELAIDE,
  canberra: CANBERRA,
  darwin: DARWIN,
  hobart: HOBART,
};

export const ALL_LOCATIONS = Object.values(LOCATION_CONFIGS);
