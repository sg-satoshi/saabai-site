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
import { LEX_DOC_EXTS, docExt, isLegacyDoc, readDocText } from "../../../lib/lex-doc-text";
import { collectLexFiles, lexFolderForRequest, parseBlobRefs } from "../../../lib/lex-upload";
import { DEED_LIMITS, FileFactsSchema, extractSystem, mergeFacts, profileFor, type FileFacts, type FileResult } from "../../../lib/lex-doc-extract";
import { LexGateway } from "../../../lib/lex-privacy/gateway";
import { LexPrivacyError, privacyFailResponse } from "../../../lib/lex-privacy/mask";
import { lexFirmFromRequest } from "../../../lib/lex-privacy/firm";
import { matterPartiesFor } from "../../../lib/lex-privacy/matter-parties";
import { lexErrorResponse } from "../../../lib/lex-errors";
import { privacyFromMasked } from "../../../lib/lex-privacy/document-privacy-text";

export const runtime = "nodejs";
// Scanned PDFs are read by local OCR (about 1 to 3 s a page, up to 40 pages), then the model step.
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  try {
    const form = await request.formData();
    const folder = parseBlobRefs(form.get("blobs")).length ? await lexFolderForRequest(request) : null;
    const files = await collectLexFiles(form, "files", folder);
    if (!files.length) return Response.json({ error: "No file provided" }, { status: 400 });
    if (files.length > DEED_LIMITS.maxFiles) return Response.json({ error: `Up to ${DEED_LIMITS.maxFiles} files at a time` }, { status: 400 });
    if (files.reduce((n, f) => n + f.size, 0) > DEED_LIMITS.maxTotalBytes) return Response.json({ error: "Files too large together (max 50 MB)" }, { status: 400 });

    const typeId = String(form.get("documentType") ?? "custom");
    const profile = profileFor(getDocumentType(typeId));

    // 1. Read each file in memory. Problems are reported per file, the rest still run.
    const results: FileResult[] = [];
    const readable: Array<{ file: string; text: string }> = [];
    const ocrFiles = new Set<string>();
    for (const f of files) {
      const name = f.name;
      if ("error" in f) { results.push({ file: name, error: f.error }); continue; }
      if (f.size > DEED_LIMITS.maxFileBytes) { results.push({ file: name, error: "too-large" }); continue; }
      if (isLegacyDoc(name)) { results.push({ file: name, error: "doc-legacy" }); continue; }
      if (!(LEX_DOC_EXTS as readonly string[]).includes(docExt(name))) { results.push({ file: name, error: "unsupported" }); continue; }
      try {
        const d = await readDocText(name, await f.read());
        // A scan is only refused when local OCR also found no text.
        if (!d.text.trim()) { results.push({ file: name, error: d.scanned ? "scanned" : "empty" }); continue; }
        if (d.ocr) ocrFiles.add(name);
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
    // Per-file masking counts (types and counts only, never values) for the upload rows.
    const privacy = new Map<string, NonNullable<FileResult["privacy"]>>();
    for (const r of readable) {
      try {
        const masked = gw.mask(r.text);
        privacy.set(r.file, privacyFromMasked(masked));
        const { object } = await gw.generateObject<FileFacts>({
          schema: FileFactsSchema,
          schemaName: "DocumentFacts",
          system: extractSystem(profile),
          prompt: `File: ${gw.mask(r.file)}\n\n${masked}`,
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
    const withPrivacy = (f: FileResult): FileResult => ({ ...f, ...(privacy.has(f.file) ? { privacy: privacy.get(f.file) } : {}), ...(ocrFiles.has(f.file) ? { ocr: true } : {}) });
    return Response.json({ ...merged, files: [...results, ...merged.files].map(withPrivacy) });
  } catch (err) {
    console.error("[lex-doc-extract]", err instanceof Error ? err.name : "error");
    return lexErrorResponse(500, "extract_failed");
  }
}
