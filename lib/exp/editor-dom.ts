import type { SlotKind } from "./core";

/** Browser-only helpers for the editor's same-origin preview frame. Preview only: never touches stored copy. */

/** What to restore later: innerHTML for normal elements, attributes for images and inputs. */
export function captureOrig(el: HTMLElement): string {
  const t = el.tagName;
  if (t === "IMG") return JSON.stringify({ src: el.getAttribute("src") ?? "", srcset: el.getAttribute("srcset") ?? "" });
  if (t === "INPUT" || t === "TEXTAREA") return JSON.stringify({ ph: el.getAttribute("placeholder") ?? "" });
  return el.innerHTML;
}

/** Site-relative path of an image, undoing the Next image optimiser URL (/_next/image?url=...). */
export function imagePathOf(el: HTMLElement): string {
  const src = el.getAttribute("src") ?? "";
  try {
    const u = new URL(src, window.location.origin);
    if (u.pathname === "/_next/image") return u.searchParams.get("url") ?? "";
    return u.origin === window.location.origin ? u.pathname : "";
  } catch { return ""; }
}

export function previewInto(el: HTMLElement, orig: string, kind: SlotKind, v: { text: string; emphasis?: string } | null): void {
  if (kind === "image") {
    const o = JSON.parse(orig) as { src: string; srcset: string };
    if (!v) { el.setAttribute("src", o.src); if (o.srcset) el.setAttribute("srcset", o.srcset); return; }
    el.removeAttribute("srcset"); el.setAttribute("src", v.text);
    return;
  }
  if (kind === "placeholder") {
    const o = JSON.parse(orig) as { ph: string };
    el.setAttribute("placeholder", v ? v.text : o.ph);
    return;
  }
  el.innerHTML = orig;
  if (!v) return;
  if (kind === "button") {
    const arrow = /\s→\s*$/.test(el.textContent ?? "");
    el.textContent = v.text + (arrow ? " →" : "");
    return;
  }
  if (kind !== "headline") { el.textContent = v.text; return; }
  const textNode = Array.from(el.childNodes).find((n) => n.nodeType === 3 && (n.nodeValue ?? "").trim());
  const span = el.querySelector(":scope > span");
  if (textNode) textNode.nodeValue = `${v.text} `;
  if (span) span.textContent = v.emphasis ?? "";
  else if (v.emphasis && textNode) textNode.nodeValue = `${v.text} ${v.emphasis}`;
}

export function sectionOf(el: Element): string {
  if (el.tagName === "H1") return "hero";
  const sec = el.closest("[data-section], section[id], section, main");
  if (!sec) return "main";
  const named = sec.getAttribute("data-section") || sec.id;
  if (named) return named;
  const h = sec.querySelector("h1, h2");
  return (h?.textContent ?? "").trim().split(/\s+/).slice(0, 3).join(" ") || "main";
}
