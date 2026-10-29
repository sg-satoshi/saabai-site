/**
 * Large Lex uploads (over Vercel's 4.5 MB request body limit) go straight from the browser to Vercel
 * Blob with a client-upload token from /api/lex-upload-token (Lex session required). The reading route
 * then fetches the file once and deletes the blob straight away, so nothing is kept: the Lex
 * "files are not stored" promise still holds.
 *
 * Off unless LEX_BLOB_UPLOADS=1 and BLOB_READ_WRITE_TOKEN are both set. Small files always use the
 * direct form upload.
 */
import { createHash } from "node:crypto";

import { LEX_MAX_FILE_BYTES } from "./lex-upload-limits";
export { LEX_MAX_FILE_BYTES, LEX_MAX_TOTAL_BYTES, LEX_DIRECT_MAX_BYTES } from "./lex-upload-limits";
export const LEX_UPLOAD_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];

export function lexBlobUploadsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.LEX_BLOB_UPLOADS === "1" && !!env.BLOB_READ_WRITE_TOKEN;
}

/** Per-user temp folder. Hashed so the email never appears in a blob path. */
export function lexBlobFolder(email: string): string {
  const h = createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 24);
  return `lex-tmp/${h}/`;
}

/** Only Vercel Blob URLs inside the caller's own temp folder. Blocks fetching anything else (SSRF). */
export function isAllowedLexBlobUrl(raw: string, folder: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.port || u.username || u.password) return false;
    if (!/^[a-z0-9]+\.(public|private)\.blob\.vercel-storage\.com$/.test(u.hostname)) return false;
    const path = decodeURIComponent(u.pathname);
    return path.startsWith(`/${folder}`) && !path.includes("..");
  } catch {
    return false;
  }
}

export type BlobRef = { url: string; name: string };

export function parseBlobRefs(raw: unknown): BlobRef[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter((b) => b && typeof b.url === "string" && typeof b.name === "string").slice(0, 20).map((b) => ({ url: b.url, name: String(b.name).slice(0, 120) }));
  } catch {
    return [];
  }
}

type Deps = { fetch: typeof fetch; del: (url: string) => Promise<void> };

async function defaultDeps(): Promise<Deps> {
  const { del } = await import("@vercel/blob");
  return { fetch, del: (url) => del(url) };
}

/** Fetches one uploaded blob into memory and deletes it, whatever happens. */
export async function takeLexBlob(ref: BlobRef, folder: string, deps?: Deps): Promise<{ name: string; buffer: Buffer } | { name: string; error: "too-large" | "unreadable" }> {
  if (!isAllowedLexBlobUrl(ref.url, folder)) return { name: ref.name, error: "unreadable" };
  const d = deps ?? (await defaultDeps());
  try {
    const res = await d.fetch(ref.url, { redirect: "error", cache: "no-store" });
    if (!res.ok) return { name: ref.name, error: "unreadable" };
    const len = Number(res.headers.get("content-length") ?? "0");
    if (len > LEX_MAX_FILE_BYTES) return { name: ref.name, error: "too-large" };
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > LEX_MAX_FILE_BYTES) return { name: ref.name, error: "too-large" };
    return { name: ref.name, buffer };
  } catch {
    return { name: ref.name, error: "unreadable" };
  } finally {
    await d.del(ref.url).catch((e) => console.error("[lex-upload] blob delete failed", e instanceof Error ? e.name : "error"));
  }
}

export type LexInputFile = { name: string; size: number; read: () => Promise<Buffer> } | { name: string; size: number; error: "too-large" | "unreadable" };

/**
 * Every uploaded file for a request: form files plus any large files sent by Blob reference.
 * Blob refs need a resolved Lex user (the folder is theirs) and are deleted as soon as they are read.
 */
export async function collectLexFiles(form: FormData, field: string, folder: string | null, deps?: Deps): Promise<LexInputFile[]> {
  const out: LexInputFile[] = form.getAll(field).filter((f): f is File => f instanceof File)
    .map((f) => ({ name: f.name.slice(0, 120), size: f.size, read: async () => Buffer.from(await f.arrayBuffer()) }));
  const refs = parseBlobRefs(form.get("blobs"));
  for (const ref of refs) {
    if (!folder) { out.push({ name: ref.name, size: 0, error: "unreadable" }); continue; }
    const r = await takeLexBlob(ref, folder, deps);
    if ("error" in r) out.push({ name: r.name, size: 0, error: r.error });
    else { const b = r.buffer; out.push({ name: r.name, size: b.length, read: async () => b }); }
  }
  return out;
}

/** The temp folder for the signed-in Lex user, or null. */
export async function lexFolderForRequest(req: Request): Promise<string | null> {
  const { resolveReviewActor } = await import("./lex-review-access");
  const actor = await resolveReviewActor(req).catch(() => null);
  if (!actor) return null;
  return lexBlobFolder(actor.kind === "firm" ? actor.email : `admin:${actor.id}`);
}
