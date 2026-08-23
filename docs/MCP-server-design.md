# Saabai.ai MCP Server — P0 Read-Only Design (RECONCILED)

> Source: Grok 4.6 design spec (delegation `deleg_6b08ea15`), reconciled against the live
> `saabai-site` codebase on 2026-08-22. Owner approved scope. **P0 = read-only**, internal,
> HTTP remote with real auth. Writes + cron invoicing automation are a SEPARATE later phase.

## Fixed decisions

| Decision | Choice | Rationale |
|---|---|---|
| Transport | HTTP Streamable on `/api/mcp` | Remote + real auth day one; Hermes native MCP sends static `headers`. |
| Hosting | Next.js route on Vercel (not standalone) | One deploy; shares Redis/Stripe/env with the app. |
| SDK | `@modelcontextprotocol/sdk` (TypeScript) | Same language as Next.js 16 app. |
| Auth | `MCP_API_KEY` bearer; admin session cookie optional extra | Matches existing `CRON_SECRET` bearer pattern; cookies can't be the MCP path. |
| Surface | Exactly three: directory, consulting ledger (SG-NNN), invoice clients | No scope creep. No leads/site-registry/lex-config tools. |
| Tools | Five read-only tools | Three surfaces + get-by-id + the receivables join. |
| Join | Computed email→name; NO new Redis keys | Read-only P0; ledger-only clients stay visible. |
| Data access | Shared `lib/*`; NO HTTP loopback | Cron/bots/admin/MCP stay consistent; avoids cookie recursion. |
| Writes | None | Separate later phase. |

## Resolved money unit (confirmed from code)

`Invoice.subtotal` / `total` are **dollars** (2dp). `UnifiedCustomer.revenue` / `mrr` are **cents**.
Single adapter `invoiceAmountToCents(dollars) = Math.round(dollars * 100)` lives in `lib/receivables.ts`.
`gst` is always `0` (business is NOT GST-registered).

`zod` is ALREADY a dependency (`^4.3.6`) — do not reinstall. Only NEW dep:
`npm install @modelcontextprotocol/sdk --ignore-scripts`
(puppeteer `^24.43.1` is in devDependencies; `--ignore-scripts` is mandatory to avoid a hanging Chromium postinstall.)

## Tool contract (five read-only tools, prefix `saabai_`)

1. **`saabai_list_customers`** — unified directory (lex/site-factory/stripe/portal/leadgen/audit).
   Wraps `listUnifiedCustomers()` (extracted from `app/api/admin/customers/route.ts`).
   Input: `query`, `type`, `status`, `includeReceivables`, `limit`. Output: `{ customers, total }`.
   With `includeReceivables:true`, each row may gain a `receivables` summary (§ Join).
2. **`saabai_list_invoices`** — consulting invoices (SG-NNN). Wraps `listInvoices()`.
   Input: `status`, `clientId`, `number` (exact/prefix), `limit`. Output: `{ invoices }`.
3. **`saabai_get_invoice`** — one invoice by Redis `id` OR `number`. Wraps `getInvoice()` + fallback.
   Output: `{ invoice, client }` (client joined via `invoice.clientId`).
4. **`saabai_list_invoice_clients`** — invoice clients w/ outstanding totals. Wraps `listClients()` + rollup.
   Output: `{ clients: Array<InvoiceClient & { receivables }> }`.
5. **`saabai_query_receivables`** — ★ highest value. Cross-business AR: "who has unpaid invoices", "what does X owe".
   Wraps `queryReceivables()` in `lib/receivables.ts`. Input: `query`, `status` (default `unpaid`), `unmatchedOnly`, `limit`.
   Output: `{ rows: [{ invoiceClient, match:{method, customer}, receivables, invoices }], totals }`.

## Join / augmentation

