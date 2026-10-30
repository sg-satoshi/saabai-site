/**
 * Billing clients: one record per paying client, synced to a Stripe Customer.
 * Stored in Redis. Phase A stores the GST flag only; no GST is charged from it yet.
 * lexFirmId / siteId are optional links so per-firm Lex pricing (Phase D) can hang off this record.
 */
import type Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { getRedis } from "../redis";
import { stableJson } from "./idempotency";
import { createHash } from "node:crypto";

export const BILLING_CLIENT_PREFIX = "saabai:billing:client:";
export const BILLING_CLIENT_INDEX = "saabai:billing:clients";

export type GstSetting = "not_registered" | "registered";

export interface BillingAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface BillingClient {
  id: string;
  name: string;
  firm?: string;
  email: string;
  phone?: string;
  address?: BillingAddress;
  abn?: string;
  /** Stored only in Phase A. Charging logic arrives in Phase B. Default "not_registered". */
  gst: GstSetting;
  notes?: string;
  stripeCustomerId?: string;
  lexFirmId?: string;
  siteId?: string;
  createdAt: string;
  updatedAt: string;
}

export type BillingClientInput = Omit<BillingClient, "id" | "createdAt" | "updatedAt" | "stripeCustomerId">;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const opt = (v: unknown, max = 200) => str(v, max) || undefined;

/** Validate + normalise admin input. Returns an error string for bad input. */
export function validateClientInput(body: unknown): { input?: BillingClientInput; error?: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const name = str(b.name);
  const email = str(b.email).toLowerCase();
  if (!name) return { error: "Name is required" };
  if (!EMAIL_RE.test(email)) return { error: "A valid email is required" };
  const abnRaw = str(b.abn, 20).replace(/\s+/g, "");
  if (abnRaw && !/^\d{11}$/.test(abnRaw)) return { error: "ABN must be 11 digits" };
  const a = (b.address && typeof b.address === "object" ? b.address : {}) as Record<string, unknown>;
  const address: BillingAddress = {
    line1: opt(a.line1), line2: opt(a.line2), city: opt(a.city, 100), state: opt(a.state, 50),
    postcode: opt(a.postcode, 12), country: opt(a.country, 2)?.toUpperCase() || undefined,
  };
  const hasAddr = Object.values(address).some(Boolean);
  if (hasAddr && !address.country) address.country = "AU";
  return {
    input: {
      name, email,
      firm: opt(b.firm), phone: opt(b.phone, 40),
      address: hasAddr ? address : undefined,
      abn: abnRaw || undefined,
      gst: b.gst === "registered" ? "registered" : "not_registered",
      notes: opt(b.notes, 2000),
      lexFirmId: opt(b.lexFirmId, 100), siteId: opt(b.siteId, 100),
    },
  };
}

/** Customer params pushed to Stripe for a client (create and update). */
export function toStripeCustomerParams(c: BillingClient): Stripe.CustomerCreateParams {
  const addr = c.address;
  return {
    name: c.firm ? `${c.firm}` : c.name,
    email: c.email,
    phone: c.phone || undefined,
    address: addr ? {
      line1: addr.line1 || "", line2: addr.line2 || "", city: addr.city || "", state: addr.state || "",
      postal_code: addr.postcode || "", country: addr.country || "AU",
    } : undefined,
    description: c.firm ? `Contact: ${c.name}` : undefined,
    metadata: {
      source: "saabai-admin-billing-client",
      saabai_client_id: c.id,
      contact_name: c.name,
      abn: c.abn || "",
      gst: c.gst,
      lex_firm_id: c.lexFirmId || "",
      site_id: c.siteId || "",
    },
  };
}

type CustomerLite = Pick<Stripe.Customer, "id" | "email" | "metadata"> & { deleted?: boolean };

/**
 * Pick an existing Stripe customer for an email (fallback path only, when no stored id).
 * Prefers one already tagged with this client id, then the oldest live match. Never picks a deleted one.
 */
export function pickExistingCustomer(clientId: string, list: CustomerLite[]): string | null {
  const live = list.filter((c) => !c.deleted);
  const tagged = live.find((c) => c.metadata?.saabai_client_id === clientId);
  if (tagged) return tagged.id;
  const untagged = live.filter((c) => !c.metadata?.saabai_client_id);
  return untagged.length ? untagged[untagged.length - 1].id : null; // list is newest first
}

/**
 * Create or update the Stripe Customer for a client. Order: stored id, then email match, then create.
 * Returns the customer id and how it was resolved.
 */
export async function syncStripeCustomer(
  stripe: Stripe,
  c: BillingClient,
): Promise<{ customerId: string; via: "stored" | "email" | "created" }> {
  const params = toStripeCustomerParams(c);
  if (c.stripeCustomerId) {
    const got = await stripe.customers.retrieve(c.stripeCustomerId).catch(() => null);
    if (got && !(got as { deleted?: boolean }).deleted) {
      await stripe.customers.update(c.stripeCustomerId, params as Stripe.CustomerUpdateParams);
      return { customerId: c.stripeCustomerId, via: "stored" };
    }
  }
  const found = await stripe.customers.list({ email: c.email, limit: 20 });
  const pick = pickExistingCustomer(c.id, found.data as CustomerLite[]);
  if (pick) {
    await stripe.customers.update(pick, params as Stripe.CustomerUpdateParams);
    return { customerId: pick, via: "email" };
  }
  const hash = createHash("sha256").update(stableJson(params)).digest("hex").slice(0, 16);
  const created = await stripe.customers.create(params, { idempotencyKey: `saabai:client-customer:${c.id}:${hash}` });
  return { customerId: created.id, via: "created" };
}

export function newClient(input: BillingClientInput, now = new Date().toISOString()): BillingClient {
  return { ...input, id: `bc_${randomUUID().replace(/-/g, "").slice(0, 16)}`, createdAt: now, updatedAt: now };
}

export async function getBillingClient(id: string): Promise<BillingClient | null> {
  if (!/^bc_[a-z0-9]{8,32}$/.test(id)) return null;
  const r = getRedis();
  if (!r) return null;
  const raw = await r.get<BillingClient | string>(BILLING_CLIENT_PREFIX + id);
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

export async function saveBillingClient(c: BillingClient): Promise<BillingClient> {
  const r = getRedis();
  if (!r) throw new Error("Data store unavailable");
  const next = { ...c, updatedAt: new Date().toISOString() };
  await r.set(BILLING_CLIENT_PREFIX + c.id, JSON.stringify(next));
  await r.sadd(BILLING_CLIENT_INDEX, c.id);
  return next;
}

export async function listBillingClients(): Promise<BillingClient[]> {
  const r = getRedis();
  if (!r) return [];
  const ids = (await r.smembers(BILLING_CLIENT_INDEX)) as string[];
  const all = await Promise.all(ids.map((id) => getBillingClient(id)));
  return all.filter((x): x is BillingClient => !!x).sort((a, b) => a.name.localeCompare(b.name));
}

export function searchClients(list: BillingClient[], q: string): BillingClient[] {
  const s = q.trim().toLowerCase();
  if (!s) return list;
  return list.filter((c) => [c.name, c.firm, c.email, c.phone, c.abn, c.stripeCustomerId, c.lexFirmId].some((v) => v?.toLowerCase().includes(s)));
}

/** Label for the GST setting. Phase A never charges GST. */
export function gstLabel(c: Pick<BillingClient, "gst">): string {
  return c.gst === "registered" ? "GST flag on (charging not enabled yet)" : "GST not applicable";
}
