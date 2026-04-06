export const runtime = "nodejs";

const IG_API = "https://graph.facebook.com/v22.0";

export async function POST(req: Request) {
  const igUserId     = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const accessToken  = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!igUserId || !accessToken) {
    return Response.json(
      { error: "INSTAGRAM_BUSINESS_ACCOUNT_ID and INSTAGRAM_ACCESS_TOKEN must be configured in Vercel env vars" },
      { status: 500 }
    );
  }

  let body: { caption?: string; imageUrl?: string };
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { caption, imageUrl } = body;
  if (!caption?.trim()) return Response.json({ error: "caption required" }, { status: 400 });
  if (!imageUrl?.trim()) return Response.json({ error: "imageUrl required — Instagram requires an image for every post" }, { status: 400 });

  try {
    // Step 1: Create media container
    const containerRes = await fetch(`${IG_API}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: caption.trim(),
        access_token: accessToken,
      }),
    });
    const containerData = await containerRes.json();
    if (!containerRes.ok || !containerData.id) {
      console.error("[instagram/post] container failed:", containerData);
      return Response.json(
        { error: containerData.error?.message ?? "Failed to create media container" },
        { status: 502 }
      );
    }

    const creationId = containerData.id;

    // Step 2: Publish media container
    const publishRes = await fetch(`${IG_API}/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: accessToken,
      }),
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok || !publishData.id) {
      console.error("[instagram/post] publish failed:", publishData);
      return Response.json(
        { error: publishData.error?.message ?? "Failed to publish to Instagram" },
        { status: 502 }
      );
    }

    console.log(`[instagram/post] published postId=${publishData.id}`);
    return Response.json({ ok: true, postId: publishData.id });

  } catch (err) {
    console.error("[instagram/post] error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
