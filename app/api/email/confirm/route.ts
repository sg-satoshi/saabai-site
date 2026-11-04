import { confirmByToken } from "../../../../lib/email/ops";
import { requestEvidence } from "../../../../lib/consent-evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: Request) {
  let token = "";
  const ct = req.headers.get("content-type") || "";
  const isForm = !ct.includes("json");
  if (!isForm) {
    const body = await req.json().catch(() => ({})) as { t?: unknown };
    token = String(body.t || "");
  } else {
    const form = await req.formData().catch(() => null);
    token = String(form?.get("t") || "");
  }
  try {
    const result = await confirmByToken(token, requestEvidence(req));
    if (isForm) return backToPage(req, result.status);
    const status = result.status === "invalid" ? 400 : 200;
    return Response.json({ ok: result.status === "confirmed" || result.status === "already", ...result }, { status, headers: NO_STORE });
  } catch (e) {
    console.error("email confirm failed:", e instanceof Error ? e.message : "error");
    if (isForm) return backToPage(req, "retry", token);
    return Response.json({ ok: false, status: "missing" }, { status: 500, headers: NO_STORE });
  }
}

/** No-JS form fallback: send the person back to the page (never raw JSON). The ?s= value only picks copy. */
function backToPage(req: Request, status: string, token = "") {
  const s = status === "confirmed" || status === "already" || status === "unsubscribed" || status === "retry" ? status : "bad";
  return new Response(null, { status: 303, headers: { ...NO_STORE, Location: new URL(s === "retry" && token ? `/email/confirm?s=retry&t=${encodeURIComponent(token)}` : `/email/confirm?s=${s}`, req.url).toString() } });
}
