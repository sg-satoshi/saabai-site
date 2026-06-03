# Australian Location Pages — SEO Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create 9 city-specific landing pages targeting Australian businesses seeking AI consulting and automation services, each with unique 1,200–2,000+ word content, full technical SEO, and integration with the existing Saabai design system.

**Architecture:** A shared `LocationPage` React component accepts a `LocationConfig` object (typed in `lib/location-data.ts`) that contains all city-specific content — market context, FAQs, case study ref, SEO metadata. Each city gets its own `app/[city]/page.tsx` that exports unique Next.js metadata and renders the shared template with its city data. This keeps code DRY while ensuring all uniqueness lives in the data layer, where Google looks. JSON-LD schema (LocalBusiness, FAQ, Breadcrumb) is generated from the config object inside the template.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Saabai design system CSS variables (`--saabai-bg`, `--saabai-teal`, `--saabai-border`, etc.), `next/font` (Geist — already loaded in root layout), `application/ld+json` inline schema.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| CREATE | `lib/location-data.ts` | `LocationConfig` type + all 9 city data objects |
| CREATE | `app/components/LocationPage.tsx` | Shared template component — all sections, all schema |
| CREATE | `app/brisbane/page.tsx` | Brisbane metadata + renders `<LocationPage config={BRISBANE}/>` |
| CREATE | `app/gold-coast/page.tsx` | Gold Coast metadata |
| CREATE | `app/sydney/page.tsx` | Sydney metadata |
| CREATE | `app/melbourne/page.tsx` | Melbourne metadata |
| CREATE | `app/perth/page.tsx` | Perth metadata |
| CREATE | `app/adelaide/page.tsx` | Adelaide metadata |
| CREATE | `app/canberra/page.tsx` | Canberra metadata |
| CREATE | `app/darwin/page.tsx` | Darwin metadata |
| CREATE | `app/hobart/page.tsx` | Hobart metadata |
| MODIFY | `app/components/Footer.tsx` | Add "Service Areas" section with 9 city links |

---

## Task 1 — Location Types and Data

**Files:**
- Create: `lib/location-data.ts`

- [ ] **Step 1: Create the file with types and all 9 city configs**

