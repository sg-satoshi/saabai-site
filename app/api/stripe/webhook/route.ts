import Stripe from "stripe";
import { Resend } from "resend";

export const runtime = "nodejs";

const CALENDLY = "https://calendly.com/shanegoldberg/30min";
const SAABAI_EMAIL = "hello@saabai.ai";

function getPlanLabel(amountTotal: number | null): { name: string; setup: string; monthly: string } {
  // Growth: $2,500 setup + $499/mo — total first charge ~$2,999
  // Starter: $1,500 setup + $299/mo — total first charge ~$1,799
  // Match on amount_total (in cents) or fall back to heuristic
  if (!amountTotal) return { name: "Starter", setup: "$1,500", monthly: "$299/mo" };
  return amountTotal >= 200000
    ? { name: "Growth", setup: "$2,500", monthly: "$499/mo" }
    : { name: "Starter", setup: "$1,500", monthly: "$299/mo" };
}

function buildWelcomeEmail(firstName: string | null, planName: string): { subject: string; html: string } {
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  return {
    subject: `Welcome to Lex ${planName} — here's what happens next`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0b092e; padding: 36px 40px 32px; border-radius: 16px 16px 0 0; position: relative; overflow: hidden;">
          <div style="position: absolute; top: 0; left: 20%; right: 20%; height: 2px; background: linear-gradient(to right, transparent, #c9a84c, transparent);"></div>
          <p style="color: #c9a84c; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 10px; font-weight: 600;">Saabai · Lex ${planName}</p>
          <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 700; letter-spacing: -0.02em; line-height: 1.3;">You're in. Let's get your agent live.</h1>
        </div>
        <div style="background: #f7f7f9; padding: 32px 40px; border-radius: 0 0 16px 16px; border: 1px solid #e8e8ec; border-top: none;">
          <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 18px;">${greeting}</p>
          <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 18px;">Your Lex ${planName} subscription is confirmed. We'll be in touch within one business day — but the fastest way to get moving is to book your onboarding call now.</p>
          <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 28px;">It's 30 minutes. I'll come in knowing your plan details, so we skip the sales part and go straight to building your agent. Most firms are live within 5 business days of the call.</p>

          <div style="text-align: center; margin-bottom: 12px;">
            <a href="${CALENDLY}" style="display: inline-block; background: #c9a84c; color: #0b092e; padding: 15px 36px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none;">Book Your Onboarding Call →</a>
          </div>
          <p style="text-align: center; font-size: 13px; color: #aaa; margin: 0 0 32px;">30 minutes · Pick a time that works for you</p>

          <div style="background: #ffffff; border: 1px solid #e8e8ec; border-radius: 12px; padding: 24px 28px; margin-bottom: 28px;">
            <p style="font-size: 11px; font-weight: 800; color: #c9a84c; letter-spacing: 1px; text-transform: uppercase; margin: 0 0 16px;">What happens on the call</p>
            ${[
              { step: "1", title: "Your firm & practice areas", desc: "We map out what Lex needs to know about your services, clients, and how you work." },
              { step: "2", title: "Tone & brand voice", desc: "We nail how Lex should sound — professional, warm, direct. You approve it before anything goes live." },
              { step: "3", title: "Connect your Anthropic account", desc: "Takes 5 minutes. Your agent runs on your API key — your data, full transparency." },
              { step: "4", title: "Go live", desc: "Lex is embedded on your site and capturing leads within 5 business days." },
            ].map(item => `
              <div style="display: flex; gap: 14px; margin-bottom: 14px; align-items: flex-start;">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.3); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; font-weight: 800; color: #c9a84c; line-height: 24px; text-align: center;">${item.step}</div>
                <div>
                  <p style="margin: 0 0 3px; font-size: 14px; font-weight: 700; color: #111;">${item.title}</p>
                  <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">${item.desc}</p>
                </div>
              </div>
            `).join("")}
          </div>

          <div style="border-top: 1px solid #e8e8ec; padding-top: 20px;">
            <p style="font-size: 14px; color: #555; margin: 0 0 4px;">Shane Goldberg</p>
            <p style="font-size: 13px; color: #999; margin: 0 0 4px;">Saabai · AI Automation for Professional Firms</p>
            <p style="font-size: 13px; color: #999; margin: 0;"><a href="mailto:${SAABAI_EMAIL}" style="color: #c9a84c; text-decoration: none;">${SAABAI_EMAIL}</a></p>
          </div>
        </div>
      </div>
    `,
  };
}

function buildNotificationEmail(
  customerName: string | null,
  customerEmail: string | null,
  plan: { name: string; setup: string; monthly: string },
  amountTotal: number | null,
): string {
  const amount = amountTotal ? `$${(amountTotal / 100).toLocaleString("en-AU")}` : "unknown";
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 540px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #0b092e; padding: 28px 32px; border-radius: 12px 12px 0 0;">
        <p style="color: #c9a84c; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; margin: 0 0 6px; font-weight: 600;">Saabai · New Signup</p>
        <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 700;">Lex ${plan.name} — Payment Confirmed</h1>
      </div>
      <div style="background: #f8f8f8; padding: 28px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e5e5; border-top: none;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 7px 0; color: #888; font-size: 13px; width: 160px;">Name</td><td style="padding: 7px 0; font-size: 14px; font-weight: 600;">${customerName || "—"}</td></tr>
          <tr><td style="padding: 7px 0; color: #888; font-size: 13px;">Email</td><td style="padding: 7px 0; font-size: 14px;"><a href="mailto:${customerEmail}" style="color: #0b092e;">${customerEmail || "—"}</a></td></tr>
          <tr><td style="padding: 7px 0; color: #888; font-size: 13px;">Plan</td><td style="padding: 7px 0; font-size: 14px; font-weight: 600;">Lex ${plan.name}</td></tr>
          <tr><td style="padding: 7px 0; color: #888; font-size: 13px;">Pricing</td><td style="padding: 7px 0; font-size: 14px;">${plan.setup} setup + ${plan.monthly}</td></tr>
          <tr><td style="padding: 7px 0; color: #888; font-size: 13px;">Amount charged</td><td style="padding: 7px 0; font-size: 14px; font-weight: 700; color: #0b092e;">${amount}</td></tr>
        </table>
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e5e5;">
          <p style="font-size: 13px; color: #888; margin: 0;">Welcome email sent to client. Book their onboarding: <a href="${CALENDLY}" style="color: #c9a84c;">${CALENDLY}</a></p>
        </div>
      </div>
    </div>
  `;
}

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const resendKey = process.env.RESEND_API_KEY;

  if (!stripeKey) return Response.json({ error: "STRIPE_SECRET_KEY not configured" }, { status: 500 });
  if (!webhookSecret) return Response.json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 500 });

  const stripe = new Stripe(stripeKey);
  const signature = req.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing stripe-signature" }, { status: 400 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return Response.json({ received: true, skipped: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const customerName = session.customer_details?.name ?? null;
  const customerEmail = session.customer_details?.email ?? null;
  const amountTotal = session.amount_total ?? null;
  const plan = getPlanLabel(amountTotal);
  const firstName = customerName?.split(" ")[0] ?? null;

  console.log(`[stripe webhook] new signup: ${customerName} (${customerEmail}) — Lex ${plan.name}`);

  if (!resendKey) {
    console.warn("[stripe webhook] RESEND_API_KEY not set — skipping emails");
    return Response.json({ received: true, warning: "emails skipped (no resend key)" });
  }

  const resend = new Resend(resendKey);
  const welcome = buildWelcomeEmail(firstName, plan.name);

  const results = await Promise.allSettled([
    // Welcome email to the client
    customerEmail
      ? resend.emails.send({
          from: "Shane at Saabai <hello@saabai.ai>",
          to: [customerEmail],
          subject: welcome.subject,
          html: welcome.html,
        })
      : Promise.resolve(null),

    // Internal notification to Shane
    resend.emails.send({
      from: "Saabai Payments <hello@saabai.ai>",
      to: [SAABAI_EMAIL],
      subject: `New Lex ${plan.name} signup — ${customerName || customerEmail || "Unknown"}`,
      html: buildNotificationEmail(customerName, customerEmail, plan, amountTotal),
    }),
  ]);

  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`[stripe webhook] email ${i} failed:`, r.reason);
  });

  return Response.json({ received: true, plan: plan.name, customer: customerEmail });
}
