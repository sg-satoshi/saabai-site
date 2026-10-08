/**
 * Client change / feature requests (Saabai Client Portal).
 *
 * Stored in Upstash Redis as one hash: saabai:client-requests  { [id]: JSON }.
 * Volumes are tiny (a handful of clients), so listing + filtering in memory
 * is simpler than maintaining secondary indexes.
 *
 * Access control is NOT done here. Client routes must pass the session's
 * clientId; admin routes must check admin first.
 */
import { randomUUID } from "crypto";
import { getRedis } from "./redis";

export const REQUESTS_KEY = "saabai:client-requests";

export const REQUEST_STATUSES = ["received", "in_progress", "done"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const STATUS_LABELS: Record<RequestStatus, string> = {
  received: "Received",
  in_progress: "In progress",
  done: "Done",
};

export const REQUEST_PRIORITIES = ["low", "normal", "high"] as const;
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];
export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

export const MAX_SCREENSHOTS = 3;
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
export const SCREENSHOT_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export interface ClientRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  siteId?: string;
  siteName?: string;
  title: string;
  description: string;
  priority: RequestPriority;
  screenshots: string[];
  status: RequestStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
  statusChangedAt?: string;
}

export interface NewRequestInput {
  title?: unknown;
  description?: unknown;
  priority?: unknown;
  screenshots?: unknown;
}

/** Blob folder for a client's screenshots. Stable and path-safe. */
export function blobFolderFor(clientId: string): string {
  const safe = clientId.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 64);
  return `client-requests/${safe || "unknown"}`;
}

/** Only accept screenshots this client uploaded to our Vercel Blob store. */
export function isAllowedScreenshotUrl(url: unknown, clientId: string): boolean {
  if (typeof url !== "string" || url.length > 1000) return false;
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname.endsWith(".public.blob.vercel-storage.com") &&
      u.pathname.startsWith(`/${blobFolderFor(clientId)}/`) &&
      !u.username && !u.password
    );
  } catch {
    return false;
  }
}

type Ok<T> = { ok: true; value: T };
type Err = { ok: false; error: string };

export function validateNewRequest(
  input: NewRequestInput,
  clientId: string
): Ok<{ title: string; description: string; priority: RequestPriority; screenshots: string[] }> | Err {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (title.length < 3) return { ok: false, error: "Please add a short title (at least 3 characters)." };
  if (title.length > 120) return { ok: false, error: "Please keep the title under 120 characters." };
  if (description.length < 10) return { ok: false, error: "Please describe the change in a little more detail." };
  if (description.length > 5000) return { ok: false, error: "Please keep the description under 5,000 characters." };

  let priority: RequestPriority = "normal";
  if (input.priority !== undefined && input.priority !== null && input.priority !== "") {
    if (!REQUEST_PRIORITIES.includes(input.priority as RequestPriority)) return { ok: false, error: "Invalid priority." };
    priority = input.priority as RequestPriority;
  }

  let screenshots: string[] = [];
  if (input.screenshots !== undefined && input.screenshots !== null) {
    if (!Array.isArray(input.screenshots)) return { ok: false, error: "Invalid screenshots." };
    if (input.screenshots.length > MAX_SCREENSHOTS) return { ok: false, error: `Up to ${MAX_SCREENSHOTS} screenshots please.` };
    if (!input.screenshots.every((u) => isAllowedScreenshotUrl(u, clientId))) return { ok: false, error: "Invalid screenshot." };
    screenshots = [...new Set(input.screenshots as string[])];
  }

  return { ok: true, value: { title, description, priority, screenshots } };
}

function parse(raw: unknown): ClientRequest | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as ClientRequest; } catch { return null; }
  }
  return raw as ClientRequest;
}

function requireRedis() {
  const redis = getRedis();
  if (!redis) throw new Error("Storage is not configured");
  return redis;
}

export async function createRequest(data: {
  clientId: string;
  clientName: string;
  clientEmail: string;
  siteId?: string;
  siteName?: string;
  title: string;
  description: string;
  priority: RequestPriority;
  screenshots: string[];
}): Promise<ClientRequest> {
  const redis = requireRedis();
  const now = new Date().toISOString();
  const req: ClientRequest = {
    id: randomUUID(),
    ...data,
    status: "received",
    createdAt: now,
    updatedAt: now,
    statusChangedAt: now,
  };
  await redis.hset(REQUESTS_KEY, { [req.id]: JSON.stringify(req) });
  return req;
}

export async function getRequest(id: string): Promise<ClientRequest | null> {
  if (!id || id.length > 64) return null;
  const redis = requireRedis();
  return parse(await redis.hget(REQUESTS_KEY, id));
}

export async function listRequests(filter: { clientId?: string; status?: RequestStatus } = {}): Promise<ClientRequest[]> {
  const redis = requireRedis();
  const raw = await redis.hgetall<Record<string, unknown>>(REQUESTS_KEY);
  if (!raw) return [];
  return Object.values(raw)
    .map(parse)
    .filter((r): r is ClientRequest => r !== null)
    .filter((r) => (filter.clientId ? r.clientId === filter.clientId : true))
    .filter((r) => (filter.status ? r.status === filter.status : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Admin update. Returns the updated record and whether the status changed. */
export async function updateRequest(
  id: string,
  updates: { status?: unknown; adminNote?: unknown }
): Promise<{ request: ClientRequest; statusChanged: boolean } | { error: string; code: 400 | 404 }> {
  const existing = await getRequest(id);
  if (!existing) return { error: "Request not found", code: 404 };

  const next: ClientRequest = { ...existing };
  let statusChanged = false;

  if (updates.status !== undefined) {
    if (!REQUEST_STATUSES.includes(updates.status as RequestStatus)) return { error: "Invalid status", code: 400 };
    if (updates.status !== existing.status) {
      next.status = updates.status as RequestStatus;
      next.statusChangedAt = new Date().toISOString();
      statusChanged = true;
    }
  }
  if (updates.adminNote !== undefined) {
    if (updates.adminNote !== null && typeof updates.adminNote !== "string") return { error: "Invalid note", code: 400 };
    const note = (updates.adminNote ?? "").trim();
    if (note.length > 2000) return { error: "Please keep the note under 2,000 characters.", code: 400 };
    next.adminNote = note || undefined;
  }
  next.updatedAt = new Date().toISOString();

  const redis = requireRedis();
  await redis.hset(REQUESTS_KEY, { [id]: JSON.stringify(next) });
  return { request: next, statusChanged };
}
