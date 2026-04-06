import { getPendingInstagramPosts, markInstagramPostSent } from "../../../../lib/redis";

export const runtime = "nodejs";

const IG_API = "https://graph.facebook.com/v22.0";

// Called by Vercel Cron — see vercel.json
export async function GET(req: Request) {
  // Verify cron secret
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const igUserId    = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!igUserId || !accessToken) {
    console.log("[ig-cron] Instagram env vars not set — skipping");
    return Response.json({ ok: true, skipped: true, reason: "Instagram not configured" });
  }

  const todayStr = new Date(Date.now() + 10 * 3600 * 1000).toISOString().slice(0, 10); // AEST
  const pending  = await getPendingInstagramPosts();
  const due      = pending.filter(p => p.scheduledFor <= todayStr);

  if (!due.length) {
    return Response.json({ ok: true, posted: 0, message: "Nothing due" });
  }

  let posted = 0;
  let failed = 0;

  for (const post of due) {
    try {
      // Create container
      const containerRes = await fetch(`${IG_API}/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: post.imageUrl,
          caption: post.caption,
          access_token: accessToken,
        }),
      });
      const containerData = await containerRes.json();
      if (!containerData.id) throw new Error(containerData.error?.message ?? "Container failed");

      // Publish
      const publishRes = await fetch(`${IG_API}/${igUserId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: accessToken,
        }),
      });
      const publishData = await publishRes.json();
      if (!publishData.id) throw new Error(publishData.error?.message ?? "Publish failed");

      await markInstagramPostSent(post.id, publishData.id);
      console.log(`[ig-cron] posted id=${post.id} igPostId=${publishData.id}`);
      posted++;
    } catch (err) {
      console.error(`[ig-cron] failed id=${post.id}:`, err);
      failed++;
    }
  }

  return Response.json({ ok: true, posted, failed, total: due.length });
}
