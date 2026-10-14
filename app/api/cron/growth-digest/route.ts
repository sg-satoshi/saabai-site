import { Resend } from "resend";
import { buildDigest, renderDigest } from "@/lib/growth/digest";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel cron "0 21 * * 0" = Monday 7:00 AM Brisbane (UTC+10, no DST). Sends to Shane only.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (process.env.GROWTH_DIGEST_ENABLED === "false") return Response.json({ ok: true, skipped: "disabled" });
  const key = process.env.RESEND_API_KEY;
  if (!key) return Response.json({ error: "Email not configured" }, { status: 503 });
  const { subject, html } = renderDigest(await buildDigest());
  const to = (process.env.GROWTH_DIGEST_TO || "hello@saabai.ai").split(",").map((s) => s.trim()).filter(Boolean);
  const r = await new Resend(key).emails.send({ from: "Saabai Digest <hello@saabai.ai>", to, subject, html });
  if (r.error) return Response.json({ error: "Send failed" }, { status: 502 });
  return Response.json({ ok: true });
}
