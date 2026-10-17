/**
 * Announcement rich text: a strict whitelist sanitiser (edge-safe, no DOM, no dependencies).
 *
 * Allowed: bold, italic, underline, strikethrough, a text colour on a span (hex only), and links with a safe URL.
 * Everything else is dropped (unknown tags keep their text; script, style, iframe and similar lose their content).
 * Output is canonical: <b> <i> <u> <s> <span style="color:#rrggbb"> <a href="...">, text always escaped, never any other
 * attribute. Rendering walks the sanitised tree into React elements (no dangerouslySetInnerHTML), so a stored value can
 * never inject markup even if it was tampered with after saving.
 */
export type RNode =
  | { t: "text"; v: string }
  | { t: "b" | "i" | "u" | "s"; c: RNode[] }
  | { t: "span"; color: string; c: RNode[] }
  | { t: "a"; href: string; c: RNode[] };

const MAX_INPUT = 4000, MAX_DEPTH = 6;
const DROP_CONTENT = new Set(["script", "style", "iframe", "object", "embed", "textarea", "title", "noscript", "template", "svg", "math", "head", "xmp", "plaintext", "noembed", "noframes"]);
const ALIAS: Record<string, "b" | "i" | "u" | "s"> = { b: "b", strong: "b", i: "i", em: "i", u: "u", s: "s", strike: "s", del: "s" };

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
/** Decodes named and numeric entities (so "&#106;avascript:" cannot hide from the URL check). */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]{1,6}|#[0-9]{1,7}|[a-zA-Z]{2,6});?/g, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      if (!Number.isFinite(n) || n < 1 || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) return "";
      return n === 0xa0 ? " " : String.fromCodePoint(n);
    }
    const v = NAMED[e.toLowerCase()];
    return v === undefined ? m : v;
  });
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// eslint-disable-next-line no-control-regex
const stripCtl = (s: string) => s.replace(/[\u0000-\u001f\u007f\u2028\u2029\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "");

/** Same rule as the announcement link field: a site path, https URL, tel: or mailto:. Never javascript: or data:. */
export function isSafeHref(u: string): boolean {
  if (!u || u.length > 300) return false;
  if (/^\/(?!\/)[A-Za-z0-9_\-./?=&#%+:~]*$/.test(u)) return true;
  if (/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?(\/[^\s"'<>`\\]*)?$/.test(u)) return true;
  if (/^tel:\+?[0-9 ()-]{6,20}$/.test(u)) return true;
  if (/^mailto:[^\s@"'<>]+@[^\s@"'<>]+\.[^\s@"'<>]+$/.test(u)) return true;
  return false;
}
function hex(v: string): string | null {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(v.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return "#" + h.toLowerCase();
}
/** Accepts #rgb, #rrggbb and rgb(r, g, b) (what browsers produce when editing). Returns #rrggbb or null. */
function colour(v: string): string | null {
  const h = hex(v);
  if (h) return h;
  const m = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(v.trim());
  if (!m) return null;
  const n = [m[1], m[2], m[3]].map(Number);
  if (n.some((x) => x > 255)) return null;
  return "#" + n.map((x) => x.toString(16).padStart(2, "0")).join("");
}
function attrs(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z][a-zA-Z0-9:_-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/g;
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(src)) && guard++ < 30) {
    const k = m[1].toLowerCase();
    if (!(k in out)) out[k] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return out;
}
/** From a style attribute keep only: colour (hex/rgb), bold, italic, underline, line-through. Nothing else is ever read. */
function styleParts(style: string): { color: string | null; kinds: ("b" | "i" | "u" | "s")[] } {
  let color: string | null = null; const kinds: ("b" | "i" | "u" | "s")[] = [];
  for (const d of style.split(";")) {
    const i = d.indexOf(":");
    if (i < 0) continue;
    const k = d.slice(0, i).trim().toLowerCase(), v = stripCtl(d.slice(i + 1)).trim().toLowerCase();
    if (k === "color") color = colour(v);
    else if (k === "font-weight" && (v === "bold" || v === "bolder" || /^[6-9]00$/.test(v))) kinds.push("b");
    else if (k === "font-style" && (v === "italic" || v === "oblique")) kinds.push("i");
    else if ((k === "text-decoration" || k === "text-decoration-line") && /\bunderline\b/.test(v)) kinds.push("u");
    if ((k === "text-decoration" || k === "text-decoration-line") && /\bline-through\b/.test(v)) kinds.push("s");
  }
  return { color, kinds };
}

type Open = { name: string; node: RNode & { c: RNode[] } };

/** Sanitised tree for any input (including hostile input). */
export function richTree(input: unknown): RNode[] {
  let src = typeof input === "string" ? input.slice(0, MAX_INPUT) : "";
  src = src.replace(/\u0000/g, "");
  const root: RNode[] = [];
  const stack: Open[] = [];
  const cur = () => (stack.length ? stack[stack.length - 1].node.c : root);
  const pushText = (raw: string) => {
    const t = stripCtl(decodeEntities(raw)).replace(/\s+/g, " ");
    if (t) cur().push({ t: "text", v: t });
  };
  const re = /<!--[\s\S]*?-->|<!--[\s\S]*$|<![^>]*>|<\?[^>]*>|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>?|[^<]+|</g;
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(src)) && guard++ < 4000) {
    const tok = m[0];
    if (tok.startsWith("<!--") || tok.startsWith("<!") || tok.startsWith("<?")) continue;
    if (!m[2]) { if (tok === "<") pushText("<"); else pushText(tok); continue; }
    const closing = m[1] === "/", name = m[2].toLowerCase(), rest = m[3] ?? "";
    if (!closing && DROP_CONTENT.has(name)) {
      const end = new RegExp(`</${name}\\s*>`, "i");
      const tail = src.slice(re.lastIndex);
      const e = end.exec(tail);
      re.lastIndex = e ? re.lastIndex + e.index + e[0].length : src.length;
      continue;
    }
    if (closing) {
      const want = ALIAS[name] ?? (name === "font" ? "span" : name);
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].name === want) { stack.length = i; break; }
      continue;
    }
    if (name === "br") { pushText(" "); continue; }
    if (stack.length >= MAX_DEPTH) continue;
    const selfClose = /\/\s*$/.test(rest);
    let node: (RNode & { c: RNode[] }) | null = null;
    let chain: (RNode & { c: RNode[] })[] = [];
    let key = name;
    if (ALIAS[name]) { key = ALIAS[name]; node = { t: key as "b", c: [] }; }
    else if (name === "span" || name === "font") {
      const a = attrs(rest);
      key = "span";
      const sp = name === "font" ? { color: colour(stripCtl(a.color ?? "")), kinds: [] as ("b" | "i" | "u" | "s")[] } : styleParts(a.style ?? "");
      const nodes: (RNode & { c: RNode[] })[] = [...new Set(sp.kinds)].map((t) => ({ t, c: [] }));
      if (sp.color) nodes.push({ t: "span", color: sp.color, c: [] });
      if (nodes.length) { node = nodes[0]; chain = nodes.slice(1); }
    } else if (name === "a") {
      if (stack.some((o) => o.name === "a")) continue;
      const href = stripCtl(attrs(rest).href ?? "").trim();
      if (isSafeHref(href)) node = { t: "a", href, c: [] };
    }
    if (!node) {
      // Dropped tag: keep its text by opening a transparent frame that flattens into the parent.
      if (selfClose) continue;
      const frame: Open = { name: key, node: { t: "b", c: cur() } };
      (frame as { transparent?: boolean }).transparent = true;
      stack.push(frame);
      continue;
    }
    cur().push(node);
    if (!selfClose) {
      stack.push({ name: key, node });
      // A single styled span can carry several formats: nest them, closed together by the one </span>.
      for (const extra of chain) { cur().push(extra); stack.push({ name: "span~", node: extra }); }
    }
  }
  return prune(root);
}
function prune(nodes: RNode[]): RNode[] {
  const out: RNode[] = [];
  for (const n of nodes) {
    if (n.t === "text") { if (n.v) out.push(n); continue; }
    const c = prune(n.c);
    if (c.some((x) => x.t !== "text" || x.v.trim())) out.push({ ...n, c } as RNode);
  }
  return out;
}
function ser(nodes: RNode[]): string {
  return nodes.map((n) => {
    if (n.t === "text") return esc(n.v);
    const inner = ser(n.c);
    if (n.t === "span") return `<span style="color:${n.color}">${inner}</span>`;
    if (n.t === "a") return `<a href="${esc(n.href)}">${inner}</a>`;
    return `<${n.t}>${inner}</${n.t}>`;
  }).join("");
}
const txt = (nodes: RNode[]): string => nodes.map((n) => (n.t === "text" ? n.v : txt(n.c))).join("");
const cols = (nodes: RNode[]): string[] => nodes.flatMap((n) => (n.t === "text" ? [] : [...(n.t === "span" ? [n.color] : []), ...cols(n.c)]));
const links = (nodes: RNode[]): string[] => nodes.flatMap((n) => (n.t === "text" ? [] : [...(n.t === "a" ? [n.href] : []), ...links(n.c)]));

/** Canonical safe HTML (trimmed, single spaces). Idempotent. */
export function sanitizeRich(input: unknown): string {
  return ser(richTree(input)).replace(/^(?:\s|&nbsp;)+|(?:\s)+$/g, "").replace(/ {2,}/g, " ");
}
/** The text people see (what the character limit counts). */
export function visibleText(input: unknown): string { return txt(richTree(input)).replace(/ {2,}/g, " ").trim(); }
/** Every text colour used (hex), for contrast checks. */
export function richColors(input: unknown): string[] { return [...new Set(cols(richTree(input)))]; }
export function richLinks(input: unknown): string[] { return links(richTree(input)); }
