import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getPremiumModel } from "../../../../lib/chat-config";
import { createSite } from "../../../../lib/site-registry";
import { put } from "@vercel/blob";
import { buildChatWidget, getNicheColors } from "../../../../lib/chat-widget-template";
import { THEMES, NICHE_THEME_DEFAULTS } from "../../../../lib/site-themes";
import { snapshotVersion } from "../../../../lib/site-versions";

export const runtime = "nodejs";
export const maxDuration = 300;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

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
      style = "",
      description = "",
      chatbot: chatbotInput = {},
    } = body;

    if (!businessName) {
      return Response.json({ error: "Business name is required" }, { status: 400 });
    }

    const slug = slugify(businessName);
    const siteUrl = `https://www.saabai.ai/sites/${slug}/`;

    // Resolve theme — explicit choice wins, then niche default
    const themeKey = (style && THEMES[style]) ? style : (NICHE_THEME_DEFAULTS[niche] ?? "slate");
    const theme = THEMES[themeKey];

    const SYSTEM_PROMPT = `You are an elite web designer who creates stunning, conversion-optimised Australian small business websites. Each site you produce is structurally and visually unique — you have been given an explicit named design theme with exact rules you must follow precisely.

ABSOLUTE RULES:
- Output ONLY raw HTML. No markdown, no explanations, no code fences, no preamble.
- Begin immediately with <!DOCTYPE html> and end with </html>.
- NEVER use em dashes (—). Use commas, colons, or rewrite the sentence.
- ALL CSS in one <style> tag in <head>. Use CSS custom properties for the full design system.
- ALL JavaScript in one <script> tag immediately before </body>.
- Zero external CSS frameworks. Pure handcrafted CSS using Grid and Flexbox.
- Fully responsive: mobile-first. Breakpoints: 768px tablet, 1024px desktop.
- The THEME RULES below are hard constraints, not suggestions. Every structural, layout, and styling rule must be followed exactly. Do not fall back to a generic template.`;

    const servicesList = services.length
      ? services.join(", ")
      : "choose 6 highly relevant services for this specific business niche";

    const userPrompt = [
      `Build a complete production website for this Australian business. Write real, compelling copy -- not Lorem Ipsum.`,
      ``,
      `BUSINESS: ${businessName}`,
      `NICHE: ${niche}`,
      `LOCATION: ${location}`,
      `PHONE: ${phone || "Contact us for a free quote"}`,
      `EMAIL: ${email || ""}`,
      `ADDRESS: ${address || location}`,
      `SERVICES: ${servicesList}`,
      description ? `\nCLIENT BRIEF (follow carefully):\n${description}\n` : "",
      ``,
      `━━━ DESIGN THEME: ${themeKey.toUpperCase()} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `COLOUR PALETTE -- define exactly at :root:`,
      theme.palette,
      `Also define: --shadow:0 4px 24px rgba(0,0,0,.08); --shadow-lg:0 16px 48px rgba(0,0,0,.16); --transition:0.2s ease;`,
      `Spacing: --s1=4px; --s2=8px; --s3=12px; --s4=16px; --s6=24px; --s8=32px; --s10=40px; --s12=48px; --s16=64px;`,
      ``,
      `TYPOGRAPHY:`,
      theme.fontImport,
      `Headings (h1-h4): ${theme.headingCss}`,
      `Body: ${theme.bodyCss} font-size:16px; line-height:1.75;`,
      `Type scale: 12px caption, 14px small, 16px body, 20px lead, 24px h4, 32px h3, 44px h2, 60px h1, 80px hero.`,
      theme.dark ? "DARK THEME: all text must use --text or --text-muted. Zero dark text on dark backgrounds." : "",
      ``,
      `━━━ HERO SECTION (implement exactly as described) ━━━━━━━━━━━━━━━`,
      ``,
      theme.hero,
      ``,
      `Address the customer's #1 pain point for ${niche}. Add .reveal CSS class to all main text elements.`,
      ``,
      `━━━ SECTION ORDER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `Build sections in this exact order:`,
      theme.sections,
      ``,
      `━━━ THEME STRUCTURAL RULES (all mandatory) ━━━━━━━━━━━━━━━━`,
      ``,
      ...theme.rules.map((r: string, i: number) => `${i + 1}. ${r}`),
      ``,
      `━━━ INTERACTION & ANIMATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `- Sticky nav: becomes opaque with box-shadow when scrollY > 60.`,
      `- IntersectionObserver: .reveal elements animate from opacity:0 + translateY(24px) to visible.`,
      `- Stats: count-up from 0 over 1.8s when in view using data-target attribute on the number element.`,
      `- Buttons: hover scale(1.02) + shadow-lg + colour shift, 0.2s ease. Focus-visible ring.`,
      `- Card hover: translateY(-4px) or per theme rules above.`,
      `- Inputs: border-colour transition on focus, focus ring in --secondary.`,
      ``,
      `━━━ IMAGES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `- Use real Unsplash URLs: https://images.unsplash.com/photo-XXXXXXXX?w=1200&q=80`,
      `- Pick photo IDs that genuinely match the business niche and the visual feel of this theme.`,
      `- All images: loading="lazy", explicit width/height.`,
      ``,
      `━━━ SEO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `- JSON-LD -- most specific @type (LegalService, MedicalBusiness, HomeAndConstructionBusiness, etc.).`,
      `- Schema: name, description, url, telephone, email, address (full AU), geo, openingHoursSpecification, priceRange, areaServed, image, sameAs:[].`,
      `- FAQPage schema if FAQ section present.`,
      `- <meta name="robots" content="index, follow">.`,
      `- Full Open Graph + Twitter Card. og:image = hero photo URL.`,
      `- Semantic HTML5: header, main, section, article, footer, nav, address.`,
      ``,
      `━━━ SECTION CONTENT SPECS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `NAV: Logo text left (${businessName}). Nav links centre (hamburger on mobile). CTA button right. Transparent to opaque on scroll.`,
      `TRUST BAR: 4 trust signals with inline SVG icons. Adapt to ${niche}.`,
      `SERVICES: 6 cards, CSS Grid 3-col/2-col/1-col. SVG icon + name + 2-line benefit. .reveal.`,
      `PROCESS: 3 numbered steps. Horizontal desktop, vertical mobile.`,
      `STATS: 4 count-up metrics. data-target="NUMBER" on each stat.`,
      `TESTIMONIALS: 3 cards -- 5 stars, 3-4 sentence quote, first name + last initial, Australian suburb.`,
      `ABOUT: Photo + story (2 paragraphs + 4 bullets). .reveal.`,
      `FAQ: 6 questions in <details><summary>. JS toggles +/- icon.`,
      `CTA BAND: Full-width, themed background, bold headline, one button.`,
      `CONTACT: Two columns -- contact details left, form right. POSTs to https://www.saabai.ai/api/site-factory/lead with {name,email,phone,message,siteSlug:"${slug}"}.`,
      `FOOTER: 3 columns -- brand+social, links, contact. Copyright ${new Date().getFullYear()} ${businessName}. Privacy + Terms links (href="#").`,
    ].filter(Boolean).join("\n");

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
          snapshotVersion(slug, html, "Generated").catch(() => {});

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
