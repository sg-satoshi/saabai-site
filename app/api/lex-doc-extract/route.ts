/**
 * Lex supporting documents: /api/lex-doc-extract
 *
 * Takes one or more uploaded files (PDF, DOCX, TXT) for a Draft Documents type, reads their text in
 * memory, masks it through the Lex privacy gateway (same model rule as drafting: the firm's own model,
 * else LEX_RESEARCH_MODEL), asks the model for the type's checklist facts with clause and page, merges
 * them (later amendments override the original), and returns the merged fields with real names restored.
 *
 * Nothing is stored: files and text live only for this request. Lex session required (proxy.ts gates
 * every /api/lex-* route that is not on the public list). No TFNs are asked for.
 */
import { getLexConfig } from "../../../lib/lex-config";
import { getDocumentType } from "../../../lib/lex-document-types";
import { LEX_DOC_EXTS, docExt, readDocText } from "../../../lib/lex-doc-text";
import { DEED_LIMITS, FileFactsSchema, extractSystem, mergeFacts, profileFor, type FileFacts, type FileResult } from "../../../lib/lex-doc-extract";
import { LexGateway } from "../../../lib/lex-privacy/gateway";
import { LexPrivacyError, privacyFailResponse } from "../../../lib/lex-privacy/mask";
import { lexFirmFromRequest } from "../../../lib/lex-privacy/firm";
import { matterPartiesFor } from "../../../lib/lex-privacy/matter-parties";
import { lexErrorResponse } from "../../../lib/lex-errors";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (!files.length) return Response.json({ error: "No file provided" }, { status: 400 });
    if (files.length > DEED_LIMITS.maxFiles) return Response.json({ error: `Up to ${DEED_LIMITS.maxFiles} files at a time` }, { status: 400 });
    if (files.reduce((n, f) => n + f.size, 0) > DEED_LIMITS.maxTotalBytes) return Response.json({ error: "Files too large together (max 30MB)" }, { status: 400 });

    const typeId = String(form.get("documentType") ?? "custom");
    const profile = profileFor(getDocumentType(typeId));

    // 1. Read each file in memory. Problems are reported per file, the rest still run.
    const results: FileResult[] = [];
    const readable: Array<{ file: string; text: string }> = [];
    for (const f of files) {
      const name = f.name.slice(0, 120);
      if (f.size > DEED_LIMITS.maxFileBytes) { results.push({ file: name, error: "too-large" }); continue; }
      if (!(LEX_DOC_EXTS as readonly string[]).includes(docExt(name))) { results.push({ file: name, error: "unsupported" }); continue; }
      try {
        const d = await readDocText(name, Buffer.from(await f.arrayBuffer()));
        if (d.scanned) { results.push({ file: name, error: "scanned" }); continue; }
        if (!d.text.trim()) { results.push({ file: name, error: "empty" }); continue; }
        readable.push({ file: name, text: d.text.slice(0, DEED_LIMITS.maxCharsPerFile) });
      } catch {
        results.push({ file: name, error: "unreadable" });
      }
    }
    if (!readable.length) return Response.json({ profile: profile.id, fields: [], variations: [], files: results });

    // 2. Privacy gateway, one masking session for every file so the same name gets the same placeholder.
    const lexConfigId = getLexConfig(undefined).id;
    const gw = await LexGateway.open({ route: "lex-doc-extract", firm: lexFirmFromRequest(request, lexConfigId), model: { kind: "firm", configId: lexConfigId }, parties: await matterPartiesFor(request, form.get("matterId")) });
    if (!gw) return privacyFailResponse();
    await gw.scanNames(readable.map((r) => r.text));

    const facts: Array<{ file: string; facts: FileFacts }> = [];
    for (const r of readable) {
      try {
        const { object } = await gw.generateObject<FileFacts>({
          schema: FileFactsSchema,
          schemaName: "DocumentFacts",
          system: extractSystem(profile),
          prompt: `File: ${gw.mask(r.file)}\n\n${gw.mask(r.text)}`,
          maxOutputTokens: 4000,
          maxRetries: 1,
          providerOptions: { anthropic: { structuredOutputMode: "jsonTool" } },
        });
        facts.push({ file: r.file, facts: gw.rehydrateDeep(object) });
      } catch (err) {
        if (err instanceof LexPrivacyError) return privacyFailResponse();
        results.push({ file: r.file, error: "unreadable" });
      }
    }
    const merged = mergeFacts(facts, profile);
    // Keep the per-file outcome order: errors first in upload order, then read files.
    return Response.json({ ...merged, files: [...results, ...merged.files] });
  } catch (err) {
    console.error("[lex-doc-extract]", err instanceof Error ? err.name : "error");
    return lexErrorResponse(500, "extract_failed");
  }
}
