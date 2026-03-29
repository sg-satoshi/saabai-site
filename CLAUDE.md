# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- Next.js 15 App Router (TypeScript)
- Tailwind CSS with custom CSS variables for brand theming
- Vercel Edge Runtime for API routes
- AI SDK (`ai` package) with `streamText` + `stepCountIs`
- Resend for email, Pipedrive for CRM, Make.com webhooks

## Commands

```bash
npm run dev       # local dev server
npm run build     # production build (run to verify before committing)
npm run lint      # ESLint
git push          # triggers Vercel auto-deploy
```

Always run `npm run build` to catch errors before committing.

## Key Files

| File | Purpose |
|------|---------|
| `app/components/PeterAvatarWidget.tsx` | Rex chat widget UI — launcher, chat window, voice mode, end panel |
| `app/api/pete-chat/route.ts` | Rex AI backend — system prompt, tools (searchProducts, captureLead, calculatePrice) |
| `lib/rex-knowledge.ts` | Rex knowledge base — all pricing tables, product info, company details |
| `app/api/rex-leads/route.ts` | Lead capture — Resend emails, Pipedrive CRM, Make.com webhook |
| `app/rex-widget/page.tsx` | Embeddable iframe page (`/rex-widget`) — used on client websites |
| `app/rex-changelog/ChangelogClient.tsx` | Rex changelog UI — **update this on every Rex change** |
| `app/components/ChatWidget.tsx` | Mia — Saabai's own AI widget |
| `lib/woo-client.ts` | WooCommerce REST API — product search + cut-to-size pricing |
| `lib/chat-config.ts` | Model selection helper |

## Architecture

- `/rex-widget` is an iframe-embeddable page. Parent sites embed it with a small fixed iframe (88×88px) that resizes to 420×720px on open via `postMessage({ rexWidget: "open"|"closed" })`.
- Rex widget CSS uses scoped CSS variables (`--saabai-teal: #25D366`, etc.) so branding doesn't bleed into host pages.
- Conversation persistence via `localStorage` key `rex_conversation` with 24hr TTL.
- Quick replies are randomised from a pool of 12 on each session.

## Rex Changelog — MANDATORY RULE

**Every time any change is made to Rex** (widget UI, system prompt, pricing, API routes, embed code, bug fixes), you MUST add an entry to `app/rex-changelog/ChangelogClient.tsx` before committing.

Entry format:
```ts
{ time: "HH:MM", tag: "TAG", title: "Brief description of what changed" }
```

Tags: `NEW` | `FIX` | `IMPROVEMENT` | `PRICING` | `UI` | `DEPLOYMENT` | `DEBUG`

Add the entry to the correct date group (today's date). If today's date doesn't exist yet, add a new day block at the top of the `CHANGELOG` array. Use Brisbane AEST time (UTC+10).

Also update the `STATS` totals in the same file if the numbers have changed meaningfully.

Commit both the change and the changelog update together in a single commit.
