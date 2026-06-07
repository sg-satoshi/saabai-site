/**
 * LeadGen Service — Client configuration & Redis operations
 *
 * Each "leadgen client" = one business that embeds the widget.
 */

import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = Redis.fromEnv();
  }
  return redis;
}

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

  // ── Bot Identity ─────────────────────────────────────────
  /** The bot's name (default: "Jack") */
  botName: string;
  /** Bot personality / tone */
  personality: "professional" | "friendly" | "aussie-tradie" | "custom";
  /** Custom personality description (used when personality="custom") */
  personalityDescription?: string;
  /** Avatar preset key */
  avatarPreset?: "plumber" | "sparky" | "logo" | "custom";

  // ── Services Menu ────────────────────────────────────────
  /** List of services the business offers, shown to the bot */
  services: Array<{
    name: string;
    type: "standard" | "emergency" | "quote-only";
    description?: string;
  }>;

  // ── Lead Capture Configuration ────────────────────────────
  leadCaptureFields: {
    name: "required" | "optional" | "hidden";
    phone: "required" | "optional" | "hidden";
    email: "required" | "optional" | "hidden";
    address: "required" | "optional" | "hidden";
    service: "required" | "optional" | "hidden";
    urgency: "required" | "optional" | "hidden";
    message: "required" | "optional" | "hidden";
  };

  // ── Availability ──────────────────────────────────────────
  /** Message shown after hours */
  afterHoursMessage: string;
  /** Whether they offer same-day service */
  sameDayService: boolean;
  /** Expected response time displayed to visitors */
  expectedResponseTime: string;

  // ── Advanced Widget Settings ──────────────────────────────
  widgetPosition: "bottom-right" | "bottom-left";
  widgetSize: "compact" | "standard" | "large";
  /** Auto-popup delay in seconds. 0 = never auto-popup */
  autoPopupDelay: number;
  /** Hide the widget on mobile devices */
  hideOnMobile: boolean;
  /** Custom CSS injected into widget iframe */
  customCss?: string;

  /** Widget branding */
  branding: {
    primaryColor: string;
    accentColor: string;
    widgetTitle: string;
    greeting: string;
    /** Optional custom avatar URL. Defaults to Jack the plumber */
    avatarUrl?: string;
  };
  /** Active or paused */
  status: "active" | "paused";
  /** Stripe subscription info */
  subscription?: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    tier: "starter" | "pro" | "enterprise";
    status: "active" | "past_due" | "canceled";
    currentPeriodEnd?: number;
  };
  /** Notification channel preferences (all on by default) */
  notifications?: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    /** Phone number for SMS/WhatsApp. Falls back to .phone if not set. */
    notificationPhone?: string;
  };
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
  await getRedis().hset(CLIENTS_KEY, { [id]: JSON.stringify(client) });
  return client;
}

export async function getClient(id: string): Promise<LeadGenClient | null> {
  const raw = await getRedis().hget<LeadGenClient | string>(CLIENTS_KEY, id);
  if (!raw) return null;
  if (typeof raw === 'string') return JSON.parse(raw);
  return raw;
}

export async function getClientBySlug(slug: string): Promise<LeadGenClient | null> {
  const all = await listClients();
  return all.find((c) => c.slug === slug) ?? null;
}

export async function listClients(): Promise<LeadGenClient[]> {
  const raw = await getRedis().hgetall<Record<string, string>>(CLIENTS_KEY);
  if (!raw) return [];
  return Object.values(raw).map((s) => {
    if (typeof s === 'string') return JSON.parse(s);
    return s as LeadGenClient;
  });
}

export async function updateClient(
  id: string,
  patch: Partial<LeadGenClient>
): Promise<void> {
  const client = await getClient(id);
  if (!client) throw new Error(`Client ${id} not found`);
  const updated: LeadGenClient = { ...client, ...patch, updatedAt: Date.now() };
  await getRedis().hset(CLIENTS_KEY, { [id]: JSON.stringify(updated) });
}

export async function deleteClient(id: string): Promise<void> {
  await getRedis().hdel(CLIENTS_KEY, id);
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
  await getRedis().lpush(LEADS_KEY(clientSlug), JSON.stringify(full));
  return full;
}

export async function getLeads(
  clientSlug: string,
  limit = 50
): Promise<LeadCapture[]> {
  const raw = await getRedis().lrange(LEADS_KEY(clientSlug), 0, limit - 1);
  return raw.map((s: string | LeadCapture) => {
    if (typeof s === 'string') return JSON.parse(s);
    return s as LeadCapture;
  });
}

