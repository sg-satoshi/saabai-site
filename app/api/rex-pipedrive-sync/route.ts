import { createHash } from "crypto";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

const EMAIL_HASH_KEY = "rex:set:email_hashes";
const NAME_KEY       = "rex:set:lead_names";

function hashEmail(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

function normName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

// Fetch all deals from the Rex pipeline and extract person emails embedded in the deal response.
// Pipedrive's /deals endpoint includes person_id.email[] — no extra person API calls needed.
async function fetchRexPersonEmails(
  token: string,
  pipelineId: string
): Promise<{ email: string; name: string }[]> {
  const seen = new Set<string>();
  const results: { email: string; name: string }[] = [];

  let start = 0;
  const limit = 500;

  while (true) {
    const url = `https://api.pipedrive.com/v1/deals?pipeline_id=${encodeURIComponent(pipelineId)}&limit=${limit}&start=${start}&status=all_not_deleted&api_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json() as any;
    const items: any[] = data?.data ?? [];

    for (const deal of items) {
      // person_id contains embedded person data including email array
      const personData = deal.person_id;
      if (!personData) continue;

      const name: string = personData.name ?? "";
      const emails: any[] = Array.isArray(personData.email) ? personData.email : [];
      const email: string =
        emails.find((e: any) => e.primary)?.value ?? emails[0]?.value ?? "";

      if (!email || seen.has(email.toLowerCase())) continue;
      seen.add(email.toLowerCase());
      results.push({ email, name });
    }

    if (!data?.additional_data?.pagination?.more_items_in_collection) break;
    start += limit;
  }

  return results;
}

export async function GET(req: Request): Promise<Response> {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pipedriveToken = process.env.PIPEDRIVE_API_TOKEN;
  if (!pipedriveToken) return Response.json({ error: "PIPEDRIVE_API_TOKEN not set" }, { status: 500 });

  const pipelineId = process.env.PIPEDRIVE_PIPELINE_ID;
  if (!pipelineId) return Response.json({ error: "PIPEDRIVE_PIPELINE_ID not set — cannot scope sync to Rex deals" }, { status: 500 });

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return Response.json({ error: "Redis not configured" }, { status: 500 });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const persons = await fetchRexPersonEmails(pipedriveToken, pipelineId);

  const hashes = persons.map(p => hashEmail(p.email));
  const names  = persons.map(p => p.name).filter(n => normName(n).includes(" ")).map(normName);

  // Rebuild the sets from scratch (del + sadd is atomic enough for a one-time sync)
  await redis.del(EMAIL_HASH_KEY);
  await redis.del(NAME_KEY);

  if (hashes.length > 0) await redis.sadd(EMAIL_HASH_KEY, hashes[0], ...hashes.slice(1));
  if (names.length  > 0) await redis.sadd(NAME_KEY,       names[0],  ...names.slice(1));

  return Response.json({
    ok: true,
    pipelineId,
    personsFound:  persons.length,
    hashesWritten: hashes.length,
    namesWritten:  names.length,
    sample: persons.slice(0, 3).map(p => ({ name: p.name, emailDomain: p.email.split("@")[1] ?? "?" })),
  });
}