Computed, request-scoped, in `lib/receivables.ts`. Directory (A) and ledger (B) are separate
Redis/source namespaces; `UnifiedCustomer.id` is source-scoped, `Invoice.clientId → InvoiceClient.id`.
Match order (first hit wins): 1) normalized email, 2) normalized name (len ≥ 4), 3) else `method:"none"`
(ledger-only client still shown). If an invoice client matches multiple directory rows (same email across
stripe+portal), keep the first as `match.customer` and the rest under `match.also`. Never merge revenue/mrr
across sources. `attachReceivables()` gives directory-only customers a zero-summary (so missing ≠ owes nothing).

**Never expose** `MY_INFO` / `PAY_INFO` / bank account details as a tool field.

## Endpoint + domain layer

- `app/api/mcp/route.ts`: `runtime = "nodejs"`, `dynamic = "force-dynamic"`, `maxDuration = 30`.
  Auth first → Streamable HTTP transport via SDK. No data logic in the route.
- `lib/customers.ts`: `listUnifiedCustomers()` — move the 6-source aggregation out of the admin route unchanged.
- `lib/invoice-store.ts`: unchanged (do not call `nextInvoiceNumber` or any setter from MCP).
- `lib/receivables.ts`: join, summaries, `queryReceivables`, `invoiceAmountToCents`.
- `lib/mcp/auth.ts`: bearer + optional admin cookie, fail-closed.
- `lib/mcp/server.ts` + `lib/mcp/tools.ts`: create the server, register the five tools.
- Admin routes (`/api/admin/customers`) refactor to call `listUnifiedCustomers()` — behavior-preserving.

## Auth model

- `MCP_API_KEY` (new env var, 32+ random bytes). Do NOT reuse `CRON_SECRET` (cron writes later).
- Compare with `crypto.timingSafeEqual`. 401 on mismatch.
- If unset: fail closed in production (`VERCEL_ENV === "production"` → 503); local dev allows cookie-admin or `.env.local` key.
- Cookie alternate: `verifySessionToken` + `clientId === SAABAI_ADMIN_ID`. Useful for browser curl; not the MCP (Hermes) path.
- No OAuth / per-tool ACL / IP allowlist in P0.

Hermes client config (outside repo):
```yaml
mcp_servers:
  saabai:
    url: https://<prod-host>/api/mcp
    headers:
      Authorization: Bearer <MCP_API_KEY>
```

## File layout

Add: `app/api/mcp/route.ts`, `lib/customers.ts`, `lib/receivables.ts`, `lib/mcp/auth.ts`, `lib/mcp/server.ts`, `lib/mcp/tools.ts`.
Touch (refactor): `app/api/admin/customers/route.ts`, `app/api/admin/invoices/route.ts`, `app/api/admin/invoice-clients/route.ts`.
Do NOT touch for P0: `lib/invoice-store.ts` write helpers, cron routes, Stripe write paths, puppeteer.

## Ordered build plan (P0, read-only)

1. Extract `listUnifiedCustomers()` → `lib/customers.ts`; point admin GET at it. Verify `/api/admin/customers` still returns `{customers,total}` with cookie auth.
2. Lock `invoiceAmountToCents` (dollars→cents, ×100); add unit comment. Verify against one live invoice.
3. Implement `lib/receivables.ts` (summaries, email/name join, `queryReceivables`); unit-test fixtures (two clients same name / missing email / unmatched ledger client).
4. `lib/mcp/auth.ts` (bearer + optional cookie, fail-closed).
5. `lib/mcp/tools.ts` + `lib/mcp/server.ts` (register the five tools; handlers → domain fns → JSON).
6. `app/api/mcp/route.ts` (nodejs, Streamable HTTP, auth first, no data code).
7. `npm install @modelcontextprotocol/sdk --ignore-scripts`. Confirm no Chromium download.
8. Local verify (checklist). Deploy to Vercel; set `MCP_API_KEY`; verify prod.
9. Hermes: add `mcp_servers.saabai` with bearer header; run the three golden questions.
10. Stop. No writes, no cron invoicing, no extra tools.

## Risks / mitigations