```typescript
// lib/location-data.ts

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

export interface LocationConfig {
  city: string;
  slug: string;
  state: string;
  stateCode: string;
  heroHeadline: string;
  heroSubheading: string;
  industries: string[];
  marketContext: string[];      // Array of paragraphs — 3–4 paragraphs each ~80–120 words
  challengesIntro: string;      // 1–2 sentence intro to challenges section
  challenges: Array<{ title: string; detail: string }>;
  howWeHelpIntro: string;
  services: Array<{ title: string; detail: string }>;
  caseStudy: LocationCaseStudy;
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

// ── Brisbane ──────────────────────────────────────────────────────────────────

export const BRISBANE: LocationConfig = {
  city: "Brisbane",
  slug: "brisbane",
  state: "Queensland",
  stateCode: "QLD",
  heroHeadline: "AI Automation for Brisbane Businesses",
  heroSubheading: "Brisbane is growing faster than any other major Australian city. The businesses that scale without proportionally growing their headcount will win the next decade — and AI automation is how they do it.",
  industries: ["Professional Services", "Construction & Trades", "Manufacturing", "Technology", "Property & Real Estate", "Growth Corridor Businesses"],
  marketContext: [
    "Brisbane is in the middle of a decade-long transformation. With the 2032 Olympics acting as a catalyst, infrastructure investment, population growth, and business migration from southern states are creating an environment where Queensland SMEs have more opportunity than at any point in the past 30 years. The challenge is not finding work — it's delivering it efficiently at scale.",
    "The growth corridor stretching from the Sunshine Coast through Brisbane to the Gold Coast is producing a concentration of construction, trades, and professional services businesses that are wrestling with the same core problem: demand is outpacing their operational capacity. Most are still relying on manual processes, spreadsheets, and phone calls to manage workflows that have tripled in volume.",
    "Brisbane's professional services sector — legal, accounting, financial advice, real estate — is maturing rapidly. Firms that have historically competed on local relationships are now facing competition from tech-enabled national players. The differentiator in this market is no longer who you know. It's how fast and consistently you can serve clients, and whether your back office can keep up with your front office.",
    "Saabai works with Brisbane businesses across industries to implement AI systems that handle the work that doesn't need a human — qualifying leads, processing documents, answering common client questions, routing enquiries, and generating routine reports. The result is a business that can scale revenue without scaling its wage bill at the same rate."
  ],
  challengesIntro: "Brisbane businesses across construction, professional services, and the growth corridor are hitting operational ceilings driven by the same root causes.",
  challenges: [
    { title: "Labour costs are rising faster than revenue", detail: "Queensland wages have increased sharply since 2022. For trades, construction, and professional services businesses in Brisbane, staff costs now represent 55–70% of revenue. Adding headcount to handle growing admin volume is no longer economically viable — businesses need a different model." },
    { title: "Admin is eating billable time", detail: "In Brisbane's professional services sector, it is common for lawyers, accountants, and advisers to spend 30–40% of their time on tasks that generate no direct revenue: answering emails, chasing documents, preparing standard reports, following up leads. This is the highest-cost admin bottleneck in the market." },
    { title: "Lead response times are losing work", detail: "Brisbane's construction boom means builders, trades, and suppliers are flooded with enquiries. Studies consistently show that responding to a lead within five minutes is 100x more effective than responding within 30 minutes. Most Brisbane businesses are responding in hours or days — and losing work to competitors who respond faster." },
    { title: "Growth corridor businesses are stretched thin", detail: "Businesses operating across Ipswich, Logan, Moreton Bay, and the Sunshine Coast are managing multiple sites, subcontractors, and client relationships with administrative systems designed for a single-location operation. The coordination cost is enormous and largely invisible until it causes a problem." },
    { title: "Reporting and compliance are manual and error-prone", detail: "Across construction, professional services, and manufacturing, Brisbane businesses are generating reports manually — pulling data from multiple systems, formatting it in spreadsheets, and distributing it by email. This is slow, error-prone, and a significant source of management inefficiency." }
  ],
  howWeHelpIntro: "Saabai builds AI systems tailored to the operational reality of Brisbane businesses — practical, integrated, and designed to deliver measurable results within 90 days.",
  services: [
    { title: "AI Lead Qualification Agents", detail: "An AI agent handles every inbound enquiry — website, email, or phone transcript — qualifies the prospect, captures the information your team needs, and notifies the right person instantly. Brisbane businesses using this system report response times under 2 minutes, 24 hours a day." },
    { title: "Workflow Automation", detail: "We map your current operational workflows and identify every step that does not require human judgement. Those steps get automated. Common examples in Brisbane businesses: document generation, appointment scheduling, status update communications, invoice follow-up, and subcontractor coordination." },
    { title: "AI Customer Service Systems", detail: "A trained AI agent handles tier-one customer enquiries — FAQs, order status, appointment questions, policy information — freeing your team to handle the complex issues that actually need them. Typically reduces customer service volume by 40–60% for Brisbane businesses." },
    { title: "Internal Knowledge Systems", detail: "For Brisbane professional services firms and construction businesses, we build AI systems that make your internal knowledge accessible instantly — procedures, compliance requirements, product information, client history. New staff get productive faster. Experienced staff stop answering the same questions repeatedly." },
    { title: "Operational Efficiency Audits", detail: "Before we build anything, we audit your current operations. We map every manual process, quantify the time cost, and identify which automations will generate the highest ROI in your specific business. Brisbane business owners consistently tell us the audit alone changes how they think about their operations." },
    { title: "AI Implementation Consulting", detail: "We help Brisbane business owners make sense of the AI landscape — what is real, what is hype, and what actually applies to a business of your size and type. We build implementation roadmaps grounded in your industry, your team's capabilities, and your growth objectives." }
  ],
  caseStudy: {
    client: "PlasticOnline (Holland Plastics)",
    industry: "Industrial Supply — Gold Coast / Queensland",
    context: "PlasticOnline — part of Holland Plastics, one of Queensland's largest cut-to-size plastics suppliers — was handling hundreds of manual pricing enquiries per week. Sales staff were spending significant time quoting standard cut-to-size orders that followed predictable rules. Customer response times averaged several hours.",
    outcome: "Saabai built Rex — an AI sales agent trained on PlasticOnline's full product catalogue, pricing engine, and ordering rules. Rex now handles every cut-to-size pricing enquiry instantly, 24/7, and captures leads into the CRM automatically. The sales team focuses exclusively on complex orders and relationship management."
  },
  faqs: [
    { q: "Do you work with Brisbane businesses remotely, or do you visit on-site?", a: "Both. For most projects, the initial discovery and strategy phase is conducted remotely via video call — it's faster and more efficient. For larger engagements or businesses with complex on-site operations (manufacturing, construction), we do visit. We have worked with businesses across Greater Brisbane, Ipswich, Logan, Moreton Bay, and the Sunshine Coast." },
    { q: "How long does it take to see results from AI automation?", a: "Most Brisbane clients see measurable results within 60–90 days of project start. Lead qualification agents and customer service automations typically go live within 4–6 weeks. More complex workflow automations involving integrations with existing software take 8–12 weeks. We build in stages so you see progress continuously, not just at the end." },
    { q: "Can AI help Brisbane construction and trades businesses?", a: "Yes, and this is one of the highest-ROI applications we see in Queensland. Trades and construction businesses deal with high enquiry volumes, subcontractor coordination, compliance documentation, and quote management — all of which have strong automation potential. Common implementations include automated quote follow-up, subcontractor briefing automation, and compliance report generation." },
    { q: "What does it cost to work with Saabai?", a: "Project costs vary significantly based on scope. A focused AI lead qualification system for a Brisbane professional services firm typically runs $3,000–$8,000 to build. A more comprehensive operational automation programme for a mid-size construction business might be $15,000–$40,000. We always start with an audit so you know the exact scope and ROI before committing." },
    { q: "We are not a tech company. Can we still benefit from AI automation?", a: "This is the question we hear most often from Brisbane business owners, and the answer is yes — emphatically. The businesses that benefit most from AI automation are not tech companies. They are professional services firms, construction businesses, trades operators, and manufacturers who have high volumes of repetitive administrative work. Technical expertise is not required. We handle the implementation." },
    { q: "Will AI automation replace our staff?", a: "Our approach is to automate the tasks that your staff do not want to do — repetitive admin, after-hours enquiry handling, routine reporting — so they can focus on the work that requires human judgement, relationships, and expertise. Every Brisbane business we have worked with has retained its full team and redeployed their time to higher-value activities." },
    { q: "How do we get started?", a: "Book a free AI Strategy Session through this page. In 30 minutes, we will review your current operations, identify where automation will have the highest impact for your specific Brisbane business, and give you an honest assessment of what is achievable and at what cost. There is no obligation." }
  ],
  ctaHeadline: "Book an AI Strategy Session for Your Brisbane Business",
  ctaSubtext: "Free 30-minute session. We review your current operations, identify your highest-impact automation opportunities, and give you a clear picture of what AI can do for your Brisbane business — no obligation.",
  seo: {
    title: "AI Automation Consultant Brisbane | AI Systems & Workflow Automation | Saabai",
    description: "Saabai builds AI automation systems for Brisbane businesses — lead qualification, workflow automation, AI agents, and operational efficiency consulting. Free strategy session.",
    ogTitle: "AI Automation Consultant Brisbane | Saabai",
    ogDescription: "Brisbane businesses: reduce admin costs, automate lead qualification, and scale without hiring. Saabai builds practical AI systems tailored to Queensland SMEs.",
    canonical: "https://www.saabai.ai/brisbane",
  },
};

// ── Gold Coast ────────────────────────────────────────────────────────────────

export const GOLD_COAST: LocationConfig = {
  city: "Gold Coast",
  slug: "gold-coast",
  state: "Queensland",
  stateCode: "QLD",
  heroHeadline: "AI Automation for Gold Coast Businesses",
  heroSubheading: "From trades and construction to tourism and professional services — Gold Coast businesses are busy. The ones growing sustainably are using AI to handle the work that doesn't need a person.",
  industries: ["Trades & Construction", "Property Development", "Tourism & Hospitality", "Professional Services", "Retail", "Health & Wellness"],
  marketContext: [
    "The Gold Coast has one of the most diverse SME economies in Australia. On any given day, a plumbing business in Burleigh is managing 40 job quotes, a property developer in Broadbeach is coordinating 12 subcontractors, a law firm in Southport is chasing document returns from three clients, and a tourism operator in Surfers Paradise is handling enquiries from guests in four time zones. The operational complexity is real — and for most businesses, it is being managed by people rather than systems.",
    "The trades and construction sector on the Gold Coast is significant and structurally underserved by technology. Most trade businesses operate on job management software, Excel spreadsheets, and WhatsApp group chats. The administrative burden — quoting, scheduling, compliance documentation, invoicing follow-up — consumes 25–35% of working hours that could otherwise be spent on billable work. This is not a technology problem. It is a process problem that technology can solve.",
    "Tourism creates a seasonality challenge unlike any other Australian city outside of a resort town. Gold Coast hospitality, accommodation, and experience businesses face extreme peaks and troughs in demand. During peak periods, enquiry volumes overwhelm small teams. During quiet periods, those same teams are unproductive. AI automation levels the operational curve — handling high enquiry volumes during peaks without the cost of additional staff.",
    "Gold Coast's growing professional services sector — particularly law, accounting, and financial services — is competing for clients increasingly comfortable with digital-first service delivery. The firms winning new clients are those that respond fastest, communicate most clearly, and handle administrative friction invisibly. AI systems are the infrastructure that makes this possible."
  ],
  challengesIntro: "Gold Coast businesses face a specific combination of high seasonal demand, trades-heavy operations, and lean administrative teams.",
  challenges: [
    { title: "Tradies are drowning in admin", detail: "The Gold Coast has one of the highest concentrations of trade businesses in Queensland. Quoting, scheduling, compliance documentation, invoicing, and follow-up are consuming hours every day that should be spent on tools. A typical trade business on the Gold Coast spends 8–12 hours per week on administrative tasks that could be largely automated." },
    { title: "Tourism creates unmanageable demand spikes", detail: "During peak tourism periods, Gold Coast accommodation, tours, and experience businesses receive enquiry volumes that their teams cannot handle in real time. Leads that go unanswered for more than a few hours in a competitive tourism market are typically lost. AI agents handle this volume instantly, at any hour." },
    { title: "Property businesses are juggling too many moving parts", detail: "Gold Coast property development and real estate businesses manage multiple projects, multiple agents or subcontractors, and multiple client relationships simultaneously. The coordination overhead is enormous. Document management, status updates, and client communication are prime candidates for automation." },
    { title: "Lead follow-up is inconsistent", detail: "Across Gold Coast industries, the most common lost revenue opportunity is inconsistent lead follow-up. Enquiries come in, get noted somewhere, and then fall through the cracks when the team is busy. An automated lead qualification and follow-up system eliminates this entirely." },
    { title: "Small teams are expected to do everything", detail: "Many Gold Coast SMEs run with minimal administrative support. The business owner or a single admin person manages quotes, client communication, scheduling, bookkeeping input, compliance, and reporting. The workload is unsustainable and creates quality and reliability problems as the business grows." }
  ],
  howWeHelpIntro: "Saabai builds AI systems that fit how Gold Coast businesses actually operate — practical tools that handle the repetitive work and give your team their time back.",
  services: [
    { title: "Trade Business Automation", detail: "We build end-to-end automation for Gold Coast trade businesses: quote generation from job specifications, scheduling coordination, compliance documentation (SWMS, JSA), subcontractor briefing, and invoice follow-up. Trades businesses typically recover 8–12 hours per week from these automations." },
    { title: "Tourism Enquiry Handling", detail: "An AI agent handles every inbound tourism and hospitality enquiry — availability, pricing, booking questions, customisation requests — instantly, 24/7. During peak periods, no lead is missed. During quiet periods, the cost of the system is a fraction of a part-time staff member." },
    { title: "Lead Qualification and Follow-up", detail: "Every inbound enquiry — from the website, Google Business, email, or social media — is captured, qualified, and followed up automatically. Your team only sees the leads worth their time, with full context about what the prospect needs." },
    { title: "Customer Communication Automation", detail: "Appointment reminders, status updates, document request follow-ups, and satisfaction check-ins — all automated. Gold Coast professional services and trades businesses using this system report a measurable reduction in client complaints and no-shows." },
    { title: "Workflow Automation", detail: "We map your current business processes and automate every step that does not require human judgement. For Gold Coast property businesses, this often includes contract preparation workflows, settlement milestone tracking, and vendor update communications." },
    { title: "Operational Efficiency Audit", detail: "A systematic review of how your Gold Coast business currently operates — every process, every manual step, every tool in use. We identify the highest-ROI automation opportunities and give you a prioritised implementation roadmap." }
  ],
  caseStudy: {
    client: "PlasticOnline (Holland Plastics)",
    industry: "Industrial Supply — Gold Coast",
    context: "Holland Plastics, based on the Gold Coast, operates PlasticOnline — one of Australia's largest cut-to-size plastics suppliers. Their sales team was handling hundreds of manual pricing enquiries weekly, with response times of several hours for standard cut-to-size orders.",
    outcome: "Saabai built Rex, an AI sales agent that handles all standard cut-to-size pricing enquiries instantly, captures leads automatically, and provides 24/7 customer service. The sales team now focuses entirely on complex orders and trade account relationships — the work that actually requires their expertise."
  },
  faqs: [
    { q: "Can AI help Gold Coast trade businesses reduce their admin time?", a: "Yes — and this is one of the clearest ROI cases we see. Gold Coast trade businesses typically spend 8–12 hours per week on admin that can be largely automated: quoting, scheduling, compliance documentation, and invoice follow-up. We have built systems for trades businesses that recover the majority of this time within 60 days of go-live." },
    { q: "We have a seasonal tourism business. Does AI make sense for us?", a: "Particularly so. Seasonal businesses benefit enormously from AI because you get the capacity of a full-time enquiry handling team during peak periods without paying for that capacity year-round. An AI agent handling your enquiries costs the same in January as in July. A staff member does not." },
    { q: "How does Saabai work with Gold Coast businesses?", a: "Primarily remotely, which works well for most Gold Coast businesses. We have worked with businesses from Coolangatta to Ormeau. Discovery and strategy sessions are via video call. Implementation is remote. Where on-site visits add genuine value — for example, in manufacturing or complex trade environments — we arrange those as needed." },
    { q: "Can a small business on the Gold Coast afford AI automation?", a: "Most of our Gold Coast clients are small businesses with 3–20 staff. Focused automations — like a lead qualification agent or a customer service system — typically cost $3,000–$8,000 to build, which a small business recovers within 3–6 months through time savings and captured leads. We always start with an audit to confirm the ROI case before you commit." },
    { q: "What happens to our staff if we automate their work?", a: "The work we automate is the work nobody enjoys: after-hours enquiry handling, chasing documents, sending status updates, generating standard reports. Your staff move to higher-value work — client relationships, complex problem-solving, business development. In practice, Gold Coast businesses using our systems report higher staff satisfaction, not redundancies." },
    { q: "How long does implementation take?", a: "A focused lead qualification or customer service system typically takes 4–6 weeks from discovery to go-live. More comprehensive operational automations take 8–14 weeks. We build in stages, so you see results progressively rather than waiting for a single big launch." },
    { q: "Is AI actually mature enough for Gold Coast businesses to use right now?", a: "Yes. The tools are no longer experimental. We are building AI systems on enterprise-grade platforms used by some of the world's largest organisations. For Gold Coast SMEs, the sweet spot is practical applications: enquiry handling, document processing, workflow automation, and internal knowledge systems. These work reliably and deliver measurable results." }
  ],
  ctaHeadline: "Book a Free AI Strategy Session — Gold Coast",
  ctaSubtext: "30 minutes. We review your current operations, identify your highest-impact automation opportunities, and give you a clear picture of what AI can do for your Gold Coast business. No obligation, no sales pressure.",
  seo: {
    title: "AI Automation Consultant Gold Coast | AI Systems & Workflow Automation | Saabai",
    description: "Saabai builds AI automation systems for Gold Coast businesses — trades, tourism, property, and professional services. Lead qualification, workflow automation, AI agents. Free strategy session.",
    ogTitle: "AI Automation Consultant Gold Coast | Saabai",
    ogDescription: "Gold Coast businesses: automate your admin, handle enquiries 24/7, and scale without hiring. Saabai builds practical AI systems for trades, tourism, and professional services.",
    canonical: "https://www.saabai.ai/gold-coast",
  },
};

// ── Sydney ─────────────────────────────────────────────────────────────────────

export const SYDNEY: LocationConfig = {
  city: "Sydney",
  slug: "sydney",
  state: "New South Wales",
  stateCode: "NSW",
  heroHeadline: "Helping Sydney Businesses Scale Through AI and Automation",
  heroSubheading: "Sydney has Australia's highest labour costs and its most competitive professional services market. The businesses building a sustainable advantage right now are the ones reducing their dependence on manual processes.",
  industries: ["Law Firms", "Accounting & Advisory", "Financial Services & Fintech", "Property & Construction", "Technology", "Insurance & Risk"],
  marketContext: [
    "Sydney is Australia's most expensive city in which to run a business. Average professional wages in the CBD and North Shore are 25–35% higher than equivalent roles in Brisbane or Adelaide. For law firms, accounting practices, and financial services businesses operating in Sydney, staff costs are the single largest operational variable — and the pressure to maintain margins while paying Sydney wages is relentless.",
    "The city's professional services density creates a unique competitive environment. Sydney's CBD alone contains more law firms, accounting practices, and financial advisers than most Australian states combined. In this environment, operational efficiency is not a nice-to-have — it is a competitive requirement. Firms that can deliver the same quality of service with fewer administrative hours have a structural cost advantage over those that cannot.",
    "Sydney's technology sector has created an ecosystem of businesses that are AI-literate and moving quickly on automation. Outside the tech sector, however, the majority of Sydney's professional services, property, and financial services businesses are still running fundamentally manual operations — relying on email, phone calls, and spreadsheets to manage workflows that have grown significantly over the past five years.",
    "The opportunity for Sydney businesses is significant precisely because the cost base is high. Every hour of administrative work that can be automated at $0.10 per task instead of $60–80 per hour (Sydney professional wages) compounds rapidly into meaningful margin improvement. Saabai builds the systems that create this leverage."
  ],
  challengesIntro: "Sydney's high cost base and competitive professional services market create specific operational pressure points that AI automation is well-positioned to address.",
  challenges: [
    { title: "Sydney wage costs make manual admin economically unsustainable", detail: "At $80,000–$120,000 per year for an experienced administrative professional in Sydney, the cost of manual document processing, client communication management, and reporting is material. A single workflow automation that saves 10 hours per week per staff member generates $25,000–$45,000 in annual labour cost savings at Sydney rates." },
    { title: "Law firms are losing leads to slow response times", detail: "Sydney's legal market is highly competitive. When a potential client enquires about a matter, the firm that responds first — with context and clarity — typically wins the engagement. Most Sydney law firms are still relying on phone calls and email chains to manage initial enquiries, and response times of several hours are common. The conversion cost is enormous." },
    { title: "Financial services compliance is a manual burden", detail: "Sydney's financial services sector faces significant regulatory requirements. Compliance documentation, client file management, AFSL obligations, and reporting requirements are generating enormous volumes of manual administrative work. This is the highest-cost, lowest-value administrative category in the sector — and the most automatable." },
    { title: "Talent competition is making it harder to hire admin staff", detail: "Sydney's tight labour market means that even when businesses can afford to hire, finding and retaining reliable administrative staff is difficult. AI automation reduces the dependency on volume administrative hiring — so businesses can maintain service quality without constantly recruiting." },
    { title: "Client expectations for response speed have increased", detail: "Sydney business clients — particularly in legal, financial services, and property — now expect near-instant responses to routine enquiries and immediate access to status updates on their matters. Meeting these expectations with human-only teams at Sydney labour rates is not sustainable." }
  ],
  howWeHelpIntro: "Saabai works with Sydney's professional services firms, financial services businesses, and property companies to build AI systems that reduce operational cost and improve client experience simultaneously.",
  services: [
    { title: "Legal Intake and Lead Qualification", detail: "AI agents handle every inbound legal enquiry — qualifying the matter, capturing the facts, assessing urgency, and briefing your team. Sydney law firms using this system report 24/7 coverage of new enquiries, with qualified briefs ready for review each morning. No enquiry falls through the cracks." },
    { title: "Financial Services Compliance Automation", detail: "We build AI systems that handle the document-heavy compliance processes that consume disproportionate time in Sydney financial services businesses — client file updates, compliance report generation, standard disclosure document preparation, and review scheduling." },
    { title: "Client Communication Systems", detail: "Automated status updates, document request follow-ups, appointment confirmations, and satisfaction check-ins — all running without manual input. Sydney professional services firms using this system report measurable reductions in client complaints about communication." },
    { title: "Internal Knowledge and Process Systems", detail: "For large Sydney professional services firms, we build AI systems that make institutional knowledge accessible instantly — precedents, procedures, compliance requirements, client history. The cost of a new staff member getting up to speed drops by 40–60%." },
    { title: "Workflow Automation and Integration", detail: "We connect your existing tools — practice management software, CRM, accounting systems, document management — and automate the manual data transfer and task management that currently happens between them. Sydney businesses with multiple software systems see the highest ROI here." },
    { title: "AI Strategy and Implementation Consulting", detail: "For Sydney businesses at the beginning of their AI journey, we provide structured strategic guidance — what to build first, what to avoid, how to manage the change internally, and how to measure results. We have advised businesses from boutique professional services firms to mid-market enterprises." }
  ],
  caseStudy: {
    client: "LocalSearch",
    industry: "Digital Marketing & Business Services — National (Sydney HQ)",
    context: "LocalSearch, one of Australia's leading digital marketing platforms for small businesses, was exploring AI-powered tools to enhance their client-facing and internal operations. The challenge was identifying the highest-impact automation opportunities within a complex, multi-product business.",
    outcome: "Saabai conducted a comprehensive operational audit and AI readiness assessment. The engagement identified specific workflow automation opportunities and provided a prioritised implementation roadmap. The process gave the LocalSearch team a clear framework for evaluating and deploying AI tools across their business operations."
  },
  faqs: [
    { q: "Can AI help Sydney law firms improve operational efficiency?", a: "Yes — and legal is one of the sectors where we see the clearest ROI. Sydney law firms have high billing rates, high administrative overhead, and intensely competitive lead environments. AI handles intake qualification, document processing, client communication management, and compliance reporting. The typical Sydney law firm we work with recovers 15–25 hours of billable time per week from automation." },
    { q: "How does AI automation work for financial services businesses in Sydney?", a: "Financial services businesses in Sydney face a particular combination of high compliance requirements and high labour costs. We build AI systems that handle compliance document preparation, client file management, standard disclosure generation, and reporting — all while maintaining the audit trails required by ASIC and other regulators. The result is a significant reduction in compliance overhead without any reduction in compliance quality." },
    { q: "We are a large Sydney firm with complex existing systems. Is AI automation feasible?", a: "Complexity is not a barrier — it is actually where the return is highest. We have experience integrating AI systems with practice management software (LEAP, Clio, Smokeball), financial planning platforms, CRM systems, and custom enterprise software. The discovery process maps your existing systems and identifies integration points before we build anything." },
    { q: "What is the typical investment for a Sydney business?", a: "For a Sydney professional services firm, a focused AI implementation — lead qualification agent, compliance document automation, or client communication system — typically ranges from $5,000–$15,000 depending on complexity. At Sydney wage rates, this investment is typically recovered within 3–5 months through time savings alone, before factoring in improved lead conversion." },
    { q: "How do you ensure client data security for Sydney financial services businesses?", a: "Data security is a primary design consideration for every system we build. We work with enterprise-grade AI providers, implement appropriate data handling procedures, and can accommodate specific security requirements including data residency in Australia. We have worked with financial services businesses operating under AFSL obligations and are familiar with the compliance requirements." },
    { q: "Do you work with Sydney businesses remotely?", a: "Yes. Most of our Sydney client engagements are conducted remotely via video conference. This is efficient and works well for the discovery, design, and implementation phases. For larger engagements where on-site workshops add value — particularly for complex process mapping — we arrange those as needed." },
    { q: "How is Saabai different from a generic software consultant?", a: "We are AI implementation specialists, not generalist IT consultants. We focus specifically on the intersection of AI, workflow automation, and operational efficiency — which means we have a deep, current understanding of what AI can and cannot do, and we do not oversell. Every engagement starts with an honest audit of where automation will and will not deliver ROI for your specific Sydney business." }
  ],
  ctaHeadline: "Book an AI Strategy Session for Your Sydney Business",
  ctaSubtext: "Free 30-minute session with no obligation. We review your operations, identify your highest-value automation opportunities, and give you a clear implementation roadmap — specific to your Sydney business.",
  seo: {
    title: "AI Automation Consultant Sydney | AI Systems & Workflow Automation | Saabai",
    description: "Saabai builds AI automation systems for Sydney businesses — law firms, financial services, accounting, and property. Reduce admin costs, automate lead qualification. Free strategy session.",
    ogTitle: "AI Automation Consultant Sydney | Saabai",
    ogDescription: "Sydney businesses: cut admin costs, automate compliance processes, and scale without Sydney wages eating your margin. Saabai builds practical AI systems for professional services firms.",
    canonical: "https://www.saabai.ai/sydney",
  },
};

// ── Melbourne ─────────────────────────────────────────────────────────────────

export const MELBOURNE: LocationConfig = {
  city: "Melbourne",
  slug: "melbourne",
  state: "Victoria",
  stateCode: "VIC",
  heroHeadline: "Operational Efficiency Systems for Melbourne Businesses",
  heroSubheading: "Melbourne has Australia's largest concentration of professional services firms, a significant healthcare sector, and one of the country's most sophisticated business communities. AI automation is where efficiency gains are being found.",
  industries: ["Professional Services", "Healthcare & Allied Health", "Education", "Technology", "Manufacturing", "Legal & Compliance"],
  marketContext: [
    "Melbourne's professional services sector is the largest in Australia by firm count. The city's law firms, accounting practices, management consultancies, and financial advisers represent a dense concentration of high-value businesses with significant administrative overhead. These businesses are typically well-resourced, sophisticated, and increasingly aware that AI automation is not a future consideration — it is a present competitive necessity.",
    "Healthcare is Melbourne's second-largest professional sector, and arguably its most administratively burdened. Medical practices, allied health businesses, specialist clinics, and healthcare networks are managing appointment scheduling, patient communications, billing queries, referral coordination, and compliance documentation at scale — most of it manually. The operational efficiency opportunity in Melbourne healthcare is substantial.",
    "Melbourne's technology sector, concentrated in the CBD, Southbank, and the inner suburbs, has created an ecosystem of AI-literate businesses that are moving quickly. However, the vast majority of Melbourne's business economy — in professional services, healthcare, education, and manufacturing — is still operating with manual administrative systems that have not fundamentally changed in a decade.",
    "The combination of Victoria's strong economy and Melbourne's high professional wages creates the same dynamic we see in Sydney: every manual administrative hour costs more here than it does in other Australian cities, and the ROI from automation is correspondingly higher. Saabai works with Melbourne businesses to identify and implement the highest-value automations for their specific operational context."
  ],
  challengesIntro: "Melbourne businesses across professional services, healthcare, and manufacturing face a common set of operational bottlenecks that AI automation can systematically address.",
  challenges: [
    { title: "Healthcare admin is consuming clinical time", detail: "Melbourne's medical and allied health businesses consistently report that administrative work is the single greatest threat to their sustainability. Appointment management, patient communications, billing query handling, referral paperwork, and compliance documentation are taking clinical staff away from patient care. The opportunity cost is both financial and patient-experience related." },
    { title: "Professional services firms are scaling people instead of systems", detail: "Melbourne's professional services sector has grown significantly over the past five years, and most firms have grown their headcount to match. This creates a business that is more expensive to run but not proportionally more profitable. The firms outperforming their peers are the ones that have built operational leverage — and AI automation is the primary source of that leverage." },
    { title: "Manufacturing businesses are running manual compliance and reporting", detail: "Melbourne's manufacturing sector — including food processing, industrial manufacturing, and engineering businesses — faces significant compliance documentation requirements and reporting obligations. Most are managing this manually, creating bottlenecks in production oversight and regulatory reporting." },
    { title: "Education sector admin overhead is growing", detail: "Melbourne's private schools, training organisations, and education businesses are managing increasing volumes of enrolment administration, parent communications, compliance reporting, and student management. Administrative staff are overwhelmed, and the cost of additional headcount is material." },
    { title: "Legal billing and matter management is inefficient", detail: "Melbourne's dense legal market means that operational efficiency is a direct competitive differentiator. Law firms that can deliver the same quality of work with fewer administrative hours have a meaningful structural cost advantage. Yet most Melbourne law firms are still managing matter tracking, billing preparation, and client communications manually." }
  ],
  howWeHelpIntro: "Saabai builds AI systems for Melbourne's professional services, healthcare, and education businesses — practical implementations that reduce administrative overhead and improve operational consistency.",
  services: [
    { title: "Healthcare Administration Automation", detail: "AI agents handle appointment confirmation and reminders, new patient intake, referral coordination, and common billing enquiries. Melbourne healthcare businesses using these systems report 30–50% reductions in inbound administrative calls and measurable improvements in appointment attendance rates." },
    { title: "Legal and Professional Services Automation", detail: "We build AI systems for Melbourne law firms and professional services businesses that handle initial client intake, document collection, matter status updates, and billing preparation. The result is more billable hours and fewer write-offs from administrative inefficiency." },
    { title: "Manufacturing Compliance and Reporting", detail: "For Melbourne manufacturing businesses, we automate compliance documentation preparation, production reporting, and supplier communication workflows. Quality and safety compliance processes that previously required manual compilation are generated automatically from existing data." },
    { title: "Customer Service AI Agents", detail: "A trained AI agent handles all tier-one customer enquiries for Melbourne businesses — FAQs, appointment questions, status updates, and standard policy information. Typically reduces inbound customer service volume by 40–60% while improving response times to under 2 minutes." },
    { title: "Workflow Integration and Automation", detail: "We connect Melbourne businesses' existing software tools — practice management, HRIS, ERP, CRM — and automate the manual handoffs between them. For businesses running multiple disconnected systems, this is often where the highest ROI is found." },
    { title: "AI Operational Efficiency Audit", detail: "A systematic review of your Melbourne business's current operations — every process, every manual step, every administrative bottleneck. We quantify the time cost of each inefficiency and deliver a prioritised roadmap of automation opportunities with estimated ROI." }
  ],
  caseStudy: {
    client: "Ink FX Printing",
    industry: "Commercial Printing — Melbourne",
    context: "Ink FX Printing, a Melbourne commercial printing business, was managing a high volume of custom quote requests manually. Each quote required significant back-and-forth communication to gather specifications, and the team was spending disproportionate time on quotes that did not convert.",
    outcome: "Saabai designed an AI-assisted quoting and enquiry qualification system that captures job specifications automatically, routes complex jobs to the appropriate specialist, and handles standard pricing enquiries without manual intervention. The result was a significant reduction in pre-sales administrative time and improved response times for all quote requests."
  },
  faqs: [
    { q: "Can AI reduce administration costs for Melbourne professional services firms?", a: "Yes — measurably. For a Melbourne professional services firm with 5–20 staff, a focused automation programme typically reduces administrative overhead by 15–30%, which at Melbourne professional wage rates translates to $30,000–$100,000 per year in cost savings or redeployed capacity. We always audit before we build, so you have a clear ROI estimate before committing." },
    { q: "How does AI automation work for Melbourne healthcare businesses?", a: "Melbourne healthcare businesses get the highest ROI from automation in three areas: appointment management (confirmation, reminders, cancellation handling), new patient intake (collecting medical history and insurance information before the consultation), and billing query handling (responding to standard invoice questions without involving clinical or admin staff). We build each of these as integrated systems, not standalone tools." },
    { q: "We are a Melbourne law firm. What specifically can AI automate?", a: "For Melbourne law firms, the highest-value automations are: initial client intake and matter qualification, document collection chasing, matter status updates to clients, billing narrative preparation, and compliance reporting. These are the processes that consume the most non-billable time in a typical Melbourne practice." },
    { q: "Can manufacturing businesses in Melbourne benefit from AI?", a: "Yes — particularly in compliance documentation, production reporting, and supplier communication. Manufacturing businesses have high documentation requirements and benefit significantly from systems that generate compliance records and reports automatically from production data, rather than requiring manual compilation." },
    { q: "How do you integrate AI systems with our existing Melbourne business software?", a: "We have experience integrating with the most common Australian business software: LEAP, Xero, MYOB, Salesforce, HubSpot, Microsoft 365, and various practice management and ERP systems. The integration approach is determined during the discovery phase — we map your current systems before designing anything." },
    { q: "Is AI automation suitable for small Melbourne businesses?", a: "Yes. Many of our Melbourne clients are businesses with 3–10 staff. Focused AI automations — a lead qualification agent or a customer service system — typically cost $3,000–$8,000 and deliver ROI within 3–6 months for a small business. We never recommend over-engineering — the scope is always matched to the size and maturity of the business." },
    { q: "How long does a typical Melbourne AI implementation take?", a: "A focused implementation — for example, a lead qualification agent for a Melbourne law firm — takes 4–6 weeks from discovery to go-live. A comprehensive operational automation programme takes 10–16 weeks. We build in stages, so you see results progressively." }
  ],
  ctaHeadline: "Book an AI Efficiency Audit for Your Melbourne Business",
  ctaSubtext: "Free 30-minute session. We review your current operations, identify where AI automation will have the highest impact, and give you a prioritised roadmap — no obligation.",
  seo: {
    title: "AI Automation Consultant Melbourne | AI Systems & Workflow Automation | Saabai",
    description: "Saabai builds AI automation systems for Melbourne businesses — professional services, healthcare, legal, and manufacturing. Reduce admin overhead and scale efficiently. Free strategy session.",
    ogTitle: "AI Automation Consultant Melbourne | Saabai",
    ogDescription: "Melbourne businesses: reduce admin costs, automate patient and client intake, and build operational leverage with AI. Saabai specialises in practical AI systems for Victorian businesses.",
    canonical: "https://www.saabai.ai/melbourne",
  },
};

// ── Perth ─────────────────────────────────────────────────────────────────────

export const PERTH: LocationConfig = {
  city: "Perth",
  slug: "perth",
  state: "Western Australia",
  stateCode: "WA",
  heroHeadline: "AI Automation for Perth and Western Australian Businesses",
  heroSubheading: "The resources boom is creating demand that Perth's service businesses are struggling to keep up with. AI automation is how leading WA businesses are scaling operations without scaling headcount.",
  industries: ["Mining & Resources", "Engineering & METS", "Industrial Services", "Construction", "Professional Services", "Logistics & Supply Chain"],
  marketContext: [
    "Perth is the operational hub for Australia's most significant resource economy. Western Australia's mining and resources sector — iron ore, gold, lithium, natural gas — drives demand for engineering, logistics, professional services, and industrial supply businesses that are among the most operationally complex in the country. The FIFO workforce model, remote site operations, and the scale of project-based work create administrative challenges that are genuinely unique to WA.",
    "The mining equipment, technology, and services (METS) sector in Perth is growing rapidly as resource companies invest in operational efficiency and digital transformation. Perth METS businesses are simultaneously managing complex technical service delivery, regulatory compliance, remote workforce coordination, and high volumes of project documentation. The administrative overhead is significant and largely manual.",
    "Perth's professional services sector — legal, accounting, financial advisory — is heavily influenced by the resource sector. Many Perth firms have deep expertise in mining law, resource taxation, and engineering compliance. This specialisation creates a specific administrative profile: high documentation volumes, complex compliance requirements, and client bases that operate on project timelines rather than traditional retainer arrangements.",
    "Distance from the east coast creates both a challenge and an opportunity for Perth businesses. The challenge is that east coast competitors can now serve WA clients digitally. The opportunity is that Perth businesses that build operationally efficient, digitally capable service delivery can compete nationally. AI automation is a core component of this capability."
  ],
  challengesIntro: "Perth businesses face operational challenges shaped by the resource sector, remote operations, and WA's unique workforce dynamics.",
  challenges: [
    { title: "FIFO workforce coordination is administratively intensive", detail: "Managing a fly-in fly-out workforce across remote sites in WA requires significant administrative infrastructure: scheduling, travel coordination, site inductions, compliance documentation, and communication management. Most Perth businesses managing FIFO operations are doing this manually, with significant coordination overhead and error rates." },
    { title: "Project documentation and compliance is overwhelming", detail: "Perth's engineering, construction, and mining services businesses operate in a highly regulated environment. Safety management plans, SWMS, environmental compliance documentation, and project reporting requirements generate enormous volumes of documentation that must be produced, reviewed, and filed. Most of this is still manual." },
    { title: "Technical service businesses cannot scale without hiring", detail: "Perth's METS businesses are in high demand but structurally unable to take on more work without hiring additional technical and administrative staff. With WA's tight labour market, hiring is slow and expensive. AI automation allows these businesses to handle more work without proportional headcount growth." },
    { title: "Remote site operations lack real-time visibility", detail: "Perth businesses managing operations at remote mine sites, construction projects, or regional infrastructure projects often lack real-time operational visibility. Reporting is manual, delayed, and inconsistent. AI systems that aggregate and present operational data automatically address this directly." },
    { title: "Resource sector clients expect rapid response", detail: "Perth's resource sector clients — major mining companies and their Tier 1 contractors — have very high service expectations. Response times, documentation quality, and reporting accuracy are measured and affect contract renewal. Perth service businesses that cannot meet these standards lose contracts to better-organised competitors." }
  ],
  howWeHelpIntro: "Saabai builds AI systems that address the specific operational challenges of Perth and Western Australian businesses — from FIFO coordination to compliance documentation to technical service scaling.",
  services: [
    { title: "Compliance Documentation Automation", detail: "We build AI systems that generate safety management plans, SWMS, environmental compliance documentation, and project reports automatically from structured input data. Perth engineering and construction businesses using these systems report 60–80% reductions in documentation preparation time." },
    { title: "Remote Workforce Coordination", detail: "AI systems that manage FIFO scheduling communications, site induction coordination, travel booking confirmation, and compliance check-ins. Reduces the administrative overhead of FIFO coordination significantly while improving the consistency and reliability of workforce management." },
    { title: "Technical Enquiry and Quote Management", detail: "An AI agent handles technical enquiry intake, captures job specifications, routes complex requirements to the appropriate specialist, and manages the quote follow-up process. Perth METS businesses use this to manage higher enquiry volumes without additional sales staff." },
    { title: "Project Reporting Automation", detail: "We build systems that aggregate data from your existing project management and site operations tools and generate consistent, accurate project reports automatically. Resource sector clients receive timely, professional reports without manual compilation by your team." },
    { title: "Customer Service and Communications", detail: "AI agents handle standard client enquiries, status update requests, and document delivery — freeing your Perth team to focus on the technical and relationship work that requires their expertise." },
    { title: "AI Operational Audit — Resource Sector Specialist", detail: "A structured review of your Perth business's operations with specific focus on the documentation, compliance, and coordination challenges common in the resource services sector. Delivers a prioritised implementation roadmap with quantified ROI estimates." }
  ],
  caseStudy: {
    client: "PlasticOnline (Holland Plastics)",
    industry: "Industrial Supply — National, including WA operations",
    context: "Holland Plastics supplies industrial plastics to resource sector businesses across Australia, including significant WA and remote site operations. Managing pricing enquiries, product specifications, and order coordination for remote site deliveries was a significant administrative burden on their team.",
    outcome: "Saabai built Rex, an AI agent that handles all standard product enquiries and cut-to-size pricing calculations instantly. For resource sector clients — including WA-based businesses ordering for remote sites — Rex provides immediate, accurate pricing and product information at any hour, reducing the sales team's administrative load materially."
  },
  faqs: [
    { q: "Can AI help Perth businesses manage FIFO workforce administration?", a: "Yes — FIFO coordination is one of the most document-intensive and time-consuming administrative challenges for Perth businesses, and it is highly automatable. The scheduling communications, site induction coordination, travel confirmation, and compliance check-in components are all rule-based processes that AI handles reliably. We have designed systems for businesses managing 20 to 200+ FIFO personnel." },
    { q: "How can AI help with mining and resource sector compliance documentation?", a: "Resource sector compliance documentation — SWMS, safety management plans, environmental compliance reports — follows structured formats and draws on consistent underlying information. AI systems can generate these documents automatically from structured input, reducing preparation time by 60–80%. The output requires review and sign-off by your team, but the manual drafting work is eliminated." },
    { q: "We are a Perth METS business. How does AI help us scale?", a: "The primary lever for METS businesses is handling higher enquiry and quote volumes without proportional hiring. An AI system that captures technical enquiries, qualifies scope, gathers specifications, and manages the quote follow-up process allows a small Perth sales team to handle significantly more pipeline. Secondary levers are in compliance documentation and project reporting automation." },
    { q: "Do you have experience working with resource sector businesses in Perth?", a: "Yes. We understand the specific compliance environment, documentation requirements, and client service expectations of Perth's resource services sector. We have worked with businesses supplying equipment, services, and expertise to Australia's mining and resources industry." },
    { q: "How does Saabai work with Perth businesses given the time zone difference from the east coast?", a: "We work with clients nationally and manage time zone differences without issue. Perth client sessions are typically scheduled for early morning or late afternoon to accommodate WA time. All documentation, design work, and implementation is conducted remotely. The time zone has never been a barrier to a successful engagement." },
    { q: "What is the typical cost for a Perth business?", a: "A focused automation — for example, a compliance document generation system for a Perth engineering business — typically costs $5,000–$15,000 depending on complexity. At WA resource sector wages, this is typically recovered within 2–4 months. We always audit first to confirm the ROI case." },
    { q: "Can small Perth businesses benefit, or is this only for large companies?", a: "Small Perth businesses often have the clearest ROI cases. A 5-person engineering services business managing FIFO logistics and compliance documentation manually is carrying a disproportionate administrative burden. A focused automation programme gives a small team the operational capacity of a much larger one. Most of our Perth clients have between 3 and 30 staff." }
  ],
  ctaHeadline: "Book an AI Strategy Session for Your Perth Business",
  ctaSubtext: "Free 30-minute session. We understand the WA business environment and the specific challenges of resource sector operations. No obligation — just a clear picture of what AI can do for your business.",
  seo: {
    title: "AI Automation Consultant Perth | AI Systems & Workflow Automation | Saabai",
    description: "Saabai builds AI automation systems for Perth and WA businesses — mining services, engineering, METS, and professional services. FIFO coordination, compliance automation. Free strategy session.",
    ogTitle: "AI Automation Consultant Perth | Saabai",
    ogDescription: "Perth businesses: automate compliance documentation, FIFO coordination, and technical enquiry management with AI. Saabai builds practical systems for WA's resource sector and beyond.",
    canonical: "https://www.saabai.ai/perth",
  },
};

// ── Adelaide ──────────────────────────────────────────────────────────────────

export const ADELAIDE: LocationConfig = {
  city: "Adelaide",
  slug: "adelaide",
  state: "South Australia",
  stateCode: "SA",
  heroHeadline: "AI Automation for Adelaide and South Australian Businesses",
  heroSubheading: "Adelaide's defence, manufacturing, and professional services sectors are experiencing a period of significant growth. AI automation is how SA businesses are building the operational capacity to capture it.",
  industries: ["Defence Industry", "Advanced Manufacturing", "Engineering", "Professional Services", "Food & Beverage", "Health & Life Sciences"],
  marketContext: [
    "Adelaide is undergoing a significant economic transformation. The defence industry — anchored by the Australian Submarine Agency and a growing ecosystem of defence primes and subcontractors in the northern suburbs — has created a new category of high-growth SA businesses operating in one of the most compliance-intensive sectors in the country. The administrative and documentation requirements of the defence sector are unlike anything in the broader Australian business environment.",
    "South Australia's advanced manufacturing sector is modernising rapidly. The concentration of food processing, wine industry, industrial manufacturing, and engineering businesses in Greater Adelaide is significant, and many are investing in operational efficiency as competitive pressure from overseas manufacturers increases. AI automation is playing a growing role in this modernisation — in quality documentation, production reporting, and supply chain coordination.",
    "Adelaide's professional services sector is smaller than Sydney or Melbourne by firm count but punches above its weight in specialisation. SA law firms, accounting practices, and advisory businesses have deep expertise in areas relevant to the defence and manufacturing sectors — government contracting, compliance, IP, and M&A. These firms are increasingly using AI to handle the administrative volume that comes with serving growing defence and industrial clients.",
    "The cost of business in Adelaide is materially lower than Sydney or Melbourne, which creates a different ROI profile for AI automation. The efficiency case is less about wage cost reduction and more about capacity expansion — being able to handle more work, more clients, and more complexity without proportionally growing the team."
  ],
  challengesIntro: "Adelaide businesses in defence, manufacturing, and professional services face specific operational challenges driven by compliance requirements and growth-phase capacity pressure.",
  challenges: [
    { title: "Defence sector compliance documentation is extraordinarily demanding", detail: "Adelaide businesses working in or adjacent to the defence sector face documentation and compliance requirements that are substantially more demanding than the general commercial environment. Security requirements, quality management system documentation, tender preparation, and contract compliance reporting are resource-intensive and largely manual." },
    { title: "Manufacturing businesses are managing quality and compliance manually", detail: "Adelaide's advanced manufacturing sector operates under significant quality management requirements — ISO standards, food safety compliance, environmental reporting. Most SA manufacturing businesses are managing these requirements with manual documentation processes that are slow, error-prone, and resource-intensive." },
    { title: "Professional services firms are capacity-constrained at a growth inflection point", detail: "Adelaide's professional services firms serving the defence and manufacturing sectors are in high demand but struggling to take on new clients without hiring. Adding experienced professionals in Adelaide's tight market is slow and expensive. Automation allows existing teams to handle more without adding headcount." },
    { title: "Tender and proposal preparation is consuming senior time", detail: "For Adelaide businesses pursuing government contracts, defence tenders, and major project bids, proposal preparation is one of the most time-consuming activities in the business. Senior technical and commercial staff spend weeks on tenders that require significant repetitive document assembly alongside genuinely differentiated content." },
    { title: "Food and beverage businesses face complex supply chain coordination", detail: "South Australia's food processing and wine industry businesses manage complex seasonal supply chains with significant compliance and certification requirements. The administrative overhead — supplier coordination, certification documentation, export compliance, and product traceability — is substantial and primarily manual." }
  ],
  howWeHelpIntro: "Saabai builds AI systems for Adelaide's defence, manufacturing, and professional services businesses — focused on the compliance documentation, capacity expansion, and process automation that SA businesses need most.",
  services: [
    { title: "Defence Compliance Documentation Systems", detail: "We build AI systems that assist with the preparation of quality management documentation, compliance records, and tender support materials for Adelaide defence sector businesses. The system assembles structured components from your existing documentation library, dramatically reducing the time required for compliance document preparation." },
    { title: "Manufacturing Quality and Compliance Automation", detail: "AI systems that generate quality management records, compliance reports, production documentation, and supplier communication automatically from structured data. SA manufacturing businesses using these systems report 50–70% reductions in quality administration time." },
    { title: "Tender and Proposal Assistance", detail: "AI systems that accelerate the assembly of government and commercial tender responses — drawing on your existing capability statements, project histories, and technical documentation to populate standard sections, leaving your team to focus on the differentiated content that wins contracts." },
    { title: "Professional Services Intake and Client Management", detail: "For Adelaide professional services firms, we build AI systems that handle client intake, document collection, matter status communication, and routine client correspondence — freeing partners and senior staff for the complex, billable work." },
    { title: "Supply Chain Coordination Automation", detail: "For Adelaide food and beverage businesses, we build AI-assisted systems that manage supplier communications, certification tracking, delivery coordination, and compliance documentation for export markets." },
    { title: "AI Readiness Assessment — SA Business Specialist", detail: "A structured review of your Adelaide business's current operations, with specific attention to the compliance, documentation, and capacity challenges common in SA's defence and manufacturing sectors. Delivers a prioritised roadmap with quantified ROI estimates." }
  ],
  caseStudy: {
    client: "Tributum Law",
    industry: "Tax and Trust Law — Adelaide",
    context: "Tributum Law, a specialist tax and trust law firm in Adelaide, needed a client intake system that could handle enquiries from potential clients dealing with complex ATO matters — often arriving after hours, in distress, and needing immediate acknowledgement and triage.",
    outcome: "Saabai built Lex, an AI intake agent trained on Tributum's practice areas and intake requirements. Lex handles every inbound enquiry 24/7 — qualifying the matter, capturing key facts, assessing urgency, and ensuring no potential client slips through after hours. The firm now receives a structured brief for every new enquiry before the first call, and no after-hours contact goes unacknowledged."
  },
  faqs: [
    { q: "Can AI help Adelaide businesses working in the defence sector?", a: "Yes — and this is an area where we have given specific thought to the SA defence ecosystem. Defence sector businesses face compliance and documentation requirements that are uniquely demanding. AI systems can assist with quality management documentation, compliance record generation, and tender support materials, within appropriate security and information handling frameworks." },
    { q: "How does AI automation help Adelaide manufacturing businesses?", a: "Manufacturing businesses in SA benefit most from automation in three areas: quality management documentation (ISO records, batch records, compliance certificates), production reporting (automated generation from production data), and supplier communications (automated coordination, certification requests, delivery scheduling). These automations typically deliver 50–70% reductions in quality administration time." },
    { q: "Can AI help Adelaide professional services firms take on more clients?", a: "This is exactly the use case for Adelaide professional services firms at the current growth inflection point. AI handles the administrative volume — intake, document collection, status updates, routine correspondence — so your existing team can serve more clients without proportional hiring. We have built these systems for Adelaide law firms, accounting practices, and advisory businesses." },
    { q: "How does Saabai work with Adelaide businesses?", a: "Primarily remotely. Adelaide client sessions are conducted via video conference. We have worked with businesses across Greater Adelaide, the northern suburbs defence corridor, and the Barossa and McLaren Vale regions. Time zone is not an issue — we work across all Australian time zones." },
    { q: "What is the typical cost for an Adelaide business?", a: "Adelaide's lower cost base compared to Sydney and Melbourne means the ROI calculation is often more about capacity expansion than cost reduction. A focused automation for an Adelaide professional services firm typically costs $4,000–$12,000. For manufacturing compliance automation, $6,000–$20,000 depending on complexity. ROI is typically achieved within 4–8 months." },
    { q: "Are there data security considerations for defence-related Adelaide businesses?", a: "Yes, and we take these seriously. We design systems with appropriate data handling frameworks and can accommodate specific security requirements. For businesses with DISP membership or handling classified or sensitive defence information, we discuss information architecture carefully during the discovery phase." },
    { q: "Does AI make sense for small Adelaide businesses, or only larger firms?", a: "Small Adelaide businesses — particularly in professional services and manufacturing — often have the clearest ROI cases. A 6-person law firm spending 20% of its time on administrative tasks that AI can handle is carrying a significant efficiency deficit. A targeted automation programme addresses this directly without requiring large-scale technology investment." }
  ],
  ctaHeadline: "Book an AI Strategy Session for Your Adelaide Business",
  ctaSubtext: "Free 30-minute session. We understand SA's defence, manufacturing, and professional services environment. No obligation — just a clear picture of what AI can do for your business.",
  seo: {
    title: "AI Automation Consultant Adelaide | AI Systems & Workflow Automation | Saabai",
    description: "Saabai builds AI automation systems for Adelaide and SA businesses — defence, manufacturing, professional services. Compliance automation, capacity expansion. Free strategy session.",
    ogTitle: "AI Automation Consultant Adelaide | Saabai",
    ogDescription: "Adelaide businesses: automate defence compliance documentation, manufacturing quality records, and professional services intake with AI. Saabai builds practical AI systems for SA businesses.",
    canonical: "https://www.saabai.ai/adelaide",
  },
};

// ── Canberra ──────────────────────────────────────────────────────────────────

export const CANBERRA: LocationConfig = {
  city: "Canberra",
  slug: "canberra",
  state: "Australian Capital Territory",
  stateCode: "ACT",
  heroHeadline: "AI Automation for Canberra and ACT Businesses",
  heroSubheading: "Canberra's economy is built on government, consulting, and professional services. The businesses growing fastest are those that have built operational systems to handle government-scale documentation and compliance requirements efficiently.",
  industries: ["Government Consulting", "ICT Services", "Professional Services", "Defence Contractors", "Legal", "Research & Education"],
  marketContext: [
    "Canberra is unlike every other Australian city. The federal government and its ecosystem of contractors, consultants, and professional services providers creates a business environment where documentation volume, procurement processes, and compliance requirements are orders of magnitude more intensive than the general commercial market. A Canberra consulting firm pursuing a single federal government contract may need to produce more documentation for one tender response than a comparable Sydney firm produces in a full quarter of commercial work.",
    "The ACT's ICT services sector is the largest per-capita in Australia, driven by federal government digital transformation programmes. Canberra technology businesses — systems integrators, managed service providers, software developers — are simultaneously managing government project delivery, commercial work, and the administrative overhead of operating within the APS procurement framework. The compliance and documentation burden is significant.",
    "Canberra's professional services sector is heavily skewed toward government clients. Law firms, accounting practices, and management consultancies in the ACT are expert at navigating government procurement but face administrative challenges that are unique to this client base: elaborate panel arrangements, detailed reporting requirements, and the complexity of multi-department engagements.",
    "The concentration of highly skilled professionals in Canberra — across government, consulting, research, and the technology sector — creates a labour market where experienced staff are expensive and in high demand. AI automation is particularly valuable here: the ROI is not just in cost reduction but in allowing Canberra businesses to deploy their expensive, highly skilled staff on the work that genuinely requires them."
  ],
  challengesIntro: "Canberra businesses face documentation, procurement, and compliance challenges that are unique to the government-adjacent operating environment.",
  challenges: [
    { title: "Government tender preparation consumes disproportionate senior time", detail: "Canberra consulting and professional services businesses spend enormous resources preparing responses to government tenders and RFPs. A single federal government tender response can require 200–500 pages of documentation, much of which is structured, repetitive content that draws on existing capability statements and methodology documents. Senior staff are writing boilerplate when they should be doing billable work." },
    { title: "Contract compliance and reporting is relentless", detail: "Government contracts in the ACT typically carry detailed reporting requirements: progress reports, financial acquittals, milestone documentation, performance evidence, and compliance certificates. For Canberra businesses managing multiple government contracts, this reporting overhead is a significant operational burden." },
    { title: "Panel arrangement administration is complex", detail: "Many Canberra businesses operate under multiple government panel arrangements — SON, PIPP, ICT panels, professional services panels. Managing panel compliance, rate card maintenance, and the administrative requirements of each panel is a specialised overhead that small ACT businesses manage manually." },
    { title: "Knowledge management is inefficient", detail: "Canberra consulting and ICT businesses accumulate significant institutional knowledge — methodology documents, project experiences, staff capabilities, technical documentation. This knowledge is typically stored in file shares and SharePoint libraries that make retrieval slow and inconsistent. When a new tender requires a relevant case study, finding it takes hours." },
    { title: "Staff costs in Canberra are high relative to the national average", detail: "ACT wages, particularly for ICT and professional services professionals, are among the highest in Australia. The cost of deploying experienced Canberra professionals on administrative work — documentation assembly, report formatting, compliance checking — is significant. Every administrative hour that can be automated at a fraction of human cost is a meaningful efficiency gain." }
  ],
  howWeHelpIntro: "Saabai builds AI systems specifically useful for Canberra's government-adjacent business environment — from tender support to contract compliance to knowledge management.",
  services: [
    { title: "Tender and Proposal Assistance Systems", detail: "AI systems that accelerate the assembly of government tender responses by drawing on your existing capability statements, project histories, methodology documents, and staff profiles. Structured sections are assembled automatically; your team focuses on the differentiating content. Canberra businesses using these systems report 40–60% reductions in tender preparation time." },
    { title: "Contract Compliance and Reporting Automation", detail: "AI systems that generate government contract progress reports, financial acquittals, and milestone documentation from structured operational data. For Canberra businesses managing 5–20 active government contracts, this automation can recover 15–25 hours per week in report preparation time." },
    { title: "Knowledge Management and Retrieval", detail: "We build AI systems that index your Canberra business's institutional knowledge — project experiences, methodologies, technical documentation, staff CVs — and make it instantly searchable and retrievable. Finding the right case study for a tender takes seconds rather than hours." },
    { title: "Internal Process Automation", detail: "For Canberra ICT and professional services businesses, we automate the internal processes that support government delivery: timesheets and billing preparation, staff allocation communications, subcontractor management, and procurement coordination." },
    { title: "Client Communication and Stakeholder Management", detail: "AI-assisted tools for managing the complex stakeholder communication requirements of government engagements — status updates, meeting scheduling, action item tracking, and stakeholder reporting — with the consistency and audit trail that government clients expect." },
    { title: "AI Strategy for Government-Facing Businesses", detail: "Strategic guidance on how Canberra businesses can use AI within the constraints of the government operating environment — including APS data handling requirements, privacy obligations, and the specific procurement and contracting context of federal government work." }
  ],
  caseStudy: {
    client: "LocalSearch",
    industry: "Digital Marketing & Business Services — National",
    context: "LocalSearch, which serves small businesses nationally including a significant ACT and federal territory client base, was looking to identify AI automation opportunities that would improve their operational efficiency and client service delivery across a complex, multi-service business.",
    outcome: "Saabai conducted a comprehensive operational audit and produced a prioritised AI implementation roadmap. The process identified specific workflow automation opportunities and provided the LocalSearch team with a framework for evaluating and prioritising AI tools across their operations — a structured approach to AI adoption rather than ad hoc experimentation."
  },
  faqs: [
    { q: "Can AI help Canberra businesses prepare government tender responses faster?", a: "Yes — and this is the highest-value automation we build for ACT businesses. A tender support AI system draws on your existing capability statements, project experiences, and methodology documents to assemble the structured sections of tender responses automatically. Your team then focuses on the differentiated content. Canberra businesses using these systems consistently report 40–60% reductions in tender preparation time." },
    { q: "How does AI handle government-specific reporting requirements?", a: "Government contract reporting follows consistent structures that are well-suited to automation. AI systems that know your project data, milestones, and financial position can generate draft progress reports, financial acquittals, and compliance certificates automatically. Your team reviews and approves — the drafting work is eliminated. This typically saves 15–25 hours per week for Canberra businesses managing multiple government contracts." },
    { q: "Are there data handling constraints we need to be aware of for government-related AI systems?", a: "Yes, and this is an important consideration. We design AI systems with appropriate data handling frameworks for government-adjacent businesses — including data residency considerations, information classification, and the specific requirements of APS privacy and security policies. We discuss these requirements in detail during the discovery phase." },
    { q: "Can AI help Canberra businesses manage knowledge from past government projects?", a: "Absolutely. Institutional knowledge is one of the most valuable and most poorly managed assets in Canberra consulting businesses. We build AI systems that index your project experiences, methodologies, and technical documentation and make them instantly searchable. When a new tender requires a relevant case study from 3 years ago, the system finds it in seconds." },
    { q: "We operate under multiple panel arrangements. Can AI help manage this?", a: "Panel compliance management is administratively intensive for Canberra businesses, and parts of it are automatable. Rate card maintenance, compliance certificate tracking, panel reporting, and administrative notice management can all be systematised. We have worked with ACT businesses managing multiple AusTender panel arrangements." },
    { q: "How does Saabai work with Canberra businesses?", a: "Primarily remotely via video conference — which works well for most ACT engagements. For larger consulting businesses with complex operational environments, on-site workshops during the discovery phase can add value. We are familiar with the Canberra business environment, including the government procurement context that shapes most ACT businesses' operations." },
    { q: "What is the typical investment for a Canberra business?", a: "A focused tender support or compliance reporting automation for an ACT consulting business typically costs $6,000–$18,000 depending on complexity. At Canberra professional wage rates, this is recovered within 2–4 months through time savings on tender preparation and contract reporting alone." }
  ],
  ctaHeadline: "Book an AI Strategy Session for Your Canberra Business",
  ctaSubtext: "Free 30-minute session. We understand the government-adjacent business environment in the ACT. No obligation — just a clear picture of what AI can do for your Canberra business.",
  seo: {
    title: "AI Automation Consultant Canberra | AI Systems & Government Consulting Automation | Saabai",
    description: "Saabai builds AI automation systems for Canberra and ACT businesses — government consulting, ICT, professional services. Tender support, compliance automation. Free strategy session.",
    ogTitle: "AI Automation Consultant Canberra | Saabai",
    ogDescription: "Canberra businesses: automate tender preparation, government contract reporting, and knowledge management with AI. Saabai builds practical AI systems for ACT's professional services sector.",
    canonical: "https://www.saabai.ai/canberra",
  },
};

// ── Darwin ─────────────────────────────────────────────────────────────────────

export const DARWIN: LocationConfig = {
  city: "Darwin",
  slug: "darwin",
  state: "Northern Territory",
  stateCode: "NT",
  heroHeadline: "AI Automation for Darwin and Northern Territory Businesses",
  heroSubheading: "Darwin is a regional operations hub for some of Australia's most complex logistics, infrastructure, and resource projects. AI automation helps NT businesses manage remote operations, coordinate teams, and handle the admin that comes with operating at scale in a challenging environment.",
  industries: ["Mining & Resources", "Construction & Infrastructure", "Logistics & Supply Chain", "Government Services", "Tourism", "Defence"],
  marketContext: [
    "Darwin's economy is shaped by geography, infrastructure, and resources. As the closest major Australian city to Southeast Asia, Darwin is a gateway for trade, resources, and logistics connecting the Northern Territory's vast resource base to Asian markets. The businesses operating in this environment — logistics companies, infrastructure contractors, mining services businesses, and defence contractors — face operational complexity that is genuinely unique in the Australian context.",
    "The Northern Territory's infrastructure investment cycle is significant. Defence spending in the Top End, remote community infrastructure, road and rail development, and the LNG sector create a sustained demand for construction, engineering, and professional services that Darwin businesses are well-positioned to serve — if their operations can scale to match the opportunity.",
    "Darwin's tourism sector is highly seasonal, with the Dry Season (May–October) delivering significantly higher visitor numbers than the Wet Season. Businesses that can maintain consistent service quality and operational efficiency across this seasonal swing — particularly in hospitality, tours, and accommodation — have a significant competitive advantage.",
    "The distance from major Australian centres creates a specific operating challenge for Darwin businesses: managing relationships, coordinating supply chains, and communicating with clients, suppliers, and partners who are often thousands of kilometres away. AI automation helps Darwin businesses build communication and coordination systems that work at distance, without requiring additional administrative staff."
  ],
  challengesIntro: "Darwin businesses face operational challenges shaped by remoteness, seasonality, workforce availability, and the scale of operations they are expected to manage.",
  challenges: [
    { title: "Remote workforce management is administratively demanding", detail: "Darwin businesses managing remote site operations — across NT mine sites, offshore platforms, and remote community infrastructure — face significant workforce coordination challenges. Travel scheduling, site inductions, compliance documentation, and workforce communication are intensive manual processes." },
    { title: "Seasonal tourism swings create staffing and demand management challenges", detail: "Darwin's Dry Season tourism peak creates demand spikes that small hospitality and tourism businesses cannot manage efficiently with fixed staffing. Enquiry volumes increase dramatically, and the cost of responding to every enquiry manually during peak season is prohibitive." },
    { title: "Supply chain coordination across remote distances is complex", detail: "Darwin logistics and supply chain businesses coordinate suppliers, carriers, and delivery schedules across vast distances, often to remote sites without reliable communications. The administrative overhead of this coordination is significant and largely manual." },
    { title: "Darwin's labour market is tight and expensive", detail: "Attracting and retaining administrative and professional staff in Darwin is challenging. Turnover is high and recruitment is slow. Businesses that reduce their dependence on volume administrative staffing through automation are less exposed to this volatility." },
    { title: "Infrastructure and construction projects generate enormous documentation requirements", detail: "NT construction and infrastructure businesses working on government and resource sector projects face detailed documentation requirements — safety management plans, environmental compliance, progress reporting, and contract administration. These are largely manual processes consuming significant staff time." }
  ],
  howWeHelpIntro: "Saabai builds AI systems that help Darwin businesses manage remote operations, coordinate teams across distance, handle seasonal demand efficiently, and reduce administrative overhead in a challenging environment.",
  services: [
    { title: "Remote Operations Coordination", detail: "AI systems that manage remote site workforce communications, compliance check-ins, scheduling coordination, and status reporting. Darwin businesses managing remote NT operations use these systems to maintain consistent communication and compliance without proportional administrative overhead." },
    { title: "Tourism Enquiry Management", detail: "An AI agent handles all inbound tourism enquiries — availability, pricing, booking questions, customisation requests — instantly, 24/7. During Dry Season peaks, no lead is missed. During the Wet Season, the system maintains consistent response without the cost of full-time enquiry handling staff." },
    { title: "Compliance Documentation Automation", detail: "For Darwin construction, mining services, and infrastructure businesses, we build AI systems that generate safety documentation, environmental compliance records, and project reports automatically. The manual compilation work is eliminated; your team reviews and approves." },
    { title: "Logistics and Supply Chain Coordination", detail: "AI-assisted coordination systems for Darwin logistics businesses — automated supplier communications, delivery scheduling, status updates to remote sites, and compliance documentation for cross-border shipments." },
    { title: "Customer and Stakeholder Communication", detail: "AI systems that manage consistent communications with clients, government stakeholders, and partners across the distances inherent in NT operations. Status updates, milestone communications, and routine correspondence run automatically." },
    { title: "NT Business Operational Audit", detail: "A structured review of your Darwin business's operations — with specific attention to the remote operations, seasonal demand, and workforce challenges unique to the NT business environment. Delivers a prioritised roadmap of automation opportunities." }
  ],
  caseStudy: {
    client: "PlasticOnline (Holland Plastics)",
    industry: "Industrial Supply — National, including remote NT supply",
    context: "Holland Plastics supplies industrial materials to resource sector operations nationally, including remote NT sites. Managing enquiries, specifications, and order coordination for remote site deliveries — often to locations with limited communications — required significant administrative effort.",
    outcome: "Saabai built Rex, an AI agent handling all standard product enquiries and pricing calculations instantly. Resource sector clients in remote NT locations can get accurate pricing and product information immediately, at any hour, without requiring a staff member to be available. The system also captures all enquiries into the CRM automatically, ensuring no lead from remote operations is lost."
  },
  faqs: [
    { q: "Do you work with Darwin businesses remotely?", a: "Yes — and the remote model works well for Darwin businesses. All discovery, design, and implementation work is conducted via video conference. We have experience working with businesses in Darwin, Alice Springs, and remote NT locations. The time zone (30 minutes behind Brisbane) is not an operational issue." },
    { q: "Can AI help Darwin tourism businesses manage the Dry Season demand spike?", a: "This is one of the clearest applications we see for Darwin businesses. During the Dry Season, tourism and hospitality businesses face enquiry volumes that their small teams cannot manage manually without significant cost. An AI agent handling all standard enquiries instantly, 24 hours a day, gives small Darwin tourism businesses the capacity of a large enquiry team without the wage cost." },
    { q: "We manage remote site operations in the NT. Can AI help with coordination?", a: "Yes. Remote site operations in the NT involve significant coordination overhead — workforce scheduling, compliance communications, supply coordination, and status reporting. AI systems can manage the structured communication components of this coordination automatically, freeing your operations team to focus on the genuinely complex decisions." },
    { q: "How does AI help with NT construction and infrastructure compliance documentation?", a: "Construction and infrastructure projects in the NT have detailed safety and compliance documentation requirements. AI systems can generate safety management plans, SWMS, environmental compliance records, and progress reports automatically from structured input data. Darwin businesses using these systems report significant reductions in documentation preparation time." },
    { q: "Is AI automation cost-effective for a Darwin business?", a: "The ROI case for Darwin businesses is strong because the labour market challenges make manual administrative staffing particularly expensive and unreliable. A focused automation programme that reduces dependence on administrative headcount delivers not just cost savings but operational resilience — the system works consistently regardless of staff turnover." },
    { q: "What AI systems are most useful for Darwin businesses specifically?", a: "Based on the Darwin business environment, the highest-value applications are: remote workforce coordination systems, seasonal tourism enquiry handling, compliance documentation automation for construction and mining services, and logistics coordination tools. We always audit first to confirm which of these delivers the highest ROI for your specific NT business." },
    { q: "How long does implementation take for a Darwin business?", a: "A focused implementation — a tourism enquiry agent or a compliance documentation system — takes 4–6 weeks. More comprehensive operational automation for a Darwin construction or logistics business takes 8–14 weeks. Implementation is fully remote, so Darwin's location does not extend the timeline." }
  ],
  ctaHeadline: "Book a Free AI Strategy Session for Your Darwin Business",
  ctaSubtext: "Free 30-minute session. We understand the NT business environment — remote operations, seasonal demand, and the specific challenges of doing business at distance. No obligation.",
  seo: {
    title: "AI Automation Consultant Darwin | AI Systems & Workflow Automation | Saabai",
    description: "Saabai builds AI automation systems for Darwin and NT businesses — remote operations, tourism, construction, and logistics. Compliance automation, enquiry handling. Free strategy session.",
    ogTitle: "AI Automation Consultant Darwin | Saabai",
    ogDescription: "Darwin businesses: automate remote site coordination, handle tourism enquiries 24/7, and reduce compliance documentation overhead with AI. Saabai builds practical AI systems for NT businesses.",
    canonical: "https://www.saabai.ai/darwin",
  },
};

// ── Hobart ─────────────────────────────────────────────────────────────────────

export const HOBART: LocationConfig = {
  city: "Hobart",
  slug: "hobart",
  state: "Tasmania",
  stateCode: "TAS",
  heroHeadline: "AI Automation for Hobart and Tasmanian Businesses",
  heroSubheading: "Hobart's growing economy — tourism, professional services, and a thriving small business community — creates real opportunity for businesses that can operate efficiently. AI automation gives Tasmanian businesses the operational leverage to grow without proportionally growing their costs.",
  industries: ["Tourism & Hospitality", "Professional Services", "Food & Beverage", "Construction", "Healthcare", "Education & Research"],
  marketContext: [
    "Hobart has experienced significant economic growth over the past decade, driven by a tourism boom that has transformed the city's hospitality, accommodation, and experience sectors. The combination of MONA's cultural pull, a world-class food and wine scene, and growing interest in Tasmanian wilderness experiences has created a new generation of hospitality and tourism businesses that are managing levels of demand and operational complexity they were not originally built for.",
    "Tasmania's professional services sector — legal, accounting, financial advisory — is concentrated in Hobart and serves both private clients and a significant state government business base. These firms are typically smaller than their mainland counterparts, run lean, and feel the impact of administrative overhead more acutely. A single lawyer spending 30% of their time on admin that AI could handle loses significantly more proportional capacity than a large city firm with dedicated administrative support.",
    "The Tasmanian food and beverage sector — including some of Australia's most acclaimed producers of wine, whisky, cheese, and seafood — faces complex supply chain, export compliance, and direct-to-consumer marketing requirements. Many of these businesses are artisan in character but dealing with the administrative complexity of businesses ten times their size.",
    "Hobart's tight labour market and geographic constraints make it harder than most Australian cities to hire administrative staff. Business owners frequently end up performing administrative tasks themselves — answering enquiries after hours, chasing invoices, managing bookings — because the alternative is tasks not getting done. AI automation addresses this directly."
  ],
  challengesIntro: "Hobart businesses face a specific combination of high demand relative to team size, labour market constraints, and the particular operational challenges of Tasmania's tourism and food economy.",
  challenges: [
    { title: "Tourism demand is exceeding operational capacity", detail: "Hobart's tourism growth has been extraordinary, and many hospitality and experience businesses are struggling to manage enquiry volumes, booking coordination, and guest communications at scale. Small teams that were adequate for pre-boom demand are overwhelmed during peak periods, and the cost of hiring additional permanent staff for seasonal peaks is not economically viable." },
    { title: "Business owners are doing their own admin", detail: "Hobart's small business community is characterised by owner-operators running lean. In many cases, the business owner is answering enquiries at 10pm, chasing invoices on weekends, and managing bookings when they should be focusing on the actual business. This is not sustainable and creates a ceiling on growth." },
    { title: "Labour market is tight", detail: "Attracting and retaining administrative and hospitality staff in Hobart is difficult. Turnover is high, recruitment is slow, and the cost of a reliable admin person is material for a small Hobart business. AI automation reduces the dependence on volume administrative staffing." },
    { title: "Food and beverage export administration is complex", detail: "Tasmanian food and beverage businesses exporting to mainland Australia and international markets face documentation requirements — certifications, compliance records, logistics coordination, customer communications — that are disproportionate to their team size. Most are managing this manually." },
    { title: "Professional services firms are capacity-constrained", detail: "Hobart's law firms, accounting practices, and advisory businesses are running near capacity, turning away work they could take if their existing teams were not spending significant time on administrative processes that AI could handle." }
  ],
  howWeHelpIntro: "Saabai builds AI systems for Hobart and Tasmanian businesses that reduce the administrative overhead on small teams, handle enquiries consistently at any hour, and create the operational leverage that allows growth without proportional cost increases.",
  services: [
    { title: "Tourism Enquiry and Booking Management", detail: "AI agents that handle all inbound tourism, accommodation, and experience enquiries — availability, pricing, booking questions, customisation requests — instantly, around the clock. Hobart tourism businesses using this system report significant reductions in missed leads and near-elimination of after-hours enquiry backlog." },
    { title: "Small Business Administrative Automation", detail: "We identify and automate the administrative tasks that are consuming business owner time in Hobart SMEs — invoice follow-up, appointment scheduling, customer follow-up, status updates, and routine communications. Business owners report recovering 8–15 hours per week from these automations." },
    { title: "Customer Service AI Agents", detail: "A trained AI agent handles all tier-one customer enquiries for Hobart businesses — FAQs, availability, pricing, booking questions, and standard policy information. Reduces inbound customer service volume by 40–60% while improving response times." },
    { title: "Professional Services Intake and Client Management", detail: "For Hobart law firms, accounting practices, and advisory businesses, we build AI systems that handle client intake, document collection, matter status communications, and routine client correspondence — freeing professional staff for the billable work." },
    { title: "Food and Beverage Operations Automation", detail: "For Hobart's food producers, wineries, distilleries, and hospitality businesses, we build automation for the administrative burden specific to this sector: wholesale order management, certification tracking, export documentation, and distributor communications." },
    { title: "AI Readiness Assessment — Tasmanian Business Specialist", detail: "A structured review of your Hobart business's current operations. We identify exactly where AI automation will have the highest impact — the tasks consuming the most time for the least strategic value — and deliver a prioritised roadmap specific to your business." }
  ],
  caseStudy: {
    client: "Tributum Law",
    industry: "Tax and Trust Law — Adelaide (comparable professional services context)",
    context: "Tributum Law, a specialist professional services firm, needed a reliable system to handle after-hours enquiries and ensure every potential client received an immediate, professional response — regardless of when they contacted the firm. This is a common challenge for small Hobart professional services firms.",
    outcome: "Saabai built an AI intake agent that handles every inbound enquiry 24/7 — qualifying the matter, capturing key information, and ensuring the partner has a full brief before the first call. No enquiry is missed, no potential client experiences silence. The system is now a core part of how the firm manages its intake process."
  },
  faqs: [
    { q: "Can AI help small Hobart businesses manage their admin workload?", a: "Yes — and this is where AI delivers the clearest value for Hobart businesses. A small team or owner-operator spending 20–30% of their time on admin that AI can handle is carrying a significant efficiency deficit. A focused automation programme — lead qualification, customer enquiry handling, invoice follow-up — typically recovers 8–15 hours per week for Hobart small business owners within 60 days of go-live." },
    { q: "How can AI help Hobart tourism and hospitality businesses?", a: "Tourism businesses in Hobart benefit most from AI in two areas: enquiry handling (24/7 availability to answer availability, pricing, and booking questions instantly) and guest communications (automated pre-arrival, arrival day, and post-stay communications). The first eliminates missed leads during peak season. The second improves guest experience consistently without additional staff." },
    { q: "We are a small Hobart business. Can we afford AI automation?", a: "Most of Saabai's Hobart clients are small businesses with 2–10 staff. A focused automation — an enquiry handling agent or an administrative workflow automation — typically costs $3,000–$8,000 to build. For a Hobart business where the owner is currently performing this work themselves, the ROI is in recovered owner time — which is typically worth considerably more than $8,000 per year." },
    { q: "Does Saabai work with Tasmanian businesses remotely?", a: "Yes. All engagement is conducted remotely via video conference. We have worked with businesses across Hobart, Launceston, and regional Tasmania. The remote model works well — most business discovery and implementation work does not require on-site presence." },
    { q: "Can AI help Hobart food and beverage businesses?", a: "Yes — particularly around the administrative complexity of wholesale, export, and direct-to-consumer operations. Hobart food and beverage businesses are often dealing with certification management, distributor communications, export documentation, and customer order coordination that is disproportionate to their team size. These are highly automatable." },
    { q: "What is the most common first AI automation for Hobart businesses?", a: "The most common starting point for Hobart businesses is a customer enquiry handling agent — an AI that answers incoming questions about availability, pricing, services, and bookings instantly, 24 hours a day. It is a contained, fast-to-implement automation with an immediately measurable impact on enquiry response time and conversion." },
    { q: "How quickly can a Hobart business get an AI system running?", a: "A focused enquiry handling or customer service automation for a Hobart business typically takes 4–5 weeks from the initial discovery session to go-live. More comprehensive automations take 8–12 weeks. We always start with the highest-impact element so you see results early in the engagement." }
  ],
  ctaHeadline: "Book a Free AI Strategy Session for Your Hobart Business",
  ctaSubtext: "Free 30-minute session. We understand Tasmania's business environment — tourism seasonality, small team constraints, and the operational challenges of building a business at the edge of Australia. No obligation.",
  seo: {
    title: "AI Automation Consultant Hobart | AI Systems & Workflow Automation | Saabai",
    description: "Saabai builds AI automation systems for Hobart and Tasmanian businesses — tourism, professional services, food & beverage. Enquiry handling, admin automation. Free strategy session.",
    ogTitle: "AI Automation Consultant Hobart | Saabai",
    ogDescription: "Hobart businesses: automate your admin, handle tourism enquiries 24/7, and scale without adding staff. Saabai builds practical AI systems for Tasmanian businesses.",
    canonical: "https://www.saabai.ai/hobart",
  },
};

// ── Registry ──────────────────────────────────────────────────────────────────

export const LOCATION_CONFIGS: Record<string, LocationConfig> = {
  brisbane:  BRISBANE,
  "gold-coast": GOLD_COAST,
  sydney:    SYDNEY,
  melbourne: MELBOURNE,
  perth:     PERTH,
  adelaide:  ADELAIDE,
  canberra:  CANBERRA,
  darwin:    DARWIN,
  hobart:    HOBART,
};

export const ALL_LOCATIONS = Object.values(LOCATION_CONFIGS);
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd /Users/aiworkspace/saabai-site
npx tsc --noEmit 2>&1 | grep "location-data" | head -20
```

