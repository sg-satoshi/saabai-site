import { REPO, SEED_FILE, countWrapMatches, insertSlotEntry, isWrapCandidatePath, prBody, requestNote, slotEntrySource, wrapSource, type WrapOutcome, type WrapRequest } from "./editor";

const GH = "https://api.github.com";
let recent: number[] = [];
export const recentLimit = () => { const now = Date.now(); recent = recent.filter((t) => now - t < 3600_000); if (recent.length >= 5) return false; recent.push(now); return true; };

export async function gh(token: string, path: string, init?: RequestInit) {
  const r = await fetch(`${GH}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "content-type": "application/json", "user-agent": "saabai-exp-editor", ...(init?.headers ?? {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`GitHub ${r.status}`);
  return d as Record<string, unknown>;
}

/** Looks for exactly one safe literal match of the element across app/ source. Never throws. */
async function tryWrap(token: string, r: WrapRequest): Promise<{ outcome: WrapOutcome; file?: { path: string; sha: string; next: string } }> {
  try {
    const tree = (await gh(token, `/repos/${REPO}/git/trees/main?recursive=1`)).tree as { path: string; type: string; sha: string; size?: number }[];
    const files = tree.filter((t) => t.type === "blob" && isWrapCandidatePath(t.path) && (t.size ?? 0) < 200_000).slice(0, 400);
    const hits: { path: string; sha: string; src: string }[] = [];
    for (let i = 0; i < files.length; i += 25) {
      const batch = await Promise.all(files.slice(i, i + 25).map(async (f) => {
        const b = await gh(token, `/repos/${REPO}/git/blobs/${f.sha}`);
        return { path: f.path, sha: f.sha, src: Buffer.from(String(b.content), "base64").toString("utf8") };
      }));
      for (const f of batch) { const n = countWrapMatches(f.src, r); if (n > 0) hits.push({ ...f, src: f.src }); if (n > 1) return { outcome: { wrapped: false, reason: `The copy appears more than once in ${f.path}, so I did not guess which one.` } }; }
    }
    if (hits.length === 0) return { outcome: { wrapped: false, reason: "No plain text match was found in the page source (the copy may be built from variables, split across tags, or in a client component)." } };
    if (hits.length > 1) return { outcome: { wrapped: false, reason: `The same copy appears in ${hits.length} files (${hits.map((h) => h.path).join(", ")}), so I did not guess which one.` } };
    const next = wrapSource(hits[0].src, r);
    if (!next) return { outcome: { wrapped: false, reason: "The match was not safe to rewrite automatically." } };
    return { outcome: { wrapped: true, file: hits[0].path }, file: { path: hits[0].path, sha: hits[0].sha, next } };
  } catch {
    return { outcome: { wrapped: false, reason: "The source search failed, so nothing was wrapped." } };
  }
}


export type PrResult =
  | { ok: true; slot: string; wrapped: boolean; wrapNote?: string; prUrl: string; prNumber: number }
  | { ok: false; status: number; error: string };

/**
 * Opens (or refuses to duplicate) a DRAFT pull request that adds the slot entry and wraps the element in ExpText.
 * Never merges. De-duplicates on the slot branch prefix, so repeated calls for the same slot open nothing new.
 * `hybrid` marks a request raised automatically for a test that is already running through the runtime overlay.
 */
export async function openWrapPr(token: string, r: WrapRequest, opts: { hybrid?: boolean } = {}): Promise<PrResult> {
  const now = Date.now();
  try {
    const open = (await (await fetch(`${GH}/repos/${REPO}/git/matching-refs/heads/exp-slot-${r.slot.replace(/\./g, "-")}-`, { headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "saabai-exp-editor" } })).json().catch(() => [])) as unknown;
    if (Array.isArray(open) && open.length) return { ok: false, status: 409, error: "A request for this slot is already open as a draft PR. Check GitHub, or pick a different slot name." };
    if (!recentLimit()) return { ok: false, status: 429, error: "Five requests in the last hour. Please wait a bit." };
    const base = (await gh(token, `/repos/${REPO}/git/ref/heads/main`)).object as { sha: string };
    const file = await gh(token, `/repos/${REPO}/contents/${SEED_FILE}?ref=main`);
    const src = Buffer.from(String(file.content), "base64").toString("utf8");
    const next = insertSlotEntry(src, slotEntrySource(r));
    if (!next) return { ok: false, status: 500, error: "Couldn't find the slot list in seed.ts, so nothing was changed." };
    const branch = `exp-slot-${r.slot.replace(/\./g, "-")}-${now.toString(36)}`;
    await gh(token, `/repos/${REPO}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: base.sha }) });
    await gh(token, `/repos/${REPO}/contents/${SEED_FILE}`, { method: "PUT", body: JSON.stringify({ message: `exp: request slot ${r.slot}`, content: Buffer.from(next).toString("base64"), sha: file.sha, branch }) });
    const w = await tryWrap(token, r);
    if (w.file) {
      await gh(token, `/repos/${REPO}/contents/${w.file.path}`, { method: "PUT", body: JSON.stringify({ message: `exp: wrap ${r.slot} in ExpText`, content: Buffer.from(w.file.next).toString("base64"), sha: w.file.sha, branch }) });
    } else {
      await gh(token, `/repos/${REPO}/contents/docs/exp-slot-requests/${r.slot}.md`, { method: "PUT", body: JSON.stringify({ message: `exp: note for slot ${r.slot}`, content: Buffer.from(requestNote(r)).toString("base64"), branch }) });
    }
    const pr = await gh(token, `/repos/${REPO}/pulls`, { method: "POST", body: JSON.stringify({ title: `exp: ${opts.hybrid ? "native wrap for running test" : "slot request"} ${r.slot}`, head: branch, base: "main", body: prBody(r, w.outcome, opts.hybrid), draft: true }) });
    return { ok: true, slot: r.slot, wrapped: w.outcome.wrapped, ...(w.outcome.wrapped ? {} : { wrapNote: w.outcome.reason }), prUrl: String(pr.html_url), prNumber: Number(pr.number) };
  } catch {
    return { ok: false, status: 502, error: "Couldn't open the draft pull request. Nothing went live." };
  }
}
