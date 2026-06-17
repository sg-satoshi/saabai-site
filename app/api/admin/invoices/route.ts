/**
 * GET/POST /api/admin/invoices
 * List all invoices or create a new one.
 * Admin-only — requires valid saabai_session cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "../../../../lib/auth";
import { listInvoices, createInvoice } from "../../../../lib/invoice-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = await verifySessionToken(token);
  return session?.clientId === ADMIN_ID;
}

export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const invoices = await listInvoices();
  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const invoice = await createInvoice(data);
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[invoices POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
