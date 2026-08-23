/**
 * Saabai gateway tools (read-only MVP).
 *
 * Each entry is a SaabaiTool metadata object whose handler calls a service in
 * the shared domain layer (lib/customers, lib/invoice-store, lib/receivables).
 * No business logic lives in the handler — it delegates to services.
 */
import * as z from "zod/v4";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { SaabaiTool } from "./schema";
import { listUnifiedCustomers } from "../customers";
import {
  listInvoices,
  getInvoice,
  listClients,
  type Invoice,
  type InvoiceClient,
} from "../invoice-store";
import {
  queryReceivables,
  attachReceivables,
  clientsWithReceivables,
} from "../receivables";
import { getApprovalRequest, resolveApproval } from "./approval";
import { getToolByKey, executeToolHandler } from "./registry";
import { recordAudit } from "./audit";

const LIMIT = z.number().int().min(1).max(200).default(50);

function jsonText(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

export function createSaabaiTools(): SaabaiTool[] {
  return [
    // 1. Unified customer directory ------------------------------------------
    {
      key: "customers.list",
      name: "saabai_list_customers",
      description:
        "List the unified customer directory (lex, site-factory, stripe, portal, leadgen, audit). " +
        "Set includeReceivables to also join consulting-ledger AR totals.",
      inputSchema: z.object({
        query: z.string().optional().describe("Case-insensitive substring on name or email"),
        type: z.enum(["lex", "site-factory", "stripe", "portal", "leadgen", "audit"]).optional(),
        status: z.string().optional(),
        includeReceivables: z.boolean().default(false),
        limit: LIMIT,
      }),
      requiredCapability: "customers.read",
      risk: "low",
      tenantScope: "tenant",
      requiresApproval: false,
      audit: true,
      handler: async (args) => {
        const all = await listUnifiedCustomers();
        let customers: Array<
          (typeof all)[number] & {
            receivables?: import("../receivables").ReceivablesSummary;
            invoiceClientId?: string;
          }
        > = all;

        if (args.includeReceivables) {
          const clients = await listClients();
          const invoices = await listInvoices();
          customers = attachReceivables(all, clients, invoices);
        }

        let rows = customers;
        if (args.type) rows = rows.filter((c) => c.type === args.type);
        if (args.status) rows = rows.filter((c) => c.status === args.status);
        if (args.query) {
          const q = (args.query as string).toLowerCase();
          rows = rows.filter(
            (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
          );
        }
        const limited = rows.slice(0, args.limit);
        return jsonText({ customers: limited, total: limited.length });
      },
    },

    // 2. Consulting invoices --------------------------------------------------
    {
      key: "finance.list_invoices",
      name: "saabai_list_invoices",
      description: "List B2B consulting invoices (SG-NNN). Filter by status, client, or number.",
      inputSchema: z.object({
        status: z.enum(["unpaid", "paid", "overdue"]).optional(),
        clientId: z.string().optional(),
        number: z.string().optional().describe("Exact or prefix, e.g. SG-010 or SG-"),
        limit: LIMIT,
      }),
      requiredCapability: "finance.read",
      risk: "low",
      tenantScope: "tenant",
      requiresApproval: false,
      audit: true,
      handler: async (args) => {
        let invoices = await listInvoices();
        if (args.status) invoices = invoices.filter((i) => i.status === args.status);
        if (args.clientId) invoices = invoices.filter((i) => i.clientId === args.clientId);
        if (args.number) {
          const n = args.number as string;
          invoices = invoices.filter((i) => i.number === n || i.number.startsWith(n));
        }
        return jsonText({ invoices: invoices.slice(0, args.limit) });
      },
    },

    // 3. Get one invoice (with client) ---------------------------------------
    {
      key: "finance.get_invoice",
      name: "saabai_get_invoice",
      description:
        "Fetch one consulting invoice by Redis id or SG-NNN number, joined with its client.",
      inputSchema: z
        .object({
          id: z.string().optional(),
          number: z.string().optional(),
        })
        .refine((v) => Boolean(v.id || v.number), { message: "Provide 'id' or 'number'" }),
      requiredCapability: "finance.read",
      risk: "low",
      tenantScope: "tenant",
      requiresApproval: false,
      audit: true,
      handler: async (args) => {
        let invoice: Invoice | null = null;
        if (args.id) invoice = await getInvoice(args.id);
        if (!invoice && args.number) {
          const all = await listInvoices();
          const n = args.number as string;
          invoice = all.find((i) => i.number === n || i.number.startsWith(n)) ?? null;
        }
        if (!invoice) return jsonText({ error: "Invoice not found" });
        let client: InvoiceClient | null = null;
        const clients = await listClients();
        client = clients.find((c) => c.id === invoice!.clientId) ?? null;
        return jsonText({ invoice, client });
      },
    },

    // 4. Invoice clients (with AR) -------------------------------------------
    {
      key: "finance.list_invoice_clients",
      name: "saabai_list_invoice_clients",
      description: "List consulting invoice clients with outstanding accounts-receivable totals.",
      inputSchema: z.object({
        query: z.string().optional().describe("Substring on name or email"),
        limit: LIMIT,
      }),
      requiredCapability: "finance.read",
      risk: "low",
      tenantScope: "tenant",
      requiresApproval: false,
      audit: true,
      handler: async (args) => {
        const clients = await listClients();
        const invoices = await listInvoices();
        let rows = clientsWithReceivables(clients, invoices);
        if (args.query) {
          const q = (args.query as string).toLowerCase();
          rows = rows.filter(
            (c) => c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q)
          );
        }
        return jsonText({ clients: rows.slice(0, args.limit) });
      },
    },

    // 5. Query receivables (highest value) -----------------------------------
    {
      key: "customers.query_receivables",
      name: "saabai_query_receivables",
      description:
        "Cross-business accounts receivable: who has unpaid invoices, what does a client owe. " +
        "Joins the invoice ledger with the unified customer directory.",
      inputSchema: z.object({
        query: z.string().optional().describe("Name, email, invoice number, or directory id"),
        status: z.enum(["unpaid", "overdue", "paid", "any"]).default("unpaid"),
        unmatchedOnly: z.boolean().default(false).describe("Only invoice clients with no directory match"),
        limit: LIMIT,
      }),
      requiredCapability: "finance.read",
      risk: "low",
      tenantScope: "tenant",
      requiresApproval: false,
      audit: true,
      handler: async (args) => {
        const customers = await listUnifiedCustomers();
        const clients = await listClients();
        const invoices = await listInvoices();
        const res = queryReceivables(
          {
            query: args.query,
            status: args.status,
            unmatchedOnly: args.unmatchedOnly,
            limit: args.limit,
          },
          customers,
          clients,
          invoices
        );
        return jsonText(res);
      },
    },

    // 6. Mock HIGH-risk action (approval-gate demonstration) -----------------
    {
      key: "test.risky_action",
      name: "saabai_test_risky_action",
      description:
        "Mock HIGH-risk action that requires a human approval before it executes. Demonstrates the approval gate.",
      inputSchema: z.object({
        action: z.string().optional().default("test-action"),
        amount: z.number().optional(),
      }),
      requiredCapability: "test.write",
      risk: "high",
      tenantScope: "tenant",
      requiresApproval: true,
      audit: true,
      handler: async (args) =>
        jsonText({ executed: true, action: args.action, note: "Mock HIGH-risk action executed after approval." }),
    },

    // 7. Approvals: resolve (approve/reject + execute) ------------------------
    {
      key: "approvals.resolve",
      name: "saabai_approvals_resolve",
      description: "Resolve a pending gate approval. On 'approve', executes the stored action and audits it.",
      inputSchema: z.object({
        requestId: z.string(),
        decision: z.enum(["approve", "reject"]),
        reviewer: z.string().optional(),
      }),
      requiredCapability: "approvals.write",
      risk: "medium",
      tenantScope: "tenant",
      requiresApproval: false,
      audit: true,
      handler: async (args, ctx) => {
        const req = await getApprovalRequest(args.requestId);
        if (!req) return jsonText({ error: "Approval request not found" });
        const reviewer = args.reviewer ?? ctx.agent;
        if (args.decision === "reject") {
          const updated = await resolveApproval(req.id, "rejected", reviewer);
          return jsonText({ status: updated?.status, requestId: req.id });
        }
        const tool = getToolByKey(req.toolKey);
        if (!tool) {
          await resolveApproval(req.id, "failed", reviewer);
          return jsonText({ status: "failed", error: "Tool not found" });
        }
        try {
          const executed = await executeToolHandler(tool, req.args, ctx);
          await recordAudit({
            tenantId: ctx.tenantId,
            agent: ctx.agent,
            tool: tool.name,
            toolKey: req.toolKey,
            args: req.args,
            risk: tool.risk,
            approvalState: "executed",
            result: executed,
            latencyMs: 0,
          });
          await resolveApproval(req.id, "executed", reviewer, executed);
          return jsonText({ status: "executed", requestId: req.id, result: executed });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await resolveApproval(req.id, "failed", reviewer, { error: msg });
          return jsonText({ status: "failed", requestId: req.id, error: msg });
        }
      },
    },

    // 8. Approvals: get -------------------------------------------------------
    {
      key: "approvals.get",
      name: "saabai_approvals_get",
      description: "Read a gateway approval request by id (status, requester, args, outcome).",
      inputSchema: z.object({ requestId: z.string() }),
      requiredCapability: "approvals.write",
      risk: "low",
      tenantScope: "tenant",
      requiresApproval: false,
      audit: true,
      handler: async (args) => {
        const req = await getApprovalRequest(args.requestId);
        return jsonText({ approval: req });
      },
    },
  ];
}
