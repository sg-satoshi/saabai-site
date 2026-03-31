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

export async function lookupOrder(orderNumber: string): Promise<OrderStatus> {
  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return { found: false, error: "Order lookup unavailable" };

  const raw = orderNumber.trim().toUpperCase();
  // Normalise — prepend PLON- if customer omitted the prefix
  const term = raw.startsWith("PLON-") ? raw : `PLON-${raw}`;

  try {
    const searchRes = await fetch(
      `${PIPEDRIVE_BASE}/deals/search?term=${encodeURIComponent(term)}&fields=title&exact_match=false&api_token=${token}`
    );
    if (!searchRes.ok) return { found: false, error: `Search failed (${searchRes.status})` };

    const searchData = await searchRes.json();
    const items: any[] = searchData?.data?.items ?? [];

    // Find first deal whose title contains the order number
    const match = items.find(i =>
      typeof i.item?.title === "string" &&
      i.item.title.toUpperCase().includes(term)
    );

    if (!match) return { found: false };

    // Stage name is returned directly in the search result — no extra API call needed
    const stageName: string = match.item?.stage?.name ?? "";

    if (!stageName) {
      return { found: true, orderNumber: term, status: "Unknown", message: `Order ${term} was found but we couldn't read the current status — please call us on (07) 5564 6744 for a quick update.` };
    }

    const detail = STAGE_MESSAGES[stageName];
    const message = detail
      ? `Order ${term} ${detail}.`
      : `Order ${term} is currently at: ${stageName}.`;

    return { found: true, orderNumber: term, status: stageName, message };
  } catch (err) {
    return { found: false, error: String(err) };
  }
}
