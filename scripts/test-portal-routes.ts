/**
 * Portal API route smoke test — imports the real admin route handlers and
 * drives them: agents GET/POST, overview GET, and the Train ingest POST.
 * Run: npx tsx scripts/test-portal-routes.ts
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
function req(url: string, opts?: RequestInit) {
  return new Request(url, { headers: { "content-type": "application/json" }, ...opts, ...(opts?.body ? {} : {}) });
}

async function main() {
  const agents = await import("../app/api/ai-agent/agents/route");
  const overview = await import("../app/api/ai-agent/overview/route");
  const ingest = await import("../app/api/ai-agent/ingest/route");

  // 1) agents GET — list personas
  const g = await agents.GET(req(`${BASE}/api/ai-agent/agents?slug=test-tenant`));
  const gj = await g.json();
  console.log("AGENTS GET: status", g.status, "| count", gj.agents?.length);

  // 2) agents POST — create a 'cs' persona
  const p = await agents.POST(
    req(`${BASE}/api/ai-agent/agents`, {
      method: "POST",
      body: JSON.stringify({
        slug: "test-tenant",
        name: "Support Agent",
        type: "cs",
        greeting: "Hi! I'm the support agent.",
        system_prompt: "You are a helpful customer support assistant for a plastics manufacturer. Answer accurately from the provided information. Be concise and reassuring.",
        model_tier: "default",
      }),
    })
  );
  const pj = await p.json();
  console.log("AGENTS POST: status", p.status, "| id", pj.agent?.id, "| type", pj.agent?.type);

  // 3) agents GET — now 2
  const g2 = await agents.GET(req(`${BASE}/api/ai-agent/agents?slug=test-tenant`));
  const g2j = await g2.json();
  console.log("AGENTS GET after: status", g2.status, "| count", g2j.agents?.length);

  // 4) overview GET
  const o = await overview.GET(req(`${BASE}/api/ai-agent/overview?slug=test-tenant`));
  const oj = await o.json();
  console.log("OVERVIEW: status", o.status, "| convos", oj.conversations, "| messages", oj.messages, "| cost $", (oj.cost ?? 0).toFixed(6), "| chunks", oj.chunks);

  // 5) Train ingest (route handler) — small stable page
  const ig = await ingest.POST(
    req(`${BASE}/api/ai-agent/ingest`, {
      method: "POST",
      body: JSON.stringify({ slug: "test-tenant", url: "https://en.wikipedia.org/wiki/Thermoplastic", title: "Thermoplastic" }),
    })
  );
  const igj = await ig.json();
  console.log("INGEST: status", ig.status, "| sourceId", igj.sourceId, "| chunks", igj.chunks, "| status", igj.status);

  const ok = g.status === 200 && p.status === 200 && g2j.agents?.length >= 2 && o.status === 200 && ig.status === 200 && igj.chunks > 0;
  console.log("RESULT:", ok ? "PASS" : "FAIL");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("TEST ERROR:", e);
  process.exit(1);
});
