import { getRedis } from "./redis";

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
  dashboardUrl: string;
  approvedAt: string;
  createdAt: string;
}

const USERS_KEY = "saabai:users";

function parse<T>(raw: unknown): T | null {
  if (!raw) return null;
  if (typeof raw === "string") { try { return JSON.parse(raw) as T; } catch { return null; } }
  return raw as T;
}

export async function getDirectoryUser(email: string): Promise<DirectoryUser | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.hget(USERS_KEY, email.toLowerCase());
  return parse<DirectoryUser>(raw);
}

export async function saveDirectoryUser(user: DirectoryUser): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.hset(USERS_KEY, { [user.email.toLowerCase()]: JSON.stringify(user) });
}

export async function listDirectoryUsers(): Promise<DirectoryUser[]> {
  const redis = getRedis();
  if (!redis) return [];
  const raw = await redis.hgetall<Record<string, string>>(USERS_KEY);
  if (!raw) return [];
  return Object.values(raw)
    .map(v => parse<DirectoryUser>(v))
    .filter((u): u is DirectoryUser => u !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function deleteDirectoryUser(email: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.hdel(USERS_KEY, email.toLowerCase());
}
