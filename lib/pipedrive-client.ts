// Pipedrive CRM client — order status lookup + Rex lead creation

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

// ── Rex Lead → Pipedrive Deal ─────────────────────────────────────────────────

export interface RexLeadParams {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;        // company / organisation name
  quoteDetails?: string;   // AI-extracted product details
  price?: string;          // e.g. "$185.50 Ex GST"
  priceValue?: number;     // numeric AUD
  summary?: string;        // AI conversation summary
  source?: string;         // rex_mid_chat | rex_quote_email etc.
  device?: string;         // mobile | desktop
}

/**
 * Find or create a Pipedrive person by email, then create a deal.
 * Fire-and-forget — never throws, never blocks lead capture.
 * Controlled by:
 *   PIPEDRIVE_API_TOKEN  — existing token
 *   PIPEDRIVE_PIPELINE_ID — pipeline for Rex leads (defaults to 1)
 *   PIPEDRIVE_STAGE_ID    — initial stage ID (defaults to first stage found)
 */
export async function createRexDeal(params: RexLeadParams): Promise<void> {
  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return;

  const pipelineId = process.env.PIPEDRIVE_PIPELINE_ID ?? "1";
  const stageId    = process.env.PIPEDRIVE_STAGE_ID;

  try {
    // 1. Find or create organisation
    let orgId: number | undefined;

    if (params.company) {
      const orgSearchRes = await fetch(
        `${PIPEDRIVE_BASE}/organizations/search?term=${encodeURIComponent(params.company)}&exact_match=false&limit=1&api_token=${token}`
      );
      if (orgSearchRes.ok) {
        const orgSearchData = await orgSearchRes.json();
        const existingOrg = orgSearchData?.data?.items?.[0]?.item;
        if (existingOrg?.id) {
          orgId = existingOrg.id;
        }
      }

      if (!orgId) {
        const orgCreateRes = await fetch(`${PIPEDRIVE_BASE}/organizations?api_token=${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: params.company }),
        });
        if (orgCreateRes.ok) {
          const orgCreateData = await orgCreateRes.json();
          orgId = orgCreateData?.data?.id;
        }
      }
    }

    // 2. Find or create person
    let personId: number | undefined;

    if (params.email) {
      // Search for existing person by email
      const searchRes = await fetch(
        `${PIPEDRIVE_BASE}/persons/search?term=${encodeURIComponent(params.email)}&fields=email&exact_match=true&limit=1&api_token=${token}`
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const existing = searchData?.data?.items?.[0]?.item;
        if (existing?.id) {
          personId = existing.id;
        }
      }

      // Create person if not found
      if (!personId) {
        const createRes = await fetch(`${PIPEDRIVE_BASE}/persons?api_token=${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name:   params.name ?? params.email,
            email:  [{ value: params.email, primary: true }],
            phone:  params.phone ? [{ value: params.phone, primary: true }] : undefined,
            org_id: orgId,
          }),
        });
        if (createRes.ok) {
          const createData = await createRes.json();
          personId = createData?.data?.id;
        }
      }
    }

    // 2. Build deal title — concise enough to scan in a pipeline view
    const shortQuote = params.quoteDetails
      ? params.quoteDetails.split("\n")[0].slice(0, 50)
      : "Rex Quote";
    const priceLabel = params.price ?? (params.priceValue ? `$${params.priceValue}` : "");
    const customerLabel = params.name ?? params.email ?? "Anonymous";
    const dealTitle = `Rex: ${customerLabel} — ${shortQuote}${priceLabel ? ` — ${priceLabel}` : ""}`;

    // 3. Create deal
    const dealBody: Record<string, unknown> = {
      title:       dealTitle,
      pipeline_id: Number(pipelineId),
      value:       params.priceValue ?? 0,
      currency:    "AUD",
      status:      "open",
    };
    if (stageId)  dealBody.stage_id  = Number(stageId);
    if (personId) dealBody.person_id = personId;
    if (orgId)    dealBody.org_id    = orgId;

    const dealRes = await fetch(`${PIPEDRIVE_BASE}/deals?api_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dealBody),
    });
    if (!dealRes.ok) return;

    const dealData = await dealRes.json();
    const dealId: number | undefined = dealData?.data?.id;
    if (!dealId) return;

    // 4. Add a note with full context
    const noteLines = [
      `📥 Source: ${params.source ?? "rex"}${params.device ? ` (${params.device})` : ""}`,
      params.company ? `🏢 Company: ${params.company}` : null,
      params.quoteDetails ? `📦 Quote: ${params.quoteDetails}` : null,
      priceLabel ? `💰 Price: ${priceLabel} Ex GST` : null,
      params.summary ? `\n💬 Summary: ${params.summary}` : null,
    ].filter(Boolean).join("\n");

    await fetch(`${PIPEDRIVE_BASE}/notes?api_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content:  noteLines,
        deal_id:  dealId,
        pinned_to_deal_flag: true,
      }),
    });
  } catch {
    // Never throw — CRM write failure must not affect lead capture
  }
}

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
