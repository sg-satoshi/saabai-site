import { type NextRequest } from "next/server";
import QRCode from "qrcode";
import { COOKIE_NAME, verifySessionToken, isStaffSession } from "../../../../lib/auth";
import { startSetup, confirmSetup, twoFactorStatus, otpauthUri } from "../../../../lib/admin-2fa";

export const runtime = "nodejs";

async function adminId(req: NextRequest): Promise<string | null> {
  const t = req.cookies.get(COOKIE_NAME)?.value;
  const s = t ? await verifySessionToken(t) : null;
  return s && (await isStaffSession(s.clientId)) ? s.clientId : null;
}

/** GET: current 2FA status. */
export async function GET(req: NextRequest) {
  const id = await adminId(req);
  if (!id) return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json(await twoFactorStatus(id), { headers: { "Cache-Control": "no-store" } });
}

/** POST {action:"start"} returns QR + secret; {action:"confirm", code} enables 2FA and returns backup codes once. */
export async function POST(req: NextRequest) {
  const id = await adminId(req);
  if (!id) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { action?: string; code?: string };

  if (body.action === "start") {
    if ((await twoFactorStatus(id)).enabled) return Response.json({ error: "2FA is already on." }, { status: 409 });
    const secret = await startSetup(id);
    const uri = otpauthUri(secret, id);
    const qr = await QRCode.toDataURL(uri, { margin: 1, width: 240 });
    return Response.json({ secret, uri, qr }, { headers: { "Cache-Control": "no-store" } });
  }
  if (body.action === "confirm") {
    const codes = await confirmSetup(id, body.code ?? "");
    if (!codes) return Response.json({ error: "That code didn't match. Check the time on your phone and try the newest code." }, { status: 400 });
    return Response.json({ ok: true, backupCodes: codes }, { headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
