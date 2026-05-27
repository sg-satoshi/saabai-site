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

    const servicesList = services.length
      ? services.join(", ")
      : "choose 6 highly relevant services for this specific business niche";

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
