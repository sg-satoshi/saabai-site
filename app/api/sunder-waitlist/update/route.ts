import { NextRequest } from "next/server";
import { hashToken, supabaseStore, updatePatch, validateUpdate } from "../../../../lib/sunder-waitlist";

// Thank-you state: optional mobile + SMS opt-in and the buy-vs-subscribe answer, keyed by the signup token.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  if (Number(req.headers.get("content-length") ?? 0) > 2048) return Response.json({ error: "Too large" }, { status: 413, headers: NO_STORE });
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400, headers: NO_STORE }); }
  const v = validateUpdate(body);
  if (!v.ok) return Response.json({ error: v.error }, { status: 400, headers: NO_STORE });
  try {
    const found = await (await supabaseStore()).update(hashToken(v.input.token), updatePatch(v.input));
    if (!found) return Response.json({ error: "Invalid request" }, { status: 404, headers: NO_STORE });
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch (e) {
    console.error("sunder waitlist update failed:", e instanceof Error ? e.message : "error");
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500, headers: NO_STORE });
  }
}
