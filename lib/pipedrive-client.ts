// Pipedrive CRM client — order status lookup for Rex

const PIPEDRIVE_BASE = "https://api.pipedrive.com/v1";

const STAGE_MESSAGES: Record<string, string> = {
  "New Order":                  "has been received and is in the queue — the team will get onto it shortly",
  "Waiting On Material":        "is waiting on materials to arrive before we can start cutting — we'll move it straight into production once they're in",
  "Production":                 "is currently in production",
  "Ready for Pick Up/Delivery": "is ready to go — you can come in and pick it up, or your delivery is on its way",
  "Dropship":                   "is being dispatched directly from our supplier and will be on its way to you soon",
  "Completed":                  "has been completed",
};

export interface OrderStatus {
  found: boolean;
  orderNumber?: string;
  status?: string;
  message?: string;
  error?: string;
}

/** Extract the numeric part from an order number, e.g. "HP-5089" → "5089", "PLON-36135" → "36135" */
function extractNumber(raw: string): string {
  const match = raw.match(/(\d+)$/);
  return match ? match[1] : raw;
}

/** Known order prefixes — bare numbers default to PLON- */
const KNOWN_PREFIXES = ["PLON-", "HP-", "EXP-"];

export async function lookupOrder(orderNumber: string): Promise<OrderStatus> {
  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return { found: false, error: "Order lookup unavailable" };

  const raw = orderNumber.trim().toUpperCase();
  const hasPrefix = KNOWN_PREFIXES.some(p => raw.startsWith(p));
  // Full normalised term (for display and fallback matching)
  const term = hasPrefix ? raw : `PLON-${raw}`;
  // Numeric part only — used as the search term to match across all order types
  const numericPart = extractNumber(term);

  try {
    // Search the full Pipedrive database (no fields filter) using just the number
    // so HP-, EXP-, and PLON- deals all surface regardless of how their titles are structured
    const searchRes = await fetch(
      `${PIPEDRIVE_BASE}/deals/search?term=${encodeURIComponent(numericPart)}&exact_match=false&limit=20&api_token=${token}`
    );
    if (!searchRes.ok) return { found: false, error: `Search failed (${searchRes.status})` };

    const searchData = await searchRes.json();
    const items: any[] = searchData?.data?.items ?? [];

    // Prefer a deal whose title contains the full term (e.g. "HP-5089")
    // Fall back to any deal whose title contains just the numeric part
    let match = items.find(i =>
      typeof i.item?.title === "string" &&
      i.item.title.toUpperCase().includes(term)
    );
    if (!match) {
      match = items.find(i =>
        typeof i.item?.title === "string" &&
        i.item.title.includes(numericPart)
      );
    }

    if (!match) return { found: false };

    // Use the deal title as the display label if it's more descriptive than our normalised term
    const dealTitle: string = match.item?.title ?? term;

    // Stage name is returned directly in the search result — no extra API call needed
    const stageName: string = match.item?.stage?.name ?? "";

    if (!stageName) {
      return { found: true, orderNumber: dealTitle, status: "Unknown", message: `Order ${dealTitle} was found but we couldn't read the current status — please call us on (07) 5564 6744 for a quick update.` };
    }

    // Display name overrides — fix formatting for stages with slashes or awkward casing
    const DISPLAY_NAMES: Record<string, string> = {
      "Ready for Pick Up/Delivery": "Ready For Pick-Up Or Delivery",
    };
    const titleCased = DISPLAY_NAMES[stageName] ??
      stageName.replace(/\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1));
    const detail = STAGE_MESSAGES[stageName];
    const message = detail
      ? `Order **${dealTitle}** — **${titleCased}** — ${detail}.`
      : `Order **${dealTitle}** is currently **${titleCased}**.`;

    return { found: true, orderNumber: dealTitle, status: stageName, message };
  } catch (err) {
    return { found: false, error: String(err) };
  }
}
