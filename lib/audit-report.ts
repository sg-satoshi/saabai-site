/**
 * AI Audit report generator: builds a branded .docx DRAFT from the
 * engagement profile + assessment. Shane reviews/polishes in Word before
 * client delivery. Tier shapes length via the assessment's opportunity count.
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { AuditEngagement } from "./audit-types";
import { startAnswers } from "./audit-assessment";
import { searchReportBlocks, searchSkippedBlocks, type ReportBlock } from "./blueprint/search-audit";
import type { SearchAudit } from "./blueprint/search-rules";

const NAVY = "0E0C2E";
const GOLD = "C9A84C";
const GREY = "6B7280";

const TIER_NAMES: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
};

const TIER_ROADMAP: Record<string, string> = {
  starter: "Recommended Implementation Sequence",
  pro: "90-Day Implementation Roadmap",
  business: "12-Month Phased Implementation Roadmap",
};

function h1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, color: NAVY, size: 32 })],
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, bold: true, color: NAVY, size: 26 })],
  });
}

function body(text: string, opts?: { italic?: boolean; color?: string }): Paragraph {
  return new Paragraph({
    spacing: { after: 140, line: 320 },
    children: [
      new TextRun({
        text,
        size: 22,
        italics: opts?.italic,
        color: opts?.color ?? "1F2430",
      }),
    ],
  });
}

function metaRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 35, type: WidthType.PERCENTAGE },
        borders: noBorders(),
        children: [
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: label, bold: true, size: 21, color: GREY })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 65, type: WidthType.PERCENTAGE },
        borders: noBorders(),
        children: [
          new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: value, size: 21, color: "1F2430" })],
          }),
        ],
      }),
    ],
  });
}

function quote(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 80, after: 200, line: 320 },
    indent: { left: 400 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: GOLD, space: 12 } },
    children: [new TextRun({ text: `"${text}"`, size: 23, italics: true, color: NAVY })],
  });
}

/**
 * Fact-find v2: open the Blueprint with the client's own words.
 * Answer 1 is quoted verbatim, answer 2 shapes what we avoid repeating, and
 * answer 3 is answered in a short note (Starter) or on the walkthrough call
 * (Pro, Business). Returns nothing when the v2 answers are absent (older fact-finds).
 */
export function whatYouToldUs(eng: AuditEngagement): Paragraph[] {
  const told = startAnswers(eng);
  if (!told.frustration && !told.tried && !told.wish) return [];
  const a = eng.assessment;
  const out: Paragraph[] = [h1("What you told us")];
  if (told.frustration) {
    out.push(body("What's frustrating you most right now, in your words:"), quote(told.frustration));
    out.push(
      body(
        "Everything in this Blueprint is ranked against that. The opportunities that fix it directly come first and are marked as such."
      )
    );
  }
  if (told.tried) {
    out.push(h2("What you've already tried"));
    out.push(
      body(
        a?.avoidRepeating ??
          "We have taken what you have already tried into account, and we will not recommend the same thing again unless we can show why this time is different."
      )
    );
  }
  if (told.wish) {
    out.push(h2("What you wish tech sellers understood"));
    if (eng.tier === "starter") {
      out.push(
        body(
          a?.concernsNote ??
            "[Short note responding to the client's answer 3. Generate the assessment, or write it here.]",
          a?.concernsNote ? undefined : { italic: true, color: GREY }
        )
      );
    } else {
      out.push(
        body(
          "You told us what you wish people selling AI or tech understood about your situation. We will talk that through directly on your walkthrough call."
        )
      );
    }
  }
  return out;
}

function pushBlocks(children: (Paragraph | Table)[], blocks: ReportBlock[]) {
  for (const b of blocks) {
    if (b.kind === "h1") children.push(h1(b.text));
    else if (b.kind === "h2") children.push(h2(b.text));
    else if (b.kind === "muted") children.push(body(b.text, { italic: true, color: GREY }));
    else children.push(body(b.text));
  }
}

function noBorders() {
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
  return { top: none, bottom: none, left: none, right: none };
}

