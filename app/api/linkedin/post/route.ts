export const runtime = "edge";

export async function POST(req: Request) {
  const webhookUrl = process.env.MAKE_LINKEDIN_WEBHOOK_URL;
  if (!webhookUrl) {
    return Response.json({ error: "MAKE_LINKEDIN_WEBHOOK_URL not configured" }, { status: 500 });
  }

  let body: { content?: string; scheduledFor?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return Response.json({ error: "content is required" }, { status: 400 });
  }

  // Simple auth — same pattern as other internal routes
  const authHeader = req.headers.get("authorization");
  const adminSecret = process.env.SAABAI_ADMIN_SECRET ?? process.env.CRON_SECRET;
  if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const makeRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        scheduledFor: body.scheduledFor ?? null,
        source: "saabai-admin",
        postedAt: new Date().toISOString(),
      }),
    });

    if (!makeRes.ok) {
      const text = await makeRes.text();
      return Response.json({ error: `Make webhook failed: ${text}` }, { status: 502 });
    }

    return Response.json({ ok: true, message: "Post sent to LinkedIn via Make" });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
