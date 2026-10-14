export const PULSE_SECTIONS = ["Headlines", "Primary Text", "Call to Action", "Creative Concepts", "Audience & Targeting", "Competitor Positioning"] as const;
export type PulseSection = (typeof PULSE_SECTIONS)[number];

export const PLATFORMS = ["Meta", "Instagram", "Google", "LinkedIn", "TikTok"] as const;

/** Character limits per item type and platform (shown as counts in the UI). */
export const LIMITS: Record<string, Record<string, number>> = {
  headline: { Google: 30, Meta: 40, Instagram: 40, LinkedIn: 70, TikTok: 100 },
  primary: { Meta: 125, Instagram: 125, Google: 90, LinkedIn: 150, TikTok: 100 },
  cta: { Meta: 20, Instagram: 20, Google: 20, LinkedIn: 20, TikTok: 20 },
};

export function limitFor(kind: "headline" | "primary" | "cta", platforms: string[]): number | null {
  if (kind === "primary" && platforms.some((p) => p === "Meta" || p === "Instagram")) return 125;
  const vals = platforms.map((p) => LIMITS[kind][p]).filter((n): n is number => typeof n === "number");
  return vals.length ? Math.min(...vals) : null;
}

export type PulseBrief = {
  preset: string; // "saabai" | "custom" | client id
  product: string;
  audience: string;
  goal: string;
  message: string;
  tone: string;
  platforms: string[];
  budget: string;
  competitor: string;
};

export type PulseCampaign = {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  brief: PulseBrief;
  sections: Partial<Record<PulseSection, string>>;
  status: "draft" | "generating" | "ready" | "error";
  costCents?: number;
};

export const SAABAI_PRESET: Omit<PulseBrief, "goal" | "tone" | "platforms" | "budget" | "competitor" | "preset"> = {
  product: "Saabai Blueprint AI audit (Starter $497, Pro $1,497, Business $3,500) and website care plans (Presence $100, Growth $200, Signature $300 a month)",
  audience: "Australian small and mid-sized business owners who know AI matters but don't know where to start",
  message: "Free AI Readiness Score at saabai.ai/score, then a Blueprint that shows exactly where AI saves you time, with the fee credited if you build with us",
};

const MAX = 600;
export function cleanBrief(b: unknown): PulseBrief | null {
  if (!b || typeof b !== "object") return null;
  const o = b as Record<string, unknown>;
  const s = (k: string) => (typeof o[k] === "string" ? (o[k] as string).trim().slice(0, MAX) : "");
  const platforms = Array.isArray(o.platforms)
    ? (o.platforms as unknown[]).filter((p): p is string => typeof p === "string" && (PLATFORMS as readonly string[]).includes(p))
    : [];
  const brief: PulseBrief = {
    preset: s("preset") || "custom",
    product: s("product"), audience: s("audience"), goal: s("goal"), message: s("message"),
    tone: s("tone") || "Confident", platforms: platforms.length ? platforms : ["Meta"], budget: s("budget"), competitor: s("competitor"),
  };
  if (!brief.product || !brief.audience || !brief.goal) return null;
  return brief;
}

/** Split model output on "## Section" headings. */
export function splitSections(text: string): Partial<Record<PulseSection, string>> {
  const out: Partial<Record<PulseSection, string>> = {};
  const parts = text.split(/^##\s+/m).slice(1);
  for (const p of parts) {
    const nl = p.indexOf("\n");
    const head = (nl < 0 ? p : p.slice(0, nl)).trim();
    const body = nl < 0 ? "" : p.slice(nl + 1).trim();
    const match = PULSE_SECTIONS.find((s) => head.toLowerCase().startsWith(s.toLowerCase().split(" ")[0]));
    if (match) out[match] = body;
  }
  return out;
}

/** Numbered or bulleted lines in a section, stripped of markers. */
export function sectionItems(body: string): string[] {
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^(\d+[.)]|[-*])\s+/.test(l))
    .map((l) => l.replace(/^(\d+[.)]|[-*])\s+/, "").replace(/\*\*/g, "").trim())
    .filter(Boolean);
}
