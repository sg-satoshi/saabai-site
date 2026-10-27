/**
 * Client change requests / support tickets (Client Portal + Mission Control).
 * Stored in Upstash Redis hash: saabai:client-requests { [id]: JSON }.
 * Comments/timeline live on the request record. Change log is separate.
 */
import { randomUUID } from "crypto";
import { getRedis } from "./redis";

export const REQUESTS_KEY = "saabai:client-requests";
export const REQUEST_SETTINGS_KEY = "saabai:request-settings"; // per-client clarifier on/off

export const REQUEST_TYPES = ["text_change", "new_feature", "bug", "other"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];
export const TYPE_LABELS: Record<RequestType, string> = {
  text_change: "Text change",
  new_feature: "New feature",
  bug: "Bug/broken",
  other: "Other",
};

export const REQUEST_PRIORITIES = ["low", "normal", "high", "critical"] as const;
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];
export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  critical: "Critical",
};

/** Default first-response targets (overridable by care plan metadata). */
export const RESPONSE_TARGETS: Record<RequestPriority, string> = {
  low: "3 business days",
  normal: "2 business days",
  high: "same day",
  critical: "within 1 hour",
};

export const REQUEST_STATUSES = [
  "new",
  "awaiting_client",
  "triaged",
  "in_progress",
  "qa",
  "blocked",
  "done",
  // legacy
  "received",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  awaiting_client: "Awaiting client",
  triaged: "Triaged",
  in_progress: "In progress",
  qa: "QA / Review",
  blocked: "Blocked",
  done: "Done",
  received: "New",
};

export const ASSIGNEES = ["chief_ai", "designer", "shane", "team"] as const;
export type RequestAssignee = (typeof ASSIGNEES)[number];
export const ASSIGNEE_LABELS: Record<RequestAssignee, string> = {
  chief_ai: "Chief AI",
  designer: "Designer",
  shane: "Shane",
  team: "Team",
};

export const MAX_SCREENSHOTS = 5;
export const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
export const SCREENSHOT_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];

export type TimelineAuthorKind = "client" | "admin" | "assistant" | "system";

export interface TimelineEntry {
  id: string;
  kind: "comment" | "status" | "internal_note" | "system" | "agreed_change";
  authorKind: TimelineAuthorKind;
  authorName: string;
  body: string;
  /** Internal notes never returned to clients. */
  internal?: boolean;
  createdAt: string;
}

export interface ClientRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  siteId?: string;
  siteName?: string;
  title: string;
  description: string;
  type: RequestType;
  priority: RequestPriority;
  screenshots: string[];
  status: RequestStatus;
  assignee?: RequestAssignee;
  /** false for Critical always; default true for others when clarifier enabled */
  autoHandle: boolean;
  discussWithShane: boolean;
  clarifierRounds: number;
  agreedChange?: string;
  adminNote?: string;
  timeline: TimelineEntry[];
  createdAt: string;
  updatedAt: string;
  statusChangedAt?: string;
}

export interface NewRequestInput {
  title?: unknown;
  description?: unknown;
  priority?: unknown;
  type?: unknown;
  screenshots?: unknown;
}

export function blobFolderFor(clientId: string): string {
  const safe = clientId.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 64);
  return `client-requests/${safe || "unknown"}`;
}

export function isAllowedScreenshotUrl(url: unknown, clientId: string): boolean {
  if (typeof url !== "string" || url.length > 1000) return false;
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname.endsWith(".public.blob.vercel-storage.com") &&
      u.pathname.startsWith(`/${blobFolderFor(clientId)}/`) &&
      !u.username &&
      !u.password
    );
  } catch {
    return false;
  }
}

type Ok<T> = { ok: true; value: T };
type Err = { ok: false; error: string };