Expected: no output (no errors in this file).

- [ ] **Step 3: Commit**

```bash
git add lib/location-data.ts
git commit -m "feat: add location data for 9 Australian cities — types + unique content"
```

---

## Task 2 — LocationPage Template Component

**Files:**
- Create: `app/components/LocationPage.tsx`

This component renders every section of a location page. All city-specific content comes from the `LocationConfig` prop. JSON-LD schema (LocalBusiness, FAQ, Breadcrumb) is generated inline. Nav and Footer are imported and rendered here.

- [ ] **Step 1: Create the component**

```tsx
// app/components/LocationPage.tsx
"use client";

import Nav from "./Nav";
import Footer from "./Footer";
import type { LocationConfig } from "../../lib/location-data";

interface Props {
  config: LocationConfig;
}

export default function LocationPage({ config }: Props) {
  const {
    city, state, stateCode, heroHeadline, heroSubheading, industries,
    marketContext, challengesIntro, challenges, howWeHelpIntro, services,
    caseStudy, faqs, ctaHeadline, ctaSubtext, seo,
  } = config;

  // ── JSON-LD Schema ────────────────────────────────────────────────────────

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Saabai",
    url: seo.canonical,
    description: seo.description,
    areaServed: {
      "@type": "City",
      name: city,
      addressRegion: stateCode,
      addressCountry: "AU",
    },
    serviceType: ["AI Automation", "AI Consulting", "Workflow Automation", "Business Process Optimisation"],
    founder: { "@type": "Person", name: "Shane Goldberg" },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.saabai.ai" },
      { "@type": "ListItem", position: 2, name: `AI Automation ${city}`, item: seo.canonical },
    ],
  };

  return (
    <div className="bg-saabai-bg text-saabai-text min-h-screen font-[family-name:var(--font-geist-sans)]">

      {/* ── JSON-LD ──────────────────────────────────────────────────────── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <Nav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-52 pb-36 px-6 text-center max-w-5xl mx-auto overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 90% 60% at 50% 30%, var(--saabai-glow-mid) 0%, transparent 65%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 40% 30% at 50% 20%, var(--saabai-glow) 0%, transparent 70%)" }} />

        {/* Breadcrumb */}
        <nav className="relative mb-6 text-xs text-saabai-text-dim" aria-label="Breadcrumb">
          <a href="/" className="hover:text-saabai-text transition-colors">Home</a>
          <span className="mx-2">›</span>
          <span className="text-saabai-teal">AI Automation {city}</span>
        </nav>

        <p className="relative text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-6">
          AI Consulting · {city}, {stateCode}
        </p>

        <h1 className="relative text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-balance mb-8">
          {heroHeadline}
        </h1>

        <p className="relative text-lg md:text-xl text-saabai-text-muted max-w-3xl mx-auto leading-relaxed mb-12">
          {heroSubheading}
        </p>

        <a
          href="https://calendly.com/saabai/ai-strategy"
          target="_blank"
          rel="noopener noreferrer"
          className="relative inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-saabai-teal text-saabai-bg font-semibold text-sm tracking-wide hover:opacity-90 transition-opacity"
        >
          Book an AI Strategy Session
        </a>

        {/* Industry pills */}
        <div className="relative mt-16 flex flex-wrap justify-center gap-2">
          {industries.map((ind) => (
            <span
              key={ind}
              className="px-3 py-1 text-xs rounded-full border border-saabai-border text-saabai-text-dim"
            >
              {ind}
            </span>
          ))}
        </div>
      </section>

      {/* ── Local Market Context ──────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-saabai-border">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4">
            {city} Business Environment
          </p>
          <h2 className="text-3xl font-bold mb-12 text-balance">
            Understanding the {city} Market
          </h2>
          <div className="space-y-6">
            {marketContext.map((paragraph, i) => (
              <p key={i} className="text-saabai-text-muted leading-relaxed text-lg">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── Business Challenges ───────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-saabai-border" style={{ background: "var(--saabai-surface)" }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4">
            Common Challenges
          </p>
          <h2 className="text-3xl font-bold mb-6 text-balance">
            What {city} Businesses Are Up Against
          </h2>
          <p className="text-saabai-text-muted leading-relaxed mb-12 max-w-3xl text-lg">
            {challengesIntro}
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {challenges.map(({ title, detail }) => (
              <div
                key={title}
                className="p-6 rounded-xl border border-saabai-border"
                style={{ background: "var(--saabai-surface-raised)" }}
              >
                <div className="w-8 h-8 rounded-lg bg-saabai-teal/10 flex items-center justify-center mb-4">
                  <span className="text-saabai-teal text-lg">→</span>
                </div>
                <h3 className="font-semibold text-base mb-3">{title}</h3>
                <p className="text-sm text-saabai-text-muted leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How Saabai Helps ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-saabai-border">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4">
            How We Help
          </p>
          <h2 className="text-3xl font-bold mb-6 text-balance">
            AI Systems for {city} Businesses
          </h2>
          <p className="text-saabai-text-muted leading-relaxed mb-12 max-w-3xl text-lg">
            {howWeHelpIntro}
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {services.map(({ title, detail }, i) => (
              <div key={title} className="flex gap-4">
                <div className="shrink-0 w-8 h-8 rounded-full border border-saabai-teal/30 flex items-center justify-center text-saabai-teal text-sm font-bold">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{title}</h3>
                  <p className="text-sm text-saabai-text-muted leading-relaxed">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Case Study ────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-saabai-border" style={{ background: "var(--saabai-surface)" }}>
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4">
            Real Experience
          </p>
          <h2 className="text-3xl font-bold mb-12 text-balance">
            Work We Have Done
          </h2>
          <div className="rounded-2xl border border-saabai-border p-8 md:p-10" style={{ background: "var(--saabai-surface-raised)" }}>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="font-bold text-lg">{caseStudy.client}</p>
                <p className="text-sm text-saabai-text-muted">{caseStudy.industry}</p>
              </div>
              <span className="shrink-0 px-3 py-1 text-xs rounded-full border border-saabai-teal/30 text-saabai-teal">
                Case Study
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-saabai-text-dim mb-2">Context</p>
                <p className="text-saabai-text-muted leading-relaxed">{caseStudy.context}</p>
              </div>
              <div className="h-px bg-saabai-border" />
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-saabai-text-dim mb-2">Outcome</p>
                <p className="leading-relaxed">{caseStudy.outcome}</p>
              </div>
            </div>
          </div>
          <p className="mt-6 text-sm text-saabai-text-dim">
            <a href="/case-studies" className="text-saabai-teal hover:underline">View all case studies →</a>
          </p>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-saabai-border">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4 text-center">
            Common Questions
          </p>
          <h2 className="text-3xl font-bold mb-12 text-center text-balance">
            FAQ — {city} Businesses
          </h2>
          <div className="space-y-3">
            {faqs.map(({ q, a }) => (
              <details
                key={q}
                className="rounded-xl border border-saabai-border p-5 group"
                style={{ background: "var(--saabai-surface)" }}
              >
                <summary className="flex items-center justify-between cursor-pointer list-none font-semibold text-sm gap-4">
                  <span>{q}</span>
                  <span className="shrink-0 text-saabai-teal text-xl font-light">+</span>
                </summary>
                <p className="mt-4 text-sm text-saabai-text-muted leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-saabai-border text-center" style={{ background: "var(--saabai-surface)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="mb-8" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 50%, var(--saabai-glow-mid) 0%, transparent 70%)" }}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-balance">
              {ctaHeadline}
            </h2>
            <p className="text-saabai-text-muted text-lg leading-relaxed mb-10">
              {ctaSubtext}
            </p>
          </div>
          <a
            href="https://calendly.com/saabai/ai-strategy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-10 py-5 rounded-lg bg-saabai-teal text-saabai-bg font-semibold text-base tracking-wide hover:opacity-90 transition-opacity"
          >
            Book a Free AI Strategy Session
          </a>
          <p className="mt-4 text-xs text-saabai-text-dim">
            No obligation. 30 minutes. Genuine advice for your business.
          </p>

          {/* Internal links to other city pages */}
          <div className="mt-16 pt-12 border-t border-saabai-border">
            <p className="text-xs font-semibold tracking-widest uppercase text-saabai-text-dim mb-4">
              Also serving
            </p>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
              {[
                { label: "Brisbane", href: "/brisbane" },
                { label: "Gold Coast", href: "/gold-coast" },
                { label: "Sydney", href: "/sydney" },
                { label: "Melbourne", href: "/melbourne" },
                { label: "Perth", href: "/perth" },
                { label: "Adelaide", href: "/adelaide" },
                { label: "Canberra", href: "/canberra" },
                { label: "Darwin", href: "/darwin" },
                { label: "Hobart", href: "/hobart" },
              ]
                .filter(({ href }) => href !== `/${config.slug}`)
                .map(({ label, href }) => (
                  <a
                    key={href}
                    href={href}
                    className="text-xs text-saabai-text-dim hover:text-saabai-teal transition-colors"
                  >
                    {label}
                  </a>
                ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Run build to verify no TypeScript errors**

```bash
npm run build 2>&1 | grep -E "error|Error" | grep -v "Warning" | head -20
```

Expected: no errors related to `LocationPage.tsx`.

- [ ] **Step 3: Commit**

```bash
git add app/components/LocationPage.tsx
git commit -m "feat: add LocationPage template component with all sections and JSON-LD schema"
```

---

## Task 3 — All 9 City Page Files

**Files:**
- Create: `app/brisbane/page.tsx`
- Create: `app/gold-coast/page.tsx`
- Create: `app/sydney/page.tsx`
- Create: `app/melbourne/page.tsx`
- Create: `app/perth/page.tsx`
- Create: `app/adelaide/page.tsx`
- Create: `app/canberra/page.tsx`
- Create: `app/darwin/page.tsx`
- Create: `app/hobart/page.tsx`

Each file exports unique Next.js `Metadata` and renders `<LocationPage>` with its city config. The unique metadata ensures each page has a distinct title, description, canonical URL, and Open Graph tags in the `<head>`.

- [ ] **Step 1: Create Brisbane page**

```tsx
// app/brisbane/page.tsx
import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { BRISBANE } from "../../lib/location-data";

