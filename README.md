# Saabai Platform

AI-powered sales and legal intelligence platform built on Next.js 16 App Router.

## Products

**Rex** — AI sales agent for trade and manufacturing businesses. Handles product enquiries, live pricing calculations, lead capture, and CRM sync. Embeds on client websites via iframe widget.

**Lex** — AI legal research and drafting assistant for law firms. Searches AustLII, ATO, legislation.gov.au, ASIC, and Fair Work. Generates court-ready documents from a configurable template library. Per-firm customisation via the Client Portal.

**Client Portal** — Firm configuration dashboard. Controls agent personality, writing style, skill packs, language rules, and the "Lawyer Behind the Agent" persona DNA.

## Stack

- Next.js 16 App Router (TypeScript)
- Vercel (Node.js runtime, `maxDuration` per route)
- AI SDK v6 (`streamText`, `generateText`, `stepCountIs`)
- Anthropic Claude (Sonnet for research, configurable via env vars)
- Upstash Redis — conversation threads, portal settings, leads
- Resend — transactional email
- Tailwind CSS v4

## Development

```bash
npm run dev      # local dev server
npm run build    # TypeScript compile + Next.js build (run before every commit)
npm run lint     # ESLint
git push         # triggers Vercel auto-deploy
```

## Key Env Vars

| Var | Purpose |
|-----|---------|
| `ANTHROPIC_API_KEY` | Claude API |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Redis persistence |
| `PORTAL_SESSION_SECRET` | HMAC key for signed session cookies |
| `REX_DASHBOARD_PASSWORD` | Rex dashboard login |
| `RESEND_API_KEY` | Email delivery |

## Architecture Notes

- Rex widget is an iframe-embeddable page at `/rex-widget`. Host sites resize the iframe via `postMessage`.
- Portal sessions are self-contained HMAC-SHA256 signed tokens — no Redis lookup required for auth.
- Lex threads are scoped per logged-in user email and persisted to Redis with a 90-day TTL.
- Multi-client configs: `lib/rex-config.ts` (Rex) and `lib/lex-config.ts` (Lex) — add new clients there.
