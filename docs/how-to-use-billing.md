# How to use your billing system

A plain-English guide to selling products and managing client billing on saabai.ai.
Written for Shane, 2026-08-10.

---

## The big picture (how the pieces fit)

You now have a full sell-and-bill system. The flow is:

**Create a product → Sell it to a client → They get a login → They see their invoices.**

Four parts, three places:

| Part | Where | Who uses it |
|------|-------|-------------|
| Product manager | Saabai Admin → Products | You |
| Discounts + coupons | Saabai Admin → Products | You |
| Selling (checkout) | Saabai Admin → Products → **Sell** button | You |
| Client billing area | Client login → Billing | Your clients |

---

## ONE-TIME SETUP (do this first, takes 2 minutes)

The client "Manage billing" button uses Stripe's secure portal, which has to be switched on once.

1. Go to **dashboard.stripe.com** and log in.
2. Click the **Settings** gear (top right).
3. Search for **"Customer portal"** (it is under the Billing section).
4. Turn it on and click **Save**.

Until you do this, invoices still show for clients, but the "Manage billing" button will show an error.

---

## PART 1 — Creating a product

1. Log in, go to **Saabai Admin** (link at the bottom of the left menu), then click **Products** in the sidebar.
2. Click **+ Add product** (top right).
3. Fill in the form:
   - **Name** and **Description** (shown on the product card).
   - **Image URL** (optional) — paste a link to an image to make the card look premium.
   - **Price type**, which changes the fields below it:
     - **Setup fee + recurring** — e.g. $2,000 setup then $100/month. This is the website-tier model.
     - **Recurring only** — a plain subscription, no setup fee.
     - **One-time** — a single charge.
   - For recurring types you also pick the **billing interval** (monthly, yearly, etc.) and an optional **free trial**.
   - **Prices include GST** — leave on for Australian pricing.
   - **Active** — leave on so the product can be sold.
4. **Shortcut:** the **Presence / Growth / Signature** buttons at the top prefill the website-tier prices for you. Click one, tweak if needed, save.
5. Click **Create product**. It appears as a card, and behind the scenes it is created in Stripe automatically.

To change a product later, click **Edit** on its card. To retire one, click **Archive**.

---

## PART 2 — Adding a discount or coupon code

### A discount (sale price on a product)
1. On the product, click **Edit**.
2. Turn on **Add a discount (sale price)**.
3. Choose **% off** or **$ off**, tick which fees it applies to (Setup / Recurring), and optionally set a **Sale ends** date.
4. Save. The card now shows the original price struck through, the new price, and how much is saved, e.g. **~~$200/mo~~ $150/mo · Save $50 (25%)**.

### A coupon code (customer types it in)
1. On the Products page, click the **Coupons** tab.
2. Fill in the **New coupon code** form: the code (e.g. `LAUNCH25`), % or $ off, how long it lasts, optional expiry and usage limit, and optionally restrict it to one product.
3. Click **Create code**. It is created in Stripe and can be used at checkout.

---

## PART 3 — Selling to a client

1. On the Products page, click the **Sell** button on the product you want to sell.
2. A panel opens showing the live price. Fill in the **customer name and email**.
3. **Optional:** type a **coupon code** and click **Apply** — the price updates to show the discount.
4. Choose how they pay:
   - **Charge card now** — enter the client's card in the panel and it charges immediately. Best when you are on a call with them.
   - **Generate link** — creates a secure payment link you copy and send. The client enters their own card. Best for remote clients.
5. On a successful payment, the client automatically gets a **login created and a welcome email** with their details.

> ⚠️ **Real money warning.** Your Stripe is in live mode, so "Charge card now" makes a real charge. To test safely, either switch Stripe to test mode and use card `4242 4242 4242 4242`, or make a cheap $1 product, pay it via a link, and refund it in Stripe.

---

## PART 4 — What your clients see (billing area)

When a client logs in at **saabai.ai** and opens **Billing** in their sidebar, they get:

- **Invoice history** — every invoice with date, description, amount, status, and a **PDF** download.
- **Manage billing** — a button that opens Stripe's secure portal, where they can update their card, and view or cancel subscriptions.

You do not need to do anything here; it fills in automatically as clients are billed.

---

## Quick answers

- **Where do products live?** In Stripe (the source of truth) plus a fast local copy for the cards. You never touch Stripe directly to add a product; the Products page does it.
- **A client says the invoice is missing.** Invoices appear after their first payment. Check the payment went through in the Stripe dashboard.
- **The "Manage billing" button errors.** The one-time Customer Portal setup above has not been done yet.
- **Can I change a price after selling?** Yes, Edit the product. Existing subscriptions keep their old price; new sales use the new one.
- **Where do sale notifications go?** A summary email is sent to hello@saabai.ai on each sale.
