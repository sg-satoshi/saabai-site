import { IMAGE_PATH_RE, KIND_RULES, SLOT_KINDS, kindCopyError, type SlotKind } from "./core";

/**
 * Visual editor helpers (pure, no storage). Used by the dashboard editor and the wrap-request API.
 * Eligible: headings, paragraphs and other plain text, buttons, links (nav and footer too), displayed prices,
 * form field hints and images. Skipped: anything with child elements (mixed markup), [data-no-test], structured
 * data ([itemprop]), the "Powered by Saabai.ai" footer credit, and legal pages. Nothing here ever starts a test
 * or changes what visitors see.
 */
export const REPO = "sg-satoshi/saabai-site";
export const SEED_FILE = "lib/exp/seed.ts";

export type ElementInfo = {
  tag: string;
  className?: string;
  /** True when the element has child elements other than one span and br (so its copy is not plain text). */
  complex: boolean;
  /** True when inside [data-no-test], [itemprop], or another test slot. */
  excluded: boolean;
  text: string;
  /** Number of direct span children (only headlines may carry one, as the highlighted part). */
  spans?: number;
  /** Placeholder attribute, for input and textarea. */
  placeholder?: string;
  /** Image path as written in the source (site-relative), for img. */
  src?: string;
  alt?: string;
};

export const slugify = (s: string, max = 20): string =>
  s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max).replace(/-+$/g, "");

/** Pages where copy is never testable from the editor (legal, privacy, terms). */
export const LEGAL_PATH_RE = /^\/(?:legal|privacy|terms|privacy-policy|sites\/[^/]+\/(?:privacy|terms)[^/]*)(?:\/|$)/i;
export const isLegalPath = (p: string) => LEGAL_PATH_RE.test(p.split("?")[0]) || /(?:^|\/)(?:privacy|terms)(?:-[a-z]+)*(?:\/|$)/i.test(p.split("?")[0]);
/** The footer credit must always stay exactly as is. */
export const isProtectedText = (t: string) => /powered by\s+saabai/i.test(t);

const TEXT_TAGS = new Set(["p", "li", "blockquote", "figcaption", "dt", "dd", "td", "th", "label", "small", "span", "div", "strong", "em", "h4", "h5", "h6", "summary", "cite"]);
const PRICE_RE = /(?:^|\s)(?:from\s+|only\s+)?(?:A?\$|AUD\s?)\s?\d[\d,]*(?:\.\d{2})?/i;

/** Kind for an element, or null when it is not testable. */
export function kindForElement(el: ElementInfo): SlotKind | null {
  if (el.excluded) return null;
  const tag = el.tag.toLowerCase();
  if (tag === "img") return el.src && IMAGE_PATH_RE.test(el.src) ? "image" : null;
  if (tag === "input" || tag === "textarea") {
    const ph = (el.placeholder ?? "").replace(/\s+/g, " ").trim();
    return ph.length >= 3 && ph.length <= KIND_RULES.placeholder.maxText ? "placeholder" : null;
  }
  if (el.complex) return null;
  const text = el.text.replace(/\s+/g, " ").trim();
  if (text.length < 3 || isProtectedText(text)) return null;
  const isButtonish = tag === "button" || (tag === "a" && /\b(btn|button)\b/i.test(el.className ?? ""));
  if (isButtonish) return text.length <= KIND_RULES.button.maxText + 2 ? "button" : null;
  if (tag === "h1" || tag === "h2" || tag === "h3") return text.length <= KIND_RULES.headline.maxCombined + 60 ? "headline" : null;
  const plainOnly = (el.spans ?? 0) === 0;
  if (tag === "a") return plainOnly && text.length <= KIND_RULES.link.maxText ? "link" : null;
  if (!TEXT_TAGS.has(tag) || !plainOnly) return null;
  if (text.length <= KIND_RULES.price.maxText && PRICE_RE.test(text)) return "price";
  return text.length <= KIND_RULES.text.maxText ? "text" : null;
}

export function pathKey(path: string): string {
  const first = path.split("?")[0].split("#")[0].split("/").filter(Boolean)[0];
  return first ? slugify(first) || "page" : "home";
}

