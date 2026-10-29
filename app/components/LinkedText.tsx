import { Fragment } from "react";

/**
 * Renders plain answer text with the first match of each phrase turned into a link.
 * The visible words stay exactly the same, so FAQPage schema built from the same
 * string still matches the page word for word.
 */
export default function LinkedText({ text, links, className }: { text: string; links: { phrase: string; href: string }[]; className?: string }) {
  const parts: (string | { phrase: string; href: string })[] = [text];
  for (const l of links) {
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (typeof p !== "string") continue;
      const at = p.indexOf(l.phrase);
      if (at === -1) continue;
      parts.splice(i, 1, p.slice(0, at), l, p.slice(at + l.phrase.length));
      break;
    }
  }
  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? (
          <Fragment key={i}>{p}</Fragment>
        ) : (
          <a key={i} href={p.href} className={className ?? "text-saabai-teal hover:text-saabai-teal-bright underline underline-offset-2"}>
            {p.phrase}
          </a>
        ),
      )}
    </>
  );
}
