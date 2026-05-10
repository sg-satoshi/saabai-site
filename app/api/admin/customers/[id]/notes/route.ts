/**
 * GET /api/admin/customers/{id}/notes
 * POST /api/admin/customers/{id}/notes
 * Admin-only — requires valid saabai_session cookie.
 */

import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "../../../../../../lib/auth";
import { getCustomerNotes, addCustomerNote, deleteCustomerNote } from "../../../../../../lib/customer-notes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ID = process.env.SAABAI_ADMIN_ID ?? "saabai";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const session = await verifySessionToken(token);
  if (!session || session.clientId !== ADMIN_ID) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const notes = await getCustomerNotes(id);
  return Response.json({ notes });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const session = await verifySessionToken(token);
  if (!session || session.clientId !== ADMIN_ID) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json()) as { text?: string };
  const text = body.text?.trim();

  if (!text || text.length > 2000) {
    return Response.json({ error: "Invalid note text" }, { status: 400 });
  }

  const note = await addCustomerNote(id, text, "Admin");
  if (!note) return Response.json({ error: "Failed to save note" }, { status: 500 });

  return Response.json({ note });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const session = await verifySessionToken(token);
  if (!session || session.clientId !== ADMIN_ID) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json()) as { noteId?: string };
  const noteId = body.noteId;

  if (!noteId) return Response.json({ error: "Missing noteId" }, { status: 400 });

  const ok = await deleteCustomerNote(id, noteId);
  return Response.json({ success: ok });
}
