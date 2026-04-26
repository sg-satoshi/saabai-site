import { NextRequest, NextResponse } from "next/server";
import {
  getClientLLMConfig,
  saveClientLLMConfig,
  buildModelFromConfig,
  encryptKey,
} from "../../../lib/client-config";
import { getRedis } from "../../../lib/redis";
import type { ClientLLMConfig } from "../../../lib/client-config";
import { generateText } from "ai";

/** GET /api/lex-settings?clientId=xxx — returns config without the real key */
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

  const config = await getClientLLMConfig(clientId);
  if (!config) return NextResponse.json({ configured: false });

  return NextResponse.json({
    configured: true,
    provider:   config.provider,
    model:      config.model,
    keyHint:    `****${config.keyHint}`,
    updatedAt:  config.updatedAt,
  });
}

/** POST /api/lex-settings — save or test config */
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    action:   "save" | "test";
    clientId: string;
    provider: string;
    model:    string;
    apiKey?:  string;  // optional — if omitted, use stored key
  };

  const { action, clientId, provider, model, apiKey } = body;

  if (!clientId || !provider || !model) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (action === "test") {
    try {
      let testConfig: ClientLLMConfig;

      if (apiKey?.trim()) {
        // Test with a newly entered key
        testConfig = {
          provider,
          model,
          encryptedKey: encryptKey(apiKey),
          keyHint:      apiKey.slice(-4),
          updatedAt:    Date.now(),
        };
      } else {
        // Test with the existing stored key
        const stored = await getClientLLMConfig(clientId);
        if (!stored) {
          return NextResponse.json({ ok: false, error: "No API key saved yet. Enter your key first." });
        }
        // Allow testing a different model/provider against the stored key
        testConfig = { ...stored, provider, model };
      }

      const llmModel = buildModelFromConfig(testConfig);
      if (!llmModel) {
        return NextResponse.json({ ok: false, error: "Unsupported provider" });
      }

      const { text } = await generateText({
        model: llmModel,
        messages: [{ role: "user", content: "Reply with only the word: connected" }],
        maxOutputTokens: 10,
      });
      const passed = text.toLowerCase().includes("connect");
      return NextResponse.json({ ok: passed, response: text.trim() });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ ok: false, error: msg });
    }
  }

  // action === "save"
  try {
    if (apiKey?.trim()) {
      // Save with a new key
      await saveClientLLMConfig(clientId, { provider, model, apiKey });
    } else {
      // No new key — update model/provider only, keep existing encrypted key
      const stored = await getClientLLMConfig(clientId);
      if (!stored) {
        return NextResponse.json({ ok: false, error: "No API key saved yet. Enter your key first." });
      }
      const redis = getRedis();
      if (!redis) throw new Error("Redis not configured");
      const updated: ClientLLMConfig = { ...stored, provider, model, updatedAt: Date.now() };
      await redis.set(`lex:llm:${clientId}`, updated);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg });
  }
}