export function validateNewRequest(
  input: NewRequestInput,
  clientId: string,
): Ok<{
  title: string;
  description: string;
  priority: RequestPriority;
  type: RequestType;
  screenshots: string[];
}> | Err {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (title.length < 3) return { ok: false, error: "Please add a short title (at least 3 characters)." };
  if (title.length > 120) return { ok: false, error: "Please keep the title under 120 characters." };
  if (description.length < 10) return { ok: false, error: "Please describe the change in a little more detail." };
  if (description.length > 5000) return { ok: false, error: "Please keep the description under 5,000 characters." };

  let priority: RequestPriority = "normal";
  if (input.priority !== undefined && input.priority !== null && input.priority !== "") {
    if (!REQUEST_PRIORITIES.includes(input.priority as RequestPriority)) {
      return { ok: false, error: "Invalid priority." };
    }
    priority = input.priority as RequestPriority;
  }

  let type: RequestType = "other";
  if (input.type !== undefined && input.type !== null && input.type !== "") {
    if (!REQUEST_TYPES.includes(input.type as RequestType)) return { ok: false, error: "Invalid type." };
    type = input.type as RequestType;
  }

  let screenshots: string[] = [];
  if (input.screenshots !== undefined && input.screenshots !== null) {
    if (!Array.isArray(input.screenshots)) return { ok: false, error: "Invalid screenshots." };
    if (input.screenshots.length > MAX_SCREENSHOTS) {
      return { ok: false, error: `Up to ${MAX_SCREENSHOTS} screenshots please.` };
    }
    if (!input.screenshots.every((u) => isAllowedScreenshotUrl(u, clientId))) {
      return { ok: false, error: "Invalid screenshot." };
    }
    screenshots = [...new Set(input.screenshots as string[])];
  }

  return { ok: true, value: { title, description, priority, type, screenshots } };
}

function normalizeStatus(status: string | undefined): RequestStatus {
  if (status === "received") return "new";
  if (status && (REQUEST_STATUSES as readonly string[]).includes(status)) return status as RequestStatus;
  return "new";
}

function parse(raw: unknown): ClientRequest | null {
  if (!raw) return null;
  let obj: Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else {
    obj = raw as Record<string, unknown>;
  }
  if (!obj.id || !obj.clientId) return null;
  const timeline = Array.isArray(obj.timeline) ? (obj.timeline as TimelineEntry[]) : [];
  return {
    id: String(obj.id),
    clientId: String(obj.clientId),
    clientName: String(obj.clientName || ""),
    clientEmail: String(obj.clientEmail || ""),
    siteId: obj.siteId ? String(obj.siteId) : undefined,
    siteName: obj.siteName ? String(obj.siteName) : undefined,
    title: String(obj.title || ""),
    description: String(obj.description || ""),
    type: (REQUEST_TYPES.includes(obj.type as RequestType) ? obj.type : "other") as RequestType,
    priority: (REQUEST_PRIORITIES.includes(obj.priority as RequestPriority)
      ? obj.priority
      : "normal") as RequestPriority,
    screenshots: Array.isArray(obj.screenshots) ? (obj.screenshots as string[]) : [],
    status: normalizeStatus(obj.status as string),
    assignee: ASSIGNEES.includes(obj.assignee as RequestAssignee)
      ? (obj.assignee as RequestAssignee)
      : undefined,
    autoHandle: obj.autoHandle !== false,
    discussWithShane: obj.discussWithShane === true,
    clarifierRounds: typeof obj.clarifierRounds === "number" ? obj.clarifierRounds : 0,
    agreedChange: obj.agreedChange ? String(obj.agreedChange) : undefined,
    adminNote: obj.adminNote ? String(obj.adminNote) : undefined,
    timeline,
    createdAt: String(obj.createdAt || new Date().toISOString()),
    updatedAt: String(obj.updatedAt || obj.createdAt || new Date().toISOString()),
    statusChangedAt: obj.statusChangedAt ? String(obj.statusChangedAt) : undefined,
  };
}

/** Strip internal fields for client-facing responses. */
export function toClientView(r: ClientRequest): Omit<ClientRequest, "timeline" | "adminNote" | "agreedChange"> & {
  timeline: TimelineEntry[];
  agreedChange?: string;
} {
  const { adminNote: _omit, ...rest } = r;
  void _omit;
  return {
    ...rest,
    timeline: r.timeline.filter((t) => !t.internal),
  };
}

