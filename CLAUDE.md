# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- Next.js 16 App Router (TypeScript)
- Tailwind CSS with custom CSS variables for brand theming
- Vercel (Node.js runtime) for API routes
- AI SDK (`ai` package v6) with `streamText` + `stepCountIs`
- Resend for email, Pipedrive for CRM, Make.com webhooks
- Upstash Redis (`@upstash/redis`) for persistence — NOT ioredis

## Commands

```bash
npm run predeploy  # Run this before every commit/push — catches TypeScript, Stripe version, and build errors
npm run dev       # local dev server
npm run lint      # ESLint
git push          # triggers Vercel auto-deploy
```

**Always run `npm run predeploy` before committing. Never commit code that fails to build.**

## Key Files

| File | Purpose |
|------|---------|
| `app/components/PeterAvatarWidget.tsx` | Rex chat widget UI — launcher, chat window, voice mode, end panel |
| `app/api/pete-chat/route.ts` | Rex AI backend — system prompt, tools (searchProducts, captureLead, calculatePrice) |
| `lib/rex-knowledge.ts` | Rex knowledge base — all pricing tables, product info, company details |
| `app/api/rex-leads/route.ts` | Lead capture — Resend emails, Pipedrive CRM, Make.com webhook |
| `app/rex-widget/page.tsx` | Embeddable iframe page (`/rex-widget`) — used on client websites |
| `app/rex-changelog/ChangelogClient.tsx` | Rex changelog UI |
| `app/components/ChatWidget.tsx` | Mia — Saabai's own AI widget |
| `lib/woo-client.ts` | WooCommerce REST API — product search + cut-to-size pricing |
| `lib/chat-config.ts` | Model selection helper — use this for all model references |
| `lib/redis.ts` | All Redis operations — conversations, leads, Edge memory, social queues |
| `scripts/update-changelog.js` | Auto-update script run by post-commit git hook |

## Architecture

- `/rex-widget` is an iframe-embeddable page. Parent sites embed it with a small fixed iframe (88×88px) that resizes to 420×720px on open via `postMessage({ rexWidget: "open"|"closed" })`.
- Rex widget CSS uses scoped CSS variables (`--saabai-teal: #25D366`, etc.) so branding doesn't bleed into host pages.
- Conversation persistence via `localStorage` key `rex_conversation` with 24hr TTL.
- Quick replies are randomised from a pool of 12 on each session.

---

## CRITICAL RULES — READ BEFORE MAKING ANY CHANGES

### 1. Verify Vercel deployment after every push

After `git push`, **always confirm the Vercel build succeeded**. A successful push to GitHub does NOT mean the site is live.

```bash
vercel ls   # check latest deployment state — must be READY not ERROR
```

Or check: `vercel.com/shanegoldbergs-projects/saabai-site`

Never tell the operator something is "live" until you have confirmed the Vercel deployment state is READY.

### 2. Changelog is auto-updated — do NOT manually add entries

A post-commit git hook runs `scripts/update-changelog.js` after every commit. It automatically adds an entry to `app/rex-changelog/ChangelogClient.tsx` based on the commit message.

**Do not manually edit ChangelogClient.tsx to add entries for your own commits** — the hook does this automatically. Only manually edit it to correct or backfill entries that were missed.

The hook classifies tags from commit message prefixes:
- `fix:` → FIX
- `feat:` → NEW
- `[FIX]`, `[NEW]`, `[UI]`, etc. → uses that tag directly
- Anything else → UPDATE

### 3. Model IDs — use dashes, not dots

Anthropic model IDs use **hyphens**, not dots. Wrong IDs are silently rejected by the API.

| Correct | Wrong |
|---------|-------|
| `claude-haiku-4-5-20251001` | `claude-haiku-4.5` |
| `claude-sonnet-4-6` | `claude-sonnet-4.6` |
| `claude-opus-4-6` | `claude-opus-4.6` |

**Always use `lib/chat-config.ts` functions instead of hardcoding model strings:**
```ts
import { getDefaultModel, getPremiumModel } from "../../../lib/chat-config";
// Supports providers: "anthropic", "openai", "google", "xai"
// Controlled via env vars: DEFAULT_CHAT_MODEL, PREMIUM_CHAT_MODEL, SAABAI_CHAT_MODEL
```

### 4. Redis — use @upstash/redis only

The project uses `@upstash/redis` (HTTP-based, works in Vercel serverless). **Never use `ioredis`** — it is not installed and will break the build.

