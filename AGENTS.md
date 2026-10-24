# Agent rules

## Client sites on saabai.ai

Coded client sites are registered once, in `lib/client-site-directory.ts` (slug, canonical `url`, `domains`). `lib/site-registry.ts` builds `APP_ROUTER_SITES` from that list. Routing, indexing, and Saabai chrome all read it. Do not add a per-site opt-in.

`lib/client-site-surface.ts` is the only helper. `proxy.ts` applies it.

- On production `saabai.ai` and `www.saabai.ai`, `/sites/<slug>` and `/sites/<slug>/<path>` 301 to the same path on the client's canonical host. `/sites/cycle-repair/faq` goes to `https://stuscyclerepairs.com/faq`. The canonical host is the registry `url` when that host is not saabai.ai.
- A site with no custom domain stays on `/sites/<slug>` and is `noindex, nofollow` (`X-Robots-Tag` and the meta robots tag).
- Preview hosts (`*.vercel.app`, localhost) are `noindex, nofollow` and are not redirected.
- Pages served on the client custom domain stay `index, follow`.
- Do not add `Disallow: /sites` to robots.txt. Crawlers have to see the redirect or the noindex tag.
- `app/sitemap.ts` (saabai.ai's sitemap) must not list `/sites` URLs. Client sitemaps belong on the client host.
- Do not 301 static assets under `/sites/<slug>`. Custom domains rewrite those files to www.saabai.ai, and a redirect would loop.
- Do not redirect `/api`, the chat embed, or an admin preview. A request with the `saabai_session` cookie, or a fetch whose referrer is `/saabai-admin`, keeps the `/sites` URL so the site factory preview still loads. That response is still noindex.
- The announcement bar, Mia, the news ticker, the mobile call bar, the email popup, and experiment overlays do not render on `/sites/*`, `/clients/*`, or a registered client host. Saabai's own pages still show the bar and stay indexable. Do not add client hosts or `/sites/<slug>` paths to a component allow-list.

`app/sites/layout.tsx` sets robots from the helper. Do not export an indexable `robots` object from a client site layout. A static `index: true` overrides the preview noindex.

Static HTML sites mapped in code (Lifestyle Money Management) use `STATIC_DOMAIN_MAP` in the same helper. Redis `saabai:domain-map` covers factory sites that are not in the directory yet.

One manual leftover: `CLIENT_HOST` in `next.config.ts` stops saabai.ai city redirects (`/sydney` and the rest) on a client domain. Add a new custom domain there as well.

The check is `tests/client-site-surface.test.ts`. CI runs it from `.github/workflows/client-site-surface.yml`. It walks every registered site.
