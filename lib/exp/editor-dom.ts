/** Browser-only helpers for the editor's same-origin preview frame. Preview only: never touches stored copy. */
export function previewInto(el: HTMLElement, origHtml: string, kind: "headline" | "button", v: { text: string; emphasis?: string } | null): void {
  el.innerHTML = origHtml;
  if (!v) return;
  if (kind === "button") {
    const arrow = /\s→\s*$/.test(el.textContent ?? "");
    el.textContent = v.text + (arrow ? " →" : "");
    return;
  }
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
