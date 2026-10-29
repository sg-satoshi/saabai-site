/**
 * Route logic for Blueprint review and deliver (#363), with injected deps so the
 * guards, streaming and send-once rules are tested at route level.
 *
 * - Client download: guard first, then the file is fetched server-side and
 *   streamed back. The Blob URL never reaches the client (no redirect, no header).
 * - Admin PATCH: requireAdmin, review (only when review is required for this
 *   buyer), deliver (review gate), and the "ready" email sent at most once per
 *   version, claimed with a Redis SET NX so a double-deliver race sends once.
 */
import type { AuditEngagement, AuditReport } from "../audit-types";
import { canDeliver, markReviewed, reviewRequired } from "./deliver";

type Json = Record<string, unknown>;
const json = (b: Json, status = 200) => Response.json(b, { status });
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type DownloadGuard =
  | { ok: true; engagement: AuditEngagement; refresh: (res: Response) => Response }
  | { ok: false; response: Response };

export type DownloadDeps = {
  guard: (req: Request, id: string) => Promise<DownloadGuard>;
  fetchFile: (url: string) => Promise<Response>;
};

export async function handleReportDownload(req: Request, id: string, reportId: string, deps: DownloadDeps): Promise<Response> {
  const g = await deps.guard(req, id);
  if (!g.ok) return g.response;
  const r = (g.engagement.reports ?? []).find((x) => x.id === reportId && x.deliveredAt);
  if (!r) return json({ error: "Not found" }, 404);
  let upstream: Response;
  try {
    upstream = await deps.fetchFile(r.url);
  } catch {
    return json({ error: "Download unavailable, please try again" }, 502);
  }
  if (!upstream.ok || !upstream.body) return json({ error: "Download unavailable, please try again" }, 502);
  const safeName = `Saabai-Blueprint-v${r.version}.docx`;
  const headers = new Headers({
    "Content-Type": DOCX,
    "Content-Disposition": `attachment; filename="${safeName}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  return g.refresh(new Response(upstream.body, { status: 200, headers }));
}

export type PatchDeps = {
  requireAdmin: () => Promise<{ ok: true } | { ok: false; response: Response }>;
  getEngagement: (id: string) => Promise<AuditEngagement | null>;
  updateEngagement: (id: string, patch: Partial<AuditEngagement>) => Promise<unknown>;
  logEvent: (id: string, type: "report_reviewed" | "report_delivered", summary: string, detail?: string) => Promise<AuditEngagement | null>;
  afterDelivery: (e: AuditEngagement, delivered: AuditReport) => Promise<void>;
  /** Returns true for exactly one caller per (engagement, report). */
  claimSendOnce: (key: string) => Promise<boolean>;
  sendReady: (e: AuditEngagement) => Promise<void>;
  defer: (fn: () => Promise<void>) => void;
  env?: NodeJS.ProcessEnv;
  now?: () => string;
};

export async function handleReportPatch(req: Request, id: string, deps: PatchDeps): Promise<Response> {
  const auth = await deps.requireAdmin();
  if (!auth.ok) return auth.response;
  const env = deps.env ?? process.env;
  const now = deps.now ?? (() => new Date().toISOString());

  const engagement = await deps.getEngagement(id);
  if (!engagement) return json({ error: "Not found" }, 404);

  let body: { reportId?: unknown; action?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const reportId = typeof body.reportId === "string" ? body.reportId : "";
  const reports = engagement.reports ?? [];
  if (!reports.some((r) => r.id === reportId)) return json({ error: "Report not found" }, 404);

  if (body.action === "review") {
    // Review only means something where it gates delivery. Flag off: nothing is written.
    if (!reviewRequired(engagement, env)) return json({ error: "Review is only used for Blueprint portal buyers." }, 409);
    const reviewed = markReviewed(reports, reportId, now())!;
    const r = reviewed.find((x) => x.id === reportId)!;
    await deps.updateEngagement(id, { reports: reviewed });
    const upd = await deps.logEvent(id, "report_reviewed", `Report v${r.version} reviewed`, r.filename);
    return json({ engagement: upd });
  }

  const check = canDeliver(engagement, reportId, env);
  if (!check.ok) return json({ error: check.error }, check.status);

  const wasDelivered = Boolean(reports.find((r) => r.id === reportId)?.deliveredAt);
  const at = now();
  const next = reports.map((r) => (r.id === reportId ? { ...r, deliveredAt: at } : r));
  const delivered = next.find((r) => r.id === reportId)!;
  await deps.updateEngagement(id, {
    reports: next,
    status: "delivered",
    // First delivery starts the credit clock. Later versions do not move it.
    ...(engagement.deliveredAt ? {} : { deliveredAt: at }),
  });
  const updated = await deps.logEvent(id, "report_delivered", `Report v${delivered.version} delivered to client`, delivered.filename);
  await deps.afterDelivery(engagement, delivered);

  // Portal buyers get a "ready" email once per version (each new version emails again, by design).
  if (!wasDelivered && reviewRequired(engagement, env)) {
    deps.defer(async () => {
      try {
        if (!(await deps.claimSendOnce(`bp:report-ready:${id}:${reportId}`))) return;
        await deps.sendReady(engagement);
      } catch (err) {
        console.error("[blueprint-portal] report ready email failed", err instanceof Error ? err.message : err);
      }
    });
  }
  return json({ engagement: updated });
}
