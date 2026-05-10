import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { name, email, phone, message, siteSlug } = await req.json();

    if (!siteSlug) {
      return Response.json({ error: "siteSlug is required" }, { status: 400 });
    }

    const lead = {
      name: name || "",
      email: email || "",
      phone: phone || "",
      message: message || "",
      siteSlug,
      createdAt: Date.now(),
    };

    await redis.lpush(`saabai:leads:${siteSlug}`, JSON.stringify(lead));

    return Response.json({ success: true, message: "Lead captured" });
  } catch (error) {
    console.error("Lead capture error:", error);
    return Response.json(
      { error: "Failed to capture lead" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const siteSlug = url.searchParams.get("siteSlug");

    if (!siteSlug) {
      return Response.json({ error: "siteSlug is required" }, { status: 400 });
    }

    const leadsRaw = await redis.lrange(`saabai:leads:${siteSlug}`, 0, 99);
    const leads = leadsRaw.map((l: string) => JSON.parse(l));

    return Response.json({ success: true, leads });
  } catch (error) {
    console.error("Lead fetch error:", error);
    return Response.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}
