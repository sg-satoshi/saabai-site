/**
 * GET /api/admin/lex-clients
 * Returns all Lex portal clients with their Redis config status.
 * Admin-only — requires valid saabai_session cookie for the SAABAI_ADMIN_ID account.
 */

import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "../../../../lib/auth";
import { getLexClients } from "../../../../lib/lex-config";
import { getRedis } from "../../../../lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

export interface LexClientRow {
  id: string;
  firmName: string;
  email: string;
  agentName: string;
  mode: "internal" | "external";
  practiceAreas: string[];
  hasPortalSettings: boolean;
  settingsSummary: {
    primaryGoal?: string;
    formalityLevel?: number;
    warmthLevel?: number;
    responseLength?: string;
    personalityTraits?: string[];
    practiceFocus?: string;
    lastSaved?: string;
    agentNameOverride?: string;
  } | null;
  hasLlmConfig: boolean;
  llmProvider?: string;
  llmModel?: string;
}

export async function GET() {
  // Auth check
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const session = await verifySessionToken(token);
  if (!session || session.clientId !== ADMIN_ID) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const lexClients = getLexClients();
  const redis = getRedis();

  // For each client, fetch portal settings and LLM config from Redis
  const rows = await Promise.all(
    lexClients.map(async (client): Promise<LexClientRow> => {
      let hasPortalSettings = false;
      let settingsSummary: LexClientRow["settingsSummary"] = null;
      let hasLlmConfig = false;
      let llmProvider: string | undefined;
      let llmModel: string | undefined;

      if (redis) {
        try {
          // Portal settings (keyed by team email)
          const rawSettings = await redis.get<string>(`portal:settings:${client.email.teamEmail}`);
          if (rawSettings) {
            hasPortalSettings = true;
            const parsed = typeof rawSettings === "string" ? JSON.parse(rawSettings) : rawSettings;
            settingsSummary = {
              primaryGoal: parsed.primaryGoal ?? "",
              formalityLevel: parsed.formalityLevel,
              warmthLevel: parsed.warmthLevel,
              responseLength: parsed.responseLength,
              personalityTraits: parsed.personalityTraits,
              practiceFocus: parsed.practiceFocus,
              lastSaved: parsed._savedAt,
              agentNameOverride: parsed.agentName !== client.agentName ? parsed.agentName : undefined,
            };
          }
        } catch { /* non-fatal */ }

        try {
          // LLM config (keyed by client ID)
          const rawLlm = await redis.hgetall<Record<string, string>>(`lex:llm:${client.id}`);
          if (rawLlm && rawLlm.provider) {
            hasLlmConfig = true;
            llmProvider = rawLlm.provider;
            llmModel = rawLlm.model;
          }
        } catch { /* non-fatal */ }
      }

      return {
        id: client.id,
        firmName: client.firmName,
        email: client.email.teamEmail,
        agentName: client.agentName,
        mode: client.mode,
        practiceAreas: client.practiceAreas,
        hasPortalSettings,
        settingsSummary,
        hasLlmConfig,
        llmProvider,
        llmModel,
      };
    })
  );

  // Summary stats
  const stats = {
    total: rows.length,
    configured: rows.filter(r => r.hasPortalSettings).length,
    withLlmKey: rows.filter(r => r.hasLlmConfig).length,
  };

  return Response.json({ clients: rows, stats });
}
