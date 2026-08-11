# SEO pass — standard treatment for any site

> Read when Shane mentions SEO, location pages, sitemaps, or Google Search Console.

## The pass (in order)
1. Keyword research for the niche + location.
2. Unique `<title>`, meta description, single H1, canonical, and OG tags on EVERY page.
3. schema.org JSON-LD. Gotchas: `Service` schema must NOT contain `aggregateRating`; every `Service` needs a `url`.
4. **Location pages**: Australian capital cities + Gold Coast, each with genuinely unique copy (1,200–2,000 words). Never doorway-page clones — Shane checks. Link them in a styled grid at the bottom of the page.
5. Sitemap, then Google Search Console: submit domain; the sitemap field takes the PATH ONLY (`sitemap.xml`).
6. Copy rules apply to all SEO copy: no em dashes, no AI-tell phrases, Australian English.

## Division of labour (tell Shane explicitly which is which)
- Claude: fixes code, redeploys, resubmits sitemaps programmatically where possible.
- Shane: re-validates/resubmits inside the GSC UI. Give him short numbered steps, one at a time.
- Always answer his standing question up front: what fixes itself automatically vs what needs his action.

## Nico Moretti pages special case
New nicomoretti.au pages are static HTML in `public/clients/nico-moretti/`, uploaded to Vercel Blob. A new slug must be added in THREE places or it 404s:
1. `HTML_PAGES` whitelist in `app/sites/[slug]/[page]/route.ts`
2. `sitemap.ts`
3. `scripts/upload-nico-pages.mjs` — then run the upload.
