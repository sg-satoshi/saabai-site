/**
 * Builds tests/fixtures/synthetic-scan.pdf: a 2-page PDF made only of page images (no text layer),
 * like a scanner produces. Synthetic text only, no real people or client data.
 *   npx tsx scripts/make-scan-fixture.ts
 */
import { writeFileSync } from "node:fs";
import { createCanvas } from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";

const PAGES = [
  ["SYNTHETIC TEST TRUST DEED", "", "1.1 The trust is called the", "Example Test Family Trust.", "", "1.2 The trustee is Sample Trustee Pty Ltd."],
  ["SCHEDULE", "", "Settlement sum: ten dollars", "Vesting day: 80 years from the", "date of this deed."],
];

async function main() {
  const doc = await PDFDocument.create();
  for (const lines of PAGES) {
    const c = createCanvas(1240, 1754); // A4 at 150 dpi
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#111"; g.font = "44px sans-serif";
    lines.forEach((l, i) => g.fillText(l, 110, 200 + i * 70));
    const png = await doc.embedPng(c.toBuffer("image/png"));
    const page = doc.addPage([595, 842]);
    page.drawImage(png, { x: 0, y: 0, width: 595, height: 842 });
  }
  writeFileSync("tests/fixtures/synthetic-scan.pdf", await doc.save());
}
void main();
