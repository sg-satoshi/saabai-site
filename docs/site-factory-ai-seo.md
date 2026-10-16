# Site factory AI SEO standard

Every site the factory serves must have, on its own canonical host:

1. `/robots.txt` allowing AI crawlers (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Grok and others) and pointing at the sitemap.
2. `/sitemap.xml` listing only real, working pages on the canonical host.
3. `/llms.txt` and `/llms-full.txt` describing the business, services, prices (if published), service area and contact.
4. JSON-LD: LocalBusiness (or a subtype), Service/Offer where prices are published, FAQPage where the site has a FAQ, AggregateRating only if it matches real Google data.
5. A canonical link matching the canonical host.

## Rules
- Facts come from the site's own published copy or registry config only. Never invent facts.
- No home addresses. Use the suburb, "QLD, Australia" or the service areas.
- No Saabai branding or links in a client site's llms/robots/sitemap/JSON-LD. (The visible "Powered by" credit is a separate, owner-approved decision.)
- No template leftovers: no city pages that do not exist, no redirects to saabai.ai pages on client hosts.

## How it is wired
- `lib/geo/index.ts` builds robots.txt, sitemap.xml, llms.txt and llms-full.txt from a `GeoProfile`.
- `lib/geo/profiles.ts` holds hand-checked profiles for coded sites (`CODED_PROFILES`) and builds a profile from the registry plus stored pages for stored-HTML factory sites.
- Stored-HTML sites: `app/sites/[slug]/[page]/route.ts` serves an uploaded file if present, otherwise generates it. `app/sites/[slug]/sitemap.ts` lists real pages only.
- Coded sites with richer needs (Stu's Cycle Repairs) have their own `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt` routes under `app/sites/<slug>/`.
- Static sites under `public/clients/<slug>/` ship `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt` beside `index.html`; `proxy.ts` rewrites them onto the custom domain (see LMM).
- `next.config.ts` `CLIENT_HOST`: saabai.ai city redirects never apply to client hosts. Add new client domains there.

## Checklist for a new site
- [ ] Add a profile to `CODED_PROFILES` (coded site) or fill the registry entry (name, phone, email, description)
- [ ] Add the client domain to `CLIENT_HOST` in `next.config.ts`
- [ ] Check `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/llms-full.txt` return 200 on the live domain and every sitemap URL returns 200
- [ ] `npx tsx --test tests/factory-geo.test.ts`
