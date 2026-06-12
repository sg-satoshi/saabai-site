#!/usr/bin/env node
/**
 * One-off utility: rotate a directory user's password in Upstash Redis.
 *
 * Usage:
 *   node scripts/rotate-admin-password.mjs '<new-password>'
 *   node scripts/rotate-admin-password.mjs '<new-password>' someone@else.com
 *
 * Reads Upstash creds from .env.local (UPSTASH_REDIS_REST_URL / _TOKEN).
 * The password you pass stays on your machine — it is never printed.
 */
import { config } from "dotenv";
import { Redis } from "@upstash/redis";

config({ path: ".env.local" });

const KEY = "saabai:users";
const newPassword = process.argv[2];
const email = (process.argv[3] || "hello@saabai.ai").toLowerCase();

if (!newPassword) {
  console.error("Usage: node scripts/rotate-admin-password.mjs '<new-password>' [email]");
  process.exit(1);
}
if (newPassword.length < 12) {
  console.error("Refusing: choose a password of at least 12 characters.");
  process.exit(1);
}

const redis = Redis.fromEnv();
const raw = await redis.hget(KEY, email);
if (!raw) {
  console.error(`No directory user found for ${email}`);
  process.exit(1);
}

const user = typeof raw === "string" ? JSON.parse(raw) : raw;
user.password = newPassword;
user.passwordRotatedAt = new Date().toISOString();
await redis.hset(KEY, { [email]: JSON.stringify(user) });

console.log(`✓ Password rotated for ${email} (length ${newPassword.length}). New password not printed.`);
