import { NextRequest, NextResponse } from "next/server";
import { runScan } from "@/lib/site-scan/scan";
import { cleanInput } from "@/lib/site-scan/input";
import { ScanUrlError } from "@/lib/site-scan/ssrf";
import { isAdminRequest } from "@/lib/site-scan/admin-auth";
import type { ScanEvidence } from "@/lib/site-scan/evidence";
import { normaliseFalsePositive } from "@/lib/site-scan/flags";
import { allDomains, cleanupHistory, getReport, history, listFalsePositives, saveEvidence, saveFalsePositive, saveReport, scannerPublic, setScannerPublic } from "@/lib/site-scan/store";
import { dedupeTargets, domainKey, type ScanTarget } from "@/lib/site-scan/targets";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { listSites } from "@/lib/site-registry";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function factoryTargets(): Promise<ScanTarget[]> {
  const sites = await listSites();
  const out: { slug: string; name: string; url: string }[] = [];
  for (const s of sites) {
    if (s.status === "archived" || s.status === "draft") continue;
    const url = s.externalUrl || (s.domains && s.domains[0] ? `https://${s.domains[0]}` : s.url);
    if (url && /^https?:\/\//i.test(url)) out.push({ slug: s.slug, name: s.name || s.slug, url });
  }
  // Sites that live outside the Redis registry: custom-domain code sites and legacy public/clients sites.
  const have = new Set(out.map((o) => o.slug));
  if (!have.has("lmm-site")) out.push({ slug: "lmm-site", name: "Lifestyle Money Management", url: "https://lifestylemoneymanagement.com.au" });
  try {
    const dir = path.join(process.cwd(), "public", "clients");
    if (existsSync(dir)) for (const d of readdirSync(dir, { withFileTypes: true })) if (d.isDirectory() && /^[a-z0-9-]+$/i.test(d.name) && !have.has(d.name) && d.name !== "lmm-site") out.push({ slug: d.name, name: d.name, url: `https://www.saabai.ai/sites/${d.name}/` });
  } catch { /* optional */ }
  // One row per site: normalised URLs (decoded, slugified, lowercase host, trailing slash), invalid ones dropped.
  return dedupeTargets(out);
}

async function scanAndStore(url: string, input: Parameters<typeof runScan>[1]) {
  let evidence: ScanEvidence | undefined;
  const rep = await runScan(url, input, { capture: (e) => { evidence = e; } });
  await saveReport(rep, { history: true });
  if (evidence) await saveEvidence(evidence);
  return rep;
}

/** Admin only. Read-only scans: nothing is changed on any scanned site. */
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const action = String(b.action ?? "");
  if (action === "scan") {
    try {
      const rep = await scanAndStore(String(b.url ?? ""), cleanInput(b, true));
      return NextResponse.json({ report: rep });
    } catch (e) { return NextResponse.json({ error: e instanceof ScanUrlError ? e.message : "Scan failed" }, { status: 400 }); }
  }
  if (action === "factory") {
    const targets = await factoryTargets();
    const rows: (ScanTarget & { report?: Awaited<ReturnType<typeof runScan>>; error?: string })[] = [];
    let i = 0;
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (i < targets.length) {
        const t = targets[i++];
        try { const rep = await scanAndStore(t.url, { name: t.name }); rows.push({ ...t, report: rep }); }
        catch (e) { rows.push({ ...t, error: e instanceof Error ? e.message : "failed" }); }
      }
    }));
    rows.sort((a, c) => (a.report?.overall ?? 999) - (c.report?.overall ?? 999));
    return NextResponse.json({ rows });
  }
  if (action === "cleanup") {
    const known = new Set((await factoryTargets()).map((t) => domainKey(t.url)).filter((k): k is string => !!k));
    return NextResponse.json(await cleanupHistory(b.apply === true, known));
  }
  if (action === "history") return NextResponse.json({ points: await history(String(b.domain ?? "")) });
  if (action === "domains") return NextResponse.json({ domains: await allDomains(), publicEnabled: await scannerPublic() });
  if (action === "report") { const r = await getReport(String(b.id ?? "")); return r ? NextResponse.json({ report: r }) : NextResponse.json({ error: "Not found" }, { status: 404 }); }
  if (action === "flag") return NextResponse.json({ ok: await setScannerPublic(b.on === true) });
  if (action === "flags") return NextResponse.json({ flags: await listFalsePositives(String(b.domain ?? "")) });
  if (action === "flag-fp") {
    const report = await getReport(String(b.reportId ?? ""));
    if (!report) return NextResponse.json({ error: "Scan not found." }, { status: 404 });
    const norm = normaliseFalsePositive({ report, checkId: b.checkId, note: b.note, source: "panel" });
    if (!norm.ok) return NextResponse.json({ error: norm.error }, { status: 400 });
    if (!(await saveFalsePositive(norm.flag))) return NextResponse.json({ error: "Could not store the flag." }, { status: 503 });
    return NextResponse.json({ ok: true, flag: norm.flag });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
