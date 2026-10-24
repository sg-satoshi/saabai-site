/**
 * Data for moving Christina (bo-consultancy) and Zara (lmm-site) onto the shared chat platform.
 * The prompts are the route prompts, copied word for word.
 * Nothing here talks to Redis. scripts/seed-platform-prompts.ts is the hand-run writer.
 */

export const BO_SYSTEM_PROMPT = "You are Christina, the AI assistant for BO Consulting, an Australian recruitment and workforce solutions company specialising in blue-collar industries.\n\nAbout BO Consulting:\n- Specialises in recruiting skilled blue-collar workers across Australia\n- Industries: Construction, Mining, Manufacturing, Warehousing, Transport, Civil, Trades, Logistics\n- Services: Permanent Recruitment, Labour Hire, Executive Search, Volume Recruitment, Workforce Planning, Recruitment Process Outsourcing (RPO)\n- National coverage across all states and territories\n- Contact: info@boconsulting.com.au (phone number coming soon)\n- Hours: Mon-Fri, 9am-5pm AEST\n\nKey differentiators:\n- Industry specialists who have worked in the sectors they recruit for\n- Fast response: same-day, shortlists fast\n- Rigorous candidate screening, reference checks, and verification\n- 1,000+ placements, 95% retention rate, 48hr average turnaround\n- Fully compliant labour hire. PAYG, super, WHS all handled\n\nYour personality:\n- Friendly, direct, and practical. You talk like someone who understands site work and deadlines\n- Confident and efficient. No fluff, get to the point\n- Australian in tone. Relaxed but professional\n- Keep responses under 130 words\n- Use plain language, no jargon\n- Never use em dashes in your responses\n\nWhen responding:\n- For employers: focus on speed, quality candidates, compliance, and reducing their hiring headaches\n- For candidates: focus on finding the right opportunity, good pay, and fair treatment\n- Always end with a clear next step. Get them to contact the team or fill out the form on the page\n- If asked for specific pricing, say it depends on the role and volume, and suggest they get in touch for a tailored quote\n- Never make up specific staff names or guarantees you cannot verify";

export const ZARA_SYSTEM_PROMPT = "You are Zara, a knowledgeable and friendly Australian finance and mortgage broking specialist based in Adelaide. You work for Lifestyle Money Management (LMM), helping clients build long-term wealth through ethical, property-led strategy, financial analysis, and portfolio management.\n\nAbout LMM:\n- Services: Investment Strategy, Financial Analysis, Portfolio Management\n- Focus: Adelaide, Brisbane, Queensland, and selected Australian residential growth locations\n- Philosophy: Advice that starts with suitability — affordability, asset quality, downside protection, financial independence\n- Ethical ROI advice — the right property is not just the one with a glossy forecast\n\nYour personality:\n- Warm, professional, and conversational Australian tone\n- Analytical but accessible — you explain finance clearly\n- Conservative and risk-aware — you prioritise protection and suitability\n- Concise and actionable — no fluff\n\nKey knowledge areas:\n- Property investment strategy and financial analysis\n- Mortgage broking and lending structures\n- Portfolio management and equity recycling\n- Risk assessment and downside protection\n- Queensland and Australian property markets\n- Retirement planning and financial independence\n- Tax-effective investment structures\n\nWhen responding:\n- Keep answers under 150 words unless detailed analysis is requested\n- Use Australian spelling\n- Reference QLD/Brisbane markets when relevant\n- Emphasise risk awareness and suitability\n- If you don't know something specific, be honest and offer to connect them with the team\n- Always end with a soft next step";

export const BO_DOMAINS = ["boconsulting.com.au", "www.boconsulting.com.au"] as const;
export const LMM_DOMAINS = ["lifestylemoneymanagement.com.au", "www.lifestylemoneymanagement.com.au"] as const;

export interface StoredChatbot {
  enabled?: boolean;
  name?: string;
  greeting?: string;
  systemPrompt?: string;
  avatarUrl?: string;
}

export interface StoredSite {
  id: string;
  slug: string;
  domains?: string[];
  chatbot?: StoredChatbot;
}

export interface ChatbotPatch {
  enabled: true;
  name: string;
  greeting: string;
  systemPrompt: string;
  avatarUrl?: string;
}

export interface CreateDraft {
  slug: string;
  name: string;
  niche: string;
  description: string;
  status: "live";
  source: "factory";
  url: string;
  business: { name: string; tagline?: string; email?: string; phone?: string; address?: string };
  chatbot: ChatbotPatch;
  domains: string[];
}

export interface PlatformBot {
  slug: string;
  systemPrompt: string;
  domains: readonly string[];
  create: CreateDraft;
}

const CHRISTINA_GREETING = "G'day! I'm Christina, the BO Consulting assistant. Whether you're looking to hire skilled workers or searching for your next role, I can help point you in the right direction. What can I do for you?";
const ZARA_GREETING = "Hello! I'm Zara from Lifestyle Money Management. Ready to talk property wealth strategy? I'm here to help!";

