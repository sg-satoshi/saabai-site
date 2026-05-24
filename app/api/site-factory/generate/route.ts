import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getPremiumModel } from "../../../../lib/chat-config";
import { createSite } from "../../../../lib/site-registry";
import { put } from "@vercel/blob";
import { buildChatWidget, getNicheColors } from "../../../../lib/chat-widget-template";

export const runtime = "nodejs";
export const maxDuration = 300;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Deterministic pick from array based on business name hash
function pickByName(name: string, count: number): number {
  let h = 0;
  for (const c of name) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h) % count;
}

// ── COLOUR PALETTES ──────────────────────────────────────────────────────────
// Multiple per niche so different businesses in the same industry look unique.
// Format: CSS custom-property declarations fed into the :root block.
const NICHE_PALETTES: Record<string, string[]> = {
  trades: [
    "--primary:#1a2744;--secondary:#f97316;--accent:#fbbf24;--bg:#0f172a;--surface:#1e293b;--text:#f1f5f9;--text-muted:#94a3b8",
    "--primary:#111827;--secondary:#ef4444;--accent:#dc2626;--bg:#f9fafb;--surface:#ffffff;--text:#111827;--text-muted:#6b7280",
    "--primary:#1c1917;--secondary:#f59e0b;--accent:#d97706;--bg:#fafaf9;--surface:#ffffff;--text:#1c1917;--text-muted:#78716c",
    "--primary:#0c1a30;--secondary:#22c55e;--accent:#16a34a;--bg:#f0fdf4;--surface:#ffffff;--text:#052e16;--text-muted:#4b7a5a",
  ],
  "allied-health": [
    "--primary:#1e4d3b;--secondary:#4a90d9;--accent:#34d399;--bg:#f0fdf4;--surface:#ffffff;--text:#1a2e25;--text-muted:#6b7280",
    "--primary:#164e63;--secondary:#06b6d4;--accent:#0891b2;--bg:#f0f9ff;--surface:#ffffff;--text:#0c4a6e;--text-muted:#64748b",
    "--primary:#312e81;--secondary:#818cf8;--accent:#6366f1;--bg:#eef2ff;--surface:#ffffff;--text:#1e1b4b;--text-muted:#6b7280",
    "--primary:#4a044e;--secondary:#c026d3;--accent:#9333ea;--bg:#fdf4ff;--surface:#ffffff;--text:#3b0764;--text-muted:#6b7280",
  ],
  "professional-services": [
    "--primary:#1e293b;--secondary:#d4a017;--accent:#f59e0b;--bg:#f8fafc;--surface:#ffffff;--text:#0f172a;--text-muted:#64748b",
    "--primary:#0a0a0a;--secondary:#c9b06b;--accent:#b8972f;--bg:#fafaf9;--surface:#ffffff;--text:#0a0a0a;--text-muted:#737373",
    "--primary:#1a1523;--secondary:#a78bfa;--accent:#7c3aed;--bg:#faf5ff;--surface:#ffffff;--text:#1a1523;--text-muted:#6b7280",
    "--primary:#172554;--secondary:#3b82f6;--accent:#1d4ed8;--bg:#eff6ff;--surface:#ffffff;--text:#172554;--text-muted:#64748b",
  ],
  retail: [
    "--primary:#4c1d95;--secondary:#ec4899;--accent:#f43f5e;--bg:#faf5ff;--surface:#ffffff;--text:#1e1b4b;--text-muted:#6b7280",
    "--primary:#0f172a;--secondary:#f97316;--accent:#ea580c;--bg:#fff7ed;--surface:#ffffff;--text:#0f172a;--text-muted:#6b7280",
    "--primary:#1a1a2e;--secondary:#e94560;--accent:#c0392b;--bg:#f9fafb;--surface:#ffffff;--text:#1a1a2e;--text-muted:#6b7280",
    "--primary:#134e4a;--secondary:#2dd4bf;--accent:#0d9488;--bg:#f0fdfa;--surface:#ffffff;--text:#134e4a;--text-muted:#5f9ea0",
  ],
  hospitality: [
    "--primary:#1b4332;--secondary:#d97706;--accent:#fbbf24;--bg:#faf7f2;--surface:#ffffff;--text:#1a2e1e;--text-muted:#6b7280",
    "--primary:#1c1410;--secondary:#e07b39;--accent:#c2541a;--bg:#fffbf5;--surface:#ffffff;--text:#1c1410;--text-muted:#92400e",
    "--primary:#0f0f23;--secondary:#f5c518;--accent:#e2a900;--bg:#0f0f23;--surface:#1a1a38;--text:#f1f5f9;--text-muted:#94a3b8",
    "--primary:#3b1f0a;--secondary:#b45309;--accent:#92400e;--bg:#fef3c7;--surface:#ffffff;--text:#3b1f0a;--text-muted:#78350f",
  ],
  beauty: [
    "--primary:#1c0f2e;--secondary:#d946ef;--accent:#a21caf;--bg:#fdf4ff;--surface:#ffffff;--text:#1c0f2e;--text-muted:#6b7280",
    "--primary:#1a0a0a;--secondary:#f43f5e;--accent:#e11d48;--bg:#fff1f2;--surface:#ffffff;--text:#1a0a0a;--text-muted:#6b7280",
    "--primary:#2d1b69;--secondary:#f9a8d4;--accent:#ec4899;--bg:#fdf2f8;--surface:#ffffff;--text:#2d1b69;--text-muted:#6b7280",
  ],
  automotive: [
    "--primary:#0a0a0a;--secondary:#dc2626;--accent:#b91c1c;--bg:#f9fafb;--surface:#ffffff;--text:#0a0a0a;--text-muted:#6b7280",
    "--primary:#172554;--secondary:#f97316;--accent:#ea580c;--bg:#eff6ff;--surface:#ffffff;--text:#172554;--text-muted:#64748b",
    "--primary:#0c1a30;--secondary:#64748b;--accent:#475569;--bg:#0c1a30;--surface:#1e293b;--text:#f1f5f9;--text-muted:#94a3b8",
  ],
  technology: [
    "--primary:#0f172a;--secondary:#0d9488;--accent:#06b6d4;--bg:#f9fafb;--surface:#ffffff;--text:#0f172a;--text-muted:#6b7280",
    "--primary:#020617;--secondary:#6366f1;--accent:#4f46e5;--bg:#020617;--surface:#0f172a;--text:#f1f5f9;--text-muted:#94a3b8",
    "--primary:#0a0a0a;--secondary:#22d3ee;--accent:#06b6d4;--bg:#fafafa;--surface:#ffffff;--text:#0a0a0a;--text-muted:#737373",
  ],
  other: [
    "--primary:#0f172a;--secondary:#0d9488;--accent:#06b6d4;--bg:#f9fafb;--surface:#ffffff;--text:#111827;--text-muted:#6b7280",
    "--primary:#1e293b;--secondary:#8b5cf6;--accent:#7c3aed;--bg:#f5f3ff;--surface:#ffffff;--text:#1e293b;--text-muted:#64748b",
    "--primary:#18181b;--secondary:#f59e0b;--accent:#d97706;--bg:#fffbeb;--surface:#ffffff;--text:#18181b;--text-muted:#71717a",
  ],
};

