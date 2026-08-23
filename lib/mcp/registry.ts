/**
 * Metadata-driven tool registry with the full guardrail chain.
 *
 * For every registered tool, each call is wrapped as:
 *   permission gate → business rules → approval gate → handler → audit.
 * The model is never the security boundary; the gateway enforces it in code.
 *
 * Also exposes by-key lookup + direct handler execution so the approval-resolve
 * path can run a stored action once a human approves it.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SaabaiTool, McpContext, Risk } from "./schema";
import { assertCapability } from "./permissions";
import { evaluateRules } from "./businessRules";
import { createApprovalRequest } from "./approval";
import { recordAudit } from "./audit";

const toolsByKey = new Map<string, SaabaiTool>();

function result(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

/** Run a tool's handler directly, bypassing the gate (used after approval). */
export function executeToolHandler(tool: SaabaiTool, args: any, ctx: McpContext) {
  return tool.handler(args, ctx);
}

export function getToolByKey(key: string): SaabaiTool | undefined {
  return toolsByKey.get(key);
}

async function audit(
  ctx: McpContext,
  tool: SaabaiTool,
  args: unknown,
  startedAt: number,
  extra: Partial<{ approvalState: string; result: unknown; error: string }> = {}
) {
  await recordAudit({
    tenantId: ctx.tenantId,
    agent: ctx.agent,
    tool: tool.name,
    toolKey: tool.key,
    args,
    risk: tool.risk,
    latencyMs: Date.now() - startedAt,
    ...extra,
  });
}

export function registerTools(server: McpServer, tools: SaabaiTool[], ctx: McpContext): void {
  for (const tool of tools) toolsByKey.set(tool.key, tool);

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema as any,
      },
      async (args: any) => {
        const startedAt = Date.now();

        // 1. Permission gate.
        assertCapability(ctx, tool.requiredCapability);

        // 2. Business rules.
        const rule = evaluateRules(tool, args, ctx);
        if (rule.block) {
          await audit(ctx, tool, args, startedAt, { approvalState: "blocked", result: { blocked: true, reason: rule.block } });
          return result({ blocked: true, reason: rule.block });
        }

        // 3. Approval gate (risk-based or rule-forced).
        const needsApproval =
          tool.requiresApproval || tool.risk === "high" || tool.risk === "critical" || !!rule.requireApproval;
        if (needsApproval) {
          const req = await createApprovalRequest({
            tenantId: ctx.tenantId,
            agent: ctx.agent,
            toolKey: tool.key,
            toolName: tool.name,
            args,
            risk: tool.risk,
          });
          await audit(ctx, tool, args, startedAt, { approvalState: "pending", result: { approval_required: true } });
          return result({ approval_required: true, requestId: req.id, status: req.status, risk: tool.risk });
        }

        // 4. Execute + audit.
        const handlerResult = await executeToolHandler(tool, args, ctx);
        await audit(ctx, tool, args, startedAt, { result: handlerResult });
        return handlerResult;
      }
    );
  }
}

export { result as registryResult };
export type { Risk };
