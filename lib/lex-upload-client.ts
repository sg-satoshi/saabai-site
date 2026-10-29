/**
 * Browser side of Lex uploads. Files up to 4 MB go in the form body as before. Bigger files (up to
 * 25 MB) go straight to Vercel Blob with a token from /api/lex-upload-token and are passed to the
 * reading route by reference; that route deletes them as soon as it has read them.
 */
import { LEX_DIRECT_MAX_BYTES, LEX_MAX_FILE_BYTES, LEX_MAX_TOTAL_BYTES } from "./lex-upload-limits";

export const OCR_NOTE = "Read from a scan, please check the details.";
export const LARGE_OFF_MESSAGE = "Files over 4 MB can't be uploaded yet. Try a smaller copy, or split the document.";

export class LexUploadError extends Error {}

export async function addLexFiles(fd: FormData, field: string, files: File[]): Promise<void> {
  const total = files.reduce((n, f) => n + f.size, 0);
  if (files.some((f) => f.size > LEX_MAX_FILE_BYTES)) throw new LexUploadError("That file is over 25 MB. Upload a smaller file.");
  if (total > LEX_MAX_TOTAL_BYTES) throw new LexUploadError("Those files are over 50 MB together. Upload fewer at a time.");
  const big = files.filter((f) => f.size > LEX_DIRECT_MAX_BYTES);
  files.filter((f) => f.size <= LEX_DIRECT_MAX_BYTES).forEach((f) => fd.append(field, f));
  if (!big.length) return;
  const info = await fetch("/api/lex-upload-token", { method: "GET" }).then((r) => (r.ok ? r.json() : null)).catch(() => null) as { enabled?: boolean; folder?: string } | null;
  if (!info?.enabled || !info.folder) throw new LexUploadError(LARGE_OFF_MESSAGE);
  const { upload } = await import("@vercel/blob/client");
  const refs: Array<{ url: string; name: string }> = [];
  for (const f of big) {
    const safe = f.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80) || "document";
    const b = await upload(`${info.folder}${safe}`, f, { access: "public", handleUploadUrl: "/api/lex-upload-token", contentType: f.type || undefined });
    refs.push({ url: b.url, name: f.name.slice(0, 120) });
  }
  fd.append("blobs", JSON.stringify(refs));
}
