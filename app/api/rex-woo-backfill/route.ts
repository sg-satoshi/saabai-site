import { Redis } from "@upstash/redis";
import { tagRexLead } from "../../../lib/woo-client";
import { storeWooCustomer } from "../../../lib/rex-stats";

export const runtime = "nodejs";
export const maxDuration = 300; // Vercel max — needed for 500 WooCommerce lookups

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

  // Fetch all stored leads (up to 500)
  const raw = await redis.lrange<string>("rex:list:recent", 0, 499);
  const leads = (raw ?? []).map(r => {
    try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; }
  }).filter(Boolean) as Array<{ email?: string; timestamp: string }>;

  const withEmail = leads.filter(l => l.email);

  let tagged = 0;
  let notFound = 0;
  let alreadyTagged = 0;
  let errors = 0;

  // Process in batches of 5 — avoids hammering WooCommerce
  const BATCH = 5;
  for (let i = 0; i < withEmail.length; i += BATCH) {
    const batch = withEmail.slice(i, i + BATCH);
    await Promise.all(batch.map(async lead => {
      try {
        const customerId = await tagRexLead(lead.email!, lead.timestamp);
        if (customerId === null) {
          notFound++;
        } else {
          await storeWooCustomer(customerId, lead.timestamp);
          tagged++;
        }
      } catch {
        errors++;
      }
    }));
  }

  // alreadyTagged is included in "tagged" (tagRexLead returns the id either way)
  // Approximate: leads that returned an id but weren't updated
  alreadyTagged = tagged; // conservative — some may already have had the tag

  return Response.json({
    ok: true,
    leadsChecked:   withEmail.length,
    wooAccountsFound: tagged,
    noWooAccount:   notFound,
    errors,
    note: "WooCommerce customer accounts found have been tagged with _rex_lead_date and cached in Redis for attribution.",
  });
}
