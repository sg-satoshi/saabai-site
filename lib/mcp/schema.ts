/**
 * Saabai tool metadata contract.
 *
 * Every tool is described by a SaabaiTool object (key, name, schemas, required
 * capability, risk, tenant scope, approval + audit flags) plus a handler that
 * calls a service/connector underneath. The registry (lib/mcp/registry.ts) turns
 * these into MCP tools and wraps each call with the guardrail layers.
 */
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v4";

/** Action risk classification. Guides the approval gate and audit tier. */
export type Risk = "low" | "medium" | "high" | "critical";

/** Whether a tool is scoped to a tenancy or global. */
export type TenantScope = "global" | "tenant";

/** Per-execution context threaded through tool calls. */
export interface McpContext {
  tenantId: string;
  agent: string;
  capabilities: string[];
}

/** A tool handler receives validated args + context and returns an MCP result. */
export type SaabaiToolHandler = (args: any, ctx: McpContext) => Promise<CallToolResult>;

export interface SaabaiTool {
  /** Stable registry key, e.g. "customers.query_receivables". */
  key: string;
  /** MCP tool name (client sees it prefixed, e.g. mcp_saabai_*). */
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
  requiredCapability: string;
  risk: Risk;
  tenantScope: TenantScope;
  requiresApproval: boolean;
  audit: boolean;
  handler: SaabaiToolHandler;
}
