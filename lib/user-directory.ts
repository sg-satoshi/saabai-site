import { getRedis } from "./redis";
import type { ProductId } from "./user-products";

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
  dashboardUrl: string;
  products?: ProductId[];
  /** Site Factory site this client owns (links requests + plan to their website). */
  siteId?: string;
  approvedAt: string;
  createdAt: string;
  profile?: UserProfile;
}

export interface UserProfile {
  phone?: string;
  mobile?: string;
  address?: {
    street?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  gender?: "male" | "female" | "other" | "prefer-not-to-say";
  dateOfBirth?: string; // ISO date string
  businessName?: string;
  businessType?: string;
  interests?: string;       // comma-separated
  favouriteBrands?: string; // comma-separated
  favouriteProducts?: string;
  referralSource?: string;
  marketingConsent?: boolean;
  notes?: string;
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
  try {
    await redis.hset(USERS_KEY, { [user.email.toLowerCase()]: JSON.stringify(user) });
  } catch (err) {
    // Redis client errors echo the full command (which includes the password
    // hash). Re-throw a clean error so it can't end up in logs or responses.
    throw new Error(`Failed to save directory user (${err instanceof Error ? err.name : "unknown error"})`);
  }
}

export async function listDirectoryUsers(): Promise<DirectoryUser[]> {
  const redis = getRedis();
  if (!redis) return [];
  const raw = await redis.hgetall<Record<string, string>>(USERS_KEY);
  if (!raw) return [];
  return Object.values(raw)
    .map(v => parse<DirectoryUser>(v))
    .filter((u): u is DirectoryUser => u !== null)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function deleteDirectoryUser(email: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.hdel(USERS_KEY, email.toLowerCase());
}
