/**
 * Environment variable validation
 * Ensures all critical env vars are present at startup
 * Prevents mysterious runtime failures from missing config
 */

import { z } from "zod";

const envSchema = z.object({
  // Public URLs
  NEXT_PUBLIC_BASE_URL: z.string().url().default("https://www.saabai.ai"),

  // API Keys & Secrets
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  SAABAI_ADMIN_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),

  // External Services
  MAKE_LINKEDIN_WEBHOOK_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  HEYGEN_API_KEY: z.string().optional(),
  HEYGEN_AVATAR_ID: z.string().optional(),

  // Dashboard Auth
  REX_DASHBOARD_PASSWORD: z.string().optional(),

  // AI Model Overrides
  LEX_MODEL: z.string().optional(),
  MUZZLE_MODEL: z.string().optional(),

  // Resend (Email)
  RESEND_API_KEY: z.string().optional(),

  // WooCommerce
  WOO_CONSUMER_KEY: z.string().optional(),
  WOO_CONSUMER_SECRET: z.string().optional(),
  WOO_API_URL: z.string().optional(),

  // Pipedrive
  PIPEDRIVE_API_TOKEN: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
});

type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Get and validate environment variables
 * Throws on first load if validation fails
 * Cached afterwards for performance
 */
export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(", ")}`)
      .join("\n");

    throw new Error(
      `❌ Environment validation failed:\n${messages}\n\nPlease check your .env.local or Vercel environment variables.`
    );
  }

  cachedEnv = result.data;
  return cachedEnv;
}

// Validate immediately on import (server-side only)
if (typeof window === "undefined") {
  try {
    getEnv();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

export const env = getEnv();