export async function buildAuditReportDocx(
  eng: AuditEngagement,
  search?: SearchAudit | null
): Promise<Buffer> {
  const a = eng.assessment;
  const tierName = TIER_NAMES[eng.tier] ?? eng.tier;
  const today = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const children: (Paragraph | Table)[] = [];

  // ── Cover ──────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({ spacing: { before: 2400 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "AI AUTOMATION AUDIT", bold: true, size: 52, color: NAVY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [new TextRun({ text: eng.firmName, bold: true, size: 36, color: GOLD })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300 },
      children: [
        new TextRun({
          text: `${tierName} Tier · Prepared by Saabai.ai · ${today}`,
          size: 22,
          color: GREY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: "CONFIDENTIAL. Prepared exclusively for the addressee.",
          italics: true,
          size: 19,
          color: GREY,
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // ── What you told us (fact-find v2) ────────────────────────────────────
  children.push(...whatYouToldUs(eng));

  // ── Engagement snapshot ────────────────────────────────────────────────
  children.push(
    h1("Engagement Snapshot"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders(),
      rows: [
        metaRow("Firm", eng.firmName),
        metaRow("Industry", eng.firmType.replace("-", " ")),
        ...(eng.firmSize ? [metaRow("Team size", eng.firmSize)] : []),
        ...(eng.location ? [metaRow("Location", eng.location)] : []),
        metaRow("Audit tier", tierName),
        metaRow("Primary contact", `${eng.contactName} (${eng.contactEmail})`),
        metaRow("Report date", today),
      ],
    })
  );

  // ── Executive summary ──────────────────────────────────────────────────
  children.push(h1("Executive Summary"));
  if (a?.summary) {
    children.push(body(a.summary));
  } else {
    children.push(body("[Executive summary. Generate the AI assessment first, or draft manually.]", { italic: true, color: GREY }));
  }

  if (a?.quickWins) {
    children.push(h2("Quick Wins (First 30 Days)"), body(a.quickWins));
  }

  // ── Search and conversion (issue #281). Prices and ratings come only from the crawl or the client. ──
  const searchBlocks = search
    ? searchReportBlocks(search)
    : searchSkippedBlocks(
        eng.website
          ? "Search checks were not run for this draft, so they are not shown. Nothing is guessed."
          : "No website was recorded on this Blueprint, so search and conversion were not checked. Nothing is guessed."
      );
  pushBlocks(children, searchBlocks);

  // ── Opportunities ──────────────────────────────────────────────────────
  children.push(
    new Paragraph({ children: [new PageBreak()] }),
    h1("Ranked Automation Opportunities")
  );

  const opps = a?.opportunities ?? [];
  if (opps.length === 0) {
    children.push(body("[No opportunities yet. Generate the assessment first.]", { italic: true, color: GREY }));
  }

  for (const o of opps) {
    children.push(
      h2(`${o.rank ? `#${o.rank}: ` : ""}${o.title}`),
      body(o.description)
    );
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders(),
        rows: [
          ...(o.fixesMainFrustration
            ? [metaRow("What it fixes", "What's frustrating you most right now")]
            : []),
          ...(o.hoursSavedPerWeek !== undefined
            ? [metaRow("Estimated time recovered", `~${o.hoursSavedPerWeek} hours per week`)]
            : []),
          metaRow("Build complexity", o.complexity),
          ...(o.costBandAud
            ? [metaRow("Indicative build investment", `${o.costBandAud} AUD (GST not applicable)`)]
            : []),
        ],
      })
    );
    if (o.roiNotes) {
      children.push(body(`ROI basis: ${o.roiNotes}`, { italic: true, color: GREY }));
    }
  }

  // ── Roadmap ────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({ children: [new PageBreak()] }),
    h1(TIER_ROADMAP[eng.tier] ?? "Implementation Roadmap")
  );
  if (opps.length > 0) {
    const phases =
      eng.tier === "business"
        ? [
            { label: "Phase 1 (Months 1-3): Foundations & highest-ROI build", slice: opps.slice(0, 3) },
            { label: "Phase 2 (Months 4-8): Expansion", slice: opps.slice(3, 7) },
            { label: "Phase 3 (Months 9-12): Scale & optimise", slice: opps.slice(7) },
          ]
        : eng.tier === "pro"
          ? [
              { label: "Days 1-30: First build", slice: opps.slice(0, 2) },
              { label: "Days 31-60: Second wave", slice: opps.slice(2, 5) },
              { label: "Days 61-90: Consolidate & measure", slice: opps.slice(5) },
            ]
          : [{ label: "Recommended starting point", slice: opps.slice(0, 3) }];

    for (const phase of phases) {
      if (phase.slice.length === 0) continue;
      children.push(h2(phase.label));
      for (const o of phase.slice) {
        children.push(body(`• ${o.title}${o.costBandAud ? ` (${o.costBandAud})` : ""}`));
      }
    }
  } else {
    children.push(body("[Sequence opportunities into phases once the assessment is finalised.]", { italic: true, color: GREY }));
  }

  // ── Risks ──────────────────────────────────────────────────────────────
  if (a?.risks) {
    children.push(h1("Risks & Constraints"), body(a.risks));
  }

  // ── Goals alignment ────────────────────────────────────────────────────
  if (eng.goals.length > 0) {
    children.push(h1("Alignment With Your Stated Goals"));
    for (const g of eng.goals) {
      children.push(body(`• ${g.text}`));
    }
  }

  // ── Next steps ─────────────────────────────────────────────────────────
  children.push(
    h1("Next Steps"),
    body(
      "We will walk through this report together on your findings call. If you choose to proceed to a build, each opportunity above is quoted separately as a fixed-price engagement. There is no obligation, and we will tell you plainly if we believe an item is not worth building."
    ),
    body("Shane Goldberg · Saabai.ai · hello@saabai.ai", { color: GREY })
  );

  const doc = new Document({
    creator: "Saabai.ai",
    title: `AI Automation Audit: ${eng.firmName}`,
    styles: {
      default: {
        document: { run: { font: "Calibri" } },
      },
    },
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}
