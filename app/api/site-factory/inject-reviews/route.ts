import { NextRequest } from "next/server";
import { put, list } from "@vercel/blob";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ReviewItem {
  name: string;
  rating: number;
  text: string;
  date?: string;
}

const starFull = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbc04"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
const starEmpty = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#e0e0e0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
const googleG = `<svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>`;

const stars = (r: number) => [1,2,3,4,5].map(i => i <= Math.round(r) ? starFull : starEmpty).join("");
const avatarColors = ["#4285F4","#EA4335","#FBBC05","#34A853","#9c27b0","#ff5722","#00bcd4","#607d8b"];
const avatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];
const initials = (name: string) => name.split(" ").map(w => w[0]?.toUpperCase() || "").slice(0,2).join("") || "?";

function buildCards(reviews: ReviewItem[]): string {
  return reviews.map(r => {
    const safe = r.text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    return (
      `<div class="sfrc" style="min-width:280px;max-width:280px;background:#fff;border-radius:12px;padding:18px 16px;` +
      `box-shadow:0 2px 8px rgba(0,0,0,.08);border:1px solid #f0f0f0;flex-shrink:0;scroll-snap-align:start;">` +
      `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">` +
      `<div style="width:40px;height:40px;border-radius:50%;background:${avatarColor(r.name)};color:#fff;` +
      `display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;">${initials(r.name)}</div>` +
      `<div style="flex:1;min-width:0;">` +
      `<div style="font-weight:600;font-size:13px;color:#202124;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.name}</div>` +
      `<div style="display:flex;align-items:center;gap:3px;margin-top:2px;">${stars(r.rating)}<span style="margin-left:2px;">${googleG}</span></div>` +
      `</div></div>` +
      `<p style="margin:0;font-size:13px;color:#3c4043;line-height:1.6;max-height:120px;overflow:hidden;">${safe}</p>` +
      (r.date ? `<p style="margin:8px 0 0;font-size:11px;color:#9aa0a6;">${r.date}</p>` : "") +
      `</div>`
    );
  }).join("");
}

function buildCarouselInner(reviews: ReviewItem[], rating?: number, totalReviews?: number): string {
  const id = "sfr" + Math.random().toString(36).slice(2, 8);
  const displayRating = rating?.toFixed(1) ?? (reviews.reduce((s,r) => s+r.rating, 0)/reviews.length).toFixed(1);
  const displayCount = totalReviews || reviews.length;
  return (
    `<div class="sf-reviews-carousel" style="margin-top:28px;">` +
    `<div style="text-align:center;margin-bottom:20px;">` +
    `<div style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.12);padding:8px 16px;border-radius:50px;">` +
    `<span style="font-size:22px;font-weight:700;line-height:1;">${displayRating}</span>` +
    `<div><div style="display:flex;gap:2px;">${stars(parseFloat(displayRating))}</div>` +
    `<div style="font-size:10px;opacity:0.7;margin-top:1px;">${displayCount > 0 ? displayCount.toLocaleString() + " Google reviews" : "Google reviews"}</div></div>` +
    `<span>${googleG}</span></div></div>` +
    `<div style="position:relative;padding:0 20px;">` +
    `<button onclick="document.getElementById('${id}').scrollBy({left:-296,behavior:'smooth'})" ` +
    `style="position:absolute;left:0;top:50%;transform:translateY(-50%);z-index:10;width:32px;height:32px;border-radius:50%;` +
    `border:1px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.15);cursor:pointer;font-size:18px;color:inherit;` +
    `display:flex;align-items:center;justify-content:center;padding:0;">&#8249;</button>` +
    `<div id="${id}" style="display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;` +
    `-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:4px 2px 8px;">` +
    `${buildCards(reviews)}</div>` +
    `<button onclick="document.getElementById('${id}').scrollBy({left:296,behavior:'smooth'})" ` +
    `style="position:absolute;right:0;top:50%;transform:translateY(-50%);z-index:10;width:32px;height:32px;border-radius:50%;` +
    `border:1px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.15);cursor:pointer;font-size:18px;color:inherit;` +
    `display:flex;align-items:center;justify-content:center;padding:0;">&#8250;</button>` +
    `</div>` +
    `<style>#${id}::-webkit-scrollbar{display:none}</style>` +
    `<script>window.addEventListener('load',function(){var t=document.getElementById('${id}');if(!t)return;` +
    `var p=false;` +
    `t.addEventListener('mouseenter',function(){p=true;});` +
    `t.addEventListener('mouseleave',function(){p=false;});` +
    `setInterval(function(){if(!p){if(t.scrollLeft+t.clientWidth>=t.scrollWidth-2){t.scrollLeft=0;}else{t.scrollLeft+=1;}}},20);});</script>` +
    `</div>`
  );
}

