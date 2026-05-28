import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getPremiumModel } from "../../../../lib/chat-config";
import { createSite } from "../../../../lib/site-registry";
import { put, list } from "@vercel/blob";
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
      confirmDuplicate = false,
    } = body;

    if (!businessName) {
      return Response.json({ error: "Business name is required" }, { status: 400 });
    }

    let slug = slugify(businessName);

    const { blobs: existing } = await list({ prefix: `sites/${slug}/index.html` });
    if (existing.length > 0) {
      if (!confirmDuplicate) {
        return Response.json(
          { error: `A site already exists for "${businessName}". Please confirm you want to create another site for this business.`, code: "DUPLICATE_SITE" },
          { status: 409 }
        );
      }
      let counter = 2;
      while (counter <= 20) {
        const candidate = `${slug}-${counter}`;
        const { blobs: check } = await list({ prefix: `sites/${candidate}/index.html` });
        if (check.length === 0) { slug = candidate; break; }
        counter++;
      }
    }

    const siteUrl = `https://www.saabai.ai/sites/${slug}/`;

    // Resolve theme — explicit choice wins, then niche default
    const themeKey = (style && THEMES[style]) ? style : (NICHE_THEME_DEFAULTS[niche] ?? "slate");
    const theme = THEMES[themeKey];

    const SYSTEM_PROMPT = `You are an elite web designer building production websites for Australian small businesses. Your designs rival Webflow and Framer — visually stunning, conversion-ready, worth $5,000+.

OUTPUT: Raw HTML only. Start with <!DOCTYPE html>. Never use markdown or code fences.

CSS: One <style> tag in <head>. First line must be the @import font line provided. Second block must be the :root { } with provided CSS variables — copy them exactly. Use var(--name) for every color — never hardcode hex values that duplicate a CSS variable.

CRITICAL CSS RESET at top of <style> (after the @import and :root):
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
img { display: block; max-width: 100%; }

JS: One <script> before </body>. Must include: smooth scroll, sticky nav (transparent → solid on scroll with background-color transition), hamburger menu toggle, FAQ accordion (click to open/close), count-up stats triggered by IntersectionObserver (data-target attribute on the number element).

IMAGES: Unsplash URL format: https://images.unsplash.com/photo-{ID}?w=1200&q=80&auto=format&fit=crop
Every <img> must have: loading="lazy" width height alt onerror="this.onerror=null;this.style.display='none'"
Every image container must have: overflow:hidden and a background-color fallback (use a CSS variable color).
Image containers for hero/about: position:relative so the fallback background shows if image fails.

MOBILE-FIRST: Write base styles for mobile (375px), then @media(min-width:768px) and @media(min-width:1024px).
NAV: overflow:hidden on the nav container. Logo text must not overflow. CTA button: white-space:nowrap.

COPY: Write specific, persuasive Australian business copy. Real suburb names. Concrete benefits. No Lorem Ipsum. No em dashes (—).

SEO: JSON-LD LocalBusiness with most specific @type. Open Graph. Twitter Card. Semantic HTML5 landmarks.`;

    const servicesList = services.length
      ? services.join(", ")
      : "choose 6 highly relevant services for this specific business niche";

    // Format palette as CSS-ready lines
    const cssVars = theme.palette.split(";").filter(Boolean).map(v => {
      const colon = v.indexOf(":");
      return `  ${v.slice(0, colon).trim()}: ${v.slice(colon + 1).trim()};`;
    }).join("\n");

    const userPrompt = [
      `Build a complete, production-ready single-page website. Write real, compelling copy specific to this business.`,
      ``,
      `BUSINESS: ${businessName}`,
      `NICHE: ${niche}`,
      `LOCATION: ${location}`,
      `PHONE: ${phone || "Contact us for a free quote"}`,
      email ? `EMAIL: ${email}` : ``,
      `ADDRESS: ${address || location}`,
      `SERVICES: ${servicesList}`,
      description ? `\nCLIENT BRIEF (follow carefully):\n${description}\n` : "",
      ``,
      `━━━ THEME: ${themeKey} ━━━`,
      `Aesthetic: ${theme.aesthetic}`,
      theme.dark ? `DARK SITE: all section backgrounds must be var(--bg) or var(--surface) — zero light-coloured sections. All body text: var(--text). All secondary text: var(--text-muted).` : ``,
      ``,
      `GOOGLE FONTS — first line of <style>, copy exactly:`,
      `@import url('${theme.googleFonts}');`,
      ``,
      `CSS VARIABLES — paste into :root { } exactly:`,
      cssVars,
      ``,
      `TYPOGRAPHY: ${theme.fonts}`,
      ``,
      `VISUAL RULES:`,
      ...theme.rules.map((r: string, i: number) => `${i + 1}. ${r}`),
      ``,
      `━━━ SECTIONS (build in this order) ━━━`,
      ``,
      `NAV: Sticky (position:sticky, top:0, z-index:100). Logo text left. Links center. Theme-accent CTA button right (white-space:nowrap). Transparent on page-top, solid var(--surface) on scroll. Hamburger menu on mobile (display:none on desktop, flex on mobile). Nav must not overflow horizontally.`,
      ``,
      `HERO (id="hero"): ${theme.hero}`,
      ``,
      `TRUST BAR (id="trust"): 4 trust signals. Each: inline SVG icon (24px) + bold label + short descriptor. Subtle horizontal padding, alternating background.`,
      ``,
      `SERVICES (id="services"): Section heading. 6 cards in CSS Grid. grid-template-columns: repeat(3,1fr) on desktop, repeat(2,1fr) on tablet, 1fr on mobile. Each card: inline SVG icon in a 56px circle, service name (h3), 2-sentence benefit-led description.`,
      ``,
      `PROCESS (id="process"): 3 numbered steps showing how the business works. Large step number, step name, description.`,
      ``,
      `STATS (id="stats"): 4 metrics. Each: large number (span with data-target and class="count-up"), label below. IntersectionObserver triggers count animation.`,
      ``,
      `TESTIMONIALS (id="testimonials"): 3 cards. Each: 5-star SVG, 2-sentence quote (specific outcome, not vague), client name, Australian suburb. Cards in a CSS Grid 3-col desktop, 1-col mobile.`,
      ``,
      `ABOUT (id="about"): 2-column (50/50) on desktop, stacked on mobile. Left: Unsplash photo (object-fit:cover, width:100%, height:400px, overflow:hidden). Right: 3 paragraphs of real business narrative. Not generic. Mention the team, the location, the philosophy.`,
      ``,
      `FAQ (id="faq"): 6 industry-relevant questions. JS accordion: clicking a question toggles answer visibility with smooth max-height transition.`,
      ``,
      `CTA BAND: Bold headline. Single CTA button. Use theme's accent/secondary colors.`,
      ``,
      `CONTACT (id="contact"): 2-column desktop. Left: business phone, email, address, opening hours. Right: contact form — name, email, phone, message textarea, submit button. Form posts via JS fetch to https://www.saabai.ai/api/site-factory/lead with JSON body {name,email,phone,message,siteSlug:"${slug}"}. Show success message on submit, error message on failure.`,
      ``,
      `FOOTER: 4-column grid (logo+tagline, navigation links, services list, contact info). Bottom strip: copyright. All links functional (anchor scroll on this page).`,
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
