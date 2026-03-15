/**
 * Analytics event sink.
 *
 * Receives events from lib/analytics.ts and logs them.
 * Wire to PostHog, GA4, Segment, or any analytics provider here.
 *
 * Events: bubble_shown | widget_opened | first_message_sent |
 *         lead_qualified | cta_shown | cta_clicked |
 *         lead_captured | conversation_abandoned
 */

export const runtime = "edge";

export async function POST(req: Request) {
  const event = await req.json();

  console.log("[analytics]", JSON.stringify(event));

  // ── Wire analytics provider here ────────────────────────────────────
  // PostHog (server-side):
  //   await fetch("https://app.posthog.com/capture/", {
  //     method: "POST",
  //     body: JSON.stringify({
  //       api_key: process.env.POSTHOG_API_KEY,
  //       event: event.event,
  //       properties: { ...event.properties, $current_url: event.url },
  //       timestamp: new Date(event.timestamp).toISOString(),
  //     }),
  //   })
  // ────────────────────────────────────────────────────────────────────

  return Response.json({ ok: true });
}
