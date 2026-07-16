# New client site launch checklist (Site Factory)

> Read when building a new client site from a Stitch mockup / prompt. Do ALL of this without being asked.
> Reference implementations for chatbot/FAQ patterns: heaven-thai-massage and lifestyle-money-management sites.

1. **Build** a self-contained page at `app/sites/<slug>/page.tsx`. Shane's Stitch mockup/prompt/zip is inspiration, not a pixel spec — default to a lean build that captures its feel faithfully (do not substitute your own style or Site Factory templates).
2. **Rehost ALL images** — Stitch `lh3.googleusercontent.com/aida-public` URLs expire. Never ship them.
3. **Logo**: transparent background + tight crop (Pillow). If a dark logo sits on a dark nav, put it on a white pill.
4. **Chatbot**: named female AI persona with avatar, brand colours; API route at `/api/<slug>-chat`; add the route to `PUBLIC_API` in `proxy.ts`.
5. **White-label**: add slug to `SUPPRESS_PATHS` + `SUPPRESS_TICKER_PATHS` AND hostname-based suppression — zero saabai branding, no Mia widget, no news ticker.
6. **Contact form** via Resend to the CLIENT's email (`LEAD_EMAIL_OVERRIDES`), sent from a Resend-verified domain with the client's business name as display name. Never a saabai.ai sender.
7. **SEO pass**: unique title/H1/meta/OG/canonical + schema.org JSON-LD (see `docs/claude/seo-pass.md`).
8. **Legal pages**: generic Privacy Policy + Terms (QLD law), linked in footer — with EXPLICIT light background AND text colours (the global dark theme makes unstyled pages unreadable, see CLAUDE.md).
9. **Mobile hamburger menu** — vanilla JS (hydration trap, see CLAUDE.md rule 9). Test on a mobile viewport; Shane reviews on his iPhone.
10. **Register the site**: Redis `HSET saabai:sites <slug> <json>` (hash — NOT a string key) + `saabai:domain-map` entry for custom domains (hostname→slug, www stripped). Also confirm it shows in saabai.ai/saabai-admin/site-factory.
11. **DNS / domain**: A record `@ 76.76.21.21`, CNAME `www cname.vercel-dns.com`, then `vercel domains add` via CLI (the `vca_` token is NOT a REST bearer token — use the CLI).
12. **Google Search Console**: submit the domain + sitemap. The sitemap field takes the PATH ONLY (`sitemap.xml`).
13. **Copy sweep**: `grep -n '—'` all touched files — zero em dashes, no AI-tell phrases, Australian English, unique copy per page.
14. **Verify live in all three places**: `saabai.ai/sites/<slug>` AND the custom domain (www + apex) AND mobile viewport. Then report deploy URL + where to look.
