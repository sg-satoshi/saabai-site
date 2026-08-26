/**
 * End-to-end test of the AI-agent "answer" engine — REAL libs, REAL service.
 * Proves the chat route's exact code path without the DDL dependency:
 *   tenant resolve -> persona -> RAG (in-app cosine sim) -> DeepSeek -> usage ledger.
 * Run: npx tsx scripts/test-agent-chat.ts
 */
import { readFileSync } from "fs";

// Load .env.local into process.env BEFORE importing the libs (their module code reads process.env).
const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of raw.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || t.startsWith("export ")) continue;
  const eq = t.indexOf("=");
  if (eq <= 0) continue;
  let v = t.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  process.env[t.slice(0, eq).trim()] = v;
}

const SLUG = "test-tenant";

async function main() {
  const { getTenantBySlug, getActiveAgent, retrieve } = await import("../lib/agent-retrieval");
  const { serviceClient } = await import("../lib/agent-supabase");
  const { getDeepSeekModel } = await import("../lib/chat-config");
  const { generateText } = await import("ai");

  const db = serviceClient();

  // 0) ensure the test tenant exists
  const { error: terr } = await db.from("tenants").upsert(
    { id: SLUG, slug: SLUG, name: "Test Tenant", vertical: "plastics", plan: "free", status: "active" },
    { onConflict: "id" }
  );
  if (terr) throw new Error(`seed tenant: ${terr.message}`);

  // 1) ensure a persona (agent) exists
  const existing = await getActiveAgent(SLUG, "sales");
  if (!existing) {
    const { error: aerr } = await db.from("agents").insert({
      id: `agt_${Date.now().toString(36)}`,
      tenant_id: SLUG,
      name: "Saabai Sales Agent",
      type: "sales",
      system_prompt:
        "You are a friendly sales assistant for a plastics manufacturer. Answer accurately from the provided information. Use a warm, confident tone. If something is not covered, say so and offer to connect a person.",
      model_tier: "default",
      active: true,
    });
    if (aerr) throw new Error(`seed agent: ${aerr.message}`);
  }
  const agent = await getActiveAgent(SLUG, "sales");
  console.log("AGENT:", agent?.name, "|", agent?.type);

  // 2) resolve tenant (trusted slug)
  const tenant = await getTenantBySlug(SLUG);
  if (!tenant) throw new Error("tenant not found");
  console.log("TENANT:", tenant.slug, "| vertical:", tenant.vertical);

  // 3) RAG on a real query that matches the ingested Polyethylene KB
  const query = "What is polyethylene used for and what is its density?";
  const chunks = await retrieve(tenant.id, query, 6);
  console.log("RAG chunks returned:", chunks.length);
  chunks.forEach((c, i) => console.log(`  [${i}] sim=${c.similarity.toFixed(3)} | ${c.content.slice(0, 90)}...`));

  const context = chunks.map((c) => `- ${c.content}`).join("\n");
  const system = `${agent?.system_prompt}\n\nRelevant business information:\n${context}\n\nAnswer accurately using this information. If it is not covered, say so and offer to connect a person.`;

  // 4) DeepSeek answer
  const model = getDeepSeekModel("default");
  const { text, usage } = await generateText({
    model,
    system,
    messages: [{ role: "user", content: query }],
  });
  const inTok = usage?.inputTokens ?? 0;
  const outTok = usage?.outputTokens ?? 0;
  const cost = (inTok * (0.14 / 1e6) + outTok * (0.28 / 1e6));
  console.log("DEEPSEEK answered:", text.slice(0, 160).replace(/\n/g, " "), "...");
  console.log("USAGE: in", inTok, "| out", outTok, "| cost_est $", cost.toFixed(6));

  // 5) write conversation + usage ledger (same calls as the route)
  const convId = `conv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const { error: cerr } = await db.from("conversations").insert({
    id: convId, tenant_id: tenant.id, agent_id: agent?.id ?? null, channel: "web",
    started_at: new Date().toISOString(), contained: true,
  });
  if (cerr) throw new Error(`conversation insert: ${cerr.message}`);
  const { error: merr } = await db.from("messages").insert([
    { id: `msg_${Date.now().toString(36)}a`, conversation_id: convId, tenant_id: tenant.id, role: "user", content: query },
    { id: `msg_${Date.now().toString(36)}b`, conversation_id: convId, tenant_id: tenant.id, role: "assistant", content: text, model: "deepseek-v4-flash", prompt_tokens: inTok, completion_tokens: outTok, cost_est: cost },
  ]);
  if (merr) throw new Error(`message insert: ${merr.message}`);
  console.log("LEDGER written: conv", convId, "| messages:2 | cost_est $", cost.toFixed(6));

  const ok = text.length > 10 && chunks.length > 0;
  console.log("RESULT:", ok ? "PASS" : "FAIL");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("TEST ERROR:", e);
  process.exit(1);
});
