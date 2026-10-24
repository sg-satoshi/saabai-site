/**
 * Shared cleanup for Lex text the lawyer actually sees.
 * - no process talk before the document ("Good. I have enough...", "Let me run all searches...")
 * - no em dashes, en dashes, or the spaced double hyphen the model copies from prompts
 * - no decorative divider lines (compare was drawing ═══ rules)
 */
import type { StreamTextTransform, TextStreamPart, ToolSet } from "ai";
import { noDashes } from "./no-dashes";

const PROCESS_TALK = /^(good[,.]|okay[,.]|ok[,.]|right[,.]|let me |i(?:'|’)ll |i will |i am going to |i'm going to |now i |i have enough|i now have|running |searching )/i;

/** Drops leading paragraphs that are the model talking about its own search, when a real answer follows. */
export function stripLeadingNarration(text: string): string {
  let rest = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < 3; i++) {
    const gap = rest.search(/\n\s*\n/);
    if (gap < 0) break;
    const para = rest.slice(0, gap).trim();
    const more = rest.slice(gap).replace(/^\s+/, "");
    if (!para || para.length > 500 || !PROCESS_TALK.test(para) || !more.trim()) break;
    rest = more;
  }
  return rest.trim();
}

const DIVIDER_LINE = /^[ \t]*[\u2500\u2501\u2550=\-_*~]{3,}[ \t]*$/gm;

/** Finished Lex text: dashes rewritten, divider lines removed. */
export function cleanLexOutput(input: string): string {
  return noDashes(input)
    .replace(DIVIDER_LINE, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Today's date in Brisbane, the way a document header should read ("19 October 2026"). */
export function brisbaneLongDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
}

const TEXT = new Set(["text-start", "text-delta", "text-end"]);

/**
 * streamText sends every step to the client, including the sentences the model
 * writes before a tool call. Keep only text from steps that do not call tools,
 * and drop a leading "let me search" paragraph from that text.
 */
export function dropNarrationTransform<TOOLS extends ToolSet>(): StreamTextTransform<TOOLS> {
  return () => {
    let sawTool = false;
    let textId: string | undefined;
    let text = "";
    const reset = () => { sawTool = false; textId = undefined; text = ""; };
    const emitAnswer = (controller: TransformStreamDefaultController<TextStreamPart<TOOLS>>) => {
      if (sawTool || !textId || !text.trim()) return;
      const cleaned = stripLeadingNarration(text);
      if (!cleaned) return;
      controller.enqueue({ type: "text-start", id: textId });
      controller.enqueue({ type: "text-delta", id: textId, text: cleaned });
      controller.enqueue({ type: "text-end", id: textId });
    };
    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(part, controller) {
        if (part.type === "start-step") { reset(); controller.enqueue(part); return; }
        if (part.type === "text-start") { textId = part.id; return; }
        if (part.type === "text-delta") { text += part.text; return; }
        if (part.type === "text-end") return;
        if (part.type === "tool-input-start" || part.type === "tool-call") {
          sawTool = true;
          text = "";
          textId = undefined;
          controller.enqueue(part);
          return;
        }
        if (part.type === "finish-step") {
          emitAnswer(controller);
          reset();
          controller.enqueue(part);
          return;
        }
        if (TEXT.has(part.type)) return;
        controller.enqueue(part);
      },
      flush(controller) {
        emitAnswer(controller);
      },
    });
  };
}
