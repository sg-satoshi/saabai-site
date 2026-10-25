/**
 * Server-side session caps and transcript storage.
 * The 2 minute hard stop is stored as hardEndAt. A later token is never minted
 * for a live session, and pulse returns continue:false once that time has passed.
 */
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { VOICE_LIMITS } from "./config";
import type { TranscriptLine } from "./events";
import type { VoiceStore } from "./store";

const DAY_TTL = 60 * 60 * 36;
const SESSION_TTL = 60 * 60 * 2;
const LIVE_TTL = 180;
const TRANSCRIPT_TTL = 60 * 60 * 24 * 30;
const LIVE_KEY = "voice:live";
const INDEX_KEY = "voice:tx:index";

export type VoiceSessionRecord = {
  id: string;
  secretHash: string;
  visitorId: string;
  ipHash: string;
  day: string;
  startedAt: number;
  hardEndAt: number;
  refunded: boolean;
  ended: boolean;
};

type LiveSlot = { id: string; hardEndAt: number };

export type ReserveOk = {
  ok: true;
  sessionId: string;
  secret: string;
  startedAt: number;
  hardEndAt: number;
};

export type ReserveNo = { ok: false; reason: "visitor" | "site" | "busy" | "locked" };

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function secretsMatch(secret: string, hash: string): boolean {
  const next = hashSecret(secret);
  const a = Buffer.from(next);
  const b = Buffer.from(hash);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function brisbaneDay(now: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
}

function readJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readLive(store: VoiceStore, now: number): Promise<LiveSlot[]> {
  const parsed = readJson<LiveSlot[]>(await store.get(LIVE_KEY));
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((slot) => slot && typeof slot.hardEndAt === "number" && slot.hardEndAt > now);
}

async function writeLive(store: VoiceStore, slots: LiveSlot[]): Promise<void> {
  if (!slots.length) {
    await store.del(LIVE_KEY);
    return;
  }
  await store.set(LIVE_KEY, JSON.stringify(slots), LIVE_TTL);
}

function sessionKey(id: string): string {
  return `voice:sess:${id}`;
}

async function loadSession(store: VoiceStore, id: string, secret: string): Promise<VoiceSessionRecord | null> {
  const record = readJson<VoiceSessionRecord>(await store.get(sessionKey(id)));
  if (!record || record.id !== id) return null;
  if (!secretsMatch(secret, record.secretHash)) return null;
  return record;
}

async function saveSession(store: VoiceStore, record: VoiceSessionRecord): Promise<void> {
  await store.set(sessionKey(record.id), JSON.stringify(record), SESSION_TTL);
}

export async function reserveVoiceSession(
  store: VoiceStore,
  input: { visitorId: string; ipHash: string; now: number },
): Promise<ReserveOk | ReserveNo> {
  const locked = await store.withLock(async () => {
    const day = brisbaneDay(input.now);
    const visitorKey = `voice:vis:${input.visitorId}:${day}`;
    const ipKey = `voice:iph:${input.ipHash}:${day}`;
    const siteKey = `voice:site:${day}`;

    const visitorCount = await store.incr(visitorKey, DAY_TTL);
    if (visitorCount > VOICE_LIMITS.perVisitorPerDay) {
      await store.decrFloor(visitorKey);
      return { ok: false as const, reason: "visitor" as const };
    }

    const ipCount = await store.incr(ipKey, DAY_TTL);
    if (ipCount > VOICE_LIMITS.perVisitorPerDay) {
      await store.decrFloor(visitorKey);
      await store.decrFloor(ipKey);
      return { ok: false as const, reason: "visitor" as const };
    }

    const siteCount = await store.incr(siteKey, DAY_TTL);
    if (siteCount > VOICE_LIMITS.sitePerDay) {
      await store.decrFloor(visitorKey);
      await store.decrFloor(ipKey);
      await store.decrFloor(siteKey);
      return { ok: false as const, reason: "site" as const };
    }

    const live = await readLive(store, input.now);
    if (live.length >= VOICE_LIMITS.concurrent) {
      await store.decrFloor(visitorKey);
      await store.decrFloor(ipKey);
      await store.decrFloor(siteKey);
      return { ok: false as const, reason: "busy" as const };
    }

    const sessionId = randomUUID();
    const secret = randomBytes(32).toString("base64url");
    const startedAt = input.now;
    const hardEndAt = startedAt + VOICE_LIMITS.hardSeconds * 1000;
    const record: VoiceSessionRecord = {
      id: sessionId,
      secretHash: hashSecret(secret),
      visitorId: input.visitorId,
      ipHash: input.ipHash,
      day,
      startedAt,
      hardEndAt,
      refunded: false,
      ended: false,
    };
    live.push({ id: sessionId, hardEndAt });
    await writeLive(store, live);
    await saveSession(store, record);
    return { ok: true as const, sessionId, secret, startedAt, hardEndAt };
  });

  if (locked === "locked") return { ok: false, reason: "locked" };
  return locked;
}

/** Give the quota back when the voice provider never started the call. */
export async function refundVoiceSession(
  store: VoiceStore,
  sessionId: string,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  const locked = await store.withLock(async () => {
    const record = await loadSession(store, sessionId, secret);
    if (!record || record.refunded) return false;
    record.refunded = true;
    record.ended = true;
    await store.decrFloor(`voice:vis:${record.visitorId}:${record.day}`);
    await store.decrFloor(`voice:iph:${record.ipHash}:${record.day}`);
    await store.decrFloor(`voice:site:${record.day}`);
    const live = (await readLive(store, now)).filter((slot) => slot.id !== sessionId);
    await writeLive(store, live);
    await saveSession(store, record);
    return true;
  });
  return locked === "locked" ? false : locked;
}

export async function tightenVoiceDeadline(
  store: VoiceStore,
  sessionId: string,
  secret: string,
  hardEndAt: number,
  now = Date.now(),
): Promise<void> {
  await store.withLock(async () => {
    const record = await loadSession(store, sessionId, secret);
    if (!record) return;
    record.hardEndAt = Math.min(record.hardEndAt, hardEndAt);
    const live = (await readLive(store, now)).map((slot) =>
      slot.id === sessionId ? { ...slot, hardEndAt: record.hardEndAt } : slot,
    );
    await writeLive(store, live);
    await saveSession(store, record);
  });
}

export async function endVoiceSession(
  store: VoiceStore,
  sessionId: string,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  const locked = await store.withLock(async () => {
    const record = await loadSession(store, sessionId, secret);
    if (!record) return false;
    record.ended = true;
    const live = (await readLive(store, now)).filter((slot) => slot.id !== sessionId);
    await writeLive(store, live);
    await saveSession(store, record);
    return true;
  });
  return locked === "locked" ? false : locked;
}

export async function pulseVoiceSession(
  store: VoiceStore,
  sessionId: string,
  secret: string,
  now: number,
): Promise<{ ok: true; continue: boolean; hardEndAt: number; serverNow: number } | { ok: false }> {
  const record = await loadSession(store, sessionId, secret);
  if (!record) return { ok: false };
  const keepGoing = !record.ended && now < record.hardEndAt;
  if (!keepGoing) {
    await endVoiceSession(store, sessionId, secret, now);
  }
  return { ok: true, continue: keepGoing, hardEndAt: record.hardEndAt, serverNow: now };
}

export function sanitizeTranscript(lines: unknown): TranscriptLine[] {
  if (!Array.isArray(lines)) return [];
  const out: TranscriptLine[] = [];
  for (const line of lines.slice(0, 80)) {
    if (!line || typeof line !== "object") continue;
    const roleRaw = (line as { role?: unknown }).role;
    const role = roleRaw === "assistant" || roleRaw === "visitor" ? roleRaw : null;
    if (!role) continue;
    const text = String((line as { text?: unknown }).text ?? "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .trim()
      .slice(0, 2000);
    if (!text) continue;
    out.push({ role, text });
  }
  return out;
}

export type StoredTranscript = {
  id: string;
  startedAt: string;
  durationSec: number;
  lines: TranscriptLine[];
};

export async function saveVoiceTranscript(
  store: VoiceStore,
  input: { sessionId: string; secret: string; lines: unknown; now: number },
): Promise<StoredTranscript | null> {
  const record = await loadSession(store, input.sessionId, input.secret);
  if (!record) return null;
  const elapsed = Math.round((input.now - record.startedAt) / 1000);
  const durationSec = Math.max(0, Math.min(VOICE_LIMITS.hardSeconds, elapsed));
  const stored: StoredTranscript = {
    id: record.id,
    startedAt: new Date(record.startedAt).toISOString(),
    durationSec,
    lines: sanitizeTranscript(input.lines),
  };
  await store.set(`voice:tx:${record.id}`, JSON.stringify(stored), TRANSCRIPT_TTL);
  await store.pushId(INDEX_KEY, record.id);
  return stored;
}
