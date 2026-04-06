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
}

export async function saveSubscriber(
  sub: Omit<Subscriber, "subscribedAt" | "status">
): Promise<{ isNew: boolean }> {
  const redis = getRedis();
  if (!redis) return { isNew: false };

  const key = `subscriber:${sub.email}`;
  const exists = await redis.hexists(key, "email");
  if (exists) return { isNew: false };

  // Strip undefined fields so Redis doesn't store literal "undefined"
  const record: Record<string, string> = {
    email: sub.email,
    firstName: sub.firstName,
    industry: sub.industry,
    source: sub.source,
    subscribedAt: new Date().toISOString(),
    status: "active",
  };
  if (sub.ip)          record.ip          = sub.ip;
  if (sub.country)     record.country     = sub.country;
  if (sub.countryCode) record.countryCode = sub.countryCode;
  if (sub.city)        record.city        = sub.city;
  if (sub.region)      record.region      = sub.region;

  await redis.hset(key, record);
  await redis.lpush("subscribers:list", sub.email);
  await redis.incr("subscribers:count");

  return { isNew: true };
}

export async function getSubscribers(limit = 200): Promise<Subscriber[]> {
  const redis = getRedis();
  if (!redis) return [];

  const emails = (await redis.lrange("subscribers:list", 0, limit - 1)) as string[];
  if (!emails.length) return [];

  const records = await Promise.all(
    emails.map((email) =>
      redis.hgetall(`subscriber:${email}`) as Promise<Subscriber | null>
    )
  );

  return records.filter((r): r is Subscriber => r !== null);
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
