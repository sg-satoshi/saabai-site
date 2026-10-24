# Site Factory Feature Map

Plain-English guide for agents: which human term (header, hero, footer...) is which file/selector, how hosts map to sites, how to deploy, and what has bitten us. Verified against the code on 17 Oct 2026. If you change a path or selector, update this file.

## 1. Sites at a glance

| Site | Live host | Type | Source |
|---|---|---|---|
| Lifestyle Money Management (LMM, Nick) | lifestylemoneymanagement.com.au | Static HTML | `public/clients/lmm-site/index.html` (+ `assets/`) |
| Stu's Cycle Repairs | stuscyclerepairs.com | Coded Next.js | `app/sites/cycle-repair/` |
| Saabai.ai (master) | www.saabai.ai | Coded Next.js | `app/page.tsx`, `app/components/` |
| BO Consulting | boconsulting.com.au | Coded | `app/sites/bo-consultancy/` |
| Wholesale Homes | wholesalehomes.com.au | Coded | `app/sites/wholesale-homes/` |
| Tributum Law | tributumlaw.com (friendly `/sites/tributumlaw`) | Stored HTML (slug `tributum-law`) + demo `app/sites/tributum-law-v2/` | `app/sites/[slug]/` |
| Next Investment, Nico Moretti | domains pending | Static | `public/clients/nextinvestment`, `public/clients/nico-moretti` |

Registry of coded sites: `lib/site-registry.ts` (`APP_ROUTER_SITES`: slug, domains, description). Stored-HTML sites live in Vercel Blob / Redis and are served by `app/sites/[slug]/route.ts` and `app/sites/[slug]/[page]/route.ts`.

## 2. Host mapping (how a custom domain reaches a site)

- `proxy.ts` (Next 16 middleware). Any host that is not saabai.ai, `*.saabai.ai`, `*.vercel.app` or localhost is a custom domain. `www.` is stripped, then the slug comes from `STATIC_DOMAIN_MAP` in `lib/client-site-surface.ts` (only `lifestylemoneymanagement.com.au` -> `lmm-site`) or the Redis hash `saabai:domain-map` (written by `app/api/site-factory/domain/route.ts`).
- Matched requests are rewritten: `/` -> `/sites/<slug>`, `/x` -> `/sites/<slug>/x`. Exceptions: `/_next/*`, `/clients/<slug>/*` and static files under `/sites/<slug>` are rewritten to www.saabai.ai; `/favicon.ico` -> `/sites/<slug>/favicon.ico`.
- LMM specials in `proxy.ts`: brand assets via `lib/lmm-brand.ts` (`lmmBrandAsset`) and `robots.txt, sitemap.xml, llms.txt, llms-full.txt` rewritten to `/clients/lmm-site/...`.
- `/api/*` on custom domains gets the same deny-by-default auth as saabai.ai. A form endpoint is only callable if it is listed in `PUBLIC_API` in `proxy.ts` (e.g. `/api/lmm-contact`, `/api/cycle-repair/lead`, `/api/site-factory/lead`). `CUSTOM_DOMAIN_PUBLIC_API` holds extras allowed only on custom domains (`/api/site-factory-chat`). A new form route that is not added to `PUBLIC_API` will 401 in production.
- `next.config.ts`: `CLIENT_HOST` regex (stuscyclerepairs.com, boconsulting.com.au, wholesalehomes.com.au, lifestylemoneymanagement.com.au, tributumlaw.com) stops saabai.ai city redirects (`/sydney` etc.) applying to client hosts. Add every new client domain there. Rewrites: `/sites/tributumlaw` -> `/sites/tributum-law`, `/clients/lmm-site` -> `/clients/lmm-site/index.html`.
- Saabai chrome, `/sites/<slug>` redirects, and noindex are not per site. Register the site in `lib/client-site-directory.ts`. `lib/client-site-surface.ts` and `proxy.ts` apply the rule. See `AGENTS.md`.

## 3. Human term -> file / selector

