# Split Testing and Analytics: Scoping and Build Plan

Status: plan only, nothing built or created yet. Written 17 Oct 2026. Owner: Shane. Build on saabai.ai first, feature-flagged OFF for Stu's and LMM until solid.

## 1. Goal

A reusable "Experiments" feature in the site factory so any client site can rotate headlines and CTA text, measure impressions, clicks, enquiries and ROI, and let the client edit copy and approve AI-suggested variants in a dashboard, with no redeploy. Honest about low traffic.

## 2. What exists today (verified)

- `proxy.ts` (Next 16 middleware) already handles host mapping, API auth (deny by default, `PUBLIC_API` list) and sets a first-party `sb_attr` attribution cookie on public page views (`lib/growth/attribution.ts`). Matcher covers all paths.
- Upstash Redis via `Redis.fromEnv()` is already used by the proxy and site registry. Good for live-editable config.
- `app/api/analytics/route.ts` is an edge stub that only logs events (no storage). `app/components/GoogleAnalytics.tsx` and `GaEvent.tsx` exist. `lib/growth/consent.ts` exists; reuse its consent approach.
- Supabase: one project, `sg-satoshi-agent` (ap-northeast-1, healthy), public tables tenants, agents, knowledge_sources, knowledge_chunks, conversations, messages, leads, handoffs, analytics_daily, all RLS on, all empty. That is the Saabai AI Agent product schema. Do not mix experiment data into those tables.
- saabai.ai hero is a static `<h1>` in `app/page.tsx`. LMM is static HTML (`public/clients/lmm-site/index.html`), Stu's is `app/sites/cycle-repair/page.tsx`. Lead routes: `/api/leads`, `/api/lmm-contact`, `/api/cycle-repair/lead`.
- `scripts/site-check.mjs` is the read-only post-deploy check. Merging to main deploys every site at once, so the feature must be inert by default.

## 3. Architecture

### 3.1 Config (live, no redeploy)
- Source of truth: Redis hash `saabai:exp:<siteKey>` with JSON for each experiment: `id`, `slot` (e.g. `home.hero.headline`, `home.hero.cta`), `status` (draft/running/paused/won), `variants[] {id, text, active}`, `defaultVariantId`, `leadValueAUD`, `startedAt`.
- The dashboard writes Redis (admin session required) and mirrors a row to Supabase for history and audit. Middleware reads Redis only (fast, edge-safe). Optional Edge Config later if Redis latency matters; Redis is fine for MVP.
- Global flag: env `EXPERIMENTS_ENABLED_SITES` (comma list, starts as `saabai`) plus per-experiment `status`. Anything not listed behaves exactly as today.

### 3.2 Server-side assignment (no flicker)
- In `proxy.ts`, for HTML page requests on enabled sites only: read the `sb_exp` cookie (`{expId: variantId}`, first-party, 90 days, SameSite=Lax, Secure, not HttpOnly is NOT needed, keep HttpOnly and pass the value to the page via a request header).
- If no assignment: pick a variant by Thompson sampling over the current stats snapshot (see 5), cache the snapshot in Redis refreshed every 5 minutes by cron, so middleware never computes posteriors. Set cookie on the response and add request header `x-sb-exp: <expId>:<variantId>`.
- The page reads the header with `headers()` in a server component and renders the chosen copy directly. No client-side swap, so no flicker and no layout shift. Pages using this become dynamic for that slot only; keep the rest cacheable by isolating the variant text in a small server component, or use rewrites to pre-rendered variant paths (`/_exp/<id>/<variant>`) if we want full static caching. MVP: server component reading the header; revisit if TTFB suffers.
- Static LMM page: needs the proxy to rewrite HTML text (HTMLRewriter is not available in Next middleware), so LMM needs a small server wrapper or pre-rendered variants. Handle in rollout phase; not in MVP.
- Sticky assignment: same visitor always sees the same variant. Bandit only affects new visitors.

### 3.3 SEO safety
- Crawlers and known bots always get the default variant, no cookie set, no tracking (UA check against `AI_BOTS` in `lib/geo` plus common search bots, plus Vercel verified-bot header if present). This is not cloaking: all human visitors can see all variants, the default is the live copy, and the difference is a headline of the same page and intent. Google's A/B testing guidance permits this.
- Canonical URL, title, meta description, JSON-LD and OG tags never vary. Only visible on-page text in declared slots may vary. No separate URLs per variant, no redirects.
- Add `Vary` handling: do not add `Vary: Cookie` to cached HTML for bots; bots path is cacheable default.
- Keep `llms.txt` and structured data on the default headline.

