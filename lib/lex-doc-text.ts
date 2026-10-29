/**
 * Reads the text out of an uploaded Lex document (PDF, DOCX, TXT), in memory only. Nothing is stored.
 * PDFs keep their page numbers so extracted facts can say which page they came from.
 *
 * Scanned PDFs (pages but almost no text layer) fall back to local OCR: pages are rendered with
 * pdf-parse (pdfjs + @napi-rs/canvas) and read with tesseract.js using bundled English data.
 * No outside vision model sees the page images. The OCR text then goes through the same Lex
 * privacy masking as any other document text.
 */
import mammoth from "mammoth";

export type DocText = {
  text: string;
  pages: number;
  /** True when the PDF has no usable text layer (before OCR). */
  scanned: boolean;
  /** True when the text came from OCR, so the UI can ask the user to check it. */
  ocr: boolean;
  /** Pages past OCR_MAX_PAGES that were not read. */
  ocrSkippedPages: number;
};

export const LEX_DOC_EXTS = ["pdf", "docx", "txt"] as const;
/** Old binary Word files: mammoth can only read .docx, so these are refused with a clear message. */
export const LEX_LEGACY_DOC_EXTS = ["doc"] as const;
export const LEGACY_DOC_MESSAGE = "Old Word .doc files can't be read. Save it as .docx or PDF and upload it again.";
export const SCANNED_FAIL_MESSAGE = "This looks like a scanned image and Lex could not read any text from it, even with text recognition. Try a clearer scan, or a text PDF or Word copy.";
export { LEX_DOC_ACCEPT } from "./lex-doc-accept";

export const OCR_MAX_PAGES = 40;
/** Render width in px. About 200 dpi for an A4 page, a good balance of accuracy and speed. */
export const OCR_RENDER_WIDTH = 1650;

export function docExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function isLegacyDoc(name: string): boolean {
  return (LEX_LEGACY_DOC_EXTS as readonly string[]).includes(docExt(name));
}

export function isScannedText(pages: Array<{ text: string }>): boolean {
  const words = pages.reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0);
  return pages.length > 0 && words < 5 * pages.length;
}

type PdfParser = {
  getText(): Promise<{ pages: Array<{ num: number; text: string }> }>;
  getScreenshot(p: { partial?: number[]; desiredWidth?: number; imageBuffer?: boolean; imageDataUrl?: boolean }): Promise<{ pages: Array<{ pageNumber: number; data: Uint8Array }> }>;
  destroy(): Promise<void>;
};

/** Pluggable OCR engine so tests can check the flow without the 3 MB model. */
export type OcrEngine = (images: Uint8Array[]) => Promise<string[]>;

export const tesseractOcr: OcrEngine = async (images) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createWorker } = require("tesseract.js") as typeof import("tesseract.js");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { join, dirname } = require("node:path") as typeof import("node:path");
  // Bundled best_int English data (about 3 MB, gzipped), read from disk: no network fetch, no cache writes.
  const dataDir = join(dirname(require.resolve("@tesseract.js-data/eng/package.json")), "4.0.0_best_int");
  const worker = await createWorker("eng", 1, { langPath: dataDir, cacheMethod: "none", gzip: true });
  try {
    const out: string[] = [];
    for (const img of images) {
      const { data } = await worker.recognize(Buffer.from(img));
      out.push(data.text ?? "");
    }
    return out;
  } finally {
    await worker.terminate().catch(() => {});
  }
};

/** Text with "[Page N]" markers for PDFs. */
export async function readDocText(name: string, buffer: Buffer, opts?: { ocr?: OcrEngine | false }): Promise<DocText> {
  const ext = docExt(name);
  if (ext === "pdf") {
    // Dynamic require keeps pdf-parse out of the module graph at build time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require("pdf-parse") as { PDFParse: new (o: { data: Uint8Array }) => PdfParser };
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const r = await parser.getText();
      const pages = r.pages ?? [];
      const scanned = isScannedText(pages);
      const engine = opts?.ocr === false ? null : (opts?.ocr ?? tesseractOcr);
      if (scanned && engine) {
        const nums = pages.map((p) => p.num).slice(0, OCR_MAX_PAGES);
        const shots = await parser.getScreenshot({ partial: nums, desiredWidth: OCR_RENDER_WIDTH, imageBuffer: true, imageDataUrl: false });
        const texts = await engine(shots.pages.map((s) => s.data));
        const ocrPages = shots.pages.map((s, i) => ({ num: s.pageNumber, text: (texts[i] ?? "").trim() }));
        const hasText = ocrPages.some((p) => p.text.split(/\s+/).filter(Boolean).length > 0);
        return {
          text: hasText ? ocrPages.map((p) => `[Page ${p.num}]\n${p.text}`).join("\n\n") : "",
          pages: pages.length,
          scanned: true,
          ocr: hasText,
          ocrSkippedPages: Math.max(0, pages.length - nums.length),
        };
      }
      const text = pages.map((p) => `[Page ${p.num}]\n${p.text.trim()}`).join("\n\n");
      return { text: scanned ? "" : text, pages: pages.length, scanned, ocr: false, ocrSkippedPages: 0 };
    } finally {
      await parser.destroy().catch(() => {});
    }
  }
  if (ext === "docx") {
    const r = await mammoth.extractRawText({ buffer });
    return { text: r.value, pages: 0, scanned: false, ocr: false, ocrSkippedPages: 0 };
  }
  if (ext === "txt") return { text: buffer.toString("utf-8"), pages: 0, scanned: false, ocr: false, ocrSkippedPages: 0 };
  throw new Error(`unsupported:${ext}`);
}
