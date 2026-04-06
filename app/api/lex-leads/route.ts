export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: {
    name?: string; email?: string; matterType?: string;
    jurisdiction?: string; sessionId?: string; conversationSnippet?: string;
  };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { name, email, matterType, jurisdiction, sessionId, conversationSnippet } = body;
  if (!name || !email) return Response.json({ error: "name and email required" }, { status: 400 });

  const resendKey = (process.env.RESEND_API_KEY ?? "").trim().replace(/\n/g, "");

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px;">
      <h2 style="color:#0d1b2a;margin:0 0 4px;">New Lex Lead — Tributum Law</h2>
      <p style="color:#6b7280;margin:0 0 24px;font-size:13px;">Via Lex AI widget</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;font-size:13px;color:#374151;font-weight:600;width:140px;">Name</td><td style="padding:8px 0;font-size:13px;color:#111827;">${name}</td></tr>
        <tr><td style="padding:8px 0;font-size:13px;color:#374151;font-weight:600;">Email</td><td style="padding:8px 0;font-size:13px;color:#111827;"><a href="mailto:${email}">${email}</a></td></tr>
        <tr><td style="padding:8px 0;font-size:13px;color:#374151;font-weight:600;">Matter Type</td><td style="padding:8px 0;font-size:13px;color:#111827;">${matterType || "Not specified"}</td></tr>
        <tr><td style="padding:8px 0;font-size:13px;color:#374151;font-weight:600;">Jurisdiction</td><td style="padding:8px 0;font-size:13px;color:#111827;">${jurisdiction || "Australia"}</td></tr>
        <tr><td style="padding:8px 0;font-size:13px;color:#374151;font-weight:600;">Session ID</td><td style="padding:8px 0;font-size:13px;color:#9ca3af;font-family:monospace;">${sessionId || "—"}</td></tr>
      </table>
      ${conversationSnippet ? `
        <div style="margin-top:20px;padding:16px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:1px;text-transform:uppercase;">Conversation Snippet</p>
          <pre style="margin:0;font-size:12px;color:#374151;white-space:pre-wrap;font-family:inherit;">${conversationSnippet}</pre>
        </div>
      ` : ""}
    </div>
  `;

  // Notify Tributum + Saabai
  await Promise.allSettled([
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Lex at Tributum <hello@saabai.ai>",
        to: ["hello@saabai.ai"],
        subject: `New Lex lead: ${name} — ${matterType || "Legal enquiry"}`,
        html,
      }),
    }),
  ]);

  return Response.json({ ok: true });
}
