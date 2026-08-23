# Todo — Admin Product Manager (piece 1 of 3)

Design spec: agreed in-session 2026-08-09. Stripe-backed catalogue, modern cart-style admin page.

## Plan
- [ ] `lib/product-catalogue.ts` — CatalogueProduct type + Redis CRUD (mirrors invoice-store.ts). No Stripe here.
- [ ] `app/api/admin/products/route.ts` — GET list, POST create (creates Stripe Product + Price(s), saves record). Admin-only (clientId === SAABAI_ADMIN_ID).
- [ ] `app/api/admin/products/[id]/route.ts` — PATCH update (Stripe product update; price change = new price + archive old), DELETE = archive.
- [ ] `app/saabai-admin/products/page.tsx` — server, admin auth guard (mirror payments/page.tsx), renders ProductsClient.
- [ ] `app/saabai-admin/products/ProductsClient.tsx` — AdminShell wrap, product-card grid + add/edit form. Price types: one-time / recurring / setup+monthly, optional free-trial days, GST-inclusive toggle, image URL, active toggle.
- [ ] `app/saabai-admin/AdminSidebar.tsx` — add "Products" nav item in Saabai section.

## Verify
- [ ] `grep -n '—'` touched files (zero em dashes)
- [ ] `npm run predeploy` passes
- [ ] Deploy to main, confirm Vercel READY, verify /saabai-admin/products live

## Not in v1 (roadmap)
Coupon management UI, Stripe Tax multi-jurisdiction, tiered/usage pricing, selling cart, client billing portal.