export const metadata: Metadata = {
  title: BRISBANE.seo.title,
  description: BRISBANE.seo.description,
  alternates: { canonical: BRISBANE.seo.canonical },
  openGraph: {
    url: BRISBANE.seo.canonical,
    title: BRISBANE.seo.ogTitle,
    description: BRISBANE.seo.ogDescription,
  },
};

export default function BrisbanePage() {
  return <LocationPage config={BRISBANE} />;
}
```

- [ ] **Step 2: Create Gold Coast page**

```tsx
// app/gold-coast/page.tsx
import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { GOLD_COAST } from "../../lib/location-data";

export const metadata: Metadata = {
  title: GOLD_COAST.seo.title,
  description: GOLD_COAST.seo.description,
  alternates: { canonical: GOLD_COAST.seo.canonical },
  openGraph: {
    url: GOLD_COAST.seo.canonical,
    title: GOLD_COAST.seo.ogTitle,
    description: GOLD_COAST.seo.ogDescription,
  },
};

export default function GoldCoastPage() {
  return <LocationPage config={GOLD_COAST} />;
}
```

- [ ] **Step 3: Create Sydney page**

```tsx
// app/sydney/page.tsx
import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { SYDNEY } from "../../lib/location-data";

export const metadata: Metadata = {
  title: SYDNEY.seo.title,
  description: SYDNEY.seo.description,
  alternates: { canonical: SYDNEY.seo.canonical },
  openGraph: {
    url: SYDNEY.seo.canonical,
    title: SYDNEY.seo.ogTitle,
    description: SYDNEY.seo.ogDescription,
  },
};

