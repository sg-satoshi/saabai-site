# Site Factory Prompt Simplification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the over-specified 245-line prompt system with concise creative briefs that restore Claude's design judgment and output quality.

**Architecture:** Three files change in order — `lib/site-themes.ts` first (new ThemeDef interface + all 9 rewritten themes), then `generate/route.ts` (new system + user prompt), then `generate-multi/route.ts` (new system prompt + simplified sharedTokenLines). Do NOT run `npm run build` until all three files are updated — TypeScript errors are expected after Task 1 until Tasks 2 and 3 complete.

**Tech Stack:** Next.js App Router, TypeScript, Vercel AI SDK (`streamText`), Vercel Blob, Upstash Redis, Claude via `getPremiumModel()`

---

## File Map

| File | Change |
|------|--------|
| `lib/site-themes.ts` | New `ThemeDef` interface. All 9 themes rewritten as creative briefs. Remove: `fontImport`, `headingCss`, `bodyCss`, `sections`. Add: `aesthetic`, `fonts`, `hero` (consolidated). |
| `app/api/site-factory/generate/route.ts` | New `SYSTEM_PROMPT` (~15 lines). New `userPrompt` (~25 lines) using new theme fields. |
| `app/api/site-factory/generate-multi/route.ts` | New `SYSTEM_PROMPT`. Replace `sharedTokenLines` to use new theme fields. |

Everything else (edit route, versioning, admin UI, site registry, chat widget) is untouched.

---

## Task 1: Rewrite `lib/site-themes.ts`

**Files:**
- Modify: `lib/site-themes.ts`

- [ ] **Step 1: Replace the ThemeDef interface**

Open `lib/site-themes.ts`. Replace the existing `ThemeDef` interface with:

```typescript
export interface ThemeDef {
  aesthetic: string;  // 1-sentence personality — tells Claude what kind of site this is
  palette: string;    // CSS custom property definitions for :root
  fonts: string;      // Google Fonts + heading/body spec in plain English
  hero: string;       // Hero section mood, layout, and key visual treatment
  rules: string[];    // 2-4 non-negotiable character traits for this theme
  dark: boolean;      // true = dark background site, affects text colour rules
}
```

Keep `NichePage`, `NICHE_PAGES`, `DEFAULT_PAGES`, `NICHE_THEME_DEFAULTS` exactly as they are — only `ThemeDef` and the `THEMES` object change.

- [ ] **Step 2: Rewrite the THEMES object**

Replace the entire `THEMES` constant with:

```typescript
export const THEMES: Record<string, ThemeDef> = {

  onyx: {
    dark: true,
    aesthetic: "Dark luxury. Black surfaces, gold accents, Playfair serif headings. Premium financial adviser or high-end consultancy feel.",
    palette: "--primary:#0a0a0a;--secondary:#c9a227;--accent:#d4a017;--bg:#0d0d0d;--surface:#181818;--text:#f5f0e8;--text-muted:#8a8075",
    fonts: "Playfair Display (400,700,italic) for headings — serif, editorial. Lato (300,400,700) for body. Heading: weight 700, -0.01em tracking. Body: weight 300.",
    hero: "Full-viewport dark hero (#0d0d0d), no photo. Centred layout. Playfair Display 80px headline with gold underline on key phrase. Two CTAs. Subtle dot-grid SVG pattern overlay at 4% opacity.",
    rules: [
      "ALL backgrounds: #0d0d0d or #181818 — zero white or light sections anywhere",
      "Gold (#c9a227) used only for accents, CTA buttons, and key underlines — never as large fills",
      "Cards: border-radius 0px, 1px solid rgba(201,162,39,0.18) border, gold glow box-shadow on hover",
    ],
  },

  coast: {
    dark: false,
    aesthetic: "Airy and clean. Sky blues, teal accents, generous white space. Modern allied health or wellness practice.",
    palette: "--primary:#0c4a6e;--secondary:#0d9488;--accent:#06b6d4;--bg:#f0f9ff;--surface:#ffffff;--text:#0c4a6e;--text-muted:#64748b",
    fonts: "Plus Jakarta Sans (300,400,500,600,700,800) for everything. Headings: weight 800, -0.03em tracking. Body: weight 400.",
    hero: "Split 50/50 layout. Left: sky-blue bg, left-aligned headline, two pill CTAs. Right: large rounded photo (border-radius:28px) with soft teal blob SVG shape behind it. Min-height:90vh.",
    rules: [
      "Border-radius: 16px standard, 28px large cards, 99px buttons — soft and approachable everywhere",
      "Service cards: white surface, teal icon in 48px circle, hover translateY(-6px) + teal shadow",
      "Alternating sections: #f0f9ff and #ffffff — gentle cool rhythm throughout",
    ],
  },

  edge: {
    dark: false,
    aesthetic: "Bold and asymmetric. White with indigo and deep grey. Oversized typography, hard edges. Tech or creative agency feel.",
    palette: "--primary:#111827;--secondary:#4f46e5;--accent:#7c3aed;--bg:#ffffff;--surface:#f9fafb;--text:#111827;--text-muted:#6b7280",
    fonts: "Space Grotesk (400,500,600,700) for headings. DM Sans (300,400,500) for body. Headings: weight 700, -0.04em tracking. Body: weight 400.",
    hero: "Asymmetric layout. Oversized 96px headline left-aligned, one word/phrase on indigo background-color rectangle (padding:0 8px). Hard-edged photo right (0px radius, 4px solid dark border, rotated 2deg). Full-viewport height.",
    rules: [
      "border-radius: 0px everywhere — no rounded corners at all, not even on buttons",
      "Cards: flat white, 2px solid #111827 border, hover: 2px solid indigo + thin indigo shadow",
      "Stats band: #111827 bg, white labels, indigo (#4f46e5) count-up numbers in 64px Space Grotesk",
    ],
  },

  grove: {
    dark: false,
    aesthetic: "Warm and organic. Cream tones, forest green, amber. Artisan hospitality or food business feel.",
    palette: "--primary:#1b4332;--secondary:#b45309;--accent:#d97706;--bg:#fdf8f2;--surface:#ffffff;--text:#1c1410;--text-muted:#78716c",
    fonts: "Fraunces (400,600,700,italic) for headings — a serif with warmth and personality. Libre Franklin (300,400,500,600) for body. Headings: weight 700, -0.02em tracking.",
    hero: "Full-bleed warm photo, 100vw x 90vh. Warm amber overlay (rgba 0.55). Centred italic Fraunces 72px headline in warm white (#fdf8f2). Thin decorative rules above and below headline. Amber pill CTA (#b45309 bg, white text, 99px radius).",
    rules: [
      "Sections alternate: #fdf8f2 (warm cream) and #ffffff — warm artisan rhythm",
      "Service cards: cream bg, 4px forest green top-border, Fraunces italic heading, no shadow",
      "Footer: deep forest green bg (#0f2419), cream text, amber accent links",
    ],
  },

  slate: {
    dark: false,
    aesthetic: "Conservative corporate trust. Navy, blue, clean whites. Finance, accounting, or professional services.",
    palette: "--primary:#0f172a;--secondary:#2563eb;--accent:#1d4ed8;--bg:#f8fafc;--surface:#ffffff;--text:#0f172a;--text-muted:#64748b",
    fonts: "Inter (300,400,500,600,700,800) for everything. Headings: weight 700, -0.025em tracking. Body: weight 400.",
    hero: "Full-width dark navy hero with subtle SVG dot-grid pattern (dots 1.5px, spacing 24px, 6% white opacity). Left-aligned content, blue-underlined key phrase. Right side on desktop: white card (8px radius, 32px padding) with a condensed contact form — not a photo.",
    rules: [
      "Border-radius: 8px standard, 12px large cards — conservative and precise",
      "Cards: white surface, 1.5px solid #e2e8f0 border, hover: 1.5px solid blue + blue glow shadow",
      "All section headings: left-aligned with a 3px x 36px blue rectangle accent before the text",
    ],
  },

  spark: {
    dark: false,
    aesthetic: "Vibrant and energetic. Purple to pink gradients, generous curves, SaaS-style friendliness. Retail or modern consumer brand.",
    palette: "--primary:#1e1b4b;--secondary:#7c3aed;--accent:#ec4899;--bg:#ffffff;--surface:#faf5ff;--text:#1e1b4b;--text-muted:#6b7280",
    fonts: "Montserrat (500,600,700,800,900) for headings. Open Sans (300,400,600) for body. Headings: weight 800, -0.03em tracking.",
    hero: "Centred layout on white. Large gradient blob shape (linear-gradient 135deg, rgba(124,58,237,0.12), rgba(236,72,153,0.08)), 800x600px, behind content. 72px Montserrat 900 headline, key phrase in gradient text (purple to pink). Gradient pill CTA. Row of social-proof badge chips below CTAs.",
    rules: [
      "Border-radius: 16px standard, 24px large cards, 99px buttons — everything rounded and friendly",
      "CTA band: gradient background linear-gradient(135deg, #7c3aed, #ec4899), white text",
      "Stats numbers: gradient text (purple to pink), 60px Montserrat 900",
    ],
  },

  craft: {
    dark: false,
    aesthetic: "Artisan boutique premium. Cream, terracotta, Cormorant serif. High-end restaurant, cafe, or handcrafted goods brand.",
    palette: "--primary:#1c1410;--secondary:#c2410c;--accent:#9a3412;--bg:#faf7f2;--surface:#ffffff;--text:#1c1410;--text-muted:#78716c",
    fonts: "Cormorant Garamond (400,600,italic) for headings — editorial serif. Nunito (300,400,600,700) for body. Headings: weight 600, 0.01em tracking.",
    hero: "Editorial split layout, min-height:95vh. Left half: warm cream bg, bottom-aligned italic Cormorant Garamond 88px headline, thin decorative rule above, terracotta pill CTA. Right half: full-height Unsplash photo bleeding to viewport edge. 4px terracotta vertical rule divides the halves.",
    rules: [
      "Border-radius: 6px standard, 10px large — restrained and premium, not overly rounded",
      "Cards: 1px solid rgba(28,20,16,0.1) border, terracotta 3px top-border appears on hover, cream bg",
      "Stats section: cream (#faf7f2) bg with large Cormorant numbers in terracotta — not a coloured band",
    ],
  },

  prestige: {
    dark: false,
    aesthetic: "Cinematic legal authority. Deep navy, forest teal, cold whites. Measured, trustworthy, and sophisticated.",
    palette: "--primary:#0D1D2B;--secondary:#006B5E;--accent:#2AA896;--bg:#F7FAFC;--surface:#FFFFFF;--text:#0D1D2B;--text-muted:#3D4946",
    fonts: "Inter (300,400,500,600,700,800) for everything. Headings: weight 700, -0.02em tracking. Body: 400, 1.75 line-height.",
    hero: "Full-bleed photo with deep navy overlay rgba(13,29,43,0.62). Top-left aligned content block. Small teal pill eyebrow label (1px solid teal border, teal text, 99px radius, 12px uppercase) above headline. Key phrase in aqua (#66D9C6). Two CTAs side by side — forest teal filled, ghost white.",
    rules: [
      "Every section heading preceded by a small pill eyebrow label (teal on light sections, aqua on dark sections)",
      "Section backgrounds alternate strictly: white and #F1F4F6 — never two identical in a row",
      "Stats band: deep navy bg (#0D1D2B), aqua numerals (#66D9C6), white uppercase labels",
    ],
  },

  apex: {
    dark: true,
    aesthetic: "Industrial bold. Dark navy, vivid orange, zero softness. Trades, construction, or automotive.",
    palette: "--primary:#0c1a30;--secondary:#f97316;--accent:#ea580c;--bg:#0c1a30;--surface:#162035;--text:#f1f5f9;--text-muted:#94a3b8",
    fonts: "Montserrat (600,700,800,900) for headings — always uppercase. Roboto (300,400,500) for body. Headings: weight 900, uppercase, -0.02em tracking.",
    hero: "Diagonal cut, full-viewport dark navy. Left 58%: text left-aligned, 80px uppercase Montserrat headline, orange on key word, 4px orange horizontal rule above headline. Right 42%: vivid orange diagonal shape clip-path polygon with industry photo inside.",
    rules: [
      "border-radius: 4px everywhere — industrial, not friendly",
      "Full dark site: all section backgrounds #0c1a30 or #162035 only — zero light sections",
      "Orange (#f97316) only for CTAs, accent lines, stat numbers — not large fills except the stats band",
    ],
  },

};
```