function buildStandaloneSection(reviews: ReviewItem[], rating?: number, totalReviews?: number, businessName?: string): string {
  const id = "sfr" + Math.random().toString(36).slice(2, 8);
  const displayRating = rating?.toFixed(1) ?? (reviews.reduce((s,r) => s+r.rating, 0)/reviews.length).toFixed(1);
  const displayCount = totalReviews || reviews.length;
  const title = businessName ? `What ${businessName} clients say` : "What our clients say";
  return (
    `\n<section class="sf-reviews-carousel" style="padding:60px 20px;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">` +
    `<div style="max-width:1100px;margin:0 auto;">` +
    `<div style="text-align:center;margin-bottom:36px;">` +
    `<h2 style="margin:0 0 14px;font-size:clamp(22px,4vw,30px);font-weight:700;color:#202124;">${title}</h2>` +
    `<div style="display:inline-flex;align-items:center;gap:10px;background:#fff;padding:12px 20px;border-radius:50px;box-shadow:0 2px 8px rgba(0,0,0,.08);">` +
    `<span style="font-size:30px;font-weight:700;color:#202124;line-height:1;">${displayRating}</span>` +
    `<div><div style="display:flex;gap:2px;">${stars(parseFloat(displayRating))}</div>` +
    `<div style="font-size:11px;color:#5f6368;margin-top:2px;">${displayCount > 0 ? displayCount.toLocaleString() + " Google reviews" : "Google reviews"}</div></div>` +
    `<span style="margin-left:2px;">${googleG}</span></div></div>` +
    `<div style="position:relative;padding:0 20px;">` +
    `<button onclick="document.getElementById('${id}').scrollBy({left:-296,behavior:'smooth'})" ` +
    `style="position:absolute;left:0;top:50%;transform:translateY(-50%);z-index:10;width:36px;height:36px;border-radius:50%;` +
    `border:1px solid #dadce0;background:#fff;cursor:pointer;font-size:18px;color:#5f6368;` +
    `box-shadow:0 1px 4px rgba(0,0,0,.15);display:flex;align-items:center;justify-content:center;padding:0;">&#8249;</button>` +
    `<div id="${id}" style="display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;` +
    `-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:4px 2px 16px;">` +
    `${buildCards(reviews)}</div>` +
    `<button onclick="document.getElementById('${id}').scrollBy({left:296,behavior:'smooth'})" ` +
    `style="position:absolute;right:0;top:50%;transform:translateY(-50%);z-index:10;width:36px;height:36px;border-radius:50%;` +
    `border:1px solid #dadce0;background:#fff;cursor:pointer;font-size:18px;color:#5f6368;` +
    `box-shadow:0 1px 4px rgba(0,0,0,.15);display:flex;align-items:center;justify-content:center;padding:0;">&#8250;</button>` +
    `</div></div>` +
    `<style>#${id}::-webkit-scrollbar{display:none}</style>` +
    `<script>(function(){var t=document.getElementById('${id}');if(!t)return;` +
    `var p=false,f=0;` +
    `t.addEventListener('mouseenter',function(){p=true});t.addEventListener('mouseleave',function(){p=false});` +
    `function tick(){if(!p&&++f%2===0){if(t.scrollLeft+t.clientWidth>=t.scrollWidth-4){t.scrollLeft=0}else{t.scrollLeft+=1}}` +
    `requestAnimationFrame(tick)}requestAnimationFrame(tick);` +
    `})()</script>` +
    `</section>\n`
  );
}