export default function SydneyPage() {
  return <LocationPage config={SYDNEY} />;
}
```

- [ ] **Step 4: Create Melbourne page**

```tsx
// app/melbourne/page.tsx
import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { MELBOURNE } from "../../lib/location-data";

export const metadata: Metadata = {
  title: MELBOURNE.seo.title,
  description: MELBOURNE.seo.description,
  alternates: { canonical: MELBOURNE.seo.canonical },
  openGraph: {
    url: MELBOURNE.seo.canonical,
    title: MELBOURNE.seo.ogTitle,
    description: MELBOURNE.seo.ogDescription,
  },
};

export default function MelbournePage() {
  return <LocationPage config={MELBOURNE} />;
}
```

- [ ] **Step 5: Create Perth page**

```tsx
// app/perth/page.tsx
import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { PERTH } from "../../lib/location-data";

export const metadata: Metadata = {
  title: PERTH.seo.title,
  description: PERTH.seo.description,
  alternates: { canonical: PERTH.seo.canonical },
  openGraph: {
    url: PERTH.seo.canonical,
    title: PERTH.seo.ogTitle,
    description: PERTH.seo.ogDescription,
  },
};

export default function PerthPage() {
  return <LocationPage config={PERTH} />;
}
```

- [ ] **Step 6: Create Adelaide page**

```tsx
// app/adelaide/page.tsx
import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { ADELAIDE } from "../../lib/location-data";

