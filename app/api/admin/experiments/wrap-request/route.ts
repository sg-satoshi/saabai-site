import { adminActor } from "@/lib/exp/actor";
import { isKnownSite } from "@/lib/exp/admin";
import { REPO, SEED_FILE, insertSlotEntry, prBody, requestNote, slotEntrySource, validateWrapRequest } from "@/lib/exp/editor";
import { SLOTS } from "@/lib/exp/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GH = "https://api.github.com";
let recent: number[] = [];

async function gh(token: string, path: string, init?: RequestInit) {
  const r = await fetch(`${GH}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "content-type": "application/json", "user-agent": "saabai-exp-editor", ...(init?.headers ?? {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`GitHub ${r.status}`);
  return d as Record<string, unknown>;
}

/**
 * Admin only. Turns an unwrapped headline or button into a slot REQUEST. If GITHUB_EXP_PR_TOKEN is set it opens a
 * DRAFT pull request (seed entry plus a note). It never merges and never starts a test. Without the token it
 * returns the exact snippet so the request can be handled by hand.
 */
export async function POST(req: Request) {
  if (!(await adminActor())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const site = typeof body?.site === "string" ? body.site : "saabai";
  if (!isKnownSite(site)) return Response.json({ error: "Unknown site" }, { status: 400 });
  const chk = validateWrapRequest(body, SLOTS.map((s) => s.slot), site);
  if (!chk.ok) return Response.json({ error: chk.error }, { status: 400 });
  const r = chk.req;
  const entry = slotEntrySource(r);
  const token = process.env.GITHUB_EXP_PR_TOKEN;
  if (!token) return Response.json({ ok: true, mode: "manual", slot: r.slot, snippet: entry, message: "No GitHub access is set up for the editor yet, so here is the exact request to hand over." });

  const now = Date.now();
  recent = recent.filter((t) => now - t < 3600_000);
  if (recent.length >= 5) return Response.json({ error: "Five requests in the last hour. Please wait a bit." }, { status: 429 });
  recent.push(now);
  try {
    const base = (await gh(token, `/repos/${REPO}/git/ref/heads/main`)).object as { sha: string };
    const file = await gh(token, `/repos/${REPO}/contents/${SEED_FILE}?ref=main`);
    const src = Buffer.from(String(file.content), "base64").toString("utf8");
    const next = insertSlotEntry(src, entry);
    if (!next) return Response.json({ error: "Couldn't find the slot list in seed.ts, so nothing was changed." }, { status: 500 });
    const branch = `exp-slot-${r.slot.replace(/\./g, "-")}-${now.toString(36)}`;
    await gh(token, `/repos/${REPO}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: base.sha }) });
    await gh(token, `/repos/${REPO}/contents/${SEED_FILE}`, { method: "PUT", body: JSON.stringify({ message: `exp: request slot ${r.slot}`, content: Buffer.from(next).toString("base64"), sha: file.sha, branch }) });
    await gh(token, `/repos/${REPO}/contents/docs/exp-slot-requests/${r.slot}.md`, { method: "PUT", body: JSON.stringify({ message: `exp: note for slot ${r.slot}`, content: Buffer.from(requestNote(r)).toString("base64"), branch }) });
    const pr = await gh(token, `/repos/${REPO}/pulls`, { method: "POST", body: JSON.stringify({ title: `exp: slot request ${r.slot}`, head: branch, base: "main", body: prBody(r), draft: true }) });
    return Response.json({ ok: true, mode: "pr", slot: r.slot, prUrl: String(pr.html_url), prNumber: Number(pr.number) });
  } catch {
    return Response.json({ error: "Couldn't open the draft pull request. Nothing went live." }, { status: 502 });
  }
}
