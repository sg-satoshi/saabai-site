/**
 * Human approval gate for HIGH/CRITICAL-risk gateway actions.
 *
 * State machine: pending → approved/rejected/expired → executed/failed.
 * When a risky tool is called and not yet approved, the registry returns an
 * `approval_required` result with a request id instead of executing. A human
 * then resolves it; if approved, the stored action is executed and audited.
 */
import { kvSet, kvGet } from "./store";
import type { Risk } from "./schema";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "executed" | "failed";

export interface ApprovalRequest {
  id: string;
  tenantId: string;
  agent: string;
  toolKey: string;
  toolName: string;
  args: unknown;
  risk: Risk;
  status: ApprovalStatus;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  outcome?: string;
  executionResult?: unknown;
}

const PREFIX = "approvals:";

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function createApprovalRequest(input: {
  tenantId: string;
  agent: string;
  toolKey: string;
  toolName: string;
  args: unknown;
  risk: Risk;
}): Promise<ApprovalRequest> {
  const req: ApprovalRequest = {
    ...input,
    id: "ap_" + uid(),
    status: "pending",
    requestedAt: new Date().toISOString(),
  };
  await kvSet(PREFIX + req.id, req);
  return req;
}

export async function getApprovalRequest(id: string): Promise<ApprovalRequest | null> {
  return kvGet<ApprovalRequest>(PREFIX + id);
}

export async function resolveApproval(
  id: string,
  status: ApprovalStatus,
  reviewedBy: string,
  executionResult?: unknown
): Promise<ApprovalRequest | null> {
  const req = await getApprovalRequest(id);
  if (!req) return null;
  req.status = status;
  req.reviewedBy = reviewedBy;
  req.reviewedAt = new Date().toISOString();
  if (executionResult !== undefined) req.executionResult = executionResult;
  await kvSet(PREFIX + id, req);
  return req;
}
