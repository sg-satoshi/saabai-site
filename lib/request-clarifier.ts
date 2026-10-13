/**
 * AI clarifier for non-Critical requests.
 * Asks 1-2 questions when unclear; writes Agreed change when clear.
 * Never commits to price, timeline or scope. Max 3 rounds.
 */
import { randomUUID } from "crypto";
import { generateText } from "ai";
import { getDefaultModel } from "./chat-config";
import { getClientLLMConfig, buildModelFromConfig } from "./client-config";
import {
  addTimelineEntry,
  getClarifierEnabled,
  saveRequest,
  type ClientRequest,
} from "./client-requests";
import { EMAIL_BRAND, escapeHtml, renderBrandedEmail, sendBrandedEmail } from "./email/branded-layout";

export const MAX_CLARIFIER_ROUNDS = 3;

export type ClarifierDecision =
  | { action: "ask"; questions: string[] }
  | { action: "agree"; summary: string }
  | { action: "handoff"; reason: string };

export type ClarifierLlm = (prompt: string) => Promise<string>;

function defaultParse(text: string): ClarifierDecision {
  const cleaned = text.trim();
  try {
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const obj = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as {
        action?: string;
        questions?: string[];
        summary?: string;
        reason?: string;
      };
      if (obj.action === "ask" && Array.isArray(obj.questions) && obj.questions.length) {
        return { action: "ask", questions: obj.questions.slice(0, 2).map(String) };
      }
      if (obj.action === "agree" && obj.summary) {
        return { action: "agree", summary: String(obj.summary) };
      }
      if (obj.action === "handoff") {
        return { action: "handoff", reason: String(obj.reason || "Needs a human.") };
      }
    }
  } catch {
    /* fall through */
  }
  // Heuristic: short clear change statements
  if (/opening hours|from\s+\d/i.test(cleaned) && cleaned.length < 200) {
    return { action: "agree", summary: cleaned.replace(/^["']|["']$/g, "") };
  }
  return {
    action: "ask",
    questions: [
      "Which page or section should we update?",
      "What should it say or do when we are finished?",
    ],
  };
}

export function buildClarifierPrompt(req: ClientRequest, siteContext: string): string {
  const thread = req.timeline
    .filter((t) => !t.internal)
    .map((t) => `${t.authorName}: ${t.body}`)
    .join("\n");
  return `You are Saabai Assistant clarifying a website change request for a client.
Rules:
- Ask questions only. Never promise price, timeline, or scope.
- Be professional, friendly, a little personality. No em dashes.
- If clear enough to act, return action "agree" with a short Agreed change summary.
- If unclear, return action "ask" with 1 or 2 concise questions.
- If stuck after prior questions, return action "handoff".

Return ONLY JSON: {"action":"ask"|"agree"|"handoff","questions"?:["..."],"summary"?:"...","reason"?:"..."}

Site context:
${siteContext || "(none)"}

Title: ${req.title}
Type: ${req.type}
Priority: ${req.priority}
Description and thread:
${thread}
`;
}

export async function runClarifierLlm(
  prompt: string,
  clientId: string,
  llm?: ClarifierLlm,
): Promise<ClarifierDecision> {
  if (llm) return defaultParse(await llm(prompt));
  let model = getDefaultModel();
  try {
    const cfg = await getClientLLMConfig(clientId);
    const built = cfg ? buildModelFromConfig(cfg) : null;
    if (built) model = built;
  } catch {
    /* use default */
  }
  const { text } = await generateText({ model, prompt, maxOutputTokens: 400 });
  return defaultParse(text);
}

async function emailClientQuestions(req: ClientRequest, questions: string[]) {
  if (!req.clientEmail) return;
  const portalUrl = `${EMAIL_BRAND.portalUrl}`;
  const email = renderBrandedEmail({
    subject: `Quick question on your request: ${req.title.slice(0, 60)}`,
    preheader: "Saabai Assistant needs a detail before we start.",
    eyebrow: "Request update",
    title: "A quick question from Saabai Assistant",
    bodyHtml: [
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#13152a;">Hi ${escapeHtml((req.clientName || "").split(" ")[0] || "there")},</p>`,
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#13152a;">Thanks for the request <strong>“${escapeHtml(req.title)}”</strong>. Before we jump in:</p>`,
      `<ul style="margin:0 0 14px;padding-left:20px;color:#13152a;font-size:15px;line-height:1.65;">${questions.map((q) => `<li style="margin:0 0 6px;">${escapeHtml(q)}</li>`).join("")}</ul>`,
      `<p style="margin:0;font-size:14px;color:#5f6580;">Reply in your Client Portal thread. No password needed, just your email magic link.</p>`,
    ].join(""),
    cta: { href: portalUrl, label: "Open your portal" },
    textBody: [
      `Hi ${(req.clientName || "").split(" ")[0] || "there"},`,
      "",
      `About “${req.title}”:`,
      ...questions.map((q) => `- ${q}`),
      "",
      `Portal: ${portalUrl}`,
    ],
  });
  await sendBrandedEmail({
    to: req.clientEmail,
    email,
    from: EMAIL_BRAND.fromPortal,
    replyTo: EMAIL_BRAND.supportEmail,
  });
}

/**
 * Run clarifier after create or client reply. Mutates and saves request.
 */
export async function maybeClarifyRequest(
  req: ClientRequest,
  siteContext: string,
  opts?: { llm?: ClarifierLlm },
): Promise<ClientRequest> {
  if (req.priority === "critical") return req;
  if (req.discussWithShane && !req.autoHandle) return req;
  if (!(await getClarifierEnabled(req.clientId))) return req;
  if (req.clarifierRounds >= MAX_CLARIFIER_ROUNDS) {
    const handed = await addTimelineEntry(req.id, {
      kind: "system",
      authorKind: "assistant",
      authorName: "Saabai Assistant",
      body: "Handing this to Shane after a few rounds of questions.",
      internal: true,
    });
    if (!handed) return req;
    handed.autoHandle = false;
    handed.discussWithShane = true;
    handed.status = "triaged";
    return saveRequest(handed);
  }

  const prompt = buildClarifierPrompt(req, siteContext);
  let decision: ClarifierDecision;
  try {
    decision = await runClarifierLlm(prompt, req.clientId, opts?.llm);
  } catch (err) {
    console.error("[clarifier] llm failed", err);
    return req;
  }

  if (decision.action === "ask") {
    const body = decision.questions.join("\n\n");
    let next = await addTimelineEntry(req.id, {
      kind: "comment",
      authorKind: "assistant",
      authorName: "Saabai Assistant",
      body,
    });
    if (!next) return req;
    next.clarifierRounds = (next.clarifierRounds || 0) + 1;
    next.status = "awaiting_client";
    next.statusChangedAt = new Date().toISOString();
    next = await saveRequest(next);
    await emailClientQuestions(next, decision.questions);
    return next;
  }

  if (decision.action === "agree") {
    let next = await addTimelineEntry(req.id, {
      kind: "agreed_change",
      authorKind: "assistant",
      authorName: "Saabai Assistant",
      body: decision.summary,
      internal: true,
    });
    if (!next) return req;
    next.agreedChange = decision.summary;
    next.status = "triaged";
    next.statusChangedAt = new Date().toISOString();
    next.timeline.push({
      id: randomUUID(),
      kind: "status",
      authorKind: "assistant",
      authorName: "Saabai Assistant",
      body: "Status set to Triaged.",
      createdAt: new Date().toISOString(),
      internal: true,
    });
    return saveRequest(next);
  }

  // handoff
  let next = await addTimelineEntry(req.id, {
    kind: "system",
    authorKind: "assistant",
    authorName: "Saabai Assistant",
    body: decision.reason || "Handing to Shane.",
    internal: true,
  });
  if (!next) return req;
  next.autoHandle = false;
  next.discussWithShane = true;
  next.status = "triaged";
  return saveRequest(next);
}

