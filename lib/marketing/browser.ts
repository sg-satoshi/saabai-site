"use client";

/**
 * Browser marketing events for saabai.ai.
 * GA4 events go through the gtag already loaded for saabai.ai (see lib/ga.ts).
 * NEXT_PUBLIC_GA4_ID is optional and does not load a second tag.
 * Meta pixel goes to NEXT_PUBLIC_META_PIXEL_ID. The same event id is sent to the
 * pixel and to /api/marketing/event so Meta can dedupe.
 * Email and phone are not sent to GA4. The pixel no-ops when its env var is unset.
 */
import {
  fbcValue,
  ga4MeasurementId,
  marketingHostMode,
  marketingPathAllowed,
  metaPixelId,
  readCookie,
} from "./public";

type LeadSource = "enquiry" | "lex" | "lachie";

type MarketingWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  __saabaiPixel?: boolean;
};

function win(): MarketingWindow | null {
  if (typeof window === "undefined") return null;
  return window as MarketingWindow;
}

export function marketingAllowedHere(): boolean {
  const w = win();
  if (!w) return false;
  return !!marketingHostMode(w.location.hostname) && marketingPathAllowed(w.location.pathname);
}

function cookie(name: string): string | undefined {
  if (typeof document === "undefined") return;
  return readCookie(document.cookie, name);
}

function once(key: string): boolean {
  try {
    const storageKey = `mkt_once:${key}`;
    if (sessionStorage.getItem(storageKey)) return false;
    sessionStorage.setItem(storageKey, "1");
    return true;
  } catch {
    return true;
  }
}

function shortKey(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

function sendGa4(name: string, params: Record<string, unknown>, attempt = 0): void {
  const measurementId = ga4MeasurementId();
  if (!measurementId || !marketingAllowedHere()) return;
  const w = win();
  if (!w) return;
  if (typeof w.gtag !== "function") {
    if (attempt < 20) window.setTimeout(() => sendGa4(name, params, attempt + 1), 250);
    return;
  }
  w.gtag("event", name, { ...params, send_to: measurementId });
}

function sendPixel(event: string, params: Record<string, unknown>, eventId: string, attempt = 0): void {
  const pixelId = metaPixelId();
  if (!pixelId || !marketingAllowedHere()) return;
  const w = win();
  if (!w) return;
  if (typeof w.fbq !== "function") {
    if (attempt < 25) window.setTimeout(() => sendPixel(event, params, eventId, attempt + 1), 200);
    return;
  }
  if (!w.__saabaiPixel) {
    w.fbq("init", pixelId);
    w.__saabaiPixel = true;
  }
  w.fbq("track", event, params, { eventID: eventId });
}

function postCapi(body: Record<string, unknown>): void {
  if (!metaPixelId() || !marketingAllowedHere()) return;
  const w = win();
  if (!w) return;
  const fbp = cookie("_fbp");
  const fbc = fbcValue(cookie("_fbc"), w.location.search);
  const payload = {
    ...body,
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
    eventSourceUrl: w.location.href,
  };
  fetch("/api/marketing/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

function newEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

const recentPage = { path: "", at: 0 };

export function trackMarketingPageView(pathname: string, opts?: { skipGa?: boolean }): void {
  if (!marketingAllowedHere()) return;
  const now = Date.now();
  if (recentPage.path === pathname && now - recentPage.at < 800) return;
  recentPage.path = pathname;
  recentPage.at = now;
  const eventId = newEventId();
  const w = win();
  if (!opts?.skipGa) {
    sendGa4("page_view", {
      page_path: pathname,
      page_location: w?.location.href,
      page_title: typeof document !== "undefined" ? document.title : undefined,
    });
  }
  sendPixel("PageView", {}, eventId);
  postCapi({ eventName: "PageView", eventId });
}

export function trackMarketingViewContent(content: {
  contentName: string;
  contentCategory: string;
  contentIds: string[];
  value?: number;
}): void {
  if (!marketingAllowedHere()) return;
  const key = `vc:${content.contentIds.join(",")}:${content.contentName}`;
  if (!once(key)) return;
  const eventId = newEventId();
  const params: Record<string, unknown> = {
    item_list_name: content.contentName,
    content_category: content.contentCategory,
  };
  if (typeof content.value === "number") {
    params.value = content.value;
    params.currency = "AUD";
  }
  sendGa4("view_item", params);
  sendPixel("ViewContent", {
    content_name: content.contentName,
    content_category: content.contentCategory,
    content_ids: content.contentIds,
    content_type: "product",
    ...(typeof content.value === "number" ? { value: content.value, currency: "AUD" } : {}),
  }, eventId);
  postCapi({
    eventName: "ViewContent",
    eventId,
    contentName: content.contentName,
    contentCategory: content.contentCategory,
    contentIds: content.contentIds,
    contentType: "product",
    ...(typeof content.value === "number" ? { value: content.value, currency: "AUD" } : {}),
  });
}

/** Lead when an enquiry form, Lex chat or Lachie demo has contact details. */
export function trackMarketingLead(input: { source: LeadSource; email?: string; phone?: string; contentName: string; skipGa?: boolean }): void {
  const email = input.email?.trim();
  const phone = input.phone?.trim();
  if (!email && !phone) return;
  if (!marketingAllowedHere()) return;
  const key = `lead:${input.source}:${shortKey(`${email || ""}|${phone || ""}`)}`;
  if (!once(key)) return;
  const eventId = newEventId();
  // Mia's lead form already sends generate_lead via track("lead_captured").
  if (!input.skipGa) sendGa4("generate_lead", { method: input.source, content_name: input.contentName });
  sendPixel("Lead", { content_name: input.contentName, content_category: input.source }, eventId);
  postCapi({
    eventName: "Lead",
    eventId,
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    contentName: input.contentName,
    contentCategory: input.source,
  });
}

export function trackMarketingSchedule(): void {
  if (!marketingAllowedHere()) return;
  if (!once("schedule")) return;
  const eventId = newEventId();
  sendGa4("schedule", { method: "calendly" });
  sendPixel("Schedule", { content_name: "Calendly call" }, eventId);
  postCapi({ eventName: "Schedule", eventId, contentName: "Calendly call" });
}

/**
 * Browser Purchase on the existing GA4 tag, plus the Meta pixel.
 * The server webhook sends the matching Conversions API event with the same
 * event id (purchase_<checkout session id>), so this does not POST.
 */
export function trackMarketingPurchase(input: {
  eventId: string;
  transactionId: string;
  value: number;
  contentName: string;
  contentId: string;
  contentCategory: "blueprint" | "website";
}): void {
  if (!marketingAllowedHere()) return;
  if (!once(`purchase:${input.eventId}`)) return;
  sendGa4("purchase", {
    transaction_id: input.transactionId,
    value: input.value,
    currency: "AUD",
    items: [{
      item_id: input.contentId,
      item_name: input.contentName,
      item_category: input.contentCategory,
      price: input.value,
      quantity: 1,
    }],
  });
  sendPixel("Purchase", {
    value: input.value,
    currency: "AUD",
    content_name: input.contentName,
    content_ids: [input.contentId],
    content_type: "product",
  }, input.eventId);
}
