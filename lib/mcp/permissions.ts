/**
 * Capability / permission model for Saabai gateway tools.
 *
 * Tools declare a requiredCapability; the registry asserts the calling context
 * holds it before the handler runs. Phase 1 used read caps; approvals + a mock
 * test-write capability are added for the Phase 2 demonstration. Per-agent /
 * per-tenant capability assignment is a later Phase.
 */
import type { McpContext } from "./schema";

/** Default capabilities for the current (single-operator, admin) agent. */
export const DEFAULT_CAPABILITIES = [
  "customers.read",
  "finance.read",
  "approvals.write",
  "test.write",
];

/** Throws if the context lacks the required capability. Empty = no gate. */
export function assertCapability(ctx: McpContext, required: string): void {
  if (!required) return;
  if (!ctx.capabilities.includes(required)) {
    throw new Error(`Permission denied: tool requires capability '${required}'`);
  }
}