### LMM (static page `public/clients/lmm-site/index.html`, one ~57 KB file, inline CSS and JS)
| Term | Where |
|---|---|
| Header | `header.site-header` (sticky, `position:sticky; top:0; z-index:20`, CSS ~line 77) |
| Menu | `nav#primaryNav.nav-links`; mobile toggle `button.nav-toggle`; theme toggle `button.theme-toggle` |
| Logo | `img.brand-logo.logo-light` / `.logo-dark` (header), `img.footer-logo`; files `assets/lmm-logo-*.svg`. Dark/light swap via `[data-theme="dark"]` |
| Hero | `section.hero`; image `assets/lmm-brisbane-property-hero.png` |
| Reviews carousel | `section#reviews.reviews`, track `ul#rvTrack.rv-track`; data `assets/reviews.json` (fetched by inline script ~line 1076) |
| Services / Approach / Meet Nick | `section#services`, `section#approach`, `section#meet-nick` |
| Testimonials | `section#testimonials` is `hidden` on purpose |
| Contact form | `section#contact`, `form#leadForm`, posts to `/api/lmm-contact` (inline script ~line 1115) |
| Footer | `footer.site-footer`, `nav.footer-col` |
| Chat widget (Zara) | `assets/chat-widget.js?v=9` (bump `?v=` when editing), calls `https://www.saabai.ai/api/lmm-chat`; classes `.lmm-chat-widget`, `.lmm-chat-button`, `.lmm-chat-panel` |
| JSON-LD | inline `<script type="application/ld+json">` (~line 725), FinancialService |
| Favicon / manifest / OG | `assets/favicon.ico`, `site.webmanifest`, `og-image.jpg` |

### Stu's Cycle Repairs (`app/sites/cycle-repair/`)
| Term | Where |
|---|---|
| Header + menu | `PageShell.tsx` `<header className="sticky top-0 z-40 ...">` with `<nav>` (inner pages). The home page `page.tsx` has its own inline header block (~line 85-111): edit both when changing the header |
| Logo | `Logo.tsx` (used in header) |
| Hero | `page.tsx`, first `<section>` under `<main id="top">` (~line 116) |
| Services | `page.tsx` `section#services`; data `services.ts` |
| Reviews carousel | `ReviewsCarousel.tsx` rendered at `page.tsx` ~line 179; data `reviews.ts` |
| How it works / About | `div#how`, `section#about` in `page.tsx` |
| Footer | `PageShell.tsx` `<footer>`; "Powered by Saabai.ai" via `app/components/PoweredBySaabai.tsx` |
| Contact form | `contact/page.tsx` (fetch ~line 37) and `quote/page.tsx` (~line 74), both POST `/api/cycle-repair/lead` |
| Other pages | `gold-coast/`, `faq/`, `quote/`, `contact/` (each has `layout.tsx` for metadata) |
| Metadata / theme | `layout.tsx` (fonts, `clientSiteMetadata`), `cycle-repair.css`, `seo.ts` |
| Chat widget | none. Saabai's Mia is suppressed by host (see gotchas) |
| JSON-LD | `page.tsx` (~line 73, LocalBusiness/BicycleStore), `faq/page.tsx`, `gold-coast/page.tsx` |

### Saabai.ai
| Term | Where |
|---|---|
| Header / menu | `app/components/Nav.tsx` (`<Nav activePage="/" />`), `RexNav.tsx` for Rex pages |
| Hero and sections | `app/page.tsx` |
| Footer | `app/components/sb/SbFooter.tsx` (also `Footer.tsx`) |
| Chat widget (Mia) | `app/components/ChatWidget.tsx`, mounted by `ConditionalWidgets.tsx` from `app/layout.tsx`; backend `app/api/chat/route.ts` |
| Contact/lead forms | `app/api/leads`, `app/api/subscribe`, `app/api/site-factory/lead` (client-site leads, sends from `noreply@saabai.ai`) |
| JSON-LD | `app/components/SaabaiJsonLd.tsx` (root layout), `JsonLd.tsx` |
| robots / sitemap | `app/robots.ts`, `app/sitemap.ts` |

### Other sites
- BO Consulting: `app/sites/bo-consultancy/`, chat `app/components/BOChatWidget.tsx`, `/api/bo-chat`, `/api/bo-contact`.
- Wholesale Homes: `app/sites/wholesale-homes/` (own `styles.css`, `_components`, admin and client portal), `/api/wholesale-*`.
- Tributum: `app/components/TributumChatWidget.tsx`, `/api/tributum-chat`; stored-HTML CSS patches in `SITE_CSS_PATCHES` in `app/sites/[slug]/route.ts`.
- Stored-HTML sites: authoring APIs under `app/api/site-factory/*` (generate, edit, publish-draft, inject-chatbot, inject-reviews, domain...). `ensurePoweredBy` and `ensureFavicon` are applied at serve time.

