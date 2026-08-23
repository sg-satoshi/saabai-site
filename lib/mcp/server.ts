/**
 * Saabai MCP server — thin facade over the registry + domain layer.
 *
 * Builds the McpServer from the metadata-driven tool registry. No data logic
 * here; each tool handler calls a service in the shared domain layer. A fresh
 * server is created per request (stateless, ideal for Vercel serverless).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createSaabaiTools } from "./tools";
import { registerTools } from "./registry";
import type { McpContext } from "./schema";
import { DEFAULT_CAPABILITIES } from "./permissions";

export function createSaabaiMcpServer(): McpServer {
  const server = new McpServer({ name: "saabai", version: "0.1.0" });
  const ctx: McpContext = {
    tenantId: "saabai",
    agent: "saabai-admin",
    capabilities: DEFAULT_CAPABILITIES,
  };
  registerTools(server, createSaabaiTools(), ctx);
  return server;
}
