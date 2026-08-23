/**
 * MCP Streamable HTTP endpoint for Saabai.
 *
 * Auth first (Bearer MCP_API_KEY, or admin session cookie as a secondary gate),
 * then hand the Web-standard Request to the SDK's stateless Streamable HTTP
 * transport. A fresh McpServer is created per request (no cross-invocation
 * state, which is what Vercel serverless needs). Read-only, P0.
 */
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createSaabaiMcpServer } from "../../../lib/mcp/server";
import { authorizeRequest } from "../../../lib/mcp/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function handle(req: Request): Promise<Response> {
  const auth = await authorizeRequest(req);
  if (!auth.ok) {
    return new Response(
      JSON.stringify({ error: auth.message ?? "Unauthorized" }),
      { status: auth.status, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const server = createSaabaiMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless — ideal for serverless
    });
    await server.connect(transport);
    return await transport.handleRequest(req);
  } catch (err) {
    console.error("[mcp] handle error", err);
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(req: Request): Promise<Response> {
  return handle(req);
}

export async function GET(req: Request): Promise<Response> {
  return handle(req);
}

export async function DELETE(req: Request): Promise<Response> {
  return handle(req);
}
