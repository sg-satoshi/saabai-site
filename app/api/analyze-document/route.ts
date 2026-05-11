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
    let pages = 0;

    if (ext === "pdf") {
      // Dynamic require keeps pdf-parse out of the module graph at build time
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;
      const data = await pdfParse(buffer);
      text = data.text;
      pages = data.numpages ?? 0;
    } else if (ext === "docx" || ext === "doc") {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
      // Rough heuristic: ~500 words per page
      const wc = text.split(/\s+/).filter(Boolean).length;
      pages = Math.max(1, Math.round(wc / 500));
    } else if (ext === "txt") {
      text = buffer.toString("utf-8");
      const wc = text.split(/\s+/).filter(Boolean).length;
      pages = Math.max(1, Math.round(wc / 500));
    } else {
      return Response.json(
        { error: `Unsupported file type: .${ext}. Supported: .pdf, .docx, .doc, .txt` },
        { status: 400 }
      );
    }

    const normalized = text.trim();
    const wordCount = normalized.split(/\s+/).filter(Boolean).length;
    const clauses = detectClauses(normalized.toLowerCase());
    const summary = generateSummary(file.name, wordCount, pages, clauses);

    return Response.json({
      text: normalized,
      wordCount,
      pages,
      fileName: file.name,
      clauses,
      summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

type DetectedClause = {
  type: string;
  label: string;
  found: boolean;
  confidence: "high" | "medium" | "low";
  snippets: string[];
};

function detectClauses(text: string): DetectedClause[] {
  const checks: { type: string; label: string; patterns: string[]; confidence: "high" | "medium" | "low" }[] = [
    {
      type: "indemnity",
      label: "Indemnity",
      patterns: ["indemnif", "indemnity", "save harmless", "hold harmless", "indemnified against"],
      confidence: "high",
    },
    {
      type: "liability_cap",
      label: "Liability Cap",
      patterns: ["limitation of liability", "liability cap", "not liable for", "aggregate liability", "maximum liability", "cap on liability"],
      confidence: "high",
    },
    {
      type: "termination",
      label: "Termination",
      patterns: ["termination", "terminate", "notice period", "termination for convenience", "terminate immediately", "breach and termination"],
      confidence: "high",
    },
    {
      type: "confidentiality",
      label: "Confidentiality / NDA",
      patterns: ["confidential", "non-disclosure", "nda", "proprietary", "trade secret", "confidential information"],
      confidence: "high",
    },
    {
      type: "ip",
      label: "Intellectual Property",
      patterns: ["intellectual property", "ip rights", "copyright", "trademark", "patent", "moral rights", "licence to use"],
      confidence: "medium",
    },
    {
      type: "warranties",
      label: "Warranties",
      patterns: ["warrant", "represent", "covenant", "warrant that", "represents and warrants"],
      confidence: "high",
    },
    {
      type: "governing_law",
      label: "Governing Law / Jurisdiction",
      patterns: ["governing law", "jurisdiction", "venue", "arbitration", "submitted to the jurisdiction", "laws of the state"],
      confidence: "high",
    },
    {
      type: "payment_terms",
      label: "Payment Terms",
      patterns: ["payment", "invoice", "fee", "consideration", "price", "payment terms", "due date", "net 30", "interest on late payments"],
      confidence: "medium",
    },
    {
      type: "dispute_resolution",
      label: "Dispute Resolution",
      patterns: ["dispute", "mediation", "arbitration", "expert determination", "expert determination", "dispute resolution"],
      confidence: "high",
    },
    {
      type: "force_majeure",
      label: "Force Majeure",
      patterns: ["force majeure", "act of god", "beyond the control", "unforeseeable", " events beyond", "pandemic"],
      confidence: "high",
    },
    {
      type: "gst_tax",
      label: "GST / Tax",
      patterns: ["gst", "tax", "withholding tax", "exclusive of tax", "inclusive of gst", "value added tax", "tax invoice"],
      confidence: "medium",
    },
    {
      type: "privacy",
      label: "Privacy / Personal Information",
      patterns: ["privacy", "personal information", "app 11", "gdpr", "privacy act", "data protection", "sensitive information", "privacy policy"],
      confidence: "medium",
    },
  ];

  return checks.map((c) => {
    const found = c.patterns.some((p) => text.includes(p));
    const snippets: string[] = [];
    if (found) {
      for (const p of c.patterns) {
        const idx = text.indexOf(p);
        if (idx !== -1) {
          const start = Math.max(0, idx - 60);
          const end = Math.min(text.length, idx + p.length + 60);
          const snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
          if (snippet.length > 10) snippets.push(snippet);
          if (snippets.length >= 2) break;
        }
      }
    }
    return {
      type: c.type,
      label: c.label,
      found,
      confidence: c.confidence,
      snippets: snippets.slice(0, 2),
    };
  });
}

function generateSummary(
  fileName: string,
  wordCount: number,
  pages: number,
  clauses: DetectedClause[]
): string {
  const found = clauses.filter((c) => c.found);
  if (found.length === 0) {
    return `${fileName} (${wordCount.toLocaleString()} words, ~${pages} page${pages === 1 ? "" : "s"}) — no standard legal clauses detected.`;
  }
  const labels = found.map((c) => c.label).join(", ");
  return `${fileName} (${wordCount.toLocaleString()} words, ~${pages} page${pages === 1 ? "" : "s"}) — detected ${found.length} legal clause${found.length === 1 ? "" : "s"}: ${labels}.`;
}
