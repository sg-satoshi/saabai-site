import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, siteSlug } = body;

  if (action === "deploy") {
    const jobId = `deploy:${Date.now()}`;
    await redis.set(`deploy:${jobId}`, JSON.stringify({
      id: jobId,
      siteSlug,
      stage: "build",
      createdAt: Date.now(),
    }), { ex: 86400 });

    return Response.json({
      status: "ready",
      jobId,
      message: `Run: cd ~/saabai-site-audit && git push origin main`,
      nextSteps: ["Build", "Test", "Verify"]
    });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
