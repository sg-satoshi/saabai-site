/**
 * Where an outbound notification is allowed to go.
 *
 * Portal and admin alerts (new request, critical alert) use an explicit Saabai
 * admin destination. They never read a customer bot, a shared TELEGRAM_CHAT_ID,
 * or "the first site". If the admin Telegram pair is missing, or it is the same
 * credential as a customer channel, the caller sends nothing on Telegram and
 * emails the admin inbox only.
 *
 * A site lead uses that site's own channel. An unknown site does not borrow
 * another site's bot or inbox.
 */

export const SAABAI_ADMIN_EMAIL = "hello@saabai.ai";

/** Last-resort inbox for a site lead that has no address of its own. Not a customer. */
export const ADMIN_LEAD_FALLBACK_EMAIL = "shanegoldberg@pm.me";

/** Stu's Cycle Repairs quote form. Only that site's leads may use this address. */
export const CYCLE_REPAIR_LEAD_EMAIL = "stuscyclerepairs@gmail.com";

export type EnvLike = Record<string, string | undefined>;

export type TelegramDestination = {
  token: string;
  chatId: string;
};

const ADMIN_TOKEN_KEYS = ["ADMIN_TELEGRAM_BOT_TOKEN", "SAABAI_TELEGRAM_BOT_TOKEN"] as const;
const ADMIN_CHAT_KEYS = ["ADMIN_TELEGRAM_CHAT_ID", "SAABAI_TELEGRAM_CHAT_ID"] as const;

export type SiteTelegramSpec = {
  slug: string;
  tokenKey: string;
  chatKey: string;
};

/** One row per customer. Lookup is by slug only. There is no default row. */
export const SITE_TELEGRAM: SiteTelegramSpec[] = [
  { slug: "cycle-repair", tokenKey: "TELEGRAM_CYCLE_BOT_TOKEN", chatKey: "TELEGRAM_CYCLE_CHAT_ID" },
  { slug: "nico-moretti", tokenKey: "TG_NICO_BOT", chatKey: "TELEGRAM_CHAT_ID_NICO_MORETTI" },
  { slug: "heaven-thai-massage", tokenKey: "TG_HTM_BOT", chatKey: "TELEGRAM_CHAT_ID_HEAVEN_THAI_MASSAGE" },
  { slug: "wholesale-homes", tokenKey: "TG_WHOLESALE_HOMES_BOT", chatKey: "TELEGRAM_CHAT_ID_WHOLESALE_HOMES" },
];

/** Shared names that used to sit in front of a customer bot. Admin routing must not read them. */
const SHARED_TELEGRAM_KEYS = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "TELEGRAM_SHANE_CHAT_ID"] as const;

const LEAD_EMAIL_OVERRIDES: Record<string, string> = {
  "bo-consultancy": "info@boconsulting.com.au",
  "wholesale-homes": "hello@wholesalehomes.com.au",
};

function read(env: EnvLike, key: string): string {
  return (env[key] || "").trim();
}

function firstSet(env: EnvLike, keys: readonly string[]): string {
  for (const key of keys) {
    const value = read(env, key);
    if (value) return value;
  }
  return "";
}

function customerTelegramValues(env: EnvLike, field: "tokenKey" | "chatKey"): Set<string> {
  const values = new Set<string>();
  for (const spec of SITE_TELEGRAM) {
    const value = read(env, spec[field]);
    if (value) values.add(value);
  }
  return values;
}

export function isCustomerTelegramChat(chatId: string, env: EnvLike = process.env): boolean {
  const want = chatId.trim();
  if (!want) return false;
  if (customerTelegramValues(env, "chatKey").has(want)) return true;
  return read(env, "TELEGRAM_CHAT_ID") === want;
}

export function isCustomerTelegramToken(token: string, env: EnvLike = process.env): boolean {
  const want = token.trim();
  if (!want) return false;
  if (customerTelegramValues(env, "tokenKey").has(want)) return true;
  return read(env, "TELEGRAM_BOT_TOKEN") === want;
}

/**
 * Admin Telegram. Both halves must come from an admin-only variable, and neither
 * value may be a customer channel that is also configured.
 */
