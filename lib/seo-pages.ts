import { pageMeta } from "./seo-meta";
import { NAP } from "./seo-entity";

/**
 * Public saabai.ai titles and descriptions.
 * Each title is used as-is (absolute). Each description is one or two sentences
 * and names the service plus a location where that fits the page.
 */
export const publicPageMeta = {
  home: pageMeta({
    path: "/",
    title: "AI Chatbots for Australian Businesses | Saabai, Gold Coast",
    description:
      "Custom AI chatbots and websites for Australian small businesses and law firms. Saabai is based in Merrimac on the Gold Coast, with alerts by email, SMS, WhatsApp or Telegram.",
  }),
  contact: pageMeta({
    path: "/contact",
    title: "Contact Saabai | Gold Coast and Brisbane",
    description:
      `Email ${NAP.email} to reach Saabai in ${NAP.addressLine}. We serve the Gold Coast, Brisbane and Queensland, and clients across Australia online.`,
  }),
  terms: pageMeta({
    path: "/terms",
    title: "Saabai Terms of Service | Gold Coast",
    description:
      `Terms for Saabai website care plans and the Blueprint AI audit. Saabai is based in ${NAP.addressLine}, and you can contact ${NAP.email}.`,
  }),
  privacy: pageMeta({
    path: "/privacy",
    title: "Saabai Privacy Policy | Gold Coast",
    description:
      `How Saabai in ${NAP.addressLine} collects and uses personal information. Email ${NAP.email} with a privacy question.`,
  }),
  about: pageMeta({
    path: "/about",
    title: "About Saabai | Gold Coast AI Business",
    description:
      "Saabai is a Gold Coast AI business for Australian small businesses, founded by Shane Goldberg. Website care plans start from $100 a month and the Blueprint AI audit from $497.",
  }),
  faq: pageMeta({
    path: "/faq",
    title: "Saabai FAQ | Websites and AI, Gold Coast",
    description:
      "Answers about Saabai websites, AI audits and automation for small businesses on the Gold Coast, in Brisbane and across Australia. Care plans start from $100 a month.",
  }),
  websites: pageMeta({
    path: "/websites",
    title: "Website Care Plans | Saabai, Gold Coast",
    description:
      "Website care plans for Australian small businesses from Saabai on the Gold Coast. Presence is $100, Growth is $200 and Signature is $300 a month, and builds start from $2,000.",
  }),
  services: pageMeta({
    path: "/services",
    title: "Saabai Services | Websites and AI, Gold Coast",
    description:
      "Saabai services for Australian small businesses on the Gold Coast and in Brisbane. Website care plans from $100 a month, the Blueprint AI audit from $497, chat agents and automations.",
  }),
  legal: pageMeta({
    path: "/legal",
    title: "Lex AI Legal Assistant | Saabai, Gold Coast",
    description:
      "Lex is an AI legal assistant for Australian law firms, from Saabai on the Gold Coast. It cites ATO rulings and Commonwealth legislation, and the Firm plan is $299 a month.",
  }),
  legalCompare: pageMeta({
    path: "/legal/lex-vs-ai-legal-tools",
    title: "Lex vs other AI legal tools 2026 | Saabai",
    description:
      "Published facts on price, sources and data location for Lex, Harvey, CoCounsel and Lexis+ AI. Lex is an AI legal assistant from Saabai on the Gold Coast, and the Firm plan is $299 a month.",
  }),
  queenslandChatbot: pageMeta({
    path: "/ai-chatbot-developer-queensland",
    title: "Custom AI Chatbot Developer in Queensland | Saabai",
    description:
      "Saabai builds custom AI chatbots for Queensland businesses in Brisbane, the Gold Coast and the Sunshine Coast. Alerts go out by email, SMS, WhatsApp or Telegram.",
  }),
  receptionist: pageMeta({
    path: "/ai-receptionist-gold-coast",
    title: "AI Receptionist for Gold Coast Businesses | Saabai",
    description:
      "A Gold Coast built AI receptionist for your website, from Saabai in Merrimac. It answers enquiries day and night and alerts you by email, SMS, WhatsApp or Telegram.",
  }),
  lawFirms: pageMeta({
    path: "/ai-chatbot-law-firms",
    title: "AI Chatbot for Law Firms | Saabai, Gold Coast",
    description:
      "Custom AI chatbots and Lex for Australian law firms, built by Saabai on the Gold Coast. Capture after-hours enquiries and get alerts by email, SMS or WhatsApp.",
  }),
  blueprint: pageMeta({
    path: "/blueprint",
    title: "Saabai Blueprint AI Plan | Gold Coast",
    description:
      "A ranked AI plan for small businesses and practices, from Saabai on the Gold Coast. Starter is $497, Pro is $1,497 and Business is $3,500, credited if you build within 30 days.",
  }),
  goldCoast: pageMeta({
    path: "/gold-coast",
    title: "Web Design Gold Coast, Hosting Included, From $2,000 | Saabai",
    description:
      "Web design on the Gold Coast from $2,000 plus $100 a month care, with hosting included. Saabai is based in Merrimac, and Blueprint AI plans start from $497.",
  }),
  brisbane: pageMeta({
    path: "/brisbane",
    title: "Websites and AI Automation in Brisbane | Saabai",
    description:
      "Brisbane websites from $2,000 plus $100 a month, plus custom AI chatbots for local businesses. Book a free 30 minute call for a chatbot quote.",
  }),
  score: pageMeta({
    path: "/score",
    title: "Free AI Readiness Score | Saabai, Gold Coast",
    description:
      "A free 3 minute score for Australian small businesses, from Saabai on the Gold Coast. Twelve questions, an instant score out of 100 and three quick wins.",
  }),
  caseStudies: pageMeta({
    path: "/case-studies",
    title: "Saabai Case Studies | Gold Coast AI Results",
    description:
      "Real results from Saabai, a Gold Coast AI business, including AI agents that answer enquiries and quote around the clock. Start with a Blueprint from $497.",
  }),
  rexCase: pageMeta({
    path: "/case-studies/rex-plastics-online",
    title: "Rex Case Study | AI Sales Agent | Saabai",
    description:
      "How a national plastics supplier used Rex, an AI sales agent built by Saabai on the Gold Coast. The team recovered 60% of the sales day, with 344 leads in 30 days.",
  }),
  process: pageMeta({
    path: "/process",
    title: "Saabai AI Process | Gold Coast",
    description:
      "Saabai's process on the Gold Coast runs from a Blueprint to a live automation. Most small businesses have a first automation live within 2 to 4 weeks.",
  }),
  insights: pageMeta({
    path: "/insights",
    title: "Saabai Insights | AI for Small Business, Gold Coast",
    description:
      "Patterns from building websites, AI agents and automation for Australian small businesses. Written by Saabai on the Gold Coast.",
  }),
  useCases: pageMeta({
    path: "/use-cases",
    title: "AI Use Cases for Small Business | Saabai, Gold Coast",
    description:
      "Practical AI and automation examples for Australian small businesses, from Saabai on the Gold Coast, including enquiry agents, quoting, follow-up and admin. Blueprint audits start from $497.",
  }),
  leadgen: pageMeta({
    path: "/leadgen",
    title: "Saabai LeadGen | AI Lead Capture, Gold Coast",
    description:
      "Saabai LeadGen turns website visitors into booked jobs for Australian service businesses, and alerts you by email, SMS or WhatsApp. Built on the Gold Coast.",
  }),
  calculator: pageMeta({
    path: "/calculator",
    title: "Automation Cost Calculator | Saabai, Gold Coast",
    description:
      "See what repetitive work costs your Australian business each year, including hours lost and a dollar estimate. It is a free calculator from Saabai on the Gold Coast, with no sign-up.",
  }),
  aiNews: pageMeta({
    path: "/ai-news",
    title: "AI News | Saabai, Gold Coast",
    description:
      "Live AI news and research, curated by Saabai on the Gold Coast. Updated from leading AI publications and discussions.",
  }),
  changelog: pageMeta({
    path: "/saabai-changelog",
    title: "Saabai Changelog | Gold Coast",
    description:
      "Development history for Saabai, the Gold Coast studio behind Lex, websites and client AI projects.",
  }),
} as const;
