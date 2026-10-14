import { suppress, verifyUnsub } from "@/lib/growth/consent";

export const runtime = "nodejs";

// One-click (RFC 8058) and form unsubscribe. Token is an HMAC of the email.
export async function POST(req: Request) {
  const url = new URL(req.url);
  let e = url.searchParams.get("e") || "", t = url.searchParams.get("t") || "";
  if (!e || !t) {
    const ct = req.headers.get("content-type") || "";
    const b = ct.includes("json") ? await req.json().catch(() => ({})) : Object.fromEntries((await req.formData().catch(() => new FormData())).entries());
    e = String(b.e || ""); t = String(b.t || "");
  }
  if (!verifyUnsub(e, t)) return Response.json({ error: "This link isn't valid" }, { status: 400 });
  await suppress(e, "all");
  return Response.json({ ok: true });
}
