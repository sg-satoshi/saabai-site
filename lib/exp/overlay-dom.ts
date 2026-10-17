import { chooseTarget, fingerprint, SELECTOR_RE, type Cand } from "./overlay";
import { imagePathOf } from "./editor-dom";
import { isProtectedText } from "./editor";

/** Browser-only. What identifies an element's copy: image path, field hint, or its text. */
export function sigOf(el: HTMLElement): string {
  if (el.tagName === "IMG") return imagePathOf(el);
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return el.getAttribute("placeholder") ?? "";
  return el.textContent ?? "";
}

const GUARD = "[data-no-test], [itemprop], [data-exp-slot], [data-exp-id], script, style, svg, [data-sb-protected]";

/** True when the element must never be overlaid: other tests, structured data, opt-outs, the footer credit. */
export function isGuarded(el: HTMLElement): boolean {
  if (el.closest(GUARD)) return true;
  if (isProtectedText(el.textContent ?? "")) return true;
  const par = el.parentElement;
  return !!par && (par.textContent ?? "").length < 120 && isProtectedText(par.textContent ?? "");
}

/** Finds the element for a stored target: selector first, then text fingerprint, so copy and markup edits can't mis-target. */
export function findTarget(doc: Document, t: { s: string; f: string; t: string }): HTMLElement | null {
  if (!SELECTOR_RE.test(t.s)) return null;
  const cands: { el: HTMLElement; c: Cand }[] = [];
  const seen = new Set<Element>();
  try {
    doc.querySelectorAll<HTMLElement>(t.s).forEach((el) => { if (el.tagName.toLowerCase() === t.t && !seen.has(el)) { seen.add(el); cands.push({ el, c: { text: sigOf(el), viaSelector: true } }); } });
  } catch { /* bad selector */ }
  doc.querySelectorAll<HTMLElement>(t.t).forEach((el) => { if (!seen.has(el) && !isGuarded(el) && el.children.length < 3) { seen.add(el); cands.push({ el, c: { text: sigOf(el), viaSelector: false } }); } });
  const i = chooseTarget(t.f, cands.map((x) => x.c));
  const el = i >= 0 ? cands[i].el : null;
  return el && !isGuarded(el) ? el : null;
}

const GENERATED_ID = /\d{3,}|^:|^radix|^headlessui|^react|^__/i;

/** A selector built only from tag, stable id and nth-of-type, verified to match exactly this element. Null when none works. */
export function stableSelector(el: HTMLElement): string | null {
  const doc = el.ownerDocument;
  const parts: string[] = [];
  let n: HTMLElement | null = el;
  for (let d = 0; n && n !== doc.documentElement && d < 12; d++, n = n.parentElement) {
    if (n.id && /^[A-Za-z][\w-]{0,40}$/.test(n.id) && !GENERATED_ID.test(n.id) && doc.querySelectorAll(`#${n.id}`).length === 1) { parts.unshift(`#${n.id}`); break; }
    const tag = n.tagName.toLowerCase();
    if (tag === "body") { parts.unshift("body"); break; }
    const same = n.parentElement ? Array.from(n.parentElement.children).filter((c) => c.tagName === n!.tagName) : [n];
    parts.unshift(`${tag}:nth-of-type(${same.indexOf(n) + 1})`);
  }
  const sel = parts.join(">");
  if (!SELECTOR_RE.test(sel)) return null;
  try { const m = doc.querySelectorAll(sel); return m.length === 1 && m[0] === el ? sel : null; } catch { return null; }
}

export { fingerprint };
