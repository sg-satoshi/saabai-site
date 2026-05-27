import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getPremiumModel } from "../../../../lib/chat-config";
import { createSite } from "../../../../lib/site-registry";
import { put } from "@vercel/blob";
import { buildChatWidget, getNicheColors } from "../../../../lib/chat-widget-template";
import { THEMES, NICHE_THEME_DEFAULTS, ThemeDef, NichePage, DEFAULT_PAGES } from "../../../../lib/site-themes";
import { snapshotVersion } from "../../../../lib/site-versions";

export const runtime = "nodejs";
export const maxDuration = 300;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const SYSTEM_PROMPT = `You are an elite web designer who creates stunning, conversion-optimised Australian small business websites. Each site you produce is structurally and visually unique — you have been given an explicit named design theme with exact rules you must follow precisely.

ABSOLUTE RULES:
- Output ONLY raw HTML. No markdown, no explanations, no code fences, no preamble.
- Begin immediately with <!DOCTYPE html> and end with </html>.
- NEVER use em dashes (—). Use commas, colons, or rewrite the sentence.
- ALL CSS in one <style> tag in <head>. Use CSS custom properties for the full design system.
- ALL JavaScript in one <script> tag immediately before </body>.
- Zero external CSS frameworks. Pure handcrafted CSS using Grid and Flexbox.
- Fully responsive: mobile-first. Breakpoints: 768px tablet, 1024px desktop.
- The THEME RULES below are hard constraints. Every structural, layout, and styling rule must be followed exactly.`;

function sharedTokenLines(theme: ThemeDef, themeKey: string): string[] {
  return [
    `━━━ DESIGN THEME: ${themeKey.toUpperCase()} ━━━`,
    `COLOUR PALETTE — define exactly at :root:`,
    theme.palette,
    `Also define: --shadow:0 4px 24px rgba(0,0,0,.08); --shadow-lg:0 16px 48px rgba(0,0,0,.16); --transition:0.2s ease;`,
    `Spacing: --s1=4px; --s2=8px; --s3=12px; --s4=16px; --s6=24px; --s8=32px; --s10=40px; --s12=48px; --s16=64px;`,
    `TYPOGRAPHY:`,
    theme.fontImport,
    `Headings (h1-h4): ${theme.headingCss}`,
    `Body: ${theme.bodyCss} font-size:16px; line-height:1.75;`,
    `Type scale: 12px caption, 14px small, 16px body, 20px lead, 24px h4, 32px h3, 44px h2, 60px h1, 80px hero.`,
    theme.dark ? "DARK THEME: all text must use --text or --text-muted. Zero dark text on dark backgrounds." : "",
    `━━━ THEME STRUCTURAL RULES (all mandatory) ━━━`,
    ...theme.rules.map((r, i) => `${i + 1}. ${r}`),
    `━━━ IMAGES ━━━`,
    `Use real Unsplash URLs: https://images.unsplash.com/photo-XXXXXXXX?w=1200&q=80. All images: loading="lazy", explicit width/height.`,
    `━━━ INTERACTIONS ━━━`,
    `Sticky nav: opaque+shadow on scroll. IntersectionObserver .reveal elements (opacity:0 + translateY(24px) → visible). Button hover: scale(1.02). Stats: count-up from 0 over 1.8s using data-target.`,
  ].filter(Boolean);
}

function navSpec(slug: string, allPages: NichePage[], activePage: string): string {
  const links = allPages.map(p => {
    const href = p.slug === "home" ? `/sites/${slug}/` : `/sites/${slug}/${p.slug}`;
    const active = p.slug === activePage;
    return `${p.label} (href="${href}"${active ? " — ACTIVE: accent color + bold + underline" : ""})`;
  }).join(" | ");
  return `Logo left. Links center: ${links}. Theme-accent pill CTA "Book a Consultation" right. Transparent→opaque on scroll.`;
}