function requireRedis() {
  const redis = getRedis();
  if (!redis) throw new Error("Storage is not configured");
  return redis;
}

function entry(
  partial: Omit<TimelineEntry, "id" | "createdAt"> & { createdAt?: string },
): TimelineEntry {
  return {
    id: randomUUID(),
    createdAt: partial.createdAt || new Date().toISOString(),
    ...partial,
  };
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
  type: RequestType;
  screenshots: string[];
}): Promise<ClientRequest> {
  const redis = requireRedis();
  const now = new Date().toISOString();
  const isCritical = data.priority === "critical";
  const req: ClientRequest = {
    id: randomUUID(),
    ...data,
    status: "new",
    // Critical defaults to Auto-handle by Chief; escalate to Shane only if needed.
    autoHandle: true,
    discussWithShane: false,
    assignee: isCritical ? "chief_ai" : undefined,
    clarifierRounds: 0,
    timeline: [
      entry({
        kind: "system",
        authorKind: "system",
        authorName: "System",
        body: isCritical
          ? `Request created (${TYPE_LABELS[data.type]}, Critical). Assigned to Chief AI, auto-handling.`
          : `Request created (${TYPE_LABELS[data.type]}, ${PRIORITY_LABELS[data.priority]}).`,
      }),
      entry({
        kind: "comment",
        authorKind: "client",
        authorName: data.clientName || data.clientEmail,
        body: data.description,
      }),
    ],
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

export async function listRequests(
  filter: { clientId?: string; status?: RequestStatus; siteId?: string } = {},
): Promise<ClientRequest[]> {
  const redis = requireRedis();
  const raw = await redis.hgetall<Record<string, unknown>>(REQUESTS_KEY);
  if (!raw) return [];
  return Object.values(raw)
    .map(parse)
    .filter((r): r is ClientRequest => r !== null)
    .filter((r) => (filter.clientId ? r.clientId === filter.clientId : true))
    .filter((r) => (filter.siteId ? r.siteId === filter.siteId : true))
    .filter((r) => {
      if (!filter.status) return true;
      const s = normalizeStatus(r.status);
      return s === filter.status || (filter.status === "new" && r.status === "received");
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveRequest(req: ClientRequest): Promise<ClientRequest> {
  const redis = requireRedis();
  const next = { ...req, updatedAt: new Date().toISOString() };
  await redis.hset(REQUESTS_KEY, { [next.id]: JSON.stringify(next) });
  return next;
}

export async function updateRequest(
  id: string,
  updates: {
    status?: unknown;
    adminNote?: unknown;
    assignee?: unknown;
    autoHandle?: unknown;
    discussWithShane?: unknown;
    agreedChange?: unknown;
  },
): Promise<{ request: ClientRequest; statusChanged: boolean } | { error: string; code: 400 | 404 }> {
  const existing = await getRequest(id);
  if (!existing) return { error: "Request not found", code: 404 };

  const next: ClientRequest = { ...existing, timeline: [...existing.timeline] };
  let statusChanged = false;

  if (updates.status !== undefined) {
    const raw = String(updates.status);
    const allowed = new Set<string>(REQUEST_STATUSES);
    if (!allowed.has(raw) && raw !== "received") {
      return { error: "Invalid status", code: 400 };
    }
    const st = normalizeStatus(raw);
    if (st !== existing.status && st !== "received") {
      next.status = st;
      next.statusChangedAt = new Date().toISOString();
      statusChanged = true;
      next.timeline.push(
        entry({
          kind: "status",
          authorKind: "admin",
          authorName: "Admin",
          body: `Status set to ${STATUS_LABELS[next.status] || next.status}.`,
        }),
      );
    }
  }

  if (updates.assignee !== undefined) {
    if (updates.assignee === null || updates.assignee === "") {
      next.assignee = undefined;
    } else if (!ASSIGNEES.includes(updates.assignee as RequestAssignee)) {
      return { error: "Invalid assignee", code: 400 };
    } else {
      next.assignee = updates.assignee as RequestAssignee;
      next.timeline.push(
        entry({
          kind: "system",
          authorKind: "admin",
          authorName: "Admin",
          body: `Assigned to ${ASSIGNEE_LABELS[next.assignee]}.`,
          internal: true,
        }),
      );
    }
  }

  if (updates.autoHandle !== undefined) {
    next.autoHandle = !!updates.autoHandle;
    if (updates.discussWithShane === undefined) next.discussWithShane = !next.autoHandle;
  }
  if (updates.discussWithShane !== undefined) {
    next.discussWithShane = !!updates.discussWithShane;
    if (updates.autoHandle === undefined) next.autoHandle = !next.discussWithShane;
  }
  // Take over / escalate helpers keep assignee in sync when provided.
  if (next.discussWithShane && next.autoHandle) {
    next.autoHandle = false;
  }

  if (updates.adminNote !== undefined) {
    if (updates.adminNote !== null && typeof updates.adminNote !== "string") {
      return { error: "Invalid note", code: 400 };
    }
    const note = (updates.adminNote ?? "").trim();
    if (note.length > 2000) return { error: "Please keep the note under 2,000 characters.", code: 400 };
    next.adminNote = note || undefined;
  }

  if (updates.agreedChange !== undefined && typeof updates.agreedChange === "string") {
    next.agreedChange = updates.agreedChange.trim() || undefined;
  }

  next.updatedAt = new Date().toISOString();
  const redis = requireRedis();
  await redis.hset(REQUESTS_KEY, { [id]: JSON.stringify(next) });
  return { request: next, statusChanged };
}

export async function addTimelineEntry(
  id: string,
  partial: Omit<TimelineEntry, "id" | "createdAt">,
): Promise<ClientRequest | null> {
  const existing = await getRequest(id);
  if (!existing) return null;
  existing.timeline.push(entry(partial));
  existing.updatedAt = new Date().toISOString();
  return saveRequest(existing);
}

export async function addClientReply(
  id: string,
  clientId: string,
  body: string,
  authorName: string,
): Promise<ClientRequest | { error: string; code: number }> {
  const existing = await getRequest(id);
  if (!existing) return { error: "Request not found", code: 404 };
  if (existing.clientId !== clientId) return { error: "Forbidden", code: 403 };
  const text = body.trim();
  if (text.length < 1) return { error: "Please write a reply.", code: 400 };
  if (text.length > 5000) return { error: "Please keep the reply under 5,000 characters.", code: 400 };
  existing.timeline.push(
    entry({
      kind: "comment",
      authorKind: "client",
      authorName: authorName || existing.clientName || existing.clientEmail,
      body: text,
    }),
  );
  if (existing.status === "awaiting_client") {
    existing.status = "new";
    existing.statusChangedAt = new Date().toISOString();
  }
  existing.updatedAt = new Date().toISOString();
  return saveRequest(existing);
}

export type ClarifierSettings = { enabled: boolean };

export async function getClarifierEnabled(clientId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  try {
    const raw = await redis.hget<string | ClarifierSettings>(REQUEST_SETTINGS_KEY, clientId);
    if (!raw) return true;
    if (typeof raw === "string") {
      const parsed = JSON.parse(raw) as ClarifierSettings;
      return parsed.enabled !== false;
    }
    return raw.enabled !== false;
  } catch {
    return true;
  }
}

export async function setClarifierEnabled(clientId: string, enabled: boolean): Promise<void> {
  const redis = requireRedis();
  await redis.hset(REQUEST_SETTINGS_KEY, {
    [clientId]: JSON.stringify({ enabled } satisfies ClarifierSettings),
  });
}

export function responseTargetFor(
  priority: RequestPriority,
  carePlanLabel?: string | null,
): string {
  // Care plan can override later via metadata; defaults for now.
  void carePlanLabel;
  return RESPONSE_TARGETS[priority];
}
