import { generateText } from "ai";
import { getDeepSeekModel } from "../../../../lib/chat-config";
import { getTenantBySlug, getActiveAgent, retrieve } from "../../../../lib/agent-retrieval";
import { serviceClient } from "../../../../lib/agent-supabase";

export const runtime = "nodejs";
export const maxDuration = 30;

// DeepSeek V4 Flash pricing (per token). Premium tier (V4 Pro) is ~3.1x.
const IN_RATE = 0.14 / 1e6;
const OUT_RATE = 0.28 / 1e6;
const PRO_MULT = 3.11;

function makeId(p: string) {
  return `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const slug: string = body.slug;
    const agentType: string | null = body.agentType ?? null;
    const incoming: { role: string; content: string }[] = body.messages ?? [];

    if (!slug || !Array.isArray(incoming) || incoming.length === 0) {
      return Response.json({ error: "slug + messages required" }, { status: 400 });
    }

    // 1. SERVER-side tenant resolution (trusted slug — the client never sets tenant_id)
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return Response.json({ error: "tenant not found" }, { status: 404 });

    // 2. persona (which agent/persona is handling this)
    const agent = await getActiveAgent(tenant.id, agentType);
    const systemPrompt = agent?.system_prompt ?? "You are a helpful assistant for this business.";

    // 3. RAG: embed the last user message and pull the top tenant-isolated chunks
    const lastUser =
      [...incoming].reverse().find((m) => m.role === "user")?.content ?? "";
    let context = "";
    if (lastUser) {
      const chunks = await retrieve(tenant.id, lastUser, 6);
      if (chunks.length) {
        context = chunks.map((c) => `- ${c.content}`).join("\n");
      }
    }

    const system = context
      ? `${systemPrompt}\n\nRelevant business information:\n${context}\n\nAnswer accurately using this information. If it is not covered, say so and offer to connect a person.`
      : systemPrompt;

    // 4. map widget roles -> model roles
    const messages = incoming
      .filter((m) => m.role !== "system")
      .slice(-20)
      .map((m) => ({
        role: (m.role === "bot" ? "assistant" : m.role) as "user" | "assistant",
        content: m.content,
      }));

    // 5. DeepSeek (default tier = Flash, premium tier = Pro)
    const isPremium = agent?.model_tier === "premium";
    const model = getDeepSeekModel(isPremium ? "premium" : "default");
    const { text, usage } = await generateText({ model, system, messages });

    const promptTokens = usage?.inputTokens ?? 0;
    const completionTokens = usage?.outputTokens ?? 0;
    const cost = (promptTokens * IN_RATE + completionTokens * OUT_RATE) * (isPremium ? PRO_MULT : 1);

    // 6. persist conversation + usage (trusted server write; service_role = explicit tenant)
    const db = serviceClient();
    const conversationId = makeId("conv");
    await db.from("conversations").insert({
      id: conversationId,
      tenant_id: tenant.id,
      agent_id: agent?.id ?? null,
      channel: "web",
      started_at: new Date().toISOString(),
      contained: true,
    });
    const msgRows = [
      ...incoming
        .filter((m) => m.role === "user")
        .slice(-2)
        .map((m) => ({
          id: makeId("msg"),
          conversation_id: conversationId,
          tenant_id: tenant.id,
          role: "user" as const,
          content: m.content,
        })),
      {
        id: makeId("msg"),
        conversation_id: conversationId,
        tenant_id: tenant.id,
        role: "assistant" as const,
        content: text,
        model: isPremium ? "deepseek-v4-pro" : "deepseek-v4-flash",
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        cost_est: cost,
      },
    ];
    const { error } = await db.from("messages").insert(msgRows);
    if (error) console.error("message ledger insert:", error.message);

    return Response.json({
      content: text,
      conversationId,
      sourceCount: context ? 6 : 0,
    });
  } catch (e) {
    console.error("ai-agent chat error:", e);
    return Response.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
