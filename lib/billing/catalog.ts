/**
 * Plans and add-ons catalogue (editable in /saabai-admin/plans).
 * Stored in Redis as one JSON doc; seeded from saabai.ai/websites on first read.
 * Pure helpers live at the bottom so they run in tests and on the client.
 */
import { getRedis } from "../redis";

export const CATALOG_KEY = "saabai:billing:catalog";

export interface Plan {
  id: string;
  name: string;
  blurb: string;
  /** AUD cents per month (GST exclusive while not registered) */
  priceCents: number;
  features: string[];
  visible: boolean;
  order: number;
  /** Price version, bumped on each price change. Existing subs keep theirs. */
  priceVersion: number;
}

export type AddonBilling = "one_off" | "monthly";
export type AddonCheckout = "stripe" | "quote";

export interface Addon {
  id: string;
  name: string;
  description: string;
  billing: AddonBilling;
  priceCents: number;
  /** Quote items show "From $X" */
  fromPrice?: boolean;
  checkout: AddonCheckout;
  visible: boolean;
  order: number;
  /** Shared module key in lib/addons/registry.ts switched on per site on purchase */
  feature?: string;
  priceVersion: number;
}

export interface Catalog {
  plans: Plan[];
  addons: Addon[];
  gstRegistered: boolean;
  updatedAt: string;
}

/** Seed copied from app/websites/page.tsx (provisional, edit in admin). */
export const SEED_CATALOG: Catalog = {
  gstRegistered: false,
  updatedAt: "2026-10-14T00:00:00.000Z",
  plans: [
    {
      id: "presence", name: "Presence", blurb: "Get online with an AI that answers", priceCents: 10000, visible: true, order: 0, priceVersion: 1,
      features: ["Custom site designed for your firm", "Fast, mobile and search ready", "Trained enquiry chatbot that answers FAQs", "Enquiry alerts coming soon", "Hosting, security and updates included"],
    },
    {
      id: "growth", name: "Growth", blurb: "For firms that want the site to sell", priceCents: 20000, visible: true, order: 1, priceVersion: 1,
      features: ["Everything in Presence", "Larger site, or a full rebuild of your current one", "Lead qualifying chatbot with booking", "Enquiry alerts coming soon", "Light workflow automations"],
    },
    {
      id: "signature", name: "Signature", blurb: "Your brand, with an AI that sounds like you", priceCents: 30000, visible: true, order: 2, priceVersion: 1,
      features: ["Everything in Growth", "Custom avatar trained to your chosen persona", "Looks and sounds like your brand voice", "Workflow automations across your enquiries", "Priority support"],
    },
  ],
  // Placeholder prices, set real ones in the admin manager.
  // The chatbot is included in every website plan. It is not an add-on.
  addons: [
    { id: "extra-page", name: "Extra page", description: "A new page designed to match your site.", billing: "one_off", priceCents: 15000, checkout: "stripe", visible: true, order: 0, priceVersion: 1 },
    { id: "booking", name: "Booking system", description: "Online bookings with reminders, synced to your calendar.", billing: "monthly", priceCents: 4000, checkout: "stripe", visible: true, order: 1, feature: "booking", priceVersion: 1 },
    { id: "seo-pack", name: "SEO pack", description: "Keyword research, on-page fixes and local listings.", billing: "one_off", priceCents: 45000, fromPrice: true, checkout: "quote", visible: true, order: 3, priceVersion: 1 },
    { id: "reviews-carousel", name: "Google reviews carousel", description: "Your best Google reviews, kept fresh automatically.", billing: "monthly", priceCents: 2500, checkout: "stripe", visible: true, order: 4, feature: "reviews", priceVersion: 1 },
    { id: "custom-integration", name: "Custom integration", description: "Connect your site to your CRM, booking or practice software.", billing: "one_off", priceCents: 80000, fromPrice: true, checkout: "quote", visible: true, order: 5, priceVersion: 1 },
  ],
};

/**
 * Portal add-on retired because the chatbot is included in every website plan.
 * A stored catalogue can still contain it. Reads and saves drop it, and checkout rejects it.
 * This does not call Stripe and does not change an existing subscription item.
 */
