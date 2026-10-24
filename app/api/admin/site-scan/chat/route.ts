import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import { z } from "zod";
import { getSaabaiModel } from "@/lib/chat-config";
import { logStreamFinish, modelIdFrom } from "@/lib/chat-log";
import { noDashesTransform } from "@/lib/no-dashes";
import { isAdminRequest } from "@/lib/site-scan/admin-auth";
import { buildScanChatSystem, clipScanMessages, lastUserText, mustRefetch } from "@/lib/site-scan/chat-prompt";
import { HOME_HTML_CAP, REFETCH_MAX_BYTES, REFETCH_TIMEOUT_MS, pageBite, resolveScanUrl, shapeRefetch, type ScanEvidence } from "@/lib/site-scan/evidence";
import { normaliseFalsePositive } from "@/lib/site-scan/flags";
import { safeFetch } from "@/lib/site-scan/safe-fetch";
import { getEvidence, getReport, listFalsePositives, saveEvidence, saveFalsePositive } from "@/lib/site-scan/store";
import type { ScanReport } from "@/lib/site-scan/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function evidenceFor(report: ScanReport): Promise<ScanEvidence | null> {
  const saved = await getEvidence(report.id);
  if (saved?.home?.html || saved?.robots) return saved;
  const gate = resolveScanUrl(report.domain, report.url, report.url);
  if (!gate.ok) return saved;
  const home = await safeFetch(gate.url.toString(), { timeoutMs: REFETCH_TIMEOUT_MS, maxBytes: REFETCH_MAX_BYTES });
  const shaped = shapeRefetch(report.domain, gate.url.toString(), home);
  if ("error" in shaped || !shaped.html) return saved;
  const ev: ScanEvidence = {
    reportId: report.id,
    domain: report.domain,
    source: "live",
    fetchedAt: new Date().toISOString(),
    home: pageBite(shaped.url, home, HOME_HTML_CAP),
    robots: null,
    http: null,
    extras: [],
  };
  await saveEvidence(ev);
  return ev;
}

/** Admin only. Same session gate as the rest of /api/admin/site-scan. */
export async function POST(req: Request) {
  if (!(await isAdminRequest())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: { reportId?: unknown; messages?: unknown };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  const report = await getReport(String(body.reportId ?? ""));
  if (!report) return Response.json({ error: "Scan not found." }, { status: 404 });
  const messages = clipScanMessages(body.messages);
  if (!messages.length) return Response.json({ error: "No messages" }, { status: 400 });

  const [evidence, flags] = await Promise.all([evidenceFor(report), listFalsePositives(report.domain)]);
  const ask = lastUserText(messages);
  let system = buildScanChatSystem(report, evidence, flags);
  if (mustRefetch(ask)) system += "\n\nShane's latest message asks for a live check. Call refetch_page before you answer.";

  let model: ReturnType<typeof getSaabaiModel>;
  try { model = getSaabaiModel(); } catch { return Response.json({ error: "Chat model is not configured." }, { status: 503 }); }

  const result = streamText({
    model,
    system,
    messages: await convertToModelMessages(messages as Parameters<typeof convertToModelMessages>[0]),
    stopWhen: stepCountIs(4),
    maxOutputTokens: 700,
    temperature: 0.2,
    experimental_transform: noDashesTransform(),
    tools: {
      refetch_page: tool({
        description: "GET one URL on the scanned site. Returns status, selected headers, and trimmed HTML. Use it to verify or refute a finding. Refuses any other domain.",
        inputSchema: z.object({
          url: z.string().describe("Absolute URL or path on the scanned site, for example https://example.com.au/ or /contact."),
        }),
        execute: async ({ url }) => {
          const gate = resolveScanUrl(report.domain, report.url, url);
          if (!gate.ok) return { error: gate.reason };
          const res = await safeFetch(gate.url.toString(), { timeoutMs: REFETCH_TIMEOUT_MS, maxBytes: REFETCH_MAX_BYTES });
          return shapeRefetch(report.domain, gate.url.toString(), res);
        },
      }),
      flag_false_positive: tool({
        description: "Record that a check id is a false positive for this scanned site. Include a short note about the evidence.",
        inputSchema: z.object({
          checkId: z.string().describe("The check id from the scan report, such as title_meta."),
          note: z.string().describe("Why the finding is wrong, in one or two sentences."),
        }),
        execute: async ({ checkId, note }) => {
          const norm = normaliseFalsePositive({ report, checkId, note, source: "chat" });
          if (!norm.ok) return { ok: false, error: norm.error };
          if (!(await saveFalsePositive(norm.flag))) return { ok: false, error: "Could not store the flag." };
          return { ok: true, flag: norm.flag };
        },
      }),
    },
    onFinish: (event) => {
      logStreamFinish(event, { bot: "scan-mia", siteId: report.domain, conversationId: report.id, model: modelIdFrom(model), userText: ask });
    },
  });

  return result.toUIMessageStreamResponse();
}
