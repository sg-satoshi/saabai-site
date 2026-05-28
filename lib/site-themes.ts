// Shared theme definitions used by both single-page and multi-page generation routes.

export interface ThemeDef {
  aesthetic: string;
  palette: string;
  fonts: string;
  googleFonts: string; // exact @import URL — injected verbatim into <style>
  hero: string;
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

  onyx: {
    dark: true,
    aesthetic: "Dark luxury. Black surfaces, gold accents, Playfair serif headings. Premium financial adviser or high-end consultancy feel.",
    palette: "--primary:#0a0a0a;--secondary:#c9a227;--accent:#d4a017;--bg:#0d0d0d;--surface:#181818;--text:#f5f0e8;--text-muted:#8a8075",
    fonts: "Playfair Display (400,700,italic) for headings — serif, editorial. Lato (300,400,700) for body. Heading: weight 700, -0.01em tracking. Body: weight 300.",
    googleFonts: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&display=swap",
    hero: "Full-viewport dark hero (background: #0d0d0d), no photo. Centred layout, min-height:100vh, display:flex align-items:center. Playfair Display 80px headline in var(--text), one key phrase with gold underline (text-decoration underline, color var(--accent)). Two CTAs side by side. No image required.",
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
    googleFonts: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap",
    hero: "CSS Grid two-column (50/50), min-height:90vh. Left column: sky-blue background (var(--bg)), padding 80px, display flex column justify-center. Headline left-aligned (weight 800, 64px). Supporting copy. Two pill CTAs. Right column: Unsplash photo with object-fit:cover, width:100%, height:100%, border-radius:0 28px 28px 0. Teal accent square behind the image (position:absolute, var(--secondary), opacity 0.15, offset -12px -12px).",
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
    googleFonts: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500&display=swap",
    hero: "CSS Grid two-column (60/40), full-viewport height, align-items:center. Left: white bg, oversized 90px Space Grotesk headline left-aligned, one key word wrapped in a span with indigo background-color (#4f46e5) and white color (padding:2px 10px). Body copy. One bold indigo CTA. Right: Unsplash photo in a container with 2px solid var(--primary) border, 0 border-radius, overflow:hidden, height:500px.",
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
    googleFonts: "https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Libre+Franklin:wght@300;400;500;600&display=swap",
    hero: "Full-viewport hero (min-height:90vh, position:relative). Background: Unsplash photo as CSS background-image with background-size:cover background-position:center, fallback background-color:#1b4332. Amber-tinted overlay (position:absolute, inset:0, background:rgba(120,60,0,0.55)). Centred content (position:relative, z-index:2, text-align:center). Italic Fraunces 72px headline in #fdf8f2. Thin horizontal rules (border-top:1px solid rgba(253,248,242,0.4), width:80px, margin:0 auto) above and below headline. Amber pill CTA (background:#b45309, color:white, border-radius:99px).",
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
    googleFonts: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
    hero: "Full-width dark navy hero (background:var(--primary)), min-height:90vh, display:flex align-items:center. CSS Grid two-column (55/45) on desktop. Left: left-aligned white headline (Inter 700 60px), key phrase with blue underline (text-decoration:underline solid var(--secondary)). Subtext in var(--text-muted)/white-70. Two CTAs. Right: white card (background:#fff, border-radius:8px, padding:36px, box-shadow) containing a short enquiry form (name, phone, message, submit). No image needed.",
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
    googleFonts: "https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800;900&family=Open+Sans:wght@300;400;600&display=swap",
    hero: "Centred layout on white, min-height:90vh, display:flex flex-direction:column align-items:center justify-content:center. Background: a large soft radial gradient element (::before pseudo, background:radial-gradient(ellipse at center, rgba(124,58,237,0.1) 0%, rgba(236,72,153,0.05) 60%, transparent 80%), width:900px height:700px, position:absolute). 72px Montserrat weight 900 headline, key phrase using background: linear-gradient(135deg,#7c3aed,#ec4899) with -webkit-background-clip:text and -webkit-text-fill-color:transparent. Gradient pill CTA (background:linear-gradient(135deg,#7c3aed,#ec4899), border:none). Row of 3–4 social-proof chips below CTAs.",
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
    googleFonts: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Nunito:wght@300;400;600;700&display=swap",
    hero: "CSS Grid two-column (50/50), min-height:90vh. Left column: background:var(--bg), display:flex flex-direction:column justify-content:center, padding:80px 60px. Italic Cormorant Garamond 80px headline in var(--text). Thin horizontal rule (border-top:1px solid rgba(28,20,16,0.2), width:60px, margin-bottom:24px) above headline. Body copy in Nunito. Terracotta pill CTA (background:var(--secondary), color:white, border-radius:6px, no large radius). Right column: overflow:hidden. Unsplash photo with object-fit:cover, width:100%, height:100%. The dividing element between columns: a 3px wide terracotta border-right on the left column.",
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
    googleFonts: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
    hero: "Full-viewport hero (min-height:90vh, position:relative). Background: Unsplash photo as background-image, background-size:cover, background-position:center, fallback background-color:#0D1D2B. Overlay: position:absolute, inset:0, background:rgba(13,29,43,0.65). Content: position:relative, z-index:2, max-width:680px, padding-top:160px, padding-left:8vw. Small teal eyebrow pill (border:1px solid #2AA896, color:#2AA896, padding:6px 16px, border-radius:99px, font-size:12px, letter-spacing:0.1em, text-transform:uppercase) above headline. Inter 700 58px headline in white, one key phrase in aqua (#66D9C6). Subtext. Two CTAs side by side.",
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
    googleFonts: "https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Roboto:wght@300;400;500&display=swap",
    hero: "CSS Grid two-column (55/45), full-viewport height (min-height:100vh). Both columns dark navy (var(--bg)). Left column: display:flex flex-direction:column justify-content:center, padding:80px 60px. Orange horizontal rule above headline (width:60px, height:4px, background:var(--secondary), margin-bottom:20px). 80px Montserrat 900 uppercase headline in var(--text), one key word in var(--secondary). Subtext in var(--text-muted). Two CTAs. Right column: Unsplash industry photo with object-fit:cover, width:100%, height:100%, overflow:hidden. A 4px orange border-left on the right column.",
    rules: [
      "border-radius: 4px everywhere — industrial, not friendly",
      "Full dark site: all section backgrounds #0c1a30 or #162035 only — zero light sections",
      "Orange (#f97316) only for CTAs, accent lines, stat numbers — not large fills except the stats band",
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
