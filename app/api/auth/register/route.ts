import { NextRequest } from "next/server";
import { Resend } from "resend";
import { savePendingRequest, getPortalUser } from "../../../../lib/portal-users";
import { loadClients, findClientByCredentials } from "../../../../lib/clients";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const name     = formData.get("name")?.toString().trim()    ?? "";
  const email    = formData.get("email")?.toString().trim()   ?? "";
  const company  = formData.get("company")?.toString().trim() ?? "";
  const redirect = formData.get("redirect")?.toString()       ?? "";

  const failUrl = new URL("/login", req.url);
  if (redirect) failUrl.searchParams.set("redirect", redirect);

  if (!name || !email) {
    failUrl.searchParams.set("reg_error", "missing");
    return Response.redirect(failUrl.toString(), 303);
  }

  // Don't re-register someone already approved
  const existing = await getPortalUser(email);
  if (existing) {
    failUrl.searchParams.set("reg_error", "exists");
    return Response.redirect(failUrl.toString(), 303);
  }

  // Also block if they already have an env-var account
  const envClient = findClientByCredentials(loadClients(), email, "");
  if (envClient) {
    failUrl.searchParams.set("reg_error", "exists");
    return Response.redirect(failUrl.toString(), 303);
  }

  await savePendingRequest({ name, email, company, requestedAt: new Date().toISOString() });

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: "Saabai Portal <noreply@saabai.ai>",
      to:   "hello@saabai.ai",
      subject: `Portal access request: ${name}`,
      html: `<p><strong>${name}</strong> (<a href="mailto:${email}">${email}</a>${company ? `, ${company}` : ""}) has requested portal access.</p><p><a href="https://saabai.ai/saabai-admin">Review and approve in admin &rarr;</a></p>`,
    }).catch(() => {});
  }

  const doneUrl = new URL("/login", req.url);
  doneUrl.searchParams.set("registered", "1");
  if (redirect) doneUrl.searchParams.set("redirect", redirect);
  return Response.redirect(doneUrl.toString(), 303);
}
