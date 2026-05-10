import { NextRequest } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createSite } from "../../../../lib/site-registry";
import { writeFile, mkdir } from "fs/promises";
import * as path from "path";
import { execSync } from "child_process";

export const runtime = "nodejs";
export const maxDuration = 60;

const openai = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessName,
      niche = "general",
      location = "Australia",
      services = [],
      phone = "",
      email = "",
      address = "",
      style = "modern",
    } = body;

    if (!businessName) {
      return Response.json({ error: "Business name is required" }, { status: 400 });
    }

    const slug = slugify(businessName);
    const siteUrl = `https://saabai-site.vercel.app/sites/${slug}/`;

    const SYSTEM_PROMPT = `You are an expert web developer who creates beautiful, unique, production-ready HTML websites for Australian small businesses.

RULES:
- Output ONLY raw HTML. No markdown, no explanations, no code fences.
- Start with <!DOCTYPE html> and end with </html>.
- Embed ALL CSS in a <style> tag in the head.
- Embed ALL JS in a <script> tag at the end of the body.
- NO external CSS frameworks. Pure CSS only.
- Mobile-first responsive design with proper media queries.
- Choose a unique, professional color scheme appropriate for the business niche.
- Use Google Fonts (Inter or similar) from fonts.googleapis.com.
- Include SEO meta tags, JSON-LD LocalBusiness structured data, and Open Graph tags.
- The contact form must POST as JSON to https://saabai-site.vercel.app/api/site-factory/lead with body: {name, email, phone, message, siteSlug: "${slug}"}.
- Include a floating chat button in the bottom-right corner that calls window.openChat().
- Smooth scrolling, subtle CSS animations, professional typography.`;

    const userPrompt = `Generate a complete HTML website for:

Business: ${businessName}
Niche: ${niche}
Location: ${location}
Style: ${style}
Phone: ${phone || "Contact us for details"}
Email: ${email || ""}
Address: ${address || ""}
Services: ${services.join(", ") || "Professional services"}

Required sections:
1. Hero — Business name, compelling tagline, primary CTA
2. Services — 3-6 service cards with descriptions
3. About — Business story, trust signals, why choose them
4. Contact — Form (name, email, phone, message) + direct contact details
5. Footer — Links, copyright, social placeholders

Make it visually stunning and unique. Use gradients, subtle shadows, and modern layout techniques. The site should feel custom-designed, not templated.`;

    const result = await generateText({
      model: openai("anthropic/claude-sonnet-4"),
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    let html = result.text.trim();
    html = html.replace(/^```html\n?/i, "").replace(/```\s*$/i, "").trim();
    if (!html.toLowerCase().startsWith("<!doctype")) {
      html = `<!DOCTYPE html>\n${html}`;
    }

    // Write site files
    const siteDir = path.join(process.cwd(), "public", "sites", slug);
    await mkdir(siteDir, { recursive: true });
    await writeFile(path.join(siteDir, "index.html"), html);

    // Write chat config
    const chatConfig = {
      businessName,
      greeting: `Hi! I'm the AI assistant for ${businessName}. How can I help you today?`,
      systemPrompt: `You are a helpful assistant for ${businessName}, a ${niche} business in ${location}. Be friendly, professional, and concise.`,
    };
    await writeFile(
      path.join(siteDir, "chat-config.js"),
      `window.SITE_CHAT_CONFIG = ${JSON.stringify(chatConfig, null, 2)};`
    );

    // Register in Redis
    const site = await createSite({
      slug,
      name: businessName,
      niche,
      status: "live",
      url: siteUrl,
      business: {
        name: businessName,
        tagline: "",
        phone,
        email,
        address,
      },
      chatbot: {
        enabled: true,
        name: businessName,
        greeting: chatConfig.greeting,
        systemPrompt: chatConfig.systemPrompt,
      },
    });

    // Auto-deploy
    try {
      execSync(
        `git add public/sites/${slug}/ && git diff --cached --quiet || (git commit -m "deploy: new site ${slug}" && git push origin main)`,
        { cwd: process.cwd(), encoding: "utf-8" }
      );
    } catch (e) {
      console.log("Git deploy skipped");
    }

    return Response.json({
      success: true,
      site: {
        id: site.id,
        slug,
        url: siteUrl,
        previewUrl: siteUrl,
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
