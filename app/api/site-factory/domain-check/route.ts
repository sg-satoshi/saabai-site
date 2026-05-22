import { NextRequest } from "next/server";

export const runtime = "nodejs";

const VERCEL_CNAME = "cname.vercel-dns.com";
const VERCEL_IP = "76.76.21.21";

async function dnsResolve(name: string, type: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
      { headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json() as { Answer?: Array<{ data: string }> };
    return (data.Answer || []).map(r => r.data.replace(/\.$/, "").toLowerCase());
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain");
  if (!domain) return Response.json({ error: "domain required" }, { status: 400 });

  const cleanDomain = domain.trim().toLowerCase().replace(/^www\./, "");

  const [wwwCname, apexA, apexCname] = await Promise.all([
    dnsResolve(`www.${cleanDomain}`, "CNAME"),
    dnsResolve(cleanDomain, "A"),
    dnsResolve(cleanDomain, "CNAME"),
  ]);

  const wwwOk = wwwCname.includes(VERCEL_CNAME);
  const apexOk = apexA.includes(VERCEL_IP) || apexCname.includes(VERCEL_CNAME);
  const live = wwwOk || apexOk;

  return Response.json({
    domain: cleanDomain,
    live,
    www: { ok: wwwOk, cname: wwwCname[0] || null },
    apex: { ok: apexOk, a: apexA[0] || null, cname: apexCname[0] || null },
  });
}
