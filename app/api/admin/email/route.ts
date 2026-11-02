import { requireAdminSession } from "../../../../lib/admin-guard";
import { adminSnapshot, queueBroadcast, saveFromName, saveSeries, sendTest, setSendingPaused } from "../../../../lib/email/ops";
import type { SeriesStepInput } from "../../../../lib/email/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function denied() {
  if (!(await requireAdminSession())) return Response.json({ error: "Your session expired. Sign in again." }, { status: 401 });
  return null;
}

export async function GET() {
  const block = await denied();
  if (block) return block;
  try {
    return Response.json(await adminSnapshot());
  } catch (e) {
    console.error("email admin read failed:", e instanceof Error ? e.message : "error");
    return Response.json({ error: "Couldn't load SUNDER email. Try again shortly." }, { status: 500 });
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
    if (action === "series") {
      const steps = Array.isArray(body.steps) ? body.steps as SeriesStepInput[] : [];
      const status = body.status === "paused" ? "paused" : "active";
      return Response.json(await saveSeries(steps, status));
    }
    if (action === "test") {
      return Response.json(await sendTest({
        to: String(body.to || ""),
        subject: String(body.subject || ""),
        body: String(body.body || ""),
        fromName: typeof body.fromName === "string" ? body.fromName : undefined,
      }));
    }
    if (action === "broadcast") {
      return Response.json(await queueBroadcast({
        subject: String(body.subject || ""),
        body: String(body.body || ""),
        fromName: typeof body.fromName === "string" ? body.fromName : undefined,
        requestKey: String(body.requestKey || ""),
      }));
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("email admin write failed:", e instanceof Error ? e.message : "error");
    return Response.json({ error: "That didn't save. Try again shortly." }, { status: 500 });
  }
}
