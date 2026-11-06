import { SES_SENDS_PER_SECOND } from "./constants";

export type RateCounter = {
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
};

export type SendSlot = { ok: boolean; waitMs: number };

/**
 * One send slot inside the current second, shared across instances when Redis
 * is passed. Without Redis, the caller waits 100ms so one process stays at 10/s.
 */
export async function acquireSendSlot(counter: RateCounter | null, now = Date.now()): Promise<SendSlot> {
  if (!counter) return { ok: true, waitMs: Math.ceil(1000 / SES_SENDS_PER_SECOND) };
  const sec = Math.floor(now / 1000);
  const key = `ses:rate:${sec}`;
  const n = await counter.incr(key);
  if (n === 1) await counter.expire(key, 2);
  if (n <= SES_SENDS_PER_SECOND) return { ok: true, waitMs: 0 };
  await counter.decr(key);
  return { ok: false, waitMs: Math.max(50, 1000 - (now % 1000)) };
}
