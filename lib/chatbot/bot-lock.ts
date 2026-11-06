/**
 * Whole-bot lock. One flag for the bot, set by a full admin.
 * Legacy per-field lock lists are ignored and dropped on save.
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

/**
 * Whole-bot lock is full-admin only. Restricted staff stay blocked even when they can write other chatbot settings.
 * A body that carries botLock is treated as a lock change, same as set_lock.
 */
export function botLockDenied(fullAdmin: boolean, action: string, bodyHasBotLock = false): { status: 403; error: string } | null {
  if (fullAdmin) return null;
  if (action === "set_lock" || bodyHasBotLock) {
    return { status: 403, error: "Only an admin can lock or unlock a chatbot." };
  }
  return null;
}

export function portalWriteGuard(lock: BotLock | undefined | null): { ok: true } | { ok: false; status: 403; error: string } {
  if (clientWriteBlocked(lock)) {
    return { ok: false, status: 403, error: "This chatbot is managed by Saabai. Contact us to make changes." };
  }
  return { ok: true };
}
