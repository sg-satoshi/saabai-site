// Shared theme definitions used by both single-page and multi-page generation routes.

export interface ThemeDef {
  palette: string;
  fontImport: string;
  headingCss: string;
  bodyCss: string;
  hero: string;
  sections: string;
  rules: string[];
  dark: boolean;
}

export interface NichePage {
  slug: string;
  label: string;
}

// Pages generated per niche in multi-page mode
export const NICHE_PAGES: Record<string, NichePage[]> = {
  "legal": [
    { slug: "home", label: "Home" },
    { slug: "about", label: "About" },
    { slug: "practice-areas", label: "Practice Areas" },
    { slug: "contact", label: "Contact" },
  ],
  "allied-health": [
    { slug: "home", label: "Home" },
    { slug: "about", label: "About" },
    { slug: "services", label: "Services" },
    { slug: "contact", label: "Contact" },
  ],
  "professional-services": [
    { slug: "home", label: "Home" },
    { slug: "about", label: "About" },
    { slug: "services", label: "Services" },
    { slug: "contact", label: "Contact" },
  ],
  "hospitality": [
    { slug: "home", label: "Home" },
    { slug: "about", label: "About" },
    { slug: "menu", label: "Menu" },
    { slug: "contact", label: "Contact" },
  ],
  "finance": [
    { slug: "home", label: "Home" },
    { slug: "about", label: "About" },
    { slug: "services", label: "Services" },
    { slug: "contact", label: "Contact" },
  ],
};

export const DEFAULT_PAGES: NichePage[] = [
  { slug: "home", label: "Home" },
  { slug: "about", label: "About" },
  { slug: "services", label: "Services" },
  { slug: "contact", label: "Contact" },
];

