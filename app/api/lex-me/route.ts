/**
 * GET /api/lex-me
 * Tells the Lex page whether the caller is a full Saabai admin, so admin-only
 * links (AI model settings) are hidden from firm users. Read-only; the admin
 * pages enforce access themselves.
 */
import { resolveReviewActor } from "../../../lib/lex-review-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const actor = await resolveReviewActor(req);
    if (!actor) return Response.json({ admin: false, signedIn: false }, { status: 401 });
    return Response.json({ admin: actor.kind === "admin", signedIn: true, email: actor.kind === "firm" ? actor.email : null });
  } catch (err) {
    console.error("[lex-me]", err instanceof Error ? err.name : err);
    return Response.json({ admin: false }, { status: 500 });
  }
}
