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
