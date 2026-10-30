import { resetLexDemo } from "../../../../lib/lex-demo";
import { resolveReviewActor } from "../../../../lib/lex-review-access";

export const runtime = "nodejs";

/** On demand: POST resets the fictional Lex demo firm. Admin only (proxy gates /api/admin; checked again here). */
export async function POST(req: Request) {
  const actor = await resolveReviewActor(req).catch(() => null);
  if (actor?.kind !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
  try { return Response.json({ ok: true, ...(await resetLexDemo()) }); }
  catch (err) { console.error("[lex demo reset]", err instanceof Error ? err.name : err); return Response.json({ error: "Reset failed" }, { status: 500 }); }
}
