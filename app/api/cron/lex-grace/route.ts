import { sweepDataRetention, sweepGrace } from "../../../../lib/lex-subscription";
import { deleteFirmMatters } from "../../../../lib/lex-matters";
import { firmKeyForEmail } from "../../../../lib/lex-review-access";
import { listDirectoryUsers } from "../../../../lib/user-directory";
import { getRedis } from "../../../../lib/redis";
import { listPortalUsers } from "../../../../lib/portal-users";
import { getLexClients } from "../../../../lib/lex-config";
import { lexAlert, lexMailer } from "../../../../lib/lex-subscription-emails";
import { flushFeedbackDigest } from "../../../../lib/lex-feedback";
import { getStripe } from "../../../../lib/stripe";
import { sweepTrials } from "../../../../lib/lex-trial";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Hourly: for firms whose 7-day failed-payment grace has ended, re-checks the live Stripe subscription, then lapses or restores. Also deletes cancelled firms' Lex data after 30 days (clause 10.7). Vercel sends Bearer CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await sweepGrace(lexMailer, async (id) => (await getStripe().subscriptions.retrieve(id)).status);
    // Free trials past day 60 with no subscription: lapse (trial_ended); the 30-day data clock starts at the trial end.
    const trials = await sweepTrials(lexMailer);
    const data = await sweepDataRetention(
      { matters: deleteFirmMatters, threads: async (e) => { await getRedis()?.del(`lex:threads:${e.toLowerCase()}`); } },
      firmKeyForEmail,
      // Anyone who can still use Lex keeps their firm key's matters: directory Lex users, approved portal users,
      // configured Lex client teams and LEX_PORTAL_ALLOWED_EMAILS.
      async () => [
        ...(await listDirectoryUsers()).filter((u) => u.products?.includes("lex") && u.email).map((u) => u.email),
        ...(await listPortalUsers()).map((u) => u.email),
        ...getLexClients().map((c) => c.email.teamEmail),
        ...(process.env.LEX_PORTAL_ALLOWED_EMAILS ?? "").split(","),
      ].map((e) => String(e ?? "").trim().toLowerCase()).filter((e) => e.includes("@")),
      new Date(),
      { alert: lexAlert }, // mode from LEX_DATA_DELETION_MODE; unset means dry_run
    );
    const feedbackDigest = await flushFeedbackDigest(lexAlert).catch(() => 0);
    return Response.json({ ok: true, result, trials, data, feedbackDigest });
  } catch (err) {
    console.error("[lex grace]", err instanceof Error ? err.name : err);
    return Response.json({ error: "Sweep failed" }, { status: 500 });
  }
}
