# Roadmap: deferred work (historical)

> This file is a snapshot from August 2026 and is no longer kept up to date.
> The live roadmap is the admin Roadmap page at `/saabai-admin/roadmap`. Its items are stored in Redis (key `saabai:roadmap`, see `lib/roadmap.ts`), and open issues, open pull requests and merged pull requests from GitHub are added automatically.
> Add or change roadmap items on that page, or open a GitHub issue.

## Web services offering (from 2026-08-09 brainstorm)
- [ ] Full navigation reorg: clean Products (Rex, Lex, Mia as branded products) vs Services top-level menus. Its own design conversation.
- [ ] Dedicated /products landing page showcasing live AI agents.
- [ ] Self-serve Stripe checkout for web tiers (setup fee + monthly subscription).

## Billing system — 3-part (from 2026-08-09 brainstorm)
Architecture: Stripe as source of truth — Products/Prices (created from admin) + Checkout/subscriptions for selling + Customer Billing Portal for the client billing area.
Build order:
- [ ] 1) Admin product manager — /saabai-admin/products, Stripe-backed, modern cart-style form (IN PROGRESS)
- [x] 2) Selling — DONE 2026-08-10 (charge now + link, coupons, client accounts)
- [x] 3) Client billing area — DONE 2026-08-10 (invoices, PDFs, Stripe portal in dashboard)
Deferred optional: subscription lifecycle email alerts (notify on each monthly payment success/failure).
