import { Redis } from "@upstash/redis";

// Lazily initialised — safe to import in edge functions
let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

// ─── Lead record ──────────────────────────────────────────────────────────────

export interface LeadRecord {
  id: string;
  name?: string;
  business?: string;
  industry?: string;
  team_size?: string;
  pain_points?: string[];
  qualification_score?: number;
  business_fit?: boolean;
  pain_point_named?: boolean;
  automation_potential?: boolean;
  outcome: "booked" | "lead_captured" | "browsing" | "qualified";
  page?: string;
  messages?: number;
  summary?: string;
  createdAt: string;
}

export async function saveLead(lead: Omit<LeadRecord, "id" | "createdAt">): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  const id = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const record: LeadRecord = { ...lead, id, createdAt: new Date().toISOString() };
  await redis.hset(`lead:${id}`, record as unknown as Record<string, unknown>);
  await redis.lpush("leads:list", id);
  await redis.ltrim("leads:list", 0, 499); // Keep last 500
  return id;
}

export async function getLeads(limit = 50): Promise<LeadRecord[]> {
  const redis = getRedis();
  if (!redis) return [];
  const ids = await redis.lrange("leads:list", 0, limit - 1) as string[];
  if (!ids.length) return [];
  const records = await Promise.all(
    ids.map((id) => redis.hgetall(`lead:${id}`) as Promise<LeadRecord | null>)
  );
  return records.filter((r): r is LeadRecord => r !== null);
}

// ─── Conversation record ───────────────────────────────────────────────────────

export interface ConversationRecord {
  id: string;
  visitorFacts?: Record<string, unknown>;
  qualificationScore?: number;
  outcome?: string;
  messageCount?: number;
  pageContext?: string;
  keyTopics?: string[];
  createdAt: string;
}

export async function saveConversation(conv: Omit<ConversationRecord, "id" | "createdAt">): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const record: ConversationRecord = { ...conv, id, createdAt: new Date().toISOString() };
  // Flatten nested objects for hset
  const flat: Record<string, string> = {
    id: record.id,
    createdAt: record.createdAt,
    messageCount: String(record.messageCount ?? 0),
    pageContext: record.pageContext ?? "",
    outcome: record.outcome ?? "",
    qualificationScore: String(record.qualificationScore ?? 0),
  };
  if (record.visitorFacts) flat.visitorFacts = JSON.stringify(record.visitorFacts);
  if (record.keyTopics) flat.keyTopics = JSON.stringify(record.keyTopics);
  await redis.hset(`conv:${id}`, flat);
  await redis.lpush("convs:list", id);
  await redis.ltrim("convs:list", 0, 999);
  return id;
}

export async function getConversations(limit = 30): Promise<ConversationRecord[]> {
  const redis = getRedis();
  if (!redis) return [];
  const ids = await redis.lrange("convs:list", 0, limit - 1) as string[];
  if (!ids.length) return [];
  const records = await Promise.all(
    ids.map(async (id) => {
      const raw = await redis.hgetall(`conv:${id}`) as Record<string, string> | null;
      if (!raw) return null;
      return {
        ...raw,
        messageCount: Number(raw.messageCount ?? 0),
        qualificationScore: Number(raw.qualificationScore ?? 0),
        visitorFacts: raw.visitorFacts ? JSON.parse(raw.visitorFacts) : undefined,
        keyTopics: raw.keyTopics ? JSON.parse(raw.keyTopics) : undefined,
      } as ConversationRecord;
    })
  );
  return records.filter((r): r is ConversationRecord => r !== null);
}

export async function getGrowthStats(): Promise<{
  totalLeads: number; booked: number; captured: number; qualified: number; totalConvs: number;
}> {
  const redis = getRedis();
  if (!redis) return { totalLeads: 0, booked: 0, captured: 0, qualified: 0, totalConvs: 0 };
  const [totalLeads, totalConvs] = await Promise.all([
    redis.llen("leads:list"),
    redis.llen("convs:list"),
  ]);
  const leads = await getLeads(200);
  return {
    totalLeads,
    booked: leads.filter((l) => l.outcome === "booked").length,
    captured: leads.filter((l) => l.outcome === "lead_captured").length,
    qualified: leads.filter((l) => (l.qualification_score ?? 0) >= 2).length,
    totalConvs,
  };
}