## 4. API routes and env var names (names only)

| Route | Used by | Env vars |
|---|---|---|
| `/api/lmm-contact` | LMM form. Sends from `enquiries@lifestylemoneymanagement.com.au` to Nick, Reply-To = enquirer | `RESEND_API_KEY` |
| `/api/lmm-chat` | LMM chat widget | `OPENROUTER_API_KEY` |
| `/api/cycle-repair/lead` | Stu's forms. Email + Telegram alert | `RESEND_API_KEY`, `CYCLE_FROM_EMAIL` (optional, default `noreply@saabai.ai`), `TELEGRAM_CYCLE_BOT_TOKEN`, `TELEGRAM_CYCLE_CHAT_ID` |
| `/api/site-factory/lead` | Generic stored-HTML site forms | `RESEND_API_KEY` |
| `/api/site-factory-chat` | Generic site chat | see route |
| Redis (domain map, registry) | `proxy.ts`, `lib/site-registry.ts` | Upstash vars via `Redis.fromEnv()` |

## 5. AI SEO files (`lib/geo`)

- `lib/geo/index.ts`: `robotsTxt`, `sitemapXml`, `llmsTxt`, `llmsFullTxt`, `AI_BOTS`, `GeoProfile`.
- `lib/geo/profiles.ts`: `CODED_PROFILES` (hand-checked facts for coded sites) and `resolveGeoProfile(slug)` (registry + stored pages).
- Per site: LMM = static files beside `index.html`; Stu's = `app/sites/cycle-repair/{robots.txt,sitemap.xml,llms.txt,llms-full.txt}/route.ts`; stored-HTML = `app/sites/[slug]/sitemap.ts` + `[page]/route.ts`; saabai.ai = `app/robots.ts`, `app/sitemap.ts`.
- Standard and rules: `docs/site-factory-ai-seo.md`. Test: `npx tsx --test tests/factory-geo.test.ts` (also `tests/client-site-seo.test.ts`).

## 6. Deploy flow

1. Branch, change, `npm run predeploy` (`tsc --noEmit` + `next build`).
2. PR, squash-merge to `main`. Merging to `main` auto-deploys the whole app to Vercel production, so every site ships at once. There are no per-site deploys.
3. `.github/workflows` runs a Vercel Deploy Check on push to `main`. Confirm the deployment is READY (`vercel ls`, or the Vercel connector) before reporting done.
4. Run the self-check (section 7) against each affected live host.
5. Never submit a real form to test unless the owner approved it; each test emails the client. Label tests "TEST".

## 7. Self-check script

`scripts/site-check.mjs` is read-only (GET/OPTIONS only, never submits).

```bash
node scripts/site-check.mjs https://www.lifestylemoneymanagement.com.au --form=/api/lmm-contact
node scripts/site-check.mjs https://stuscyclerepairs.com --form=/api/cycle-repair/lead --pages=/contact,/quote
node scripts/site-check.mjs https://www.saabai.ai --form=/api/leads
# options: --pages=/a,/b  --form=/api/x  --shots=/dir  --no-browser
```

Checks: home 200; every same-host sitemap URL and `--pages` return 200; robots.txt (+ Sitemap line), sitemap.xml, llms.txt, llms-full.txt; JSON-LD parses; canonical and title; form endpoint reachable via OPTIONS/GET (any non-5xx counts); then with Playwright (found in the repo or `/workspace/node_modules`): console/JS errors, failed same-origin requests, horizontal overflow at 390px, and a mobile screenshot in `/tmp/site-check/` (default). Exit code 1 on any FAIL; WARN needs a human look. Look at the screenshot with the Read tool.

## 8. Gotchas

