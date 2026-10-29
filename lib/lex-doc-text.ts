/**
 * Reads the text out of an uploaded Lex document (PDF, DOCX, TXT), in memory only. Nothing is stored.
 * PDFs keep their page numbers so extracted facts can say which page they came from.
 */
import mammoth from "mammoth";

export type DocText = { text: string; pages: number; scanned: boolean };

export const LEX_DOC_EXTS = ["pdf", "docx", "doc", "txt"] as const;

export function docExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

/** Text with "[Page N]" markers for PDFs. scanned is true when a PDF has pages but almost no text (an image scan). */
export async function readDocText(name: string, buffer: Buffer): Promise<DocText> {
  const ext = docExt(name);
  if (ext === "pdf") {
    // Dynamic require keeps pdf-parse out of the module graph at build time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require("pdf-parse") as { PDFParse: new (o: { data: Uint8Array }) => { getText(): Promise<{ pages: Array<{ num: number; text: string }> }>; destroy(): Promise<void> } };
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const r = await parser.getText();
      const pages = r.pages ?? [];
      const text = pages.map((p) => `[Page ${p.num}]\n${p.text.trim()}`).join("\n\n");
      const words = pages.reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0);
      return { text, pages: pages.length, scanned: pages.length > 0 && words < 5 * pages.length };
    } finally {
      await parser.destroy().catch(() => {});
    }
  }
  if (ext === "docx" || ext === "doc") {
    const r = await mammoth.extractRawText({ buffer });
    return { text: r.value, pages: 0, scanned: false };
  }
  if (ext === "txt") return { text: buffer.toString("utf-8"), pages: 0, scanned: false };
  throw new Error(`unsupported:${ext}`);
}
