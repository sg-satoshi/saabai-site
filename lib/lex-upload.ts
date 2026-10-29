/**
 * Large Lex uploads (over Vercel's 4.5 MB request body limit) go straight from the browser to Vercel
 * Blob as PRIVATE blobs, with a client-upload token from /api/lex-upload-token (Lex session required).
 * The reading route reads each file once with the store token and deletes it straight away. Every
 * ref sent is deleted, even ones that are not read. An hourly cron (/api/cron/lex-tmp-sweep) deletes
 * anything under lex-tmp/ older than an hour, so a closed tab or a timed-out request can't leave a
 * file behind.
 *
 * Off unless LEX_BLOB_UPLOADS=1, BLOB_READ_WRITE_TOKEN and SAABAI_SESSION_SECRET are all set.
 * Small files always use the direct form upload.
 */
import { createHmac } from "node:crypto";
import { LEX_MAX_FILE_BYTES } from "./lex-upload-limits";
export { LEX_MAX_FILE_BYTES, LEX_MAX_TOTAL_BYTES, LEX_DIRECT_MAX_BYTES } from "./lex-upload-limits";

export const LEX_UPLOAD_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
export const LEX_TMP_PREFIX = "lex-tmp/";
export const LEX_TMP_MAX_AGE_MS = 60 * 60 * 1000;
/** Refs read per request. Any extra refs are still deleted. */
export const LEX_MAX_BLOB_REFS = 20;

type Env = Record<string, string | undefined>;

export function lexBlobUploadsEnabled(env: Env = process.env): boolean {
  return env.LEX_BLOB_UPLOADS === "1" && !!env.BLOB_READ_WRITE_TOKEN && !!env.SAABAI_SESSION_SECRET;
}

/** Per-user temp folder: HMAC of the user id keyed by SAABAI_SESSION_SECRET, so it can't be guessed or reversed. */
export function lexBlobFolder(userKey: string, secret: string | undefined = process.env.SAABAI_SESSION_SECRET): string | null {
  if (!secret) return null;
  const h = createHmac("sha256", secret).update(`lex-tmp:${userKey.trim().toLowerCase()}`).digest("hex").slice(0, 32);
  return `${LEX_TMP_PREFIX}${h}/`;
}

/** Our own Blob store host, from the store id inside BLOB_READ_WRITE_TOKEN (vercel_blob_rw_<storeId>_<secret>). */
export function lexBlobStoreHost(token: string | undefined = process.env.BLOB_READ_WRITE_TOKEN): string | null {
  const storeId = token?.split("_")[3];
  if (!storeId || !/^[A-Za-z0-9]+$/.test(storeId)) return null;
  return `${storeId.toLowerCase()}.private.blob.vercel-storage.com`;
}

function parsedBlobPath(raw: string, host: string | null): string | null {
  if (!host) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.port || u.username || u.password || u.hostname !== host) return null;
    const path = decodeURIComponent(u.pathname);
    return path.includes("..") ? null : path;
  } catch {
    return null;
  }
}

/** Only our own private store, inside the caller's own temp folder. Blocks fetching anything else (SSRF). */
export function isAllowedLexBlobUrl(raw: string, folder: string, host: string | null = lexBlobStoreHost()): boolean {
  const path = parsedBlobPath(raw, host);
  return !!path && path.startsWith(`/${folder}`);
}

/** Any Lex temp blob in our own store: safe to delete (URLs carry an unguessable random suffix). */
export function isLexTmpUrl(raw: string, host: string | null = lexBlobStoreHost()): boolean {
  const path = parsedBlobPath(raw, host);
  return !!path && path.startsWith(`/${LEX_TMP_PREFIX}`);
}

export type BlobRef = { url: string; name: string };

/** Every ref sent, with no cap (the cap applies to reading, not deleting). */
export function parseBlobRefs(raw: unknown): BlobRef[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter((b) => b && typeof b.url === "string").map((b) => ({ url: b.url, name: String(b.name ?? "document").slice(0, 120) }));
  } catch {
    return [];
  }
}

export type BlobDeps = {
  /** Reads a private blob with the store token. null when missing. */
  read: (url: string) => Promise<{ size: number; bytes: () => Promise<Buffer> } | null>;
  del: (urls: string[]) => Promise<void>;
};

async function defaultDeps(): Promise<BlobDeps> {
  const { get, del } = await import("@vercel/blob");
  return {
    read: async (url) => {
      const r = await get(url, { access: "private", useCache: false });
      if (!r || !r.stream) return null;
      return { size: r.blob.size, bytes: async () => Buffer.from(await new Response(r.stream).arrayBuffer()) };
    },
    del: (urls) => del(urls),
  };
}

