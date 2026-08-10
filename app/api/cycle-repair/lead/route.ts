import { Resend } from "resend";

export const runtime = "edge";

const OWNER_EMAIL = "stuscyclerepairs@gmail.com";
// From-address is env-driven so we can flip to noreply@stuscyclerepairs.com once
// the domain is verified in Resend, without a code change.
const FROM_EMAIL = process.env.CYCLE_FROM_EMAIL || "Stu's Cycle Repairs <noreply@saabai.ai>";
const LOGO_URL = "https://stuscyclerepairs.com/sites/cycle-repair/stus-logo-email.png";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type ContactBody = {
  formType: "contact";
  name?: string;
  email?: string;
  phone?: string;
  suburb?: string;
  message?: string;
};

type QuoteItem = { label: string; price: string };

type QuoteBody = {
  formType: "quote";
  name?: string;
  email?: string;
  phone?: string;
  suburb?: string;
  bike?: string;
  notes?: string;
  tier?: string;
  tierPrice?: string;
  items?: QuoteItem[];
  approxTotal?: string;
};

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;font-size:12px;color:#a1a1aa;white-space:nowrap;width:110px;vertical-align:top;">${escapeHtml(
    label,
  )}</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#18181b;">${escapeHtml(
    value,
  )}</td></tr>`;
}

function wrapEmail(title: string, inner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:32px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#1a1310;padding:24px 32px;text-align:center;">
      <img src="${LOGO_URL}" alt="Stu's Cycle Repairs" width="240" style="width:240px;max-width:70%;height:auto;display:inline-block;" />
    </div>
    <div style="background:#d64525;height:4px;line-height:4px;font-size:0;">&nbsp;</div>
    <div style="padding:28px 32px;">
      <h1 style="margin:0 0 20px;color:#18181b;font-size:20px;font-weight:700;">${escapeHtml(title)}</h1>
      ${inner}
    </div>
    <div style="padding:16px 32px;border-top:1px solid #f0f0f0;background:#fafafa;">
      <p style="margin:0;font-size:11px;color:#a1a1aa;">Stu's Cycle Repairs · Mobile Bicycle Mechanic · Gold Coast</p>
    </div>
  </div>
</body>
</html>`;
}

async function sendEmail(html: string, subject: string, replyTo: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[cycle-repair-lead] no RESEND_API_KEY, skipping email:", subject);
    return false;
  }
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: OWNER_EMAIL,
      replyTo: replyTo || undefined,
      subject,
      html,
    });
    if (error) {
      console.error("[cycle-repair-lead] resend error:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[cycle-repair-lead] email error:", e);
    return false;
  }
}

