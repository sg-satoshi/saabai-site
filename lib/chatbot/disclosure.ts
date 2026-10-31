import { noDashes } from "../no-dashes";

/**
 * The visitor hears this once, in the first message. Later replies must not say it again.
 * Every widget reads the sentence from here (via the public config). None of them write their own.
 */
export function aiDisclosureSentence(botName: string, businessName: string): string {
  const name = botName.trim() || "the assistant";
  const business = businessName.trim();
  const who = business ? `${name}, an AI assistant for ${business}` : `${name}, an AI assistant`;
  return `Hi, I'm ${who}.`;
}

export const DISCLOSURE_ONCE_RULE =
  "The opening message already says you are an AI assistant. Do not repeat that you are an AI, a bot, or an assistant in later replies.";

export const NOT_SURE_RULE =
  "If something is not covered by your instructions or the business facts, say you are not sure and offer to connect the visitor with the team.";

/** How many times the disclosure phrase appears. The opening message must be exactly one. */
export function disclosureCount(text: string): number {
  return text.toLowerCase().match(/ai assistant/g)?.length ?? 0;
}

const LEADING_GREETING = /^\s*(hi|hello|hey|g'day|good (morning|afternoon|evening))\b[!,.]?\s*/i;

/** Drop a saved intro that would say who the bot is a second time, including a leading Hi or Hello. */
export function greetingFollowOn(extra: string, botName: string): string {
  const name = botName.trim().toLowerCase();
  const joined = noDashes(extra)
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter((sentence) => {
      const lower = sentence.toLowerCase();
      if (lower.includes("ai assistant")) return false;
      if (!name) return true;
      return !lower.includes(`i'm ${name}`) && !lower.includes(`i am ${name}`) && !lower.includes(`im ${name}`);
    })
    .join(" ");
  const lead = joined.match(LEADING_GREETING);
  if (!lead) return joined;
  const rest = joined.slice(lead[0].length);
  if (!rest) return "";
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

/** First message: the disclosure sentence, then any extra line that does not repeat it. */
export function openingGreeting(opts: { botName: string; businessName: string; extra?: string }): string {
  const disclosure = aiDisclosureSentence(opts.botName, opts.businessName);
  const follow = greetingFollowOn(opts.extra ?? "", opts.botName);
  return noDashes(follow ? `${disclosure} ${follow}` : disclosure);
}

export interface HandoffLink {
  label: string;
  href: string;
}

/** A call or email link for the widget. No lead form. Null when the site has neither. */
export function handoffTarget(business?: { phone?: string; email?: string }): HandoffLink | null {
  const phone = (business?.phone || "").trim();
  const email = (business?.email || "").trim();
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.length >= 6) return { label: "Contact the team", href: `tel:${digits}` };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { label: "Contact the team", href: `mailto:${email}` };
  return null;
}
