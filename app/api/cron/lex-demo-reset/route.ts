import { resetLexDemo } from "../../../../lib/lex-demo";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Nightly (16:00 UTC = 2 AM Brisbane): wipe and reseed the fictional Lex demo firm. Touches demo keys only. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json({ ok: true, ...(await resetLexDemo()) }); }
  catch (err) { console.error("[lex demo reset]", err instanceof Error ? err.name : err); return Response.json({ error: "Reset failed" }, { status: 500 }); }
}
