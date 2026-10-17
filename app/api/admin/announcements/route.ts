import { adminActor, readActor } from "@/lib/exp/actor";
import { GOALS, isOwnedSite, OWNED_SITES, testIdFor, type Goal } from "@/lib/announce/core";
import { announcementsEnabled, deleteAnnouncement, listAnnouncements, saveAnnouncement, setAnnouncementsEnabled, writeAnnouncement } from "@/lib/announce/store";
import { createTest, type AbOverride, type TestKind } from "@/lib/announce/test";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin only. Lists announcements for an owned site, plus the site flag. */
export async function GET(req: Request) {
  if (!(await readActor())) return Response.json({ error: "Forbidden" }, { status: 403 });
  const site = new URL(req.url).searchParams.get("site") || "saabai";
  if (!isOwnedSite(site)) return Response.json({ error: "Owned sites only" }, { status: 400 });
  return Response.json({ sites: OWNED_SITES, site, enabled: await announcementsEnabled(site), items: await listAnnouncements(site) });
}

type Body = { site?: string; action?: string; id?: string; data?: Record<string, unknown>; enabled?: boolean; test?: { kind?: string; goal?: string; ab?: AbOverride } };

/** Admin only (writes need a real admin session, not the Chief read-only session). */
export async function POST(req: Request) {
  const actor = await adminActor();
  if (!actor) return Response.json({ error: "Forbidden" }, { status: 403 });
  const b = (await req.json().catch(() => null)) as Body | null;
  if (!b || typeof b.action !== "string") return Response.json({ error: "Bad request" }, { status: 400 });
  const site = b.site || "saabai";
  if (!isOwnedSite(site)) return Response.json({ error: "Announcements are only available on Saabai-owned sites." }, { status: 403 });
  switch (b.action) {
    case "set_flag": {
      const r = await setAnnouncementsEnabled(site, b.enabled === true);
      return r.ok ? Response.json({ ok: true, enabled: b.enabled === true }) : Response.json({ error: r.error }, { status: 400 });
    }
    case "save": {
      const r = await saveAnnouncement(site, { ...(b.data as object), id: b.id ?? (b.data?.id as string | undefined) } as never);
      return r.ok ? Response.json({ ok: true, item: r.value }) : Response.json({ error: r.error }, { status: r.status });
    }
    case "delete": {
      const cur = (await listAnnouncements(site)).find((x) => x.id === b.id);
      if (!cur) return Response.json({ error: "Not found" }, { status: 404 });
      if (cur.status === "live" || cur.status === "scheduled") return Response.json({ error: "End it before deleting." }, { status: 409 });
      await deleteAnnouncement(site, cur.id);
      return Response.json({ ok: true });
    }
    case "create_test": {
      const cur = (await listAnnouncements(site)).find((x) => x.id === b.id);
      if (!cur) return Response.json({ error: "Not found" }, { status: 404 });
      const kind = (b.test?.kind === "ab" ? "ab" : "bar_vs_none") as TestKind;
      const goal = (GOALS.includes(b.test?.goal as Goal) ? b.test?.goal : "call_click") as Goal;
      const r = await createTest(cur, kind, goal, b.test?.ab ?? {}, actor);
      if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
      await writeAnnouncement({ ...cur, testId: testIdFor(cur.id), updatedAt: new Date().toISOString() });
      return Response.json({ ok: true, testId: r.exp.id, experimentsUrl: "/saabai-admin/experiments" });
    }
    default: return Response.json({ error: "Unknown action" }, { status: 400 });
  }
}
