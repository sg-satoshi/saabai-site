import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/site-scan/admin-auth";
import { turnstileSiteKey } from "@/lib/site-scan/turnstile";
import { scannerPublic } from "@/lib/site-scan/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Is the website scan step available to this visitor? Off for the public unless the flag is on; always on for admins. */
export async function GET() {
  const enabled = (await scannerPublic()) || (await isAdminRequest());
  const admin = await isAdminRequest();
  return NextResponse.json({ enabled, turnstileSiteKey: enabled && !admin ? turnstileSiteKey() : null }, { headers: { "Cache-Control": "no-store" } });
}
