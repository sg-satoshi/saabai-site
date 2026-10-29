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
import { isAllowedLexBlobUrl, isLexTmpUrl, lexBlobFolder, lexBlobStoreHost, collectLexFiles, lexBlobUploadsEnabled, sweepLexTmp, parseBlobRefs, LEX_MAX_BLOB_REFS, LEX_MAX_FILE_BYTES, LEX_MAX_TOTAL_BYTES, LEX_DIRECT_MAX_BYTES, type BlobDeps } from "../lib/lex-upload";
import { LEX_BLOB_PRIVACY_COPY, LEX_PRIVACY_S5_DEFAULT } from "../lib/lex-upload-copy";
import { TIMEOUT_MESSAGE, timeoutMessage } from "../lib/lex-upload-client";
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

// Fake (non-secret) test values only.
const TOKEN = "vercel_blob_rw_AbC123store_fakesecretvalue";
const SECRET = "test-session-secret";
const ON = { LEX_BLOB_UPLOADS: "1", BLOB_READ_WRITE_TOKEN: TOKEN, SAABAI_SESSION_SECRET: SECRET };
process.env.BLOB_READ_WRITE_TOKEN = TOKEN;
process.env.SAABAI_SESSION_SECRET = SECRET;
const HOST = "abc123store.private.blob.vercel-storage.com";

test("Blob uploads are off unless the flag, token and session secret are all set", () => {
  assert.equal(lexBlobUploadsEnabled({}), false);
  assert.equal(lexBlobUploadsEnabled({ LEX_BLOB_UPLOADS: "1" }), false);
  assert.equal(lexBlobUploadsEnabled({ LEX_BLOB_UPLOADS: "1", BLOB_READ_WRITE_TOKEN: TOKEN }), false);
  assert.equal(lexBlobUploadsEnabled({ BLOB_READ_WRITE_TOKEN: TOKEN, SAABAI_SESSION_SECRET: SECRET }), false);
  assert.equal(lexBlobUploadsEnabled(ON), true);
});

const folder = lexBlobFolder("Someone@Example.com", SECRET)!;
test("the temp folder is an HMAC keyed by SAABAI_SESSION_SECRET (not a plain hash)", () => {
  assert.match(folder, /^lex-tmp\/[0-9a-f]{32}\/$/);
  assert.doesNotMatch(folder, /example/i);
  assert.equal(lexBlobFolder(" someone@example.com ", SECRET), folder);
  assert.notEqual(lexBlobFolder("Someone@Example.com", "another-secret"), folder);
  assert.equal(lexBlobFolder("Someone@Example.com", ""), null);
  assert.match(src("lib/lex-upload.ts"), /createHmac\("sha256", secret\)/);
});

test("blob URLs must be https on OUR store host, inside the caller's own folder", () => {
  assert.equal(lexBlobStoreHost(TOKEN), HOST);
  assert.equal(lexBlobStoreHost(""), null);
  assert.ok(isAllowedLexBlobUrl(`https://${HOST}/${folder}deed-x1.pdf`, folder, HOST));
  assert.ok(!isAllowedLexBlobUrl(`https://otherstore.private.blob.vercel-storage.com/${folder}deed.pdf`, folder, HOST));
  assert.ok(!isAllowedLexBlobUrl(`https://abc123store.public.blob.vercel-storage.com/${folder}deed.pdf`, folder, HOST));
  assert.ok(!isAllowedLexBlobUrl(`https://${HOST}/${lexBlobFolder("other@x.com", SECRET)}deed.pdf`, folder, HOST));
  assert.ok(!isAllowedLexBlobUrl(`http://${HOST}/${folder}deed.pdf`, folder, HOST));
  assert.ok(!isAllowedLexBlobUrl(`https://169.254.169.254/${folder}deed.pdf`, folder, HOST));
  assert.ok(!isAllowedLexBlobUrl(`https://${HOST}:8443/${folder}d.pdf`, folder, HOST));
  assert.ok(!isAllowedLexBlobUrl(`https://${HOST}/${folder}..%2F..%2Fx`, folder, HOST));
  assert.ok(!isAllowedLexBlobUrl(`https://${HOST}/${folder}d.pdf`, folder, null));
  assert.ok(isLexTmpUrl(`https://${HOST}/lex-tmp/zz/a.pdf`, HOST));
  assert.ok(!isLexTmpUrl(`https://${HOST}/other/a.pdf`, HOST));
  assert.ok(!isLexTmpUrl(`https://evil.com/lex-tmp/a.pdf`, HOST));
});

