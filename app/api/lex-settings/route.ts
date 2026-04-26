import { NextRequest, NextResponse } from "next/server";
import {
  getClientLLMConfig,
  saveClientLLMConfig,
  buildModelFromConfig,
  encryptKey,
} from "../../../lib/client-config";
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
    apiKey:   string;
  };

  const { action, clientId, provider, model, apiKey } = body;

  if (!clientId || !provider || !model || !apiKey) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (action === "test") {
    // Build a temporary config to test against
    const tempConfig = {
      provider,
      model,
      encryptedKey: encryptKey(apiKey),
      keyHint: apiKey.slice(-4),
      updatedAt: Date.now(),
    };

    const llmModel = buildModelFromConfig(tempConfig);
    if (!llmModel) {
      return NextResponse.json({ ok: false, error: "Unsupported provider" }, { status: 400 });
    }

    try {
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
  await saveClientLLMConfig(clientId, { provider, model, apiKey });
  return NextResponse.json({ ok: true });
}
