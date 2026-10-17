import { adminActor } from "@/lib/exp/actor";
import { isKnownSite } from "@/lib/exp/admin";
import { validateWrapRequest } from "@/lib/exp/editor";
import { slotEntrySource } from "@/lib/exp/editor";
import { openWrapPr } from "@/lib/exp/wrap-pr";
import { SLOTS } from "@/lib/exp/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin only. Fallback for elements the runtime overlay can't target. Turns an element into a slot REQUEST: if
 * GITHUB_EXP_PR_TOKEN is set it opens a DRAFT pull request. Never merges and never starts a test. Without the token
 * it returns the exact snippet so the request can be handled by hand.
 */
export async function POST(req: Request) {
  if (!(await adminActor())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const site = typeof body?.site === "string" ? body.site : "saabai";
  if (!isKnownSite(site)) return Response.json({ error: "Unknown site" }, { status: 400 });
  const chk = validateWrapRequest(body, SLOTS.map((s) => s.slot), site);
  if (!chk.ok) return Response.json({ error: chk.error }, { status: 400 });
  const r = chk.req;
  const token = process.env.GITHUB_EXP_PR_TOKEN;
  if (!token) return Response.json({ ok: true, mode: "manual", slot: r.slot, snippet: slotEntrySource(r), message: "No GitHub access is set up for the editor yet, so here is the exact request to hand over." });
  const res = await openWrapPr(token, r);
  if (!res.ok) return Response.json({ error: res.error }, { status: res.status });
  return Response.json({ ok: true, mode: "pr", slot: res.slot, wrapped: res.wrapped, ...(res.wrapNote ? { wrapNote: res.wrapNote } : {}), prUrl: res.prUrl, prNumber: res.prNumber });
}
