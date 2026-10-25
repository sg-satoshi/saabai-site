/**
 * Public marketing analytics config for saabai.ai.
 * Safe to import from client components: only NEXT_PUBLIC ids, no access token.
 * The pixel no-ops when its id is missing or the wrong shape.
 * GA4 events use the measurement id already loaded on the page.
 */
import { GA_ID, gaHostMode, gaPathAllowed } from "../ga";
import { isTier, TIERS } from "../blueprint";

const GA_RE = /^G-[A-Z0-9]{4,}$/;
const PIXEL_RE = /^\d{5,20}$/;

function clean(value: string | undefined): string {
  return (value || "").trim();
}

/**
 * GA4 measurement id for marketing events.
 * NEXT_PUBLIC_GA4_ID is optional. When it is unset, invalid, or a different
 * property, events use the tag already on the page (GA_ID) so gtag is not loaded twice.
 */
export function ga4MeasurementId(): string {
  const value = clean(process.env.NEXT_PUBLIC_GA4_ID);
  if (GA_RE.test(value) && value === GA_ID) return value;
  return GA_ID;
}

export function metaPixelId(): string {
  const value = clean(process.env.NEXT_PUBLIC_META_PIXEL_ID);
  return PIXEL_RE.test(value) ? value : "";
}

export function marketingHostMode(hostname: string): "prod" | "preview" | null {
  return gaHostMode(hostname);
}

export function marketingPathAllowed(pathname: string): boolean {
  return gaPathAllowed(pathname);
}

export type ViewContent = {
  contentName: string;
  contentCategory: "pricing" | "demo";
  contentIds: string[];
  value?: number;
};

/** Pricing, tier and demo pages. PageView still covers every other public page. */
export function viewContentFor(pathname: string, search = ""): ViewContent | null {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname || "/";
  if (path === "/websites") {
    return {
      contentName: "Website care plans",
      contentCategory: "pricing",
      contentIds: ["presence", "growth", "signature"],
    };
  }
  if (path === "/services") {
    return {
      contentName: "Saabai services and pricing",
      contentCategory: "pricing",
      contentIds: ["websites", "blueprint"],
    };
  }
  if (path === "/blueprint") {
    return {
      contentName: "Saabai Blueprint",
      contentCategory: "pricing",
      contentIds: ["blueprint_starter", "blueprint_pro", "blueprint_business"],
    };
  }
  if (path === "/blueprint/checkout") {
    const tier = new URLSearchParams(search).get("tier");
    if (isTier(tier)) {
      const info = TIERS[tier];
      return {
        contentName: `Saabai Blueprint ${info.name}`,
        contentCategory: "pricing",
        contentIds: [`blueprint_${tier}`],
        value: info.price,
      };
    }
    return { contentName: "Saabai Blueprint", contentCategory: "pricing", contentIds: ["blueprint"] };
  }
  if (path === "/legal") {
    return { contentName: "Legal AI demo", contentCategory: "demo", contentIds: ["lex", "lachie"] };
  }
  if (path === "/ai-chatbot-law-firms") {
    return { contentName: "Law firm chatbot demo", contentCategory: "demo", contentIds: ["lex", "lachie"] };
  }
  return null;
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// Australian mobiles and landlines, with or without +61. Prices and short numbers do not match.
const PHONE_RE = /(?:\+61[\s-]?|\b0)(?:4\d{2}[\s-]?\d{3}[\s-]?\d{3}|[2378][\s-]?\d{4}[\s-]?\d{4})\b/;

/** Email or Australian phone volunteered in a message. Empty when neither is present. */
export function contactInText(text: string): { email?: string; phone?: string } {
  if (!text) return {};
  const email = text.match(EMAIL_RE)?.[0];
  const phone = text.match(PHONE_RE)?.[0];
  return { ...(email ? { email } : {}), ...(phone ? { phone } : {}) };
}

export function isCalendlyScheduledMessage(origin: string, data: unknown): boolean {
  if (origin !== "https://calendly.com") return false;
  if (!data || typeof data !== "object") return false;
  return (data as { event?: unknown }).event === "calendly.event_scheduled";
}

export function readCookie(header: string | null | undefined, name: string): string | undefined {
  if (!header) return;
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = header.match(new RegExp(`(?:^|;\\s*)${safe}=([^;]*)`));
  if (!match) return;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

/** Meta click id cookie. Uses the existing _fbc cookie, or builds one from fbclid. */
export function fbcValue(existing: string | undefined, search: string, now = Date.now()): string | undefined {
  if (existing && /^fb\.1\.\d+\..{1,180}$/.test(existing)) return existing;
  const fbclid = new URLSearchParams(search).get("fbclid");
  if (!fbclid || fbclid.length > 180) return;
  return `fb.1.${now}.${fbclid}`;
}

export function cleanMetaCookie(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  const trimmed = value.trim();
  if (!/^fb\.1\.\d+\..{1,180}$/.test(trimmed)) return;
  return trimmed;
}
