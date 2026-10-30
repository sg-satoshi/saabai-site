/**
 * Whole-bot lock. One flag for the bot, set by an admin.
 * Per-field lock lists on the goal and playbook stay in the saved data and are not replaced by this.
 * Missing flag means unlocked, so older configs keep working.
 */

export interface BotLock {
  locked: boolean;
  by?: string;
  at?: string;
}

export function readBotLock(value: unknown): BotLock | undefined {
  if (!value || typeof value !== "object") return undefined;
  const r = value as Record<string, unknown>;
  if (typeof r.locked !== "boolean") return undefined;
  const out: BotLock = { locked: r.locked };
  if (typeof r.by === "string" && r.by.trim()) out.by = r.by.trim().slice(0, 120);
  if (typeof r.at === "string" && r.at.trim()) out.at = r.at.trim().slice(0, 40);
  return out;
}

/** True when a client must not change any chatbot setting. Admins are not checked here. */
export function clientWriteBlocked(lock: BotLock | undefined | null): boolean {
  return lock?.locked === true;
}

export function portalWriteGuard(lock: BotLock | undefined | null): { ok: true } | { ok: false; status: 403; error: string } {
  if (clientWriteBlocked(lock)) {
    return { ok: false, status: 403, error: "This chatbot is managed by Saabai. Contact us to make changes." };
  }
  return { ok: true };
}
