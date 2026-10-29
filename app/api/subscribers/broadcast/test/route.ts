/**
 * Admin-only: send one test of a broadcast to hello@saabai.ai (#339).
 * /api/subscribers is admin-gated in proxy.ts; this route checks the admin session again.
 * The recipient is fixed in lib/broadcast-test.ts and this route never reads the subscriber list.
 */
import { requireAdminSession } from "../../../../../lib/admin-guard";
import { handleBroadcastTest, BROADCAST_TEST_LIMIT, BROADCAST_TEST_WINDOW_SECONDS } from "../../../../../lib/broadcast-test";
import { isSuppressed, unsubHeaders, unsubUrl } from "../../../../../lib/growth/consent";
import { getRedis } from "../../../../../lib/redis";

export const runtime = "nodejs";

async function claimSlot(): Promise<boolean | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const key = `broadcast:test:rl:${Math.floor(Date.now() / (BROADCAST_TEST_WINDOW_SECONDS * 1000))}`;
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, BROADCAST_TEST_WINDOW_SECONDS);
    return n <= BROADCAST_TEST_LIMIT;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const r = await handleBroadcastTest(body, {
    isAdmin: requireAdminSession,
    claimSlot,
    isSuppressed,
    unsubUrl,
    unsubHeaders,
    send: async (email) => {
      const key = (process.env.RESEND_API_KEY ?? "").replace(/[\s\n]/g, "");
      if (!key) return { ok: false, error: "Resend not configured" };
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify(email),
        });
        const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
        return res.ok ? { ok: true, id: data.id } : { ok: false, error: data.message ?? "Test send failed" };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    },
  });
  if (r.status === 200) console.log(`[broadcast-test] sent subject="${String(r.body.subject)}" id=${String(r.body.id)}`);
  return Response.json(r.body, { status: r.status });
}
