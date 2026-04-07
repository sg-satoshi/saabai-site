import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "../../../../lib/portal-session";
import { getRedis } from "../../../../lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) return trimmed.slice(eq + 1);
  }
  return undefined;
}

function buildCompiledConfig(settings: Record<string, unknown>): string {
  const firmName        = String(settings.firmName        ?? "Your Firm");
  const primaryGoal     = String(settings.primaryGoal     ?? "");
  const successDef      = String(settings.successDefinition ?? "");
  const targetClient    = String(settings.targetClient    ?? "");
  const desiredOutcomes = Array.isArray(settings.desiredOutcomes) ? (settings.desiredOutcomes as string[]) : [];
  const agentName       = String(settings.agentName       ?? "Lex");
  const welcomeMessage  = String(settings.welcomeMessage  ?? "");
  const formalityLevel  = settings.formalityLevel  ?? 75;
  const warmthLevel     = settings.warmthLevel     ?? 60;
  const humorLevel      = settings.humorLevel      ?? 20;
  const responseLength  = String(settings.responseLength  ?? "balanced");
  const personalityTraits = Array.isArray(settings.personalityTraits) ? (settings.personalityTraits as string[]) : [];
  const skillPacks      = Array.isArray(settings.skillPacks) ? (settings.skillPacks as string[]) : [];
  const alwaysSay       = Array.isArray(settings.alwaysSay) ? (settings.alwaysSay as string[]) : [];
  const neverSay        = Array.isArray(settings.neverSay)  ? (settings.neverSay  as string[]) : [];
  const instructionLog  = Array.isArray(settings.instructionLog)
    ? (settings.instructionLog as Array<{ text: string; ts: string }>)
    : [];

  const outcomesSection = desiredOutcomes.length
    ? desiredOutcomes.map((o, i) => `${i + 1}. ${o}`).join("\n")
    : "_(none)_";

  const instructionsSection = instructionLog.length
    ? instructionLog
        .map((entry, i) => {
          const date = entry.ts ? new Date(entry.ts).toLocaleDateString("en-AU") : "";
          return `[Amendment ${i + 1}] (${date}): ${entry.text}`;
        })
        .join("\n")
    : "_(none)_";

  return [
    `# Lex Configuration — ${firmName}`,
    "",
    "## Goals & Strategy",
    `**Primary Goal:** ${primaryGoal}`,
    `**Successful Conversation:** ${successDef}`,
    `**Ideal Client:** ${targetClient}`,
    "**Desired Outcomes:**",
    outcomesSection,
    "",
    "## Identity",
    `**Agent Name:** ${agentName}`,
    `**Welcome Message:** ${welcomeMessage}`,
    "",
    "## Voice & Tone",
    `**Formality:** ${formalityLevel}% | **Warmth:** ${warmthLevel}% | **Humour:** ${humorLevel}%`,
    `**Response Length:** ${responseLength}`,
    "",
    "## Personality Traits",
    personalityTraits.length ? personalityTraits.join(", ") : "_(none)_",
    "",
    "## Active Skill Packs",
    skillPacks.length ? skillPacks.join(", ") : "_(none)_",
    "",
    "## Language Rules",
    `**Always say:** ${alwaysSay.length ? alwaysSay.join(", ") : "_(none)_"}`,
    `**Never say:** ${neverSay.length ? neverSay.join(", ") : "_(none)_"}`,
    "",
    "## Custom Instructions",
    instructionsSection,
  ].join("\n");
}

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");
  const token = parseCookie(cookieHeader, "portal_session");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = verifySession(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ settings: null });
  }

  const raw = await redis.get(`portal:settings:${session.email}`) as string | null;
  if (!raw) {
    return NextResponse.json({ settings: null });
  }

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return NextResponse.json({ settings: parsed });
  } catch {
    return NextResponse.json({ settings: null });
  }
}

export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");
  const token = parseCookie(cookieHeader, "portal_session");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = verifySession(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Missing settings" }, { status: 400 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
  }

  const savedAt = new Date().toISOString();
  const compiledConfig = buildCompiledConfig(body);

  await Promise.all([
    redis.set(`portal:settings:${session.email}`, JSON.stringify(body)),
    redis.set(`portal:config:${session.email}`, compiledConfig),
  ]);

  return NextResponse.json({ ok: true, savedAt });
}
