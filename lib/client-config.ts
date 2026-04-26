/**
 * Per-client LLM configuration.
 *
 * Each Lex client can supply their own API key and preferred model.
 * Keys are encrypted at rest with AES-256-GCM using the ENCRYPTION_KEY env var.
 * The plaintext key is never stored or returned to the frontend.
 *
 * Redis key: lex:llm:{clientId}
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { getRedis } from "./redis";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI }    from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai }       from "@ai-sdk/xai";
import type { LanguageModel } from "ai";

const ALGO = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY env var must be set to a 64-character hex string (32 bytes). " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

/** Encrypt an API key for storage. Returns "iv:tag:ciphertext" in hex. */
export function encryptKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv  = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** Decrypt a stored API key. Input: "iv:tag:ciphertext" in hex. */
export function decryptKey(stored: string): string {
  const key = getEncryptionKey();
  const [ivHex, tagHex, cipherHex] = stored.split(":");
  const iv        = Buffer.from(ivHex,    "hex");
  const tag       = Buffer.from(tagHex,   "hex");
  const encrypted = Buffer.from(cipherHex, "hex");
  const decipher  = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export interface ClientLLMConfig {
  provider: string;            // "anthropic" | "openai" | "google" | "xai"
  model: string;               // e.g. "claude-sonnet-4-6"
  encryptedKey: string;        // AES-256-GCM encrypted API key
  keyHint: string;             // Last 4 chars of the plaintext key for display
  updatedAt: number;           // Unix ms
}

const redisKey = (clientId: string) => `lex:llm:${clientId}`;

export async function getClientLLMConfig(clientId: string): Promise<ClientLLMConfig | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;
    return await redis.get<ClientLLMConfig>(redisKey(clientId));
  } catch {
    return null;
  }
}

export async function saveClientLLMConfig(
  clientId: string,
  payload: { provider: string; model: string; apiKey: string }
): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis not configured");
  const config: ClientLLMConfig = {
    provider:     payload.provider,
    model:        payload.model,
    encryptedKey: encryptKey(payload.apiKey),
    keyHint:      payload.apiKey.slice(-4),
    updatedAt:    Date.now(),
  };
  await redis.set(redisKey(clientId), config);
}

/**
 * Build an AI SDK LanguageModel from a stored client config.
 * Returns null if the provider is unsupported or decryption fails.
 */
export function buildModelFromConfig(config: ClientLLMConfig): LanguageModel | null {
  try {
    const apiKey = decryptKey(config.encryptedKey);
    switch (config.provider) {
      case "anthropic":
        return createAnthropic({ apiKey })(config.model);
      case "openai":
        return createOpenAI({ apiKey })(config.model);
      case "google":
        return createGoogleGenerativeAI({ apiKey })(config.model);
      case "xai":
        return createXai({ apiKey })(config.model);
      default:
        console.warn(`[client-config] Unknown provider: ${config.provider}`);
        return null;
    }
  } catch (err) {
    console.error("[client-config] buildModelFromConfig failed", err);
    return null;
  }
}
