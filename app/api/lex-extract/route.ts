import mammoth from "mammoth";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return Response.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const buffer = Buffer.from(await file.arrayBuffer());

    let text: string;

    if (ext === "pdf") {
      // Dynamic require keeps pdf-parse out of the module graph at build time
      // (it loads canvas at module level which breaks Next.js static analysis)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (ext === "docx" || ext === "doc") {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (ext === "txt") {
      text = buffer.toString("utf-8");
    } else {
      return Response.json(
        { error: `Unsupported file type: .${ext}. Supported: .pdf, .docx, .doc, .txt` },
        { status: 400 }
      );
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const clauses = detectClauses(text.toLowerCase());

    return Response.json({ text, wordCount, fileName: file.name, clauses });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
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
