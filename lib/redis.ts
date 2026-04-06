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

// ─── Mia Lead Nurture Queue ───────────────────────────────────────────────────

export interface NurtureRecord {
  id: string;
  email: string;
  name?: string;
  business?: string;
  industry?: string;
  capturedAt: string;
  day2Sent: boolean;
  day5Sent: boolean;
}

export async function saveNurtureRecord(lead: Pick<NurtureRecord, "email" | "name" | "business" | "industry">): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const id = `nurture_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const record: NurtureRecord = {
    ...lead,
    id,
    capturedAt: new Date().toISOString(),
    day2Sent: false,
    day5Sent: false,
  };
  await redis.hset(`nurture:${id}`, record as unknown as Record<string, unknown>);
  await redis.lpush("nurture:list", id);
  await redis.ltrim("nurture:list", 0, 999);
}

export async function getPendingNurture(): Promise<NurtureRecord[]> {
  const redis = getRedis();
  if (!redis) return [];
  const ids = await redis.lrange("nurture:list", 0, 499) as string[];
  if (!ids.length) return [];
  const records = await Promise.all(
    ids.map((id) => redis.hgetall(`nurture:${id}`) as Promise<Record<string, unknown> | null>)
  );
  return records
    .filter((r): r is Record<string, unknown> => r !== null && typeof r.email === "string")
    .map((r) => ({
      ...r,
      day2Sent: r.day2Sent === true || r.day2Sent === "true",
      day5Sent: r.day5Sent === true || r.day5Sent === "true",
    })) as NurtureRecord[];
}

export async function markNurtureSent(id: string, day: "day2" | "day5"): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.hset(`nurture:${id}`, { [`${day}Sent`]: true });
}

// ─── LinkedIn Post Queue ──────────────────────────────────────────────────────

export interface LinkedInPost {
  id: string;
  content: string;
  imageUrl?: string;
  scheduledFor: string; // ISO date string — fires on or after this date (AEST 9am)
  sentAt?: string;
  createdAt: string;
}

export async function queueLinkedInPost(post: Pick<LinkedInPost, "content" | "imageUrl" | "scheduledFor">): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  const id = `lipost_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const record: LinkedInPost = { ...post, id, createdAt: new Date().toISOString() };
  const flat: Record<string, string> = {
    id, content: record.content, scheduledFor: record.scheduledFor, createdAt: record.createdAt,
  };
  if (record.imageUrl) flat.imageUrl = record.imageUrl;
  await redis.hset(`lipost:${id}`, flat);
  await redis.lpush("lipost:queue", id);
  return id;
}

export async function getPendingLinkedInPosts(): Promise<LinkedInPost[]> {
  const redis = getRedis();
  if (!redis) return [];
  const ids = await redis.lrange("lipost:queue", 0, 99) as string[];
  if (!ids.length) return [];
  const records = await Promise.all(
    ids.map((id) => redis.hgetall(`lipost:${id}`) as Promise<Record<string, string> | null>)
  );
  return records
    .filter((r): r is Record<string, string> => r !== null && !r.sentAt && !!r.content)
    .map((r) => r as unknown as LinkedInPost);
}

export async function getSentLinkedInPosts(): Promise<LinkedInPost[]> {
  const redis = getRedis();
  if (!redis) return [];
  const ids = await redis.lrange("lipost:queue", 0, 199) as string[];
  if (!ids.length) return [];
  const records = await Promise.all(
    ids.map((id) => redis.hgetall(`lipost:${id}`) as Promise<Record<string, string> | null>)
  );
  return records
    .filter((r): r is Record<string, string> => r !== null && !!r.sentAt && !!r.content)
    .map((r) => r as unknown as LinkedInPost)
    .sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""));
}

export async function markLinkedInPostSent(id: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.hset(`lipost:${id}`, { sentAt: new Date().toISOString() });
}

// ─── Edge Profile (Performance Coach) ────────────────────────────────────────

export interface EdgeProfile {
  updatedAt: string;
  totalSessions: number;
  lastMood?: number;
  lastSessionDate?: string;
  coreGoals?: string;
  currentFocus?: string;
  patterns?: string;
  strengths?: string;
  challenges?: string;
  breakthroughs?: string;
  commitments?: string;
  watchFor?: string;
  worksWith?: string;
  rawNotes?: string;
}

export interface EdgeSession {
  id: string;
  createdAt: string;
  mood?: number;
  summary?: string;
  topics?: string;
  insights?: string;
  newCommitments?: string;
  messageCount?: number;
}

export async function getEdgeProfile(): Promise<EdgeProfile | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.hgetall("edge:profile") as Record<string, string> | null;
  if (!raw || Object.keys(raw).length === 0) return null;
  return {
    ...raw,
    totalSessions: Number(raw.totalSessions ?? 0),
    lastMood: raw.lastMood ? Number(raw.lastMood) : undefined,
  } as unknown as EdgeProfile;
}

export async function saveEdgeProfile(profile: Partial<EdgeProfile>): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const flat: Record<string, string> = { updatedAt: new Date().toISOString() };
  for (const [k, v] of Object.entries(profile)) {
    if (v !== undefined && v !== null) flat[k] = String(v);
  }
  await redis.hset("edge:profile", flat);
}

export async function saveEdgeSession(session: Omit<EdgeSession, "id" | "createdAt">): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  const id = `esess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const record: EdgeSession = { ...session, id, createdAt: new Date().toISOString() };
  const flat: Record<string, string> = {
    id: record.id,
    createdAt: record.createdAt,
    messageCount: String(record.messageCount ?? 0),
  };
  if (record.mood !== undefined) flat.mood = String(record.mood);
  if (record.summary) flat.summary = record.summary;
  if (record.topics) flat.topics = record.topics;
  if (record.insights) flat.insights = record.insights;
  if (record.newCommitments) flat.newCommitments = record.newCommitments;
  await redis.hset(`edge:session:${id}`, flat);
  await redis.lpush("edge:sessions:list", id);
  await redis.ltrim("edge:sessions:list", 0, 99);
  return id;
}

export async function saveEdgeTranscript(sessionId: string, messages: Array<{ role: string; content: string }>): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(`edge:transcript:${sessionId}`, JSON.stringify(messages));
}

export async function getEdgeTranscript(sessionId: string): Promise<Array<{ role: string; content: string }> | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get(`edge:transcript:${sessionId}`) as string | null;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function getEdgeSessions(limit = 20): Promise<EdgeSession[]> {
  const redis = getRedis();
  if (!redis) return [];
  const ids = await redis.lrange("edge:sessions:list", 0, limit - 1) as string[];
  if (!ids.length) return [];
  const records = await Promise.all(
    ids.map(async (id) => {
      const raw = await redis.hgetall(`edge:session:${id}`) as Record<string, string> | null;
      if (!raw) return null;
      return {
        ...raw,
        messageCount: Number(raw.messageCount ?? 0),
        mood: raw.mood ? Number(raw.mood) : undefined,
      } as EdgeSession;
    })
  );
  return records.filter((r): r is EdgeSession => r !== null);
}
