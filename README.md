# Saabai Platform

AI-powered sales and legal intelligence platform built on Next.js 16 App Router.

## Products

**Rex** — AI sales agent for trade and manufacturing businesses. Handles product enquiries, live pricing calculations, lead capture, and CRM sync. Embeds on client websites via iframe widget.

**Lex** — AI legal research and drafting assistant for law firms. Searches ATO rulings, the Federal Register of Legislation, ASIC and the Fair Work Commission, and checks case citations against a licensed snapshot of NSW Caselaw, Federal Court and High Court decisions (Open Australian Legal Corpus v7.1.0, cutoff 10 March 2025). Drafts from a configurable template library for a lawyer to review. Per-firm customisation via the Client Portal.

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
| `RESEND_API_KEY` | Email delivery |
| `COUPON_HASH_SECRET` | Keys the HMAC of customer emails for one-use-per-customer coupons. 32+ chars. Falls back to `SAABAI_SESSION_SECRET` if unset or too short. Don't rotate once codes are in use: it resets everyone's usage. |

## Architecture Notes

- Portal sessions are self-contained HMAC-SHA256 signed tokens — no Redis lookup required for auth.
- Lex threads are scoped per logged-in user email and persisted to Redis with a 90-day TTL.
- Lex client config lives in `lib/lex-config.ts`.

## OALC citation index (Lex v0)

Licence-safe case-law layer. The index is an archive of NSW Caselaw, Federal Court and High Court decisions from Open Australian Legal Corpus **v7.1.0** (cutoff **10 March 2025**, corpus SHA-256 `5abc64a3ad35a44eca65706babd63d1095c29ebebf3f5c588beb56612097b758`). It is not current law. NSW and High Court results are citation and link only. Legislation is checked on the Federal Register of Legislation, never from this snapshot.

The 8.8 GB `corpus.jsonl` is a build-time input. Do not commit it, and do not commit `oalc_citations.csv`. Both names are in `.gitignore`.

Build the index (streams the corpus, writes the CSV, alias file, dedupe log and `oalc_build_meta.json` into `--out-dir`):

```bash
python3 scripts/oalc-build-index.py build \
  --corpus /path/to/corpus.jsonl \
  --out-dir ./oalc-build \
  --corpus-version v7.1.0
```

Pass `--corpus-sha256 <64 hex chars>` to record the published hash and skip hashing the 8.8 GB file. The default version is `v7.1.0` and the default cutoff is `2025-03-10`.

Load into Postgres only after `db/migrations/006_oalc_citations.sql` has been applied by hand in the Sydney project. The loader uses `DATABASE_URL` and COPY. It does not connect unless you pass `--confirm-write`. Do not point it at any existing Supabase project.

```bash
pip install "psycopg[binary]"
DATABASE_URL="postgres://..." python3 scripts/oalc-build-index.py load \
  --out-dir ./oalc-build \
  --confirm-write
```

Lex reads the index only when `OALC_SUPABASE_URL` and `OALC_SUPABASE_ANON_KEY` are set (anon key, so RLS applies; not the service role). If those are unset, or the tables are missing, citation checks return "case-law index unavailable" and the rest of the app still builds.
