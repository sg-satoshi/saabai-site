import { getRedis } from "./redis";

export interface Subscriber {
  email: string;
  firstName: string;
  industry: string;
  source: string;
  subscribedAt: string;
  status: "active" | "unsubscribed";
  ip?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  /** "score_link" for the exit pop-up. Empty for older sign-ups (retired checklist). */
  offer?: string;
  /** Only "yes" may receive marketing broadcasts. Older sign-ups have no flag and stay out until they opt in. */
  marketingConsent?: "yes" | "no";
  consentAt?: string;
}

/** Marketing broadcasts go only to active subscribers who ticked the optional consent box. */
export function canReceiveMarketing(sub: Pick<Subscriber, "status" | "marketingConsent">): boolean {
  return sub.status === "active" && sub.marketingConsent === "yes";
}

export async function saveSubscriber(
  sub: Omit<Subscriber, "subscribedAt" | "status">
): Promise<{ isNew: boolean }> {
  const redis = getRedis();
  if (!redis) return { isNew: false };

  const key = `subscriber:${sub.email}`;
  const exists = await redis.hexists(key, "email");
  if (exists) return { isNew: false };

  const record: Record<string, string> = {
    email: sub.email,
    firstName: sub.firstName,
    industry: sub.industry,
    source: sub.source,
    subscribedAt: new Date().toISOString(),
    status: "active",
  };

  if (sub.ip) record.ip = sub.ip;
  if (sub.country) record.country = sub.country;
  if (sub.countryCode) record.countryCode = sub.countryCode;
  if (sub.city) record.city = sub.city;
  if (sub.region) record.region = sub.region;

  await redis.hset(key, record);
  await redis.lpush("subscribers:list", sub.email);
  await redis.incr("subscribers:count");

  return { isNew: true };
}

/**
 * Exit pop-up "Email me the link". New addresses are added with their consent choice.
 * An existing address keeps its record; a ticked box upgrades it to consented, an unticked box never removes consent.
 * Returns false when storage is unavailable.
 */
export async function saveScoreLinkSubscriber(rec: { email: string; source: string; marketingConsent: boolean; ip?: string }): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const key = `subscriber:${rec.email}`;
  const now = new Date().toISOString();
  const exists = await redis.hexists(key, "email");
  if (exists) {
    if (rec.marketingConsent) await redis.hset(key, { marketingConsent: "yes", consentAt: now });
    return true;
  }
  const record: Record<string, string> = {
    email: rec.email,
    firstName: "",
    industry: "",
    source: rec.source,
    subscribedAt: now,
    status: "active",
    offer: "score_link",
    marketingConsent: rec.marketingConsent ? "yes" : "no",
  };
  if (rec.marketingConsent) record.consentAt = now;
  if (rec.ip) record.ip = rec.ip;
  await redis.hset(key, record);
  await redis.lpush("subscribers:list", rec.email);
  await redis.incr("subscribers:count");
  return true;
}

/** One score-link email per address per window. Null when storage is unavailable. */
export async function claimScoreLinkSlot(email: string, seconds: number): Promise<boolean | null> {
  const redis = getRedis();
  if (!redis) return null;
  const res = await redis.set(`scorelink:rl:${email}`, "1", { nx: true, ex: seconds });
  return res === "OK";
}

export async function releaseScoreLinkSlot(email: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(`scorelink:rl:${email}`);
}

export async function getSubscribers(limit = 200): Promise<Subscriber[]> {
  const redis = getRedis();
  if (!redis) return [];

  const emails = await redis.lrange("subscribers:list", 0, limit - 1);
  if (!emails.length) return [];

  const rawRecords = await Promise.all(
    emails.map((email) => redis.hgetall<Record<string, string>>(`subscriber:${email}`))
  );

  const subscribers: Subscriber[] = [];

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const raw = rawRecords[i];

    if (!raw || Object.keys(raw).length === 0) {
      continue;
    }

    subscribers.push({
      email: raw.email ?? email,
      firstName: raw.firstName ?? "",
      industry: raw.industry ?? "",
      source: raw.source ?? "",
      subscribedAt: raw.subscribedAt ?? "",
      status: raw.status === "unsubscribed" ? "unsubscribed" : "active",
      ip: raw.ip || undefined,
      country: raw.country || undefined,
      countryCode: raw.countryCode || undefined,
      city: raw.city || undefined,
      region: raw.region || undefined,
      offer: raw.offer || undefined,
      marketingConsent: raw.marketingConsent === "yes" ? "yes" : raw.marketingConsent === "no" ? "no" : undefined,
      consentAt: raw.consentAt || undefined,
    });
  }

  return subscribers;
}

export async function deleteSubscribers(emails: string[]): Promise<number> {
  const redis = getRedis();
  if (!redis || !emails.length) return 0;

  let deleted = 0;

  for (const email of emails) {
    const existed = await redis.hexists(`subscriber:${email}`, "email");
    if (!existed) continue;

    await redis.del(`subscriber:${email}`);
    await redis.lrem("subscribers:list", 0, email);
    await redis.decr("subscribers:count");
    deleted++;
  }

  return deleted;
}

export async function getSubscriberCount(): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;

  const count = await redis.get("subscribers:count");
  return Number(count ?? 0);
}