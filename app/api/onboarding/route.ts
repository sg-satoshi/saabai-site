import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const data = await req.json();

  const {
    industry,
    // Business
    companyName, contactName, role, location, revenue, teamSize,
    // Services
    services, otherService, typicalJobValue, minJobSize,
    // Enquiry
    contactChannels, enquiriesPerWeek, whoHandles, responseTime, frustration,
    // Quoting
    howTheyQuote, quoteInfo, timeToQuote, offersEstimate, estimateDetail, pricingVariables,
    // Tech
    websiteUrl, websitePlatform, tools,
    // Agent scope
    agentGoals, agentRestrictions,
    // Timeline
    urgency, budget,
    // Other
    anythingElse,
  } = data;

  const servicesStr = Array.isArray(services) ? services.join(", ") : services;
  const channelsStr = Array.isArray(contactChannels) ? contactChannels.join(", ") : contactChannels;
  const toolsStr = Array.isArray(tools) ? tools.join(", ") : tools;
  const goalsStr = Array.isArray(agentGoals) ? agentGoals.join(", ") : agentGoals;

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 640px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #0b092e; padding: 32px; border-radius: 12px 12px 0 0;">
        <p style="color: #62c5d1; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 8px;">Saabai · New Client Fact Find</p>
        <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 600;">AI Agent Enquiry — ${industry || "New Client"}</h1>
      </div>

      <div style="background: #f8f8f8; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e5e5; border-top: none;">

        <h2 style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #666; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5;">Business</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px; width: 200px;">Company</td><td style="padding: 6px 0; font-size: 14px; font-weight: 500;">${companyName || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Contact</td><td style="padding: 6px 0; font-size: 14px;">${contactName || "—"} ${role ? `(${role})` : ""}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Location</td><td style="padding: 6px 0; font-size: 14px;">${location || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Revenue</td><td style="padding: 6px 0; font-size: 14px;">${revenue || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Team Size</td><td style="padding: 6px 0; font-size: 14px;">${teamSize || "—"}</td></tr>
        </table>

        <h2 style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #666; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5;">Services</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px; width: 200px;">Services Offered</td><td style="padding: 6px 0; font-size: 14px;">${servicesStr || "—"}${otherService ? `, ${otherService}` : ""}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Typical Job Value</td><td style="padding: 6px 0; font-size: 14px;">${typicalJobValue || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Minimum Job Size</td><td style="padding: 6px 0; font-size: 14px;">${minJobSize || "—"}</td></tr>
        </table>

        <h2 style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #666; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5;">Enquiry Process</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px; width: 200px;">Contact Channels</td><td style="padding: 6px 0; font-size: 14px;">${channelsStr || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Enquiries / Week</td><td style="padding: 6px 0; font-size: 14px;">${enquiriesPerWeek || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Who Handles</td><td style="padding: 6px 0; font-size: 14px;">${whoHandles || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Response Time</td><td style="padding: 6px 0; font-size: 14px;">${responseTime || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px; vertical-align: top;">Biggest Frustration</td><td style="padding: 6px 0; font-size: 14px;">${frustration || "—"}</td></tr>
        </table>

        <h2 style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #666; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5;">Quoting Process</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px; width: 200px;">How They Quote</td><td style="padding: 6px 0; font-size: 14px;">${howTheyQuote || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px; vertical-align: top;">Info Needed to Quote</td><td style="padding: 6px 0; font-size: 14px;">${quoteInfo || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Time to Quote</td><td style="padding: 6px 0; font-size: 14px;">${timeToQuote || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Offers Estimates?</td><td style="padding: 6px 0; font-size: 14px;">${offersEstimate || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px; vertical-align: top;">Estimate Detail</td><td style="padding: 6px 0; font-size: 14px;">${estimateDetail || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px; vertical-align: top;">Pricing Variables</td><td style="padding: 6px 0; font-size: 14px;">${pricingVariables || "—"}</td></tr>
        </table>

        <h2 style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #666; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5;">Tech Stack</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px; width: 200px;">Website</td><td style="padding: 6px 0; font-size: 14px;">${websiteUrl || "None"} ${websitePlatform ? `(${websitePlatform})` : ""}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px; vertical-align: top;">Tools in Use</td><td style="padding: 6px 0; font-size: 14px;">${toolsStr || "None listed"}</td></tr>
        </table>

        <h2 style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #666; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5;">Agent Scope</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px; width: 200px; vertical-align: top;">Goals (Ranked)</td><td style="padding: 6px 0; font-size: 14px;">${goalsStr || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px; vertical-align: top;">Restrictions</td><td style="padding: 6px 0; font-size: 14px;">${agentRestrictions || "None stated"}</td></tr>
        </table>

        <h2 style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #666; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5;">Timeline & Budget</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px; width: 200px;">Urgency</td><td style="padding: 6px 0; font-size: 14px;">${urgency || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #888; font-size: 13px;">Budget Range</td><td style="padding: 6px 0; font-size: 14px;">${budget || "—"}</td></tr>
        </table>

        ${anythingElse ? `
        <h2 style="font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; color: #666; margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid #e5e5e5;">Additional Notes</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #333; margin: 0 0 28px;">${anythingElse}</p>
        ` : ""}

        <p style="font-size: 12px; color: #999; margin: 0; padding-top: 16px; border-top: 1px solid #e5e5e5;">Submitted via saabai.ai/onboarding</p>
      </div>
    </div>
  `;

  try {
    await resend.emails.send({
      from: "Saabai Onboarding <onboarding@saabai.ai>",
      to: ["hello@saabai.ai"],
      subject: `New Fact Find [${industry || "General"}] — ${companyName || "Unknown"} (${contactName || "Unknown"})`,
      html,
      replyTo: data.replyEmail || undefined,
    });
  } catch (err) {
    console.error("[onboarding email error]", err);
    return Response.json({ ok: false, error: "Email failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
