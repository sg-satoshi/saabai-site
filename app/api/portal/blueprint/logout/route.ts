import { NextResponse } from "next/server";
import { BP_COOKIE, sameOrigin } from "../../../../../lib/portal-blueprint/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(BP_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
