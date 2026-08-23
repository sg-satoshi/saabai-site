# Roadmap — deferred work

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
