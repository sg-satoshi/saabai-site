/**
 * Minimal key-value + list persistence for gateway guardrails.
 *
 * Uses Upstash Redis when configured (prod), otherwise an in-memory fallback so
 * approvals + audit run deterministically in tests and local dev. Values are
 * stored as JSON strings for a uniform contract across both backends.
 */
import { getRedis } from "../redis";

type Backend = {
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  get(key: string): Promise<string | null>;
  rpush(key: string, value: string): Promise<number>;
  lrange(key: string, start: number, end: number): Promise<string[]>;
};

const mem = new Map<string, string>();
const memLists = new Map<string, string[]>();
let backend: Backend | null = null;

function backendInstance(): Backend {
  if (backend) return backend;
  const redis = getRedis();
  if (redis) {
    backend = {
      async set(key, value, ttlSeconds) {
        await redis.set(key, value, ttlSeconds ? { ex: ttlSeconds } : undefined);
      },
      async get(key) {
        return (await redis.get<string>(key)) ?? null;
      },
      async rpush(key, value) {
        return redis.rpush(key, value);
      },
      async lrange(key, start, end) {
        return (await redis.lrange(key, start, end)) ?? [];
      },
    };
  } else {
    backend = {
      async set(key, value) {
        mem.set(key, value);
      },
      async get(key) {
        return mem.get(key) ?? null;
      },
      async rpush(key, value) {
        const arr = memLists.get(key) ?? [];
        arr.push(value);
        memLists.set(key, arr);
        return arr.length;
      },
      async lrange(key, start, end) {
        const arr = memLists.get(key) ?? [];
        const e = end < 0 ? arr.length : end + 1;
        return arr.slice(start, e);
      },
    };
  }
  return backend;
}

export async function kvSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  await backendInstance().set(key, JSON.stringify(value), ttlSeconds);
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const raw = await backendInstance().get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function kvListAppend(key: string, value: unknown): Promise<void> {
  await backendInstance().rpush(key, JSON.stringify(value));
}

export async function kvListRange(key: string, start = 0, end = -1): Promise<unknown[]> {
  const raw = await backendInstance().lrange(key, start, end);
  return raw.map((s) => {
    try {
      return JSON.parse(s);
    } catch {
      return s;
    }
  });
}
