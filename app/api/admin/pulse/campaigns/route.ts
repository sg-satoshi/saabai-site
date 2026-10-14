import { requireAdminSession } from "@/lib/admin-guard";
import { listDocs, putDoc, newId } from "@/lib/growth/store";
import { cleanBrief, type PulseCampaign } from "@/lib/pulse/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json({ campaigns: await listDocs<PulseCampaign>("pulse_campaigns", 100) });
  } catch (e) {
    console.error("[pulse campaigns]", e);
    return Response.json({ error: "Could not load campaigns" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await requireAdminSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const brief = cleanBrief(body.brief);
  if (!brief) return Response.json({ error: "Product, audience and goal are required" }, { status: 400 });
  const title = (typeof body.title === "string" && body.title.trim().slice(0, 80)) || defaultTitle(brief);
  const c = await putDoc<PulseCampaign>("pulse_campaigns", { id: newId("pc"), title, brief, sections: {}, status: "generating" });
  return Response.json({ campaign: c });
}

function defaultTitle(b: { preset: string; product: string; goal: string }): string {
  const who = b.preset === "saabai" ? "Saabai" : b.product.split(/[,(.]/)[0].trim().slice(0, 40) || "Campaign";
  const d = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Brisbane" });
  return `${who} · ${b.goal} · ${d}`;
}
