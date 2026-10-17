import { PDFDocument, PDFName, PDFString, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { TIERS, type ScoreResult } from "./blueprint";

// Server-side PDF of a /score result (A4, one page, vector only, no external assets).
// Everything is computed from the answers on the server. Nothing is invented.

const NAVY = rgb(0.043, 0.035, 0.18);
const WHITE = rgb(1, 1, 1);
const MUTED = rgb(0.72, 0.75, 0.93);
const TEAL = rgb(0.384, 0.773, 0.82);
const TEAL_DK = TEAL;
const TRACK = rgb(0.13, 0.12, 0.33);
const YEL = rgb(1, 0.824, 0.247);
const LIGHT = rgb(0.79, 0.8, 0.96);

const W = 595.28;
const H = 841.89;
const M = 44;

/** Standard PDF fonts only encode WinAnsi. Map or drop anything else so drawing never throws. */
export function pdfSafe(s: string): string {
  return s
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2192/g, "->")
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7e\u00a0-\u00ff]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of pdfSafe(text).split(/\s+/).filter(Boolean)) {
    const t = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(t, size) > maxW && line) {
      out.push(line);
      line = word;
    } else line = t;
  }
  if (line) out.push(line);
  return out;
}

function roundRect(w: number, h: number, r: number): string {
  return `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
}

function drawRound(page: PDFPage, x: number, top: number, w: number, h: number, r: number, o: { color?: ReturnType<typeof rgb>; border?: ReturnType<typeof rgb>; bw?: number }) {
  page.drawSvgPath(roundRect(w, h, r), { x, y: top, color: o.color, borderColor: o.border, borderWidth: o.bw });
}

export type ScorePdfInput = {
  result: ScoreResult;
  name?: string;
  /** Used only in tests and the footer date. */
  now?: Date;
};

export async function buildScorePdf({ result: r, name, now = new Date() }: ScorePdfInput): Promise<Uint8Array> {
  const rec = TIERS[r.recommended];
  const doc = await PDFDocument.create();
  doc.setTitle(`Your AI Readiness Report: ${r.total}/100`);
  doc.setAuthor("Saabai");
  doc.setCreator("Saabai");
  const page = doc.addPage([W, H]);
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.CourierBold);
  const Y = (top: number) => H - top; // top-based y
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: NAVY });

  // Header: vector wordmark + date
  page.drawText("SAABAI", { x: M, y: Y(58), size: 20, font: bold, color: WHITE });
  page.drawText(".ai", { x: M + bold.widthOfTextAtSize("SAABAI", 20), y: Y(58), size: 20, font: bold, color: TEAL });
  page.drawText("Business, without the busywork", { x: M, y: Y(72), size: 8, font: reg, color: MUTED });
  const date = now.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Brisbane" });
  page.drawText(pdfSafe(date), { x: W - M - reg.widthOfTextAtSize(pdfSafe(date), 9), y: Y(58), size: 9, font: reg, color: MUTED });

  page.drawText("YOUR AI READINESS REPORT", { x: M, y: Y(108), size: 8.5, font: mono, color: TEAL_DK });

  // Score ring
  const cx = M + 58, cy = 190, R = 50;
  page.drawCircle({ x: cx, y: Y(cy), size: R, borderColor: TRACK, borderWidth: 11 });
  const pct = Math.max(0, Math.min(100, r.total));
  if (pct >= 100) page.drawCircle({ x: cx, y: Y(cy), size: R, borderColor: TEAL, borderWidth: 11 });
  else if (pct > 0) {
    const a = (pct / 100) * Math.PI * 2;
    const ex = R * Math.sin(a), ey = -R * Math.cos(a);
    page.drawSvgPath(`M 0 ${-R} A ${R} ${R} 0 ${pct > 50 ? 1 : 0} 1 ${ex.toFixed(3)} ${ey.toFixed(3)}`, { x: cx, y: Y(cy), borderColor: TEAL, borderWidth: 11, borderLineCap: 1 });
  }
  const tot = String(pct);
  page.drawText(tot, { x: cx - bold.widthOfTextAtSize(tot, 38) / 2, y: Y(cy + 8), size: 38, font: bold, color: WHITE });
  page.drawText("out of 100", { x: cx - reg.widthOfTextAtSize("out of 100", 8.5) / 2, y: Y(cy + 24), size: 8.5, font: reg, color: MUTED });

  // Headline + summary
  const tx = M + 150, tw = W - M - tx;
  let ty = 150;
  const hl = name ? `${pdfSafe(name.split(/\s+/)[0] || "").slice(0, 30)}, ${r.headline.charAt(0).toLowerCase()}${r.headline.slice(1)}` : r.headline;
  for (const l of wrap(hl, bold, 20, tw)) { page.drawText(l, { x: tx, y: Y(ty), size: 20, font: bold, color: WHITE }); ty += 24; }
  ty += 4;
  const sum = `${r.summary} We estimate ${r.hours} could be automated.`;
  for (const l of wrap(sum, reg, 10.5, tw)) { page.drawText(l, { x: tx, y: Y(ty), size: 10.5, font: reg, color: MUTED }); ty += 15; }

  // Breakdown
  let y = 268;
  page.drawText("Score breakdown", { x: M, y: Y(y), size: 12, font: bold, color: WHITE });
  y += 20;
  const bx = M + 150, bw = W - M - bx - 34;
  for (const b of r.breakdown) {
    page.drawText(pdfSafe(b.label), { x: M, y: Y(y), size: 10, font: reg, color: MUTED });
    drawRound(page, bx, Y(y - 7), bw, 7, 3.5, { color: TRACK });
    const fw = Math.max(7, (bw * Math.max(0, Math.min(100, b.score))) / 100);
    drawRound(page, bx, Y(y - 7), fw, 7, 3.5, { color: TEAL });
    const s = String(b.score);
    page.drawText(s, { x: W - M - bold.widthOfTextAtSize(s, 10), y: Y(y), size: 10, font: bold, color: WHITE });
    y += 22;
  }

  // Quick wins
  y += 22;
  page.drawText("Three quick wins for this week", { x: M, y: Y(y), size: 12, font: bold, color: WHITE });
  y += 22;
  r.wins.slice(0, 3).forEach((w, i) => {
    drawRound(page, M, Y(y - 10), 20, 20, 5, { color: TRACK });
    page.drawText(String(i + 1), { x: M + 7, y: Y(y + 3.5), size: 10, font: bold, color: WHITE });
    page.drawText(pdfSafe(w.title), { x: M + 32, y: Y(y), size: 10.5, font: bold, color: WHITE });
    let wy = y + 14;
    for (const l of wrap(w.body, reg, 9.5, W - M - (M + 32))) { page.drawText(l, { x: M + 32, y: Y(wy), size: 9.5, font: reg, color: MUTED }); wy += 13; }
    y = wy + 12;
  });

  // Promo block (navy, yellow edge)
  const pTop = Math.max(y + 4, 550), pH = 196, pW = W - M * 2;
  drawRound(page, M, Y(pTop), pW, pH, 12, { color: rgb(0.075, 0.067, 0.29), border: YEL, bw: 2.5 });
  page.drawText("YOUR RECOMMENDED NEXT STEP", { x: M + 22, y: Y(pTop + 28), size: 8, font: mono, color: TEAL });
  page.drawText(pdfSafe(`${rec.name} Blueprint - ${rec.priceLabel} AUD`), { x: M + 22, y: Y(pTop + 54), size: 19, font: bold, color: WHITE });
  const blurb =
    rec.id === "starter"
      ? "A fast, practical plan with your top opportunities ranked by hours and dollars saved. No call needed."
      : rec.id === "pro"
        ? "Your score suggests several automation opportunities. Pro adds Shane's review and a 30 minute call to prioritise them."
        : "With several teams, Business adds discovery sessions and a phased 12 month roadmap.";
  let py = pTop + 74;
  for (const l of wrap(`${blurb} Fee credited if you build within 30 days.`, reg, 10, pW - 44)) { page.drawText(l, { x: M + 22, y: Y(py), size: 10, font: reg, color: LIGHT }); py += 14; }
  py += 4;
  for (const f of (rec.id === "starter" ? rec.features : rec.features.slice(1)).slice(0, 3)) {
    page.drawText("+", { x: M + 22, y: Y(py), size: 10, font: bold, color: YEL });
    page.drawText(pdfSafe(f), { x: M + 36, y: Y(py), size: 9.5, font: reg, color: WHITE });
    py += 14;
  }
  const btnTop = pTop + pH - 52, btnW = 170;
  drawRound(page, M + 22, Y(btnTop), btnW, 32, 8, { color: YEL });
  const btnLabel = pdfSafe(`Get my ${rec.name} Blueprint`);
  page.drawText(btnLabel, { x: M + 22 + (btnW - bold.widthOfTextAtSize(btnLabel, 10.5)) / 2, y: Y(btnTop + 20), size: 10.5, font: bold, color: NAVY });
  const url = `https://www.saabai.ai/blueprint/checkout?tier=${rec.id}`;
  page.drawText("saabai.ai/blueprint", { x: M + 22 + btnW + 14, y: Y(btnTop + 20), size: 9.5, font: mono, color: LIGHT });
  // Clickable link over the button
  const link = doc.context.obj({
    Type: "Annot", Subtype: "Link", Rect: [M + 22, Y(btnTop + 32), M + 22 + btnW, Y(btnTop)], Border: [0, 0, 0],
    A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
  });
  page.node.set(PDFName.of("Annots"), doc.context.obj([doc.context.register(link)]));

  // Footer
  page.drawLine({ start: { x: M, y: Y(H - 74) }, end: { x: W - M, y: Y(H - 74) }, thickness: 0.6, color: TRACK });
  const foot = "Saabai, ABN 71 889 082 572, Merrimac QLD 4226. Prices in AUD. GST not applicable. Your answers are private and used only to calculate your score.";
  let fy = H - 60;
  for (const l of wrap(foot, reg, 8, W - M * 2)) { page.drawText(l, { x: M, y: Y(fy), size: 8, font: reg, color: MUTED }); fy += 11; }

  return doc.save();
}
