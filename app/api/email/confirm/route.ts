import { confirmByToken } from "../../../../lib/email/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: Request) {
  let token = "";
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("json")) {
    const body = await req.json().catch(() => ({})) as { t?: unknown };
    token = String(body.t || "");
  } else {
    const form = await req.formData().catch(() => null);
    token = String(form?.get("t") || "");
  }
  try {
    const result = await confirmByToken(token);
    const status = result.status === "invalid" ? 400 : 200;
    return Response.json({ ok: result.status === "confirmed" || result.status === "already", ...result }, { status, headers: NO_STORE });
  } catch (e) {
    console.error("email confirm failed:", e instanceof Error ? e.message : "error");
    return Response.json({ ok: false, status: "missing" }, { status: 500, headers: NO_STORE });
  }
}
