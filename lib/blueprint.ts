import type { AuditTier } from "./audit-types";
// Saabai Blueprint: tiers, AI Readiness Score quiz and scoring.
// Prices are AUD. Saabai is not GST registered (GST not applicable).

export type BlueprintTier = "starter" | "pro" | "business";

export interface TierInfo {
  id: BlueprintTier;
  name: string;
  price: number; // AUD, GST not applicable
  priceLabel: string;
  who: string;
  short: string;
  delivery: string;
  includesCall: boolean;
  features: string[];
  /** Name of the env var holding the Stripe price ID */
  priceEnv: string;
  /** Internal engagement tier used by the existing order engine */
  engineTier: AuditTier;
}

export const TIERS: Record<BlueprintTier, TierInfo> = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 497,
    priceLabel: "$497",
    who: "For small businesses that want a fast, practical plan.",
    short: "No call needed",
    delivery: "48 hours",
    includesCall: false,
    features: [
      "Fully automated analysis of your fact-find, website and tools",
      "Top opportunities ranked by estimated hours and $ saved",
      "Branded PDF plus web version in your portal",
      "Delivered within 48 hours",
      "Fact-find online, no call needed",
    ],
    priceEnv: "STRIPE_BLUEPRINT_STARTER_PRICE_ID",
    engineTier: "starter",
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 1497,
    priceLabel: "$1,497",
    who: "For growing teams and professional practices that want an expert eye on the plan.",
    short: "Includes 30 min call",
    delivery: "3 business days",
    includesCall: true,
    features: [
      "Everything in Starter",
      "Personally reviewed and edited by Shane",
      "30 minute walkthrough call",
      "Build cost estimates for each opportunity",
      "Delivered within 3 business days",
    ],
    priceEnv: "STRIPE_BLUEPRINT_PRO_PRICE_ID",
    engineTier: "pro",
  },
  business: {
    id: "business",
    name: "Business",
    price: 3500,
    priceLabel: "$3,500",
    who: "For businesses with several teams or locations.",
    short: "Includes calls",
    delivery: "2 to 3 weeks",
    includesCall: true,
    features: [
      "Everything in Pro",
      "Discovery sessions with each team",
      "Phased 12 month roadmap",
      "Walkthrough call with your leadership",
      "Delivered in 2 to 3 weeks",
    ],
    priceEnv: "STRIPE_BLUEPRINT_BUSINESS_PRICE_ID",
    engineTier: "business",
  },
};

export const TIER_ORDER: BlueprintTier[] = ["starter", "pro", "business"];

export function isTier(v: unknown): v is BlueprintTier {
  return v === "starter" || v === "pro" || v === "business";
}

export function gstOf(price: number): number {
  return Math.round((price / 11) * 100) / 100;
}

export function aud(n: number, cents = false): string {
  return "$" + n.toLocaleString("en-AU", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
}

// ── AI Readiness Score ────────────────────────────────────────────────

export type Category = "business" | "customers" | "admin" | "tools" | "team";

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "business", label: "Your business" },
  { id: "customers", label: "Customers" },
  { id: "admin", label: "Admin and workflow" },
  { id: "tools", label: "Tools" },
  { id: "team", label: "Team" },
];

export interface QuizOption { label: string; hint: string; points: number }
export interface QuizQuestion { id: string; category: Category; q: string; options: QuizOption[] }

