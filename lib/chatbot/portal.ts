/**
 * Client portal chatbot settings. The bot is always the one linked to the signed-in client's
 * site. A slug in the request is never trusted: if one is sent and it is not theirs, refuse.
 */
import { BESPOKE_SLUGS, effectiveGoal } from "./core";
import { ENGAGE_FIELD_KEYS, effectiveEngage, mergeClientEngage, validateEngage, type EngageConfig } from "./engage";
import { GOAL_FIELDS, GOAL_LABEL, GOAL_LIMITS, GOAL_TYPES, mergeClientGoal, validateGoal, type GoalConfig } from "./goal";

export type PortalBotDecision =
  | { ok: true; slug: string; siteName: string }
  | { ok: false; status: number; error: string };

export function decidePortalBot(opts: { site: { slug: string; name: string } | null; requestedSlug?: unknown }): PortalBotDecision {
  if (!opts.site) return { ok: false, status: 404, error: "No website with a chatbot is linked to your account yet." };
  if (opts.requestedSlug !== undefined && opts.requestedSlug !== opts.site.slug) return { ok: false, status: 403, error: "You can only change your own chatbot." };
  if (BESPOKE_SLUGS.includes(opts.site.slug)) return { ok: false, status: 409, error: "Your chatbot is set up by Saabai. Send us a request to change it." };
  return { ok: true, slug: opts.site.slug, siteName: opts.site.name };
}

export function portalView(slug: string, stored: GoalConfig | undefined, engage?: Partial<EngageConfig>) {
  const goal = effectiveGoal(slug, stored) ?? null;
  return {
    goal,
    engage: effectiveEngage(engage),
    locked: goal?.locked ?? [],
    engageLocked: effectiveEngage(engage).locked ?? [],
    options: GOAL_TYPES.map((id) => ({ id, label: GOAL_LABEL[id] })),
    fields: GOAL_FIELDS,
    limits: GOAL_LIMITS,
  };
}

/** Validate a client save and keep admin-locked fields. */
export function clientSave(slug: string, stored: GoalConfig | undefined, input: unknown): { ok: true; value: GoalConfig } | { ok: false; errors: Record<string, string> } {
  const raw = input && typeof input === "object" ? { ...(input as Record<string, unknown>) } : {};
  delete raw.locked; // clients never set locks
  const v = validateGoal(raw);
  if (!v.ok) return v;
  return { ok: true, value: mergeClientGoal(effectiveGoal(slug, stored), v.value) };
}

/** Validate a client playbook save. Clients never set locks, and admin-locked settings keep their stored value. */
export function clientSaveEngage(stored: Partial<EngageConfig> | undefined, input: unknown): { ok: true; value: EngageConfig } | { ok: false; errors: Record<string, string> } {
  const raw = input && typeof input === "object" ? { ...(input as Record<string, unknown>) } : {};
  delete raw.locked;
  // Locked settings are replaced with the stored value before validating, so a locked field can never fail or change a save.
  const cur = effectiveEngage(stored) as unknown as Record<string, unknown>;
  for (const f of effectiveEngage(stored).locked ?? []) for (const k of ENGAGE_FIELD_KEYS[f]) raw[k] = cur[k];
  const v = validateEngage(raw);
  if (!v.ok) return v;
  return { ok: true, value: mergeClientEngage(stored, v.value) };
}