// ── FONT PAIRINGS ─────────────────────────────────────────────────────────────
// Heading font + body font. Each creates a distinct visual personality.
const FONT_PAIRS = [
  {
    import: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');`,
    heading: "Inter", body: "Inter",
    headingCss: "font-family:'Inter',sans-serif; font-weight:700; letter-spacing:-0.03em;",
    bodyCss: "font-family:'Inter',sans-serif;",
    feel: "modern/tech",
  },
  {
    import: `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@300;400;700&display=swap');`,
    heading: "Playfair Display", body: "Lato",
    headingCss: "font-family:'Playfair Display',serif; font-weight:700; letter-spacing:-0.01em;",
    bodyCss: "font-family:'Lato',sans-serif;",
    feel: "elegant/luxury",
  },
  {
    import: `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&family=Open+Sans:wght@300;400;600&display=swap');`,
    heading: "Montserrat", body: "Open Sans",
    headingCss: "font-family:'Montserrat',sans-serif; font-weight:800; letter-spacing:-0.02em; text-transform:uppercase;",
    bodyCss: "font-family:'Open Sans',sans-serif;",
    feel: "bold/energetic",
  },
  {
    import: `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@300;400;500&display=swap');`,
    heading: "Space Grotesk", body: "DM Sans",
    headingCss: "font-family:'Space Grotesk',sans-serif; font-weight:700; letter-spacing:-0.025em;",
    bodyCss: "font-family:'DM Sans',sans-serif;",
    feel: "contemporary/startup",
  },
  {
    import: `@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=Libre+Franklin:wght@300;400;500;600&display=swap');`,
    heading: "Fraunces", body: "Libre Franklin",
    headingCss: "font-family:'Fraunces',serif; font-weight:700; letter-spacing:-0.01em; font-style:italic;",
    bodyCss: "font-family:'Libre Franklin',sans-serif;",
    feel: "editorial/distinguished",
  },
  {
    import: `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`,
    heading: "Plus Jakarta Sans", body: "Plus Jakarta Sans",
    headingCss: "font-family:'Plus Jakarta Sans',sans-serif; font-weight:800; letter-spacing:-0.03em;",
    bodyCss: "font-family:'Plus Jakarta Sans',sans-serif; font-weight:400;",
    feel: "clean/professional",
  },
];

