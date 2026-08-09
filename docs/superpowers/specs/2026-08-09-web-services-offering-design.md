# SaabAI Web Services Offering — Design Spec

**Date:** 2026-08-09
**Author:** Shane + Claude (brainstorming session)
**Status:** Draft for review
**Repo:** `/Users/aiworkspace/saabai-site` (saabai.ai) — deploys on push to `main`

---

## 1. Goal

Add a productised **web services** offering to saabai.ai: build-from-scratch sites,
rebuilds, and AI implementation for clients — packaged into three tiers, sold under the
existing SaabAI brand without diluting its premium positioning.

## 2. Positioning (the decisions made)

- **Audience:** the same premium professional-firm buyers SaabAI already targets (law,
  accounting, real estate, professional services). *Not* a downmarket SMB volume play.
- **Frame:** we do **not** sell "web design." We sell an **AI-native web presence** —
  *"Websites that work like an employee."* Every site ships with a trained AI team member
  that answers enquiries, qualifies leads and never clocks off. This is the differentiator
  no Wix/Squarespace/generic agency can match, and it reuses existing SaabAI capability
  (Rex, Lex, Mia widgets, Site Factory).
- **Brand architecture:** one SaabAI brand. No sub-brand. Low dilution risk.
- **Why it strengthens the business:** the website is a Trojan horse for the AI. Upper
  tiers include automations, which form a natural on-ramp to the existing **$3.5k+ AI
  Audit** — this offering *feeds* the premium product rather than competing with it.

## 3. Pricing model

**Setup fee (one-off) + monthly care.** Chosen over all-in-monthly because it signals
quality, matches how firms already buy from SaabAI, and protects cash flow.

- Build fees are quoted **"from $X"** to keep it premium and allow scoping larger jobs up.
- Monthly covers hosting, security, updates, and keeping the AI running/trained.
- Both **new builds and rebuilds** use the same ladder — a rebuild is just "the build."

## 4. The three tiers

Tiers climb on **depth of AI**. The floor is high: **every tier includes a trained
chatbot** (the AI-native promise). The custom avatar is the top-tier flagship.

| Tier | What it is | Build (one-off) | Then monthly |
|---|---|---|---|
| **Presence** | AI-built professional site + trained enquiry chatbot (answers FAQs, captures leads) | from **$2,000** | **$100/mo** |
| **Growth** | Everything in Presence + larger / rebuild-grade site + lead-**qualifying** bot with booking & CRM handoff + light automations | from **$4,000** | **$200/mo** |
| **Signature** | Everything in Growth + **custom avatar** trained to look and sound like the client's chosen persona + workflow automations + priority support | from **$6,500** | **$300/mo** |

> Prices and tier names are Shane's proposal from this session — adjustable at spec review.

**AI + avatar placement:** trained chatbot in all three tiers; the custom look-and-sound
avatar (matches the client's requested persona) is the **Signature** (top-tier)
differentiator.

## 5. What gets built on the site

1. **New page:** `/websites` — sections:
   - Hero: *"Websites that work like an employee"* + primary CTA.
   - The AI-native pitch (why a site with a built-in AI employee beats a normal site).
   - New build **or** rebuild explainer.
   - The 3-tier pricing table (Presence / Growth / Signature).
   - Chatbot + avatar explainer (what "trained to look and sound like your persona" means).
   - FAQ (a few questions in the existing FAQ style).
   - Final CTA (book a call, and/or Stripe links per tier — see §6).
   - Reuses the existing dark-teal design system (`app/globals.css` `--saabai-*` tokens)
     and shared components (Nav, Footer, section/card patterns) so it looks native.

2. **Navigation:** add **"Websites"** under the existing *"Work With Us"* group in
   `app/components/Nav.tsx`. Add a matching link in `app/components/Footer.tsx`.
   *(Full Products vs Services nav reorg is deferred — see §8.)*

3. **Metadata/SEO:** page-level metadata export (title, description, canonical, OpenGraph)
   consistent with other pages.

## 6. Conversion mechanism (open sub-decision)

Two options, decide at build time:
- **(a) "Book a call" CTA** — same Calendly pattern as the rest of the site. Simplest;
  best when builds are quoted "from $X".
- **(b) Stripe links per tier** — same pattern as `/ai-audit`. Better if Shane wants
  self-serve checkout for the setup fee + a monthly subscription.

Default recommendation: **(a) book-a-call**, because build fees are "from" (need scoping)
and monthly requires a subscription setup. Stripe self-serve can come later.

## 7. Non-goals (this round)

- No downmarket/SMB sub-brand.
- No dedicated Products landing page or full nav restructure (deferred).
- No self-serve Stripe checkout in v1 unless Shane opts for §6(b).
- No changes to the pre-existing uncommitted files on `main`.

## 8. Deferred / roadmap

- **Full navigation reorganisation** into clean **Products** (Rex, Lex, Mia as branded
  products) vs **Services** top-level menus — its own design conversation.
- Self-serve Stripe checkout for web tiers.

## 9. Copy constraints (standing orders)

- Australian English. **Zero em dashes.** No AI-tell phrases anywhere (page copy, FAQs,
  JSON-LD, meta). `grep -n '—'` touched files before shipping.
- Premium, modern, professional design; restrained palette (existing teal + navy).

## 10. Success criteria

- `/websites` page live on production, visually native to saabai.ai.
- "Websites" reachable from the main nav and footer.
- Three tiers clearly presented with the AI-native story front and centre.
- Verified on the live production URL after deploy (per standing orders).
