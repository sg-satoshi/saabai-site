/**
 * Thin analytics utility for the chat widget.
 *
 * Events tracked:
 *   bubble_shown       — proactive bubble displayed to visitor
 *   widget_opened      — visitor opened the chat panel
 *   first_message_sent — visitor sent their first message
 *   lead_qualified     — qualify_lead tool fired with score ≥2
 *   cta_shown          — show_booking_cta tool fired
 *   cta_clicked        — visitor clicked the Calendly booking button
 *   lead_captured      — visitor submitted lead capture form
 *   conversation_abandoned — widget closed after messages were exchanged
 *
 * To wire to a real analytics provider (PostHog, GA4, Segment, Plausible),
 * add the provider call inside the `track` function below.
 */

export function track(
  event: string,
  properties?: Record<string, unknown>
): void {
  // Guard: never run on the server
  if (typeof window === "undefined") return;

  const payload = {
    event,
    properties: properties ?? {},
    timestamp: Date.now(),
    url: window.location.pathname,
  };

  // Log in development
  if (process.env.NODE_ENV === "development") {
    console.log("[analytics]", event, payload);
  }

  // Post to analytics sink — fire-and-forget, never throws
  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});

  // ── Wire provider calls here ────────────────────────────────────────
  // PostHog:
  //   if (window.posthog) window.posthog.capture(event, properties)
  //
  // GA4:
  //   if (window.gtag) window.gtag("event", event, properties)
  //
  // Segment:
  //   if (window.analytics) window.analytics.track(event, properties)
  // ────────────────────────────────────────────────────────────────────
}