export function adminTelegramDestination(env: EnvLike = process.env): TelegramDestination | null {
  const token = firstSet(env, ADMIN_TOKEN_KEYS);
  const chatId = firstSet(env, ADMIN_CHAT_KEYS);
  if (!token || !chatId) return null;
  if (isCustomerTelegramToken(token, env) || isCustomerTelegramChat(chatId, env)) return null;
  return { token, chatId };
}

export function adminRequestEmail(env: EnvLike = process.env, kind: "new" | "critical" = "new"): string {
  if (kind === "critical") {
    return read(env, "REQUESTS_CRITICAL_EMAIL") || read(env, "REQUESTS_NOTIFY_EMAIL") || SAABAI_ADMIN_EMAIL;
  }
  return read(env, "REQUESTS_NOTIFY_EMAIL") || SAABAI_ADMIN_EMAIL;
}

export type PortalAlertSubject = {
  priority?: string;
  /** Present on the request. Not used to pick a destination. */
  siteId?: string;
  siteName?: string;
  clientId?: string;
};

export type PortalAlertPlan = {
  emailTo: string;
  telegram: TelegramDestination | null;
  /** Set when Telegram must not be used. */
  telegramSkip: string;
};

/**
 * Destination for a portal or dashboard request alert.
 * siteId, siteName and clientId are ignored. A missing site, or a site id of
 * cycle-repair, must not select Stu's chat.
 */
export function planPortalRequestAlert(
  request: PortalAlertSubject,
  env: EnvLike = process.env,
): PortalAlertPlan {
  const emailTo = adminRequestEmail(env, request.priority === "critical" ? "critical" : "new");
  const token = firstSet(env, ADMIN_TOKEN_KEYS);
  const chatId = firstSet(env, ADMIN_CHAT_KEYS);
  const telegram = adminTelegramDestination(env);
  let telegramSkip = "";
  if (!telegram) {
    if ((token && isCustomerTelegramToken(token, env)) || (chatId && isCustomerTelegramChat(chatId, env))) {
      telegramSkip = "Admin Telegram destination matches a customer channel. Not sending.";
    } else {
      telegramSkip =
        "Admin Telegram is not configured (ADMIN_TELEGRAM_BOT_TOKEN + ADMIN_TELEGRAM_CHAT_ID, or SAABAI_TELEGRAM_BOT_TOKEN + SAABAI_TELEGRAM_CHAT_ID). Not sending to any customer channel.";
    }
  }
  return { emailTo, telegram, telegramSkip };
}

/** Telegram for one site's own leads. Unknown slugs and other sites return null. */
export function siteTelegramDestination(siteSlug: string, env: EnvLike = process.env): TelegramDestination | null {
  const spec = SITE_TELEGRAM.find((row) => row.slug === siteSlug);
  if (!spec) return null;
  const token = read(env, spec.tokenKey);
  const chatId = read(env, spec.chatKey);
  if (!token || !chatId) return null;
  return { token, chatId };
}

/**
 * Email for one site's own leads.
 * Order: that site's override, that site's LEAD_NOTIFY_EMAIL_<SLUG>, the site's
 * own business email, then the admin inbox. Never another site's address.
 */
export function siteLeadEmail(
  siteSlug: string,
  siteBusinessEmail: string | undefined,
  env: EnvLike = process.env,
): string {
  const override = LEAD_EMAIL_OVERRIDES[siteSlug];
  const slugKey = `LEAD_NOTIFY_EMAIL_${siteSlug.toUpperCase().replace(/-/g, "_")}`;
  const business = (siteBusinessEmail || "").trim();
  return override || read(env, slugKey) || business || read(env, "LEAD_NOTIFY_EMAIL") || ADMIN_LEAD_FALLBACK_EMAIL;
}

/** Names admin routing is not allowed to consult. Exported for the regression test. */
export const ADMIN_ROUTING_FORBIDDEN_ENV = [
  ...SHARED_TELEGRAM_KEYS,
  ...SITE_TELEGRAM.flatMap((spec) => [spec.tokenKey, spec.chatKey]),
] as const;