### 3.4 Event tracking
- Events: `impression`, `cta_click`, `form_submit` (enquiry), `call_click` (tel: link), `lead_alert` (server-side, Telegram/email sent), optional `chat_open`.
- Client: tiny script (under 2 KB, `sendBeacon`) fires `impression` once per visitor per experiment per session (IntersectionObserver when the slot is visible), and click events via `data-exp-event` attributes. No third-party script.
- Server truth for conversions: lead routes (`/api/leads`, `/api/cycle-repair/lead`, `/api/lmm-contact`) read the `sb_exp` cookie and record `form_submit` server-side, so ad blockers do not lose conversions.
- Endpoint: new `POST /api/exp/event`, added to `PUBLIC_API` (and `CUSTOM_DOMAIN_PUBLIC_API` when rolled out). Validates against a schema, rate limited per IP hash, ignores bots, always returns 204. Writes to a Redis list buffer, flushed to Supabase in batches by cron (keeps edge fast and DB cheap), or direct insert via a service role key in a node route for MVP.
- Visitor id: random UUID in the cookie only. No IP, no user agent, no email or phone stored. Dedupe by `visitor_id + experiment + event + day`.

## 4. Supabase schema proposal (do not create yet)

Recommendation: new schema `experiments` inside existing project `sg-satoshi-agent` (cheapest, no new project), isolated from the agent product tables. Alternative if Shane prefers hard separation: a new project (cost check required first).

```sql
create schema experiments;

create table experiments.experiment (
  id uuid primary key default gen_random_uuid(),
  site_key text not null,              -- 'saabai', 'stus', 'lmm'
  slot text not null,                  -- 'home.hero.headline'
  name text not null,
  status text not null default 'draft' check (status in ('draft','running','paused','won','archived')),
  lead_value_aud numeric(10,2) default 0,
  started_at timestamptz, ended_at timestamptz,
  created_by text, created_at timestamptz default now()
);

create table experiments.variant (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid references experiments.experiment(id) on delete cascade,
  label text not null,                 -- 'A','B','C'
  copy text not null,
  is_default boolean default false,
  active boolean default true,
  source text default 'human' check (source in ('human','ai')),
  approved_by text, approved_at timestamptz,   -- AI variants need these before running
  created_at timestamptz default now()
);

create table experiments.event (
  id bigint generated always as identity primary key,
  experiment_id uuid not null,
  variant_id uuid not null,
  visitor_id uuid not null,
  type text not null check (type in ('impression','cta_click','form_submit','call_click','lead_alert')),
  day date not null default (now() at time zone 'Australia/Brisbane')::date,
  created_at timestamptz default now(),
  unique (experiment_id, variant_id, visitor_id, type, day)
);
create index on experiments.event (experiment_id, variant_id, type);

create table experiments.daily_stats (    -- rollup, written by cron
  experiment_id uuid, variant_id uuid, day date,
  impressions int, clicks int, enquiries int, calls int,
  primary key (experiment_id, variant_id, day)
);

create table experiments.audit_log (
  id bigint generated always as identity primary key,
  experiment_id uuid, actor text, action text, detail jsonb, created_at timestamptz default now()
);
```

RLS: enable on every table, no anon policies at all (deny by default). All reads and writes go through Next API routes using the service role key, which lives only in Vercel env. Dashboard access is gated by the existing admin session and, for clients, the portal session scoped to their `site_key`. Run `get_advisors` after migration. Retention: raw `event` rows pruned after 13 months, rollups kept.

## 5. Winner logic (Thompson sampling)

- Metric per variant: primary = enquiries / impressions (form_submit + call_click, deduped per visitor). Secondary = CTA click rate.
- Beta posterior per variant: Beta(1 + successes, 1 + failures). Assignment draws one sample per variant and picks the max. Snapshot posteriors every 5 minutes.
- Guardrails: minimum 20% of traffic split evenly until each variant has at least 100 impressions (exploration floor), then pure Thompson. Cap any variant to 90% so the loser still gets data. Never drop the default below 10%.
- "Probability B is best": Monte Carlo, 20,000 draws from posteriors, share of draws where each variant is max. Also "expected lift" as a median of (B/A - 1) with a 90% credible interval.
- Plain-English output, templates, for example:
  - "Headline B is 82% likely to be the best, with an expected 18% lift (could be anywhere from -4% to +45%)."
  - Low data: "Too early to call. Only 140 visitors and 3 enquiries so far. On a site like this expect 4 to 8 weeks for a clear answer."
