/**
 * Members-only Wholesale Homes files (brochures, rental appraisals, and the
 * marketing flyers that have the package price printed on them). They live in
 * private/wholesale-homes (NOT public/), so they're only reachable through
 * /api/wholesale-files/<name>, which checks the session first.
 *
 * Only names on this allow-list are ever served; anything else is a 404.
 */
export const WH_FILES_DIR = "private/wholesale-homes";
export const WH_FILES_ROUTE = "/api/wholesale-files";

export const WH_MEMBER_FILES: Record<string, string> = {
  "kyabram-greens-lot-32-brochure.pdf": "application/pdf",
  "kyabram-greens-lot-32-rental-appraisal.pdf": "application/pdf",
  "kyabram-greens.jpg": "image/jpeg",
  "the-willows.jpg": "image/jpeg",
  "orchardfield.jpg": "image/jpeg",
  "the-outlook.jpg": "image/jpeg",
  "woodlands.jpg": "image/jpeg",
  "winterbrook.jpg": "image/jpeg",
};

export function memberFileUrl(name: keyof typeof WH_MEMBER_FILES | string): string {
  return `${WH_FILES_ROUTE}/${name}`;
}
