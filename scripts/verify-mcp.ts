/**
 * In-process verification of the Saabai MCP server layer (lib/mcp/*).
 * Runs WITHOUT the Next dev server so it's deterministic and env-independent.
 * Proves: auth, handshake, registry-driven tools, permissions, business rules
 * (via the approval gate), the approval gate e2e, and audit recording.
 * Run: npx tsx scripts/verify-mcp.ts
 */
process.env.MCP_API_KEY = "test-key-123";
process.env.VERCEL_ENV = "development";

import { authorizeRequest } from "../lib/mcp/auth";
import { createSaabaiMcpServer } from "../lib/mcp/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { readAudit } from "../lib/mcp/audit";
import { assertCapability } from "../lib/mcp/permissions";
import type { McpContext } from "../lib/mcp/schema";

let failures = 0;
function assert(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) console.log(`  PASS  ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name}\n        expected ${e}\n        got      ${a}`);
  }
}

async function reqWith(auth?: string, method = "POST"): Promise<Request> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth) headers["authorization"] = auth;
  return new Request("http://localhost/api/mcp", {
    method,
    headers,
    body: method === "POST" ? "{}" : undefined,
  });
}

/** One MCP call on a fresh server+transport (stateless requires this). */
async function rpc(msg: unknown): Promise<{ status: number; json: any }> {
  const server = createSaabaiMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const req = new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: "Bearer test-key-123",
    },
    body: JSON.stringify(msg),
  });
  const res = await transport.handleRequest(req);
  const text = await res.text();
  let json: any = text;
  try {
    json = JSON.parse(text);
  } catch {
    /* leave as text */
  }
  return { status: res.status, json };
}

function callText(json: any, resultKey = "result") {
  const content = json?.result?.content?.[0]?.text;
  if (!content) return json;
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

async function main() {
  // ── Auth ────────────────────────────────────────────────────────────────
  console.log("authorizeRequest");
  const ok = await authorizeRequest(await reqWith("Bearer test-key-123"));
  assert("correct bearer → ok", ok.ok, true);

  const bad = await authorizeRequest(await reqWith("Bearer wrong"));
  assert("wrong bearer → 401", { ok: bad.ok, status: bad.status }, { ok: false, status: 401 });

  const none = await authorizeRequest(await reqWith());
  assert("no header → unauthorized", { ok: none.ok, status: none.status }, { ok: false, status: 401 });

  const savedKey = process.env.MCP_API_KEY;
  process.env.MCP_API_KEY = "";
  process.env.VERCEL_ENV = "production";
  const prod = await authorizeRequest(await reqWith("Bearer anything"));
  assert("prod + no key → 503", { ok: prod.ok, status: prod.status }, { ok: false, status: 503 });
  process.env.MCP_API_KEY = savedKey;
  process.env.VERCEL_ENV = "development";

  // ── MCP handshake ────────────────────────────────────────────────────────
  console.log("\nMCP handshake");
  const init = await rpc({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "verify", version: "1.0" },
    },
  });
  assert("initialize HTTP 200", init.status, 200);
  assert("initialize serverInfo.name = saabai", init.json?.result?.serverInfo?.name, "saabai");
  assert("initialize serverInfo.version = 0.1.0", init.json?.result?.serverInfo?.version, "0.1.0");

  const list = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  assert("tools/list HTTP 200", list.status, 200);
  assert("tools/list has exactly 8 tools", list.json?.result?.tools?.length, 8);
  const names = (list.json?.result?.tools ?? []).map((t: { name: string }) => t.name).sort();
  assert(
    "tool names match the eight contracts",
    names,
    [
      "saabai_approvals_get",
      "saabai_approvals_resolve",
      "saabai_get_invoice",
      "saabai_list_customers",
      "saabai_list_invoice_clients",
      "saabai_list_invoices",
      "saabai_query_receivables",
      "saabai_test_risky_action",
    ]
  );

  // ── Read tools still work ────────────────────────────────────────────────
  const call = await rpc({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "saabai_list_customers", arguments: { limit: 5 } },
  });
  assert("tools/call customers returns result", call.json?.error, undefined);

  const q = await rpc({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: { name: "saabai_query_receivables", arguments: { status: "unpaid" } },
  });
  assert("query_receivables returns result", q.json?.error, undefined);

  // ── Approval gate e2e ────────────────────────────────────────────────────
  console.log("\nApproval gate");
  const risky = await rpc({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: { name: "saabai_test_risky_action", arguments: { action: "refund", amount: 90000 } },
  });
  const riskyBody = callText(risky.json);
  assert("risky tool NOT executed, returns approval_required", riskyBody?.approval_required, true);
  assert("risky tool returns pending status", riskyBody?.status, "pending");
  const requestId = riskyBody?.requestId;
  assert("approval request id returned", typeof requestId, "string");

  const rejected = await rpc({
    jsonrpc: "2.0",
    id: 6,
    method: "tools/call",
    params: { name: "saabai_test_risky_action", arguments: { action: "other" } },
  });
  const rejectedBody = callText(rejected.json);
  const reqId2 = rejectedBody?.requestId;
  const rejectRes = await rpc({
    jsonrpc: "2.0",
    id: 7,
    method: "tools/call",
    params: { name: "saabai_approvals_resolve", arguments: { requestId: reqId2, decision: "reject", reviewer: "shane" } },
  });
  const rejectBody = callText(rejectRes.json);
  assert("reject → status rejected", rejectBody?.status, "rejected");

  const resolve = await rpc({
    jsonrpc: "2.0",
    id: 8,
    method: "tools/call",
    params: { name: "saabai_approvals_resolve", arguments: { requestId, decision: "approve", reviewer: "shane" } },
  });
  const resolveBody = callText(resolve.json);
  assert("approve → status executed", resolveBody?.status, "executed");
  const executedInner = callText(resolveBody);
  assert("approve executes the stored action", executedInner?.executed, true);

  const getReq = await rpc({
    jsonrpc: "2.0",
    id: 9,
    method: "tools/call",
    params: { name: "saabai_approvals_get", arguments: { requestId } },
  });
  const getBody = callText(getReq.json);
  assert("approvals.get reflects executed with reviewer", {
    status: getBody?.approval?.status,
    reviewedBy: getBody?.approval?.reviewedBy,
  }, { status: "executed", reviewedBy: "shane" });

  // ── Permissions gate ─────────────────────────────────────────────────────
  console.log("\nPermissions");
  const readOnly: McpContext = { tenantId: "saabai", agent: "low", capabilities: ["customers.read"] };
  let blocked = false;
  try {
    assertCapability(readOnly, "test.write");
  } catch {
    blocked = true;
  }
  assert("missing capability is blocked", blocked, true);
  const granted: McpContext = { ...readOnly, capabilities: ["test.write"] };
  assert("granted capability passes", (() => { try { assertCapability(granted, "test.write"); return true; } catch { return false; } })(), true);

  // ── Audit trail ──────────────────────────────────────────────────────────
  console.log("\nAudit");
  const auditEvents = await readAudit(200);
  assert("audit events recorded (>= 5)", auditEvents.length >= 5, true);
  const riskyAudit = auditEvents.find((e: any) => e.toolKey === "test.risky_action");
  assert("an audit event exists for the risky action tool", !!riskyAudit, true);
}

main().then(() => {
  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
});