export const RETIRED_PORTAL_ADDON_IDS = new Set(["ai-chatbot"]);

export function isRetiredPortalAddon(addon: { id?: string; name?: string }): boolean {
  const id = (addon.id || "").trim() || slugId(addon.name || "");
  return RETIRED_PORTAL_ADDON_IDS.has(id) || (addon.name || "").trim().toLowerCase() === "ai chatbot";
}

export function omitRetiredPortalAddons(catalog: Catalog): Catalog {
  const addons = catalog.addons.filter((a) => !isRetiredPortalAddon(a));
  return addons.length === catalog.addons.length ? catalog : { ...catalog, addons };
}

export async function getCatalog(): Promise<Catalog> {
  const r = getRedis();
  if (!r) return structuredClone(SEED_CATALOG);
  const raw = await r.get<Catalog | string>(CATALOG_KEY);
  if (!raw) return structuredClone(SEED_CATALOG);
  const stored = typeof raw === "string" ? (JSON.parse(raw) as Catalog) : raw;
  return omitRetiredPortalAddons(stored);
}

export async function saveCatalog(next: Catalog, prev?: Catalog): Promise<Catalog> {
  const before = prev || (await getCatalog());
  const clean = normaliseCatalog(next, before);
  const r = getRedis();
  if (r) await r.set(CATALOG_KEY, JSON.stringify(clean));
  return clean;
}

// ---------- pure helpers ----------

export const slugId = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "item";

/** Validate, sort by order, re-index, and bump priceVersion when a price changed. */
export function normaliseCatalog(next: Catalog, prev: Catalog): Catalog {
  const prevPlan = new Map(prev.plans.map((p) => [p.id, p]));
  const prevAddon = new Map(prev.addons.map((a) => [a.id, a]));
  const cents = (n: unknown) => Math.max(0, Math.round(Number(n) || 0));
  const plans = [...next.plans]
    .filter((p) => p && String(p.name || "").trim())
    .sort((a, b) => a.order - b.order)
    .map((p, i) => {
      const old = prevPlan.get(p.id);
      const priceCents = cents(p.priceCents);
      return {
        id: p.id || slugId(p.name), name: String(p.name).trim().slice(0, 60), blurb: String(p.blurb || "").slice(0, 120),
        priceCents, features: (p.features || []).map((f) => String(f).trim()).filter(Boolean).slice(0, 12),
        visible: !!p.visible, order: i,
        priceVersion: old ? (old.priceCents !== priceCents ? old.priceVersion + 1 : old.priceVersion) : 1,
      };
    });
  const addons = [...next.addons]
    .filter((a) => a && String(a.name || "").trim() && !isRetiredPortalAddon(a))
    .sort((a, b) => a.order - b.order)
    .map((a, i) => {
      const old = prevAddon.get(a.id);
      const priceCents = cents(a.priceCents);
      return {
        id: a.id || slugId(a.name), name: String(a.name).trim().slice(0, 60), description: String(a.description || "").slice(0, 200),
        billing: (a.billing === "monthly" ? "monthly" : "one_off") as AddonBilling, priceCents, fromPrice: !!a.fromPrice,
        checkout: (a.checkout === "quote" ? "quote" : "stripe") as AddonCheckout, visible: !!a.visible, order: i,
        feature: a.feature ? slugId(a.feature) : undefined,
        priceVersion: old ? (old.priceCents !== priceCents ? old.priceVersion + 1 : old.priceVersion) : 1,
      };
    });
  return { plans, addons, gstRegistered: !!next.gstRegistered, updatedAt: new Date().toISOString() };
}

export const visiblePlans = (c: Catalog) => c.plans.filter((p) => p.visible);
export const visibleAddons = (c: Catalog) => c.addons.filter((a) => a.visible);

export function formatAud(cents: number, opts: { from?: boolean } = {}): string {
  const v = cents / 100;
  const s = v.toLocaleString("en-AU", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return `${opts.from ? "From " : ""}$${s}`;
}
