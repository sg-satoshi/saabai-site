/**
 * Onboarding state lives on the client record, one copy per email.
 *
 * Writable client accounts are the Redis directory (`saabai:users` via
 * lib/user-directory.ts). That is the record request-access checks first,
 * and the record an admin approval writes. `portal:users` is the legacy row
 * request-access still writes for an auto-approved order, until password
 * login moves it into the directory.
 *
 * Storage (field-level, no read-modify-write of the account):
 * Every onboarding save is ONE `HSET portal:onboarding <email> <json>`. The
 * account rows (`saabai:users`, `portal:users`) are never rewritten by an
 * onboarding save, so a concurrent password reset, login stamp or admin edit
 * on the same email can no longer be reverted by an onboarding click, and
 * those writers can no longer drop onboarding progress either.
 *
 * Reads take `portal:onboarding` first. Older rows that still carry an
 * embedded `onboarding` copy on the account (written before this change) are
 * read as a fallback only, and are superseded by the first new save.
 * Saves for one email from the client are sequential (draft then goto), so
 * the onboarding document itself is last-write-wins per email.
 */
import { getRedis } from "./redis";
import { getDirectoryUser, listDirectoryUsers } from "./user-directory";
import { getPortalUser, listPortalUsers } from "./portal-users";
import {
  type OnboardingAction,
  type OnboardingState,
  type OnboardingStatus,
  type PortalTier,
  type StepId,
  applyOnboardingAction,
  clampStep,
  freshOnboarding,
  normaliseStored,
  statusLabel,
  stepLabel,
} from "./portal-onboarding";
import { clientIsLex } from "./portal-onboarding-lex";
import { notifyOnboardingComplete } from "./portal-onboarding-notify";

const ONBOARDING_KEY = "portal:onboarding";

function parse(raw: unknown): unknown {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  return raw;
}

export async function readStoredOnboarding(email: string): Promise<OnboardingState | null> {
  const norm = email.trim().toLowerCase();
  const redis = getRedis();
  if (redis) {
    const own = normaliseStored(parse(await redis.hget(ONBOARDING_KEY, norm)), norm);
    if (own) return own;
  }
  // Legacy fallback: copies embedded on the account before field-level saves.
  const dir = await getDirectoryUser(norm);
  if (dir?.onboarding) {
    const parsed = normaliseStored(dir.onboarding, norm);
    if (parsed) return parsed;
  }
  const portal = await getPortalUser(norm);
  if (portal?.onboarding) {
    const parsed = normaliseStored(portal.onboarding, norm);
    if (parsed) return parsed;
  }
  return null;
}

/**
 * One field-level HSET. Never reads or rewrites the account row. The return
 * value says which account the email belongs to (read-only lookups).
 */
export async function writeStoredOnboarding(email: string, state: OnboardingState): Promise<"directory" | "portal" | "overflow"> {
  const norm = email.trim().toLowerCase();
  const stored: OnboardingState = { ...state, email: norm };
  const redis = getRedis();
  if (!redis) throw new Error("Redis unavailable");
  await redis.hset(ONBOARDING_KEY, { [norm]: JSON.stringify(stored) });
  if (await getDirectoryUser(norm)) return "directory";
  if (await getPortalUser(norm)) return "portal";
  return "overflow";
}

export interface OnboardingProgress {
  clientId: string;
  name: string;
  email: string;
  step: StepId | null;
  stepLabel: string;
  status: OnboardingStatus;
  statusLabel: string;
  tier: PortalTier | null;
  isLex: boolean;
  updatedAt: string | null;
}

function progressFrom(
  clientId: string,
  name: string,
  email: string,
  state: OnboardingState | null,
  isLex: boolean,
): OnboardingProgress {
  const step = state ? clampStep(state.step, isLex) : null;
  const status: OnboardingStatus = state?.status ?? "not_started";
  return {
    clientId: state?.clientId || clientId,
    name: name || email,
    email,
    step,
    stepLabel: stepLabel(step),
    status,
    statusLabel: statusLabel(status),
    tier: state?.tier ?? null,
    isLex,
    updatedAt: state?.updatedAt ?? null,
  };
}

export async function listOnboardingProgress(): Promise<OnboardingProgress[]> {
  const [directory, portalUsers] = await Promise.all([listDirectoryUsers(), listPortalUsers()]);
  const rows = new Map<string, OnboardingProgress>();
  const redis = getRedis();
  const own = new Map<string, OnboardingState>();
  if (redis) {
    const raw = await redis.hgetall<Record<string, string>>(ONBOARDING_KEY);
    for (const [email, value] of Object.entries(raw ?? {})) {
      const norm = email.trim().toLowerCase();
      const state = normaliseStored(parse(value), norm);
      if (state) own.set(norm, state);
    }
  }

  for (const user of directory) {
    const email = user.email.trim().toLowerCase();
    if ((user.role === "admin" || user.role === "staff") && !user.onboarding && !own.has(email)) continue;
    if (!email.includes("@")) continue;
    const state = own.get(email) ?? (user.onboarding ? normaliseStored(user.onboarding, email) : null);
    rows.set(email, progressFrom(user.id, user.name, email, state, clientIsLex(email, user.products)));
  }

  for (const user of portalUsers) {
    const email = user.email.trim().toLowerCase();
    if (rows.has(email)) continue;
    const state = own.get(email) ?? (user.onboarding ? normaliseStored(user.onboarding, email) : null);
    rows.set(email, progressFrom(user.id, user.name, email, state, clientIsLex(email, null)));
  }

  for (const [norm, state] of own) {
    if (rows.has(norm)) continue;
    rows.set(
      norm,
      progressFrom(state.clientId, state.payload.businessName || norm, norm, state, clientIsLex(norm, null)),
    );
  }

  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadOrFresh(email: string, clientId: string, tier: PortalTier): Promise<OnboardingState> {
  const existing = await readStoredOnboarding(email);
  if (existing) return { ...existing, tier: existing.tier || tier, clientId: existing.clientId || clientId };
  return { ...freshOnboarding(clientId, email), tier };
}

export async function saveOnboardingProgress(input: {
  email: string;
  clientId: string;
  name: string;
  tier: PortalTier;
  isLex: boolean;
  action: OnboardingAction;
  step: StepId;
  fields?: unknown;
  now?: string;
  notify?: typeof notifyOnboardingComplete;
}): Promise<{ state: OnboardingState; where: "directory" | "portal" | "overflow"; notified: boolean }> {
  const norm = input.email.trim().toLowerCase();
  const current = await loadOrFresh(norm, input.clientId, input.tier);
  const applied = applyOnboardingAction({
    state: { ...current, email: norm, clientId: current.clientId || input.clientId, tier: input.tier },
    isLex: input.isLex,
    action: input.action,
    step: input.step,
    fields: input.fields,
    now: input.now,
  });
  let state = applied.state;
  let notified = false;
  if (state.status === "complete" && !state.notifiedAt) {
    const send = input.notify ?? notifyOnboardingComplete;
    const result = await send({
      clientEmail: norm,
      clientName: input.name,
      businessName: state.payload.businessName || "",
      clientId: state.clientId,
      tier: state.tier,
    });
    if (result.sent) {
      state = { ...state, notifiedAt: input.now ?? new Date().toISOString() };
      notified = true;
    }
  }
  const where = await writeStoredOnboarding(norm, state);
  return { state, where, notified };
}