function innerPageSections(
  pageSlug: string,
  niche: string,
  slug: string,
  allPages: NichePage[],
  theme: ThemeDef,
  phone: string,
  email: string,
  address: string,
): string {
  const heroBg = theme.dark ? "var(--surface)" : "var(--primary)";
  const altBg = theme.dark ? "var(--surface)" : (theme.palette.includes("F1F4F6") ? "#F1F4F6" : "#f8fafc");
  const servicesPage = allPages.find(p => !["home", "about", "contact"].includes(p.slug));

  if (pageSlug === "about") {
    return [
      `━━━ SECTIONS IN ORDER ━━━`,
      `1. NAV: ${navSpec(slug, allPages, "about")}`,
      `2. PAGE HERO: Full-width ${heroBg} background. NO photo overlay. Centered content. Eyebrow pill "OUR STORY". Bold 56px white headline (2 lines). One-line muted subtext. Min-height:55vh.`,
      `3. FIRM STORY: White background. Two-column: left editorial Unsplash office/team photo; right: eyebrow pill "WHO WE ARE", heading "Two Decades of Excellence." (adapt to ${niche}), 3 body paragraphs about history, philosophy, approach. Below: horizontal stats row — 3 items (e.g. Founded / Locations / Clients Served) — large accent-color number + label.`,
      `4. VALUES: ${altBg} background. Eyebrow pill "WHAT DRIVES US". Bold centered heading "Our Core Values." 3-column card grid (white cards, icon circles): Integrity / Precision / Client-First — adapt language to ${niche}.`,
      `5. TEAM: White background. Eyebrow pill "OUR PEOPLE". Bold heading "Meet the Team." 2-column grid of 4 team member cards — each: circular Unsplash portrait photo (80px), bold name, accent-colored role in small caps, 2-line bio, "View Profile" link.`,
      `6. CTA BAND: [Follow theme's CTA band rules exactly]. Eyebrow + bold headline "Ready to Work With Us?" + consultation button.`,
      `7. FOOTER: 4-column grid identical to what the homepage footer would look like for this theme.`,
    ].join("\n");
  }

  if (pageSlug === "contact") {
    return [
      `━━━ SECTIONS IN ORDER ━━━`,
      `1. NAV: ${navSpec(slug, allPages, "contact")}`,
      `2. PAGE HERO: Compact. Full-width ${heroBg} bg. Centered. Eyebrow pill "GET IN TOUCH". Bold 48px white headline "Let's Talk." One-line subtext about response time. Min-height:45vh.`,
      `3. PROMISE BAR: White bg. 3 columns with icon circles: "Same-Day Response" / "Free Consultation" / one niche-specific promise. Bold label + sub-label each.`,
      `4. CONTACT SECTION: White or ${altBg} bg. 2-column desktop layout. LEFT card (white, shadow, 12px radius, padding:36px): phone number (large, prominent, bold heading), email, address, hours table (Mon-Fri 9am-5pm, Sat by appointment). RIGHT card: contact form — Name input, Email input, Phone input, Message textarea (4 rows), themed Submit button. Form: method POST action="https://www.saabai.ai/api/site-factory/lead" plus hidden input siteSlug="${slug}".`,
      `5. FOOTER: 4-column grid identical to homepage footer.`,
    ].join("\n");
  }

  // services / practice-areas / menu
  return [
    `━━━ SECTIONS IN ORDER ━━━`,
    `1. NAV: ${navSpec(slug, allPages, pageSlug)}`,
    `2. PAGE HERO: Full-width ${heroBg} bg. NO photo. Centered. Eyebrow pill "WHAT WE DO". Bold 56px white headline about expertise. One-line subtext. Min-height:55vh.`,
    `3. SERVICES DETAILED GRID: ${altBg} bg. Eyebrow pill "${(servicesPage?.label ?? "Services").toUpperCase()}". Bold heading. 2-column desktop grid of large detailed cards — each: icon circle + service heading + 3-4 sentence description of value and outcomes + a small pill tag showing "who it's for". Generate 6 services specific to ${niche}.`,
    `4. WHY CHOOSE US: White bg. Eyebrow pill "WHY US". 2-column: left 4 checkmark bullet items (bold label + 1-line description); right editorial Unsplash photo.`,
    `5. PROCESS: 3 numbered steps (01, 02, 03). Same structure as a homepage process section.`,
    `6. FAQ: White bg. Eyebrow pill "FAQ". Bold heading. 6 accordion items in <details><summary> format — questions specific to ${niche}.`,
    `7. CTA BAND: [Follow theme's CTA band rules exactly].`,
    `8. FOOTER: 4-column grid identical to homepage footer.`,
  ].join("\n");
}

