/** Client-side checks before attaching files to a portal request. No network. */
export const PORTAL_REQUEST_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export const PORTAL_REQUEST_MAX_FILES = 5;
export const PORTAL_REQUEST_MAX_BYTES = 10 * 1024 * 1024;

export type PortalRequestFilePick =
  | { ok: true; files: File[] }
  | { ok: false; error: string; files: File[] };

/** Merges newly picked files into the current list with type/size/count checks. */
export function pickPortalRequestFiles(
  current: File[],
  incoming: FileList | File[] | null | undefined,
  opts?: { maxFiles?: number; maxBytes?: number; types?: readonly string[] },
): PortalRequestFilePick {
  if (!incoming) return { ok: true, files: current };
  const maxFiles = opts?.maxFiles ?? PORTAL_REQUEST_MAX_FILES;
  const maxBytes = opts?.maxBytes ?? PORTAL_REQUEST_MAX_BYTES;
  const types = opts?.types ?? PORTAL_REQUEST_FILE_TYPES;
  const next = [...current];
  let error = "";
  const list = Array.isArray(incoming) ? incoming : Array.from(incoming);
  for (const f of list) {
    if (!types.includes(f.type)) {
      error = "Files need to be PNG, JPG, WebP, GIF or PDF.";
      continue;
    }
    if (f.size > maxBytes) {
      error = `${f.name} is over 10 MB.`;
      continue;
    }
    if (next.length >= maxFiles) {
      error = `You can attach up to ${maxFiles} files.`;
      break;
    }
    next.push(f);
  }
  if (error) return { ok: false, error, files: next };
  return { ok: true, files: next };
}