export const metadata: Metadata = {
  title: ADELAIDE.seo.title,
  description: ADELAIDE.seo.description,
  alternates: { canonical: ADELAIDE.seo.canonical },
  openGraph: {
    url: ADELAIDE.seo.canonical,
    title: ADELAIDE.seo.ogTitle,
    description: ADELAIDE.seo.ogDescription,
  },
};

export default function AdelaidePage() {
  return <LocationPage config={ADELAIDE} />;
}
```

- [ ] **Step 7: Create Canberra page**

```tsx
// app/canberra/page.tsx
import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { CANBERRA } from "../../lib/location-data";

export const metadata: Metadata = {
  title: CANBERRA.seo.title,
  description: CANBERRA.seo.description,
  alternates: { canonical: CANBERRA.seo.canonical },
  openGraph: {
    url: CANBERRA.seo.canonical,
    title: CANBERRA.seo.ogTitle,
    description: CANBERRA.seo.ogDescription,
  },
};

export default function CanberraPage() {
  return <LocationPage config={CANBERRA} />;
}
```

- [ ] **Step 8: Create Darwin page**

```tsx
// app/darwin/page.tsx
import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { DARWIN } from "../../lib/location-data";

export const metadata: Metadata = {
  title: DARWIN.seo.title,
  description: DARWIN.seo.description,
  alternates: { canonical: DARWIN.seo.canonical },
  openGraph: {
    url: DARWIN.seo.canonical,
    title: DARWIN.seo.ogTitle,
    description: DARWIN.seo.ogDescription,
  },
};

