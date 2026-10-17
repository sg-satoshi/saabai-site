import { after } from "next/server";
import { adminActor } from "@/lib/exp/actor";
import { isKnownSite, listExperiments } from "@/lib/exp/admin";
import { setWrapInfo, writeExperiment } from "@/lib/exp/config";
import { KIND_RULES, kindCopyError, validateExperiment, type Experiment } from "@/lib/exp/core";
import { experimentIdForSlot, isProtectedText, uniqueSlot, validateWrapRequest } from "@/lib/exp/editor";
import { SELECTOR_RE, fingerprint, overlayPathOk } from "@/lib/exp/overlay";
import { SLOTS } from "@/lib/exp/seed";
import { variantRows } from "@/lib/exp/mutate";
import { serviceDb } from "@/lib/exp/track";
import { openWrapPr } from "@/lib/exp/wrap-pr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Admin only. Turns any element picked in the visual editor into a split test immediately, with no pull request first.
 * The test is served by the runtime overlay (proxy assignment + client apply). In the background a DRAFT pull request
 * is opened to wrap the element natively (never merged automatically); when it ships the test switches over with the
 * same experiment id, so assignments and results carry on unchanged.
 */
export async function POST(req: Request) {
  const actor = await adminActor();
  if (!actor) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const site = typeof body?.site === "string" ? body.site : "saabai";
  if (!isKnownSite(site)) return Response.json({ error: "Unknown site" }, { status: 400 });
  const db = serviceDb();
  if (!db) return Response.json({ error: "The split testing database isn't configured." }, { status: 503 });

  const sel = typeof body?.selector === "string" ? body.selector : "";
  if (!SELECTOR_RE.test(sel)) return Response.json({ error: "Couldn't pin down that element reliably. Use Request test slot instead.", fallback: true }, { status: 422 });
  const existing = await listExperiments(site);
  const taken = [...SLOTS.map((s) => s.slot), ...existing.map((e) => e.slot)];
  const rawSlot = typeof body?.slot === "string" ? body.slot : "";
  const chk = validateWrapRequest({ ...body, slot: uniqueSlot(rawSlot, taken) }, [], site);
  if (!chk.ok) return Response.json({ error: chk.error }, { status: 400 });
  const r = chk.req;
  if (!overlayPathOk(r.path)) return Response.json({ error: "That page can't be split tested from the editor." }, { status: 400 });
  const id = experimentIdForSlot(r.slot);
  if (!/^[a-z0-9-]{3,48}$/.test(id)) return Response.json({ error: "Slot name is too long, please shorten it." }, { status: 400 });

  const fpOf = (text?: string, emph?: string) => fingerprint([text, emph].filter(Boolean).join(" "));
  const fp = fpOf(r.control.text, r.control.emphasis);
  if (!fp || isProtectedText(fp)) return Response.json({ error: "That element can't be tested." }, { status: 400 });
  // Never touch an element that is already a test (running or not), however it was set up.
  const clash = existing.find((e) => e.path === r.path && (e.overlay?.sel === sel || e.overlay?.fp === fp || fpOf(e.variants.find((x) => x.id === "a")?.text, e.variants.find((x) => x.id === "a")?.emphasis) === fp));
  if (clash) return Response.json({ error: "That element is already a test.", expId: clash.id }, { status: 409 });

  const v = (body?.variant ?? null) as { text?: unknown; emphasis?: unknown } | null;
  const tidy = (x: unknown) => (typeof x === "string" ? x.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim() : "");
  const vText = tidy(v?.text), vEmph = tidy(v?.emphasis);
  if (vText) {
    const rule = KIND_RULES[r.kind];
    if (vText.length > rule.maxText || vEmph.length > rule.maxEmphasis || (vEmph && !rule.emphasis)) return Response.json({ error: `Keep the ${rule.noun} within ${rule.maxText} characters.` }, { status: 400 });
    const ke = kindCopyError(r.kind, vText, vEmph);
    if (ke) return Response.json({ error: ke }, { status: 400 });
  }
  const exp: Experiment = {
    id, siteKey: site, slot: r.slot, kind: r.kind, slotType: "text", name: r.name, path: r.path,
    status: vText ? "running" : "draft", defaultVariantId: "a", rev: 1, updatedAt: new Date().toISOString(),
    overlay: { sel, fp, tag: r.tag },
    variants: [
      { id: "a", text: r.control.text, ...(r.control.emphasis ? { emphasis: r.control.emphasis } : {}), active: true, source: "human" },
      ...(vText ? [{ id: "b", text: vText, ...(vEmph ? { emphasis: vEmph } : {}), active: true, source: "human" as const }] : []),
    ],
  };
  const ok = validateExperiment(exp);
  if (!ok) return Response.json({ error: "That test isn't valid (check for long dashes or empty copy)." }, { status: 400 });
  const { error } = await db.rpc("exp_admin_apply", { p_key: ok.id, p_site: site, p_slot: ok.slot, p_name: ok.name ?? ok.id, p_status: ok.status, p_lead: null, p_variants: variantRows(ok), p_actor: actor, p_action: "create_overlay_test", p_detail: { slot: ok.slot, kind: ok.kind, path: ok.path, selector: sel, mode: "overlay" } });
  if (error) return Response.json({ error: "Couldn't save the test (database). Nothing was changed." }, { status: 502 });
  try { await writeExperiment(ok); } catch { return Response.json({ error: "Saved to the log but couldn't publish to the live site. Please try again." }, { status: 502 }); }

  // Background: open the draft wrap PR (de-duplicated per slot). Never blocks or fails the test, never merges.
  const token = process.env.GITHUB_EXP_PR_TOKEN;
  let wrap: "pending" | "manual" = "manual";
  if (token) {
    wrap = "pending";
    await setWrapInfo(site, ok.id, { state: "pending" });
    after(async () => {
      const res = await openWrapPr(token, r, { hybrid: true });
      await setWrapInfo(site, ok.id, res.ok ? { state: "open", url: res.prUrl, number: res.prNumber, ...(res.wrapNote ? { note: res.wrapNote } : {}) } : { state: "failed", note: res.error });
    });
  } else await setWrapInfo(site, ok.id, { state: "manual", note: "No GitHub access, so no native wrap request was opened. The test still works." });
  return Response.json({ ok: true, expId: ok.id, slot: ok.slot, status: ok.status, wrap });
}
