/**
 * Christina (bo-consultancy) and Zara (lmm-site) on the shared chat platform.
 * The prompt and greeting come from lib/chatbot/personas.ts. Nothing here talks to Redis.
 * scripts/seed-platform-prompts.ts is the hand-run writer. Dry run unless --apply.
 */
import { BO_PERSONA, ZARA_PERSONA, buildSystemPrompt, personaGreeting } from "./personas";

export const BO_SYSTEM_PROMPT = buildSystemPrompt(BO_PERSONA);
export const ZARA_SYSTEM_PROMPT = buildSystemPrompt(ZARA_PERSONA);

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

export const CHRISTINA_GREETING = personaGreeting(BO_PERSONA);
export const ZARA_GREETING = personaGreeting(ZARA_PERSONA);

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
        address: "Adelaide, South Australia",
      },
      chatbot: {
        enabled: true,
        name: "Zara",
        greeting: ZARA_GREETING,
        systemPrompt: ZARA_SYSTEM_PROMPT,
        avatarUrl: ZARA_PERSONA.appearance?.avatarUrl,
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
    greeting: fallback.greeting,
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
      if ((site.chatbot?.greeting ?? "").trim() !== chatbot.greeting) changes.push("greeting");
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
