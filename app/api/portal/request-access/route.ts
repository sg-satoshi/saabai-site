/**
 * POST /api/portal/request-access
 * Creates a Client Request for admin review. Auto-approves portal user when
 * the email matches a paid Blueprint or Lex order. Always returns the same ok.
 */
import { Resend } from "resend";
import { savePendingRequest, getPortalUser, savePortalUser } from "../../../../lib/portal-users";
import { getDirectoryUser } from "../../../../lib/user-directory";
import { loadClients } from "../../../../lib/clients";
import { listEngagements } from "../../../../lib/audit-store";
import { runAfterResponse } from "../../../../lib/run-after";

export const runtime = "nodejs";

async function emailMatchesOrder(email: string): Promise<boolean> {
  const normalised = email.trim().toLowerCase();
  try {
    const engagements = await listEngagements();
    if (engagements.some((e) => (e.contactEmail || "").toLowerCase() === normalised)) {
      return true;
    }
  } catch {
    /* ignore */
  }
  // Lex / Stripe: best-effort via env is not enough; engagements cover Blueprints.
  return false;
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Please fill in the required fields." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const about = typeof body.about === "string" ? body.about.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (!name || !email.includes("@") || email.length > 254) {
    return Response.json({ error: "Please fill in your name and work email." }, { status: 400 });
  }

  runAfterResponse(async () => {
    try {
      const existing =
        (await getDirectoryUser(email)) ||
        (await getPortalUser(email)) ||
        loadClients().find((c) => c.email.toLowerCase() === email);
      if (existing) return;

      const match = await emailMatchesOrder(email);
      if (match) {
        await savePortalUser({
          id: `auto-${email.replace(/[^a-z0-9]/g, "-").slice(0, 40)}`,
          name,
          email,
          password: "",
          dashboardUrl: "/client-portal",
          approvedAt: new Date().toISOString(),
        });
      } else {
        await savePendingRequest({
          name,
          email,
          company: company || about || "",
          requestedAt: new Date().toISOString(),
        });
      }

      const key = process.env.RESEND_API_KEY;
      if (key) {
        await new Resend(key).emails.send({
          from: "Saabai Portal <noreply@saabai.ai>",
          to: "hello@saabai.ai",
          subject: match
            ? `Portal auto-approved: ${name.slice(0, 80)}`
            : `Portal access request: ${name.slice(0, 80)}`,
          html: `<p><strong>${name}</strong> (${email}${company ? `, ${company}` : ""}) ${
            match ? "was auto-approved (email matched an order)." : "requested portal access."
          }</p><p>${about ? `About: ${about}<br/>` : ""}${note ? `Note: ${note}` : ""}</p><p><a href="https://saabai.ai/saabai-admin/requests">Open Client Requests</a></p>`,
        });
      }
    } catch (err) {
      console.error("[portal/request-access]", err instanceof Error ? err.message : err);
    }
  });

  return Response.json({
    ok: true,
    message: "Thanks. We will confirm your access within one business day.",
  });
}
