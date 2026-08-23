# Lessons

## Vercel GitHub auto-deploy can silently drop a push (2026-08-09)
- Symptom: `git push` to main succeeds, GitHub has the commit, but Vercel never starts a build (list_deployments shows nothing new, prod URL stays 404) for several minutes.
- Cause: the GitHub -> Vercel webhook for that push was dropped. Not a code or push problem.
- Fix: push again (any new commit re-fires the webhook). The second push triggered the build immediately.
- Verify deploys by polling the live production URL for HTTP 200 + expected content, and cross-check state via Vercel list_deployments (team_wJsriYxqNXFGvqb3vyolvWJT, project saabai-site).

## Stripe SDK v22.1: promotion codes use a `promotion` wrapper (2026-08-10)
- `PromotionCode.coupon` no longer exists at top level. Read the coupon at `pc.promotion.coupon` and expand with `["data.promotion.coupon"]`.
- Create with `stripe.promotionCodes.create({ code, promotion: { type: "coupon", coupon: couponId }, ... })`, NOT a top-level `coupon`.
- Caught by `npm run predeploy` (tsc). Always let predeploy run to completion — its real exit code is the `$?` of the predeploy command, not the wrapper echo.

## Stripe server-side calls on Vercel (2026-08-10)
- Symptom: ALL server-side Stripe calls failed with "An error occurred with our connection to Stripe. Request was retried 2 times." (StripeConnectionError) — since June, across every route.
- Cause: the Stripe Node SDK's default Node `https` client fails when bundled in Vercel's serverless runtime (turbopack).
- Fix: `new Stripe(key, { httpClient: Stripe.createFetchHttpClient(), maxNetworkRetries: 2, apiVersion })` in lib/stripe.ts. Use the fetch client on Vercel.
- Verify Stripe features on the LIVE deploy, not just build — the connection issue only shows at runtime.

## Stripe manual invoices (2026-08-10)
- To EMAIL a payable invoice: create it with `collection_method: "send_invoice"` + exactly one of `days_until_due` or `due_date` (future). Otherwise sendInvoice errors ("collection method must be send_invoice").
- Attach line items EXPLICITLY: create the invoice first, then `invoiceItems.create({ invoice: invoice.id, ... })`. Do NOT rely on Stripe auto-sweeping pending invoice items — it left invoices totalling $0.
