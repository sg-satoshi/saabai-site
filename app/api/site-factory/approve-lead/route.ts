import { approveWholesaleLead } from "../../../../lib/wholesale-approve";

// Node runtime: password hashing uses Node's crypto.scrypt.
// Saabai admin only (proxy.ts gates /api/site-factory/* to the admin session).
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await approveWholesaleLead(body ?? {});
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ success: true, message: result.message });
  } catch (error) {
    console.error("Approve lead error:", error);
    return Response.json({ error: "Failed to approve lead" }, { status: 500 });
  }
}
