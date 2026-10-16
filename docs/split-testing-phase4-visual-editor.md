# Split Testing Phase 4: Visual Editor (Scoping)

Status: scoping only, nothing built. Written 17 Oct 2026. Owner: Shane.
Builds on `docs/split-testing-plan.md` (Phases 1 to 3, live on saabai.ai) and the generic slot system (`lib/exp/seed.ts`, `ExpText`, `KIND_RULES`).

## 1. Goal

Today a new test needs a developer to declare a slot in code. Phase 4 lets Shane (and later a client) open the Split testing dashboard, see a live preview of their site, click a headline, text block or button, type the alternatives, preview them, and press Start. No code, no redeploy. Text and buttons first, images later. It must work for our server-built factory sites (saabai.ai, Stu's, LMM) and, via a script embed, for third-party React sites such as Lovable builds.

Non-goals for Phase 4: layout or style changes, changing link destinations, multi-page flow tests, fonts and colours (later layers in the layered plan).

## 2. What exists today (the foundation)

- Slot = `{ id, slot name, kind, path, control copy, variants }` in `SLOTS` (`lib/exp/seed.ts`). `kind` (`headline`, `button`) sets copy limits (`KIND_RULES`) and the AI suggestion prompt.
- Proxy assigns every running slot on a page with one visitor id and one cookie, sends variants to the page in the `x-sb-exp` header. Server components render the chosen copy in the first HTML (no flicker). Bots, GPC/DNT, admins and opt-outs get the control.
- Tracking: beacon (views, clicks, calls), server-side form conversions, stats and bandit verdicts per slot, dashboard editing, AI suggestions with human approval, weekly note.
- A slot registers itself in Redis (what visitors see) and Supabase (allow-list and audit) on first render.

What is missing for no-code: (a) a way to pick an element and turn it into a slot, (b) a way to apply a variant to an element that was never wrapped in code, (c) a preview, (d) the same for sites we do not host.

## 3. User experience

1. Dashboard, Split testing, "New test" opens the **Visual editor**: the site in a framed preview, with page picker (path list from the sitemap) and a desktop/mobile toggle.
2. Hover highlights eligible elements (headlines, paragraphs, buttons, links styled as buttons). Ineligible elements (forms, nav structure, images in v1, anything inside a legal or price table) show a "not testable yet" tooltip.
3. Click an element. A side panel shows: detected type (headline, text, button), the current copy as the **control**, a name suggestion ("Homepage hero button"), and two empty variant boxes with an "AI, suggest variants" button (same guardrails as Phase 3, per kind).
4. As the user types, the framed page updates live, so they see the real element with the new words. A length meter and a warning appear if the new copy is much longer than the original.
5. **Preview** step: toggle through control, B, C on desktop and mobile. Automatic checks run (section 7) and show a pass or warnings list.
6. **Start test** is a deliberate human click. It writes the experiment (status running) with an audit entry. Until then nothing is visible to visitors.
7. The new test appears in the existing list with the existing editing, AI suggestion, analytics and "Make winner live" tools.

## 4. Identifying elements: slot ids and selectors

### 4.1 Slot id generation
`<page>.<section>.<role>[-n]`, human-readable and stable, for example `home.hero.cta`, `home.pricing.headline`, `about.intro.text`.
- `page`: first path segment, `home` for `/`.
- `section`: nearest ancestor with `data-section`, `id`, or a landmark/heading slug (`hero` if it is the first section with an h1). Slugified, max 20 chars.
- `role`: `headline` (h1/h2/h3), `text` (p, li, span block), `button` (button, or a with button class/role).
- Collisions get `-2`, `-3`. The id is shown in the dashboard and never changes after creation, even if the selector is repaired.
- Experiment id (the stats key) is derived as `<slot with dots to dashes>` and is unique per site.

### 4.2 What is persisted
A new `target` object on the experiment (Redis JSON and a `target jsonb` column on `experiments.experiment`, one small migration):
```
target: {
  mode: "declared" | "selector",
  path: "/", pathMatch: "exact" | "prefix",
  selector: "main section#hero a.btn:nth-of-type(1)",   // primary, built from ids, data attributes, then structural path
  fingerprint: { tag: "a", textHash: "<sha1 of normalised original text>", textStart: "Get your free", landmark: "hero" },
  kind: "button"
}
```
- `declared`: element already wrapped in `ExpText` (or has `data-exp-slot`). Nothing else needed.
- `selector`: element is found at runtime by selector and verified.
- Selector builder prefers, in order: `data-exp-slot`, a unique `id`, `data-testid`/`data-section` anchors, then a short structural path (tag + class + `:nth-of-type`) from the nearest anchor. It rejects selectors that match more than one element.

### 4.3 Resolution and repair (selector mode)
At runtime: query selector, then verify tag and the text fingerprint of the control. If it fails, search within the landmark for an element with the same tag and text hash. If that fails, the slot is **detached**: visitors get the original page untouched, the dashboard shows "This element changed on the site, re-pick it" and the test is auto-paused with an audit entry. We never guess and never apply copy to the wrong element.
Because the control text is verified, a page edit that changes the headline safely detaches the test rather than overwriting the new copy.

## 5. How variants are applied

### 5.1 Server-built factory sites (saabai.ai, Stu's, LMM)
Two routes, used together:

**A. Promote to a code slot (preferred, zero flicker).** Picking an element that is not yet a slot creates a **slot request**. An agent opens a small PR that wraps the element in `ExpText` and adds the `SLOTS` entry (the exact change documented in the split-testing plan appendix), runs `npm run test:exp`, build and the site check, and merges on green. The test sits in "Preparing" (typically minutes) then switches to "Ready to preview". Output is server-rendered, so SEO and performance are identical to today's tests. Human approval of the PR is not needed for a wrap-only diff the agent verifies, in line with the fix-it-yourself rule, but the test still needs the Start click.

**B. Runtime overlay (instant, shared with script embed).** For quick tests, the same small runtime used by third-party sites (section 5.2) applies the variant in the browser. A short hide-until-ready for that one element limits flicker. Used when the user wants to start immediately; the dashboard offers "Make this permanent" which triggers route A.

Static LMM page: route B is the only no-code option until LMM has a server wrapper (already flagged in the original plan, Phase 5). Financial-services copy guardrails apply (banned claims list per client).

### 5.2 Script embed (Lovable and other React sites)
One snippet in the page head plus a site key:
```
<script src="https://www.saabai.ai/exp/v1.js" data-site="<siteKey>" async></script>
```
- **Config**: the script fetches `GET /api/exp/config/<siteKey>`: cached at the edge (about 60 seconds), CORS limited to the site's registered origins, returns only running experiments for that site (targets and variant text). Fails open: any error means the page renders as built.
- **Assignment**: first-party cookie/localStorage on the customer's domain, same sticky-visitor rules, bandit weights from the same snapshot. Bots, GPC/DNT, `navigator.webdriver` and an opt-out param get the control and no events.
- **Apply**: resolve the target (section 4.3), set `textContent` of the text node or button label only, never innerHTML. A `MutationObserver` reapplies after React re-renders and on SPA route changes (`pushState`/`popstate`), with a guard so it never fights the framework (stops after repeated reverts and reports a "unstable target" warning).
- **Flicker control**: a 1 KB inline pre-snippet adds `html.sb-hide` which hides only matched slots (`visibility:hidden`) with a hard 300 ms timeout so a slow network never blanks content. Tests on the LCP element are discouraged and flagged in the editor.
- **Better for Lovable specifically**: a ready-made prompt or tiny `<SbSlot id="home.hero.cta">` component the owner pastes into Lovable. It adds `data-exp-slot` attributes, which gives stable ids that survive regenerations, and avoids fragile selectors. The editor recommends it and falls back to selectors if not installed.
- **Events**: `sendBeacon` to `POST /api/exp/event` with site key, experiment id and the visitor id. Same dedupe, rate limit and bot rules. Conversions on third-party sites are page-based (thank-you URL or a `sbConvert()` call) because we do not own their form endpoint; the editor has a "what counts as an enquiry" step (URL match, button click or form submit selector).
- Tenancy: every config and event is keyed by site key plus registered origin. Cross-site reads are impossible (RLS stays deny-by-default, service role server side only).
- Localsearch note: this section is only technical applicability for Lovable-built sites. Any Localsearch build would be a separate project inside their own setup and with their blessing; nothing here assumes selling to their customers.

### 5.3 One picker for both
The picker (hover, click, highlight, selector builder) is a lazy module inside the same runtime. Normal visitors never download it. It loads only when `?sb_edit=<token>` is present, the token is a short-lived (10 minute) signed JWT minted by the dashboard, bound to the site key, and the page is framed by an allowed dashboard origin. It talks to the dashboard by `postMessage` with strict origin checks, so the dashboard never needs cross-origin DOM access. This also covers sites that block iframes with `X-Frame-Options`: fallback is "Open in a new window with the editor bar".

## 6. Dashboard and API changes

- New **Visual editor** view: frame, side panel, preview, start. Reuses `EditForm`, `CopyView`, AI suggest and approval components.
- `POST /api/admin/experiments/create` (admin session, site-scoped): validates target, kind, copy by `KIND_RULES`, generates ids, writes Supabase first (audit) then Redis, status `draft` until Start. Reuses `applyDashboardAction` rules (revision check, audit, dashes check).
- `POST /api/admin/experiments/edit-token` mints the signed edit token. `GET /api/admin/experiments/preview-token` for variant preview (`?sb_preview=<slot>:<variant>&sig=` forces a variant, sets no cookie, records no events, is `noindex`).
- Slot requests queue (`experiments.slot_request`: site, path, target, requested copy, status, pr_url). An agent worker or a manual Grok Bot run processes it.
- `GET /api/exp/config/<siteKey>` and `/exp/v1.js` for script embed. Limits per tier (live tests, monthly tracked visitors) enforced on create and start, ready for the paid add-on tiers.
- Migration: `target jsonb`, `slot_request` table, `slot_id` index. RLS on, no anon policies, SECURITY DEFINER functions granted to service role only, same as `002`/`003`/`004`.

## 7. Safety

- **Text and buttons only in v1.** Eligible: elements whose content is plain text, or a link/button whose label is one text node (icons and arrows next to it are left alone). Not eligible: forms and inputs, nav and footer structure, legal text, prices and tables, `script`, `style`, `head`, `[itemprop]`, anything inside `[data-no-test]`.
- **No HTML injection.** `textContent` only. Copy is validated by the same rules as dashboard edits: kind length limits, no en or em dashes, no emoji, no links.
- **No layout breakage.** Variant length is limited to 150 percent of the control (or the kind maximum if lower). The preview measures the element before and after, on desktop and mobile: height growth over 30 percent, wrapping onto extra lines on mobile, horizontal page overflow or a change in the cumulative layout shift estimate produce warnings that block Start until acknowledged (hard block for overflow).
- **Link targets never change** in v1: a button test changes its words, not its destination.
- **Preview before start**: Start is disabled until each variant has been previewed on both viewports.
- **Human approval everywhere.** Creating a draft is free; Start is a human click; AI suggestions need approval; "Make winner live" is a human click with the existing warning if unproven. An agent PR for a slot request only wraps and registers the element, it never starts the test.
- **Fail open and detach safely.** Missing config, Redis outage, script error or a changed element all result in the original page. Detached slots auto-pause.
- **Kill switch**: per-site `EXPERIMENTS_ENABLED_SITES` (already exists), per-slot pause, and a site-wide "pause all tests" button in the dashboard.
- **Client guardrails**: per-client banned-claims list and tone profile (for example LMM financial advice compliance) applied to typed copy and AI suggestions.
- **Auth**: editor and tokens are admin-only for Saabai sites. A client-facing editor (portal session scoped to their site key) comes after the owner-only version is solid.
- **Privacy**: unchanged from Phase 1. Random visitor id, no PII, GPC/DNT honoured, cookie line in each site's privacy policy including third-party installs (the install guide includes the wording).

## 8. SEO and performance

- Crawlers and known bots always get the control, no cookie, no tracking, in both modes. Variants live in body text only; title, meta, canonical, JSON-LD, `llms.txt` and OG tags never vary. Matches Google's guidance on A/B testing (no cloaking, same intent, no redirects).
- Server slots (route A): identical to today, text is in the first HTML, no flicker, no extra requests. Preferred for anything above the fold.
- Overlay (route B and script embed): script under about 6 KB gzipped, async, one cached config request, no third-party calls, picker code never loaded for visitors. Hide-until-ready is limited to matched slots with a 300 ms ceiling. LCP elements are flagged. Budget: no LCP regression beyond noise and CLS unchanged, verified with Lighthouse and the site check before and after.
- Because the overlay changes text after load, crawlers that execute JavaScript see the control only (they are excluded), so indexed content never depends on a variant.

## 9. Testing plan

Unit: selector builder (uniqueness, stability under unrelated DOM edits), fingerprint verify and repair, slot id generation and collisions, eligibility rules, copy validation per kind, length and layout-warning calculations, config endpoint shape and CORS, edit token signing and expiry, tier limits.
Integration: create-draft then start flow writes Supabase before Redis and audits; detach path serves the original page; preview mode records no events and sets no cookie; bots, GPC and opt-out get the control in both modes; Redis down fails open; origin allow-list blocks other sites.
Browser (Playwright, extends `scripts/site-check.mjs`): pick an element in the framed preview, create variants, preview on mobile and desktop, start, confirm the live page shows variants with a sticky cookie and no console errors; a Lovable-style React fixture with route changes and re-renders to prove the MutationObserver behaviour.
After every deploy: full site check on saabai.ai (`--exp`), Stu's and LMM (`--exp=off`, unchanged).

## 10. Effort and milestones

| Milestone | Scope | Effort | Exit criteria |
|---|---|---|---|
| M0. Spec and spike | Confirm iframe and `postMessage` approach on saabai.ai, prototype selector builder on 10 real pages, decide route A vs B defaults | 1 day | Selectors unique and stable on all saabai.ai, Stu's and LMM pages |
| M1. Editor for declared slots | Visual editor view, framed preview, picker lists existing `data-exp-slot` elements, create test from a declared slot, preview with variant forcing, start gate | 3 to 4 days | Shane creates a variant set on the hero headline or button visually and starts it |
| M2. Slot promotion (route A) | Selector and slot id generation, `target` model and migration, slot request queue, agent PR wrap flow, "Preparing" state | 4 to 5 days | Click any eligible text or button on saabai.ai and have a server-rendered test ready within minutes, no flicker |
| M3. Runtime overlay | `sb-exp.js` runtime, resolve and repair, detach and auto-pause, hide-until-ready, "Make permanent" | 4 to 5 days | Instant test on any page of a factory site, flicker and CLS within budget |
| M4. Script embed (Lovable) | Config endpoint, CORS and origin registry, install guide, `SbSlot` component and Lovable prompt, page-based conversions, React SPA fixture tests | 4 to 6 days | Working pilot on a Lovable-built test site, events and dashboard end to end |
| M5. Hardening and tiers | Layout and overflow checks, image kind (alt text, dimension match) behind the Advanced tier, tier limits, client-facing editor via portal session, docs | 3 to 4 days | Safe for a client to use unsupervised on text and buttons |

Total about 19 to 25 working days. A useful slice ships after M1 (about 4 days) and the no-code value really lands at M2 (about 9 to 10 days total). Soak each milestone on saabai.ai first, then Stu's and LMM, then the pilot.

## 11. Risks

- Fragile selectors on regenerated Lovable pages: mitigated by `data-exp-slot` via `SbSlot`, text fingerprints, and safe detach.
- React fighting the overlay: observer with a revert guard and an "unstable target" warning; prefer route A for server sites.
- Iframe blocked by site headers: new-window editor bar fallback.
- Flicker on overlay tests: hide-until-ready plus discouraging LCP elements; recommend route A above the fold.
- Over-testing on tiny traffic: the editor shows expected time to a result and recommends one test at a time, as in the original plan.
- Bad copy: kind rules, banned claims, AI guardrails and the approval gate.
- Scope creep into layout and styling: kept to later layers by design.

## 12. Decisions needed from Shane

1. Route A (agent PR wrap) as the default for our own sites, with overlay as the instant option. Recommended.
2. Start with owner-only (Shane) in M1 to M3 and open a client-facing editor only in M5. Recommended.
3. Whether the script embed pilot (M4) uses a Saabai-owned Lovable test site first. Recommended, and kept separate from any Localsearch work.
4. Images behind the Advanced tier in M5, with text and buttons in Entry. Recommended.
