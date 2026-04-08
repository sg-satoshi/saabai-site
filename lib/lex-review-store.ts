/**
 * Lex Doc Review — Server-side persistence layer (Upstash Redis)
 *
 * Schema:
 *   lex_review:{id}          → Hash  (all fields as strings, report JSON-stringified)
 *   lex_reviews:{firmId}     → List  of ids, newest first (lpush + ltrim 200)
 */

import { getRedis } from "./redis";

export type ReviewStatus = "pending" | "approved" | "needs_changes";

export type StoredReview = {
  id: string;
  firmId: string;
  // Matter metadata (supplied by the submitting lawyer)
  submittedBy: string;
  matterNo: string;
  clientName: string;
  documentName: string;
  // Timestamps
  submittedAt: number;
  reviewedAt?: number;
  // Lex analysis output
  reportJson: string;          // JSON.stringify(ReviewReport)
  riskLevel: string;           // denormalised for fast list rendering
  overallScore: number;
  documentType: string;
  direction: string;
  jurisdiction: string;
  // Supervisor workflow
  status: ReviewStatus;
  supervisorNotes: string;
  reviewedBy: string;
};

function key(id: string) { return `lex_review:${id}`; }
function listKey(firmId: string) { return `lex_reviews:${firmId}`; }

/** Save a new review (submitted by a lawyer) */
export async function saveReview(review: StoredReview): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  // Flatten to string map for hset
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(review)) {
    flat[k] = v == null ? "" : String(v);
  }
  await redis.hset(key(review.id), flat as Record<string, unknown>);
  await redis.lpush(listKey(review.firmId), review.id);
  await redis.ltrim(listKey(review.firmId), 0, 199);
}

/** Update status + supervisor notes on an existing review */
export async function updateReviewStatus(
  id: string,
  status: ReviewStatus,
  supervisorNotes: string,
  reviewedBy: string,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.hset(key(id), {
    status,
    supervisorNotes,
    reviewedBy,
    reviewedAt: String(Date.now()),
  } as Record<string, unknown>);
}

/** Fetch all reviews for a firm, newest first */
export async function listReviews(firmId: string, limit = 50): Promise<StoredReview[]> {
  const redis = getRedis();
  if (!redis) return [];
  const ids = (await redis.lrange(listKey(firmId), 0, limit - 1)) as string[];
  if (!ids.length) return [];
  const results = await Promise.all(
    ids.map(id => redis.hgetall(key(id)) as Promise<Record<string, string> | null>)
  );
  return results
    .filter((r): r is Record<string, string> => r !== null && !!r.id)
    .map(r => ({
      ...r,
      submittedAt: Number(r.submittedAt ?? 0),
      reviewedAt: r.reviewedAt ? Number(r.reviewedAt) : undefined,
      overallScore: Number(r.overallScore ?? 0),
      status: (r.status ?? "pending") as ReviewStatus,
    })) as StoredReview[];
}

/** Fetch a single review by id */
export async function getReview(id: string): Promise<StoredReview | null> {
  const redis = getRedis();
  if (!redis) return null;
  const r = await redis.hgetall(key(id)) as Record<string, string> | null;
  if (!r?.id) return null;
  return {
    ...r,
    submittedAt: Number(r.submittedAt ?? 0),
    reviewedAt: r.reviewedAt ? Number(r.reviewedAt) : undefined,
    overallScore: Number(r.overallScore ?? 0),
    status: (r.status ?? "pending") as ReviewStatus,
  } as StoredReview;
}