- Vercel SSE/idle timeouts → stateless POST-per-message, `maxDuration=30`, pin SDK version if session GETs flap.
- Directory GET fans out to Stripe + 5 sources → same cost as today's admin page; slice output with `limit`, don't drop sources.
- Name-join false positives → email-first; name only if len ≥ 4; unmatched stay unmatched.
- Money-unit bug → one adapter, locked in step 2.
- `npm install` puppeteer hang → always `--ignore-scripts`.
- HTTP loopback from MCP → forbidden; import lib.
- Cookie-only auth on MCP → won't work; bearer mandatory for clients.
- Accidental write surface → never import `nextInvoiceNumber` or store setters into `lib/mcp/*`.
- Next.js body consumption vs SDK → pass raw `Request` to SDK transport; do not `req.json()` first.
- Redis → use only existing `@upstash/redis` helper.

## Verification checklist

**Local:** admin cookie still works on the 3 admin GETs; fail-closed 503/401 when key unset/no cookie;
`curl -X POST localhost:3000/api/mcp` with bearer completes initialize + `tools/list` → exactly five tools;
wrong bearer → 401 (no 500); `saabai_list_customers` total matches admin; known SG-NNN round-trips via `saabai_get_invoice`;
`saabai_query_receivables status=unpaid` sums equal manual reduce; unmatched ledger client appears as `match.method="none"`;
no `MY_INFO`/`PAY_INFO`/bank refs in output; install used `--ignore-scripts`.

**Hermes:** server configured with `url` + bearer header; tools appear (no cookie); Golden Q1 "which clients have unpaid invoices";
Golden Q2 "what does client X owe"; Golden Q3 "list customers and whether they have consulting AR"; prod URL works with the same header.

---

## Implementation status (2026-08-22)

Built and verified locally. Files created/modified:

**Added**
- `lib/customers.ts` — `listUnifiedCustomers()` extracted from the admin route (behavior-preserving).
- `lib/receivables.ts` — join layer: `queryReceivables`, `attachReceivables`, `clientsWithReceivables`, `invoiceAmountToCents`, `ReceivablesSummary`.
- `lib/mcp/auth.ts` — Bearer `MCP_API_KEY` + optional admin-session-cookie, fail-closed in prod.
- `lib/mcp/server.ts` — `createSaabaiMcpServer()` registering the five read-only tools.
- `app/api/mcp/route.ts` — Streamable HTTP facade (nodejs, auth-first, fresh server+transport per request).
- `scripts/verify-receivables.ts` — fixture test of the join (ALL PASS).
- `scripts/verify-mcp.ts` — in-process test of auth + transport + tools (ALL PASS).

**Refactored (behavior-preserving)**
- `app/api/admin/customers/route.ts` — now calls `listUnifiedCustomers()`.

**Dependency:** `@modelcontextprotocol/sdk` `^1.30.0` installed with `--ignore-scripts`.

**Verified**
- `npx tsc --noEmit` passes.
- `scripts/verify-receivables.ts` ALL PASS (email / name-only / no-match join, money adapter, totals).
- `scripts/verify-mcp.ts` ALL PASS (auth correct/wrong/none + prod fail-closed 503; initialize 200; five tools; two tool calls return JSON).
- `npm run build` runs in the sanctioned `predeploy` gate.

**Environment finding (pre-existing, not MCP-related):** Next.js dev/Turbopack picks the wrong workspace root because of a stray
`/Users/aiworkspace/package-lock.json` (a `node-telegram-bot-api` project at the home root). This causes (1) a root-detection warning,
(2) `.env.local` loading from the wrong dir (so shell/`.env` server vars like `MCP_API_KEY` may not reach route handlers), and (3)
hot-reload not picking up `saabai-site` edits. Fix options: set `turbopack.root` in `next.config.ts`, or relocate the stray lockfile
(or add a root `.env.local` / move the bot project). Not required for the MCP code itself; it only affects local dev testing.