// Find a <div ...> tag matching the pattern and replace the entire element (open tag to
// matching </div>) with `replacement`. Returns null if not found.
function replaceDivElement(html: string, pattern: RegExp, replacement: string): string | null {
  const match = html.match(pattern);
  if (!match || match.index === undefined) return null;

  // Walk back from match to find the opening < of this div tag
  const tagStart = html.lastIndexOf("<div", match.index);
  if (tagStart === -1) return null;

  // Find end of opening tag
  const tagClose = html.indexOf(">", tagStart);
  if (tagClose === -1) return null;

  // Count nested <div> to find the matching </div>
  let depth = 1;
  let pos = tagClose + 1;
  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf("<div", pos);
    const nextClose = html.indexOf("</div>", pos);
    if (nextClose === -1) return null;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) return html.slice(0, tagStart) + replacement + html.slice(nextClose + 6);
      pos = nextClose + 6;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { slug, reviews, rating, totalReviews, businessName } = await req.json();
    if (!slug) return Response.json({ error: "slug required" }, { status: 400 });
    if (!Array.isArray(reviews) || reviews.length === 0) {
      return Response.json({ error: "reviews array required" }, { status: 400 });
    }

    const { blobs } = await list({ prefix: `sites/${slug}/index.html` });
    const blob = blobs.find(b => b.pathname === `sites/${slug}/index.html`);
    if (!blob) return Response.json({ error: "Site not found" }, { status: 404 });

    const htmlRes = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
    let html = await htmlRes.text();

    // Remove any previously injected standalone carousel section (sections don't nest so this is safe)
    html = html.replace(/<section[^>]+class="sf-reviews-carousel"[\s\S]*?<\/section>/gi, "");

    let injected = false;
    const carouselInner = buildCarouselInner(reviews, rating, totalReviews);

    // ── Strategy 0: replace a previously injected inline carousel div ────────
    // On re-injection the testimonials-grid div is already gone — replaced by sf-reviews-carousel.
    // Use the same depth-counting replacer to swap it for the updated carousel.
    if (!injected) {
      const result = replaceDivElement(html, /class="sf-reviews-carousel"/, carouselInner);
      if (result) { html = result; injected = true; }
    }

    // ── Strategy 1: replace an existing testimonials/reviews grid div ────────
    // Common class names used by AI-generated sites for review/testimonial grids.
    // Only match in the HTML body (not inside <style> blocks).
    const gridPatterns = [
      /class="testimonials-grid"/i,
      /class="reviews-grid"/i,
      /class="testimonials-container"/i,
      /class="reviews-container"/i,
      /class="testimonials-list"/i,
    ];

    if (!injected) {
      // Skip matches that appear inside <style> blocks
      const styleEnd = html.lastIndexOf("</style>");
      for (const pattern of gridPatterns) {
        const m = html.match(pattern);
        if (m && m.index !== undefined && m.index > styleEnd) {
          const result = replaceDivElement(html, pattern, carouselInner);
          if (result) { html = result; injected = true; break; }
        }
      }
    }

    // ── Strategy 2: inject standalone section before <footer or </body> ──────
    if (!injected) {
      const carousel = buildStandaloneSection(reviews, rating, totalReviews, businessName);
      const footerIdx = html.search(/<footer[\s>]/i);
      if (footerIdx !== -1) {
        html = html.slice(0, footerIdx) + carousel + html.slice(footerIdx);
      } else if (html.includes("</body>")) {
        html = html.replace("</body>", carousel + "</body>");
      } else {
        html = html + carousel;
      }
    }

    await put(`sites/${slug}/index.html`, html, {
      access: "public",
      contentType: "text/html",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return Response.json({ ok: true, html: Buffer.from(html).toString("base64") });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
