import { requireAdminSession } from "../../../../lib/admin-guard";
import {
  adminSnapshot, campaignDetail, createListCampaign, healthReport, importContacts, listContacts, queueBroadcast,
  saveCampaign, saveDailyCap, saveFromName, saveSeries, scheduleBroadcast, sendTest, setSendingPaused,
  deleteContacts, updateContact,
} from "../../../../lib/email/ops";
import { cleanDeleteIds, cleanListIds, validateContactEdit } from "../../../../lib/email/contact-admin";
import { addChangeLogEntry } from "../../../../lib/change-log";
import { maskEmail } from "../../../../lib/sunder-waitlist";
import type { SeriesStepInput } from "../../../../lib/email/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function denied() {
  if (!(await requireAdminSession())) return Response.json({ error: "Your session expired. Sign in again." }, { status: 401 });
  return null;
}

export async function GET(req: Request) {
  const block = await denied();
  if (block) return block;
  const view = new URL(req.url).searchParams.get("view") || "home";
  try {
    if (view === "campaign") return Response.json(await campaignDetail(new URL(req.url).searchParams.get("id") || ""));
    if (view === "health") return Response.json(await healthReport());
    if (view === "subscribers") {
      const url = new URL(req.url);
      return Response.json(await listContacts({ q: url.searchParams.get("q") || "", status: url.searchParams.get("status") || "all" }));
    }
    return Response.json(await adminSnapshot());
  } catch (e) {
    console.error("email admin read failed:", e instanceof Error ? e.message : "error");
    return Response.json({ error: "Could not load this page. Nothing was sent or changed." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const block = await denied();
  if (block) return block;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const action = String(body.action || "");
  try {
    if (action === "pause") return Response.json(await setSendingPaused(body.paused === true));
    if (action === "fromName") return Response.json(await saveFromName(String(body.fromName || "")));
    if (action === "cap") return Response.json(await saveDailyCap(Number(body.cap)));
    if (action === "series") {
      const steps = Array.isArray(body.steps) ? body.steps as SeriesStepInput[] : [];
      const status = body.status === "paused" ? "paused" : "active";
      return Response.json(await saveSeries(steps, status));
    }
    if (action === "save") {
      return Response.json(await saveCampaign({
        id: typeof body.id === "string" ? body.id : undefined,
        name: String(body.name || ""),
        subject: String(body.subject || ""),
        preheader: String(body.preheader || ""),
        blocks: body.blocks,
        fromName: typeof body.fromName === "string" ? body.fromName : undefined,
      }));
    }
    if (action === "test") return Response.json(await sendTest({ campaignId: String(body.campaignId || ""), to: String(body.to || "") }));
    if (action === "send") {
      return Response.json(await queueBroadcast({
        campaignId: String(body.campaignId || ""),
        confirm: typeof body.confirm === "string" ? body.confirm : undefined,
      }));
    }
    if (action === "schedule") {
      return Response.json(await scheduleBroadcast({
        campaignId: String(body.campaignId || ""),
        when: String(body.when || ""),
        confirm: typeof body.confirm === "string" ? body.confirm : undefined,
      }));
    }
    if (action === "updateContact") {
      const v = validateContactEdit(body);
      if (!v.ok) return Response.json(v, { status: 400 });
      const r = await updateContact(v.edit);
      if (r.ok && r.changed.length) {
        await addChangeLogEntry({ siteId: "sunder", siteName: "SUNDER", summary: `Email subscriber ${maskEmail(v.edit.email)} edited (${r.changed.join(", ")})`, source: "manual", authorName: "Admin" }).catch(() => {});
      }
      return Response.json(r, { status: r.ok ? 200 : 400 });
    }
    if (action === "deleteContacts") {
      const v = cleanDeleteIds(body.ids);
      if (!v.ok) return Response.json(v, { status: 400 });
      const r = await deleteContacts(v.ids);
      if (r.ok) {
        console.info("email admin: deleted contacts", { count: r.deleted, cancelled: r.cancelled });
        await addChangeLogEntry({ siteId: "sunder", siteName: "SUNDER", summary: `Deleted ${r.deleted} email subscriber${r.deleted === 1 ? "" : "s"} (${r.emails.slice(0, 5).map((e) => maskEmail(e)).join(", ")}${r.emails.length > 5 ? ", ..." : ""}); cancelled ${r.cancelled} queued email${r.cancelled === 1 ? "" : "s"}`, source: "manual", authorName: "Admin" }).catch(() => {});
        return Response.json({ ok: true, deleted: r.deleted, cancelled: r.cancelled });
      }
      return Response.json(r, { status: 400 });
    }
    if (action === "createListCampaign") {
      const v = cleanListIds(body.ids);
      if (!v.ok) return Response.json(v, { status: 400 });
      const r = await createListCampaign(v.ids);
      if (r.ok) {
        await addChangeLogEntry({ siteId: "sunder", siteName: "SUNDER", summary: `Smart list draft: ${r.selected} selected, ${r.eligible} eligible`, source: "manual", authorName: "Admin" }).catch(() => {});
      }
      return Response.json(r, { status: r.ok ? 200 : 400 });
    }
    if (action === "import") return Response.json(await importContacts(String(body.csv || "")));
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("email admin write failed:", e instanceof Error ? e.message : "error");
    return Response.json({ error: "That did not save. Nothing was sent." }, { status: 500 });
  }
}
