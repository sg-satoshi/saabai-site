import { Resend } from "resend";

export const runtime = "edge";

const resend = new Resend(process.env.RESEND_API_KEY);

const CALENDLY = "https://calendly.com/shanegoldberg/30min";

function formatCurrency(n: number) {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

function formatNumber(n: number) {
  return n.toLocaleString("en-AU", { maximumFractionDigits: 0 });
}

// ── Operator notification: Mia chat lead ─────────────────────────────────────

function buildMiaEmail(lead: {
  name?: string;
  email: string;
  timestamp: string;
  conversation?: { role: string; content: string }[];
}) {
  const { name, email, timestamp, conversation = [] } = lead;

  const conversationHtml = conversation
    .map(({ role, content }) => {
      const isMia = role === "assistant";
      return `
        <div style="margin-bottom: 12px;">
          <p style="font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: ${isMia ? "#62c5d1" : "#888"}; margin: 0 0 4px;">
            ${isMia ? "Mia" : name || "Visitor"}
          </p>
          <p style="font-size: 14px; color: #333; margin: 0; line-height: 1.6; padding: 10px 14px; background: ${isMia ? "#f0fafb" : "#f8f8f8"}; border-radius: 8px; border-left: 3px solid ${isMia ? "#62c5d1" : "#ddd"};">
            ${content}
          </p>
        </div>
      `;
    })
    .join("");

  return {
    subject: `New Lead via Mia — ${name || email}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 640px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #0b092e; padding: 32px; border-radius: 12px 12px 0 0;">
          <p style="color: #62c5d1; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 8px;">Saabai · New Lead</p>
          <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 600;">Mia captured a lead</h1>
        </div>
        <div style="background: #f8f8f8; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e5e5; border-top: none;">
          <h2 style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #666; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5;">Contact</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px; width: 120px;">Name</td><td style="padding: 6px 0; font-size: 14px; font-weight: 500;">${name || "Not provided"}</td></tr>
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Email</td><td style="padding: 6px 0; font-size: 14px;"><a href="mailto:${email}" style="color: #62c5d1;">${email}</a></td></tr>
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Time</td><td style="padding: 6px 0; font-size: 14px;">${new Date(timestamp).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}</td></tr>
          </table>
          ${conversation.length > 0 ? `
            <h2 style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #666; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5;">Conversation</h2>
            <div style="margin-bottom: 24px;">${conversationHtml}</div>
          ` : ""}
          <a href="mailto:${email}" style="display: inline-block; background: #62c5d1; color: #0b092e; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none;">Reply to ${name || "Lead"} →</a>
          <p style="font-size: 12px; color: #999; margin: 24px 0 0; padding-top: 16px; border-top: 1px solid #e5e5e5;">Captured by Mia · saabai.ai</p>
        </div>
      </div>
    `,
  };
}

// ── Operator notification: calculator lead ───────────────────────────────────

function buildCalculatorOperatorEmail(lead: {
  email: string;
  timestamp: string;
  calculatorResults?: {
    teamMembers?: number;
    hoursPerWeek?: number;
    hourlyCost?: number;
    weeklyHours?: number;
    annualHours?: number;
    annualCost?: number;
  };
  source?: string;
}) {
  const { email, timestamp, calculatorResults = {}, source } = lead;
  const { teamMembers, hoursPerWeek, hourlyCost, weeklyHours, annualHours, annualCost } = calculatorResults;
  const page = source === "calculator_page" ? "Calculator Page" : "Homepage Calculator";

  return {
    subject: `Calculator Lead — ${email} (${annualCost ? formatCurrency(annualCost) + "/yr" : "estimate requested"})`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 640px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #0b092e; padding: 32px; border-radius: 12px 12px 0 0;">
          <p style="color: #62c5d1; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 8px;">Saabai · Calculator Lead</p>
          <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 600;">Someone ran the numbers</h1>
        </div>
        <div style="background: #f8f8f8; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e5e5; border-top: none;">

          ${annualCost ? `
          <div style="background: #0b092e; border-radius: 10px; padding: 24px; margin-bottom: 28px; text-align: center;">
            <p style="color: #62c5d1; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 8px;">Their Estimated Annual Labour Cost</p>
            <p style="color: #ffffff; font-size: 42px; font-weight: 700; margin: 0; letter-spacing: -0.02em;">${formatCurrency(annualCost)}</p>
            <p style="color: rgba(255,255,255,0.4); font-size: 13px; margin: 6px 0 0;">AUD per year in repetitive work</p>
          </div>
          ` : ""}

          <h2 style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #666; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5;">Contact</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px; width: 180px;">Email</td><td style="padding: 6px 0; font-size: 14px;"><a href="mailto:${email}" style="color: #62c5d1;">${email}</a></td></tr>
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Source</td><td style="padding: 6px 0; font-size: 14px;">${page}</td></tr>
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Time</td><td style="padding: 6px 0; font-size: 14px;">${new Date(timestamp).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}</td></tr>
          </table>

          <h2 style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #666; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5;">Calculator Inputs</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px; width: 180px;">Team members</td><td style="padding: 6px 0; font-size: 14px;">${teamMembers ?? "—"}</td></tr>
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Hours / week each</td><td style="padding: 6px 0; font-size: 14px;">${hoursPerWeek ?? "—"}</td></tr>
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Hourly cost (AUD)</td><td style="padding: 6px 0; font-size: 14px;">${hourlyCost ? formatCurrency(hourlyCost) : "—"}</td></tr>
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Weekly hours total</td><td style="padding: 6px 0; font-size: 14px;">${weeklyHours ?? "—"}</td></tr>
            <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Annual hours total</td><td style="padding: 6px 0; font-size: 14px;">${annualHours ?? "—"}</td></tr>
          </table>

          <a href="mailto:${email}" style="display: inline-block; background: #62c5d1; color: #0b092e; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none;">Reply to Lead →</a>
          <p style="font-size: 12px; color: #999; margin: 24px 0 0; padding-top: 16px; border-top: 1px solid #e5e5e5;">Submitted via saabai.ai · ${page}</p>
        </div>
      </div>
    `,
  };
}

// ── Customer-facing: calculator results email ────────────────────────────────

function buildCalculatorCustomerEmail(lead: {
  email: string;
  calculatorResults?: {
    teamMembers?: number;
    hoursPerWeek?: number;
    hourlyCost?: number;
    weeklyHours?: number;
    annualHours?: number;
    annualCost?: number;
  };
}) {
  const { email, calculatorResults = {} } = lead;
  const { teamMembers, hoursPerWeek, hourlyCost, weeklyHours, annualHours, annualCost } = calculatorResults;

  const savingsLow  = annualCost ? formatCurrency(annualCost * 0.25) : null;
  const savingsHigh = annualCost ? formatCurrency(annualCost * 0.5)  : null;

  return {
    subject: `Your automation cost estimate — ${annualCost ? formatCurrency(annualCost) + "/yr" : "Saabai"}`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">

        <!-- Header -->
        <div style="background: #0b092e; padding: 40px 40px 36px; border-radius: 16px 16px 0 0; position: relative; overflow: hidden;">
          <!-- Top accent line -->
          <div style="position: absolute; top: 0; left: 20%; right: 20%; height: 2px; background: linear-gradient(to right, transparent, #62c5d1, transparent);"></div>
          <p style="color: #62c5d1; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 12px; font-weight: 600;">Saabai · Your Cost Estimate</p>
          <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2;">Here are your numbers.</h1>
          <p style="color: rgba(255,255,255,0.55); font-size: 15px; margin: 0; line-height: 1.5;">Based on your inputs, here's what repetitive manual work is costing your business.</p>
        </div>

        <!-- Body -->
        <div style="background: #f7f7f9; padding: 40px; border-radius: 0 0 16px 16px; border: 1px solid #e8e8ec; border-top: none;">

          ${annualCost ? `
          <!-- Hero number -->
          <div style="background: #0b092e; border-radius: 12px; padding: 32px; margin-bottom: 28px; text-align: center;">
            <p style="color: #62c5d1; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 10px; font-weight: 600;">Estimated Annual Labour Cost</p>
            <p style="color: #ffffff; font-size: 52px; font-weight: 800; margin: 0; letter-spacing: -0.03em; line-height: 1;">${formatCurrency(annualCost)}</p>
            <p style="color: rgba(255,255,255,0.45); font-size: 13px; margin: 10px 0 0;">AUD per year spent on repetitive manual work</p>
          </div>

          <!-- Stats row -->
          <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin-bottom: 28px;">
            <tr>
              <td style="background: #ffffff; border: 1px solid #e8e8ec; border-radius: 10px; padding: 18px 20px; width: 50%; vertical-align: top;">
                <p style="color: #62c5d1; font-size: 24px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.02em;">${weeklyHours ? formatNumber(weeklyHours) : "—"}</p>
                <p style="color: #888; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; margin: 0;">Hours / week</p>
              </td>
              <td style="background: #ffffff; border: 1px solid #e8e8ec; border-radius: 10px; padding: 18px 20px; width: 50%; vertical-align: top;">
                <p style="color: #62c5d1; font-size: 24px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.02em;">${annualHours ? formatNumber(annualHours) : "—"}</p>
                <p style="color: #888; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; margin: 0;">Hours / year</p>
              </td>
            </tr>
          </table>

          <!-- Savings callout -->
          <div style="background: #ffffff; border: 1px solid #e8e8ec; border-left: 3px solid #62c5d1; border-radius: 10px; padding: 20px 22px; margin-bottom: 32px;">
            <p style="font-size: 13px; font-weight: 700; color: #1a1a1a; margin: 0 0 6px; letter-spacing: -0.01em;">What automation could recover</p>
            <p style="font-size: 15px; color: #444; margin: 0; line-height: 1.6;">Automating 25–50% of this workload could unlock <strong style="color: #0b092e;">${savingsLow}–${savingsHigh}</strong> in annual savings — without adding headcount.</p>
          </div>
          ` : ""}

          <!-- Your inputs -->
          <h2 style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #999; margin: 0 0 14px; padding-bottom: 10px; border-bottom: 1px solid #e8e8ec;">Your Inputs</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 9px 0; color: #999; font-size: 13px; width: 55%;">Team members on manual tasks</td>
              <td style="padding: 9px 0; font-size: 14px; font-weight: 600; color: #1a1a1a; text-align: right;">${teamMembers ?? "—"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 9px 0; color: #999; font-size: 13px;">Hours per week each</td>
              <td style="padding: 9px 0; font-size: 14px; font-weight: 600; color: #1a1a1a; text-align: right;">${hoursPerWeek ?? "—"} hrs</td>
            </tr>
            <tr>
              <td style="padding: 9px 0; color: #999; font-size: 13px;">Average hourly cost</td>
              <td style="padding: 9px 0; font-size: 14px; font-weight: 600; color: #1a1a1a; text-align: right;">${hourlyCost ? formatCurrency(hourlyCost) : "—"}/hr</td>
            </tr>
          </table>

          <!-- Primary CTA -->
          <div style="text-align: center; margin-bottom: 20px;">
            <a href="${CALENDLY}" style="display: inline-block; background: #62c5d1; color: #0b092e; padding: 16px 36px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none; letter-spacing: -0.01em;">Book Your Free 30-Min Strategy Call →</a>
          </div>
          <p style="text-align: center; font-size: 13px; color: #aaa; margin: 0 0 32px;">Free · No obligation · We'll show you exactly what's automatable in your business</p>

          <!-- What to expect -->
          <div style="background: #ffffff; border: 1px solid #e8e8ec; border-radius: 10px; padding: 24px; margin-bottom: 32px;">
            <p style="font-size: 13px; font-weight: 700; color: #1a1a1a; margin: 0 0 14px; letter-spacing: -0.01em;">What happens on the call</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; vertical-align: top; width: 24px;"><span style="color: #62c5d1; font-weight: 700; font-size: 13px;">01</span></td>
                <td style="padding: 6px 0; font-size: 13px; color: #555; line-height: 1.5;">We map your biggest time drains — where the hours actually go</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; vertical-align: top;"><span style="color: #62c5d1; font-weight: 700; font-size: 13px;">02</span></td>
                <td style="padding: 6px 0; font-size: 13px; color: #555; line-height: 1.5;">We show you what's automatable in your specific workflow</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; vertical-align: top;"><span style="color: #62c5d1; font-weight: 700; font-size: 13px;">03</span></td>
                <td style="padding: 6px 0; font-size: 13px; color: #555; line-height: 1.5;">You leave with a clear picture of what's possible — and what it costs</td>
              </tr>
            </table>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e8e8ec;">
            <p style="font-size: 13px; font-weight: 700; color: #1a1a1a; margin: 0 0 4px; letter-spacing: -0.01em;">Saabai</p>
            <p style="font-size: 12px; color: #bbb; margin: 0;">AI Automation for Professional Firms · Australia</p>
            <p style="font-size: 12px; color: #ccc; margin: 10px 0 0;">You requested this estimate at saabai.ai. Questions? Reply to this email.</p>
          </div>

        </div>
      </div>
    `,
  };
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const lead = await req.json();

  console.log("[lead captured]", JSON.stringify(lead));

  const isCalculator = lead.source?.startsWith("calculator");

  if (process.env.RESEND_API_KEY) {
    // Operator notification
    const { subject, html } = isCalculator
      ? buildCalculatorOperatorEmail(lead)
      : buildMiaEmail(lead);

    try {
      await resend.emails.send({
        from: "Saabai Leads <leads@saabai.ai>",
        to: ["hello@saabai.ai"],
        subject,
        html,
        replyTo: lead.email || undefined,
      });
    } catch (err) {
      console.error("[resend operator error]", err);
    }

    // Customer confirmation — calculator only
    if (isCalculator && lead.email) {
      const { subject: custSubject, html: custHtml } = buildCalculatorCustomerEmail(lead);
      try {
        await resend.emails.send({
          from: "Saabai <hello@saabai.ai>",
          to: [lead.email],
          subject: custSubject,
          html: custHtml,
          replyTo: "hello@saabai.ai",
        });
      } catch (err) {
        console.error("[resend customer error]", err);
      }
    }
  }

  // Keep webhook as silent fallback
  const webhookUrl = process.env.LEAD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
    } catch (err) {
      console.error("[webhook error]", err);
    }
  }

  return Response.json({ ok: true });
}