- Merging to `main` deploys everything. A tweak for one client can break another. Check the other hosts after a deploy.
- Sticky header anchor offset: LMM `.site-header` is sticky, so anchor jumps need `main section[id] { scroll-margin-top }` (set at ~line 722). Stu's `PageShell` header is `h-20` sticky: any new `#anchor` section needs `scroll-mt-24` or the heading hides under the header.
- Resend sending domains: the Resend account is on the free plan (3-domain cap) and holds saabai.ai, mylife.saabai.ai and lifestylemoneymanagement.com.au. A sender on any other domain is rejected after the form shows "success". Stu's therefore stays on `noreply@saabai.ai`. Production's `RESEND_API_KEY` must belong to the account that has the domain verified; check Resend's dashboard for the real delivery state.
- LMM DNS (Cloudflare) has the Resend DKIM, `send` MX/SPF, `rsend` CNAME and a DMARC record. Do not touch existing mail records.
- Vercel tool scrambles secrets: the Vercel connector truncates or mangles secret values when saving env vars (a Telegram token was cut at the colon). Set secrets in the Vercel dashboard by hand, then redeploy. The connector's env list is also capped and can hide keys. Env var changes need a redeploy to take effect.
- "Powered by Saabai.ai" credit stays on every client site (owner decision, 17 Oct 2026). Do not strip it. No other Saabai branding in client llms/robots/sitemap/JSON-LD.
- No visual or content changes to live client sites without the owner's say-so. Facts in llms/JSON-LD come only from published copy; AggregateRating must match real Google data (check Stu's "4.8 from 28" and LMM's 5 / 7).
- Telegram alerts for Stu go to a group (bot `@stuscyclerepairs_bot`). `TELEGRAM_CYCLE_CHAT_ID` is a negative number for groups. A leftover `TELEGRAM_CYCLE_BOT_TOKEN_B64` var is unused.
- Proxy-rewritten paths: on a custom host the browser path is `/`, but Next sees `/sites/<slug>`. Public assets referenced as `/brand/...` get rewritten to `/sites/<slug>/brand/...` and 404; use absolute `/sites/<slug>/...` or `/clients/<slug>/...` URLs for assets.
- Mia on client hosts: `ConditionalWidgets` renders nothing until mounted, then checks path and hostname (fixed 17 Oct: previously the server saw the rewritten `/sites/slug` path while the browser saw `/`, causing hydration error #418 and a stray `/brand/agent-avatar.png` request on stuscyclerepairs.com). `proxy.ts` now also passes `/brand/*` through to the master domain on custom hosts. No open findings.
- New API route for a public form: add it to `PUBLIC_API` in `proxy.ts`.
- New client domain checklist: add the site to `lib/client-site-directory.ts` (slug, canonical url, domains). Redirects, noindex, and Saabai chrome follow automatically. Also add the domain to `CLIENT_HOST` in `next.config.ts` so city redirects stay off that host, add a geo profile, then run `npx tsx --test tests/client-site-surface.test.ts` and the self-check. Static hosts that are not App Router sites still go in `STATIC_DOMAIN_MAP`.

## 9. Split testing (Phase 1, live on saabai.ai only)

- Plan: `docs/split-testing-plan.md`. Code: `lib/exp/` (`core.ts` pure logic, `config.ts` Redis + seed fallback, `track.ts` Supabase events), `proxy.ts` (`experimentsRoute`, home page only), `app/components/exp/HeroHeadline.tsx` (server-rendered hero h1) and `ExpBeacon.tsx`, `app/api/exp/event/route.ts`.
- Switch: `EXPERIMENTS_ENABLED_SITES` (default `saabai` when unset; `none` kills it). Custom client domains (Stu's, LMM) return from `proxy.ts` before the experiment code, so they are untouched.
- Copy lives in Redis hash `saabai:exp:saabai` (field `home-hero-headline`, JSON). `lib/exp/seed.ts` is the fallback and is written to Redis on first render. Edit the JSON to change copy live.
- Data: Supabase schema `experiments` (RLS on, no policies, service role only) via `public.exp_record_event` and `public.exp_stats`. Migration `db/migrations/002_experiments.sql`. Phase 1 assignment is an even split (bandit comes later).
- Opt out of your own traffic: visit `/?exp_off=1`. Bots, GPC/DNT, admin session and opt-out always see the control with no cookie.
- Check: `node scripts/site-check.mjs https://www.saabai.ai --exp` and `... https://stuscyclerepairs.com --exp=off`. Tests: `npm run test:exp`.