export const QUESTIONS: QuizQuestion[] = [
  { id: "type", category: "business", q: "What best describes your business?", options: [
    { label: "Trade or service business", hint: "Mechanics, builders, cleaners, mobile services", points: 2 },
    { label: "Retail, hospitality or e-commerce", hint: "Shops, cafes, online stores", points: 2 },
    { label: "Professional practice", hint: "Accounting, legal, health, advisory", points: 2 },
    { label: "Something else", hint: "We'll adjust the questions to suit", points: 2 },
  ]},
  { id: "size", category: "business", q: "How many people work in the business?", options: [
    { label: "Just me", hint: "Owner operator", points: 2 },
    { label: "2 to 5", hint: "Small team", points: 3 },
    { label: "6 to 20", hint: "Growing team", points: 3 },
    { label: "More than 20", hint: "Several teams or locations", points: 3 },
  ]},
  { id: "goal", category: "business", q: "What would help most right now?", options: [
    { label: "More enquiries and bookings", hint: "Grow the top of the funnel", points: 2 },
    { label: "Less admin", hint: "Get hours back each week", points: 2 },
    { label: "Faster replies to customers", hint: "Stop losing leads to slow follow up", points: 2 },
    { label: "Better visibility of the numbers", hint: "Know what is working", points: 2 },
  ]},
  { id: "enquiries", category: "customers", q: "How do new enquiries reach you today?", options: [
    { label: "Phone calls and texts", hint: "Mostly to my mobile, often while I'm on a job", points: 0 },
    { label: "Email and a website contact form", hint: "Someone checks the inbox and replies by hand", points: 2 },
    { label: "A booking system or CRM", hint: "Enquiries are captured and assigned automatically", points: 3 },
    { label: "A mix, with no single place", hint: "Things sometimes slip through the cracks", points: 0 },
  ]},
  { id: "reply", category: "customers", q: "How fast does a new enquiry usually get a reply?", options: [
    { label: "Within minutes", hint: "Instant or automatic reply", points: 3 },
    { label: "Same day", hint: "When someone gets to it", points: 2 },
    { label: "Next day or later", hint: "Busy weeks make it slower", points: 0 },
    { label: "Not sure", hint: "We do not track it", points: 0 },
  ]},
  { id: "reviews", category: "customers", q: "How do you ask happy customers for reviews?", options: [
    { label: "Automatically after each job", hint: "A text or email goes out on its own", points: 3 },
    { label: "We ask in person sometimes", hint: "When we remember", points: 1 },
    { label: "We don't really ask", hint: "Reviews come in on their own", points: 0 },
  ]},
  { id: "admin_hours", category: "admin", q: "How many hours a week go on admin?", options: [
    { label: "Less than 5", hint: "Admin is under control", points: 3 },
    { label: "5 to 10", hint: "A good chunk of a day", points: 2 },
    { label: "10 to 20", hint: "Two or more days a week", points: 1 },
    { label: "More than 20", hint: "It is someone's full time job", points: 0 },
  ]},
  { id: "quotes", category: "admin", q: "How are quotes, invoices and reminders handled?", options: [
    { label: "Mostly automatic", hint: "Software sends them for us", points: 3 },
    { label: "Templates, sent by hand", hint: "Faster than scratch, still manual", points: 2 },
    { label: "Written from scratch each time", hint: "Word, email or paper", points: 0 },
  ]},
  { id: "tools", category: "tools", q: "Which best describes your software?", options: [
    { label: "Cloud apps that talk to each other", hint: "Xero, booking system, CRM, all connected", points: 3 },
    { label: "Cloud apps, mostly separate", hint: "Data typed in more than once", points: 2 },
    { label: "Spreadsheets and email", hint: "Works, but lots of copy and paste", points: 1 },
    { label: "Mostly paper or memory", hint: "Notebooks, whiteboards, in my head", points: 0 },
  ]},
  { id: "website", category: "tools", q: "How does your website work for you?", options: [
    { label: "It brings in enquiries every week", hint: "Fast, mobile friendly, easy to update", points: 3 },
    { label: "It exists, but does not do much", hint: "Rarely brings in work", points: 1 },
    { label: "It is out of date or we don't have one", hint: "Time for something new", points: 0 },
  ]},
  { id: "ai_use", category: "team", q: "Does anyone use AI tools like ChatGPT at work?", options: [
    { label: "Yes, every day", hint: "Part of how we work", points: 3 },
    { label: "Sometimes", hint: "A few people dabble", points: 2 },
    { label: "Not yet", hint: "Curious but haven't started", points: 0 },
  ]},
  { id: "appetite", category: "team", q: "How open is the team to new ways of working?", options: [
    { label: "Keen, we want to move fast", hint: "Show us what to do", points: 3 },
    { label: "Open, if it is simple", hint: "Needs to be easy to learn", points: 2 },
    { label: "Cautious", hint: "Change needs a strong reason", points: 1 },
  ]},
];

export interface ScoreResult {
  total: number;
  breakdown: { id: Category; label: string; score: number }[];
  headline: string;
  summary: string;
  hours: string;
  wins: { title: string; body: string }[];
  recommended: BlueprintTier;
}