const ROLE: Record<SlotKind, string> = { headline: "headline", button: "cta", text: "text", link: "link", price: "price", placeholder: "hint", image: "image" };

/** `<page>.<section>.<role>`, for example home.hero.cta. */
export function suggestSlot(path: string, section: string, kind: SlotKind): string {
  const role = ROLE[kind];
  return `${pathKey(path)}.${slugify(section) || "main"}.${role}`;
}

export const SLOT_RE = /^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+(-[a-z0-9]+)*){2}$/;

export function uniqueSlot(base: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  if (!set.has(base)) return base;
  for (let i = 2; i < 50; i++) if (!set.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now() % 100000}`;
}

export const experimentIdForSlot = (slot: string) => slot.replace(/\./g, "-");

export type WrapRequest = {
  siteKey: string;
  path: string;
  slot: string;
  kind: SlotKind;
  name: string;
  control: { text: string; emphasis?: string };
  tag: string;
  section: string;
};

export type WrapCheck = { ok: true; req: WrapRequest } | { ok: false; error: string };

export function validateWrapRequest(b: unknown, existingSlots: string[], siteKey = "saabai"): WrapCheck {
  const o = (b ?? {}) as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, max) : "");
  const path = str(o.path, 120);
  if (!path.startsWith("/") || path.startsWith("//") || /[\s<>"'`]/.test(path)) return { ok: false, error: "That page path looks wrong." };
  const kind = o.kind as SlotKind;
  if (!SLOT_KINDS.includes(kind)) return { ok: false, error: "That type of element can't be tested yet." };
  if (isLegalPath(path)) return { ok: false, error: "Legal and privacy pages can't be split tested." };
  const slot = str(o.slot, 80);
  if (!SLOT_RE.test(slot)) return { ok: false, error: "The slot name must look like home.hero.cta." };
  if (existingSlots.includes(slot)) return { ok: false, error: "A test slot with that name already exists." };
  const name = str(o.name, 80);
  if (!name) return { ok: false, error: "Give the test a short name." };
  if (/[\u2013\u2014]/.test(name)) return { ok: false, error: "Please avoid long dashes in the name." };
  const c = (o.control ?? {}) as Record<string, unknown>;
  let text = str(c.text, 200);
  const emphasis = str(c.emphasis, 200);
  // Buttons here render their own trailing arrow, so the stored control is the label without it.
  if (kind === "button") text = text.replace(/\s*(\u2192|&rarr;)\s*$/, "").trim();
  if (!text) return { ok: false, error: "The current copy is missing." };
  if (isProtectedText(text + " " + emphasis)) return { ok: false, error: "The Powered by Saabai.ai credit can't be tested." };
  if (emphasis && !KIND_RULES[kind].emphasis) return { ok: false, error: `A ${KIND_RULES[kind].noun} has no highlighted part.` };
  if (text.length > KIND_RULES[kind].maxText) return { ok: false, error: `That ${KIND_RULES[kind].noun} is too long to test (max ${KIND_RULES[kind].maxText} characters).` };
  const ke = kind === "image" ? kindCopyError(kind, text) : null;
  if (ke) return { ok: false, error: ke };
  const tag = str(o.tag, 10).toLowerCase();
  if (!/^[a-z0-9]{1,8}$/.test(tag)) return { ok: false, error: "Unknown element." };
  return { ok: true, req: { siteKey, path, slot, kind, name, control: { text, ...(emphasis ? { emphasis } : {}) }, tag, section: str(o.section, 40) } };
}

/** The SLOTS entry, as TypeScript source, indented for seed.ts. Control only, so the slot is a draft until variants are added. */
export function slotEntrySource(r: WrapRequest): string {
  const q = (s: string) => JSON.stringify(s);
  const ctl = `{ text: ${q(r.control.text)}${r.control.emphasis ? `, emphasis: ${q(r.control.emphasis)}` : ""} }`;
  return [
    "  {",
    `    id: ${q(experimentIdForSlot(r.slot))},`,
    `    siteKey: ${q(r.siteKey)},`,
    `    slot: ${q(r.slot)},`,
    `    kind: ${q(r.kind)},`,
    `    name: ${q(r.name)},`,
    `    path: ${q(r.path)},`,
    `    control: ${ctl},`,
    "  },",
  ].join("\n");
}