When calling `hgetall`, always provide the generic type:
```ts
const raw = await client.hgetall<Record<string, string>>(`key:${id}`);
```

When calling `set` with expiry:
```ts
await redis.set(key, value, { ex: 900 });  // NOT ("EX", 900)
```

### 5. TypeScript compilation scope

The `atlas/` directory is excluded from Next.js TypeScript compilation in `tsconfig.json`. Do not remove this exclusion. Atlas scripts are standalone Node.js tools, not part of the Next.js app.

### 6. Edge profile uses a fixed ID

`getEdgeProfile()` and `saveEdgeProfile()` in `lib/redis.ts` use the constant `EDGE_PROFILE_ID = "shane"` as the default profile key. This is a single-user system — do not generate random IDs for the profile.

### 7. Cron routes must have auth

All cron routes must check `Authorization: Bearer ${CRON_SECRET}`:
```ts
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ...
}
```

### 8. Git Hygiene — Avoid messy rebases and divergence

- **Always sync first**: Run `git pull --rebase origin main` at the start of every session.
- **Never let divergence grow**: If you see "Your branch and 'origin/main' have diverged", fix it immediately with `git pull --rebase`.
- **Do NOT manually edit changelog files**: The post-commit hook handles them. Manual edits are the #1 cause of rebase conflicts.
- **When things go wrong**: `git rebase --abort && git reset --hard origin/main` is the clean reset.
- **Push only after clean state**: Your branch must be "up to date with origin/main" before pushing.

### 9. Custom-domain hydration trap — the #1 recurring failure

Client custom domains (boconsulting.com.au, nicomoretti.au, wholesalehomes.com.au) are served via `proxy.ts` rewrite: the browser URL is `/` while the app renders `/sites/<slug>`, so **React hydration fails silently — onClick, useEffect, and usePathname DO NOT work there**.

- All interactivity on client sites (chat widget, hamburger, form tabs, scroll reveals) must be vanilla JS injected via raw `<script dangerouslySetInnerHTML>` in the layout.
- Never gate content visibility behind JS: `opacity:0`/reveal styles only under an `html.<prefix>-js` class that JS adds — the page must be fully visible without JS.
- Widget/ticker suppression by hostname, not path.
- Verify EVERY site change in three places: `saabai.ai/sites/<slug>` AND the custom domain (www + apex) AND a mobile viewport. All three, every time.

### 10. Client-facing copy rules

Zero em dashes (—) and no AI-tell phrases anywhere client-facing: page copy, FAQs, JSON-LD strings, chatbot prompts/responses, meta descriptions. Run `grep -n '—'` on touched files before shipping. Australian English (optimise, colour, customised). Unique copy per page — never templated clones across location pages. Client sites are fully white-label: no Mia widget, no news ticker, no saabai.ai sender addresses; leads route to the client's own email.

### 11. Wrong-repo guard

This repo = saabai.ai + client sites ONLY. mylife.saabai.ai lives in `~/mylife-saabai`. Rex pushes: `git pull` first, then push to BOTH remotes (sg-satoshi/rex + dhargraves1987-sys/rex). State the target repo before any push.

---

## Playbooks — read on demand (don't load unless the task matches)

| When the task is… | Read |
|---|---|
| New client site (Stitch mockup → live) | `docs/claude/new-client-site-checklist.md` |
| "update for rex" / Rex pricing or knowledge | `docs/claude/rex-playbook.md` |
| SEO, location pages, Google Search Console | `docs/claude/seo-pass.md` |
| Anything touching a specific client, DNS, or admin accounts | `docs/claude/clients-and-ops.md` |

## Task management

- Plan non-trivial work in `tasks/todo.md` (checkable items; review section when done).
- After ANY correction from Shane: add the pattern + prevention rule to `tasks/lessons.md`. Read `tasks/lessons.md` at session start.
- Before retrying an approach that failed before: check `tasks/failed-attempts.md` — don't repeat a documented dead end. Record new dead ends there.
- Deferred work ("later", "not now") goes in `tasks/roadmap.md`.

---

## Current Model Configuration (via Vercel env vars)

| Env Var | Value | Used by |
|---------|-------|---------|
| `DEFAULT_CHAT_MODEL` | `xai:grok-3-mini` | Rex default tier, Mia |
| `PREMIUM_CHAT_MODEL` | `anthropic:claude-sonnet-4-6` | Rex qualified leads |
| `SAABAI_CHAT_MODEL` | `xai:grok-3-mini` | Saabai internal chat |
| Edge chat | `anthropic:claude-opus-4-6` | Hardcoded — Shane's personal coach |
