export const runtime = "edge";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.saabai.ai";

export async function POST(req: Request) {
  const webhookUrl = process.env.MAKE_LINKEDIN_WEBHOOK_URL;
  if (!webhookUrl) {
    return Response.json({ error: "MAKE_LINKEDIN_WEBHOOK_URL not configured" }, { status: 500 });
  }

  let body: {
    content?: string;
    scheduledFor?: string;
    imageType?: "stat" | "insight" | "quote" | "beforeafter" | "none";
    imageParams?: Record<string, string>;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return Response.json({ error: "content is required" }, { status: 400 });
  }

  // Auth
  const authHeader = req.headers.get("authorization");
  const adminSecret = process.env.SAABAI_ADMIN_SECRET ?? process.env.CRON_SECRET;
  if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Build image URL if requested
  let imageUrl: string | null = null;
  if (body.imageType && body.imageType !== "none") {
    const params = new URLSearchParams({ type: body.imageType, ...body.imageParams });
    imageUrl = `${BASE_URL}/api/og/linkedin-card?${params.toString()}`;
  }

  try {
    const makeRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        imageUrl,
        scheduledFor: body.scheduledFor ?? null,
        source: "saabai-admin",
        postedAt: new Date().toISOString(),
      }),
    });

    if (!makeRes.ok) {
      const text = await makeRes.text();
      return Response.json({ error: `Make webhook failed: ${text}` }, { status: 502 });
    }

    return Response.json({ ok: true, message: "Post sent to LinkedIn via Make", imageUrl });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