function deps(body: Buffer | null) {
  const deleted: string[] = [];
  let reads = 0;
  const d: BlobDeps = {
    read: async () => { reads++; if (!body) throw new Error("net"); const b = body; return { size: b.length, bytes: async () => b }; },
    del: async (u) => { deleted.push(...u); },
  };
  return { deleted, d, get reads() { return reads; } };
}
const url = (n: string, f = folder) => `https://${HOST}/${f}${n}`;
const form = (refs: Array<{ url: string; name: string }>) => { const fd = new FormData(); fd.append("blobs", JSON.stringify(refs)); return fd; };

test("a large private blob is read once and deleted straight after (not stored)", async () => {
  const t = deps(scan);
  const out = await collectLexFiles(form([{ url: url("scan-x1.pdf"), name: "scan.pdf" }]), "files", folder, t.d, ON);
  assert.equal(out.length, 1);
  assert.ok("read" in out[0] && (await out[0].read()).equals(scan));
  assert.equal(t.reads, 1);
  assert.deepEqual(t.deleted, [url("scan-x1.pdf")]);
  assert.match(src("lib/lex-upload.ts"), /get\(url, \{ access: "private", useCache: false \}\)/);
  assert.match(src("lib/lex-upload-client.ts"), /access: "private"/);
  assert.doesNotMatch(src("lib/lex-upload-client.ts"), /access: "public"/);
});

test("the blob is deleted even when the read fails or is too large", async () => {
  const a = deps(null);
  assert.deepEqual(await collectLexFiles(form([{ url: url("a.pdf"), name: "a.pdf" }]), "files", folder, a.d, ON), [{ name: "a.pdf", size: 0, error: "unreadable" }]);
  assert.deepEqual(a.deleted, [url("a.pdf")]);
  const b = deps(Buffer.alloc(LEX_MAX_FILE_BYTES + 1));
  assert.deepEqual(await collectLexFiles(form([{ url: url("b.pdf"), name: "b.pdf" }]), "files", folder, b.d, ON), [{ name: "b.pdf", size: 0, error: "too-large" }]);
  assert.deepEqual(b.deleted, [url("b.pdf")]);
});

test("EVERY ref is deleted: past the 20 cap, with no signed-in folder, and outside the caller's folder", async () => {
  const refs = Array.from({ length: LEX_MAX_BLOB_REFS + 5 }, (_, i) => ({ url: url(`f${i}.pdf`), name: `f${i}.pdf` }));
  assert.equal(parseBlobRefs(JSON.stringify(refs)).length, LEX_MAX_BLOB_REFS + 5);
  const t = deps(scan);
  const out = await collectLexFiles(form(refs), "files", folder, t.d, ON);
  assert.equal(t.reads, LEX_MAX_BLOB_REFS);
  assert.equal(out.length, LEX_MAX_BLOB_REFS + 5);
  assert.deepEqual(t.deleted.sort(), refs.map((r) => r.url).sort());

  const n = deps(scan);
  const noUser = await collectLexFiles(form([{ url: url("x.pdf"), name: "x.pdf" }]), "files", null, n.d, ON);
  assert.deepEqual(noUser, [{ name: "x.pdf", size: 0, error: "unreadable" }]);
  assert.equal(n.reads, 0);
  assert.deepEqual(n.deleted, [url("x.pdf")]);

  const o = deps(scan);
  const other = url("y.pdf", lexBlobFolder("x@y.com", SECRET)!);
  await collectLexFiles(form([{ url: other, name: "y.pdf" }, { url: "https://evil.com/lex-tmp/z.pdf", name: "z.pdf" }]), "files", folder, o.d, ON);
  assert.equal(o.reads, 0);
  assert.deepEqual(o.deleted, [other]); // never asks Blob to delete a URL outside our store
});

test("with the flag off, blob refs are ignored entirely (never read)", async () => {
  const t = deps(scan);
  const out = await collectLexFiles(form([{ url: url("a.pdf"), name: "a.pdf" }]), "files", folder, t.d, {});
  assert.deepEqual(out, []);
  assert.equal(t.reads, 0);
});

