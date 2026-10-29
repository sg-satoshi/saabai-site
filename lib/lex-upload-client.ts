/**
 * Browser side of Lex uploads. Files up to 4 MB go in the form body as before. Bigger files (up to
 * 25 MB) go straight to Vercel Blob with a token from /api/lex-upload-token and are passed to the
 * reading route by reference; that route deletes them as soon as it has read them.
 */
import { LEX_DIRECT_MAX_BYTES, LEX_MAX_FILE_BYTES, LEX_MAX_TOTAL_BYTES } from "./lex-upload-limits";

export const OCR_NOTE = "Read from a scan, please check the details.";
export const LARGE_OFF_MESSAGE = "Files over 4 MB can't be uploaded yet. Try a smaller copy, or split the document.";

export class LexUploadError extends Error {}

/** Shown when a reading route hits Vercel's 300 s limit (504) instead of the generic error. */
export const TIMEOUT_MESSAGE = "Lex ran out of time reading this file (5 minute limit). Long scans take the longest. Try fewer pages at a time, or split the document.";

/** The 504 a timed-out function returns, or null. */
export function timeoutMessage(res: { status: number }): string | null {
  return res.status === 504 ? TIMEOUT_MESSAGE : null;
}

/** Whether large uploads are on (the token route answers 404 while LEX_BLOB_UPLOADS is off), and the caller's folder. */
export async function lexLargeUploadInfo(): Promise<{ enabled: boolean; folder?: string }> {
  const r = await fetch("/api/lex-upload-token", { method: "GET" }).catch(() => null);
  if (!r || !r.ok) return { enabled: false };
  const j = (await r.json().catch(() => null)) as { enabled?: boolean; folder?: string } | null;
  return j?.enabled && j.folder ? { enabled: true, folder: j.folder } : { enabled: false };
}

export async function addLexFiles(fd: FormData, field: string, files: File[]): Promise<void> {
  const total = files.reduce((n, f) => n + f.size, 0);
  if (files.some((f) => f.size > LEX_MAX_FILE_BYTES)) throw new LexUploadError("That file is over 25 MB. Upload a smaller file.");
  if (total > LEX_MAX_TOTAL_BYTES) throw new LexUploadError("Those files are over 50 MB together. Upload fewer at a time.");
  const big = files.filter((f) => f.size > LEX_DIRECT_MAX_BYTES);
  files.filter((f) => f.size <= LEX_DIRECT_MAX_BYTES).forEach((f) => fd.append(field, f));
  if (!big.length) return;
  const info = await lexLargeUploadInfo();
  if (!info?.enabled || !info.folder) throw new LexUploadError(LARGE_OFF_MESSAGE);
  const { upload } = await import("@vercel/blob/client");
  const refs: Array<{ url: string; name: string }> = [];
  for (const f of big) {
    const safe = f.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80) || "document";
    const b = await upload(`${info.folder}${safe}`, f, { access: "private", handleUploadUrl: "/api/lex-upload-token", contentType: f.type || undefined });
    refs.push({ url: b.url, name: f.name.slice(0, 120) });
  }
  fd.append("blobs", JSON.stringify(refs));
}