async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_CYCLE_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CYCLE_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    if (!res.ok) {
      console.error("[cycle-repair-lead] telegram failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[cycle-repair-lead] telegram error:", e);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ContactBody | QuoteBody;

    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const phone = (body.phone || "").trim();
    const suburb = (body.suburb || "").trim();

    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return Response.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    let subject: string;
    let inner: string;
    let title: string;
    let telegramText: string;

    if (body.formType === "quote") {
      const bike = (body.bike || "").trim();
      const notes = (body.notes || "").trim();
      const tier = (body.tier || "").trim();
      const tierPrice = (body.tierPrice || "").trim();
      const items = Array.isArray(body.items) ? body.items : [];
      const approxTotal = (body.approxTotal || "").trim();

      if (!name || !phone) {
        return Response.json(
          { ok: false, error: "Name and phone required" },
          { status: 400 },
        );
      }
      if (!tier && items.length === 0) {
        return Response.json(
          { ok: false, error: "Select a tier or at least one job" },
          { status: 400 },
        );
      }

      title = "New Service Request";
      subject = `Service request${tier ? `: ${tier}` : ""} from ${name}`;

      const jobRows: string[] = [];
      if (tier) {
        jobRows.push(
          `<tr><td style="padding:6px 0;font-size:13px;font-weight:600;color:#18181b;">${escapeHtml(
            tier,
          )} Service</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#d64525;text-align:right;">${escapeHtml(
            tierPrice,
          )}</td></tr>`,
        );
      }
      items.forEach((it) => {
        jobRows.push(
          `<tr><td style="padding:6px 0;font-size:13px;color:#3f3f46;">${escapeHtml(
            it.label,
          )}</td><td style="padding:6px 0;font-size:13px;color:#d64525;text-align:right;">${escapeHtml(
            it.price,
          )}</td></tr>`,
        );
      });

      inner = `
        <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#d64525;">Job sheet</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">${jobRows.join("")}</table>
        <p style="margin:8px 0 0;font-size:15px;font-weight:700;color:#18181b;text-align:right;">Approximate total: ${escapeHtml(
          approxTotal,
        )}</p>
        <p style="margin:2px 0 0;font-size:11px;color:#71717a;text-align:right;">Labour estimate only. Parts are quoted separately.</p>
        <p style="margin:24px 0 4px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#d64525;">Customer</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${row("Name", name)}
          ${row("Phone", phone)}
          ${row("Email", email || "not supplied")}
          ${row("Suburb", suburb || "not supplied")}
          ${row("Bike", bike || "not supplied")}
        </table>
        <p style="margin:20px 0 4px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#d64525;">Notes</p>
        <p style="margin:0;font-size:13px;color:#3f3f46;line-height:1.6;white-space:pre-wrap;">${escapeHtml(
          notes || "none",
        )}</p>`;

      const tgJobs = [
        tier ? `• <b>${escapeHtml(tier)} Service</b> ${escapeHtml(tierPrice)}` : "",
        ...items.map((it) => `• ${escapeHtml(it.label)} ${escapeHtml(it.price)}`),
      ].filter(Boolean).join("\n");
      telegramText =
        `🔧 <b>New Service Request</b>\n\n` +
        `👤 ${escapeHtml(name)}\n` +
        `📞 ${escapeHtml(phone)}\n` +
        (suburb ? `📍 ${escapeHtml(suburb)}\n` : "") +
        (bike ? `🚲 ${escapeHtml(bike)}\n` : "") +
        (email ? `✉️ ${escapeHtml(email)}\n` : "") +
        `\n${tgJobs}\n` +
        (approxTotal ? `\n💰 <b>Approx total: ${escapeHtml(approxTotal)}</b>` : "") +
        (notes ? `\n\n📝 ${escapeHtml(notes)}` : "");
    } else {
      const message = ((body as ContactBody).message || "").trim();

      if (!name || (!phone && !email)) {
        return Response.json(
          { ok: false, error: "Name and a phone or email required" },
          { status: 400 },
        );
      }
      if (!message) {
        return Response.json(
          { ok: false, error: "Message required" },
          { status: 400 },
        );
      }

      title = "New General Enquiry";
      subject = `Enquiry from ${name}`;

      inner = `
        <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#d64525;">Contact details</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${row("Name", name)}
          ${row("Phone", phone || "not supplied")}
          ${row("Email", email || "not supplied")}
          ${row("Suburb", suburb || "not supplied")}
        </table>
        <p style="margin:20px 0 4px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#d64525;">Message</p>
        <p style="margin:0;font-size:13px;color:#3f3f46;line-height:1.6;white-space:pre-wrap;">${escapeHtml(
          message,
        )}</p>`;

      telegramText =
        `📩 <b>New Enquiry</b>\n\n` +
        `👤 ${escapeHtml(name)}\n` +
        (phone ? `📞 ${escapeHtml(phone)}\n` : "") +
        (email ? `✉️ ${escapeHtml(email)}\n` : "") +
        (suburb ? `📍 ${escapeHtml(suburb)}\n` : "") +
        `\n💬 ${escapeHtml(message)}`;
    }

    const html = wrapEmail(title, inner);

    // Fire Telegram + email in parallel — one failing must not block the other.
    const [emailOk, telegramOk] = await Promise.all([
      sendEmail(html, subject, email),
      sendTelegram(telegramText),
    ]);

    // Success as long as the enquiry reached Stu by at least one channel.
    if (!emailOk && !telegramOk) {
      console.error("[cycle-repair-lead] all channels failed", { subject });
      return Response.json({ ok: false, error: "Could not send. Please call us." }, { status: 502 });
    }

    return Response.json({ ok: true, email: emailOk, telegram: telegramOk });
  } catch (err) {
    console.error("[cycle-repair-lead] error:", err);
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
