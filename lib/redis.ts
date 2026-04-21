import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

// =========================
// TYPES
// =========================

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export interface ConversationRecord {
  id: string;
  threadId?: string;
  projectId?: string;
  visitorFacts?: Record<string, unknown>;
  qualificationScore?: number;
  outcome?: string;
  messageCount?: number;
  pageContext?: string;
  keyTopics?: string[];
  messages?: ChatMessage[];
  createdAt: string;
}

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
  outcome?: string;
  page?: string;
  messages?: number;
  createdAt: string;
}

export interface GrowthStats {
  conversations: number;
  leads: number;
  qualifiedLeads: number;
}

export interface EdgeProfile {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface EdgeSession {
  id: string;
  profileId?: string;
  summary?: string;
  mood?: number;
  newCommitments?: string;
  blockers?: string;
  wins?: string;
  topics?: string[];
  insights?: string[];
  messageCount?: number;
  createdAt: string;
}

export interface InstagramPostRecord {
  id: string;
  status: "pending" | "sent";
  payload: Record<string, unknown>;
  createdAt: string;
  sentAt?: string;
  scheduledFor?: string;
}

export interface LinkedInPostRecord {
  id: string;
  status: "pending" | "sent";
  payload: Record<string, unknown>;
  createdAt: string;
  sentAt?: string;
  scheduledFor?: string;
}

export interface NurtureRecord {
  id: string;
  status: "pending" | "sent";
  payload: Record<string, unknown>;
  createdAt: string;
  capturedAt: string;
  sentAt?: string;
  email: string;
  name: string;
  business: string;
  company: string;
  industry: string;
  source: string;
  page: string;
  threadId: string;
  day2Sent: boolean;
  day5Sent: boolean;
  day10Sent: boolean;
}

// =========================
// HELPERS
// =========================

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function encode(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function decodeJson<T>(value: string | undefined): T | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function toNumber(value: string | undefined): number | undefined {
  if (!value || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toBoolean(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function extractScheduledFor(payload: Record<string, unknown>): string | undefined {
  const value = payload.scheduledFor;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function extractCapturedAt(payload: Record<string, unknown>): string | undefined {
  const direct = payload.capturedAt;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const created = payload.createdAt;
  if (typeof created === "string" && created.trim()) return created.trim();

  const timestamp = payload.timestamp;
  if (typeof timestamp === "string" && timestamp.trim()) return timestamp.trim();

  return undefined;
}

// =========================
// CONVERSATIONS
// =========================

export async function saveConversation(
  conv: Omit<ConversationRecord, "id" | "createdAt">
): Promise<string | null> {
  const client = getRedis();
  if (!client) return null;

  const id = makeId("conv");

  const flat: Record<string, string> = {
    id,
    createdAt: new Date().toISOString(),
    threadId: conv.threadId ?? "",
    projectId: conv.projectId ?? "",
    qualificationScore: String(conv.qualificationScore ?? ""),
    outcome: conv.outcome ?? "",
    messageCount: String(conv.messageCount ?? ""),
    pageContext: conv.pageContext ?? "",
    visitorFacts: encode(conv.visitorFacts),
    keyTopics: encode(conv.keyTopics),
    messages: encode(conv.messages),
  };

  await client.hset(`conv:${id}`, flat);
  await client.lpush("convs:list", id);
  await client.ltrim("convs:list", 0, 999);

  return id;
}

export async function getConversations(limit = 50): Promise<ConversationRecord[]> {
  const client = getRedis();
  if (!client) return [];

  const ids = await client.lrange("convs:list", 0, limit - 1);
  const results: ConversationRecord[] = [];

  for (const id of ids) {
    const raw = await client.hgetall<Record<string, string>>(`conv:${id}`);
    if (!raw || !raw.id) continue;

    results.push({
      id: raw.id,
      createdAt: raw.createdAt,
      threadId: raw.threadId || undefined,
      projectId: raw.projectId || undefined,
      visitorFacts: decodeJson<Record<string, unknown>>(raw.visitorFacts),
      qualificationScore: toNumber(raw.qualificationScore),
      outcome: raw.outcome || undefined,
      messageCount: toNumber(raw.messageCount),
      pageContext: raw.pageContext || undefined,
      keyTopics: decodeJson<string[]>(raw.keyTopics),
      messages: decodeJson<ChatMessage[]>(raw.messages),
    });
  }

  return results;
}

export async function getTranscriptByThreadId(
  threadId?: string
): Promise<ChatMessage[]> {
  if (!threadId) return [];

  const conversations = await getConversations(200);

  return conversations
    .filter((c) => c.threadId === threadId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    .flatMap((c) => c.messages ?? []);
}

// =========================
// LEADS / GROWTH
// =========================

export async function saveLead(
  lead: Omit<LeadRecord, "id" | "createdAt">
): Promise<string | null> {
  const client = getRedis();
  if (!client) return null;

  const id = makeId("lead");

  const flat: Record<string, string> = {
    id,
    createdAt: new Date().toISOString(),
    name: lead.name ?? "",
    business: lead.business ?? "",
    industry: lead.industry ?? "",
    team_size: lead.team_size ?? "",
    pain_points: encode(lead.pain_points),
    qualification_score: String(lead.qualification_score ?? ""),
    business_fit: String(lead.business_fit ?? ""),
    pain_point_named: String(lead.pain_point_named ?? ""),
    automation_potential: String(lead.automation_potential ?? ""),
    outcome: lead.outcome ?? "",
    page: lead.page ?? "",
    messages: String(lead.messages ?? ""),
  };

  await client.hset(`lead:${id}`, flat);
  await client.lpush("leads:list", id);
  await client.ltrim("leads:list", 0, 999);

  return id;
}

export async function getLeads(limit = 50): Promise<LeadRecord[]> {
  const client = getRedis();
  if (!client) return [];

  const ids = await client.lrange("leads:list", 0, limit - 1);
  const results: LeadRecord[] = [];

  for (const id of ids) {
    const raw = await client.hgetall<Record<string, string>>(`lead:${id}`);
    if (!raw || !raw.id) continue;

    results.push({
      id: raw.id,
      createdAt: raw.createdAt,
      name: raw.name || undefined,
      business: raw.business || undefined,
      industry: raw.industry || undefined,
      team_size: raw.team_size || undefined,
      pain_points: decodeJson<string[]>(raw.pain_points),
      qualification_score: toNumber(raw.qualification_score),
      business_fit: toBoolean(raw.business_fit),
      pain_point_named: toBoolean(raw.pain_point_named),
      automation_potential: toBoolean(raw.automation_potential),
      outcome: raw.outcome || undefined,
      page: raw.page || undefined,
      messages: toNumber(raw.messages),
    });
  }

  return results;
}

export async function getGrowthStats(): Promise<GrowthStats> {
  const [conversations, leads] = await Promise.all([
    getConversations(500),
    getLeads(500),
  ]);

  const qualifiedLeads = leads.filter(
    (l) => (l.qualification_score ?? 0) >= 2
  ).length;

  return {
    conversations: conversations.length,
    leads: leads.length,
    qualifiedLeads,
  };
}

// =========================
// EDGE MEMORY
// =========================

const EDGE_PROFILE_ID = "shane";

export async function saveEdgeProfile(
  profile: Omit<EdgeProfile, "id" | "createdAt"> & { id?: string }
): Promise<string | null> {
  const client = getRedis();
  if (!client) return null;

  const id = profile.id ?? EDGE_PROFILE_ID;

  await client.hset(`edge:profile:${id}`, {
    id,
    createdAt: new Date().toISOString(),
    data: encode(profile.data ?? {}),
  });

  return id;
}

export async function getEdgeProfile(id?: string): Promise<EdgeProfile | null> {
  const client = getRedis();
  if (!client) return null;

  const resolvedId = id ?? EDGE_PROFILE_ID;

  const raw = await client.hgetall<Record<string, string>>(`edge:profile:${resolvedId}`);
  if (!raw || !raw.id) return null;

  return {
    id: raw.id,
    createdAt: raw.createdAt,
    data: decodeJson<Record<string, unknown>>(raw.data) ?? {},
  };
}

export async function saveEdgeSession(
  session: Omit<EdgeSession, "id" | "createdAt"> & { id?: string }
): Promise<string | null> {
  const client = getRedis();
  if (!client) return null;

  const id = session.id ?? makeId("edge_session");

  await client.hset(`edge:session:${id}`, {
    id,
    createdAt: new Date().toISOString(),
    profileId: session.profileId ?? "",
    summary: session.summary ?? "",
    mood: String(session.mood ?? ""),
    newCommitments: session.newCommitments ?? "",
    blockers: session.blockers ?? "",
    wins: session.wins ?? "",
    topics: encode(session.topics),
    insights: encode(session.insights),
    messageCount: String(session.messageCount ?? ""),
  });

  await client.lpush("edge:sessions:list", id);
  await client.ltrim("edge:sessions:list", 0, 999);

  return id;
}

export async function getEdgeSessions(limit = 50): Promise<EdgeSession[]> {
  const client = getRedis();
  if (!client) return [];

  const ids = await client.lrange("edge:sessions:list", 0, limit - 1);
  const results: EdgeSession[] = [];

  for (const id of ids) {
    const raw = await client.hgetall<Record<string, string>>(`edge:session:${id}`);
    if (!raw || !raw.id) continue;

    results.push({
      id: raw.id,
      profileId: raw.profileId || undefined,
      summary: raw.summary || undefined,
      mood: toNumber(raw.mood),
      newCommitments: raw.newCommitments || undefined,
      blockers: raw.blockers || undefined,
      wins: raw.wins || undefined,
      topics: decodeJson<string[]>(raw.topics),
      insights: decodeJson<string[]>(raw.insights),
      messageCount: toNumber(raw.messageCount),
      createdAt: raw.createdAt,
    });
  }

  return results;
}

export async function saveEdgeTranscript(
  sessionId: string,
  messages: ChatMessage[]
): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  await client.set(`edge:transcript:${sessionId}`, JSON.stringify(messages));
  return true;
}

export async function getEdgeTranscript(
  sessionId?: string
): Promise<ChatMessage[]> {
  const client = getRedis();
  if (!client || !sessionId) return [];

  const raw = await client.get<string>(`edge:transcript:${sessionId}`);
  return raw ? decodeJson<ChatMessage[]>(raw) ?? [] : [];
}

// =========================
// INSTAGRAM QUEUE
// =========================

export async function queueInstagramPost(
  payload: Record<string, unknown>
): Promise<string | null> {
  const client = getRedis();
  if (!client) return null;

  const id = makeId("ig");
  const scheduledFor = extractScheduledFor(payload);

  await client.hset(`instagram:${id}`, {
    id,
    status: "pending",
    payload: encode(payload),
    createdAt: new Date().toISOString(),
    sentAt: "",
    scheduledFor: scheduledFor ?? "",
  });

  await client.lpush("instagram:pending", id);
  return id;
}

export async function getPendingInstagramPosts(
  limit = 50
): Promise<InstagramPostRecord[]> {
  const client = getRedis();
  if (!client) return [];

  const ids = await client.lrange("instagram:pending", 0, limit - 1);
  return loadInstagramPosts(ids);
}

export async function getSentInstagramPosts(
  limit = 50
): Promise<InstagramPostRecord[]> {
  const client = getRedis();
  if (!client) return [];

  const ids = await client.lrange("instagram:sent", 0, limit - 1);
  return loadInstagramPosts(ids);
}

export async function markInstagramPostSent(id: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  await client.hset(`instagram:${id}`, {
    status: "sent",
    sentAt: new Date().toISOString(),
  });

  await client.lrem("instagram:pending", 0, id);
  await client.lpush("instagram:sent", id);
  return true;
}

async function loadInstagramPosts(ids: string[]): Promise<InstagramPostRecord[]> {
  const client = getRedis();
  if (!client) return [];

  const results: InstagramPostRecord[] = [];

  for (const id of ids) {
    const raw = await client.hgetall<Record<string, string>>(`instagram:${id}`);
    if (!raw || !raw.id) continue;

    results.push({
      id: raw.id,
      status: (raw.status as "pending" | "sent") ?? "pending",
      payload: decodeJson<Record<string, unknown>>(raw.payload) ?? {},
      createdAt: raw.createdAt,
      sentAt: raw.sentAt || undefined,
      scheduledFor: raw.scheduledFor || undefined,
    });
  }

  return results;
}

// =========================
// LINKEDIN QUEUE
// =========================

export async function queueLinkedInPost(
  payload: Record<string, unknown>
): Promise<string | null> {
  const client = getRedis();
  if (!client) return null;

  const id = makeId("li");
  const scheduledFor = extractScheduledFor(payload);

  await client.hset(`linkedin:${id}`, {
    id,
    status: "pending",
    payload: encode(payload),
    createdAt: new Date().toISOString(),
    sentAt: "",
    scheduledFor: scheduledFor ?? "",
  });

  await client.lpush("linkedin:pending", id);
  return id;
}

export async function getPendingLinkedInPosts(
  limit = 50
): Promise<LinkedInPostRecord[]> {
  const client = getRedis();
  if (!client) return [];

  const ids = await client.lrange("linkedin:pending", 0, limit - 1);
  return loadLinkedInPosts(ids);
}

export async function getSentLinkedInPosts(
  limit = 50
): Promise<LinkedInPostRecord[]> {
  const client = getRedis();
  if (!client) return [];

  const ids = await client.lrange("linkedin:sent", 0, limit - 1);
  return loadLinkedInPosts(ids);
}

export async function markLinkedInPostSent(id: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  await client.hset(`linkedin:${id}`, {
    status: "sent",
    sentAt: new Date().toISOString(),
  });

  await client.lrem("linkedin:pending", 0, id);
  await client.lpush("linkedin:sent", id);
  return true;
}

async function loadLinkedInPosts(ids: string[]): Promise<LinkedInPostRecord[]> {
  const client = getRedis();
  if (!client) return [];

  const results: LinkedInPostRecord[] = [];

  for (const id of ids) {
    const raw = await client.hgetall<Record<string, string>>(`linkedin:${id}`);
    if (!raw || !raw.id) continue;

    results.push({
      id: raw.id,
      status: (raw.status as "pending" | "sent") ?? "pending",
      payload: decodeJson<Record<string, unknown>>(raw.payload) ?? {},
      createdAt: raw.createdAt,
      sentAt: raw.sentAt || undefined,
      scheduledFor: raw.scheduledFor || undefined,
    });
  }

  return results;
}

// =========================
// NURTURE
// =========================

export async function saveNurtureRecord(
  payload: Record<string, unknown>
): Promise<string | null> {
  const client = getRedis();
  if (!client) return null;

  const id = makeId("nurture");
  const capturedAt = extractCapturedAt(payload) ?? new Date().toISOString();

  await client.hset(`nurture:${id}`, {
    id,
    status: "pending",
    payload: encode(payload),
    createdAt: new Date().toISOString(),
    capturedAt,
    sentAt: "",
    email: typeof payload.email === "string" ? payload.email : "",
    name: typeof payload.name === "string" ? payload.name : "",
    business: typeof payload.business === "string" ? payload.business : "",
    company: typeof payload.company === "string" ? payload.company : "",
    industry: typeof payload.industry === "string" ? payload.industry : "",
    source: typeof payload.source === "string" ? payload.source : "",
    page: typeof payload.page === "string" ? payload.page : "",
    threadId: typeof payload.threadId === "string" ? payload.threadId : "",
    day2Sent: "false",
    day5Sent: "false",
    day10Sent: "false",
  });

  await client.lpush("nurture:pending", id);
  return id;
}

export async function getPendingNurture(
  limit = 50
): Promise<NurtureRecord[]> {
  const client = getRedis();
  if (!client) return [];

  const ids = await client.lrange("nurture:pending", 0, limit - 1);
  const results: NurtureRecord[] = [];

  for (const id of ids) {
    const raw = await client.hgetall<Record<string, string>>(`nurture:${id}`);
    if (!raw || !raw.id) continue;

    results.push({
      id: raw.id,
      status: (raw.status as "pending" | "sent") ?? "pending",
      payload: decodeJson<Record<string, unknown>>(raw.payload) ?? {},
      createdAt: raw.createdAt,
      capturedAt: raw.capturedAt || raw.createdAt,
      sentAt: raw.sentAt || undefined,
      email: raw.email ?? "",
      name: raw.name ?? "",
      business: raw.business ?? "",
      company: raw.company ?? "",
      industry: raw.industry ?? "",
      source: raw.source ?? "",
      page: raw.page ?? "",
      threadId: raw.threadId ?? "",
      day2Sent: toBoolean(raw.day2Sent) ?? false,
      day5Sent: toBoolean(raw.day5Sent) ?? false,
      day10Sent: toBoolean(raw.day10Sent) ?? false,
    });
  }

  return results;
}

export async function markNurtureSent(
  id: string,
  day?: "day2" | "day5" | "day10"
): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  const update: Record<string, string> = {
    status: "sent",
    sentAt: new Date().toISOString(),
  };

  if (day === "day2") update.day2Sent = "true";
  if (day === "day5") update.day5Sent = "true";
  if (day === "day10") update.day10Sent = "true";

  await client.hset(`nurture:${id}`, update);
  await client.lrem("nurture:pending", 0, id);

  return true;
}