import type { ReactNode } from "react";

/**
 * Turn Mia's reply text into paragraphs and short lists.
 * HTML collapses newlines, so a blank line (a markdown paragraph) or a single
 * newline has to become real elements or the bubble reads as one wall of text.
 */

const URL_RE = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
const LIST_RE = /^(?:([-*])|(\d+[.)]))\s+(.+)$/;

export type ReplyBlock =
  | { kind: "p"; lines: string[] }
  | { kind: "ul" | "ol"; items: string[] };

function parseListItem(line: string): { ordered: boolean; text: string } | null {
  const match = line.match(LIST_RE);
  if (!match) return null;
  return { ordered: Boolean(match[2]), text: match[3] };
}

export function splitReplyBlocks(text: string): ReplyBlock[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const chunks = normalized.split(/\n[ \t]*\n+/);
  const blocks: ReplyBlock[] = [];

  for (const chunk of chunks) {
    const lines = chunk.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
    if (lines.length === 0) continue;

    const items = lines.map(parseListItem);
    if (items.every((item) => item !== null)) {
      const parsed = items as { ordered: boolean; text: string }[];
      const kind = parsed.every((item) => item.ordered) ? "ol" : "ul";
      const texts = parsed.map((item) => item.text);
      const prev = blocks[blocks.length - 1];
      if (prev && prev.kind === kind) prev.items.push(...texts);
      else blocks.push({ kind, items: texts });
      continue;
    }

    blocks.push({ kind: "p", lines });
  }

  return blocks;
}

function renderInline(text: string): ReactNode[] {
  return text.split(URL_RE).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-all opacity-80 hover:opacity-100 transition-opacity"
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}

export function MiaReplyText({ text }: { text: string }) {
  const blocks = splitReplyBlocks(text);
  if (blocks.length === 0) return null;

  const singleLine = blocks.length === 1 && blocks[0].kind === "p" && blocks[0].lines.length === 1;
  if (singleLine && blocks[0].kind === "p") {
    return <>{renderInline(blocks[0].lines[0])}</>;
  }

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, i) => {
        if (block.kind === "p") {
          return (
            <p key={i} className="m-0">
              {block.lines.map((line, j) => (
                <span key={j}>
                  {j > 0 ? <br /> : null}
                  {renderInline(line)}
                </span>
              ))}
            </p>
          );
        }

        const Tag = block.kind === "ol" ? "ol" : "ul";
        const listClass = block.kind === "ol" ? "list-decimal" : "list-disc";
        return (
          <Tag key={i} className={`m-0 pl-4 space-y-1 ${listClass}`}>
            {block.items.map((item, j) => (
              <li key={j}>{renderInline(item)}</li>
            ))}
          </Tag>
        );
      })}
    </div>
  );
}
