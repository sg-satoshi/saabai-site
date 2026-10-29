import { LEGACY_DOC_MESSAGE, SCANNED_FAIL_MESSAGE, LEX_DOC_EXTS, isLegacyDoc, readDocText } from "../../../lib/lex-doc-text";
import { LEX_MAX_FILE_BYTES, collectLexFiles, lexFolderForRequest, parseBlobRefs } from "../../../lib/lex-upload";
import { previewDocumentMasking } from "../../../lib/lex-privacy/document-preview";
import { matterPartiesFor } from "../../../lib/lex-privacy/matter-parties";

export const runtime = "nodejs";
// Scanned PDFs are read by local OCR (up to 40 pages), so this needs well over the old 30 s.
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const folder = parseBlobRefs(formData.get("blobs")).length ? await lexFolderForRequest(request) : null;
    const file = (await collectLexFiles(formData, "file", folder))[0];

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    if ("error" in file) {
      return Response.json({ error: file.error === "too-large" ? "File too large (max 25MB)" : "Lex could not read that file." }, { status: 400 });
    }
    if (file.size > LEX_MAX_FILE_BYTES) {
      return Response.json({ error: "File too large (max 25MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (isLegacyDoc(file.name)) {
      return Response.json({ error: LEGACY_DOC_MESSAGE }, { status: 400 });
    }
    if (!(LEX_DOC_EXTS as readonly string[]).includes(ext)) {
      return Response.json(
        { error: `Unsupported file type: .${ext}. Supported: .pdf, .docx, .txt` },
        { status: 400 }
      );
    }
    // Shared reader (pdf-parse v2 API, local OCR for scans). Page markers are dropped here so the review text is unchanged.
    const doc = await readDocText(file.name, await file.read());
    const text = doc.text.replace(/^\[Page \d+\]\n/gm, "");
    if (!text.trim()) {
      return Response.json(
        { error: doc.scanned ? SCANNED_FAIL_MESSAGE : "No text could be read from this file.", scanned: doc.scanned },
        { status: 422 }
      );
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const clauses = detectClauses(text.toLowerCase());

    // Privacy preview: counts of what will be masked before any model sees this file. Never the values.
    // The text itself is returned only to the signed-in user who uploaded it; every Lex route masks it again server side.
    const privacy = await previewDocumentMasking(text, await matterPartiesFor(request, formData.get("matterId")).catch(() => []), { budgetMs: 3000 });

    return Response.json({ text, wordCount, fileName: file.name, clauses, privacy, scanned: doc.scanned, ocr: doc.ocr, ocrSkippedPages: doc.ocrSkippedPages });
  } catch (err) {
    console.error("[lex-extract]", err);
    return Response.json({ error: "extract_failed" }, { status: 500 });
  }
}

function detectClauses(text: string): { label: string; found: boolean }[] {
  const checks = [
    { label: "Indemnity clauses", patterns: ["indemnif", "indemnity", "save harmless"] },
    { label: "Limitation of liability", patterns: ["limitation of liability", "liability cap", "not liable for"] },
    { label: "Termination", patterns: ["termination", "terminate", "notice period"] },
    { label: "Confidentiality / NDA", patterns: ["confidential", "non-disclosure", "nda", "proprietary"] },
    { label: "Intellectual property", patterns: ["intellectual property", "ip rights", "copyright", "trademark"] },
    { label: "Warranties", patterns: ["warrant", "represent", "covenant"] },
    { label: "Governing law / Jurisdiction", patterns: ["governing law", "jurisdiction", "venue", "arbitration"] },
    { label: "Payment terms", patterns: ["payment", "invoice", "fee", "consideration", "price"] },
    { label: "Dispute resolution", patterns: ["dispute", "mediation", "arbitration", "expert determination"] },
    { label: "Force majeure", patterns: ["force majeure", "act of god", "beyond the control"] },
    { label: "GST / Tax", patterns: ["gst", "tax", "withholding tax", "exclusive of tax"] },
    { label: "Privacy / Personal information", patterns: ["privacy", "personal information", "app 11", "gdpr"] },
  ];

  return checks
    .filter(c => c.patterns.some(p => text.includes(p)))
    .map(c => ({ label: c.label, found: true }));
}
