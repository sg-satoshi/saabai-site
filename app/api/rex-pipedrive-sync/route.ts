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

async function fetchAllPersons(token: string): Promise<{ email: string; name: string }[]> {
  const results: { email: string; name: string }[] = [];
  let start = 0;
  const limit = 500;

  while (true) {
    const res = await fetch(
      `https://api.pipedrive.com/v1/persons?limit=${limit}&start=${start}&api_token=${token}`
    );
    if (!res.ok) break;
    const data = await res.json() as any;
    const items: any[] = data?.data ?? [];

    for (const person of items) {
      const name: string = person.name ?? "";
      const emails: any[] = Array.isArray(person.email) ? person.email : [];
      const primaryEmail: string =
        emails.find((e: any) => e.primary)?.value ?? emails[0]?.value ?? "";
      if (primaryEmail) results.push({ email: primaryEmail, name });
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

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return Response.json({ error: "Redis not configured" }, { status: 500 });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const persons = await fetchAllPersons(pipedriveToken);

  const hashes = persons.map(p => hashEmail(p.email));
  const names  = persons.map(p => p.name).filter(n => normName(n).includes(" ")).map(normName);

  if (hashes.length > 0) await redis.sadd(EMAIL_HASH_KEY, hashes[0], ...hashes.slice(1));
  if (names.length  > 0) await redis.sadd(NAME_KEY,       names[0],  ...names.slice(1));

  return Response.json({
    ok: true,
    personsFound:  persons.length,
    hashesWritten: hashes.length,
    namesWritten:  names.length,
  });
}
