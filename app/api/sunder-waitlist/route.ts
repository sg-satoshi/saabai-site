import { NextRequest } from "next/server";
import { ipHash } from "../../../lib/chatbot/ratelimit";
import { signup, supabaseStore, validateSignup } from "../../../lib/sunder-waitlist";
import { requestEvidence } from "../../../lib/consent-evidence";

// SUNDER waitlist signup. Public (proxy.ts) and rate limited per IP (lib/form-guard.ts).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  if (Number(req.headers.get("content-length") ?? 0) > 4096) return Response.json({ error: "Too large" }, { status: 413, headers: NO_STORE });
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400, headers: NO_STORE }); }
  const v = validateSignup(body);
  if (!v.ok) {
    // Honeypot: look like success, store nothing.
    if (v.bot) return Response.json({ ok: true, ref: null, token: null }, { headers: NO_STORE });
    return Response.json({ error: v.error }, { status: 400, headers: NO_STORE });
  }
  try {
    const r = await signup(await supabaseStore(), v.input, { ipHash: ipHash(req), userAgent: req.headers.get("user-agent"), evidence: requestEvidence(req), referer: req.headers.get("referer") });
    // Double opt-in for marketing. A failure here must not fail the waitlist signup.
    try {
      const { afterSunderSignup } = await import("../../../lib/email/ops");
      await afterSunderSignup({ email: v.input.email, firstName: v.input.firstName, created: r.token !== null });
    } catch (confirmError) {
      console.error("sunder confirmation queue failed:", confirmError instanceof Error ? confirmError.message : "error");
    }
    return Response.json({ ok: true, ref: r.ref, token: r.token }, { headers: NO_STORE });
  } catch (e) {
    console.error("sunder waitlist signup failed:", e instanceof Error ? e.message : "error");
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500, headers: NO_STORE });
  }
}
