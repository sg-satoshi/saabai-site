import { entitySender, GST } from "@/lib/entity";
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { TIERS, type ScoreResult, type Category } from "./blueprint";
import { ARROW_PATH, ARROW_PATH_FLIPPED } from "./score-arrow";
import { LOGO_ASPECT, LOGO_PNG_BASE64 } from "./score-logo";
import type { ScanReport } from "./site-scan/types";
import { AREAS, AREA_LABEL, DISCLAIMER, RATING_LABEL } from "./site-scan/score";
import { OFFERS } from "./site-scan/copy";

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

/**
 * Page 2 copy per scored area. Causes are typical patterns, not claims about this reader's business.
 * Quick fixes reuse the quiz's own win suggestions. Hours are never invented: they are the quiz's
 * hours-saved range (lib/blueprint.ts), split by how much room each area has.
 */
export const AREA_COPY: Record<string, { cause: string; fixes: string[] }> = {
  customers: {
    cause: "Enquiries arrive by phone, text, forms and socials, and replies wait until someone is free. Slow or missed follow up quietly costs jobs.",
    fixes: ["Send website and chatbot enquiries to one inbox or alert", "Auto reply to website enquiries with your booking link"],
  },
  admin: {
    cause: "The same emails, quotes and invoice chases get typed out by hand, one at a time, usually after hours.",
    fixes: ["Turn your top 5 repeat emails into templates, with AI drafting the first version", "Turn on invoice reminders in your accounting software"],
  },
  tools: {
    cause: "Booking, CRM and accounting tools do not talk to each other, so the same details are re-typed and checked by hand.",
    fixes: ["Link booking, CRM and accounting so data is typed in once (quoted separately)", "Make the website capture leads and alert you instantly"],
  },
  team: {
    cause: "Changes stall when nobody owns them, the first step feels big, or nobody checks whether the change actually saved time.",
    fixes: ["Pick one quick win and measure it", "Give the team an AI assistant for emails, notes and quotes (basic training included)"],
  },
};

export const STEPS: { name: string; body: string }[] = [
  { name: "Audit", body: "Fact-find, your website and your tools, in the Blueprint." },
  { name: "Prioritise", body: "Opportunities ranked by estimated time and cost saved." },
  { name: "Build", body: "Fix the biggest leak first. Sites take 2 to 3 weeks." },
  { name: "Check", body: "Review results together, then go again." },
];

