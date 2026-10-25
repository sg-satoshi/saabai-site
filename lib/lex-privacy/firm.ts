/**
 * Which firm a Lex request belongs to, for the per-firm redaction log.
 * A signed-in firm user is keyed by email domain (free-mail addresses by full email, as Doc review caps do).
 * Otherwise the Lex config id (e.g. "lex-internal") or "unknown".
 */
import { verifySession } from "../portal-session";
import { firmKeyForEmail } from "../lex-review-access";

export function lexFirmFromRequest(req: Request, fallback?: string): string {
  try {
    const token = (req.headers.get("cookie") ?? "")
      .split(";")
      .map((p) => p.trim())
      .find((p) => p.startsWith("portal_session="))
      ?.slice("portal_session=".length);
    const session = token ? verifySession(token) : null;
    if (session?.email) return firmKeyForEmail(session.email);
  } catch {
    // fall through
  }
  return (typeof fallback === "string" && fallback.trim()) || "unknown";
}

export function lexFirmFromActor(actor: { kind: "admin"; id: string } | { kind: "firm"; firm: string }): string {
  return actor.kind === "firm" ? actor.firm : "saabai-admin";
}
