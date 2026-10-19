import { adminActor } from "@/lib/exp/actor";
import { actorLabel } from "@/lib/auth-acl";
import { addChangeLogEntry } from "@/lib/change-log";
import { canWriteRoadmap } from "@/lib/roadmap-access";
import { buildView, createItem, deleteItem, fetchGithubState, loadItems, moveItem, updateItem, validateInput } from "@/lib/roadmap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Roadmap read: full admin, or staff granted roadmap read (proxy.ts decided; this re-checks the session). */
export async function GET() {
  if (!(await adminActor())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const items = await loadItems();
  if (!items) return Response.json({ error: "Storage is not configured" }, { status: 503 });
  const gh = await fetchGithubState(); // fails soft
  return Response.json({
    items: buildView(items, gh.ok ? gh : null),
    github: { ok: gh.ok, error: gh.error, deployedAt: gh.deployedAt },
    canWrite: await canWriteRoadmap(),
  });
}

async function log(summary: string) {
  try { await addChangeLogEntry({ siteId: "roadmap", siteName: "Roadmap", summary: summary.slice(0, 300), source: "system", authorName: await actorLabel() }); } catch { /* audit is best effort */ }
}

type Body = { action?: string; id?: string; data?: unknown; dir?: string };

/** Writes need roadmap write (proxy.ts enforces by method; re-checked here). */
async function write(req: Request): Promise<Response> {
  const actor = await adminActor();
  if (!actor || !(await canWriteRoadmap())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const b = (await req.json().catch(() => null)) as Body | null;
  if (!b) return Response.json({ error: "Bad request" }, { status: 400 });
  const who = await actorLabel(actor);
  const method = req.method;
  try {
    if (method === "POST") {
      const v = validateInput(b.data);
      if (!v.ok) return Response.json({ error: v.error }, { status: 400 });
      const item = await createItem(v.value, who);
      await log(`Roadmap: added "${item.title}" (${item.status})`);
      return Response.json({ ok: true, item }, { status: 201 });
    }
    if (method === "PATCH") {
      if (typeof b.id !== "string") return Response.json({ error: "Bad request" }, { status: 400 });
      if (b.action === "move") {
        if (b.dir !== "up" && b.dir !== "down") return Response.json({ error: "Bad request" }, { status: 400 });
        return (await moveItem(b.id, b.dir)) ? Response.json({ ok: true }) : Response.json({ error: "Not found" }, { status: 404 });
      }
      const v = validateInput(b.data, true);
      if (!v.ok) return Response.json({ error: v.error }, { status: 400 });
      const item = await updateItem(b.id, v.value, who);
      if (!item) return Response.json({ error: "Not found" }, { status: 404 });
      await log(`Roadmap: updated "${item.title}" (${item.status})`);
      return Response.json({ ok: true, item });
    }
    if (typeof b.id !== "string") return Response.json({ error: "Bad request" }, { status: 400 });
    const gone = await deleteItem(b.id);
    if (!gone) return Response.json({ error: "Not found" }, { status: 404 });
    await log(`Roadmap: deleted "${gone.title}"`);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export const POST = write;
export const PATCH = write;
export const DELETE = write;
