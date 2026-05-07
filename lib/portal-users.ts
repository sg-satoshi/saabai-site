import { getRedis } from "./redis";

export interface PortalUser {
  id: string;
  name: string;
  email: string;
  password: string;
  dashboardUrl: string;
  approvedAt: string;
}

export interface PendingRequest {
  name: string;
  email: string;
  company: string;
  requestedAt: string;
}

const USERS_KEY   = "portal:users";
const PENDING_KEY = "portal:pending";

function parse<T>(raw: unknown): T | null {
  if (!raw) return null;
  if (typeof raw === "string") { try { return JSON.parse(raw) as T; } catch { return null; } }
  return raw as T;
}

export async function getPortalUser(email: string): Promise<PortalUser | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.hget(USERS_KEY, email.toLowerCase());
  return parse<PortalUser>(raw);
}

export async function savePortalUser(user: PortalUser): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.hset(USERS_KEY, { [user.email.toLowerCase()]: JSON.stringify(user) });
}

export async function listPendingRequests(): Promise<PendingRequest[]> {
  const redis = getRedis();
  if (!redis) return [];
  const raw = await redis.hgetall<Record<string, string>>(PENDING_KEY);
  if (!raw) return [];
  return Object.values(raw)
    .map(v => parse<PendingRequest>(v))
    .filter(Boolean) as PendingRequest[];
}

export async function savePendingRequest(req: PendingRequest): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.hset(PENDING_KEY, { [req.email.toLowerCase()]: JSON.stringify(req) });
}

export async function deletePendingRequest(email: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.hdel(PENDING_KEY, email.toLowerCase());
}
