/**
 * House rule: no Saabai chatbot ever uses em dashes (or en dashes used as dashes).
 *
 * - noDashes(text): rewrites a finished string.
 * - createDashFilter(): stateful version for streamed text deltas. It holds back
 *   trailing spaces/dashes so a dash split across chunks is still handled.
 * - noDashesTransform(): AI SDK streamText `experimental_transform` that applies the
 *   filter to every text delta.
 * - NO_DASH_RULE: the matching system prompt rule.
 */
import type { StreamTextTransform, TextStreamPart, ToolSet } from "ai";
import { formatPrices } from "./money";

export const NO_DASH_RULE =
  "Never use em dashes or en dashes (the long dash characters) in your replies. Use a comma, a full stop or a plain hyphen instead.";

const DASH = "[\\u2014\\u2013\\u2015\\u2012]"; // em, en, horizontal bar, figure dash

/** Replace em/en dashes with a comma, full stop or hyphen as fits. */
export function noDashes(input: string): string {
  if (!input || !/[\u2012-\u2015]/.test(input)) return input;
  let s = input;
  // Number ranges: 2–4, 9am—5pm → hyphen
  s = s.replace(new RegExp(`(\\d)\\s*${DASH}\\s*(?=\\d)`, "g"), "$1-");
  // Compound words written with an unspaced en dash: Gold Coast–Brisbane → hyphen
  s = s.replace(new RegExp(`(\\p{L})\\u2013(?=\\p{L})`, "gu"), "$1-");
  // Dash starting a line (used as a bullet) → "- "
  s = s.replace(new RegExp(`(^|\\n)[ \\t]*${DASH}+[ \\t]*`, "g"), "$1- ");
  // Dash right before end of text, a line break or closing punctuation → full stop
  s = s.replace(new RegExp(`[ \\t]*${DASH}+[ \\t]*(?=$|\\n)`, "g"), ".");
  s = s.replace(new RegExp(`[ \\t]*${DASH}+[ \\t]*(?=[.!?,;:])`, "g"), "");
  // Anything else (a dash between clauses) → comma
  s = s.replace(new RegExp(`[ \\t]*${DASH}+[ \\t]*`, "g"), ", ");
  // Tidy up: no doubled or misplaced punctuation
  s = s.replace(/,\s*,/g, ",").replace(/([.!?:;]),\s/g, "$1 ").replace(/^, /gm, "").replace(/\.\./g, ".");
  return s;
}

export type FilterOptions = {
  /** Also rewrite "$2000" as "$2,000" (Mia's price house style). */
  prices?: boolean;
};

/** Stateful filter for streamed deltas. Call push() per delta and flush() at the end. */
export function createDashFilter(opts: FilterOptions = {}) {
  const clean = (t: string) => (opts.prices ? formatPrices(noDashes(t)) : noDashes(t));
  // Trailing run not yet safe to emit. With prices on, "$" and "," are held too,
  // so an amount split across chunks ("$20" + "00") is formatted as one.
  const tail = opts.prices ? /[\d $,\t\u2012-\u2015]*$/ : /[\d \t\u2012-\u2015]*$/;
  let held = "";
  let ctx = ""; // last raw character emitted, so a dash at the start of a segment keeps its context
  const emit = (seg: string): string => {
    if (!seg) return "";
    const out = clean(ctx + seg);
    const res = ctx && out.startsWith(ctx) ? out.slice(ctx.length) : clean(seg);
    ctx = seg.slice(-1);
    return res;
  };
  return {
    push(delta: string): string {
      const text = held + delta;
      const run = text.match(tail)?.[0] ?? "";
      const cut = text.length - run.length;
      held = text.slice(cut);
      return emit(text.slice(0, cut));
    },
    flush(): string {
      const out = emit(held);
      held = "";
      return out;
    },
  };
}

/** AI SDK transform: strips dashes from every streamed text delta (per text block). */
export function noDashesTransform<TOOLS extends ToolSet>(opts: FilterOptions = {}): StreamTextTransform<TOOLS> {
  return () => {
    const filters = new Map<string, ReturnType<typeof createDashFilter>>();
    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(part, controller) {
        if (part.type === "text-delta") {
          let f = filters.get(part.id);
          if (!f) { f = createDashFilter(opts); filters.set(part.id, f); }
          const text = f.push(part.text);
          if (text) controller.enqueue({ ...part, text });
          return;
        }
        if (part.type === "text-end") {
          const f = filters.get(part.id);
          const rest = f?.flush();
          if (rest) controller.enqueue({ type: "text-delta", id: part.id, text: rest } as TextStreamPart<TOOLS>);
          filters.delete(part.id);
        }
        controller.enqueue(part);
      },
      flush(controller) {
        for (const [id, f] of filters) {
          const rest = f.flush();
          if (rest) controller.enqueue({ type: "text-delta", id, text: rest } as TextStreamPart<TOOLS>);
        }
      },
    });
  };
}
