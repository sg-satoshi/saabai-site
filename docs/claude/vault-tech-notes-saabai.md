# Saabai tech notes (moved from Obsidian vault 2026-07-06)

- Tech stack: Next.js 16, Vercel, Upstash Redis, Tailwind CSS, AI SDK
- Code: /Users/aiworkspace/saabai-site/
- SaabaiAppShell: light #f5f5f7 bg, dark #06081a sidebar, gold #C9A84C accents, SVG icons
- Administration: auth via isAdminSession(), data stored in Redis per-user
- Payments: Stripe v22 active for Lex subscriptions
- Invoicing: wants output matching mylife.saabai.ai format with custom recurring billing intervals
- Telegram bots: lead endpoint uses TELEGRAM_SITES config map; TG env var names must be under 20 chars for Edge
- TG_SITES bot map: full list of site-to-bot mappings defined in code
- Telegram bot chat IDs: TG_NICO_BOT -5576454079, TG_HTM_BOT -5599467558
- Lovable setup: Lovable Pro (200 credits); building local biz websites with Reef, keeping sites on the Lovable platform
- Lily chat: built by Reef Goldberg

## Site implementation notes (moved from Operating Manual.md, 2026-07-06)

- Site Factory billing lives in lib/site-registry.ts.
- Lead API uses Redis plus email. Telegram alert fetch must be inline (no separate function) and awaited before the response (Edge kills IIFE on exit). No hardcoded fallback tokens (GitGuardian flags them). Debug via a minimal GET test endpoint in PUBLIC_API.
- Widget suppression: three widgets suppressed on site-factory sites per slug and hostname: Mia, NewsTicker, EmailCapturePopup. Most commonly missed during builds: NewsTicker.
- Clean URL routing on custom domains: href links must use paths without the /sites/{slug}/ prefix; image and asset src attributes must keep the full prefix. Use sed batch-replace after build. Saabai branding suppression on custom domains also requires hostnames listed in SUPPRESS_HOSTNAMES inside ConditionalWidgets.tsx (path-based suppression alone fails on custom domains).
- Hero backgrounds on mobile: use CSS background-image with cover and centre-centre on the section element, not an img element with object-cover (which leaves grey gaps on tall mobile viewports). Fill from centre, don't stretch, cropping is fine. Test on iPhone 14.
- Promo graphics workflow: when building promo graphics for client portal properties, extract and add immediately. Properties are behind login screens, never public.