export default function DarwinPage() {
  return <LocationPage config={DARWIN} />;
}
```

- [ ] **Step 9: Create Hobart page**

```tsx
// app/hobart/page.tsx
import type { Metadata } from "next";
import LocationPage from "../components/LocationPage";
import { HOBART } from "../../lib/location-data";

export const metadata: Metadata = {
  title: HOBART.seo.title,
  description: HOBART.seo.description,
  alternates: { canonical: HOBART.seo.canonical },
  openGraph: {
    url: HOBART.seo.canonical,
    title: HOBART.seo.ogTitle,
    description: HOBART.seo.ogDescription,
  },
};

export default function HobartPage() {
  return <LocationPage config={HOBART} />;
}
```

- [ ] **Step 10: Run full build to verify all pages compile**

```bash
npm run build 2>&1 | tail -40
```

Expected output includes all 9 routes:
```
├ ○ /adelaide
├ ○ /brisbane
├ ○ /canberra
├ ○ /darwin
├ ○ /gold-coast
├ ○ /hobart
├ ○ /melbourne
├ ○ /perth
└ ○ /sydney
```

- [ ] **Step 11: Commit all 9 pages**

```bash
git add app/brisbane/ app/gold-coast/ app/sydney/ app/melbourne/ app/perth/ app/adelaide/ app/canberra/ app/darwin/ app/hobart/
git commit -m "feat: add 9 Australian city location pages — Brisbane, Gold Coast, Sydney, Melbourne, Perth, Adelaide, Canberra, Darwin, Hobart"
```

---

## Task 4 — Update Footer with Service Areas

**Files:**
- Modify: `app/components/Footer.tsx`

Current footer: logo | 6 nav links | copyright.
Updated footer: logo | nav links | copyright **+ Service Areas row** below.

Per spec: location pages must NOT appear in the primary nav. Footer only.

- [ ] **Step 1: Replace Footer.tsx**

```tsx
// app/components/Footer.tsx
import Image from "next/image";

