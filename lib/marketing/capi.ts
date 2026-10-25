import { hashEmail, hashPhone } from "./hash";
import { cleanMetaCookie, metaPixelId } from "./public";

const GRAPH = "https://graph.facebook.com/v21.0";

export type CapiEventName = "PageView" | "ViewContent" | "Lead" | "Schedule" | "Purchase" | "Contact" | "LachieDemoStart";

export type CapiInput = {
  eventName: CapiEventName;
  eventId: string;
  eventSourceUrl?: string;
  email?: string;
  phone?: string;
  fbp?: string;
  fbc?: string;
  clientIp?: string;
  userAgent?: string;
  value?: number;
  currency?: "AUD";
  contentName?: string;
  contentCategory?: string;
  contentIds?: string[];
  contentType?: string;
};

export type CapiDeps = {
  fetch?: typeof fetch;
  pixelId?: string;
  accessToken?: string;
  testEventCode?: string;
};

export function capiConfigured(env: { pixelId?: string; accessToken?: string } = {}): boolean {
  const pixelId = env.pixelId ?? metaPixelId();
  const token = env.accessToken ?? process.env.META_CAPI_ACCESS_TOKEN;
  return !!(pixelId && token && token.trim());
}

/** Builds the Meta payload. User data is hashed. Returns null when the event should not be sent. */
export function buildCapiBody(input: CapiInput, testEventCode?: string): Record<string, unknown> | null {
  const eventId = input.eventId.trim();
  if (!/^[A-Za-z0-9_.:-]{8,120}$/.test(eventId)) return null;

  const userData: Record<string, unknown> = {};
  const em = hashEmail(input.email);
  const ph = hashPhone(input.phone);
  if (em) userData.em = [em];
  if (ph) userData.ph = [ph];
  const fbp = cleanMetaCookie(input.fbp);
  const fbc = cleanMetaCookie(input.fbc);
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;
  if (input.clientIp && input.clientIp !== "unknown") userData.client_ip_address = input.clientIp;
  if (input.userAgent) userData.client_user_agent = input.userAgent.slice(0, 512);

  const custom: Record<string, unknown> = {};
  if (typeof input.value === "number" && Number.isFinite(input.value)) {
    custom.value = input.value;
    custom.currency = "AUD";
  }
  if (input.contentName) custom.content_name = input.contentName.slice(0, 120);
  if (input.contentCategory) custom.content_category = input.contentCategory.slice(0, 40);
  if (input.contentIds?.length) custom.content_ids = input.contentIds.slice(0, 8).map((id) => id.slice(0, 80));
  if (input.contentType) custom.content_type = input.contentType.slice(0, 40);

  const event: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    user_data: userData,
  };
  if (input.eventSourceUrl) event.event_source_url = input.eventSourceUrl;
  if (Object.keys(custom).length) event.custom_data = custom;

  const body: Record<string, unknown> = { data: [event] };
  const code = (testEventCode || "").trim();
  if (code) body.test_event_code = code.slice(0, 64);
  return body;
}

/**
 * Sends one event to Meta. No-ops (and does not call fetch) when the pixel id
 * or META_CAPI_ACCESS_TOKEN is missing. Never throws.
 */
export async function sendCapiEvent(input: CapiInput, deps: CapiDeps = {}): Promise<{ sent: boolean; reason?: string }> {
  const pixelId = (deps.pixelId ?? metaPixelId()).trim();
  const token = (deps.accessToken ?? process.env.META_CAPI_ACCESS_TOKEN ?? "").trim();
  const testCode = deps.testEventCode ?? process.env.META_CAPI_TEST_EVENT_CODE;
  if (!pixelId || !token) return { sent: false, reason: "unconfigured" };

  const body = buildCapiBody(input, testCode);
  if (!body) return { sent: false, reason: "invalid" };

  const fetchImpl = deps.fetch ?? fetch;
  try {
    const res = await fetchImpl(`${GRAPH}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      console.error(`[marketing] Meta Conversions API ${input.eventName} returned ${res.status}`);
      return { sent: false, reason: "upstream" };
    }
    return { sent: true };
  } catch (err) {
    console.error(`[marketing] Meta Conversions API ${input.eventName} failed`);
    void err;
    return { sent: false, reason: "network" };
  }
}