/** Parses the quiz's "X to Y hours a week" range. */
export function parseHours(h: string): [number, number] {
  const m = h.match(/(\d+)\s*to\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : [0, 0];
}

/** Hand-painted yellow brush arrow. Top-left of its 600x200 box is (x, top); scale is uniform. A darker offset pass gives a painted, layered edge. */
function drawBrushArrow(page: PDFPage, x: number, top: number, scale: number, flip = false) {
  const base = H - top;
  const d = flip ? ARROW_PATH_FLIPPED : ARROW_PATH;
  page.drawSvgPath(d, { x: x + 1.6, y: base - 1.4, scale, color: rgb(0.96, 0.71, 0), borderColor: rgb(0.96, 0.71, 0), borderWidth: 0.8, opacity: 0.85 });
  page.drawSvgPath(d, { x, y: base, scale, color: YEL, borderColor: YEL, borderWidth: 0.9 });
}

const half = (n: number) => Math.round(n * 2) / 2;
const fmtH = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Splits the quiz hours range across the scored areas in proportion to each area's headroom (100 - score). */
export function areaHours(r: ScoreResult): { id: Category; label: string; score: number; lo: number; hi: number; text: string; share: number }[] {
  const [L, H] = parseHours(r.hours);
  const gaps = r.breakdown.map((b) => Math.max(1, 100 - b.score));
  const sum = gaps.reduce((a, b) => a + b, 0);
  return r.breakdown.map((b, i) => {
    const share = gaps[i] / sum;
    const lo = half(L * share);
    const hi = Math.max(half(H * share), lo + 0.5);
    return { ...b, lo, hi, share, text: `${fmtH(lo)} to ${fmtH(hi)}` };
  });
}

export type ScorePdfInput = {
  result: ScoreResult;
  name?: string;
  /** Website scan report. When present, page 3 "Your website report" is added. */
  scan?: ScanReport | null;
  /** Used only in tests and the footer date. */
  now?: Date;
};

export const PAGE2_LIMIT = 760; // top-based y where page 2 content must end (footer starts below)

export async function buildScorePdf(input: ScorePdfInput): Promise<Uint8Array> {
  return (await buildScorePdfDetailed(input)).bytes;
}

export async function buildScorePdfDetailed({ result: r, name, scan, now = new Date() }: ScorePdfInput): Promise<{ bytes: Uint8Array; page2Bottom: number }> {
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
  const logo = await doc.embedPng(Buffer.from(LOGO_PNG_BASE64, "base64"));
  const logoW = 132, logoH = logoW / LOGO_ASPECT;
  page.drawImage(logo, { x: M, y: Y(36 + logoH), width: logoW, height: logoH });
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
  const sum = `${r.summary} A rough estimate is that you could free up ${r.hours}, not a guarantee.`;
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
  y += 14;
  page.drawText("Three quick wins for this week", { x: M, y: Y(y), size: 12, font: bold, color: WHITE });
  y += 22;
  r.wins.slice(0, 3).forEach((w, i) => {
    drawRound(page, M, Y(y - 10), 20, 20, 5, { color: TRACK });
    page.drawText(String(i + 1), { x: M + 7, y: Y(y + 3.5), size: 10, font: bold, color: WHITE });
    page.drawText(pdfSafe(w.title), { x: M + 32, y: Y(y), size: 10.5, font: bold, color: WHITE });
    let wy = y + 14;
    for (const l of wrap(w.body, reg, 9.5, W - M - (M + 32))) { page.drawText(l, { x: M + 32, y: Y(wy), size: 9.5, font: reg, color: MUTED }); wy += 13; }
    y = wy + 8;
  });

  // Brush arrow from the quick wins toward the Blueprint box
  drawBrushArrow(page, W - M - 600 * 0.42, 560 - 84 + 2, 0.42, true);

  // Promo block (navy, yellow edge)
  const pTop = Math.max(y + 4, 560), pH = 196, pW = W - M * 2;
  drawRound(page, M, Y(pTop), pW, pH, 12, { color: rgb(0.075, 0.067, 0.29), border: YEL, bw: 2.5 });
  page.drawText("YOUR RECOMMENDED NEXT STEP", { x: M + 22, y: Y(pTop + 28), size: 8, font: mono, color: TEAL });
  page.drawText(pdfSafe(`${rec.name} Blueprint - ${rec.priceLabel} AUD`), { x: M + 22, y: Y(pTop + 54), size: 19, font: bold, color: WHITE });
  const blurb =
    rec.id === "starter"
      ? "A fast, practical plan with your top opportunities ranked by estimated time and cost saved. No call needed."
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
  const foot = `${entitySender()}. ${GST.pricesLine} Your answers are private and used only to calculate your score.`;
  let fy = H - 60;
  for (const l of wrap(foot, reg, 8, W - M * 2)) { page.drawText(l, { x: M, y: Y(fy), size: 8, font: reg, color: MUTED }); fy += 11; }

  // ---------------- Page 2: where the time goes + how we work ----------------
  const p2 = doc.addPage([W, H]);
  const Y2 = (top: number) => H - top;
  p2.drawRectangle({ x: 0, y: 0, width: W, height: H, color: NAVY });
  p2.drawImage(logo, { x: M, y: Y2(36 + logoH), width: logoW, height: logoH });
  p2.drawText(pdfSafe(date), { x: W - M - reg.widthOfTextAtSize(pdfSafe(date), 9), y: Y2(58), size: 9, font: reg, color: MUTED });
  p2.drawText("WHERE THE TIME GOES", { x: M, y: Y2(100), size: 8.5, font: mono, color: TEAL });
  const [Lh, Hh] = parseHours(r.hours);
  let q = 124;
  for (const l of wrap(`Where your ${Lh} to ${Hh} hours a week could come from`, bold, 19, W - M * 2)) { p2.drawText(l, { x: M, y: Y2(q), size: 19, font: bold, color: WHITE }); q += 23; }
  q += 2;
  for (const l of wrap("An illustrative split of your estimate, by how much room each area has. The biggest gap comes first.", reg, 9.5, W - M * 2)) { p2.drawText(l, { x: M, y: Y2(q), size: 9.5, font: reg, color: MUTED }); q += 13; }
  q += 4;

  const areas = areaHours(r).sort((a, b) => b.share - a.share);
  const colX = M + 132, colW = (W - M - colX - 16 - 14) / 2;
  areas.forEach((a, idx) => {
    const copy = AREA_COPY[a.id] ?? { cause: "", fixes: [] };
    const causeL = wrap(copy.cause, reg, 8.5, colW);
    const fixL = copy.fixes.flatMap((f) => wrap(f, reg, 8.5, colW - 10).map((t, i) => ({ t, first: i === 0 })));
    const rows = Math.max(causeL.length, fixL.length);
    const h = Math.max(60, 34 + rows * 11.5 + 2);
    drawRound(p2, M, Y2(q), W - M * 2, h, 10, { color: rgb(0.075, 0.067, 0.29), border: idx === 0 ? YEL : rgb(0.2, 0.19, 0.45), bw: idx === 0 ? 1.5 : 0.8 });
    p2.drawText(pdfSafe(a.label), { x: M + 14, y: Y2(q + 22), size: 10.5, font: bold, color: WHITE });
    p2.drawText(`${a.text}`, { x: M + 14, y: Y2(q + 46), size: 17, font: bold, color: TEAL });
    p2.drawText("hours a week (est.)", { x: M + 14, y: Y2(q + 58), size: 7.5, font: reg, color: MUTED });
    if (idx === 0) p2.drawText("BIGGEST LEAK", { x: M + 14, y: Y2(q + h - 9), size: 6.5, font: mono, color: YEL });
    p2.drawText("WHY TIME IS LOST", { x: colX, y: Y2(q + 20), size: 6.5, font: mono, color: TEAL });
    p2.drawText("FIRST QUICK FIXES", { x: colX + colW + 14, y: Y2(q + 20), size: 6.5, font: mono, color: TEAL });
    causeL.forEach((l, i) => p2.drawText(l, { x: colX, y: Y2(q + 33 + i * 11.5), size: 8.5, font: reg, color: LIGHT }));
    fixL.forEach((l, i) => {
      if (l.first) p2.drawText("+", { x: colX + colW + 14, y: Y2(q + 33 + i * 11.5), size: 8.5, font: bold, color: YEL });
      p2.drawText(l.t, { x: colX + colW + 14 + 10, y: Y2(q + 33 + i * 11.5), size: 8.5, font: reg, color: WHITE });
    });
    q += h + 6;
  });

  // How we work strip
  q += 6;
  p2.drawText("How we find wins and keep improving", { x: M, y: Y2(q + 8), size: 12, font: bold, color: WHITE });
  q += 18;
  const sw = (W - M * 2 - 3 * 8) / 4;
  let sh = 0;
  const stepLines = STEPS.map((st) => wrap(st.body, reg, 8, sw - 20));
  sh = 34 + Math.max(...stepLines.map((l) => l.length)) * 10.5 + 8;
  STEPS.forEach((st, i) => {
    const x = M + i * (sw + 8);
    drawRound(p2, x, Y2(q), sw, sh, 8, { color: rgb(0.075, 0.067, 0.29), border: rgb(0.2, 0.19, 0.45), bw: 0.8 });
    p2.drawText(`${i + 1}`, { x: x + 10, y: Y2(q + 20), size: 11, font: bold, color: TEAL });
    p2.drawText(st.name, { x: x + 24, y: Y2(q + 20), size: 11, font: bold, color: WHITE });
    stepLines[i].forEach((l, k) => p2.drawText(l, { x: x + 10, y: Y2(q + 34 + k * 10.5), size: 8, font: reg, color: LIGHT }));
  });
  q += sh + 10;
  const tools = "Every Saabai website build is AI-ready and SEO-ready, with a reviews carousel, AI chatbot and a basic training session. Automations are quoted separately. For review requests or call and text capture, use outside tools.";
  for (const l of wrap(tools, reg, 8.5, W - M * 2)) { p2.drawText(l, { x: M, y: Y2(q + 8), size: 8.5, font: reg, color: MUTED }); q += 11.5; }
  q += 4;

  // Brush arrow pointing down to the closing CTA button
  drawBrushArrow(p2, W - M - 18 - 150 - 40, q - 1, 0.3);
  q += 52;

  // Closing CTA (navy, yellow edge, yellow button)
  const cH = 58;
  drawRound(p2, M, Y2(q), W - M * 2, cH, 12, { color: rgb(0.075, 0.067, 0.29), border: YEL, bw: 2 });
  p2.drawText(pdfSafe(`Next step: the ${rec.name} Blueprint, ${rec.priceLabel} AUD`), { x: M + 18, y: Y2(q + 26), size: 12.5, font: bold, color: WHITE });
  p2.drawText("Fee credited if you build within 30 days.", { x: M + 18, y: Y2(q + 42), size: 8.5, font: reg, color: LIGHT });
  const b2W = 150, b2X = W - M - 18 - b2W;
  drawRound(p2, b2X, Y2(q + 15), b2W, 32, 8, { color: YEL });
  const b2L = pdfSafe(`Get my ${rec.name} Blueprint`);
  p2.drawText(b2L, { x: b2X + (b2W - bold.widthOfTextAtSize(b2L, 10.5)) / 2, y: Y2(q + 35), size: 10.5, font: bold, color: NAVY });
  const link2 = doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: [b2X, Y2(q + 47), b2X + b2W, Y2(q + 15)], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(url) } });
  p2.node.set(PDFName.of("Annots"), doc.context.obj([doc.context.register(link2)]));
  q += cH;
  const page2Bottom = q;

  p2.drawLine({ start: { x: M, y: Y2(H - 74) }, end: { x: W - M, y: Y2(H - 74) }, thickness: 0.6, color: TRACK });
  const foot2 = `${entitySender()}. ${GST.pricesLine} Estimates, not guarantees: any hours or savings are derived from your quiz answers and will vary by business. Your answers are private and used only to calculate your score.`;
  let f2 = H - 60;
  for (const l of wrap(foot2, reg, 8, W - M * 2)) { p2.drawText(l, { x: M, y: Y2(f2), size: 8, font: reg, color: MUTED }); f2 += 11; }

  if (scan && scan.mode !== "blocked") drawWebsitePage({ doc, scan, logo, logoW, logoH, date, reg, bold, mono });

  return { bytes: await doc.save(), page2Bottom };
}

