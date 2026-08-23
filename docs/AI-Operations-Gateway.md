# Saabai AI Operations Gateway — Architecture Plan (v1)

> Combines the ChatGPT "Saabai AI Operations Gateway" spec with the verified read-only MCP already built in this repo.
> Decision: build the gateway architecture **inside `saabai-site`** (one deploy, reuse Redis/Stripe/auth), reusing the
> existing domain layer, and adopting the spec's guardrail layers (permissions, risk, approvals, audit, business rules)
> **incrementally** — not the monorepo/10-connector/admin-console scope, which the spec itself warns is premature for a
> platform with no users. Reuse good infrastructure; replace only where justified.

---

## 0. What already exists (verified — do NOT rebuild)

| Existing | Path | Role in the gateway |
|---|---|---|
| Unified customer directory | `lib/customers.ts` (`listUnifiedCustomers`) | Connector/service: aggregates Lex/SiteFactory/Stripe/Portal/LeadGen/Audit |
| Consulting invoice ledger | `lib/invoice-store.ts` | Connector/service: Redis-backed SG-NNN invoices + clients |
| AR join (crown jewel) | `lib/receivables.ts` | Service: `queryReceivables`, `attachReceivables`, `clientsWithReceivables`, `invoiceAmountToCents` |
| Auth gate | `lib/mcp/auth.ts` | Bearer `MCP_API_KEY` + optional admin cookie, fail-closed |
| Tool registration | `lib/mcp/server.ts` | `createSaabaiMcpServer()` registers 5 read-only tools |
| Endpoint | `app/api/mcp/route.ts` | Stateless Streamable HTTP on Vercel, nodejs, fresh server+transport per request |
| Verified | `scripts/verify-receivables.ts`, `scripts/verify-mcp.ts` | Both ALL PASS; `tsc` + `npm run build` clean |

The handlers already **call the service layer, not raw code** — which is the spec's core principle. So the "connector abstraction"
is largely already here; we formalize it rather than invent it.

---

## 1. System architecture (layers)

Same as the spec's conceptual stack, implented in-repo:

```
AI CLIENTS (OpenAI, Claude, Hermes, Saabai agents)
        ↓  (MCP streamable HTTP, stateless)
SAABAI AI OPERATIONS GATEWAY   (in saabai-site: app/api/mcp + lib/mcp/*)
  auth → permissions → tool registry → risk → business rules → approval gate → audit
        ↓
SAABAI SERVICES (connector/service layer)   (lib/*)
  customers.ts · invoice-store.ts · receivables.ts · (future: crm/email/docs connectors)
        ↓
BUSINESS SYSTEMS / STORAGE   (Upstash Redis, Stripe, Pipedrive, Resend, Vercel Blob)
```

## 2. Tenancy model

- **Now:** single-tenant (tenant = `"saabai"`). Every execution context carries a `tenantId` (default `"saabai"`) so the
  model is **multi-tenant-ready without over-building** a tenant DB today.
- **Adopt now:** thread `tenantId` through the execution context and audit events; scope connector access + secrets per
  tenant. **Defer:** a tenant registry table / per-tenant secret vault until a real external client needs it.
- **Tradeoff:** single-tenant-in-code but tenant-aware-in-model. Cheap now, removes the "no way to add a tenant later"
  trap without building tenant infrastructure for zero tenants.

## 3. Security & auth model

- **Inbound (AI client → gateway):** Bearer `MCP_API_KEY` (32+ random bytes, `timingSafeEqual`, fail-closed in prod),
  plus optional admin session cookie. Already built in `lib/mcp/auth.ts`.
- **Downstream (gateway → SaaS):** service-account/API keys held in env, **never** exposed to agents. Connector layer
  owns credentials; agents only see tool results.
- **Capability-based access:** agents/roles declare capabilities (e.g. `crm.read`, `finance.read`, `finance.write`). Tools
  declare `requiredCapability`. A `permissions` check runs before the handler.

## 4. Tool registry + metadata (the core new abstraction)

Every tool is a **metadata object**, not a bespoke handler:

```ts
interface SaabaiTool {
  key: string;                       // "crm.search_contacts"
  name: string;                      // MCP name (mcp_ prefix applied by client)
  description: string;
  inputSchema: z.ZodType;            // validated
  outputSchema?: z.ZodType;
  requiredCapability: string;        // "crm.read"
  risk: "low" | "medium" | "high" | "critical";
  tenantScope: "global" | "tenant";
  requiresApproval: boolean;         // set from risk unless overridden
  audit: boolean;                    // default true
  handler: (args, ctx) => Promise<CallToolResult>;
}
```

- `lib/mcp/registry.ts` — holds `SaabaiTool[]`; `registerTool(meta)` with minimal boilerplate. `createSaabaiMcpServer()`
  iterates the registry to auto-register with the MCP SDK, wrapping each handler with: validate → permission → risk →
  business-rule → approval gate → execute → audit.
