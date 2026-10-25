/**
 * Caps and transcripts for the homepage voice demo.
 * Persistent store is Upstash Redis via getRedis() (the repo's existing store).
 *
 * TODO: if UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing,
 * getVoiceStore() falls back to memory. That only caps one server instance.
 * The public demo needs Upstash. Do not treat the fallback as the real cap.
 */
import { Redis } from "@upstash/redis";
import { getRedis } from "../redis";

export interface VoiceStore {
  incr(key: string, ttlSec: number): Promise<number>;
  decrFloor(key: string): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSec: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Push a transcript id onto a short index. */
  pushId(key: string, id: string): Promise<void>;
  /** Run fn alone. Returns "locked" if the lock cannot be taken. */
  withLock<T>(fn: () => Promise<T>): Promise<T | "locked">;
}

type MemEntry = { value: string; exp: number };

function asString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function createMemoryVoiceStore(now: () => number = Date.now): VoiceStore {
  const map = new Map<string, MemEntry>();
  const lists = new Map<string, string[]>();
  let locked = false;

  const read = (key: string): MemEntry | null => {
    const entry = map.get(key);
    if (!entry) return null;
    if (entry.exp <= now()) {
      map.delete(key);
      return null;
    }
    return entry;
  };

  return {
    async incr(key, ttlSec) {
      const entry = read(key);
      if (!entry) {
        map.set(key, { value: "1", exp: now() + ttlSec * 1000 });
        return 1;
      }
      const n = Number(entry.value) + 1;
      map.set(key, { value: String(n), exp: entry.exp });
      return n;
    },
    async decrFloor(key) {
      const entry = read(key);
      if (!entry) return;
      const n = Number(entry.value) - 1;
      if (n <= 0) map.delete(key);
      else map.set(key, { value: String(n), exp: entry.exp });
    },
    async get(key) {
      return read(key)?.value ?? null;
    },
    async set(key, value, ttlSec) {
      map.set(key, { value, exp: now() + ttlSec * 1000 });
    },
    async del(key) {
      map.delete(key);
    },
    async pushId(key, id) {
      const list = lists.get(key) ?? [];
      list.unshift(id);
      lists.set(key, list.slice(0, 200));
    },
    async withLock(fn) {
      if (locked) return "locked";
      locked = true;
      try {
        return await fn();
      } finally {
        locked = false;
      }
    },
  };
}

function redisVoiceStore(redis: Redis): VoiceStore {
  return {
    async incr(key, ttlSec) {
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, ttlSec);
      return Number(n);
    },
    async decrFloor(key) {
      const n = Number(await redis.decr(key));
      if (n <= 0) await redis.del(key);
    },
    async get(key) {
      return asString(await redis.get(key));
    },
    async set(key, value, ttlSec) {
      await redis.set(key, value, { ex: ttlSec });
    },
    async del(key) {
      await redis.del(key);
    },
    async pushId(key, id) {
      await redis.lpush(key, id);
      await redis.ltrim(key, 0, 199);
    },
    async withLock(fn) {
      const lockKey = "voice:lock";
      for (let i = 0; i < 8; i++) {
        const ok = await redis.set(lockKey, "1", { nx: true, ex: 5 });
        if (ok) {
          try {
            return await fn();
          } finally {
            await redis.del(lockKey);
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 40 * (i + 1)));
      }
      return "locked";
    },
  };
}

let memory: VoiceStore | null = null;

export function getVoiceStore(): { store: VoiceStore; persistent: boolean } {
  const redis = getRedis();
  if (redis) return { store: redisVoiceStore(redis), persistent: true };
  if (!memory) memory = createMemoryVoiceStore();
  return { store: memory, persistent: false };
}