export const PLATFORM_BOTS: PlatformBot[] = [
  {
    slug: "bo-consultancy",
    systemPrompt: BO_SYSTEM_PROMPT,
    domains: BO_DOMAINS,
    create: {
      slug: "bo-consultancy",
      name: "BO Consulting",
      niche: "professional-services",
      description: "Blue-collar recruitment and labour hire specialist site",
      status: "live",
      source: "factory",
      url: "https://boconsulting.com.au",
      business: {
        name: "BO Consulting",
        tagline: "Connecting Australia's Workforce",
        email: "info@boconsulting.com.au",
      },
      chatbot: {
        enabled: true,
        name: "Christina",
        greeting: CHRISTINA_GREETING,
        systemPrompt: BO_SYSTEM_PROMPT,
        avatarUrl: "/sites/bo-consultancy/christina-avatar.jpg",
      },
      domains: [...BO_DOMAINS],
    },
  },
  {
    slug: "lmm-site",
    systemPrompt: ZARA_SYSTEM_PROMPT,
    domains: LMM_DOMAINS,
    create: {
      slug: "lmm-site",
      name: "Lifestyle Money Management",
      niche: "professional-services",
      description: "Property wealth strategy",
      status: "live",
      source: "factory",
      url: "https://lifestylemoneymanagement.com.au",
      business: {
        name: "Lifestyle Money Management",
        tagline: "Property Wealth Strategy",
        address: "Brisbane, Queensland",
      },
      chatbot: {
        enabled: true,
        name: "Zara",
        greeting: ZARA_GREETING,
        systemPrompt: ZARA_SYSTEM_PROMPT,
      },
      domains: [...LMM_DOMAINS],
    },
  },
];

export type SeedAction =
  | { kind: "noop"; slug: string; id: string }
  | { kind: "update"; slug: string; id: string; changes: string[]; domains: string[]; chatbot: ChatbotPatch }
  | { kind: "create"; slug: string; site: CreateDraft };

/** Host only, lower case, no scheme, path or port. */
export function bareHost(d: string): string {
  return d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
}

export function normaliseDomains(domains: string[] | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const d of domains ?? []) {
    const h = bareHost(d);
    if (!h || seen.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  return out;
}

/** Keep hosts already on the record, then add any required host that is missing. */
export function mergeDomains(existing: string[] | undefined, required: readonly string[]): string[] {
  const out = normaliseDomains(existing);
  const seen = new Set(out);
  for (const d of required) {
    const h = bareHost(d);
    if (!h || seen.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  return out;
}

function buildChatbot(existing: StoredChatbot | undefined, bot: PlatformBot): ChatbotPatch {
  const fallback = bot.create.chatbot;
  const avatar = (existing?.avatarUrl || fallback.avatarUrl || "").trim();
  const chatbot: ChatbotPatch = {
    enabled: true,
    name: existing?.name?.trim() || fallback.name,
    greeting: existing?.greeting?.trim() || fallback.greeting,
    systemPrompt: bot.systemPrompt,
  };
  if (avatar) chatbot.avatarUrl = avatar;
  return chatbot;
}

function sameChatbot(existing: StoredChatbot | undefined, next: ChatbotPatch): boolean {
  if (!existing) return false;
  if (existing.enabled !== true) return false;
  if ((existing.systemPrompt ?? "") !== next.systemPrompt) return false;
  if ((existing.name ?? "") !== next.name) return false;
  if ((existing.greeting ?? "") !== next.greeting) return false;
  if ((existing.avatarUrl ?? "") !== (next.avatarUrl ?? "")) return false;
  return true;
}

export function planPlatformSeed(sites: StoredSite[], bots: PlatformBot[] = PLATFORM_BOTS): SeedAction[] {
  const actions: SeedAction[] = [];
  for (const bot of bots) {
    const matches = sites.filter((s) => s.slug === bot.slug);
    if (!matches.length) {
      actions.push({ kind: "create", slug: bot.slug, site: bot.create });
      continue;
    }
    for (const site of matches) {
      const domains = mergeDomains(site.domains, bot.domains);
      const chatbot = buildChatbot(site.chatbot, bot);
      const changes: string[] = [];
      if ((site.chatbot?.systemPrompt ?? "") !== bot.systemPrompt) changes.push("systemPrompt");
      if (site.chatbot?.enabled !== true) changes.push("enabled");
      if (JSON.stringify(domains) !== JSON.stringify(normaliseDomains(site.domains))) changes.push("domains");
      if ((site.chatbot?.name ?? "").trim() !== chatbot.name && !(site.chatbot?.name ?? "").trim()) changes.push("name");
      if ((site.chatbot?.greeting ?? "").trim() !== chatbot.greeting && !(site.chatbot?.greeting ?? "").trim()) changes.push("greeting");
      if (!changes.length && sameChatbot(site.chatbot, chatbot)) {
        actions.push({ kind: "noop", slug: bot.slug, id: site.id });
        continue;
      }
      if (!changes.length) changes.push("chatbot");
      actions.push({ kind: "update", slug: bot.slug, id: site.id, changes, domains, chatbot });
    }
  }
  return actions;
}

export interface SeedIo {
  dryRun: boolean;
  update: (id: string, patch: { domains: string[]; chatbot: ChatbotPatch }) => Promise<void>;
  create: (site: CreateDraft) => Promise<void>;
}

/** Apply a plan. Dry run performs no writes. A second apply of the resulting records is a no-op. */
export async function applySeedActions(actions: SeedAction[], io: SeedIo): Promise<{ writes: number }> {
  let writes = 0;
  for (const action of actions) {
    if (action.kind === "noop" || io.dryRun) continue;
    if (action.kind === "update") {
      await io.update(action.id, { domains: action.domains, chatbot: action.chatbot });
      writes++;
    } else {
      await io.create(action.site);
      writes++;
    }
  }
  return { writes };
}

/** What the CLI will do. Dry run unless --apply is present. --dry-run always wins. */
export function runMode(argv: readonly string[]): "dry-run" | "apply" {
  if (argv.includes("--dry-run")) return "dry-run";
  if (argv.includes("--apply")) return "apply";
  return "dry-run";
}
