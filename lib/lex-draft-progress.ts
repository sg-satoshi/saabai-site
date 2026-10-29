/**
 * Saved Draft Documents progress, so a user can leave and come back.
 *
 * Stored in this browser only (localStorage), keyed by the signed-in Lex user's email, the same place
 * Lex already keeps its quick thread cache. Nothing new is sent to or kept on the server, and the
 * uploaded files themselves are never saved, only the facts the user has reviewed. Entries expire after
 * 30 days and "Start over" clears them.
 */
import type { PrepState } from "./lex-doc-extract";

export type DraftProgress = {
  v: 1;
  savedAt: number;
  typeId: string;
  jurisdiction: string;
  parties: string;
  instructions: string;
  prep: PrepState;
};

export const PROGRESS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function progressKey(email: string | null | undefined): string | null {
  return email ? `lex_draft_progress_${email.toLowerCase()}` : null;
}

export function parseProgress(raw: string | null, now = Date.now()): DraftProgress | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as DraftProgress;
    if (p?.v !== 1 || typeof p.savedAt !== "number" || now - p.savedAt > PROGRESS_TTL_MS) return null;
    if (typeof p.typeId !== "string" || typeof p.parties !== "string") return null;
    return { ...p, prep: { extracted: p.prep?.extracted ?? null, manual: Array.isArray(p.prep?.manual) ? p.prep.manual : [] } };
  } catch {
    return null;
  }
}

/** Worth saving only when something has been entered. */
export function hasProgress(p: Omit<DraftProgress, "v" | "savedAt">): boolean {
  return !!(p.parties.trim() || p.instructions.trim() || p.prep.extracted || p.prep.manual.length);
}
