import { Resend } from "resend";

export const runtime = "edge";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.PLON_FROM_EMAIL ?? "Rex at PlasticOnline <onboarding@resend.dev>";
const TEAM_EMAIL = process.env.PLON_TEAM_EMAIL ?? "enquiries@plasticonline.com.au";
const SHOP_URL = "https://www.plasticonline.com.au/shop/";
const CONTACT_URL = "https://www.plasticonline.com.au/contact/";

// ── Pipedrive ─────────────────────────────────────────────────────────────────

async function createPipedriveLead(email: string, note: string) {
  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return;

  try {
    // Create person
    const personRes = await fetch(`https://api.pipedrive.com/v1/persons?api_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: email.split("@")[0],
        email: [{ value: email, primary: true }],
      }),
    });
    const personData = await personRes.json();
    const personId = personData?.data?.id;

    // Create deal
    await fetch(`https://api.pipedrive.com/v1/deals?api_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: note ? `Rex Lead — ${note}` : `Rex Lead — ${email}`,
        person_id: personId,
        ...(process.env.PIPEDRIVE_PIPELINE_ID && { pipeline_id: Number(process.env.PIPEDRIVE_PIPELINE_ID) }),
        ...(process.env.PIPEDRIVE_STAGE_ID && { stage_id: Number(process.env.PIPEDRIVE_STAGE_ID) }),
      }),
    });
  } catch {
    // Non-fatal — don't block the response
  }
}

// ── Email templates ───────────────────────────────────────────────────────────

function quoteEmailHtml(note: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:#25D366;padding:28px 32px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;">PlasticOnline</p>
          <p style="margin:4px 0 0;color:#b7f5d0;font-size:13px;">Your quote from Rex</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#111;font-size:16px;font-weight:600;">Here's the quote Rex put together for you.</p>
          <div style="background:#f2fef6;border:1px solid #c8f0d8;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0;color:#444;font-size:14px;line-height:1.6;">${note || "Custom cut-to-size order"}</p>
          </div>
          <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
            When you're ready to order, just head to the shop and add it to your cart.
            Up to 10 cuts are included with every order.
          </p>
          <a href="${SHOP_URL}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">
            Place Your Order →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #eee;">
          <p style="margin:0;color:#888;font-size:12px;line-height:1.6;">
            Questions? Reply to this email or call us on <strong>(07) 5564 6744</strong>.<br>
            PlasticOnline · 13 Distribution Avenue, Molendinar QLD 4214 · Mon–Fri 7:30am–4:00pm
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function followUpEmailHtml(note: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:#25D366;padding:28px 32px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;">PlasticOnline</p>
          <p style="margin:4px 0 0;color:#b7f5d0;font-size:13px;">Rex here, just checking in</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#111;font-size:15px;line-height:1.6;">
            Hey, Rex here from PlasticOnline. Just checking in on that quote from yesterday.
          </p>
          <div style="background:#f2fef6;border:1px solid #c8f0d8;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0;color:#444;font-size:14px;line-height:1.6;">${note || "Your custom cut-to-size order"}</p>
          </div>
          <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
            Your order is ready to go whenever you are. If anything changed or you need a different size, just reply here and I'll sort it.
          </p>
          <a href="${SHOP_URL}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">
            Complete Your Order →
          </a>
          <p style="margin:20px 0 0;color:#888;font-size:13px;">
            Not ready yet? No worries. <a href="${CONTACT_URL}" style="color:#25D366;">Get in touch</a> if you have any questions.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #eee;">
          <p style="margin:0;color:#888;font-size:12px;line-height:1.6;">
            PlasticOnline · 13 Distribution Avenue, Molendinar QLD 4214 · (07) 5564 6744<br>
            <a href="${CONTACT_URL}" style="color:#aaa;">Unsubscribe</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function teamNotificationHtml(email: string, note: string, source: string) {
  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;padding:24px;color:#333;">
  <h2 style="color:#25D366;margin:0 0 16px;">New Rex Lead</h2>
  <table style="border-collapse:collapse;width:100%;max-width:500px;">
    <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:600;width:120px;">Email</td><td style="padding:8px 12px;">${email}</td></tr>
    <tr><td style="padding:8px 12px;background:#f0f0f0;font-weight:600;">Quote</td><td style="padding:8px 12px;">${note || "No quote details"}</td></tr>
    <tr><td style="padding:8px 12px;background:#f9f9f9;font-weight:600;">Source</td><td style="padding:8px 12px;">${source}</td></tr>
    <tr><td style="padding:8px 12px;background:#f0f0f0;font-weight:600;">Time</td><td style="padding:8px 12px;">${new Date().toLocaleString("en-AU", { timeZone: "Australia/Brisbane" })} AEST</td></tr>
  </table>
</body>
</html>`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { source, email, note, timestamp } = await req.json();

    const tasks: Promise<unknown>[] = [];

    if (email) {
      // 1. Immediate quote email to customer
      tasks.push(
        resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: "Your quote from Rex at PlasticOnline",
          html: quoteEmailHtml(note ?? ""),
        })
      );

      // 2. Follow-up email — 22 hours later
      const followUpAt = new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString();
      tasks.push(
        resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: "Still need that plastic cut? Your quote is ready",
          html: followUpEmailHtml(note ?? ""),
          scheduledAt: followUpAt,
        } as Parameters<typeof resend.emails.send>[0])
      );

      // 3. Pipedrive lead
      tasks.push(createPipedriveLead(email, note ?? ""));
    }

    // 4. Team notification (always)
    tasks.push(
      resend.emails.send({
        from: FROM_EMAIL,
        to: TEAM_EMAIL,
        subject: `Rex lead: ${email ?? "anonymous"} — ${note ?? "no quote"}`,
        html: teamNotificationHtml(email ?? "unknown", note ?? "", source ?? "unknown"),
      })
    );

    // 5. Make.com webhook (existing)
    if (process.env.LEAD_WEBHOOK_URL) {
      tasks.push(
        fetch(process.env.LEAD_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: source ?? "rex", email, note, timestamp }),
        })
      );
    }

    await Promise.allSettled(tasks);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[rex-leads]", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
