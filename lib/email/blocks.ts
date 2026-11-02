/**
 * SUNDER email document. Table layout, brand colours, fallback fonts.
 * The compliance footer is added by renderMarketingEmail, not here, so it cannot be edited out of a block.
 */
import { escapeHtml } from "../html-escape";

export const SUNDER_LOGO_URL = "https://sunder.com.au/clients/sunder/img/sunder-lockup-colour-dark-1000w.png";

const HEAD = "Archivo, Arial Black, Arial, sans-serif";
const BODY = "Inter Tight, Arial, sans-serif";

export type Block =
  | { id: string; kind: "heading"; text: string }
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "image"; src: string; alt: string }
  | { id: string; kind: "button"; label: string; href: string }
  | { id: string; kind: "divider" }
  | { id: string; kind: "columns"; left: string; right: string }
  | { id: string; kind: "product"; title: string; text: string; href: string };

export function newBlock(kind: Block["kind"]): Block {
  const id = Math.random().toString(36).slice(2, 10);
  if (kind === "heading") return { id, kind, text: "" };
  if (kind === "text") return { id, kind, text: "" };
  if (kind === "image") return { id, kind, src: "", alt: "" };
  if (kind === "button") return { id, kind, label: "", href: "https://sunder.com.au" };
  if (kind === "divider") return { id, kind };
  if (kind === "columns") return { id, kind, left: "", right: "" };
  return { id, kind, title: "", text: "", href: "https://sunder.com.au" };
}

function paragraphs(text: string, style: string): string {
  return text.split("\n").map((line) => `<p style="${style}">${escapeHtml(line) || "&nbsp;"}</p>`).join("");
}

function blockHtml(block: Block): string {
  if (block.kind === "heading") {
    return `<h1 style="margin:28px 0 16px;font-family:${HEAD};font-weight:800;font-size:44px;line-height:0.95;letter-spacing:-0.03em;text-transform:uppercase;color:#ffffff;">${escapeHtml(block.text)}</h1>`;
  }
  if (block.kind === "text") {
    return paragraphs(block.text, `margin:0 0 14px;font-family:${BODY};font-size:16px;line-height:1.6;color:#f2f2ee;`);
  }
  if (block.kind === "image") {
    if (!block.src.trim()) {
      return `<p style="margin:16px 0;background:#1a1a1a;color:#8a8a84;font-family:${BODY};font-size:14px;text-align:center;padding:80px 16px;">Image block, 520 × 260, alt text required</p>`;
    }
    return `<p style="margin:16px 0;"><img src="${escapeHtml(block.src.trim())}" alt="${escapeHtml(block.alt)}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;"></p>`;
  }
  if (block.kind === "button") {
    return `<p style="margin:22px 0;"><a href="${escapeHtml(block.href.trim())}" style="display:inline-block;background:#d4ff3a;color:#0d0d0d;font-family:${HEAD};font-weight:800;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none;padding:14px 22px;">${escapeHtml(block.label)}</a></p>`;
  }
  if (block.kind === "divider") {
    return `<p style="margin:18px 0;border-top:1px solid #2a2a2a;font-size:0;line-height:0;">&nbsp;</p>`;
  }
  if (block.kind === "columns") {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;"><tr>
      <td width="50%" valign="top" style="padding-right:10px;font-family:${BODY};font-size:16px;line-height:1.6;color:#f2f2ee;">${escapeHtml(block.left)}</td>
      <td width="50%" valign="top" style="padding-left:10px;font-family:${BODY};font-size:16px;line-height:1.6;color:#f2f2ee;">${escapeHtml(block.right)}</td>
    </tr></table>`;
  }
  return `<p style="margin:16px 0;font-family:${BODY};font-size:16px;line-height:1.6;color:#f2f2ee;"><a href="${escapeHtml(block.href)}" style="color:#d4ff3a;font-family:${HEAD};font-weight:800;text-decoration:none;">${escapeHtml(block.title)}</a><br>${escapeHtml(block.text)}</p>`;
}

/** Shell without the locked compliance footer. */
export function documentHtml(input: { preheader: string; blocks: Block[] }): string {
  const pre = input.preheader.trim();
  const hidden = pre
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#0d0d0d;">${escapeHtml(pre)}</div>`
    : "";
  const inner = input.blocks.map(blockHtml).join("");
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f2f2ee;">
${hidden}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2ee;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0d0d0d;">
  <tr><td style="padding:28px 40px 18px;">
    <img src="${SUNDER_LOGO_URL}" alt="Sunder Pickleball" width="150" style="display:block;width:150px;max-width:150px;height:auto;border:0;">
    <p style="margin:8px 0 0;font-family:${HEAD};font-size:11px;letter-spacing:0.14em;font-weight:800;color:#d4ff3a;">SPLIT THE GAME OPEN.</p>
  </td></tr>
  <tr><td style="padding:8px 40px 8px;">${inner}</td></tr>
  <tr><td><!--EMAIL_FOOTER--></td></tr>
</table>
</td></tr></table></body></html>`;
}

export function textToBlocks(body: string): Block[] {
  return [{ id: "body", kind: "text", text: body }];
}

const KINDS = new Set(["heading", "text", "image", "button", "divider", "columns", "product"]);

export function parseBlocks(value: unknown): Block[] | null {
  if (!Array.isArray(value)) return null;
  const out: Block[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const b = raw as Record<string, unknown>;
    const kind = String(b.kind || "");
    if (!KINDS.has(kind)) return null;
    const id = String(b.id || "").slice(0, 40) || Math.random().toString(36).slice(2, 10);
    const text = String(b.text || "").slice(0, 4000);
    const src = String(b.src || "").slice(0, 1000);
    const alt = String(b.alt || "").slice(0, 200);
    const href = String(b.href || "").slice(0, 1000);
    const label = String(b.label || "").slice(0, 120);
    const left = String(b.left || "").slice(0, 2000);
    const right = String(b.right || "").slice(0, 2000);
    const title = String(b.title || "").slice(0, 200);
    if (kind === "heading" || kind === "text") out.push({ id, kind, text });
    else if (kind === "image") out.push({ id, kind: "image", src, alt });
    else if (kind === "button") out.push({ id, kind: "button", label, href });
    else if (kind === "divider") out.push({ id, kind: "divider" });
    else if (kind === "columns") out.push({ id, kind: "columns", left, right });
    else out.push({ id, kind: "product", title, text, href });
  }
  return out.slice(0, 40);
}
