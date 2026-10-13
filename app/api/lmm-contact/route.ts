import { Resend } from "resend";

export const runtime = "edge";

const TO = ["nick@lifestylemoneymanagement.com.au"];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, string | undefined>;
    const f = (k: string, max = 200) => (body[k] || "").toString().trim().slice(0, max);
    const name = f("name"), email = f("email"), phone = f("phone", 50), stage = f("stage"), message = f("message", 5000);
    if (f("website")) return Response.json({ ok: true }); // honeypot
    if (!name || !email || !message) return Response.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Response.json({ ok: false, error: "Invalid email" }, { status: 400 });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return Response.json({ ok: false, error: "Email not configured" }, { status: 500 });

    const ts = new Date().toLocaleString("en-AU", { timeZone: "Australia/Brisbane", dateStyle: "medium", timeStyle: "short" });
    const row = (k: string, v: string) =>
      v ? `<tr><td style="padding:8px 0;color:#5C6670;font-size:13px;width:140px;vertical-align:top">${k}</td><td style="padding:8px 0;color:#14302A;font-size:14px;font-weight:600">${v}</td></tr>` : "";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F3F5F4;margin:0;padding:32px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
<div style="background:#0E5C52;padding:24px 32px"><h1 style="color:#fff;font-size:20px;margin:0">New website enquiry</h1>
<p style="color:rgba(255,255,255,0.7);font-size:13px;margin:4px 0 0">Received ${ts} AEST via lifestylemoneymanagement.com.au</p></div>
<div style="padding:32px"><table style="width:100%;border-collapse:collapse">
${row("Name", esc(name))}${row("Email", `<a href="mailto:${esc(email)}" style="color:#0E5C52">${esc(email)}</a>`)}${row("Phone", esc(phone))}${row("Investment stage", esc(stage))}
</table><div style="margin-top:24px;background:#F3F5F4;border-radius:8px;padding:20px">
<p style="color:#5C6670;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 8px">What they're trying to achieve</p>
<p style="color:#14302A;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap">${esc(message)}</p></div></div></div></body></html>`;

    const { data, error } = await new Resend(apiKey).emails.send({
      from: "Lifestyle Money Management <noreply@saabai.ai>",
      to: TO,
      replyTo: email,
      subject: `New website enquiry: ${name}`,
      html,
    });
    if (error) {
      console.error("[lmm-contact]", error);
      return Response.json({ ok: false, error: "Failed to send" }, { status: 502 });
    }
    return Response.json({ ok: true, id: data?.id });
  } catch (err) {
    console.error("[lmm-contact]", err);
    return Response.json({ ok: false, error: "Failed to send" }, { status: 500 });
  }
}
