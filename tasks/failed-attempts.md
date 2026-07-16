# tasks/failed-attempts.md — documented dead ends (check BEFORE retrying a failed approach)

> When an approach fails and is abandoned: record what was tried and why it failed. Never repeat a documented dead end.
> Seeded 2026-07-06 from past session history.

- **React interactivity on client custom domains** (onClick / useEffect / usePathname) — tried repeatedly on BO Consulting; dead on arrival because proxy.ts rewrites mean the browser URL is `/` and hydration fails silently. Only vanilla JS via raw `<script dangerouslySetInnerHTML>` works there.
- **Using the `vca_` Vercel token as a REST API bearer token** — rejected; it's a CLI-only token. Use the `vercel` CLI for domain/deploy operations.
- **Verifying client custom domains with curl** — Vercel bot protection returns 403 on custom domains even when the site is fine. Verify via a browser check instead.
- **`ioredis`** — not installed, breaks the Vercel serverless build. `@upstash/redis` (HTTP) only.
- **Manually editing `ChangelogClient.tsx` for your own commits** — the post-commit hook adds the entry too, causing duplicates and the rebase conflicts that plagued earlier sessions. Only hand-edit to correct/backfill missed entries.
- **Registering sites with `SET saabai:sites:<slug>` string keys** — the admin/site-factory reads a hash. Must be `HSET saabai:sites <slug> <json>`.
- **Submitting the full sitemap URL to Google Search Console** — rejected; the sitemap field takes the path only (`sitemap.xml`).
- **Shipping Stitch mockup image URLs** (`lh3.googleusercontent.com/aida-public`) — they expire after a while and pages lose their images. Always rehost before deploy.
