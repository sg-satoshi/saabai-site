import { getRedis } from "./redis";

// =========================
// TYPES
// =========================

export type LeadStage =
  | "new"
  | "contacted"
  | "discovery"
  | "audit-booked"
  | "audit-done"
  | "proposal-sent"
  | "negotiation"
  | "won"
  | "lost";

export type Interaction = {
  date: string;
  type: string;
  notes: string;
};

export interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  source: string;
  stage: LeadStage;
  notes: string;
  followUpDate?: string;
  createdAt: string;
  lastContactedAt?: string;
  interactions: Interaction[];
  /** Optional website URL (e.g. from the /score quiz). */
  website?: string;
  /** Latest AI Readiness Score (0-100) from /score. */
  score?: number;
  /** Raw /score quiz answers (question id -> option value). */
  scoreAnswers?: Record<string, number>;
  /** Blueprint tier recommended by /score. */
  recommendedTier?: string;
}

export type CreateLeadInput = Omit<Lead, "id" | "createdAt" | "interactions" | "stage" | "notes"> & {
  stage?: LeadStage;
  notes?: string;
};

// =========================
// CONSTANTS
// =========================

const LEADS_HASH_KEY = "saabai:crm:leads";
const LEADS_LIST_KEY = "saabai:crm:leads:list";

const VALID_STAGES: LeadStage[] = [
  "new", "contacted", "discovery", "audit-booked", "audit-done",
  "proposal-sent", "negotiation", "won", "lost",
];

// =========================
// HELPERS
// =========================

function makeId(): string {
  return `crm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function validateStage(stage: string): LeadStage {
  if (VALID_STAGES.includes(stage as LeadStage)) return stage as LeadStage;
  return "new";
}

/** Upstash auto-deserialises JSON, so stored leads may come back as objects or strings. */
function toLead(raw: unknown): Lead | null {
  if (!raw) return null;
  let v: unknown = raw;
  if (typeof raw === "string") {
    try {
      v = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const lead = v as Lead;
  return lead && typeof lead === "object" && lead.id ? lead : null;
}

function nowISO(): string {
  return new Date().toISOString();
}

// =========================
// LEAD CRUD
// =========================

/**
 * Create a new lead record in the Redis hash.
 * Returns the lead id, or null if Redis is unavailable.
 */
export async function createLead(input: CreateLeadInput): Promise<string | null> {
  const client = getRedis();
  if (!client) return null;

  const id = makeId();
  const now = nowISO();

  const lead: Lead = {
    id,
    companyName: input.companyName,
    contactName: input.contactName,
    phone: input.phone,
    email: input.email,
    source: input.source,
    stage: input.stage ? validateStage(input.stage) : "new",
    notes: input.notes ?? "",
    followUpDate: input.followUpDate ?? undefined,
    createdAt: now,
    lastContactedAt: undefined,
    interactions: [],
  };

  await client.hset(LEADS_HASH_KEY, { [id]: JSON.stringify(lead) });
  await client.lpush(LEADS_LIST_KEY, id);
  await client.ltrim(LEADS_LIST_KEY, 0, 999);

  return id;
}

/**
 * Get all leads. Returns an empty array if Redis is unavailable.
 */
export async function getAllLeads(): Promise<Lead[]> {
  const client = getRedis();
  if (!client) return [];

  const ids = await client.lrange(LEADS_LIST_KEY, 0, -1);
  if (ids.length === 0) return [];

  const raw = await client.hmget<Record<string, unknown>>(LEADS_HASH_KEY, ...ids);
  if (!raw) return [];

  const results: Lead[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const lead = toLead(raw[id]); // skips corrupted entries
    if (lead) results.push(lead);
  }

  return results;
}

/**
 * Get a single lead by id. Returns null if not found or Redis unavailable.
 */
export async function getLeadById(id: string): Promise<Lead | null> {
  const client = getRedis();
  if (!client) return null;

  const raw = await client.hget(LEADS_HASH_KEY, id);
  return toLead(raw);
}

/**
 * Update a lead by merging fields. Accepts partial Lead fields.
 * Returns the updated lead, or null if not found / Redis unavailable.
 */
export async function updateLead(
  id: string,
  fields: Partial<Omit<Lead, "id" | "createdAt">>
): Promise<Lead | null> {
  const client = getRedis();
  if (!client) return null;

  const existing = await getLeadById(id);
  if (!existing) return null;

  const updated: Lead = {
    ...existing,
    ...fields,
    id: existing.id, // immutable
    createdAt: existing.createdAt, // immutable
    stage: fields.stage ? validateStage(fields.stage) : existing.stage,
  };

  await client.hset(LEADS_HASH_KEY, { [id]: JSON.stringify(updated) });
  return updated;
}

/**
 * Delete a lead by id. Returns true if deleted, false if not found.
 */
export async function deleteLead(id: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  const existed = await client.hget(LEADS_HASH_KEY, id);
  if (!existed) return false;

  await client.hdel(LEADS_HASH_KEY, id);
  await client.lrem(LEADS_LIST_KEY, 0, id);

  return true;
}

// =========================
// INTERACTIONS
// =========================

/**
 * Add an interaction to a lead's interaction log and update lastContactedAt.
 * Returns the updated lead, or null if lead not found.
 */
export async function addInteraction(
  leadId: string,
  interaction: { type: string; notes: string }
): Promise<Lead | null> {
  const client = getRedis();
  if (!client) return null;

  const lead = await getLeadById(leadId);
  if (!lead) return null;

  const newInteraction: Interaction = {
    date: nowISO(),
    type: interaction.type,
    notes: interaction.notes,
  };

  const updated: Lead = {
    ...lead,
    lastContactedAt: nowISO(),
    interactions: [...(lead.interactions ?? []), newInteraction],
  };

  await client.hset(LEADS_HASH_KEY, { [leadId]: JSON.stringify(updated) });
  return updated;
}

// =========================
// /score LEADS
// =========================

export interface ScoreLeadInput {
  email: string;
  name?: string;
  website?: string;
  score: number;
  answers: Record<string, number>;
  recommendedTier: string;
}

/**
 * Save an AI Readiness Score (/score) lead, deduped by email (case-insensitive).
 * Existing lead: refresh score/answers/website and log an interaction (stage untouched).
 * New lead: created with source "score", stage "new".
 * Returns the lead id, or null if Redis is unavailable.
 */
export async function upsertScoreLead(input: ScoreLeadInput): Promise<string | null> {
  const client = getRedis();
  if (!client) return null;
  const email = input.email.trim().toLowerCase();
  const note = `AI Readiness Score ${input.score}/100, recommended ${input.recommendedTier} Blueprint${input.website ? `, site ${input.website}` : ""}`;

  const existing = (await getAllLeads()).find((l) => (l.email ?? "").trim().toLowerCase() === email);
  if (existing) {
    await updateLead(existing.id, {
      score: input.score,
      scoreAnswers: input.answers,
      recommendedTier: input.recommendedTier,
      ...(input.website ? { website: input.website } : {}),
      ...(!existing.contactName && input.name ? { contactName: input.name } : {}),
    });
    await addInteraction(existing.id, { type: "score", notes: `Retook /score: ${note}` });
    return existing.id;
  }

  const id = await createLead({
    companyName: "",
    contactName: input.name ?? "",
    phone: "",
    email,
    source: "score",
    notes: note,
  });
  if (!id) return null;
  await updateLead(id, {
    score: input.score,
    scoreAnswers: input.answers,
    recommendedTier: input.recommendedTier,
    ...(input.website ? { website: input.website } : {}),
  });
  return id;
}
