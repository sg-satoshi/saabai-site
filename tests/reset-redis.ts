/** Test-only. Drops the cached Redis client so the next getRedis() uses the current env. */
const REDIS_SLOT = Symbol.for("saabai.redis.client");

export function resetRedisForTests(): void {
  (globalThis as unknown as Record<symbol, null>)[REDIS_SLOT] = null;
}