export async function markNotified(leadId: string, clientSlug: string): Promise<void> {
  const leads = await getLeads(clientSlug, 100);
  const idx = leads.findIndex((l) => l.id === leadId);
  if (idx === -1) return;
  leads[idx].notified = true;
  // Rewrite the list — lset is atomic
  await getRedis().lset(LEADS_KEY(clientSlug), idx, JSON.stringify(leads[idx]));
}

// ── Default System Prompt Builder ─────────────────────────

const PERSONALITY_MAP: Record<string, string> = {
  professional: "Professional, courteous, and efficient. Clear and direct communication. Maintain a helpful but business-appropriate tone at all times.",
  friendly: "Friendly, warm, and approachable. Use casual but polite language. Make the visitor feel comfortable and welcome. Show genuine interest in helping.",
  "aussie-tradie": "Friendly, calm, and reassuring — especially when people are stressed. A little bit of Aussie humour (light, never sarcastic or inappropriate). Speak like a real tradie: warm, direct, and practical. Use light Australian slang naturally (mate, legend, no worries, bloody oath, etc.) when it fits. Never be overly corporate or robotic.",
};

export function buildSystemPrompt(client: LeadGenClient): string {
  const botName = client.botName || "Jack";
  const personalityText = client.personality === "custom"
    ? (client.personalityDescription || PERSONALITY_MAP["aussie-tradie"])
    : PERSONALITY_MAP[client.personality] || PERSONALITY_MAP["aussie-tradie"];

  const servicesList = client.services?.length
    ? client.services.map(s => `  - ${s.name}${s.description ? ` — ${s.description}` : ""} (${s.type})`).join("\n")
    : client.description;

  const fieldsToCollect = Object.entries(client.leadCaptureFields || {})
    .filter(([_, v]) => v !== "hidden")
    .map(([k, v]) => `    ${k}: ${v === "required" ? "REQUIRED" : "optional (ask but don't insist)"}`)
    .join("\n");

  return [
    `You are ${botName}, a friendly and down-to-earth Australian plumber working for ${client.businessName}.`,
    `Industry: ${client.niche}`,
    `Service area: ${client.serviceArea}`,
    `Business hours: ${client.businessHours}`,
    ``,
    `PERSONALITY:`,
    `- ${personalityText}`,
    ``,
    `SERVICES:`,
    typeof servicesList === "string"
      ? servicesList
      : `- ${client.description}`,
    ``,
    `KNOWLEDGE:`,
    `- You have strong knowledge of Australian plumbing standards (AS/NZS 3500).`,
    `- You understand common issues in Australian homes (old galvanised pipes, blocked drains from tree roots, hot water systems, gas fitting, burst pipes, etc.).`,
    `- You know the difference between emergency callouts vs routine jobs.`,
    `- You understand local conditions and building practices.`,
    ``,
    `CRITICAL FORMATTING RULES (NON-NEGOTIABLE):`,
    `1. NEVER use double asterisks (**).`,
    `2. NEVER use em dashes (—).`,
    `3. Keep responses short and tight.`,
    `4. After 1-2 sentences, start a new paragraph.`,
    `5. Never write big blocks of text.`,
    ``,
    `YOUR JOB:`,
    `1. Greet the visitor warmly and ask how you can help.`,
    `2. Collect their details based on these requirements:`,
    fieldsToCollect,
    `3. If they want a quote, get their address.`,
    `4. Keep responses under 100 words. Be warm and efficient.`,
    `5. Do NOT make up pricing or availability.`,
    `6. At the end, confirm the details you've collected.`,
    ``,
    client.afterHoursMessage
      ? `AFTER HOURS — when outside business hours:\n${client.afterHoursMessage}`
      : "",
    client.sameDayService
      ? `\nSAME-DAY SERVICE: You offer same-day service. Let them know when it fits naturally.`
      : "",
    client.expectedResponseTime
      ? `\nEXPECTED RESPONSE TIME: ${client.expectedResponseTime}`
      : "",
    ``,
    `FORMAT FOR LEAD CAPTURE — when you have all required fields, output:`,
    `[LEAD_CAPTURED]`,
    `Name: {name}`,
    `Phone: {phone}`,
    `Email: {email if collected}`,
    `Service: {service}`,
    `Address: {address if collected}`,
    `Urgency: emergency|soon|quote`,
    `Message: {any additional context}`,
    `[/LEAD_CAPTURED]`,
    ``,
    `Then tell them someone will call them back shortly.`,
  ].filter(Boolean).join("\n");
}
