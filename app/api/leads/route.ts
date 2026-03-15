/**
 * Lead capture endpoint.
 *
 * Receives lead data from the chat widget and:
 * 1. Logs to console (always)
 * 2. POSTs to LEAD_WEBHOOK_URL if set (Make.com, Zapier, n8n, etc.)
 *
 * Payload shape:
 * {
 *   name: string
 *   email: string
 *   source: "chat_widget"
 *   timestamp: ISO string
 *   conversation: { role: string, content: string }[]
 * }
 */

export const runtime = "edge";

export async function POST(req: Request) {
  const lead = await req.json();

  console.log("[lead captured]", JSON.stringify(lead));

  const webhookUrl = process.env.LEAD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
    } catch (err) {
      console.error("[lead webhook error]", err);
    }
  }

  return Response.json({ ok: true });
}