- **Migrate the 5 existing tools** into the registry (risks all `low`, capabilities `customers.read` / `finance.read`).
- Adding a new tool = define meta + a service call. No MCP plumbiing.

## 5. Risk classification

Enum `low | medium | high | critical` on each tool. Guides the approval gate and audit tier. Read-only tools are `low`;
future `email.send_message` = `high`, `finance.create_invoice` ≥ threshold = `high`, permission changes = `critical`.

## 6. Permission / capability model

- `lib/mcp/permissions.ts` — roles (`admin`, `agent`) → capability map; `assertCapability(ctx, requiredCapability)`.
- Default agent profile: `customers.read`, `finance.read`. Write/privileged capabilities require `admin` or explicit grant
  (future: a small per-tenant capability table in Redis).

## 7. Approval gates

- `lib/mcp/approval.ts` — states `pending | approved | rejected | expired | executed | failed`. Stored in Redis
  (`approvals:{id}`). Request carries: tenant, agent, tool, args, risk, reviewer, timestamps, outcome, execution result.
- Gate behaviour for `requiresApproval` tools: instead of executing, return a structured `approval_required` result with a
  request id. A separate `approvals.approve` / `approvals.reject` path resolves it, then the action executes.
- **Adopt now (architecture only, no risky tool yet):** build the approval store + gate + resolve path with a mocks
  HIGH tool. **Defer:** any real write tool until approval is wired (see §11).

## 8. Business rules layer

- `lib/mcp/rules.ts` — deterministic predicates that gate execution (return `blocked` or `approval_required` + reason).
- Seed rules (configurable per tenant later): invoice amount threshold → approval; do_not_contact → block; confidential
  document exposure → block for low-privilege agents. **No model decides these — they are code.**

## 9. Audit logging

- `lib/mcp/audit.ts` — append-only event per execution; Redis list `audit:events` (or hash) with: timestamp, tenant,
  agent, tool, args (redacted), risk, approval state, connector, result/excerpt, latency, error, request id.
- Redact secrets/args patterns before persist. Seed a `saabai_admin_audit` reader query later (dashboard-ready).

## 10. Deployment

- Same Vercel deploy (`app/api/mcp`), `runtime=nodejs`, `maxDuration=30`, stateless transport (fresh server+transport per
  request) — **already proven.** No separate gateway service; the endpoint is already on the existing host. Long-running
  connectors/workflows are future; for now stateless serverless is correct (the spec says don't force a heavier
  architecture where streamable HTTP in serverless is fine).

## 11. Data model

- **Now:** Redis (Upstash) — reuse existing keys; add `approvals:{id}` and `audit:events`. No new DB.
- **Document** a Postgres path for the future (tenants, agents, roles, connections, tool_executions, approvals,
  workflows) as a migration-ready schema sketch, but do **not** scaffold a Postgres deploy for zero tenants.
- Secrets stay in env/Vercel, never in DB fields.

## 12. Backlog: what's deferred (purposefully)

True multi-tenant user/tenant registry, 10+ provider connectors (Pipedrive/Salesforce/Gmail/Drive/Xero), workflow
orchestration engine, admin console UI, separate `apps/gateway` monorepo, full 10–20 tool set. Each is gated on a real
external client existing. The KPI ("% reuse across client deployments") is achieved via the **registry metadata model +
service-layer abstraction + configuration-over-code**, which this plan builds now.

---

## Build order (incremental)

1. ✅ **Foundation (done):** `lib/mcp/schema.ts` (SaabaiTool metadata), `lib/mcp/registry.ts` (metadata-driven registry + guardrail chain), `lib/mcp/permissions.ts` (capability gate), `lib/mcp/tools.ts` (5 read tools as metadata), `lib/mcp/server.ts` (server from registry). Verified: `tsc` + `verify-mcp` green.
2. ✅ **Guardrails (done):** `lib/mcp/businessRules.ts` (rules), `lib/mcp/audit.ts` (append-only audit), `lib/mcp/approval.ts` (approval store + gate), `lib/mcp/store.ts` (Redis-or-memory persistence), mock `test_risky_action` + `approvals_resolve`/`approvals_get`. Verified: approval e2e (pending→reject/approve→executed), permission-negative, audit recording all pass.
3. ⬜ **Tenancy:** thread `tenantId` into ctx + audit (already defaulted; formalize per-tenant rules).
4. ⬜ **Write path (real need):** invoicing automation (create/send SG-NNN) gated by approval + rules + audit.
5. ⬜ **Admin reader:** surface audit + approvals for a future dashboard.
6. Verify each with the existing test-harness pattern; keep `tsc` + `build` green.

**Definition of success (adapted):** 1 AI agent → 1 gateway endpoint → registry-driven tools → service layer →
isolation + permissions + approval + audit demonstrated end to end, and adding a new capability does **not** require
rebuilding the platform.