/** Inserts an entry at the end of the SLOTS array. Returns null when the array cannot be found, so we never write a guess. */
export function insertSlotEntry(source: string, entry: string): string | null {
  const start = source.indexOf("export const SLOTS: SlotDecl[] = [");
  if (start < 0) return null;
  const end = source.indexOf("\n];", start);
  if (end < 0) return null;
  return `${source.slice(0, end)}\n${entry}${source.slice(end)}`;
}

export function requestNote(r: WrapRequest): string {
  return [
    `# Slot request: ${r.slot}`,
    "",
    "Created from the visual editor in the Split testing dashboard. It is a request only. Nothing is live and no test is running.",
    "",
    `- Site: ${r.siteKey}`,
    `- Page: ${r.path}`,
    `- Element: <${r.tag}> in section "${r.section || "main"}"`,
    `- Kind: ${r.kind}`,
    `- Current copy: ${JSON.stringify(r.control)}`,
    "",
    "## To finish (only if the PR says it was not wrapped automatically)",
    "",
    `1. Find where this copy renders and wrap it: \`<ExpText slot="${r.slot}">{(v) => ( ...element... {...v.attrs} )}</ExpText>\`, with the control text unchanged.`,
    `2. Keep the \`SLOTS\` entry in \`${SEED_FILE}\`. Add variants only when Shane has approved the copy.`,
    "3. Run `npm run test:exp`, `npx tsc --noEmit` and `npm run build`, then `scripts/site-check.mjs --exp`.",
    "4. Delete this note in the same PR. Never auto-merge. The test still needs a human Start click in the dashboard.",
    "",
  ].join("\n");
}

/** Why a wrap was not applied (shown in the PR). */
export type WrapOutcome = { wrapped: true; file: string } | { wrapped: false; reason: string };

export const prBody = (r: WrapRequest, w?: WrapOutcome, hybrid = false) => {
  const head = `Draft slot request from the visual editor.\n\n- Slot: \`${r.slot}\` (${r.kind}) on \`${r.path}\`\n- Current copy: ${JSON.stringify(r.control)}\n\n`;
  const tail = hybrid
    ? "This test is ALREADY RUNNING through the runtime overlay (same experiment id, same assignments, same results). Merging this wraps the element natively; the overlay then steps aside automatically, so visitors see no change and no data resets. Never auto-merge: check the diff and the preview first."
    : "No test is running and visitors see no change. A test only starts when a human presses Start in the dashboard.";
  if (w?.wrapped) return `${head}**Wrapped automatically** in \`${w.file}\` with \`ExpText\` (control text unchanged). Check the diff and the Vercel preview before merging.\n\n${tail}`;
  return `${head}**Not wrapped automatically.** ${w?.reason ?? "No wrap was attempted."} The element still needs wrapping in \`ExpText\`, see docs/exp-slot-requests. Do not merge until wrapped and checked.\n\n${tail}`;
};

const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ARROW = "(?:\\s*(?:\\u2192|&rarr;))?";

/** Regex source matching text as it may be written in JSX source (entities, line breaks, curly quotes). */
export function textPattern(t: string): string {
  return t.trim().split(/\s+/).map((word) => Array.from(word).map((ch) => {
    if (ch === "'" || ch === "\u2019") return "(?:'|&apos;|&#39;|&rsquo;|\u2019)";
    if (ch === '"') return '(?:"|&quot;)';
    if (ch === "&") return "(?:&amp;|&)";
    if (ch === "\u00a0") return "(?:\u00a0|&nbsp;)";
    return esc(ch);
  }).join("")).join("\\s+");
}

/** Candidate source files for wrapping: server components and pages under app/, never admin, API or client files. */
export const isWrapCandidatePath = (p: string) => /^app\/.+\.tsx$/.test(p) && !/^app\/(saabai-admin|admin|api)\//.test(p) && !/ExpText\.tsx$/.test(p);

