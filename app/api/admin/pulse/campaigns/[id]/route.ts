import { requireAdminSession } from "@/lib/admin-guard";
import { deleteDoc, getDoc, patchDoc } from "@/lib/growth/store";
import { PULSE_SECTIONS, type PulseCampaign } from "@/lib/pulse/types";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  if (!(await requireAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const c = await getDoc<PulseCampaign>("pulse_campaigns", (await params).id);
  return c ? Response.json({ campaign: c }) : Response.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await requireAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const patch: Partial<PulseCampaign> = {};
  if (typeof body.title === "string") patch.title = body.title.trim().slice(0, 80);
  if (["draft", "generating", "ready", "error"].includes(body.status)) patch.status = body.status;
  if (body.sections && typeof body.sections === "object") {
    const cur = await getDoc<PulseCampaign>("pulse_campaigns", (await params).id);
    const sections = { ...(cur?.sections ?? {}) };
    for (const s of PULSE_SECTIONS) if (typeof body.sections[s] === "string") sections[s] = body.sections[s].slice(0, 8000);
    patch.sections = sections;
  }
  const c = await patchDoc<PulseCampaign>("pulse_campaigns", (await params).id, patch);
  return c ? Response.json({ campaign: c }) : Response.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(_: Request, { params }: Ctx) {
  if (!(await requireAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const ok = await deleteDoc("pulse_campaigns", (await params).id);
  return ok ? Response.json({ ok }) : Response.json({ error: "Not found" }, { status: 404 });
}