const WINS: Record<string, { title: string; body: string }> = {
  enquiries: { title: "Capture every enquiry in one place", body: "Send website and chatbot enquiries to one inbox or alert so nothing slips through. Included in your website build. For calls and texts, use a tool like OpenPhone or Zapier." },
  reply: { title: "Auto reply to website enquiries", body: "Send an instant reply with your booking link or next steps. Included with your website build. Could save a couple of hours a week (estimate)." },
  reviews: { title: "Ask every happy customer for a review", body: "A friendly message asking for a Google review after each job. Use a tool like Podium, Birdeye or Hatch to automate it. Your Google reviews can show on your Saabai website, included in every plan." },
  admin_hours: { title: "Batch and template your admin", body: "Turn your top 5 repeat emails into templates and let AI draft the first version. Covered as advice in your Blueprint." },
  quotes: { title: "Automatic quote and invoice reminders", body: "Turn on automatic reminders in your accounting software (Xero, MYOB or QuickBooks) so overdue invoices get chased for you. We can advise in your Blueprint." },
  tools: { title: "Connect the apps you already use", body: "Link your booking, CRM and accounting tools so data is typed in once. Scoped in your Blueprint and quoted separately." },
  website: { title: "Make your website work harder", body: "A fast mobile site with a clear call to action and instant lead alerts. Included in every Saabai website build, AI-ready and SEO-ready." },
  ai_use: { title: "Give the team an AI assistant", body: "Start with drafting emails, summarising notes and writing quotes using tools like ChatGPT or Claude. We cover set-up advice and basic training in your Blueprint. Custom assistants are quoted separately." },
  appetite: { title: "Pick one quick win and measure it", body: "Small, visible results build confidence for the next step." },
};

export function scoreAnswers(answers: Record<string, number>, businessName?: string): ScoreResult {
  const byCat: Record<Category, { got: number; max: number }> = {
    business: { got: 0, max: 0 }, customers: { got: 0, max: 0 }, admin: { got: 0, max: 0 }, tools: { got: 0, max: 0 }, team: { got: 0, max: 0 },
  };
  const gaps: { id: string; ratio: number }[] = [];
  for (const q of QUESTIONS) {
    const max = Math.max(...q.options.map((o) => o.points));
    const idx = answers[q.id];
    const pts = idx !== undefined && q.options[idx] ? q.options[idx].points : 0;
    byCat[q.category].got += pts;
    byCat[q.category].max += max;
    if (q.category !== "business") gaps.push({ id: q.id, ratio: max ? pts / max : 1 });
  }
  const scored = CATEGORIES.filter((c) => c.id !== "business");
  const breakdown = scored.map((c) => ({
    id: c.id,
    label: c.label === "Customers" ? "Customer enquiries" : c.label === "Tools" ? "Tools and systems" : c.label === "Team" ? "Team readiness" : c.label,
    score: Math.round(25 + (byCat[c.id].got / Math.max(1, byCat[c.id].max)) * 70),
  }));
  const total = Math.round(breakdown.reduce((s, b) => s + b.score, 0) / breakdown.length);

  const wins = gaps.sort((a, b) => a.ratio - b.ratio).slice(0, 3).map((g) => WINS[g.id]).filter(Boolean);
  const size = answers.size ?? 1;
  const adminIdx = answers.admin_hours ?? 1;
  const low = 3 + adminIdx * 2 + size;
  const hours = `${low} to ${low + 3} hours a week`;
  const name = businessName?.trim() || "Your business";

  let headline: string, summary: string;
  if (total >= 75) {
    headline = "Strong foundations, ready to scale";
    summary = `${name} is ahead of most small businesses. The next gains come from joining your systems up and letting AI handle the busywork.`;
  } else if (total >= 55) {
    headline = "Good foundations, big hours on the table";
    summary = `${name} has some good tools in place, but admin and follow ups still run by hand.`;
  } else {
    headline = "Plenty of quick wins, ready to grab";
    summary = `${name} is doing a lot by hand. That means simple automations can free up time fast.`;
  }
  const recommended: BlueprintTier = size >= 3 ? "business" : size >= 1 && total < 85 ? "pro" : "starter";
  return { total, breakdown, headline, summary, hours, wins, recommended };
}
