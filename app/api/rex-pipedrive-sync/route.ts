import { createHash } from "crypto";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

// Populates rex:hash:lead_email_ts and rex:hash:lead_name_ts from all "Rex: ..." deals
// in the configured Pipedrive pipeline. Each entry maps emailHash/name → conversation timestamp.
// Safe to re-run — uses HSET so it only adds/updates, never deletes existing entries.

function hashEmail(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

function normName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function pipedriveTimeToISO(addTime: string): string {
  // Pipedrive returns "2024-03-15 09:23:45" — treat as UTC
  return new Date(addTime.replace(" ", "T") + "Z").toISOString();
}

async function fetchRexDealTimestamps(
  token: string,
  pipelineId: string
): Promise<{ emailHash: string; name: string; timestamp: string }[]> {
  const results: { emailHash: string; name: string; timestamp: string }[] = [];
  let start = 0;
  const limit = 500;

  while (true) {
    const url = `https://api.pipedrive.com/v1/deals?pipeline_id=${encodeURIComponent(pipelineId)}&limit=${limit}&start=${start}&status=all_not_deleted&api_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json() as any;
    const items: any[] = data?.data ?? [];

    for (const deal of items) {
      const title: string = deal.title ?? "";
      // Only Rex-originated deals (created by createRexDeal in pipedrive-client.ts)
      if (!title.startsWith("Rex:") && !title.startsWith("Rex ")) continue;

      const addTime: string = deal.add_time ?? "";
      if (!addTime) continue;
      const timestamp = pipedriveTimeToISO(addTime);

      // person_id embeds name + email array directly in the deal response
      const person = deal.person_id;
      if (!person) continue;

      const name: string = person.name ?? "";
      const emails: any[] = Array.isArray(person.email) ? person.email : [];
      const email: string = emails.find((e: any) => e.primary)?.value ?? emails[0]?.value ?? "";

      if (email) results.push({ emailHash: hashEmail(email), name, timestamp });
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
  if (!pipelineId) return Response.json({ error: "PIPEDRIVE_PIPELINE_ID not set" }, { status: 500 });

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return Response.json({ error: "Redis not configured" }, { status: 500 });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const leads = await fetchRexDealTimestamps(pipedriveToken, pipelineId);
  if (!leads.length) {
    return Response.json({ ok: true, message: "No Rex deals found in pipeline", leads: 0 });
  }

  // Build the two maps: emailHash → timestamp, normalizedName → timestamp
  const emailMap: Record<string, string> = {};
  const nameMap:  Record<string, string> = {};
  for (const { emailHash, name, timestamp } of leads) {
    emailMap[emailHash] = timestamp;
    const n = normName(name);
    if (n.includes(" ")) nameMap[n] = timestamp;
  }

  // HSET is additive — safe to re-run without losing data
  await Promise.all([
    redis.hset("rex:hash:lead_email_ts", emailMap),
    Object.keys(nameMap).length > 0 ? redis.hset("rex:hash:lead_name_ts", nameMap) : Promise.resolve(),
  ]);

  const earliest = leads.map(l => l.timestamp).reduce((a, b) => a < b ? a : b);
  const latest   = leads.map(l => l.timestamp).reduce((a, b) => a > b ? a : b);

  return Response.json({
    ok: true,
    rexDealsFound:   leads.length,
    emailsIndexed:   Object.keys(emailMap).length,
    namesIndexed:    Object.keys(nameMap).length,
    earliestLead:    earliest,
    latestLead:      latest,
  });
}