test("the hourly sweep deletes only lex-tmp blobs older than an hour, across pages", async () => {
  const now = Date.parse("2026-10-30T10:00:00Z");
  const ago = (m: number) => new Date(now - m * 60_000);
  const pages = [
    { blobs: [{ url: "u1", uploadedAt: ago(90) }, { url: "u2", uploadedAt: ago(10) }], cursor: "c1", hasMore: true },
    { blobs: [{ url: "u3", uploadedAt: ago(61) }, { url: "u4", uploadedAt: ago(59) }], hasMore: false },
  ];
  const prefixes: string[] = [], cursors: Array<string | undefined> = [], deleted: string[] = [];
  const r = await sweepLexTmp(now, {
    list: async (o) => { prefixes.push(o.prefix); cursors.push(o.cursor); return pages[cursors.length - 1]; },
    del: async (u) => { deleted.push(...u); },
  });
  assert.deepEqual(r, { deleted: 2, kept: 2 });
  assert.deepEqual(deleted, ["u1", "u3"]);
  assert.deepEqual(prefixes, ["lex-tmp/", "lex-tmp/"]);
  assert.deepEqual(cursors, [undefined, "c1"]);
});

test("the sweep cron is hourly and refuses without CRON_SECRET", async () => {
  const cron = JSON.parse(src("vercel.json")).crons.find((c: { path: string }) => c.path === "/api/cron/lex-tmp-sweep");
  assert.equal(cron.schedule, "0 * * * *");
  const { GET } = await import("../app/api/cron/lex-tmp-sweep/route");
  const saved = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  assert.equal((await GET(new Request("https://x/api/cron/lex-tmp-sweep", { headers: { authorization: "Bearer undefined" } }))).status, 401);
  process.env.CRON_SECRET = "test-cron";
  assert.equal((await GET(new Request("https://x/api/cron/lex-tmp-sweep"))).status, 401);
  assert.equal((await GET(new Request("https://x/api/cron/lex-tmp-sweep", { headers: { authorization: "Bearer wrong" } }))).status, 401);
  if (saved === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = saved;
});

test("the upload token route is 404 (both methods) while the flag is off", async () => {
  const saved = process.env.LEX_BLOB_UPLOADS;
  delete process.env.LEX_BLOB_UPLOADS;
  const { GET, POST } = await import("../app/api/lex-upload-token/route");
  assert.equal((await GET(new Request("https://x/api/lex-upload-token"))).status, 404);
  assert.equal((await POST(new Request("https://x/api/lex-upload-token", { method: "POST", body: "{}" }))).status, 404);
  if (saved !== undefined) process.env.LEX_BLOB_UPLOADS = saved;
});

test("a 504 from the 300 s limit shows a clear timeout message at every reading call site", () => {
  assert.equal(timeoutMessage({ status: 504 }), TIMEOUT_MESSAGE);
  assert.equal(timeoutMessage({ status: 200 }), null);
  assert.match(TIMEOUT_MESSAGE, /5 minute limit/);
  const sites = src("app/lex/page.tsx") + src("app/lex/_components/Review.tsx") + src("app/lex/_components/DraftWorkspace.tsx");
  assert.equal((sites.match(/timeoutMessage\((res|extractRes)\)/g) ?? []).length, 4);
});

test("sizes are written as '25 MB' / '50 MB' everywhere", () => {
  for (const f of ["app/lex/_components/DraftWorkspace.tsx", "app/lex/_components/Review.tsx", "app/api/lex-extract/route.ts", "app/api/lex-doc-extract/route.ts", "lib/lex-upload-client.ts"]) {
    assert.doesNotMatch(src(f), /\b(25|50)MB\b/, f);
  }
});

test("privacy copy: unchanged while the flag is off; the new wording only when on", () => {
  const p = src("app/privacy/page.tsx");
  assert.match(p, /lexBlobUploadsEnabled\(\) \? LEX_BLOB_PRIVACY_COPY : "We do not store uploaded files on our servers\."/);
  assert.equal(LEX_PRIVACY_S5_DEFAULT, "We do not store uploaded files on our servers.");
  assert.equal(LEX_BLOB_PRIVACY_COPY, "Large files are held briefly in secure temporary storage while being read, then deleted automatically within an hour.");
  const w = src("app/lex/_components/DraftWorkspace.tsx");
  assert.match(w, /largeOn \? LEX_BLOB_PRIVACY_COPY : "Uploaded files are not kept\."/);
  assert.match(w, /useState\(false\)/);
  assert.match(src("lib/lex-upload-client.ts"), /if \(!r \|\| !r\.ok\) return \{ enabled: false \}/);
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
  assert.match(r, /if \(!actor\) return null;/);
  assert.match(r, /if \(!folder\) return Response\.json\(\{ error: "Not authenticated" \}, \{ status: 401 \}\)/);
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
