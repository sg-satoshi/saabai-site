import { getRedis } from "./redis";

export interface CustomerNote {
  id: string;
  text: string;
  author: string;
  createdAt: string; // ISO string
}

const NOTES_PREFIX = "customer:notes:";

export async function addCustomerNote(
  customerId: string,
  text: string,
  author = "Admin"
): Promise<CustomerNote | null> {
  const redis = getRedis();
  if (!redis) return null;

  const note: CustomerNote = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    text: text.trim(),
    author,
    createdAt: new Date().toISOString(),
  };

  await redis.lpush(`${NOTES_PREFIX}${customerId}`, JSON.stringify(note));
  return note;
}

export async function getCustomerNotes(
  customerId: string
): Promise<CustomerNote[]> {
  const redis = getRedis();
  if (!redis) return [];

  const raw = await redis.lrange(`${NOTES_PREFIX}${customerId}`, 0, 499);
  const notes: CustomerNote[] = [];

  for (const item of raw) {
    try {
      const note = JSON.parse(item) as CustomerNote;
      if (note.text && note.createdAt) notes.push(note);
    } catch { /* skip invalid */ }
  }

  // Most recent first (lpush gives reverse order already)
  return notes;
}

export async function deleteCustomerNote(
  customerId: string,
  noteId: string
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  const raw = await redis.lrange(`${NOTES_PREFIX}${customerId}`, 0, 499);

  for (const item of raw) {
    try {
      const note = JSON.parse(item) as CustomerNote;
      if (note.id === noteId) {
        await redis.lrem(`${NOTES_PREFIX}${customerId}`, 0, item);
        return true;
      }
    } catch { /* skip */ }
  }

  return false;
}