async function safeDelete(urls: string[], d: BlobDeps): Promise<void> {
  const ours = urls.filter((u) => isLexTmpUrl(u));
  if (!ours.length) return;
  await d.del(ours).catch((e) => console.error("[lex-upload] blob delete failed", e instanceof Error ? e.name : "error"));
}

/** Reads one uploaded blob into memory. The caller deletes it (see collectLexFiles). */
async function readLexBlob(ref: BlobRef, folder: string, d: BlobDeps): Promise<{ name: string; buffer: Buffer } | { name: string; error: "too-large" | "unreadable" }> {
  if (!isAllowedLexBlobUrl(ref.url, folder)) return { name: ref.name, error: "unreadable" };
  try {
    const r = await d.read(ref.url);
    if (!r) return { name: ref.name, error: "unreadable" };
    if (r.size > LEX_MAX_FILE_BYTES) return { name: ref.name, error: "too-large" };
    const buffer = await r.bytes();
    if (buffer.length > LEX_MAX_FILE_BYTES) return { name: ref.name, error: "too-large" };
    return { name: ref.name, buffer };
  } catch {
    return { name: ref.name, error: "unreadable" };
  }
}

export type LexInputFile = { name: string; size: number; read: () => Promise<Buffer> } | { name: string; size: number; error: "too-large" | "unreadable" };

/**
 * Every uploaded file for a request: form files plus any large files sent by Blob reference.
 * Refs are ignored while the flag is off. When on, the first LEX_MAX_BLOB_REFS refs in the caller's
 * own folder are read, and EVERY ref (read or not, with or without a folder) is deleted before return.
 */
export async function collectLexFiles(form: FormData, field: string, folder: string | null, deps?: BlobDeps, env: Env = process.env): Promise<LexInputFile[]> {
  const out: LexInputFile[] = form.getAll(field).filter((f): f is File => f instanceof File)
    .map((f) => ({ name: f.name.slice(0, 120), size: f.size, read: async () => Buffer.from(await f.arrayBuffer()) }));
  if (!lexBlobUploadsEnabled(env)) return out;
  const refs = parseBlobRefs(form.get("blobs"));
  if (!refs.length) return out;
  const d = deps ?? (await defaultDeps());
  try {
    refs.forEach((ref, i) => { if (i >= LEX_MAX_BLOB_REFS) out.push({ name: ref.name, size: 0, error: "unreadable" }); });
    for (const ref of refs.slice(0, LEX_MAX_BLOB_REFS)) {
      if (!folder) { out.push({ name: ref.name, size: 0, error: "unreadable" }); continue; }
      const r = await readLexBlob(ref, folder, d);
      if ("error" in r) out.push({ name: r.name, size: 0, error: r.error });
      else { const b = r.buffer; out.push({ name: r.name, size: b.length, read: async () => b }); }
    }
  } finally {
    await safeDelete(refs.map((r) => r.url), d);
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

export type SweepDeps = {
  list: (o: { prefix: string; cursor?: string }) => Promise<{ blobs: Array<{ url: string; uploadedAt: Date }>; cursor?: string; hasMore: boolean }>;
  del: (urls: string[]) => Promise<void>;
};

/** Deletes everything under lex-tmp/ uploaded more than an hour ago. */
export async function sweepLexTmp(now = Date.now(), deps?: SweepDeps): Promise<{ deleted: number; kept: number }> {
  const d: SweepDeps = deps ?? (await import("@vercel/blob").then(({ list, del }) => ({ list: (o: { prefix: string; cursor?: string }) => list({ ...o, limit: 1000 }), del: (u: string[]) => del(u) })));
  let cursor: string | undefined;
  let deleted = 0, kept = 0;
  for (let page = 0; page < 50; page++) {
    const r = await d.list({ prefix: LEX_TMP_PREFIX, cursor });
    const old = r.blobs.filter((b) => now - new Date(b.uploadedAt).getTime() > LEX_TMP_MAX_AGE_MS).map((b) => b.url);
    kept += r.blobs.length - old.length;
    if (old.length) { await d.del(old); deleted += old.length; }
    if (!r.hasMore || !r.cursor) break;
    cursor = r.cursor;
  }
  return { deleted, kept };
}

export { LEX_BLOB_PRIVACY_COPY } from "./lex-upload-copy";
