# MCP Gateway Deployment & Operations Notes

**Purpose:** Hard-won lessons from deploying the Saabai AI Operations Gateway (MCP) to production on the master domain. Read before changing the gateway or adding new `/api` endpoints.
**Last Updated:** 2026-08-23
**Design doc:** `docs/MCP-server-design.md` · **Build plan:** `docs/AI-Operations-Gateway.md`

---

## TL;DR

The gateway is **live at `https://saabai.ai/api/mcp`** (master domain), Bearer-auth via `MCP_API_KEY`, 8 tools, wired into Hermes. The single most important operational rule: **any new `/api/*` endpoint returns 401 on the master domain unless it is whitelisted in `proxy.ts`** (`PUBLIC_API` for self-authenticated routes, or `ADMIN_API` for admin-gated routes). Custom domains silently bypass the API gate, so a custom-domain test is NOT proof of production.

---

## The proxy gate (root cause of the saabai.ai 401)

`proxy.ts` (Next 16 middleware) enforces API authorization in two distinct branches:

1. **Custom domains** (any host that is not `saabai.ai`, `*.saabai.ai`, `*.vercel.app`, `localhost`): rewrites to `/sites/{slug}` via the Redis `saabai:domain-map`, and **passes ALL `/api/*` through untouched** (line ~178-180). No session gate, no PUBLIC_API check.
2. **Master domain (`saabai.ai`)** and `*.saabai.ai` / `*.vercel.app`: falls through to the **deny-by-default API gate**. A request to `/api/*` is allowed only if it matches `PUBLIC_API` (public, self-authenticated) or `ADMIN_API` (requires an admin session). Otherwise it returns **401 `{"error":"Unauthorized"}`** with no session cookie.

### How this bit us (2026-08-23)

- The MCP gateway `/api/mcp` was **not** in `PUBLIC_API` or `ADMIN_API`.
- On the master domain (`saabai.ai/api/mcp`) the proxy returned **401 before the route's own `authorizeRequest()` ever ran**.
- On a custom domain it "worked" because `/api/*` passes through there. The custom domain was **`operavo.co`** (see below), which is why the gateway appeared to be "live" on it while 401ing on the real master.

### The fix

Add the route to `PUBLIC_API` in `proxy.ts` (it self-authenticates via `Authorization: Bearer MCP_API_KEY` in `lib/mcp/auth.ts`), so the proxy lets it through and the route enforces the real key. Committed `857ffb7`.

> Equivalent MCP-endpoint note: `matches()` checks `pathname === p || pathname.startsWith(p + "/")`, so a single `"/api/mcp"` entry covers the exact path (the stateless Streamable HTTP endpoint only serves `/api/mcp`).

---

## Domain facts

- **`saabai.ai` is the master domain.** Apex serves directly (the apex-to-www redirect was removed); `www.saabai.ai` redirects to apex. DNS is grey-cloud (DNS-only) to Vercel.
- **`operavo.co` is a TEST domain** added to a site-factory Tributum Law site (`/sites/tributum-law-v2`) to test running a factory site on its own domain before customer domains. It is not a production endpoint, and it should not be used as the gateway host.
- Vercel's "Latest Production URL" for a project is **not authoritative**; it happened to show `operavo.co` (the test domain). Always confirm against the actual master domain, not that display value.

---

## DNS pattern for custom domains (grey-cloud to Vercel)

Proven working (matches `operavo.co`, `mylife.saabai.ai`):

| Record | Target | Proxy |
|--------|--------|-------|
| apex (`@`) | `76.76.21.21` (Vercel) | **DNS only** (grey) |
| `www` | `cname.vercel-dns.com` | **DNS only** (grey) |

Using Cloudflare **proxied** (orange cloud) on a domain serving a Vercel API can cause the proxy to alter the request so that its own auth rejects the Bearer key. Grey-cloud keeps the request hitting Vercel directly.

---

## Finance write path (Phase 3, live 2026-08-23)

- **`finance.create_invoice`** (`saabai_create_invoice`) creates a B2B consulting invoice (SG-NNN) in the ledger. Always **approval-gated** (`risk: high`, `requiresApproval: true`), audited, and requires the `finance.write` capability (granted to the operator agent). The number is auto-generated; `GST` stays `0` (not GST-registered). Handler validates the client exists first.
- **Invoice file-naming convention (owner requirement):** any invoice PDF/attachment filename must read **"Invoice SG-NNN.pdf"** (with the "Invoice " prefix), e.g. "Invoice SG-044.pdf", never just "SG-044.pdf". Apply wherever a filename is generated (email attachment, download link).
- **Sending (email) is the next increment** — the create/write path is done; emailing the invoice is separate and not yet built.

---

## Operational rules going forward

1. **New `/api/*` route → update `proxy.ts`** (add to `PUBLIC_API` or `ADMIN_API`) in the same change, or it will 401 on the master domain.
2. **Do not trust a custom-domain test as proof.** A custom domain bypasses the API gate, so a 200 there does not mean the endpoint is reachable on the master.
3. **Verify on the master** (`saabai.ai`) with the real auth before calling something done. Use `hermes mcp test saabai` and a `tools/list` POST for the gateway.
4. **Gateway deployment check:** `curl -s -o /dev/null -w "%{http_code}" -X POST https://saabai.ai/api/mcp -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -H "Authorization: Bearer $MCP_API_KEY" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"v","version":"1"}}}'` → expect 200.
