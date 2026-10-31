/**
 * Chatbot registry rows that must exist even when Redis has no copy.
 * Static HTML sites are not in APP_ROUTER_SITES. This does not change redirects.
 */
import type { SiteConfig } from "../site-registry";
import { NICO_DOMAINS, SOFIA_SYSTEM_PROMPT, personaGreeting, SOFIA_PERSONA } from "./personas";

export function nicoMorettiSite(now = 1745000000000): SiteConfig {
  return {
    id: "nico-moretti",
    slug: "nico-moretti",
    name: "Nico Moretti",
    niche: "professional-services",
    description: "Static client site",
    status: "live",
    source: "external",
    url: "https://nicomoretti.au",
    externalUrl: "https://nicomoretti.au",
    business: { name: "Nico Moretti" },
    chatbot: {
      enabled: true,
      name: "Sofia",
      greeting: personaGreeting(SOFIA_PERSONA),
      systemPrompt: SOFIA_SYSTEM_PROMPT,
      avatarUrl: SOFIA_PERSONA.appearance?.avatarUrl,
    },
    domains: [...NICO_DOMAINS],
    createdAt: now,
    updatedAt: now,
  };
}

/** Code registry rows merged in when that slug is not already stored. */
export function codeChatbotSites(): SiteConfig[] {
  return [nicoMorettiSite()];
}
