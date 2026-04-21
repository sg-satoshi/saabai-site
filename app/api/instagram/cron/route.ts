import {
  getPendingInstagramPosts,
  markInstagramPostSent,
} from "../../../../lib/redis";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const webhookUrl = process.env.MAKE_INSTAGRAM_WEBHOOK_URL;

  if (!webhookUrl) {
    return Response.json(
      { ok: false, error: "MAKE_INSTAGRAM_WEBHOOK_URL is not set" },
      { status: 500 }
    );
  }

  // AEST-style date (rough but consistent)
  const todayStr = new Date(Date.now() + 10 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  const pending = await getPendingInstagramPosts();

  // ✅ Safe guard for optional scheduledFor
  const due = pending.filter(
    (p) => typeof p.scheduledFor === "string" && p.scheduledFor <= todayStr
  );

  if (!due.length) {
    return Response.json({
      ok: true,
      posted: 0,
      message: "Nothing due",
    });
  }

  const results: Array<{
    id: string;
    ok: boolean;
    status?: number;
    error?: string;
  }> = [];

  for (const post of due) {
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
        results.push({
          id: post.id,
          ok: false,
          status: res.status,
          error: text || `Webhook failed (${res.status})`,
        });
        continue;
      }

      await markInstagramPostSent(post.id);

      results.push({
        id: post.id,
        ok: true,
        status: res.status,
      });
    } catch (err) {
      results.push({
        id: post.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const posted = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return Response.json({
    ok: failed === 0,
    posted,
    failed,
    totalDue: due.length,
    results,
  });
}