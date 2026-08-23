/**
 * Deterministic business-rule layer.
 *
 * Constrains tool execution in code, independent of model judgment. Rules can
 * block an action or force it through the approval gate. Seeded with sensible
 * defaults; per-tenant configuration is a future Phase.
 */
import type { SaabaiTool, McpContext } from "./schema";

export interface RuleResult {
  /** Non-empty = block execution with this reason. */
  block?: string;
  /** True = force this call through the approval gate. */
  requireApproval?: boolean;
}

export interface BusinessRule {
  id: string;
  description: string;
  evaluate: (tool: SaabaiTool, args: any, ctx: McpContext) => RuleResult;
}

/** Finance/threshold constants (dollars). */
export const FINANCE_APPROVAL_THRESHOLD = 50000;

export const DEFAULT_RULES: BusinessRule[] = [
  {
    id: "finance.amount.threshold",
    description: "Finance actions above a threshold require approval.",
    evaluate: (tool, args) => {
      if (tool.key.startsWith("finance.") && typeof args?.amount === "number" && args.amount >= FINANCE_APPROVAL_THRESHOLD) {
        return { requireApproval: true };
      }
      return {};
    },
  },
  {
    id: "contact.do_not_contact",
    description: "Never contact records flagged do_not_contact.",
    evaluate: (tool, args) => {
      if (args?.doNotContact === true) {
        return { block: "Contacting a do_not_contact record is prohibited." };
      }
      return {};
    },
  },
];

export function evaluateRules(tool: SaabaiTool, args: any, ctx: McpContext): RuleResult {
  for (const rule of DEFAULT_RULES) {
    const res = rule.evaluate(tool, args, ctx);
    if (res.block) return res;
    if (res.requireApproval) return { requireApproval: true };
  }
  return {};
}

/** Look up a rule by id (for admin/tests). */
export function getRule(id: string): BusinessRule | undefined {
  return DEFAULT_RULES.find((r) => r.id === id);
}