- [ ] **Step 3: Verify the file still exports correctly**

Check that `NICHE_THEME_DEFAULTS`, `NICHE_PAGES`, `DEFAULT_PAGES`, and `NichePage` are all still present and unchanged at the bottom of the file. The `ThemeDef` export is the interface defined in Step 1.

Do NOT run `npm run build` yet — the generate routes still reference the old field names and will fail TypeScript compilation until Tasks 2 and 3 are done.

---

## Task 2: Rewrite `app/api/site-factory/generate/route.ts`

**Files:**
- Modify: `app/api/site-factory/generate/route.ts`

- [ ] **Step 1: Replace SYSTEM_PROMPT**

Find the existing `const SYSTEM_PROMPT = ...` block (currently ~40 lines). Replace it entirely with:

```typescript
const SYSTEM_PROMPT = `You are an elite web designer who creates stunning, conversion-optimised websites for Australian small businesses. Your output rivals Lovable, Webflow, and Framer — not generic templates. Every site feels custom-designed and worth $5,000+.

HARD RULES:
- Output ONLY raw HTML starting with <!DOCTYPE html>. No markdown, no code fences.
- ALL CSS in one <style> tag. ALL JS in one <script> tag before </body>.
- No external CSS frameworks. Pure CSS Grid and Flexbox.
- Mobile-first. Breakpoints: 768px tablet, 1024px desktop.
- All images: loading="lazy", explicit width/height, real Unsplash photo IDs that genuinely match the business niche and theme aesthetic — not generic placeholder IDs.
- No em dashes (—). Use commas, colons, or rewrite.
- Sticky nav: transparent to opaque on scroll. Hamburger menu on mobile with working JS toggle.
- IntersectionObserver reveals (.reveal class). Count-up stats when in view using data-target attribute.
- Full SEO: JSON-LD LocalBusiness (most specific @type), Open Graph, Twitter Card, semantic HTML5.`;
```

