import type { ReactNode } from "react";
import { richTree, type RNode } from "@/lib/announce/rich";

/** Renders announcement rich text. Always re-sanitised, then built as React elements (no innerHTML), so nothing can inject. */
function walk(nodes: RNode[], k = ""): ReactNode[] {
  return nodes.map((n, i) => {
    const key = `${k}${i}`;
    if (n.t === "text") return n.v;
    const kids = walk(n.c, key + ".");
    if (n.t === "a") return <a key={key} href={n.href} className="sb-ann-inline" rel="noopener noreferrer" target={n.href.startsWith("https://") ? "_blank" : undefined}>{kids}</a>;
    if (n.t === "span") return <span key={key} style={{ color: n.color }}>{kids}</span>;
    const Tag = n.t;
    return <Tag key={key}>{kids}</Tag>;
  });
}
export default function Rich({ html }: { html: string }) {
  return <>{walk(richTree(html))}</>;
}