// ── DESIGN STYLE SYSTEMS ──────────────────────────────────────────────────────
// Controls border-radius, card treatment, hero style, section rhythm.
const DESIGN_STYLES = {
  modern: {
    radius: "12px", radiusLg: "20px", radiusFull: "99px",
    btnStyle: "rounded corners, solid fill, subtle hover lift",
    cardStyle: "white card with soft shadow (0 4px 24px rgba(0,0,0,.08)), hover lifts 4px",
    heroStyle: "full-viewport Unsplash photo with dark gradient overlay, text centered with generous padding",
    sectionRhythm: "alternating white and very-light-grey section backgrounds",
    colourUse: "primary for nav/footer, secondary as accent on CTAs and icons",
  },
  bold: {
    radius: "4px", radiusLg: "8px", radiusFull: "4px",
    btnStyle: "sharp corners, bold filled, uppercase label, strong hover darken",
    cardStyle: "flat cards with 3px solid left-border in --secondary, no shadow",
    heroStyle: "split layout: left 55% bold headline + CTAs on --primary bg, right 45% Unsplash photo (clip-path diagonal cut)",
    sectionRhythm: "bold colored bands alternating with white; use --primary bg for alternate sections with light text",
    colourUse: "heavy use of --primary as full-section backgrounds, --secondary for highlights",
  },
  elegant: {
    radius: "2px", radiusLg: "4px", radiusFull: "2px",
    btnStyle: "no border-radius, thin 1px border, uppercase spaced label, hover fills",
    cardStyle: "minimal: 1px border only, generous internal padding, hover adds subtle background tint",
    heroStyle: "minimal hero: centered text on white/very-light background, large elegant headline, single thin horizontal rule decoration, no full-bleed photo",
    sectionRhythm: "all white/cream backgrounds, generous whitespace between sections, thin dividers",
    colourUse: "restraint — use colour only on accent elements, icons, and one CTA; rest is black/grey",
  },
  friendly: {
    radius: "16px", radiusLg: "28px", radiusFull: "99px",
    btnStyle: "pill shape (99px radius), soft filled, friendly hover bounce animation",
    cardStyle: "rounded cards with pastel --secondary tinted background, no border, light shadow",
    heroStyle: "organic hero: floating card or device mockup to the right, headline left-aligned, large friendly emoji or icon decorations",
    sectionRhythm: "soft pastel background tints per section, rounded section corners",
    colourUse: "warm and inviting, coloured section backgrounds, icons with coloured circle backgrounds",
  },
  corporate: {
    radius: "6px", radiusLg: "10px", radiusFull: "6px",
    btnStyle: "standard rounded, solid primary, professional hover state",
    cardStyle: "outlined cards (1.5px border), icon in square --secondary bg box, hover fills card subtly",
    heroStyle: "geometric hero: --primary dark background with subtle grid/dot pattern SVG, large white headline, brand accent underline on key phrase",
    sectionRhythm: "white sections with thin top/bottom borders as separators; stats band in --primary",
    colourUse: "structured: primary for authority, secondary for actions only, muted greys for supporting text",
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessName,
      niche = "other",
      location = "Australia",
      services = [],
      phone = "",
      email = "",
      address = "",
      style = "modern",
      description = "",
      chatbot: chatbotInput = {},
    } = body;

    if (!businessName) {
      return Response.json({ error: "Business name is required" }, { status: 400 });
    }

    const slug = slugify(businessName);
    const siteUrl = `https://www.saabai.ai/sites/${slug}/`;

    // Pick palette, font pair and design style deterministically from business name
    const palettes = NICHE_PALETTES[niche] ?? NICHE_PALETTES.other;
    const palette = palettes[pickByName(businessName, palettes.length)];
    const font = FONT_PAIRS[pickByName(businessName + niche, FONT_PAIRS.length)];
    const designStyle = DESIGN_STYLES[style as keyof typeof DESIGN_STYLES] ?? DESIGN_STYLES.modern;

    // Detect if palette is dark-mode based on --bg value
    const isDark = palette.includes("--bg:#0") || palette.includes("--bg:#1");

    const SYSTEM_PROMPT = `You are an elite web designer who creates stunning, conversion-optimised Australian small business websites. Each site you produce feels completely custom — no two look alike. You draw on diverse design movements: Swiss minimalism, bold editorial, luxury restraint, friendly organic, dark-tech, warm artisan. Your output rivals Lovable, Webflow and Framer at $5,000+ quality.

ABSOLUTE RULES:
- Output ONLY raw HTML. No markdown, no explanations, no code fences, no preamble.
- Begin immediately with <!DOCTYPE html> and end with </html>.
- NEVER use em dashes (—). Use commas, colons, or rewrite the sentence.
- ALL CSS in one <style> tag in <head>. Use CSS custom properties for the full design system.
- ALL JavaScript in one <script> tag immediately before </body>.
- Zero external CSS frameworks. Pure handcrafted CSS using Grid and Flexbox.
- Fully responsive: mobile-first. Breakpoints: 768px tablet, 1024px desktop.
- You have been given a DESIGN PERSONALITY below — honour it faithfully. The design personality determines border-radii, card treatment, hero layout, section rhythm, and colour usage. Do not default to a generic modern template.`;

    const servicesList = services.length
      ? services.join(", ")
      : "choose 6 highly relevant services for this specific business niche";

    const userPrompt = `Build a complete production website for this Australian business. Write real, compelling copy — not Lorem Ipsum.

BUSINESS: ${businessName}
NICHE: ${niche}
LOCATION: ${location}
PHONE: ${phone || "Contact us for a free quote"}
EMAIL: ${email || ""}
ADDRESS: ${address || location}
SERVICES: ${servicesList}
${description ? `\nCLIENT BRIEF (follow carefully):\n${description}\n` : ""}

━━━ DESIGN SYSTEM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COLOUR PALETTE (define at :root):
${palette}
Also define: --shadow:0 4px 24px rgba(0,0,0,.08); --shadow-lg:0 16px 48px rgba(0,0,0,.16); --transition:0.2s ease;
Spacing scale --s1 through --s16 (4px per step: --s1=4px, --s2=8px, --s4=16px, --s6=24px, --s8=32px, --s10=40px, --s12=48px, --s16=64px).

TYPOGRAPHY:
${font.import}
Headings: ${font.headingCss}
Body: ${font.bodyCss} 16px/1.7.
Type scale: 12px caption, 14px small, 16px body, 20px lead, 24px h4, 32px h3, 40px h2, 56px h1, 72px hero.

DESIGN PERSONALITY: ${style.toUpperCase()} — honour every detail below:
- Border radius: ${designStyle.radius} (standard), ${designStyle.radiusLg} (large cards/panels), ${designStyle.radiusFull} (buttons/pills)
- Button style: ${designStyle.btnStyle}
- Card treatment: ${designStyle.cardStyle}
- Hero layout: ${designStyle.heroStyle}
- Section rhythm: ${designStyle.sectionRhythm}
- Colour usage: ${designStyle.colourUse}
${isDark ? "- This is a DARK-THEME site. Ensure all text is light and readable on dark backgrounds." : ""}

INTERACTION QUALITY:
- Buttons: hover scale(1.02) + shadow-lg + subtle colour shift, 0.2s ease. Focus-visible ring.
- Cards: hover translateY(-4px) + shadow-lg (or per card style above).
- Inputs: border-colour transition on focus, custom focus ring in --secondary.

ANIMATIONS:
- Sticky nav: becomes opaque with box-shadow when scrollY > 60.
- IntersectionObserver: .reveal elements animate from opacity:0 + translateY(24px) to visible on enter.
- Stats: count-up from 0 over 1.8s when in view.

IMAGES:
- Use real Unsplash URLs: https://images.unsplash.com/photo-XXXXXXXX?w=1200&q=80
- Pick photo IDs that genuinely match the business niche and feel.
- All images: loading="lazy", explicit width/height.

SEO:
- JSON-LD schema in <head> — use the most specific @type for the niche (e.g. LegalService, MedicalBusiness, HomeAndConstructionBusiness, etc.), NOT just LocalBusiness.
- Schema must include: name, description, url, telephone, email, address (with streetAddress, addressLocality, addressRegion, postalCode, addressCountry), geo (latitude/longitude for the suburb), openingHoursSpecification, priceRange, areaServed, image (logo URL), sameAs (empty array — placeholder for GMB/social).
- If a FAQ section is generated, ALSO add a FAQPage schema block: {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Q?","acceptedAnswer":{"@type":"Answer","text":"A."}},...]}
- Add <meta name="robots" content="index, follow"> to <head>.
- Complete Open Graph + Twitter Card meta tags. og:image must use the hero Unsplash URL.
- Semantic HTML5: header, main, section, article, footer, nav, address.

━━━ SECTIONS (adapt styling to the design personality above) ━━━━━

1. STICKY NAV — Logo text left (${businessName}). Nav links centre. CTA button right ("Get Free Quote" or equivalent). Transparent start, opaque on scroll.

2. HERO — ${designStyle.heroStyle}. Headline: 72px desktop / 36px mobile. Address the customer's #1 pain point for ${niche}. Two CTAs: primary + secondary. Add .reveal class to text elements.

3. TRUST BAR — 4 trust signals with inline SVG icons. Examples: licensed/insured, Google rating, jobs completed, response time. Adapt icons and labels to suit ${niche}.

4. SERVICES — Section heading + lead text. CSS Grid: 3 cols desktop, 2 tablet, 1 mobile. 6 service cards styled per the design personality card treatment. Each card: SVG icon, service name, 2-line benefit. .reveal on cards.

5. PROCESS — "How It Works". 3 numbered steps. Horizontal desktop, vertical mobile. Step numbers in --secondary.

6. STATS — 4 animated count-up metrics in a full-width band. Background: --primary. Large number + label.

7. TESTIMONIALS — 3 cards. 5 gold stars, specific result quote (3-4 sentences), first name + last initial, Australian suburb, job type. Make quotes feel authentic.

8. ABOUT — Two columns: Unsplash photo left, story text right. 2 paragraphs + 4 differentiating bullet points. .reveal.

9. CTA BAND — Full-width, bg --secondary, bold white headline, 1 sentence, one large white button.

10. CONTACT — Two columns: left has large clickable phone, email, address, condensed hours (Mon-Fri / weekends); right has a contact form (Name, Email, Phone, Message) with floating-label CSS inputs. Form POSTs JSON to https://www.saabai.ai/api/site-factory/lead with {name,email,phone,message,siteSlug:"${slug}"}, shows success/error state inline.

11. FOOTER — Dark bg (--primary). 3 columns: brand + tagline + LinkedIn + email social icons; Quick Links; Contact details. Bottom bar: copyright ${new Date().getFullYear()} ${businessName} + Privacy Policy + Terms of Use links (href="#").`;

    const stream = streamText({
      model: getPremiumModel(),
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const { textStream } = stream;
    const encoder = new TextEncoder();
    let fullText = "";

    const readable = new ReadableStream({
      async start(controller) {
        const reader = textStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += value;
          try { controller.enqueue(encoder.encode(value)); } catch { /* client disconnected */ }
        }

        try {
          let html = fullText
            .trim()
            .replace(/^```html\n?/i, "")
            .replace(/^```\n?/, "")
            .replace(/```\s*$/i, "")
            .trim();
          if (!html.toLowerCase().startsWith("<!doctype")) {
            html = `<!DOCTYPE html>\n${html}`;
          }

          // Build chatbot config
          const botName = chatbotInput.name || businessName;
          const botGreeting = chatbotInput.greeting || `Hi! I'm ${botName}. How can I help you today?`;
          const botSystemPrompt = chatbotInput.systemPrompt || [
            `You are ${botName}, a friendly assistant for ${businessName}, a ${niche} business in ${location}.`,
            chatbotInput.personality ? `Personality: ${chatbotInput.personality}` : "Be warm, professional, and concise.",
            phone ? `Phone: ${phone}` : "",
            email ? `Email: ${email}` : "",
            address ? `Address: ${address}` : "",
            services.length ? `Services: ${services.join(", ")}` : "",
            description ? `About: ${description}` : "",
            "Answer questions about the business and its services. Keep responses under 120 words.",
          ].filter(Boolean).join("\n");

          // Inject chat widget
          html = html.replace(/<script id="sf-chat-widget">[\s\S]*?<\/script>/i, "");
          const colors = getNicheColors(niche);
          const widget = buildChatWidget({
            slug,
            botName,
            greeting: botGreeting,
            ...colors,
            placeholder: `Ask about ${businessName}…`,
          });
          html = html.includes("</body>")
            ? html.replace("</body>", `${widget}\n</body>`)
            : html + `\n${widget}`;

          await put(`sites/${slug}/index.html`, html, {
            access: "public",
            contentType: "text/html",
            addRandomSuffix: false,
            allowOverwrite: true,
          });

          await createSite({
            slug,
            name: businessName,
            niche,
            description,
            status: "live",
            url: siteUrl,
            business: { name: businessName, tagline: "", phone, email, address },
            chatbot: {
              enabled: true,
              name: botName,
              greeting: botGreeting,
              systemPrompt: botSystemPrompt,
            },
          });
        } catch (e) {
          console.error("Site factory save error:", e);
        }

        try { controller.close(); } catch { /* already closed */ }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Site-Slug": slug,
        "X-Site-Url": siteUrl,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Site generation error:", error);
    return Response.json(
      { error: "Failed to generate site", detail: String(error) },
      { status: 500 }
    );
  }
}
