import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

// Resets the attribution Redis sets back to only verified Rex conversation hashes.
// The sets were polluted by a Pipedrive all-persons sync — this clears them so
// they rebuild cleanly from trackLead() writes and the recentLeads backfill.
export async function GET(req: Request): Promise<Response> {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return Response.json({ error: "Redis not configured" }, { status: 500 });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  await Promise.all([
    redis.del("rex:set:email_hashes"),
    redis.del("rex:set:lead_names"),
  ]);

  return Response.json({ ok: true, message: "Attribution sets cleared — will rebuild from verified Rex conversations on next dashboard load" });
}
