/**
 * Loads a matter's known parties for a Lex request. Only the signed-in firm's own matter is read
 * (same access as the Matters page). Any problem returns no parties, never an error: the pattern
 * detector still runs, and a request is never blocked because a matter could not be loaded.
 */
import { matterActor } from "../lex-matter-actor";
import { getMatter } from "../lex-matters";
import { parsePartiesText, type MatterParty } from "./parties";

const MATTER_ID_RE = /^[A-Z]{1,4}-\d{4}-\d{4,6}$/;

export function partiesFromMatter(m: { client?: string; parties?: string } | null | undefined): MatterParty[] {
  if (!m) return [];
  return [...parsePartiesText(m.client ?? ""), ...parsePartiesText(m.parties ?? "")];
}

export async function matterPartiesFor(req: Request, matterId: unknown): Promise<MatterParty[]> {
  if (typeof matterId !== "string" || !MATTER_ID_RE.test(matterId)) return [];
  try {
    const who = await matterActor(req);
    if (!who) return [];
    return partiesFromMatter(await getMatter(who.firm, matterId));
  } catch {
    return [];
  }
}
