import { NextRequest } from "next/server";
import { list, put } from "@vercel/blob";
import { getSiteBySlug, updateSite } from "../../../../lib/site-registry";
import { buildChatWidget, getNicheColors } from "../../../../lib/chat-widget-template";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { slug, botName, greeting, systemPrompt, personality, avatarUrl } = await req.json();
    if (!slug) return Response.json({ error: "slug required" }, { status: 400 });

    // Load site config
    const site = await getSiteBySlug(slug);
    if (!site) return Response.json({ error: "Site not found in registry" }, { status: 404 });

    // Load blob HTML
    const { blobs } = await list({ prefix: `sites/${slug}/` });
    const draftBlob = blobs.find((b) => b.pathname === `sites/${slug}/draft.html`);
    const liveBlob  = blobs.find((b) => b.pathname === `sites/${slug}/index.html`);
    const blob = draftBlob ?? liveBlob;
    if (!blob) return Response.json({ error: "Site HTML not found in storage" }, { status: 404 });

    const res = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
    let html = await res.text();

    // Remove any existing sf-chat-widget so we don't double-inject
    html = html.replace(/<script id="sf-chat-widget">[\s\S]*?<\/script>/i, "");
    // Also remove the old simple chatPopup button if present
    html = html.replace(/<!-- Chat bubble button -->[\s\S]*?<\/script>/i, "");
    // Remove old chatBtn if still there
    html = html.replace(/<button id="chatBtn"[\s\S]*?<\/button>\s*/i, "");
    html = html.replace(/<div id="chatPopup"[\s\S]*?<\/div>\s*/i, "");

    const resolvedBotName = botName || site.chatbot?.name || site.business?.name || site.name;
    const resolvedGreeting = greeting || site.chatbot?.greeting || `Hi! I'm ${resolvedBotName}. How can I help you today?`;

    // Build system prompt from inputs + site data
    const businessInfo = [
      site.business?.name && `Business: ${site.business.name}`,
      site.niche && `Industry: ${site.niche}`,
      site.business?.address && `Location: ${site.business.address}`,
      site.business?.phone && `Phone: ${site.business.phone}`,
      site.business?.email && `Email: ${site.business.email}`,
      site.description && `About: ${site.description}`,
    ].filter(Boolean).join("\n");

    const resolvedSystemPrompt = systemPrompt || [
      `You are ${resolvedBotName}, a friendly and helpful assistant for ${site.business?.name || site.name}.`,
      personality ? `Personality: ${personality}` : "Be warm, professional, and concise.",
      businessInfo,
      "Answer questions about the business, its services, and how to book or get in touch.",
      "Keep responses under 120 words. End with a helpful next step or offer when relevant.",
      "If asked something you don't know, offer to connect them with the team.",
    ].filter(Boolean).join("\n");

    // Pick colors from niche palette
    const colors = getNicheColors(site.niche || "other");

    const widget = buildChatWidget({
      slug,
      botName: resolvedBotName,
      greeting: resolvedGreeting,
      ...colors,
      placeholder: `Ask about ${site.business?.name || site.name}…`,
      ...(avatarUrl ? { avatarUrl } : {}),
    });

    // Inject before </body>
    if (html.includes("</body>")) {
      html = html.replace("</body>", `${widget}\n</body>`);
    } else {
      html += `\n${widget}`;
    }

    // Save updated HTML to draft
    await put(`sites/${slug}/draft.html`, html, {
      access: "public",
      contentType: "text/html",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    // Update site config with chatbot data
    await updateSite(site.id, {
      chatbot: {
        enabled: true,
        name: resolvedBotName,
        greeting: resolvedGreeting,
        systemPrompt: resolvedSystemPrompt,
        ...(avatarUrl ? { avatarUrl } : {}),
      },
    });

    return Response.json({ ok: true, botName: resolvedBotName });
  } catch (e) {
    console.error("inject-chatbot error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
