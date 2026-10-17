import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { runScan, noWebsiteReport } from "@/lib/site-scan/scan";
import { ScanUrlError, parseTarget } from "@/lib/site-scan/ssrf";
import { cleanInput } from "@/lib/site-scan/input";
import { isAdminRequest } from "@/lib/site-scan/admin-auth";
import { cachedReport, limitReason, saveReport, scannerPublic } from "@/lib/site-scan/store";
import { recordEvent } from "@/lib/growth/events";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

/** POST { url?, noWebsite?, name, industry, suburb, goal, email? }. Public only when the flag is on; admins always. */
export async function POST(req: NextRequest) {
  const admin = await isAdminRequest();
  if (!admin && !(await scannerPublic())) return NextResponse.json({ error: "Not available" }, { status: 404 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const input = cleanInput(body, admin);
  const email = typeof body.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ? body.email.trim().slice(0, 200) : "";

  if (!admin) { const why = await limitReason(req); if (why) return NextResponse.json({ error: why }, { status: 429 }); }

  const noSite = body.noWebsite === true || !(typeof body.url === "string" && body.url.trim());
  let report;
  if (noSite) {
    report = noWebsiteReport({ id: randomUUID(), input });
  } else {
    let domain = "";
    try { domain = parseTarget(String(body.url)).hostname.replace(/^www\./, ""); } catch (e) { return NextResponse.json({ error: e instanceof ScanUrlError ? e.message : "Invalid address" }, { status: 400 }); }
    const hit = !admin && !input.gbp ? await cachedReport(domain) : null;
    try { report = hit ?? (await runScan(String(body.url), input)); }
    catch (e) { return NextResponse.json({ error: e instanceof ScanUrlError ? e.message : "The scan failed. Please try again." }, { status: e instanceof ScanUrlError ? 400 : 500 }); }
    if (!hit) await saveReport(report, { history: admin, cache: !admin && report.mode === "scan" });
  }
  if (noSite) await saveReport(report);
  if (email && !admin) {
    try { await recordEvent({ contactId: email, type: "note", meta: { kind: "site_scanned", domain: report.domain || null, score: report.overall, mode: report.mode, industry: input.industry, suburb: input.suburb, goal: input.goal } }); } catch { /* never block */ }
  }
  return NextResponse.json({ report }, { headers: { "Cache-Control": "no-store" } });
}
