import type { Experiment, SlotKind, SlotType } from "./core";

/**
 * SLOT REGISTRY. To add a new test slot, add one entry to SLOTS below (id, slot name, page path, kind,
 * control copy, optional starting variants) and drop `<ExpText slot="your.slot.name" ... />` (or call
 * resolveSlot) where the text renders. Everything else (proxy assignment, cookie, tracking, bot and GPC
 * exclusion, dashboard editing, AI suggestions, approvals, Supabase registration) is generic.
 * The control is the live copy, byte for byte. Variants are plain Saabai voice: no hype, no em dashes.
 */
export type SlotDecl = {
  id: string;
  siteKey: string;
  slot: string;
  kind: SlotKind;
  name: string;
  path: string;
  control: { text: string; emphasis?: string };
  variants?: { text: string; emphasis?: string }[];
};

export const SLOTS: SlotDecl[] = [
  {
    id: "home-hero-headline",
    siteKey: "saabai",
    slot: "home.hero.headline",
    kind: "headline",
    name: "Homepage hero headline",
    path: "/",
    control: { text: "Know exactly where AI will", emphasis: "save your business hours." },
    variants: [
      { text: "Stop guessing where AI fits.", emphasis: "Get a clear plan for your business." },
      { text: "See which jobs AI can take off your plate,", emphasis: "Starter is ready in 48\u00a0hours." },
    ],
  },
  {
    id: "home-hero-cta",
    siteKey: "saabai",
    slot: "home.hero.cta",
    kind: "button",
    name: "Homepage hero button label",
    path: "/",
    control: { text: "Get your free AI score" },
    variants: [
      { text: "Take the free 3 minute AI quiz" },
      { text: "See where AI fits in your business" },
    ],
  },
];

const LETTERS = "abcdefgh";

export function slotToExperiment(d: SlotDecl): Experiment {
  const all = [d.control, ...(d.variants ?? [])];
  return {
    id: d.id,
    siteKey: d.siteKey,
    slot: d.slot,
    slotType: "text" as SlotType,
    kind: d.kind,
    name: d.name,
    path: d.path,
    status: all.length > 1 ? "running" : "draft",
    defaultVariantId: "a",
    variants: all.map((c, i) => ({ id: LETTERS[i], text: c.text, ...(c.emphasis ? { emphasis: c.emphasis } : {}), active: true })),
  };
}

/**
 * Live headline copy. Redis can still hold an older variant. This rewrites a
 * general "in 48 hours" claim so it names the Starter tier, which is the only
 * Blueprint delivered in 48 hours. It does not change weights, status or ids.
 */
export function qualifyHoursClaim(text: string, emphasis?: string): { text: string; emphasis?: string } {
  const fix = (s: string) => {
    if (!/48[\u00a0 ]hours/i.test(s) || /starter/i.test(s)) return s;
    return s.replace(/,?\s*in 48[\u00a0 ]hours\.?/gi, ". Starter is ready in 48 hours.").replace(/\s{2,}/g, " ").trim();
  };
  return { text: fix(text), ...(emphasis !== undefined ? { emphasis: fix(emphasis) } : {}) };
}

/** Built-in config, used when Redis has nothing for a slot (and lazily written to Redis on first render). */
export const SEED_EXPERIMENTS: Experiment[] = SLOTS.map(slotToExperiment);
