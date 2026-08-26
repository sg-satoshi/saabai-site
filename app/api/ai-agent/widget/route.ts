import { serviceClient } from "../../../../lib/agent-supabase";
import { buildWidgetScript } from "../../../../lib/agent-widget-script";

export const runtime = "nodejs"; // supabase-js client
export const maxDuration = 30;

interface Branding {
  name?: string;
  greeting?: string;
  avatar?: string;
  primaryColor?: string;
  accentColor?: string;
}

/**
 * Public widget entry: GET /api/ai-agent/widget?slug=<slug>&agentType=<type>
 * Returns the parameterized chat widget script for one client.
 *
 * Reads ONLY presentation fields (tenant.name/branding, agent name/greeting/type) —
 * NEVER the system prompt, knowledge, or any tenant data. Everything is injected
 * server-side (JSON.stringify), so no key or internal config reaches the browser.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug") || "demo";
    const agentType = searchParams.get("agentType") || null;
    const apiBase = process.env.NEXT_PUBLIC_BASE_URL || "https://saabai.ai";

    const db = serviceClient();
    const { data: tenant, error: terr } = await db
      .from("tenants")
      .select("id, name, branding")
      .eq("slug", slug)
      .maybeSingle();
    if (terr) console.error("widget tenant:", terr.message);

    let agentName: string | null = null;
    let greeting: string | null = null;
    if (tenant && agentType) {
      const { data: agent, error: aerr } = await db
        .from("agents")
        .select("name, greeting")
        .eq("tenant_id", tenant.id)
        .eq("type", agentType)
        .eq("active", true)
        .maybeSingle();
      if (aerr) console.error("widget agent:", aerr.message);
      if (agent) {
        agentName = agent.name;
        greeting = agent.greeting;
      }
    }

    const branding = (tenant?.branding ?? {}) as Branding;
    const cfg = {
      slug,
      agentType,
      name: agentName ?? branding.name ?? "Assistant",
      greeting: greeting ?? branding.greeting ?? "Hi! How can I help you today?",
      avatar: branding.avatar ?? "",
      brandColor: branding.primaryColor ?? "#0b092e",
      accentColor: branding.accentColor ?? "#c9a227",
      apiEndpoint: `${apiBase}/api/ai-agent/chat`,
    };

    const script = buildWidgetScript(cfg);
    return new Response(script, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=600, s-maxage=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("widget route:", e);
    return new Response("/* widget config error */", { status: 500 });
  }
}
