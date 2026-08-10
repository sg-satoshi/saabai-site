# Stu's Cycle Repairs — Site Factory Port Design Spec

**Date:** 2026-08-10
**Client:** Stu's Cycle Repairs (mobile bicycle mechanic, Gold Coast)
**Source:** Lovable export `Cycle Repair Revamp.zip` (TanStack Start + Vite + React + Tailwind v4)
**Target:** `saabai-site` repo, native Next.js App Router pages under `app/sites/cycle-repair/`
**Status:** Approved in-session; ready for implementation plan.

---

## 1. Goal

Reproduce the approved Lovable-built marketing site inside Saabai Site Factory as
native Next.js pages, visually faithful to the original, with the enquiry forms
wired to real lead capture (email via Resend) instead of `mailto:`.

## 2. Source shape (what we're porting)

- **Framework:** TanStack Start (SSR) + Vite. File-based routes in `src/routes/`.
- **Pages:** `index.tsx` (Home, ~507 lines), `contact.tsx` (~225), `quote.tsx` (~406),
  `__root.tsx` (shared layout/head, ~136), plus a `sitemap.xml.ts`.
- **Content:** `src/lib/services.ts` — pricing `tiers` (Bronze/Silver/Gold style) and
  `lineItems`. Copied verbatim.
- **Styling:** own Tailwind v4 `@theme` in `src/styles.css`. Fonts: Space Grotesk
  (display), IBM Plex Sans (body). Palette: warm-dark oklch tokens
  (`background`, `surface`, `surface-2`, `brand`, `cta`, `muted-line`, etc.).
- **Assets:** `stus-logo-v2.png`, `mechanic.jpg`, `drivetrain.jpg`, `favicon.png`,
  `robots.txt`.
- **Components:** pages are hand-built with Tailwind utilities. The 46 files in
  `src/components/ui` (shadcn) are unused by the routes and will NOT be ported.
- **Forms:** contact + quote submit via `window.location.href = mailto:` to
  `stuscyclerepairs@gmail.com`. Fields captured client-side.

## 3. Target structure (in saabai-site)

```
app/sites/cycle-repair/
  layout.tsx            # loads fonts + scoped theme stylesheet; wraps pages
  cycle-repair.css      # the Lovable @theme tokens + :root palette, scoped to the site root
  page.tsx              # Home  (port of routes/index.tsx)
  contact/page.tsx      # Contact (port of routes/contact.tsx) — form posts to API
  quote/page.tsx        # Quote  (port of routes/quote.tsx)   — form posts to API
  services.ts           # copied verbatim from src/lib/services.ts
public/cycle-repair/
  stus-logo-v2.png, mechanic.jpg, drivetrain.jpg, favicon.png
app/api/cycle-repair/lead/route.ts   # receives form submissions, emails Stu via Resend
```

## 4. Fidelity approach (preserve the exact look)

- **Style isolation:** the client site's design system is defined in a scoped
  stylesheet whose custom properties live on the site's root wrapper, so it does
  NOT collide with saabai's global `--saabai-*` theme (same isolation pattern the
  existing client sites use). Tailwind utility classes used by the pages
  (`bg-surface`, `text-brand`, `bg-cta`, `bg-background`, `text-fg`, etc.) are
  backed by these tokens.
- **Fonts:** Space Grotesk + IBM Plex Sans loaded via the site layout (next/font or
  a Google Fonts link), matching the Lovable build.
- **Markup:** port each page's JSX faithfully; convert TanStack `<Link>`/router use
  to Next.js `<Link>` and app routes; convert `@/assets/*` imports to
  `/cycle-repair/*` public paths; keep class names.
- **Verification:** build + run the original Lovable app locally, screenshot Home /
  Contact / Quote; port; screenshot the Next.js versions; compare side-by-side and
  fix drift before shipping. Any element that cannot be reproduced 1:1 is flagged.

## 5. Forms → lead capture (approved change from mailto)

- New route `POST /api/cycle-repair/lead` validates the submission and emails the
  enquiry to `stuscyclerepairs@gmail.com` via the existing Resend integration
  (from a Saabai/Stu sender), mirroring the pattern in the existing lead routes.
- Contact and Quote forms keep their exact fields and design; the submit handler
  posts to the API and shows a success state instead of opening a mail client.
- Failures show an inline error and (fallback) can still surface the shop email.

## 6. Dropped (not needed as Next.js pages)

TanStack Start/Router, react-query, `lovable-error-reporting`, `error-capture`,
`server.ts`/`start.ts`, `vite.config.ts`, `bun.lock`, the unused `components/ui`
shadcn set. Routing becomes Next.js. A `sitemap`/`robots` for the client can be
added later if a custom domain is attached.

## 7. Non-goals (v1)

- No AI chatbot on the site yet (Saabai differentiator; add later).
- No custom-domain wiring yet — ships under `saabai.ai/sites/cycle-repair`.
- No CMS; content stays in the page files + `services.ts`.

## 8. Constraints (standing orders)

- Australian English; **zero em dashes** and no AI-tell phrases in any visible copy
  (the copy is the client's own from Lovable — preserve it; do not inject new
  marketing phrasing). `grep -n '—'` visible copy before shipping.
- `npm run predeploy` must pass. Deploy on push to `main`; verify the live page.
- Minimal blast radius: everything lives under `app/sites/cycle-repair/`,
  `public/cycle-repair/`, and the one API route. No changes to global theme or nav.

## 9. Success criteria

- `saabai.ai/sites/cycle-repair` (+ `/contact`, `/quote`) render faithfully to the
  Lovable build, verified by screenshot comparison.
- Contact + Quote submissions email Stu via Resend.
- predeploy passes; verified live after deploy.
