import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getPremiumModel } from "../../../../lib/chat-config";
import { createSite } from "../../../../lib/site-registry";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const maxDuration = 300;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const NICHE_PALETTES: Record<string, string> = {
  trades: "--primary:#1a2744; --secondary:#f97316; --accent:#fbbf24; --bg:#0f172a; --surface:#1e293b; --text:#f8fafc; --text-muted:#94a3b8",
  "allied-health": "--primary:#1e4d3b; --secondary:#4a90d9; --accent:#34d399; --bg:#f0fdf4; --surface:#ffffff; --text:#1a2e25; --text-muted:#6b7280",
  "professional-services": "--primary:#1e293b; --secondary:#d4a017; --accent:#f59e0b; --bg:#f8fafc; --surface:#ffffff; --text:#0f172a; --text-muted:#64748b",
  retail: "--primary:#4c1d95; --secondary:#ec4899; --accent:#f43f5e; --bg:#faf5ff; --surface:#ffffff; --text:#1e1b4b; --text-muted:#6b7280",
  hospitality: "--primary:#1b4332; --secondary:#d97706; --accent:#fbbf24; --bg:#faf7f2; --surface:#ffffff; --text:#1a2e1e; --text-muted:#6b7280",
  other: "--primary:#0f172a; --secondary:#0d9488; --accent:#06b6d4; --bg:#f9fafb; --surface:#ffffff; --text:#111827; --text-muted:#6b7280",
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
    } = body;

    if (!businessName) {
      return Response.json({ error: "Business name is required" }, { status: 400 });
    }

    const slug = slugify(businessName);
    const siteUrl = `https://www.saabai.ai/sites/${slug}/`;
    const palette = NICHE_PALETTES[niche] || NICHE_PALETTES.other;

    const SYSTEM_PROMPT = `You are a world-class web designer and developer who creates stunning, conversion-optimised websites for Australian small businesses. Your output rivals Lovable, Webflow, and Framer — not generic templates. Every site you produce feels custom-designed and worth $5,000+.

ABSOLUTE RULES:
- Output ONLY raw HTML. No markdown, no explanations, no code fences, no preamble.
- Begin immediately with <!DOCTYPE html> and end with </html>.
- ALL CSS lives in a single <style> tag in <head>. Use CSS custom properties for the full design system.
- ALL JavaScript lives in a single <script> tag immediately before </body>.
- Zero external CSS frameworks. Pure handcrafted CSS using Grid and Flexbox.
- Load Google Fonts via a single @import at the top of the <style> tag.
- Fully responsive: mobile-first. Breakpoint at 768px (tablet), 1024px (desktop).

DESIGN SYSTEM — CSS variables to define at :root:
${palette}
Also define: --radius:12px; --radius-lg:20px; --shadow:0 4px 24px rgba(0,0,0,.08); --shadow-lg:0 16px 48px rgba(0,0,0,.16); --transition:0.2s ease; and a spacing scale --s1 through --s16 (4px increments).

TYPOGRAPHY:
- Import Inter (weights 400,500,600,700) from Google Fonts.
- Body: 16px/1.7 Inter. Headings: weight 700, letter-spacing -0.02em.
- Type scale: 12px, 14px, 16px, 20px, 24px, 32px, 40px, 56px, 72px.

INTERACTION QUALITY:
- Every button: hover scale(1.02) + shadow-lg + color shift, 0.2s ease. Focus-visible ring.
- Cards: hover translateY(-4px) + shadow-lg.
- Links: underline on hover with color transition.
- Inputs: border-color transition on focus, no outline, custom focus ring.

ANIMATIONS:
- Sticky header becomes opaque with box-shadow on scroll (scrollY > 60).
- IntersectionObserver: elements with class .reveal animate from opacity:0 + translateY(24px) to opacity:1 + translateY(0) on enter.
- Stats section: count-up animation from 0 to final value over 1.8s when in view.
- Hero: slight parallax or gradient shift on mousemove (subtle, tasteful).

PERFORMANCE & SEO:
- All images: loading="lazy", explicit width/height.
- Use real placeholder images: https://images.unsplash.com/photo-XXXXX?w=800&q=80 — pick relevant Unsplash photo IDs that match the business niche.
- JSON-LD LocalBusiness structured data in <head>.
- Complete Open Graph + Twitter Card meta tags.
- Semantic HTML5: header, main, section, article, footer, nav, address.`;

    const servicesList = services.length
      ? services.join(", ")
      : "choose 6 highly relevant services for this specific business niche";

    const userPrompt = `Build a complete production website for this Australian business. Write real, compelling copy — not Lorem Ipsum.

BUSINESS: ${businessName}
NICHE: ${niche}
LOCATION: ${location}
STYLE: ${style}
PHONE: ${phone || "Contact us for a free quote"}
EMAIL: ${email || ""}
ADDRESS: ${address || location}
SERVICES: ${servicesList}
${description ? `\nCLIENT BRIEF (follow carefully):\n${description}\n` : ""}

SECTIONS REQUIRED (in this exact order):

1. STICKY NAV — Left: text logo (${businessName}, styled). Center: nav links (Services, Process, Reviews, About, Contact). Right: CTA button ("Get Free Quote"). Becomes solid bg + shadow on scroll.

2. HERO — Full viewport height (100svh). Massive headline (72px desktop, 36px mobile) addressing the customer's #1 pain point for this niche. Supporting sub-headline with top 3 benefits. Two CTAs: primary (filled) + secondary (outlined). Hero background: a compelling full-bleed image from Unsplash relevant to the niche, with a dark gradient overlay. Add the .reveal class to hero text elements.

3. TRUST BAR — Horizontal strip: 4 trust badges with icons: "Licensed & Insured", "5★ Google Rating (X+ reviews)", "X+ Jobs Completed", "Same-Day Response". Use SVG icons inline.

4. SERVICES — Section heading + lead paragraph. CSS Grid: 3 cols desktop, 2 tablet, 1 mobile. 6 cards, each with: inline SVG icon (colored --secondary), service name (bold), 2-line benefit description, subtle card border and hover lift. Add .reveal class.

5. PROCESS — "How It Works" — 3 numbered steps (Contact Us → We Assess → Problem Solved). Horizontal on desktop, vertical on mobile. Large step numbers in --secondary color.

6. STATS — 4 metrics in a colored band (bg --primary). Each: big animated number + label. Examples: "15+ Years", "2,400+ Jobs", "98% Satisfaction", "Same Day". Use IntersectionObserver + count-up.

7. TESTIMONIALS — 3 cards. Each: 5 gold stars (★★★★★), 3-4 sentence specific result quote, customer name (First name + last initial), suburb (Australian suburb near ${location}), job type. Make quotes feel real and specific.

8. ABOUT — Two-column layout: left = a real Unsplash photo (person working or team); right = "About ${businessName}" heading, 2-paragraph story, 4 bullet points (why choose us). Add .reveal.

9. CTA BAND — Full-width section, bg --secondary, bold white headline ("Ready to get started?"), 1 sentence, single large white button.

10. CONTACT — Two-column split. Left: h3 "Get In Touch", phone (large, clickable tel: link), email (mailto:), address, hours grid (Mon–Fri 7am–6pm, Sat 8am–1pm). Right: contact form with floating-label CSS inputs (Name, Email, Phone, Message textarea), submit button. Form submits JSON to https://www.saabai.ai/api/site-factory/lead with {name,email,phone,message,siteSlug:"${slug}"}, shows success/error state.

11. FOOTER — Dark bg (--primary). 3 columns: Brand (logo, tagline, 4 social SVG icon links), Quick Links (6 nav links), Contact (address, phone, email). Bottom bar: copyright ${new Date().getFullYear()} ${businessName}. Privacy Policy + Terms links.

12. FLOATING BUTTON — Bottom-right: phone/WhatsApp button, --secondary bg, pulsing ring animation, links to tel:${phone || "#"}.`;

    const stream = streamText({
      model: getPremiumModel(),
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    // Pipe textStream manually so we can save to Blob before closing the connection.
    // onFinish is unreliable in serverless — the function can be GC'd before the
    // async Blob write completes. By delaying controller.close() until after put(),
    // the HTTP connection stays open until the save is confirmed.
    const { textStream } = stream;
    const encoder = new TextEncoder();
    let fullText = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const reader = textStream.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += value;
            controller.enqueue(encoder.encode(value));
          }

          let html = fullText
            .trim()
            .replace(/^```html\n?/i, "")
            .replace(/^```\n?/, "")
            .replace(/```\s*$/i, "")
            .trim();
          if (!html.toLowerCase().startsWith("<!doctype")) {
            html = `<!DOCTYPE html>\n${html}`;
          }

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
              name: businessName,
              greeting: `Hi! I'm the assistant for ${businessName}. How can I help?`,
              systemPrompt: `You are a helpful assistant for ${businessName}, a ${niche} business in ${location}. Be friendly and concise.`,
            },
          });
        } catch (e) {
          console.error("Site factory stream/save error:", e);
        } finally {
          controller.close();
        }
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