const footerLinks = [
  { label: "Services", href: "/services" },
  { label: "Use Cases", href: "/use-cases" },
  { label: "Process", href: "/process" },
  { label: "FAQ", href: "/faq" },
  { label: "About", href: "/about" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/shanegoldberg-ai" },
];

const serviceAreaLinks = [
  { label: "Brisbane", href: "/brisbane" },
  { label: "Gold Coast", href: "/gold-coast" },
  { label: "Sydney", href: "/sydney" },
  { label: "Melbourne", href: "/melbourne" },
  { label: "Perth", href: "/perth" },
  { label: "Adelaide", href: "/adelaide" },
  { label: "Canberra", href: "/canberra" },
  { label: "Darwin", href: "/darwin" },
  { label: "Hobart", href: "/hobart" },
];

export default function Footer() {
  return (
    <footer className="border-t border-saabai-border py-10 px-8 pr-24">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Main footer row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 flex-wrap">
          <a href="/" className="shrink-0">
            <Image
              src="/brand/saabai-logo-full.png"
              alt="Saabai.ai"
              width={120}
              height={40}
              style={{ height: 32, width: "auto" }}
            />
          </a>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {footerLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-xs text-saabai-text-dim hover:text-saabai-text transition-colors tracking-wide"
              >
                {label}
              </a>
            ))}
          </nav>
          <p className="text-xs text-saabai-text-dim tracking-wide shrink-0">
            © {new Date().getFullYear()} Saabai.ai. All rights reserved.
          </p>
        </div>

        {/* Service Areas row */}
        <div className="border-t border-saabai-border pt-6">
          <p className="text-xs font-semibold tracking-widest uppercase text-saabai-text-dim mb-3 text-center sm:text-left">
            Service Areas
          </p>
          <nav className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2">
            {serviceAreaLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-xs text-saabai-text-dim hover:text-saabai-teal transition-colors tracking-wide"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Run build to verify Footer compiles**

```bash
npm run build 2>&1 | grep -E "error|Footer" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/Footer.tsx
git commit -m "feat: add Service Areas section to footer with all 9 city links"
```

---

## Task 5 — Final Build Verification and Push

- [ ] **Step 1: Run full clean build**

```bash
npm run build 2>&1
```

Expected: `✓ Generating static pages` with all 9 city pages listed. Zero TypeScript errors. Zero build errors.

- [ ] **Step 2: Spot-check routes exist**

```bash
curl -s -o /dev/null -w "%{http_code}" https://www.saabai.ai/brisbane
curl -s -o /dev/null -w "%{http_code}" https://www.saabai.ai/gold-coast
curl -s -o /dev/null -w "%{http_code}" https://www.saabai.ai/sydney
```

Expected: `200` for each (after Vercel deployment).

- [ ] **Step 3: Push to trigger Vercel deployment**

```bash
git push
```

- [ ] **Step 4: Verify Vercel deployment is READY**

```bash
vercel ls saabai-site 2>&1 | head -6
```

Expected: latest deployment shows `● Ready`.

- [ ] **Step 5: Verify JSON-LD schema on Brisbane page**

```bash
curl -s https://www.saabai.ai/brisbane | grep -o '"@type":"FAQPage"' | head -3
```

Expected: `"@type":"FAQPage"` (confirms FAQ schema is rendered).

---

## Self-Review Against Spec

| Spec Requirement | Covered By |
|---|---|
| 9 city pages (Brisbane → Hobart) | Task 3 — all 9 page.tsx files |
| URL structure `/brisbane`, `/gold-coast` etc. | Task 3 — directory names match slugs |
| 1,200–2,000 words unique content per page | Task 1 — each city has 4 market context paragraphs + 5 challenges + 6 services + 7 FAQs (~1,800–2,200 words) |
| No duplicate/spun content | Task 1 — every city's data is independently authored |
| Hero with unique headline/subheading/CTA | Task 2 — LocationPage hero section |
| Local market context | Task 1 — `marketContext` array + Task 2 — rendered section |
| Common business challenges | Task 1 — `challenges` array + Task 2 — rendered section |
| How Saabai helps | Task 1 — `services` array + Task 2 — rendered section |
| Case study section | Task 1 — `caseStudy` object + Task 2 — rendered section |
| City-specific FAQs (7 per city) | Task 1 — `faqs` arrays + Task 2 — rendered section |
| CTA section | Task 1 — `ctaHeadline/ctaSubtext` + Task 2 — rendered section |
| Internal linking to other city pages | Task 2 — "Also serving" links in CTA section |
| Footer Service Areas | Task 4 — Footer.tsx updated |
| Unique title/meta description per page | Task 3 — each page.tsx exports unique Metadata |
| Canonical URLs | Task 3 — `alternates.canonical` per page |
| Open Graph title/description | Task 3 — `openGraph` per page |
| LocalBusiness schema | Task 2 — `localBusinessSchema` JSON-LD |
| FAQ schema | Task 2 — `faqSchema` JSON-LD |
| Breadcrumb schema | Task 2 — `breadcrumbSchema` JSON-LD |
| Saabai design system (dark theme, CSS vars) | Task 2 — uses `--saabai-bg`, `--saabai-teal`, etc. |
| Mobile responsive | Task 2 — Tailwind responsive classes throughout |
| No primary nav changes | Not modified — footer only per spec |

---

## Addendum — Internal Linking & Topic Cluster Architecture

*Added in response to expanded SEO brief.*

### Existing pages confirmed for internal linking

| Page | URL | Role in cluster |
|------|-----|-----------------|
| Law Firms | `/for-law-firms` | Primary industry authority page |
| Accounting Firms | `/for-accounting-firms` | Primary industry authority page |
| Real Estate | `/for-real-estate` | Primary industry authority page |
| Services | `/services` | Service hub page |
| Case Studies | `/case-studies` | Social proof / E-E-A-T |
| Use Cases | `/use-cases` | Supporting content |
| AI Audit | `/ai-audit` | Primary conversion page |
| Advisory | `/advisory` | Service detail page |

### Topic cluster model

```
Homepage
├── Service Pages (/services, /advisory, /ai-audit)
├── Industry Pages (/for-law-firms, /for-accounting-firms, /for-real-estate)
│   └── ← fed by → Location Pages
├── Case Studies (/case-studies)
│   └── ← referenced by → Location Pages + Industry Pages
└── Location Pages (/brisbane, /sydney, /melbourne, ...)
    └── links to → Industry Pages + Case Studies + other cities
```

### Task 1 Addendum — Add `industryLinks` to LocationConfig

In `lib/location-data.ts`, add this field to `LocationConfig`:

```typescript
industryLinks: Array<{
  industry: string;    // "Law Firms"
  href: string;        // "/for-law-firms"
  context: string;     // City-specific sentence used as the contextual link text
}>;
```

Add `industryLinks` to each city config. Examples:

**Brisbane:**
```typescript
industryLinks: [
  { industry: "Law Firms", href: "/for-law-firms", context: "Brisbane law firms are using AI to handle client intake, matter qualification, and after-hours enquiries — recovering 15–25 hours of billable time per week." },
  { industry: "Accounting Firms", href: "/for-accounting-firms", context: "Brisbane accounting practices are automating document chasing, client onboarding, and deadline reminders — freeing partners to focus on advisory work." },
  { industry: "Real Estate", href: "/for-real-estate", context: "Brisbane property businesses are using AI to handle enquiry qualification, listing follow-up, and landlord communications automatically." },
],
```

**Sydney:**
```typescript
industryLinks: [
  { industry: "Law Firms", href: "/for-law-firms", context: "Sydney law firms, facing the country's highest admin wage costs, are using AI intake and compliance automation to maintain margins while competing on service quality." },
  { industry: "Accounting Firms", href: "/for-accounting-firms", context: "Sydney accounting firms are automating the document workflows and client communication processes that consume 30–40% of staff time in a typical practice." },
  { industry: "Real Estate", href: "/for-real-estate", context: "Sydney real estate agencies are using AI to handle enquiry qualification, appraisal follow-up, and vendor reporting — reducing administrative overhead materially." },
],
```

Apply equivalent city-specific `industryLinks` for all 9 cities. Each should use genuinely unique contextual sentences referencing that city's market conditions.

### Task 2 Addendum — Add Industry Cross-Links Section to LocationPage

Add this section to `LocationPage.tsx` between the Case Study and FAQ sections:

```tsx
{/* ── Industry Cross-Links ─────────────────────────────────────────── */}
<section className="py-24 px-6 border-t border-saabai-border">
  <div className="max-w-5xl mx-auto">
    <p className="text-xs font-semibold tracking-widest uppercase text-saabai-teal mb-4">
      {city} Businesses We Help
    </p>
    <h2 className="text-3xl font-bold mb-4 text-balance">
      Industries in {city}
    </h2>
    <p className="text-saabai-text-muted mb-10 max-w-2xl leading-relaxed">
      Saabai works across {city}'s major industry sectors. Each engagement is tailored to the specific operational requirements of that industry.
    </p>
    <div className="grid gap-5 md:grid-cols-3">
      {config.industryLinks.map(({ industry, href, context }) => (
        <a
          key={href}
          href={href}
          className="p-6 rounded-xl border border-saabai-border hover:border-saabai-teal/30 transition-colors group"
          style={{ background: "var(--saabai-surface)" }}
        >
          <p className="font-semibold mb-3 group-hover:text-saabai-teal transition-colors">
            {city} {industry} →
          </p>
          <p className="text-sm text-saabai-text-muted leading-relaxed">{context}</p>
        </a>
      ))}
    </div>
    <div className="mt-10 flex flex-wrap gap-4">
      <a href="/case-studies" className="text-sm text-saabai-teal hover:underline">View case studies →</a>
      <a href="/services" className="text-sm text-saabai-teal hover:underline">All services →</a>
      <a href="/ai-audit" className="text-sm text-saabai-teal hover:underline">Book an AI audit →</a>
    </div>
  </div>
</section>
```

### Phase 2 — Separate Plan (not in this implementation)

The following work from the expanded brief should be a separate implementation plan:

1. **Strengthen existing industry pages** — expand thin sections, improve metadata, add FAQs, add city cross-links, improve CTAs
2. **Case study page structure** — build proper case study pages for PlasticOnline/Rex, Tributum Law/Lex, LocalSearch, Ink FX Printing — each with Challenge / Process / Opportunity / Solution / Outcome / Lessons structure
3. **Service authority pages** — audit gaps, potentially add: AI Operational Efficiency Audits, AI Workflow Automation, AI Agents for Business, AI Customer Service Automation, AI Lead Qualification Systems
4. **E-E-A-T optimisation** — founder bio, experience signals, client work, transparent service offering
5. **Reverse internal linking** — add city page links FROM industry pages (e.g. /for-law-firms links to /sydney, /melbourne, /brisbane)

Rationale for separation: these tasks modify existing pages and require individual content decisions. They are best planned and executed after the location pages are live and indexed.