- Declare a winner only when P(best) >= 95%, at least 300 impressions per variant, at least 10 conversions in total and at least 14 days (two full weekly cycles). Before that the dashboard says "leading" not "winning". Auto-promote is off; a human clicks "Make B the live headline".
- Honest caveats shown in UI: small sites (Stu's and LMM) may have under 1,000 visitors a month, so only test big differences and one test at a time; results can flip; clicks are not enquiries; seasonality; novelty effect.
- ROI: `value = enquiries * lead_value_aud`; show value per 1,000 visitors per variant and projected monthly gain of switching. Optional close-rate field (enquiry to paying client) to turn leads into dollars. Clearly labelled as an estimate.

## 6. Client dashboard

Route: `/dashboard/experiments` on saabai.ai (admin) and a per-client view inside the existing portal (`portal_session`, scoped to `site_key`). Reuse existing admin auth; no new auth system.
- Experiment list with status, visitors, enquiries, conversion, "likely winner" badge, plain-English verdict.
- Editor: edit headline/CTA copy per variant (writes Redis, live within seconds, audit logged), add, pause or remove variants (never delete data, archive), set default, set lead value, pause or end test, "Make winner live".
- "Suggest variants" button (Phase 3): AI proposes 3 variants using the client's tone profile, existing copy and prior results (what won and lost). Suggestions land as `source='ai'`, status pending. They never serve traffic until a human approves. Guardrails: no unverifiable claims, no fake stats or reviews, length limits, banned-claim list per client (e.g. LMM financial advice compliance, no guaranteed returns).
- Analytics: views, clicks, enquiries, conversion rate, trend chart by day, per-variant table with credible intervals, ROI estimate.
- Weekly summary: cron (Monday, Brisbane) generates a short note per experiment ("what we learned, what we recommend") by template plus AI polish, emailed to Shane as a draft for review first; per-client sending only after Shane approves the wording. Sends via Resend from the approved sender.

## 7. Privacy and AU compliance

- Data stored: random visitor UUID, variant, event type, date. No IP, email, phone or fingerprinting. The enquiry itself stays in the existing lead flow; the experiment tables hold only a counted event.
- Cookie `sb_exp` is first-party and functional/analytics in nature. Australian Privacy Act does not require a cookie banner for non-identifying first-party analytics, but the privacy policy must disclose it. Action: add a line to each site's privacy policy and use the existing `lib/growth/consent.ts` approach so assignment can fall back to default (and not set a cookie) if a visitor has declined analytics. If a client later targets EU/UK visitors, gating behind consent becomes mandatory.
- Respect Global Privacy Control and Do Not Track header: serve default, no cookie, no events.
- Data lives in Supabase ap-northeast-1 (Tokyo); mention offshore storage in the privacy policy (APP 8) since the data is non-identifying but disclose anyway.
- Bot and crawler exclusion: UA list, Vercel bot header, headless markers, no JS execution means no impression (impressions are client-beaconed on visibility), plus per-IP-hash rate limit and a cap of one impression per visitor per day. Exclude internal traffic: admin session cookie and a `?exp_off=1` opt-out that sets a cookie, so Shane's own visits do not pollute results.

## 8. Performance

- Middleware work per request: one cookie read, one cached Redis read (config snapshot held in module memory for 30 to 60 seconds), no DB calls. Target under 5 ms added.
- Only run on HTML page requests for enabled sites; skip `/_next`, `/api`, assets, bots.
- Event beacon under 2 KB, async, `sendBeacon`, no blocking, no third-party requests.
- Event writes are buffered and batched. Posterior snapshot by cron every 5 minutes.
- Budget: no regression in LCP or CLS on saabai.ai. Verify with site-check and Lighthouse before and after.

## 9. Testing plan

Unit (`npx tsx --test tests/...`):
- Thompson sampler (seeded RNG): converges to the better variant, respects floors and caps, handles zero data.
- P(best) and lift calculation against known cases; plain-English formatter thresholds (too early / leading / winner).
- Bot detection list, GPC/DNT handling, cookie parse/serialise, config validation (reject empty copy, too long copy, banned claims).
- Event dedupe and schema validation.

Integration:
- Proxy: no cookie for bots; cookie sticky across requests; flag off means byte-identical response to today on Stu's and LMM; unknown experiment ignored safely; Redis down means default variant (fail open, never break the page).
- Event endpoint: rejects bad payloads, rate limits, 204 always, no PII stored.
- RLS test in the style of `scripts/test-supabase-rls.mjs`: anon key can read and write nothing in the `experiments` schema.
- Lead routes record `form_submit` from cookie and still send email/Telegram if tracking fails.

Live checks (extend `scripts/site-check.mjs`, read-only, GET only):
- New `--exp` option: fetch home twice with and without a cookie jar; assert same variant on repeat, bot UA gets default, canonical and title identical across variants, no `Set-Cookie sb_exp` for bots, no flicker (variant text present in the raw server HTML, not injected after load), no new console errors, no horizontal overflow.
- Stu's and LMM: assert the home HTML is unchanged and no `sb_exp` cookie while the flag is off.
- Run the full check on saabai.ai, Stu's and LMM after every deploy (merging to main deploys all sites).
- Manual QA: mobile screenshot of each variant, a dry-run lead with label "TEST" only on saabai.ai and only with Shane's OK.

## 10. Phases, effort, milestones

| Phase | Scope | Effort | Exit criteria |
|---|---|---|---|
| 0. Prep | Approve plan, choose schema location, pick first test (saabai.ai hero headline), define lead value, privacy line | 0.5 day | Shane approves; Supabase schema and any cost confirmed |
| 1. MVP | Schema + RLS, Redis config, proxy assignment, header to hero component, event endpoint + beacon, lead route hooks, bot exclusion, Thompson snapshot cron, unit and integration tests, `site-check --exp`, saabai.ai only | 3 to 4 days | One live headline test on saabai.ai, events landing correctly, no regression in site-check, Stu's and LMM unchanged |
| 2. Dashboard | List, editor (copy, add/remove/pause, default, lead value), analytics, plain-English verdicts, ROI, audit log, "make winner live" | 3 to 4 days | Shane edits copy live without a redeploy; numbers reconcile with raw events |
| 3. AI suggestions and weekly note | Suggest-variants with approval gate and guardrails, weekly summary cron, email as draft to Shane | 2 to 3 days | AI variants never serve before approval; weekly note reviewed |
| 4. Soak | Run on saabai.ai for 2 to 4 weeks, fix bugs, review for data quality | calendar time | Zero obvious bugs, stable performance, tracking trusted |
| 5. Rollout | Stu's (coded, easy), then LMM (static page needs server wrapper or prebuilt variants, financial-claims guardrails). Per-client dashboard view in portal, privacy line per site, `CLIENT_HOST`, `PUBLIC_API` and `CUSTOM_DOMAIN_PUBLIC_API` updates | 2 days Stu's, 2 to 3 days LMM | Flag turned on per site with owner say-so |

Total build about 9 to 12 working days, plus soak.

## 11. Risks and mitigations

- Low traffic: most client sites cannot reach significance quickly. Mitigate with honest messaging, big-difference tests, one test at a time, and Thompson sampling to limit loss.
- Merge-to-main deploys everything: flag off by default, fail-open to default variant, check all three sites after every deploy.
- Dynamic rendering hurts caching or speed: isolate variant slot, measure TTFB and LCP, fall back to pre-rendered variant paths.
- SEO: only vary visible slot text, crawlers get default, canonical and structured data fixed, monitor Search Console.
- Bad or non-compliant AI copy (esp. LMM financial services): approval gate, banned-claims list, no invented stats.
- Tracking loss (ad blockers) or double counting: server-side conversion from lead routes and per-day dedupe.
- Data pollution from bots or internal visits: bot exclusion, opt-out cookie, admin exclusion.
- Secrets: service role key only in Vercel env, set by hand in the dashboard (the connector mangles secrets). Never in the repo.
- Static LMM page cannot take middleware text swaps: needs a wrapper; scope is in Phase 5.
- Supabase free-tier limits: batch writes, rollups, prune raw events; confirm plan before launch.

## 12. Decisions needed from Shane

1. Schema in the existing Supabase project (recommended) or a new project.
2. First test: saabai.ai hero headline and CTA (recommended).
3. Lead value for saabai.ai in AUD, and rough enquiry-to-client close rate.
4. Privacy policy wording update, and whether to gate on consent from day one (recommended: no banner, disclose, honour GPC).
5. Weekly note recipient and first-run review (recommended: Shane only until happy).

## Appendix: adding a test slot (built, Part A of Phase 4 prep)

1. Add one entry to `SLOTS` in `lib/exp/seed.ts`: `id`, `slot` name, `kind` (`headline` or `button`), `path`, `control` copy (the live copy, byte for byte) and any starting `variants`.
2. Render it with `<ExpText slot="your.slot">{(v) => <a {...v.attrs}>{v.text}</a>}</ExpText>` (see `app/components/exp/HeroCta.tsx`).
3. Done. The proxy assigns it (one cookie, independent per slot), the beacon tracks views, clicks and calls, bots and GPC/DNT get the control, the slot registers itself in Redis and Supabase on first render, and it appears in the Split testing dashboard with editing, AI suggestions and approval.

Copy limits and AI rules come from the `kind` (`KIND_RULES` in `lib/exp/core.ts`). A new kind needs its limits there plus a suggestion prompt in `lib/exp/suggest.ts`. Button clicks only count when made on the tested button itself.
