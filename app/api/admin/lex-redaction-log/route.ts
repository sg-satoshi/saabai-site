/**
 * Lex redaction log for the admin. Full admins only.
 *   GET                         -> { firms }   firms that have log entries
 *   GET ?firm=tributumlaw.com.au -> { firm, entries }   newest first, types and counts only
 * Entries never hold client details, placeholders or prompt text (lib/lex-privacy/redaction-log).
 */
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../../lib/auth";
import { listRedactionFirms, readRedactionLog, normFirm } from "../../../../lib/lex-privacy/redaction-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const s = token ? await verifySessionToken(token) : null;
  return !!s && (await isAdminSession(s.clientId));
}

export async function GET(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const firmParam = url.searchParams.get("firm");
  if (!firmParam) return Response.json({ firms: await listRedactionFirms() });
  const firm = normFirm(firmParam);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 200) || 200, 1), 2000);
  return Response.json({ firm, entries: await readRedactionLog(firm, limit) });
}