const TEXT_TAG_RE = "(?:p|li|blockquote|figcaption|dt|dd|td|th|label|small|span|div|strong|em|h[4-6]|summary|cite)";
const tagsFor = (k: SlotKind) => (k === "button" ? "(?:a|button)" : k === "headline" ? "h[1-3]" : k === "link" ? "a" : TEXT_TAG_RE);

const elementRe = (r: WrapRequest) => new RegExp(`<(${tagsFor(r.kind)})((?:\\s[^<>]*|\\s*\\n[^<>]*?)?)>\\s*${textPattern(r.control.text)}(${r.kind === "button" ? ARROW : ""})\\s*</\\1>`, "g");
const voidRe = (r: WrapRequest) => new RegExp(r.kind === "image" ? "<(img|Image)(\\s[^<>]*?)?\\s*/>" : "<(input|textarea)(\\s[^<>]*?)?\\s*/>", "g");
const attrLit = (name: string, val: string) => new RegExp(`(?:^|\\s)${name}=(?:"${esc(val)}"|'${esc(val)}')`);

const voidMatches = (source: string, r: WrapRequest) => [...source.matchAll(voidRe(r))].filter((m) => !m[0].includes("=>") && attrLit(r.kind === "image" ? "src" : "placeholder", r.control.text).test(m[2] ?? ""));

/** Number of safe literal matches of the request's element in one source file. */
export function countWrapMatches(source: string, r: WrapRequest): number {
  if (/^\s*["']use client["']/m.test(source.slice(0, 200))) return 0;
  if (r.kind === "image" || r.kind === "placeholder") return voidMatches(source, r).length;
  if (r.control.emphasis) return 0;
  return (source.match(elementRe(r)) ?? []).filter((m) => !m.includes("=>")).length;
}

/**
 * Wraps the single literal match in ExpText. Returns null unless there is exactly one match in this file.
 * The control text stays byte for byte, the opening tag keeps its attributes and gains the tracking attrs.
 */
export function wrapSource(source: string, r: WrapRequest): string | null {
  if (countWrapMatches(source, r) !== 1) return null;
  let out: string;
  if (r.kind === "image" || r.kind === "placeholder") {
    const m = voidMatches(source, r)[0];
    const tag = m[1];
    let attrs = (m[2] ?? "").replace(/\s+$/, "");
    if (r.kind === "image") {
      attrs = attrs.replace(attrLit("src", r.control.text), (x) => `${x.match(/^\s/) ? " " : ""}src={v.text}`);
      attrs = attrs.replace(/(^|\s)alt=(?:"[^"]*"|'[^']*')/, (_x, pre: string) => `${pre}alt={v.emphasis ?? ""}`);
    } else {
      attrs = attrs.replace(attrLit("placeholder", r.control.text), (x) => `${x.match(/^\s/) ? " " : ""}placeholder={v.text}`);
    }
    out = source.slice(0, m.index!) + `<ExpText slot="${r.slot}">{(v) => (<${tag}${attrs} {...v.attrs} />)}</ExpText>` + source.slice(m.index! + m[0].length);
  } else {
    const re = elementRe(r);
    out = source.replace(re, (_m, tag: string, attrs: string, arrow: string) => {
      const ev = (r.kind === "button" || r.kind === "link") && !/data-exp-event/.test(attrs) ? ' data-exp-event="cta_click"' : "";
      const suffix = arrow ? `{${JSON.stringify(arrow.replace(/\s+/g, " ").replace("&rarr;", "\u2192").replace(/^(?! )/, " "))}}` : "";
      return `<ExpText slot="${r.slot}">{(v) => (<${tag}${attrs.replace(/\s+$/, "")}${ev} {...v.attrs}>{v.text}${suffix}</${tag}>)}</ExpText>`;
    });
  }
  if (!/from\s+["']@\/app\/components\/exp\/ExpText["']/.test(out)) {
    const imp = 'import ExpText from "@/app/components/exp/ExpText";';
    const all = [...out.matchAll(/^import[\s\S]*?;\s*$/gm)];
    const last = all[all.length - 1];
    out = last ? `${out.slice(0, last.index! + last[0].length)}\n${imp}${out.slice(last.index! + last[0].length)}` : `${imp}\n${out}`;
  }
  return out;
}
