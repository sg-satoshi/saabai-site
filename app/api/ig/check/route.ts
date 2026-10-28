import { igCheckLimited, runInstagramSiteCheck } from "@/lib/ig-check";
import { signIgScore } from "@/lib/ig-score-token";
import { clientIp } from "@/lib/leads-guard";
import { ScanUrlError } from "@/lib/site-scan/ssrf";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const UNREAD = {
  read: false,
  score: null,
  fixes: [],
  checked: [],
  pages: 0,
  summary: "We couldn't read your site. Nothing was guessed, and there is no score.",
  foldNote: null,
  token: null,
};

/** POST { url, business? }. Runs the site check. Does not send email or store a lead. */
export async function POST(req: Request) {
  if (await igCheckLimited(clientIp(req))) {
    return Response.json(
      { error: "Too many checks from this connection. Wait a few minutes and try again." },
      { status: 429, headers: { "cache-control": "no-store" } },
    );
  }
  const raw = await req.text();
  if (raw.length > 4_000) {
    return Response.json({ error: "Too large" }, { status: 413, headers: { "cache-control": "no-store" } });
  }
  let body: unknown;
  try { body = JSON.parse(raw); } catch {
    return Response.json({ error: "Invalid request" }, { status: 400, headers: { "cache-control": "no-store" } });
  }
  const rec = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const url = typeof rec.url === "string" ? rec.url : "";
  const business = typeof rec.business === "string" ? rec.business.slice(0, 200) : undefined;
  try {
    const check = await runInstagramSiteCheck({ url, business });
    const token = signIgScore(url, check.score);
    return Response.json({ ...check, token }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    if (e instanceof ScanUrlError) {
      return Response.json({ error: e.message }, { status: 400, headers: { "cache-control": "no-store" } });
    }
    return Response.json(UNREAD, { headers: { "cache-control": "no-store" } });
  }
}
