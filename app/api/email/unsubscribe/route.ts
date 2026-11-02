import { unsubscribeByToken } from "../../../../lib/email/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

async function tokenFrom(req: Request): Promise<string> {
  const url = new URL(req.url);
  const query = url.searchParams.get("t");
  if (query) return query;
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("json")) {
    const body = await req.json().catch(() => ({})) as { t?: unknown };
    return String(body.t || "");
  }
  const form = await req.formData().catch(() => null);
  return String(form?.get("t") || "");
}

/** RFC 8058 one-click is POST. GET does not unsubscribe (link prefetch). */
export async function GET() {
  return Response.json({ error: "Use the unsubscribe link in the email" }, { status: 405, headers: NO_STORE });
}

export async function POST(req: Request) {
  try {
    const result = await unsubscribeByToken(await tokenFrom(req));
    if (!result.ok) return Response.json(result, { status: 400, headers: NO_STORE });
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch (e) {
    console.error("email unsubscribe failed:", e instanceof Error ? e.message : "error");
    return Response.json({ error: "Couldn't unsubscribe. Try the link again." }, { status: 500, headers: NO_STORE });
  }
}
