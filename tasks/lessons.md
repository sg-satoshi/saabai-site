# tasks/lessons.md — mistakes never to repeat (read at session start)

> After ANY correction from Shane: add an entry — what went wrong → the rule that prevents it.
> Seeded 2026-07-06 from analysis of past chat history.

- Worst session on record: chatbot "fixed" 5+ times on saabai.ai/sites/bo-consultancy while boconsulting.com.au stayed broken. → Custom domains are served via proxy.ts rewrite; React hydration fails silently there (no onClick/useEffect/usePathname). All client-site interactivity = vanilla JS via raw `<script dangerouslySetInnerHTML>`; verify every change on /sites/<slug> AND custom domain (www + apex) AND mobile.
- Content gated behind `opacity:0` + JS reveal left pages blank below the fold on custom domains. → Never gate visibility behind JS; reveal styles only under an `html.<prefix>-js` class that JS adds.
- Claimed "live" before Vercel finished or before the change was verified on the real URL; Shane polled "is it live?" dozens of times. → Wait for READY, verify the specific change live, report deploy URL + where to look.
- Em dashes and AI-tell phrases survived in JS strings, JSON-LD, and chatbot copy after being banned "under no circumstances". → `grep -n '—'` every touched file before shipping any client-facing copy.
- Unstyled light-theme subpages (privacy/terms) rendered white-on-white / invisible because globals.css sets dark body + white text. → Every light client page sets explicit background AND text colours.
- A rule fix was applied only at the quoted spot; the same bug lived elsewhere (e.g. rex-knowledge vs calculatePrice in woo-client). → Grep the whole repo (and Rex's sibling repo) and fix every occurrence in one pass.
- "Redesign" delivered as a component reshuffle got rejected ("you basically just re jiggled the UI"); multi-colour palette read as "childish". → Redesign = genuinely new layout/typography/components; one dominant colour + restrained accents.
- Wrong-repo push: a mylife.saabai.ai change landed in this repo. → State target repo/remote before every push; mylife lives in ~/mylife-saabai.
- Service JSON-LD with aggregateRating and missing url caused GSC errors; sitemap submitted with full URL failed. → Service schema: no aggregateRating, url required; GSC sitemap field takes 'sitemap.xml' path only.
- Stitch mockup images went dead after launch (expiring googleusercontent URLs). → Always rehost every asset before deploy.
