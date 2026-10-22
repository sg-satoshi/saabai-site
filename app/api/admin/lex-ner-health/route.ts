/**
 * Name model health check: loads the open-source NER model in this function and runs it on a fixed
 * made-up sentence. Returns only status and timings (never real text). Open on preview deployments
 * (behind Vercel login) so QA can measure cold start; admins only in production.
 */
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../../lib/auth";
import { detectNames, nerLoadMs, NER_MODEL } from "../../../../lib/lex-privacy/ner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SAMPLE = "Margaret Okafor met Brendan Walsh from Riverbend Logistics in Toowoomba. The Federal Court of Australia applied Donoghue v Stevenson.";
const bootedAt = Date.now();

async function allowed(): Promise<boolean> {
  if (process.env.VERCEL_ENV !== "production") return true;
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const s = token ? await verifySessionToken(token) : null;
  return !!s && (await isAdminSession(s.clientId));
}

export async function GET() {
  if (!(await allowed())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const warm = nerLoadMs() > 0;
  const first = await detectNames([SAMPLE]);
  const second = await detectNames([SAMPLE.repeat(20)]);
  return Response.json({
    model: NER_MODEL,
    status: first.status,
    warmInstance: warm,
    instanceAgeMs: Date.now() - bootedAt,
    loadMs: nerLoadMs(),
    firstRunMs: first.ms,
    run400WordsMs: second.ms,
    namesFound: first.parties.length,
    region: process.env.VERCEL_REGION ?? "unknown",
    memoryMb: Math.round(process.memoryUsage().rss / 1e6),
  });
}