const RATING_COLOR = { critical: rgb(1, 0.365, 0.424), important: rgb(1, 0.702, 0.278), nice: rgb(0.62, 0.74, 0.95) };

/** Page 3: "Your website report". Same look as pages 1 and 2. Top 8 fixes, then a pointer to the full list online. */
export function drawWebsitePage(o: { doc: PDFDocument; scan: ScanReport; logo: Awaited<ReturnType<PDFDocument["embedPng"]>>; logoW: number; logoH: number; date: string; reg: PDFFont; bold: PDFFont; mono: PDFFont }) {
  const { doc, scan, logo, logoW, logoH, date, reg, bold, mono } = o;
  const p = doc.addPage([W, H]);
  const Y = (top: number) => H - top;
  const CARD = rgb(0.075, 0.067, 0.29), EDGE = rgb(0.2, 0.19, 0.45);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: NAVY });
  p.drawImage(logo, { x: M, y: Y(36 + logoH), width: logoW, height: logoH });
  p.drawText(pdfSafe(date), { x: W - M - reg.widthOfTextAtSize(pdfSafe(date), 9), y: Y(58), size: 9, font: reg, color: MUTED });
  p.drawText("YOUR WEBSITE REPORT", { x: M, y: Y(100), size: 8.5, font: mono, color: TEAL });
  const noSite = scan.mode === "no_website";
  const title = noSite ? "No website detected" : pdfSafe(scan.domain || "Your website");
  p.drawText(title, { x: M, y: Y(124), size: 19, font: bold, color: WHITE });
  const scanned = new Date(scan.scannedAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Brisbane" });
  p.drawText(pdfSafe(`Scanned ${scanned}`), { x: M, y: Y(139), size: 9, font: reg, color: MUTED });

  // Overall + three area scores
  const ov = scan.overall ?? 0;
  const bw = (W - M * 2 - 3 * 8) / 4;
  const boxes: { label: string; v: number | null }[] = [{ label: "Overall", v: scan.overall }, ...AREAS.map((a) => ({ label: AREA_LABEL[a], v: scan.areas[a] }))];
  boxes.forEach((b, i) => {
    const x = M + i * (bw + 8);
    drawRound(p, x, Y(152), bw, 62, 10, { color: CARD, border: i === 0 ? YEL : EDGE, bw: i === 0 ? 1.5 : 0.8 });
    p.drawText(pdfSafe(b.label), { x: x + 10, y: Y(168), size: 8, font: reg, color: MUTED });
    p.drawText(b.v === null ? "n/a" : String(i === 0 ? ov : b.v), { x: x + 10, y: Y(194), size: 22, font: bold, color: i === 0 ? YEL : TEAL });
    if (b.v !== null) p.drawText("/ 100", { x: x + 10 + bold.widthOfTextAtSize(String(b.v), 22) + 4, y: Y(194), size: 8, font: reg, color: MUTED });
    const tw = bw - 20;
    drawRound(p, x + 10, Y(204), tw, 4, 2, { color: TRACK });
    if (b.v) drawRound(p, x + 10, Y(204), Math.max(4, (tw * b.v) / 100), 4, 2, { color: TEAL });
  });

  let y = 238;
  const LIMIT = 744;
  // Quick wins
  if (scan.quickWins.length) {
    const qs = scan.quickWins.slice(0, 4);
    const h = 30 + qs.length * 26 + 6;
    drawRound(p, M, Y(y), W - M * 2, h, 10, { color: CARD, border: YEL, bw: 1.5 });
    p.drawText("Quick wins", { x: M + 14, y: Y(y + 20), size: 11.5, font: bold, color: WHITE });
    qs.forEach((f, i) => {
      const ry = y + 42 + i * 26;
      p.drawText(pdfSafe(f.label), { x: M + 14, y: Y(ry), size: 9.5, font: bold, color: WHITE });
      const t = pdfSafe(f.time); const tw = reg.widthOfTextAtSize(t, 8);
      drawRound(p, W - M - 14 - tw - 14, Y(ry - 10), tw + 14, 15, 7, { color: YEL });
      p.drawText(t, { x: W - M - 14 - tw - 7, y: Y(ry), size: 8, font: bold, color: NAVY });
      const fx = wrap(f.fix, reg, 8, W - M * 2 - 28 - tw - 30)[0] ?? "";
      p.drawText(fx, { x: M + 14, y: Y(ry + 11), size: 8, font: reg, color: LIGHT });
    });
    y += h + 14;
  }

  // Fixes (top 8)
  p.drawText(noSite ? "What we found" : "Fixes, most important first", { x: M, y: Y(y + 8), size: 11.5, font: bold, color: WHITE });
  y += 22;
  const shown = scan.fixes.slice(0, 8);
  for (const f of shown) {
    const lines = wrap(f.found, reg, 8.5, W - M * 2 - 20).slice(0, 2);
    const meaning = noSite ? wrap(f.meaning, reg, 8.5, W - M * 2 - 20).slice(0, 3) : [];
    const h = 20 + (lines.length + meaning.length) * 11;
    if (y + h > LIMIT - 120) break;
    const label = pdfSafe(RATING_LABEL[f.rating]).toUpperCase();
    const lw = mono.widthOfTextAtSize(label, 6.5) + 12;
    drawRound(p, M, Y(y - 2), lw, 12, 6, { color: RATING_COLOR[f.rating] });
    p.drawText(label, { x: M + 6, y: Y(y + 6.5), size: 6.5, font: mono, color: NAVY });
    p.drawText(pdfSafe(f.label), { x: M + lw + 8, y: Y(y + 7), size: 9.5, font: bold, color: WHITE });
    [...lines, ...meaning].forEach((l, i) => p.drawText(l, { x: M, y: Y(y + 20 + i * 11), size: 8.5, font: reg, color: LIGHT }));
    y += h + 8;
  }
  if (scan.fixes.length > shown.length) { p.drawText(pdfSafe(`+ ${scan.fixes.length - shown.length} more. See the full list online at saabai.ai/score.`), { x: M, y: Y(y + 8), size: 8.5, font: reg, color: MUTED }); y += 16; }
  if (scan.unverified.length) {
    const t = `Unable to verify (not counted): ${scan.unverified.map((u) => u.label).join(", ")}.`;
    for (const l of wrap(t, reg, 8, W - M * 2).slice(0, 2)) { p.drawText(l, { x: M, y: Y(y + 8), size: 8, font: reg, color: MUTED }); y += 11; }
    y += 4;
  }

  // Recommended offer
  const offer = OFFERS[scan.offer];
  const oy = Math.min(Math.max(y + 8, 600), LIMIT - 70);
  drawRound(p, M, Y(oy), W - M * 2, 68, 12, { color: CARD, border: YEL, bw: 2 });
  p.drawText(pdfSafe(`Recommended: ${offer.name}`), { x: M + 16, y: Y(oy + 22), size: 12, font: bold, color: WHITE });
  wrap(scan.offerReason, reg, 8.5, W - M * 2 - 32 - 150).slice(0, 2).forEach((l, i) => p.drawText(l, { x: M + 16, y: Y(oy + 38 + i * 11), size: 8.5, font: reg, color: LIGHT }));
  const bW = 126, bX = W - M - 16 - bW;
  drawRound(p, bX, Y(oy + 14), bW, 34, 8, { color: YEL });
  const bl = pdfSafe("See how it works"); p.drawText(bl, { x: bX + (bW - bold.widthOfTextAtSize(bl, 10)) / 2, y: Y(oy + 35), size: 10, font: bold, color: NAVY });
  const link = doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: [bX, Y(oy + 48), bX + bW, Y(oy + 14)], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(`https://www.saabai.ai${offer.href}`) } });
  p.node.set(PDFName.of("Annots"), doc.context.obj([doc.context.register(link)]));

  p.drawLine({ start: { x: M, y: Y(H - 74) }, end: { x: W - M, y: Y(H - 74) }, thickness: 0.6, color: TRACK });
  const foot = `${DISCLAIMER} ${entitySender()}. ${GST.pricesLine}`;
  let fy = H - 60;
  for (const l of wrap(foot, reg, 8, W - M * 2)) { p.drawText(l, { x: M, y: Y(fy), size: 8, font: reg, color: MUTED }); fy += 11; }
}
