import {
  getPendingLinkedInPosts,
  markLinkedInPostSent,
} from "../../../../lib/redis";

export const runtime = "nodejs";
export const maxDuration = 30;

function getAestDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhookUrl = process.env.MAKE_LINKEDIN_WEBHOOK_URL;

  if (!webhookUrl) {
    return Response.json(
      { ok: false, error: "MAKE_LINKEDIN_WEBHOOK_URL is not set" },
      { status: 500 }
    );
  }

  const posts = await getPendingLinkedInPosts(100);
  const aestDate = getAestDateString();

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const post of posts) {
    const scheduledFor = post.scheduledFor;

    // Skip anything without a schedule date
    if (!scheduledFor) {
      skipped += 1;
      continue;
    }

    // Fire only when scheduled date has arrived (compare AEST date strings)
    if (scheduledFor > aestDate) {
      skipped += 1;
      continue;
    }

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: post.id,
          ...post.payload,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        errors.push(`Post ${post.id}: webhook failed (${res.status}) ${text}`);
        continue;
      }

      await markLinkedInPostSent(post.id);
      sent += 1;
    } catch (error) {
      errors.push(
        `Post ${post.id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return Response.json({
    ok: errors.length === 0,
    sent,
    skipped,
    pending: posts.length,
    errors,
  });
}