- [ ] **Step 2: Replace the userPrompt construction**

Find the existing `const userPrompt = [...]` block (currently ~120 lines with `━━━` dividers). Replace it entirely with:

```typescript
const userPrompt = [
  `Build a complete production website. Write real, compelling copy — not Lorem Ipsum.`,
  ``,
  `BUSINESS: ${businessName} | NICHE: ${niche} | LOCATION: ${location}`,
  `PHONE: ${phone || "Contact us for a free quote"} | EMAIL: ${email || ""} | ADDRESS: ${address || location}`,
  `SERVICES: ${servicesList}`,
  description ? `\nCLIENT BRIEF:\n${description}` : "",
  ``,
  `THEME: ${themeKey}`,
  theme.aesthetic,
  `Palette: ${theme.palette}`,
  `Fonts: ${theme.fonts}`,
  `Hero: ${theme.hero}`,
  `Visual rules:`,
  ...theme.rules.map((r: string, i: number) => `${i + 1}. ${r}`),
  theme.dark ? `\nDARK SITE: all text must use --text or --text-muted. Zero dark text on dark backgrounds.` : "",
  ``,
  `SECTIONS (in this order):`,
  `Nav → Hero → Trust bar (4 signals with inline SVG icons) → Services (6 cards, CSS Grid 3/2/1 col) → Process (3 numbered steps) → Stats (4 count-up metrics, data-target attribute) → Testimonials (3 cards, Australian suburbs, 5 stars, specific quotes) → About (photo left + story right) → FAQ (6 questions, accordion with JS toggle) → CTA band → Contact (details left + form right, form POSTs to https://www.saabai.ai/api/site-factory/lead with {name,email,phone,message,siteSlug:"${slug}"}, show success/error state) → Footer`,
  ``,
  `Nav must include a working hamburger menu on mobile.`,
  `Pick Unsplash photo IDs that genuinely look like this business in this location.`,
].filter(Boolean).join("\n");
```

- [ ] **Step 3: Verify no remaining references to removed theme fields**

Search `generate/route.ts` for any remaining references to: `theme.fontImport`, `theme.headingCss`, `theme.bodyCss`, `theme.sections`. There should be none. The only theme fields now used are: `theme.aesthetic`, `theme.palette`, `theme.fonts`, `theme.hero`, `theme.rules`, `theme.dark`.

```bash
grep -n "fontImport\|headingCss\|bodyCss\|theme\.sections" app/api/site-factory/generate/route.ts
# Expected: no output
```

---

## Task 3: Rewrite `app/api/site-factory/generate-multi/route.ts`

**Files:**
- Modify: `app/api/site-factory/generate-multi/route.ts`

- [ ] **Step 1: Replace SYSTEM_PROMPT**

Find the existing `const SYSTEM_PROMPT = ...` at the top of the file. Replace it with the same prompt used in generate/route.ts:

```typescript
const SYSTEM_PROMPT = `You are an elite web designer who creates stunning, conversion-optimised websites for Australian small businesses. Your output rivals Lovable, Webflow, and Framer — not generic templates. Every site feels custom-designed and worth $5,000+.

HARD RULES:
- Output ONLY raw HTML starting with <!DOCTYPE html>. No markdown, no code fences.
- ALL CSS in one <style> tag. ALL JS in one <script> tag before </body>.
- No external CSS frameworks. Pure CSS Grid and Flexbox.
- Mobile-first. Breakpoints: 768px tablet, 1024px desktop.
- All images: loading="lazy", explicit width/height, real Unsplash photo IDs that genuinely match the business niche and theme aesthetic — not generic placeholder IDs.
- No em dashes (—). Use commas, colons, or rewrite.
- Sticky nav: transparent to opaque on scroll. Hamburger menu on mobile with working JS toggle.
- IntersectionObserver reveals (.reveal class). Count-up stats when in view using data-target attribute.
- Full SEO: JSON-LD LocalBusiness (most specific @type), Open Graph, Twitter Card, semantic HTML5.`;
```

- [ ] **Step 2: Replace the `sharedTokenLines` function**

Find the existing `function sharedTokenLines(...)` (currently ~18 lines using `theme.fontImport`, `theme.headingCss`, etc.). Replace it entirely with:

```typescript
function sharedTokenLines(theme: ThemeDef, themeKey: string): string[] {
  return [
    `THEME: ${themeKey}`,
    theme.aesthetic,
    `Palette: ${theme.palette}`,
    `Fonts: ${theme.fonts}`,
    `Hero style (home page only): ${theme.hero}`,
    `Visual rules:`,
    ...theme.rules.map((r, i) => `${i + 1}. ${r}`),
    theme.dark ? `DARK SITE: all text must use --text or --text-muted. Zero dark text on dark backgrounds.` : "",
  ].filter(Boolean);
}
```

- [ ] **Step 3: Verify no remaining references to removed theme fields**

```bash
grep -n "fontImport\|headingCss\|bodyCss\|theme\.sections" app/api/site-factory/generate-multi/route.ts
# Expected: no output
```

The `innerPageSections` function and `navSpec` function do not reference removed theme fields (`theme.dark` and `theme.palette` are kept) — leave them unchanged.

---

## Task 4: Build Check and Commit

**Files:** None modified — this is verification only.

- [ ] **Step 1: Run the build**

```bash
cd /Users/aiworkspace/saabai-site && npm run build
```

Expected: clean build with zero TypeScript errors. If you see errors referencing `fontImport`, `headingCss`, `bodyCss`, or `sections`, there is a remaining reference in one of the three files — go back and fix it.

- [ ] **Step 2: Commit all three files together**

```bash
git add lib/site-themes.ts app/api/site-factory/generate/route.ts app/api/site-factory/generate-multi/route.ts
git commit -m "refactor(site-factory): simplify prompts — creative briefs replace prescriptive rules

Replace 245-line over-specified prompt system with concise theme creative briefs.
ThemeDef removes fontImport/headingCss/bodyCss/sections, adds aesthetic/fonts fields.
All 9 themes rewritten. System + user prompt cut from 160 lines to ~40 lines total.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

- [ ] **Step 3: Push and verify Vercel deployment**

```bash
git push
```

Then confirm the Vercel build completes successfully:

```bash
vercel ls
# Latest deployment should show ● Ready within ~2 minutes
```

---

## Success Criteria Checklist

- [ ] `npm run build` passes with zero errors
- [ ] `grep -r "fontImport\|headingCss\|bodyCss" lib/ app/api/site-factory/` returns no output
- [ ] All 9 themes present in `THEMES` object: onyx, coast, edge, grove, slate, spark, craft, prestige, apex
- [ ] `NICHE_THEME_DEFAULTS` and `NICHE_PAGES` unchanged
- [ ] Vercel deployment: READY
