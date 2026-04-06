import { getPendingLinkedInPosts, markLinkedInPostSent } from "../../../../lib/redis";

export const runtime = "nodejs";
export const maxDuration = 30;

// Runs daily at 11pm UTC = 9am Brisbane AEST
// Fires any LinkedIn posts scheduled for today or earlier

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const webhookUrl = process.env.MAKE_LINKEDIN_WEBHOOK_URL;
  if (!webhookUrl) {
    return Response.json({ skipped: "no webhook url" });
  }

  const posts = await getPendingLinkedInPosts();
  const now = new Date();
  // Use Brisbane AEST date (UTC+10)
  const aestDate = new Date(now.getTime() + 10 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let fired = 0;
  const errors: string[] = [];

  for (const post of posts) {
    // Fire if scheduledFor date has arrived (compare AEST dates)
    if (post.scheduledFor > aestDate) continue;

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: post.content,
          imageUrl: post.imageUrl ?? null,
          source: "scheduler",
          postedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(`Make returned ${res.status}`);
      await markLinkedInPostSent(post.id);
      fired++;
    } catch (err) {
      errors.push(`${post.id}: ${String(err)}`);
    }
  }

  console.log(`[linkedin-scheduler] fired=${fired} errors=${errors.length}`);
  return Response.json({ ok: true, fired, errors });
}
