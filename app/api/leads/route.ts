import { Resend } from "resend";

export const runtime = "edge";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatCurrency(n: number) {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

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
          <p style="font-size: 14px; color: #333; margin: 0; line-height: 1.6; padding: ${isMia ? "10px 14px" : "10px 14px"}; background: ${isMia ? "#f0fafb" : "#f8f8f8"}; border-radius: 8px; border-left: 3px solid ${isMia ? "#62c5d1" : "#ddd"};">
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
          <a href="mailto:${email}" style="display: inline-block; background: #62c5d1; color: #0b092e; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none;">Reply to ${name || "Lead"}</a>
          <p style="font-size: 12px; color: #999; margin: 24px 0 0; padding-top: 16px; border-top: 1px solid #e5e5e5;">Captured by Mia · saabai.ai</p>
        </div>
      </div>
    `,
  };
}

function buildCalculatorEmail(lead: {
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

          <a href="mailto:${email}" style="display: inline-block; background: #62c5d1; color: #0b092e; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none;">Follow Up with ${email}</a>
          <p style="font-size: 12px; color: #999; margin: 24px 0 0; padding-top: 16px; border-top: 1px solid #e5e5e5;">Submitted via saabai.ai · ${page}</p>
        </div>
      </div>
    `,
  };
}

export async function POST(req: Request) {
  const lead = await req.json();

  console.log("[lead captured]", JSON.stringify(lead));

  // Determine lead type and build appropriate email
  const isCalculator = lead.source?.startsWith("calculator");
  const { subject, html } = isCalculator
    ? buildCalculatorEmail(lead)
    : buildMiaEmail(lead);

  // Send via Resend
  if (process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: "Saabai Leads <leads@saabai.ai>",
        to: ["hello@saabai.ai"],
        subject,
        html,
        replyTo: lead.email || undefined,
      });
    } catch (err) {
      console.error("[resend error]", err);
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
