# Design System: Prestige Legal — v2 (Navy + Teal)
**Source:** Home page v2 + Practice Areas + About + Contact page

## 1. Visual Theme & Atmosphere

Open, clean, and conversion-focused. The canvas is cool off-white with pure white content zones — light and breathable. Deep navy (#0D1D2B) anchors all headings and the stats/footer bands, giving structural weight without heaviness. Teal runs through the page as the single active accent: it appears in CTAs, icons, eyebrow labels, links, check marks, and process numerals — but always at the right scale so it never overwhelms. The hero is the one dark moment: a full-bleed photo with a 60% navy overlay, creating a cinematic entry point before opening into the light content below. Section rhythm is deliberate — white and cool light gray alternate to create variety without contrast fatigue. The overall mood is approachable authority: a firm you'd actually call.

## 2. Color Palette & Roles

- **Pure White (#FFFFFF)** — `surface-container-lowest` — Navigation bar, card surfaces, testimonial cards, FAQ cards
- **Cool Off-White (#F7FAFC)** — `background` / `surface` — Page base background
- **Frost Gray (#F1F4F6)** — `surface-container-low` — Services section, about teaser, contact section — alternating section background
- **Teal Mist (#E9F7F2)** — `surface-container-low` (Practice Areas variant) — Slight teal tint on alternating sections; Stitch may render either this or Frost Gray depending on page context
- **Pale Teal (#E4F1EC)** — `surface-container` — Icon circle backgrounds on Practice Areas page (vs Soft Mint on Home)
- **Deep Charcoal Navy (#0D1D2B)** — `on-secondary-fixed` — All headings, logo "Prestige", stats band background, footer background — the structural anchor
- **Forest Teal (#006B5E)** — `primary` — CTA buttons, icons, eyebrow labels, check marks, links, logo "Legal", hover border on FAQ cards, CTA band background
- **Bright Teal (#2AA896)** — `primary-container` — Button hover state only
- **Soft Mint (#84F6E2)** — `primary-fixed` — Icon circle backgrounds, avatar circle fill, stats numerals on dark band, hero subtext, footer icon accents
- **Mid Aqua (#66D9C6)** — `primary-fixed-dim` — Hero eyebrow label, "Finally Resolved." headline on dark — teal that reads on the dark overlay
- **Dark Teal-Gray (#3D4946)** — `on-surface-variant` — Body copy, card descriptions, sub-labels, trust bar sub-labels
- **Near Black (#181C1E)** — `on-surface` — Checklist text in about section
- **Mist Gray (#BCC9C5)** — `outline-variant` — Card borders, vertical trust bar dividers, footer body text, footer links
- **Cool Blue-Gray (#B8C8DB)** — `secondary-fixed-dim` — Hero subtext on dark backgrounds (About page); softer than Mist Gray
- **Warm Mid-Gray (#516070)** — `secondary` — Team member role titles, stat sub-labels on light backgrounds

## 3. Typography Rules

**Inter only** — no serif anywhere.

- **Display (hero headline):** Inter 800, 48px desktop / 36px mobile, -0.02em letter-spacing, 56px / 42px line-height
- **Section Heading (headline-md):** Inter 700, 32px, -0.01em letter-spacing, 40px line-height
- **Card / Step Heading (headline-sm):** Inter 700, 24px, 32px line-height
- **Body Large:** Inter 400, 18px, 28px line-height — hero subtext, about paragraphs
- **Body Medium:** Inter 400, 16px, 24px line-height — card descriptions, general copy
- **Body Small:** Inter 500, 14px, 20px line-height — trust bar sub-labels, footer links
- **Eyebrow / Pill Label:** Inter 700, 12px, 0.05em letter-spacing, uppercase — section labels, always in a pill

## 4. Component Stylings

- **Primary Button:** Forest Teal (#006B5E) fill, white text, Inter 700, 8px radius (`rounded-lg`), `px-lg py-sm` (48px × 12px). Hover: transitions to Bright Teal (#2AA896). Active: scales to 95%.
- **Secondary Button (Ghost):** 2px white border, white text — used only on photo hero and teal CTA band. Hover: white fill, navy text.
- **Eyebrow Pill Labels:** Pill shape (`rounded-full`), 1px solid Forest Teal border, Forest Teal uppercase text 12px. On dark backgrounds: border and text use Mid Aqua (#66D9C6). Used above every section heading without exception.
- **Cards:** Pure white background, 12px radius (`rounded-xl`), whisper-soft shadow (`0px 2px 12px rgba(0,0,0,0.06)`), `p-md` (24px) padding. Hover: lifts with `-translate-y-1` transition.
- **Icon Containers:** Circle (`rounded-full`), Soft Mint (#84F6E2) background, Forest Teal (#006B5E) icon, 48px diameter (w-12 h-12).
- **Avatar Circles:** Soft Mint (#84F6E2) fill, Forest Teal initials, 40px diameter — testimonial authors.
- **Process Numerals:** Inter 800, 64px, Forest Teal color at 20% opacity — large, decorative, faded behind step content.
- **FAQ Accordion:** White card, 12px radius, soft shadow, 1px `surface-variant` border. Hover: border transitions to Forest Teal. Toggle via onclick. Teal "+" icon right-aligned.
- **Nav:** White bg, 1px `outline-variant` bottom border, subtle `shadow-sm`. Logo: "Prestige" in Deep Navy + "Legal" in Forest Teal. Shrinks on scroll. Active page link: Forest Teal color + bold weight + 2px teal underline.
- **Anchor Nav Links (inner-page):** Left-border accent style — `border-l-2 border-transparent` at rest, transitions to Forest Teal border + Frost Gray background on hover. Text slides right 8px on hover. Used for in-page jump links.
- **Client/Audience Pill Tags:** `bg-surface-variant` (light gray-teal) fill, `on-surface-variant` text, `rounded-full`. Used to label "who we act for" audiences. Not interactive.
- **CTA Band:** Forest Teal (#006B5E) full-width background, white headline, Soft Mint subtext. Buttons use `rounded-full` (pill shape) in CTA sections — differs from `rounded-lg` used in content areas.
- **Stats Band:** Deep Charcoal Navy (#0D1D2B) full-width background, Mid Aqua (#66D9C6) numerals, white uppercase labels.
- **Footer:** Deep Charcoal Navy (#0D1D2B), 4-column grid, Soft Mint contact icons, Mist Gray body text and links.

## 5. Layout Principles

- **Max width:** 1200px (`container-max`), centered with `mx-auto`
- **Desktop horizontal padding:** 48px (`lg`) on all sections
- **Section vertical rhythm:** `py-xl` (80px) for all full sections; `py-lg` (48px) for compact bands (trust bar)
- **Grid patterns:** 4-col trust bar; 3-col service cards; 3-col process steps; 2-col about/contact; 4-col footer
- **Gutter:** 24px between grid columns
- **Base unit:** 8px
- **Section alternation:** White (nav) → Dark overlay (hero) → White (trust bar) → Frost Gray (services) → White (process) → Dark Navy (stats) → White (testimonials) → Frost Gray (about) → Teal (CTA band) → Frost Gray (contact) → White (FAQ) → Dark Navy (footer)
- **Cards:** Never use hard borders on light backgrounds — rely on soft shadow for elevation. Border only appears on hover (teal) or as a very subtle `surface-variant` line on testimonial/FAQ cards.
- **Eyebrow rule:** Every section heading must be preceded by a pill eyebrow label. No section heading appears alone.
- **Button shape by context:** Use `rounded-lg` (8px) for buttons embedded in content sections; use `rounded-full` (pill) for standalone CTA band buttons and nav CTA.
- **Display size by page type:** Inner pages (non-home) use 64px display for hero headline; Home used 48px. Both use Inter 800.
- **Team Member Cards:** Horizontal layout — circular photo (96px, 2px Forest Teal ring border) + name in bold + role in `secondary` (#516070) uppercase small caps + "View Profile →" teal link. Card background: `surface` (#F7FAFC) with `outline-variant` border, 12px radius.
- **Milestone / Inline Stats Row:** Sits below a `border-t border-outline-variant` divider within a content column. Large Forest Teal number (headline-md) + uppercase `secondary` label beneath. Used for firm history facts (Founded, Locations, Clients).
- **Values Cards (About variant):** Icon rendered directly at text-4xl (no circle container) — simpler than the icon-circle pattern used on other pages. Centered layout with heading below icon.
- **Section vertical rhythm varies by page:** About uses 120px section gap; Home/Practice Areas used 80px. Stitch increases breathing room on story-heavy pages. Accept either — both feel intentional.
- **Form Inputs:** White background, `outline-variant` border, 8px radius (`rounded-lg`), Forest Teal focus ring at 20% opacity (`focus:ring-primary/20`). Labels in bold body-sm above each field.
- **Contact Page — Left Column Card:** The enquiry form lives in a self-contained white card (12px radius, `ambient-shadow: 0 10px 30px rgba(13,29,43,0.05)`). This card can be swapped for a plain contact details block (email, phone, hours) without changing anything else on the page — the two-column layout holds either content type.
- **Promise Bar:** Compact full-width white band below page hero. Three columns with icon + bold label + sub-label. Icon circle uses `surface` background (teal-tinted), not Pale Teal — a subtle variant seen on Contact page.
- **Ambient Shadow:** Contact page uses a slightly deeper shadow `0 10px 30px rgba(13,29,43,0.05)` vs standard `0 2px 12px rgba(0,0,0,0.06)` on other pages. Both are whisper-soft; use either.