export const THEMES: Record<string, ThemeDef> = {

  // ── 1. ONYX — Dark luxury, gold accents, serif headings ──────────────────
  onyx: {
    dark: true,
    palette: "--primary:#0a0a0a;--secondary:#c9a227;--accent:#d4a017;--bg:#0d0d0d;--surface:#181818;--text:#f5f0e8;--text-muted:#8a8075",
    fontImport: `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Lato:wght@300;400;700&display=swap');`,
    headingCss: "font-family:'Playfair Display',serif; font-weight:700; letter-spacing:-0.01em;",
    bodyCss: "font-family:'Lato',sans-serif; font-weight:300;",
    hero: "Full-viewport dark hero (#0d0d0d background). NO photo. Centred layout. Headline 80px desktop / 40px mobile in Playfair Display — key 2-3 words wrapped in a <span> with a thin 2px solid gold (#c9a227) underline drawn via border-bottom. Subheading in --text-muted 20px Lato. Two CTAs side by side: primary filled gold, secondary ghost (1px gold border, transparent bg). A subtle repeating dot-grid SVG pattern at 4% opacity as a background-image overlay. A small framed Unsplash photo (max 440px wide, 2px solid rgba(201,162,39,0.25) border, no border-radius) floats to the RIGHT on desktop via absolute positioning, hidden on mobile.",
    sections: "NAV (transparent → opaque dark on scroll, gold CTA) → HERO → SERVICES → ABOUT (photo right, text left) → STATS (gold bg, black text — inverted) → TESTIMONIALS → PROCESS → FAQ → CTA BAND → CONTACT → FOOTER",
    rules: [
      "ALL section backgrounds must be #0d0d0d or #181818 — zero white sections anywhere",
      "Gold (#c9a227) is used ONLY for accents, key headings, CTA buttons, and thin decorative lines — never as a large fill except the stats band",
      "Cards: border-radius 0px. Border: 1px solid rgba(201,162,39,0.18). Hover: border-color rgba(201,162,39,0.55) + subtle gold glow box-shadow",
      "Section headings: Playfair Display italic, centred, followed by a 40px-wide 1px gold horizontal rule centred beneath",
      "Stats band: background #c9a227, text #0a0a0a (fully inverted from rest of site)",
      "Nav logo: Playfair Display italic in gold. Links in Lato, letter-spacing 0.08em uppercase 11px",
    ],
  },

  // ── 2. COAST — Airy, clean, ocean-inspired ───────────────────────────────
  coast: {
    dark: false,
    palette: "--primary:#0c4a6e;--secondary:#0d9488;--accent:#06b6d4;--bg:#f0f9ff;--surface:#ffffff;--text:#0c4a6e;--text-muted:#64748b",
    fontImport: `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');`,
    headingCss: "font-family:'Plus Jakarta Sans',sans-serif; font-weight:800; letter-spacing:-0.03em;",
    bodyCss: "font-family:'Plus Jakarta Sans',sans-serif; font-weight:400;",
    hero: "SPLIT LAYOUT — 50/50 desktop grid. LEFT side: sky-blue (#f0f9ff) background, left-aligned headline (64px desktop, 36px mobile), 20px subtext, two pill-shaped CTAs stacked on mobile / side-by-side on desktop. RIGHT side: a large rounded rectangle Unsplash photo (border-radius:28px, box-shadow:0 24px 64px rgba(13,148,136,0.2)) with a soft teal blob SVG shape (opacity 0.12, teal fill, border-radius 62% 38% 55% 45%) behind it. Entire hero min-height:90vh, vertically centred.",
    sections: "NAV (white bg, teal CTA pill) → HERO → TRUST BAR (teal icon circles) → SERVICES → PROCESS → ABOUT → TESTIMONIALS → STATS → CTA BAND → CONTACT → FOOTER",
    rules: [
      "Border-radius: 16px standard, 28px large cards, 99px buttons/pills",
      "Service cards: white surface, 16px radius, teal icon in a 48px circle (teal-10% bg), hover translateY(-6px) + teal box-shadow",
      "Alternating sections: --bg (#f0f9ff) and #ffffff — gentle rhythm, no harsh contrast",
      "A subtle wave SVG divider (fill:#f0f9ff or #ffffff) separates 2-3 key section transitions",
      "Stats band: teal (#0d9488) background with white text and white count-up numbers",
      "Trust bar: icons in teal circles, text in --primary — no dark backgrounds",
    ],
  },

  // ── 3. EDGE — Bold, asymmetric, oversized typography ─────────────────────
  edge: {
    dark: false,
    palette: "--primary:#111827;--secondary:#4f46e5;--accent:#7c3aed;--bg:#ffffff;--surface:#f9fafb;--text:#111827;--text-muted:#6b7280",
    fontImport: `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap');`,
    headingCss: "font-family:'Space Grotesk',sans-serif; font-weight:700; letter-spacing:-0.04em;",
    bodyCss: "font-family:'DM Sans',sans-serif; font-weight:400;",
    hero: "ASYMMETRIC full-viewport hero. White background. OVERSIZED headline: 96px desktop / 44px mobile Space Grotesk, hard left-aligned, one word or phrase on its own line highlighted with a vivid indigo (#4f46e5) background-color rectangle (use CSS highlight trick: display:inline; background:#4f46e5; color:#fff; padding:0 8px; box-decoration-break:clone). Below headline: 18px DM Sans italic subtext in --text-muted. Then two CTAs: primary indigo filled (0px radius), secondary plain text with arrow →. RIGHT of headline on desktop: a Unsplash photo inside a hard-edged frame (0px radius, 4px solid #111827 border) rotated 2deg, overlapping a large decorative section number '01' in 280px Space Grotesk at 6% opacity behind it.",
    sections: "NAV (white, indigo CTA, 0px radius) → HERO → STATS (black band, indigo numbers) → SERVICES → TESTIMONIALS → PROCESS → ABOUT → CTA BAND → CONTACT → FOOTER",
    rules: [
      "Border-radius: 0px everywhere — no rounded corners at all, not even on buttons",
      "Section headings: Space Grotesk 700, hard left-aligned, a large decorative section number (02, 03...) in 140px at 5% opacity behind/above the heading",
      "Cards: flat white, 2px solid #111827 border, hover: 2px solid #4f46e5 + thin indigo box-shadow",
      "Stats band: #111827 full-width, white labels, indigo (#4f46e5) count-up numbers in 64px Space Grotesk",
      "Every section heading has a vivid 4px indigo left-border accent on a short 32px-wide bar above it",
      "Testimonials: simple left-aligned quote mark (200px, 5% opacity) behind each card — editorial style",
    ],
  },

  // ── 4. GROVE — Warm, organic, artisan ────────────────────────────────────
  grove: {
    dark: false,
    palette: "--primary:#1b4332;--secondary:#b45309;--accent:#d97706;--bg:#fdf8f2;--surface:#ffffff;--text:#1c1410;--text-muted:#78716c",
    fontImport: `@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Libre+Franklin:wght@300;400;500;600&display=swap');`,
    headingCss: "font-family:'Fraunces',serif; font-weight:700; letter-spacing:-0.02em;",
    bodyCss: "font-family:'Libre Franklin',sans-serif; font-weight:400;",
    hero: "FULL-BLEED warm photo hero. A high-quality Unsplash photo fills 100vw × 90vh. Warm amber overlay gradient (linear-gradient from rgba(28,20,16,0.55) to rgba(28,20,16,0.2)). Centred content overlay: italic Fraunces headline 72px desktop / 38px mobile in warm white (#fdf8f2), a thin decorative horizontal line above and below the headline (80px wide, 1px, rgba(253,248,242,0.45)), then 18px Libre Franklin body text, then an amber-coloured pill CTA (background:#b45309, white text, 99px radius) + ghost CTA. A small hand-drawn-style SVG leaf or botanical motif (simple, 3-4 paths, stroke:#fdf8f2, opacity:0.35) floats bottom-left of hero.",
    sections: "NAV (transparent on hero, cream bg after scroll, forest green logo) → HERO → ABOUT (story-first — two columns, photo left, warm story text right) → SERVICES → PROCESS → TESTIMONIALS → STATS → CTA BAND → CONTACT → FOOTER",
    rules: [
      "Border-radius: 20px standard, 32px large cards/panels, 99px pills",
      "Sections alternate between #fdf8f2 (warm cream) and #ffffff — soft, warm rhythm",
      "Decorative elements: thin SVG horizontal rules with small diamond/leaf in centre between sections",
      "Service cards: warm cream bg (#fdf8f2), forest green top-border accent (4px), Fraunces italic heading, no shadow — minimal and artisan",
      "Stats band: forest green (#1b4332) bg, amber number colour, cream text — warm and organic",
      "Footer: deep forest green bg (#0f2419), cream text, amber accent links",
    ],
  },

  // ── 5. SLATE — Conservative corporate trust ───────────────────────────────
  slate: {
    dark: false,
    palette: "--primary:#0f172a;--secondary:#2563eb;--accent:#1d4ed8;--bg:#f8fafc;--surface:#ffffff;--text:#0f172a;--text-muted:#64748b",
    fontImport: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');`,
    headingCss: "font-family:'Inter',sans-serif; font-weight:700; letter-spacing:-0.025em;",
    bodyCss: "font-family:'Inter',sans-serif; font-weight:400;",
    hero: "GEOMETRIC PATTERN HERO. Full-width, min-height:85vh. Background: --primary (#0f172a) with a subtle SVG dot-grid pattern (dots 1.5px, spacing 24px, rgba(255,255,255,0.06)) as background-image. LEFT-ALIGNED content (max-width 640px, left padding 10%). Headline 68px Inter 800, white, key word/phrase underlined with a 4px solid blue (#2563eb) underline (border-bottom trick). 18px Inter 300 subtext in rgba(255,255,255,0.7). Two CTAs: primary blue filled (8px radius), secondary white ghost (8px radius, 1px white border). RIGHT side on desktop: a clean white card (16px radius, padding 32px) containing a condensed contact form or a key metric grid — not a photo.",
    sections: "NAV (navy bg, blue CTA) → HERO → TRUST BAR → STATS (immediately after trust bar, on white) → SERVICES → ABOUT → TESTIMONIALS → PROCESS → FAQ → CTA BAND → CONTACT → FOOTER",
    rules: [
      "Border-radius: 8px standard, 12px large cards, 8px buttons — conservative and precise",
      "Cards: white surface, 1.5px solid #e2e8f0 border, no shadow at rest, hover: 1.5px solid #2563eb + blue glow box-shadow",
      "Service icon container: square 44px, background:#eff6ff (blue tint), blue icon",
      "Sections: alternating #f8fafc and #ffffff — cool grey/white, professional and clean",
      "Stats placed in section 3 (not at end) — corporate sites lead with proof, then services",
      "All section headings: Inter 700 left-aligned with a 3px × 36px blue rectangle before the heading text",
    ],
  },

  // ── 6. SPARK — Vibrant gradient, modern SaaS energy ──────────────────────
  spark: {
    dark: false,
    palette: "--primary:#1e1b4b;--secondary:#7c3aed;--accent:#ec4899;--bg:#ffffff;--surface:#faf5ff;--text:#1e1b4b;--text-muted:#6b7280",
    fontImport: `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800;900&family=Open+Sans:wght@300;400;600&display=swap');`,
    headingCss: "font-family:'Montserrat',sans-serif; font-weight:800; letter-spacing:-0.03em;",
    bodyCss: "font-family:'Open Sans',sans-serif; font-weight:400;",
    hero: "GRADIENT HERO. Full-viewport white background. Centred layout. A large gradient blob (linear-gradient 135deg, rgba(124,58,237,0.12), rgba(236,72,153,0.08)) as an absolutely positioned background shape (border-radius:62% 38% 46% 54%, size 800×600px, centred, no overflow). Headline 72px Montserrat 900, centred, dark --primary. Key phrase wrapped in a <span> with gradient text (background:linear-gradient(90deg,#7c3aed,#ec4899); -webkit-background-clip:text; -webkit-text-fill-color:transparent). 20px Open Sans subtext centred. Gradient CTA button (background:linear-gradient(90deg,#7c3aed,#ec4899), white text, 99px radius, bold). Secondary ghost CTA (99px radius). Below CTAs: a row of 3-4 social-proof badges (e.g. '★ 4.9 on Google', '500+ clients') in small pill chips.",
    sections: "NAV (white, gradient CTA pill) → HERO → TRUST BAR (gradient icon badges) → SERVICES → STATS → TESTIMONIALS → ABOUT → CTA BAND (gradient background) → CONTACT → FOOTER",
    rules: [
      "Border-radius: 16px standard, 24px large cards, 99px buttons — everything rounded and friendly",
      "Use gradient accents throughout: gradient borders (border:2px solid transparent; background-clip:padding-box + gradient background trick), gradient icons, gradient underlines",
      "Service cards: white bg, 2px gradient border on hover, purple icon circle, soft shadow",
      "CTA band: gradient background (linear-gradient 135deg, #7c3aed, #ec4899), white text",
      "Stats numbers: gradient text (purple to pink), large 60px Montserrat 900",
      "Section headings: centred, small gradient pill chip above heading (e.g. 'OUR SERVICES' in gradient bg chip), then the large heading below",
    ],
  },

  // ── 7. CRAFT — Artisan boutique, warm and premium ────────────────────────
  craft: {
    dark: false,
    palette: "--primary:#1c1410;--secondary:#c2410c;--accent:#9a3412;--bg:#faf7f2;--surface:#ffffff;--text:#1c1410;--text-muted:#78716c",
    fontImport: `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Nunito:wght@300;400;600;700&display=swap');`,
    headingCss: "font-family:'Cormorant Garamond',serif; font-weight:600; letter-spacing:0.01em;",
    bodyCss: "font-family:'Nunito',sans-serif; font-weight:400;",
    hero: "EDITORIAL SPLIT HERO. Min-height:95vh. LEFT half: warm off-white (#faf7f2) background, bottom-aligned content (padding-bottom:80px). Large Cormorant Garamond italic headline 88px desktop / 40px mobile in --primary. Thin decorative rule (80px, 1px, --secondary) above the headline. Two-sentence tagline in Nunito 18px --text-muted. Terracotta brick CTA button (background:#c2410c, white text, 6px radius) + ghost link-style CTA. RIGHT half: a full-height Unsplash photo (object-fit:cover, height:100%) — no border-radius, bleeds to viewport edge. A thin 4px terracotta vertical rule divides the two halves.",
    sections: "NAV (cream bg, terracotta logo, minimal) → HERO → ABOUT (story and founder, warm narrative) → SERVICES → TESTIMONIALS → PROCESS → STATS → CTA BAND → CONTACT → FOOTER",
    rules: [
      "Border-radius: 6px standard, 10px large — restrained, premium, not overly rounded",
      "Warm tones throughout: cream (#faf7f2) and white surfaces only, terracotta as the accent colour",
      "Cards: 1px solid rgba(28,20,16,0.1) border, hover: terracotta top-border appears (3px solid #c2410c), cream bg",
      "Cormorant Garamond italic used for all section headings — creates distinct editorial feel",
      "Stats band: cream (#faf7f2) bg — NOT a coloured band. Large Cormorant numbers in terracotta, Nunito labels below",
      "Thin horizontal rules (1px solid rgba(28,20,16,0.12)) with small diamond SVG centred within them as section dividers",
    ],
  },

  // ── 8. PRESTIGE — Cinematic legal, deep navy + forest teal ───────────────
  prestige: {
    dark: false,
    palette: "--primary:#0D1D2B;--secondary:#006B5E;--accent:#2AA896;--bg:#F7FAFC;--surface:#FFFFFF;--text:#0D1D2B;--text-muted:#3D4946;--mint:#84F6E2;--aqua:#66D9C6;--frost:#F1F4F6",
    fontImport: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');`,
    headingCss: "font-family:'Inter',sans-serif; font-weight:700; letter-spacing:-0.02em;",
    bodyCss: "font-family:'Inter',sans-serif; font-weight:400;",
    hero: "CINEMATIC PHOTO HERO. Full-width, min-height:90vh. Background: a high-quality Unsplash photo of a professional law office or legal environment, with a Deep Navy color overlay (background:linear-gradient(rgba(13,29,43,0.62),rgba(13,29,43,0.62)) over the image). Top-left aligned content block (padding-left:10%, padding-top:14%, max-width:700px). Eyebrow pill: 1px solid #66D9C6 border, #66D9C6 text, Inter 700, 12px, 0.05em letter-spacing, uppercase, pill shape (99px border-radius), padding:4px 14px. Large bold white headline: Inter 800, 64px desktop / 36px mobile, -0.02em letter-spacing, line-height:1.15. Key phrase or second line in #66D9C6 (Mid Aqua). Below headline: three horizontal inline items — each: a teal filled circle check icon (SVG, 18px, background:#006B5E fill) + white text in Inter 400 16px — trust signals like 'Specialist legal expertise', 'Fixed-fee engagements', 'Same-day response'. Two CTA buttons side by side (gap:16px): primary Forest Teal (#006B5E) filled, white text, Inter 700, 8px radius; secondary ghost (1px solid white border, white text, 8px radius).",
    sections: "NAV (white bg, 1px border-bottom, subtle shadow, Forest Teal pill CTA) → HERO (full-bleed photo, navy overlay) → TRUST BAR (white bg, 4-col, teal icon circles, Frost Gray dividers) → SERVICES (Frost Gray #F1F4F6 bg) → PROCESS (white bg, 3 numbered steps) → STATS (Deep Navy band, Mid Aqua numerals) → TESTIMONIALS (white bg) → ABOUT (Frost Gray bg, 2-col) → CTA BAND (Forest Teal #006B5E bg) → CONTACT (Frost Gray bg) → FAQ (white bg, accordion) → FOOTER (Deep Navy #0D1D2B)",
    rules: [
      "MANDATORY: every section heading must be immediately preceded by a pill eyebrow label — pill shape (border-radius:99px), 1px solid #006B5E border, #006B5E uppercase text, Inter 700, 12px, 0.05em letter-spacing, padding:4px 14px. On dark bands use #66D9C6 (Mid Aqua) instead. NO section heading appears alone without its eyebrow pill.",
      "Icon containers: 48px circle (width:48px;height:48px;border-radius:50%), background:#84F6E2 (Soft Mint), #006B5E (Forest Teal) SVG icon. Used on all light-background sections. On dark bands: use Soft Mint icon on transparent circle.",
      "Cards: white background, 12px radius, shadow:0 2px 12px rgba(0,0,0,0.06). Hover: translateY(-4px) transition. NO hard borders on light backgrounds — shadow provides elevation only.",
      "Section colour alternation (strict): white → Frost Gray (#F1F4F6) → white → Frost Gray. Never two identical section backgrounds in a row.",
      "Stats band: Deep Navy (#0D1D2B) full-width background. Mid Aqua (#66D9C6) count-up numerals in Inter 800, 56px. White uppercase labels in Inter 500, 13px letter-spacing:0.08em beneath each number.",
      "CTA band: Forest Teal (#006B5E) full-width background. White headline Inter 700, 36px. Soft Mint (#84F6E2) subtext. CTA band buttons use pill shape (border-radius:99px), not 8px radius.",
      "Button radius by context: content-section buttons use border-radius:8px. CTA band and nav CTA button use border-radius:99px (pill). Hover: Forest Teal → Bright Teal (#2AA896) transition.",
      "Footer: Deep Navy (#0D1D2B) background, 4-column grid. Soft Mint (#84F6E2) contact icons. Mist Gray (#BCC9C5) body text and links. Teal logo accent.",
    ],
  },

  // ── 9. APEX — Industrial bold, dark navy + vivid orange ──────────────────
  apex: {
    dark: true,
    palette: "--primary:#0c1a30;--secondary:#f97316;--accent:#ea580c;--bg:#0c1a30;--surface:#162035;--text:#f1f5f9;--text-muted:#94a3b8",
    fontImport: `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Roboto:wght@300;400;500&display=swap');`,
    headingCss: "font-family:'Montserrat',sans-serif; font-weight:900; letter-spacing:-0.02em; text-transform:uppercase;",
    bodyCss: "font-family:'Roboto',sans-serif; font-weight:400;",
    hero: "DIAGONAL CUT HERO. Full-viewport. Background: --bg (#0c1a30). Layout: LEFT 58% contains all text content (left-aligned, padding-left:8%). RIGHT 42% has a vivid orange diagonal shape (clip-path:polygon(15% 0, 100% 0, 100% 100%, 0% 100%) in --secondary colour #f97316) with a Unsplash industry photo inside it (mix-blend-mode:multiply or luminosity on the photo). Headline: 80px Montserrat 900 UPPERCASE white, key word in --secondary orange. Subheading: 18px Roboto 300 in --text-muted. Orange filled CTA button (4px radius) + white ghost CTA (4px radius, 1px white border). A bold horizontal orange line (4px, 64px wide) above the headline.",
    sections: "NAV (dark navy, orange CTA, uppercase logo) → HERO → TRUST BAR (dark surface cards) → SERVICES → STATS (orange band) → PROCESS → TESTIMONIALS → CTA BAND → CONTACT → FOOTER",
    rules: [
      "Border-radius: 4px everywhere — industrial, not friendly",
      "ALL section backgrounds: --bg (#0c1a30) or --surface (#162035) — this is a full dark site",
      "Orange (#f97316) used for: CTA buttons, accent lines, stat numbers, icon fills, hover states",
      "Service cards: --surface bg, 4px radius, 3px solid left-border in #f97316, no shadow, hover: bg lighten slightly",
      "Stats band: #f97316 orange background, --primary (#0c1a30) text — fully inverted",
      "All text must be white or --text-muted (#94a3b8) — no dark text on dark backgrounds",
    ],
  },
};

export const NICHE_THEME_DEFAULTS: Record<string, string> = {
  "trades": "apex",
  "allied-health": "coast",
  "professional-services": "onyx",
  "legal": "prestige",
  "finance": "slate",
  "retail": "spark",
  "hospitality": "craft",
  "beauty": "coast",
  "automotive": "apex",
  "technology": "edge",
  "other": "slate",
};
