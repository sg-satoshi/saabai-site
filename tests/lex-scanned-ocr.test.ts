/**
 * Lex scanned PDFs: local OCR fallback, 40-page cap, .doc refusal, large-file Blob path (fetched once,
 * then deleted), and the routes only refusing a scan when OCR also finds nothing.
 * Synthetic fixture only (tests/fixtures/synthetic-scan.pdf, made by scripts/make-scan-fixture.ts
 * from images, no text layer). No network, no AI calls.
 *   npx tsx --test tests/lex-scanned-ocr.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { readDocText, LEX_DOC_EXTS, isLegacyDoc, OCR_MAX_PAGES, LEX_DOC_ACCEPT, type OcrEngine } from "../lib/lex-doc-text";
import { isAllowedLexBlobUrl, lexBlobFolder, takeLexBlob, collectLexFiles, lexBlobUploadsEnabled, LEX_MAX_FILE_BYTES, LEX_MAX_TOTAL_BYTES, LEX_DIRECT_MAX_BYTES } from "../lib/lex-upload";
import { DEED_LIMITS } from "../lib/lex-doc-extract";

const scan = readFileSync("tests/fixtures/synthetic-scan.pdf");
const src = (p: string) => readFileSync(p, "utf8");

test("the fixture really is image only (no text layer)", async () => {
  const d = await readDocText("scan.pdf", scan, { ocr: false });
  assert.equal(d.scanned, true);
  assert.equal(d.text, "");
  assert.equal(d.pages, 2);
});

test("a scanned PDF is read by local OCR, with page markers", { timeout: 60_000 }, async () => {
  const d = await readDocText("scan.pdf", scan);
  assert.equal(d.scanned, true);
  assert.equal(d.ocr, true);
  assert.match(d.text, /^\[Page 1\]\n/);
  assert.match(d.text, /\[Page 2\]\n/);
  assert.match(d.text, /SYNTHETIC TEST TRUST DEED/);
  assert.match(d.text, /Sample Trustee Pty Ltd/);
});

async function blankPdf(n: number): Promise<Buffer> {
  const d = await PDFDocument.create();
  for (let i = 0; i < n; i++) d.addPage([100, 140]);
  return Buffer.from(await d.save());
}

test(`OCR stops at ${OCR_MAX_PAGES} pages and reports the rest as skipped`, { timeout: 60_000 }, async () => {
  let seen = 0;
  const engine: OcrEngine = async (imgs) => { seen = imgs.length; return imgs.map((_, i) => `page text ${i + 1}`); };
  const d = await readDocText("long.pdf", await blankPdf(OCR_MAX_PAGES + 2), { ocr: engine });
  assert.equal(OCR_MAX_PAGES, 40);
  assert.equal(seen, 40);
  assert.equal(d.ocrSkippedPages, 2);
  assert.match(d.text, /\[Page 40\]\npage text 40/);
  assert.doesNotMatch(d.text, /\[Page 41\]/);
});

test("a scan OCR can't read stays scanned with no text (so routes can refuse it)", async () => {
  const d = await readDocText("blank.pdf", await blankPdf(2), { ocr: async (imgs) => imgs.map(() => "  ") });
  assert.equal(d.scanned, true);
  assert.equal(d.ocr, false);
  assert.equal(d.text, "");
});

test(".doc is no longer accepted anywhere, with a clear message", async () => {
  assert.ok(!(LEX_DOC_EXTS as readonly string[]).includes("doc"));
  assert.equal(isLegacyDoc("old.DOC"), true);
  assert.equal(LEX_DOC_ACCEPT, ".pdf,.docx,.txt");
  await assert.rejects(readDocText("old.doc", Buffer.from("x")));
  for (const f of ["app/lex/_components/States.tsx", "app/lex/_components/DraftWorkspace.tsx", "app/lex/_components/Review.tsx"]) {
    assert.doesNotMatch(src(f), /accept="\.pdf,\.docx,\.doc,\.txt"/, f);
  }
  assert.match(src("app/lex/_components/DraftWorkspace.tsx"), /"doc-legacy": "Old Word \.doc files can't be read/);
  assert.match(src("app/api/lex-extract/route.ts"), /isLegacyDoc\(file\.name\)/);
});

test("limits: 25 MB a file, 50 MB together, direct form path only up to 4 MB", () => {
  assert.equal(LEX_MAX_FILE_BYTES, 25 * 1024 * 1024);
  assert.equal(LEX_MAX_TOTAL_BYTES, 50 * 1024 * 1024);
  assert.ok(LEX_DIRECT_MAX_BYTES < 4.5 * 1024 * 1024);
  assert.equal(DEED_LIMITS.maxFileBytes, LEX_MAX_FILE_BYTES);
  assert.equal(DEED_LIMITS.maxTotalBytes, LEX_MAX_TOTAL_BYTES);
});

test("Blob uploads are off unless the flag and token are both set", () => {
  assert.equal(lexBlobUploadsEnabled({}), false);
  assert.equal(lexBlobUploadsEnabled({ LEX_BLOB_UPLOADS: "1" }), false);
  assert.equal(lexBlobUploadsEnabled({ BLOB_READ_WRITE_TOKEN: "x" }), false);
  assert.equal(lexBlobUploadsEnabled({ LEX_BLOB_UPLOADS: "1", BLOB_READ_WRITE_TOKEN: "x" }), true);
});

const folder = lexBlobFolder("Someone@Example.com");
test("blob URLs must be Vercel Blob, https, inside the caller's own hashed folder", () => {
  assert.match(folder, /^lex-tmp\/[0-9a-f]{24}\/$/);
  assert.doesNotMatch(folder, /example/i);
  assert.ok(isAllowedLexBlobUrl(`https://abc123.public.blob.vercel-storage.com/${folder}deed-x1.pdf`, folder));
  assert.ok(!isAllowedLexBlobUrl(`https://abc123.public.blob.vercel-storage.com/${lexBlobFolder("other@x.com")}deed.pdf`, folder));
  assert.ok(!isAllowedLexBlobUrl(`http://abc123.public.blob.vercel-storage.com/${folder}deed.pdf`, folder));
  assert.ok(!isAllowedLexBlobUrl(`https://169.254.169.254/${folder}deed.pdf`, folder));
  assert.ok(!isAllowedLexBlobUrl(`https://evil.com/${folder}deed.pdf`, folder));
  assert.ok(!isAllowedLexBlobUrl(`https://abc.public.blob.vercel-storage.com:8443/${folder}d.pdf`, folder));
  assert.ok(!isAllowedLexBlobUrl(`https://abc.public.blob.vercel-storage.com/${folder}..%2F..%2Fx`, folder));
});

function deps(body: Buffer | null, status = 200) {
  const deleted: string[] = [];
  let fetched = 0;
  return {
    deleted, get fetched() { return fetched; },
    d: {
      fetch: (async () => { fetched++; if (!body) throw new Error("net"); return new Response(new Uint8Array(body), { status }); }) as unknown as typeof fetch,
      del: async (u: string) => { deleted.push(u); },
    },
  };
}
const url = `https://abc123.public.blob.vercel-storage.com/${folder}scan-x1.pdf`;

test("a large file is fetched once and the blob is deleted straight after (not stored)", async () => {
  const t = deps(scan);
  const r = await takeLexBlob({ url, name: "scan.pdf" }, folder, t.d);
  assert.ok("buffer" in r && r.buffer.equals(scan));
  assert.deepEqual(t.deleted, [url]);
});

test("the blob is deleted even when the read fails or is too large", async () => {
  const a = deps(null);
  assert.deepEqual(await takeLexBlob({ url, name: "a.pdf" }, folder, a.d), { name: "a.pdf", error: "unreadable" });
  assert.deepEqual(a.deleted, [url]);
  const b = deps(Buffer.alloc(LEX_MAX_FILE_BYTES + 1));
  assert.deepEqual(await takeLexBlob({ url, name: "b.pdf" }, folder, b.d), { name: "b.pdf", error: "too-large" });
  assert.deepEqual(b.deleted, [url]);
});

test("a blob outside the caller's folder is never fetched, and needs a signed-in Lex user", async () => {
  const t = deps(scan);
  const other = `https://abc123.public.blob.vercel-storage.com/${lexBlobFolder("x@y.com")}a.pdf`;
  assert.deepEqual(await takeLexBlob({ url: other, name: "a.pdf" }, folder, t.d), { name: "a.pdf", error: "unreadable" });
  assert.equal(t.fetched, 0);
  const fd = new FormData();
  fd.append("blobs", JSON.stringify([{ url, name: "scan.pdf" }]));
  const noUser = await collectLexFiles(fd, "files", null, t.d);
  assert.deepEqual(noUser, [{ name: "scan.pdf", size: 0, error: "unreadable" }]);
  assert.equal(t.fetched, 0);
});

test("routes: only refuse a scan when OCR finds nothing; OCR text goes through masking; longer time limit", () => {
  const doc = src("app/api/lex-doc-extract/route.ts");
  assert.doesNotMatch(doc, /if \(d\.scanned\) \{ results\.push/);
  assert.match(doc, /if \(!d\.text\.trim\(\)\) \{ results\.push\(\{ file: name, error: d\.scanned \? "scanned" : "empty" \}\)/);
  assert.match(doc, /const masked = gw\.mask\(r\.text\)/);
  assert.match(doc, /maxDuration = 300/);
  const ex = src("app/api/lex-extract/route.ts");
  assert.match(ex, /doc\.scanned \? SCANNED_FAIL_MESSAGE/);
  assert.match(ex, /status: 422/);
  assert.match(ex, /maxDuration = 300/);
  // No outside vision model: the reader never calls a model or sends images anywhere.
  const reader = src("lib/lex-doc-text.ts");
  assert.doesNotMatch(reader, /from "ai"|@ai-sdk|fetch\(|generateText|generateObject/);
  assert.match(reader, /cacheMethod: "none"/);
});

test("the upload token route checks the Lex user itself and binds tokens to their folder", () => {
  const r = src("app/api/lex-upload-token/route.ts");
  assert.match(r, /resolveReviewActor\(req\)/);
  assert.match(r, /if \(!actor\) return Response\.json\(\{ error: "Not authenticated" \}, \{ status: 401 \}\)/);
  assert.match(r, /pathname\.startsWith\(folder\)/);
  assert.match(r, /maximumSizeInBytes: LEX_MAX_FILE_BYTES/);
  assert.match(r, /lexBlobUploadsEnabled\(\)/);
});

test("UI: OCR note shows on read files; scanned error wording is for when OCR also failed", () => {
  assert.match(src("lib/lex-upload-client.ts"), /OCR_NOTE = "Read from a scan, please check the details\."/);
  const w = src("app/lex/_components/DraftWorkspace.tsx");
  assert.match(w, /f\.ocr && <small className="lxw-ocr">\{OCR_NOTE\}/);
  assert.match(w, /even with text recognition/);
  assert.match(src("app/lex/_components/States.tsx"), /attachment\.ocr \?/);
  assert.match(src("app/lex/_components/Review.tsx"), /\(p\.ocr \|\| cmpOcr\) &&/);
});