export async function POST(req: NextRequest) {
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
    pages: inputPages,
    chatbot: chatbotInput = {},
  } = body;

  if (!businessName) {
    return Response.json({ error: "Business name is required" }, { status: 400 });
  }

  const slug = slugify(businessName.trim());
  const siteUrl = `https://www.saabai.ai/sites/${slug}/`;
  const themeKey = (style && THEMES[style]) ? style : (NICHE_THEME_DEFAULTS[niche] ?? "slate");
  const theme = THEMES[themeKey];
  const allPages: NichePage[] = inputPages ?? DEFAULT_PAGES;
  const servicesList = (services as string[]).length
    ? (services as string[]).join(", ")
    : "choose 6 highly relevant services for this specific business niche";
  const tokens = sharedTokenLines(theme, themeKey);
  const servicesInnerPage = allPages.find(p => !["home", "about", "contact"].includes(p.slug));

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch { /* client disconnected */ }
      };

      send({ type: "start", total: allPages.length, slug });

      for (let i = 0; i < allPages.length; i++) {
        const page = allPages[i];
        send({ type: "page_start", page: page.slug, index: i + 1, label: page.label });

        try {
          let userPrompt: string;

          if (page.slug === "home") {
            userPrompt = [
              `Build the HOMEPAGE for this Australian business. Write real, compelling copy — not Lorem Ipsum.`,
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
              `IMPORTANT — This is the HOMEPAGE of a multi-page site. Nav must link to all pages:`,
              navSpec(slug, allPages, "home"),
              ``,
              ...tokens,
              ``,
              `━━━ HERO SECTION ━━━`,
              theme.hero,
              `Address the customer's #1 pain point for ${niche}. Add .reveal CSS class to main text elements.`,
              ``,
              `━━━ SECTION ORDER ━━━`,
              `NAV → HERO → TRUST BAR → SERVICES OVERVIEW (3 cards — each links to /sites/${slug}/${servicesInnerPage?.slug ?? "services"}) → PROCESS → STATS → TESTIMONIALS → CTA BAND → FOOTER`,
              `NOTE: Omit full contact form and FAQ — those have dedicated pages.`,
              ``,
              `━━━ SECTION CONTENT SPECS ━━━`,
              `NAV: Logo left (${businessName}). ${navSpec(slug, allPages, "home")}`,
              `TRUST BAR: 4 trust signals with inline SVG icons adapted to ${niche}.`,
              `SERVICES OVERVIEW: 3 card teasers — each with icon + heading + 2-line description + "Learn More" link to the services page.`,
              `PROCESS: 3 numbered steps (01, 02, 03). Horizontal desktop, vertical mobile.`,
              `STATS: 4 count-up metrics with data-target attributes.`,
              `TESTIMONIALS: 3 review cards — 5 stars, 3-4 sentence quote, first name + last initial + Australian suburb.`,
              `CTA BAND: [Follow theme CTA band rules exactly]. Bold headline + 2 buttons.`,
              `FOOTER: 3-column — brand+social, site links (link to all pages), contact. Copyright ${new Date().getFullYear()} ${businessName}.`,
              `SEO: JSON-LD LocalBusiness schema. Full OpenGraph + Twitter Card. <meta name="robots" content="index,follow">.`,
            ].filter(Boolean).join("\n");
          } else {
            userPrompt = [
              `Build a complete HTML page for this Australian business. Real, compelling copy — not Lorem Ipsum.`,
              ``,
              `BUSINESS: ${businessName}`,
              `NICHE: ${niche}`,
              `LOCATION: ${location}`,
              `PHONE: ${phone || "Contact us for a free quote"}`,
              `EMAIL: ${email || ""}`,
              `ADDRESS: ${address || location}`,
              `SERVICES: ${servicesList}`,
              description ? `\nCLIENT BRIEF:\n${description}\n` : "",
              ``,
              ...tokens,
              ``,
              innerPageSections(page.slug, niche, slug, allPages, theme, phone, email, address),
              ``,
              `SEO: JSON-LD LocalBusiness schema. Page-specific <title> and <meta description>. OpenGraph tags.`,
            ].filter(Boolean).join("\n");
          }

          const { textStream } = streamText({
            model: getPremiumModel(),
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: userPrompt }],
          });

          let html = "";
          const reader = textStream.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            html += value;
          }

          html = html
            .trim()
            .replace(/^```html\n?/i, "")
            .replace(/^```\n?/, "")
            .replace(/```\s*$/i, "")
            .trim();
          if (!html.toLowerCase().startsWith("<!doctype")) {
            html = `<!DOCTYPE html>\n${html}`;
          }

          // Chat widget on home page only
          if (page.slug === "home") {
            const botName = chatbotInput.name || businessName;
            const colors = getNicheColors(niche);
            const widget = buildChatWidget({
              slug,
              botName,
              greeting: chatbotInput.greeting || `Hi! I'm ${botName}. How can I help you today?`,
              ...colors,
              placeholder: `Ask about ${businessName}...`,
            });
            html = html.includes("</body>")
              ? html.replace("</body>", `${widget}\n</body>`)
              : html + `\n${widget}`;
          }

          const blobPath = page.slug === "home"
            ? `sites/${slug}/index.html`
            : `sites/${slug}/${page.slug}.html`;

          await put(blobPath, html, {
            access: "public",
            contentType: "text/html",
            addRandomSuffix: false,
            allowOverwrite: true,
          });

          if (page.slug === "home") {
            snapshotVersion(slug, html, "Generated (multi-page)").catch(() => {});
          }

          send({ type: "page_done", page: page.slug, index: i + 1 });
        } catch (e) {
          console.error(`Page generation error [${page.slug}]:`, e);
          send({ type: "page_error", page: page.slug, error: String(e) });
        }
      }

      try {
        const botName = chatbotInput.name || businessName;
        const botGreeting = chatbotInput.greeting || `Hi! I'm ${botName}. How can I help you today?`;
        const botSystemPrompt = chatbotInput.systemPrompt || [
          `You are ${botName}, a friendly assistant for ${businessName}, a ${niche} business in ${location}.`,
          chatbotInput.personality ? `Personality: ${chatbotInput.personality}` : "Be warm, professional, and concise.",
          phone ? `Phone: ${phone}` : "",
          email ? `Email: ${email}` : "",
          address ? `Address: ${address}` : "",
          (services as string[]).length ? `Services: ${(services as string[]).join(", ")}` : "",
          description ? `About: ${description}` : "",
          "Answer questions about the business and its services. Keep responses under 120 words.",
        ].filter(Boolean).join("\n");

        await createSite({
          slug,
          name: businessName,
          niche,
          description,
          status: "live",
          url: siteUrl,
          business: { name: businessName, tagline: "", phone, email, address },
          chatbot: { enabled: true, name: botName, greeting: botGreeting, systemPrompt: botSystemPrompt },
        });
      } catch (e) {
        console.error("Site registry error:", e);
      }

      send({ type: "done", siteUrl, pages: allPages.map(p => p.slug) });
      try { controller.close(); } catch { /* already closed */ }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
      "X-Site-Slug": slug,
      "X-Site-Url": siteUrl,
    },
  });
}
