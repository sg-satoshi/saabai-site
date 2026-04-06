import { getRedis } from "./redis";

export interface Subscriber {
  email: string;
  firstName: string;
  industry: string;
  source: string;
  subscribedAt: string;
  status: "active" | "unsubscribed";
}

export async function saveSubscriber(
  sub: Omit<Subscriber, "subscribedAt" | "status">
): Promise<{ isNew: boolean }> {
  const redis = getRedis();
  if (!redis) return { isNew: false };

  const key = `subscriber:${sub.email}`;
  const exists = await redis.hexists(key, "email");
  if (exists) return { isNew: false };

  const record: Subscriber = {
    ...sub,
    subscribedAt: new Date().toISOString(),
    status: "active",
  };

  await redis.hset(key, record as unknown as Record<string, unknown>);
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

export async function getSubscriberCount(): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;

  const count = await redis.get("subscribers:count");
  return Number(count ?? 0);
}
