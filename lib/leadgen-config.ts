/**
 * LeadGen Service — Client configuration & Redis operations
 *
 * Each "leadgen client" = one business that embeds the widget.
 */

import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export interface LeadGenClient {
  id: string;
  /** Unique slug used in embed URL (e.g. "bne-emergency-plumbing") */
  slug: string;
  /** Business name shown in widget & notifications */
  businessName: string;
  /** Niche / vertical */
  niche: string;
  /** Short description of services */
  description: string;
  /** Contact phone (SMS notifications target — can be email-to-SMS gateway) */
  phone: string;
  /** Email for lead notifications */
  email: string;
  /** Service area description */
  serviceArea: string;
  /** Business hours (used by AI) */
  businessHours: string;
  /** AI system prompt — optional, auto-generated if omitted */
  systemPrompt?: string;
  /** Widget branding */
  branding: {
    primaryColor: string;
    accentColor: string;
    widgetTitle: string;
    greeting: string;
  };
  /** Active or paused */
  status: "active" | "paused";
  createdAt: number;
  updatedAt: number;
}

export interface LeadCapture {
  id: string;
  clientSlug: string;
  name: string;
  phone: string;
  email?: string;
  service: string;
  address?: string;
  urgency: "emergency" | "soon" | "quote";
  message?: string;
  conversation: Array<{ role: "user" | "assistant"; content: string }>;
  notified: boolean;
  createdAt: number;
}

// ── Client CRUD ────────────────────────────────────────────

const CLIENTS_KEY = "leadgen:clients";
const LEADS_KEY = (slug: string) => `leadgen:leads:${slug}`;

export async function createClient(
  config: Omit<LeadGenClient, "id" | "createdAt" | "updatedAt">
): Promise<LeadGenClient> {
  const id = `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const client: LeadGenClient = {
    ...config,
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await redis.hset(CLIENTS_KEY, { [id]: JSON.stringify(client) });
  return client;
}

export async function getClient(id: string): Promise<LeadGenClient | null> {
  const raw = await redis.hget<string>(CLIENTS_KEY, id);
  return raw ? JSON.parse(raw) : null;
}

export async function getClientBySlug(slug: string): Promise<LeadGenClient | null> {
  const all = await listClients();
  return all.find((c) => c.slug === slug) ?? null;
}

export async function listClients(): Promise<LeadGenClient[]> {
  const raw = await redis.hgetall<Record<string, string>>(CLIENTS_KEY);
  if (!raw) return [];
  return Object.values(raw).map((s) => JSON.parse(s));
}

export async function updateClient(
  id: string,
  patch: Partial<LeadGenClient>
): Promise<void> {
  const client = await getClient(id);
  if (!client) throw new Error(`Client ${id} not found`);
  const updated: LeadGenClient = { ...client, ...patch, updatedAt: Date.now() };
  await redis.hset(CLIENTS_KEY, { [id]: JSON.stringify(updated) });
}

export async function deleteClient(id: string): Promise<void> {
  await redis.hdel(CLIENTS_KEY, id);
}

// ── Lead Operations ────────────────────────────────────────

export async function saveLead(
  clientSlug: string,
  lead: Omit<LeadCapture, "id" | "clientSlug" | "createdAt" | "notified">
): Promise<LeadCapture> {
  const full: LeadCapture = {
    ...lead,
    id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    clientSlug,
    notified: false,
    createdAt: Date.now(),
  };
  await redis.lpush(LEADS_KEY(clientSlug), JSON.stringify(full));
  return full;
}

export async function getLeads(
  clientSlug: string,
  limit = 50
): Promise<LeadCapture[]> {
  const raw = await redis.lrange(LEADS_KEY(clientSlug), 0, limit - 1);
  return raw.map((s: string) => JSON.parse(s));
}

export async function markNotified(leadId: string, clientSlug: string): Promise<void> {
  const leads = await getLeads(clientSlug, 100);
  const idx = leads.findIndex((l) => l.id === leadId);
  if (idx === -1) return;
  leads[idx].notified = true;
  // Rewrite the list — lset is atomic
  await redis.lset(LEADS_KEY(clientSlug), idx, JSON.stringify(leads[idx]));
}

// ── Default System Prompt Builder ─────────────────────────

export function buildSystemPrompt(client: LeadGenClient): string {
  return [
    `You are a friendly lead capture assistant for ${client.businessName}.`,
    `Industry: ${client.niche}`,
    `Services: ${client.description}`,
    `Service area: ${client.serviceArea}`,
    `Business hours: ${client.businessHours}`,
    ``,
    `YOUR JOB:`,
    `1. Greet the visitor warmly and ask how you can help.`,
    `2. Collect their NAME and PHONE NUMBER at minimum.`,
    `3. Ask what service they need and if it's an emergency.`,
    `4. If they want a quote, get their address.`,
    `5. Keep responses under 100 words. Be warm and efficient.`,
    `6. Do NOT make up pricing or availability. You're collecting their info so the business can call them back.`,
    `7. At the end, confirm the details you've collected.`,
    ``,
    `FORMAT FOR LEAD CAPTURE — when you have name AND phone, output:`,
    `[LEAD_CAPTURED]`,
    `Name: {name}`,
    `Phone: {phone}`,
    `Service: {service}`,
    `Address: {address if collected}`,
    `Urgency: emergency|soon|quote`,
    `Message: {any additional context}`,
    `[/LEAD_CAPTURED]`,
    ``,
    `Then tell them someone will call them back shortly.`,
  ].join("\n");
}
