/** Deep-linkable client portal pages via ?page= */
export const PORTAL_PAGE_IDS = [
  "overview",
  "projects",
  "blueprint",
  "lex-agent",
  "leads",
  "review-queue",
  "invoices",
  "requests",
  "upgrades",
  "account",
  "manage-agent",
] as const;

export type PortalPageId = (typeof PORTAL_PAGE_IDS)[number];

/** Account > Requests in the client portal. */
export const PORTAL_REQUESTS_HREF = "/client-portal?page=requests";

export function portalPageFromSearchParam(value: string | null | undefined): PortalPageId {
  if (value && (PORTAL_PAGE_IDS as readonly string[]).includes(value)) {
    return value as PortalPageId;
  }
  return "overview";
}
