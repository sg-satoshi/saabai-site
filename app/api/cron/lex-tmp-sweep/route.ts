import { sweepLexTmp } from "../../../../lib/lex-upload";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Hourly: deletes large Lex uploads (lex-tmp/) older than an hour, in case a tab was closed or a
 * read timed out before the reading route deleted them. Vercel sends Authorization: Bearer CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  // An unset secret must not match the header "Bearer undefined".
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Runs whenever a Blob store is connected, even with the flag off, so turning the flag off never strands files.
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ ok: true, skipped: "no blob store" });
  try {
    return Response.json({ ok: true, ...(await sweepLexTmp()) });
  } catch (err) {
    console.error("[lex-tmp-sweep]", err instanceof Error ? err.name : "error");
    return Response.json({ error: "Sweep failed" }, { status: 500 });
  }
}
