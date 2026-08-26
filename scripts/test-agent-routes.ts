/**
 * Route-handler smoke test — imports the ACTUAL Next.js route handlers and
 * drives them with synthetic Requests, proving the full HTTP path:
 *   POST /api/ai-agent/chat  (RAG + persona + DeepSeek + ledger)
 *   GET  /api/ai-agent/widget (parameterized branded script)
 * Run: npx tsx scripts/test-agent-routes.ts
 */
import { readFileSync } from "fs";

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

const BASE = "https://saabai.ai";

async function main() {
  const chat = await import("../app/api/ai-agent/chat/route");
  const widget = await import("../app/api/ai-agent/widget/route");

  // 1) widget script
  const wres = await widget.GET(new Request(`${BASE}/api/ai-agent/widget?slug=test-tenant&agentType=sales`));
  const script = await wres.text();
  const wOk = wres.status === 200 && script.includes("sa-agent-root") && script.includes("test-tenant");
  console.log("WIDGET route: status", wres.status, "| has root+slug:", wOk);

  // 2) chat
  const cres = await chat.POST(
    new Request(`${BASE}/api/ai-agent/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slug: "test-tenant",
        agentType: "sales",
        messages: [{ role: "user", content: "What is polyethylene used for and its density?" }],
      }),
    })
  );
  const body = await cres.json();
  const hasAnswer = typeof body.content === "string" && body.content.length > 20;
  const hasConvId = typeof body.conversationId === "string" && body.conversationId.startsWith("conv_");
  console.log("CHAT route: status", cres.status, "| sourceCount:", body.sourceCount, "| convId:", body.conversationId);
  console.log("  answer:", hasAnswer ? body.content.slice(0, 120).replace(/\n/g, " ") : body);
  console.log("  hasConvId:", hasConvId);

  // 3) OPTIONS preflight for chat (CORS for the POST)
  const chatOpt = await chat.OPTIONS();
  console.log("OPTIONS: chat", chatOpt.status, "| allow-origin:",
    chatOpt.headers.get("access-control-allow-origin"));

  const ok = wOk && cres.status === 200 && hasAnswer && hasConvId;
  console.log("RESULT:", ok ? "PASS" : "FAIL");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("TEST ERROR:", e);
  process.exit(1);
});
