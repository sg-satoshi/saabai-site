import { NextRequest, NextResponse } from "next/server";
import { runScan } from "@/lib/site-scan/scan";
import { cleanInput } from "@/lib/site-scan/input";
import { ScanUrlError } from "@/lib/site-scan/ssrf";
import { isAdminRequest } from "@/lib/site-scan/admin-auth";
import { allDomains, getReport, history, saveReport, scannerPublic, setScannerPublic } from "@/lib/site-scan/store";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { listSites } from "@/lib/site-registry";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function factoryTargets(): Promise<{ slug: string; name: string; url: string }[]> {
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
  return out;
}

/** Admin only. Read-only scans: nothing is changed on any scanned site. */
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const action = String(b.action ?? "");
  if (action === "scan") {
    try {
      const rep = await runScan(String(b.url ?? ""), cleanInput(b, true));
      await saveReport(rep, { history: true });
      return NextResponse.json({ report: rep });
    } catch (e) { return NextResponse.json({ error: e instanceof ScanUrlError ? e.message : "Scan failed" }, { status: 400 }); }
  }
  if (action === "factory") {
    const targets = await factoryTargets();
    const rows: { slug: string; name: string; url: string; report?: Awaited<ReturnType<typeof runScan>>; error?: string }[] = [];
    let i = 0;
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (i < targets.length) {
        const t = targets[i++];
        try { const rep = await runScan(t.url, { name: t.name }); await saveReport(rep, { history: true }); rows.push({ ...t, report: rep }); }
        catch (e) { rows.push({ ...t, error: e instanceof Error ? e.message : "failed" }); }
      }
    }));
    rows.sort((a, c) => (a.report?.overall ?? 999) - (c.report?.overall ?? 999));
    return NextResponse.json({ rows });
  }
  if (action === "history") return NextResponse.json({ points: await history(String(b.domain ?? "")) });
  if (action === "domains") return NextResponse.json({ domains: await allDomains(), publicEnabled: await scannerPublic() });
  if (action === "report") { const r = await getReport(String(b.id ?? "")); return r ? NextResponse.json({ report: r }) : NextResponse.json({ error: "Not found" }, { status: 404 }); }
  if (action === "flag") return NextResponse.json({ ok: await setScannerPublic(b.on === true) });
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
