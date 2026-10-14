import { requireAdminSession } from "@/lib/admin-guard";
import { listDocs, newId, putDoc } from "@/lib/growth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Marketing drafts. Creating one never sends anything; sends happen from the Marketing tab after review. */
export type MarketingDraft = {
  id: string; createdAt: string; updatedAt: string;
  channel: "email" | "sms"; kind: "marketing" | "transactional";
  subject?: string; body: string; source: string; sourceId?: string; status: "draft";
};

export async function GET() {
  if (!(await requireAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ drafts: await listDocs<MarketingDraft>("marketing_drafts", 100) });
}

export async function POST(req: Request) {
  if (!(await requireAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const channel = b.channel === "sms" ? "sms" : "email";
  const text = typeof b.body === "string" ? b.body.trim().slice(0, channel === "sms" ? 612 : 20000) : "";
  if (!text) return Response.json({ error: "Draft body is required" }, { status: 400 });
  const d = await putDoc<MarketingDraft>("marketing_drafts", {
    id: newId("md"), channel, kind: "marketing", subject: typeof b.subject === "string" ? b.subject.slice(0, 150) : undefined,
    body: text, source: typeof b.source === "string" ? b.source.slice(0, 40) : "manual",
    sourceId: typeof b.sourceId === "string" ? b.sourceId.slice(0, 64) : undefined, status: "draft",
  });
  return Response.json({ draft: d });
}
