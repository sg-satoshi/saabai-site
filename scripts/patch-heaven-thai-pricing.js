#!/usr/bin/env node
// Patches Heaven Thai Massage blob HTML:
// 1. Adds logo image to nav
// 2. Injects a full pricing section

require("dotenv").config({ path: ".env.local" });
const { list, put } = require("@vercel/blob");

const SLUG = "heaven-thai-massage";
const LOGO_URL =
  "https://img1.wsimg.com/isteam/ip/61092a64-2d70-4a23-9f13-07f663221bae/ChatGPT%20Image%20Sep%2022%2C%202025%2C%2009_40_03%20PM.png";

const PRICING_SECTION = `
<!-- PRICING SECTION -->
<section id="pricing" style="padding:80px 24px;background:#fdfbf5">
<div style="max-width:1100px;margin:0 auto">
<div style="text-align:center;margin-bottom:56px">
  <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#c9a84c">Our Treatments</p>
  <h2 style="margin:0 0 16px;font-size:clamp(28px,4vw,42px);font-weight:700;color:#1b3a2d;letter-spacing:-.02em">Pricing &amp; Services</h2>
  <p style="margin:0 auto;max-width:520px;font-size:16px;color:#4a5568;line-height:1.7">Genuine Thai healing techniques delivered by experienced therapists. Every session is tailored to your needs.</p>
</div>

<!-- Two location cards -->
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:32px;align-items:start">

  <!-- Worongary -->
  <div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(27,58,45,.1);border:1px solid rgba(201,168,76,.15)">
    <div style="background:linear-gradient(135deg,#1b3a2d,#2d5c45);padding:28px 32px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <h3 style="margin:0;font-size:18px;font-weight:700;color:#fff">Worongary</h3>
      </div>
      <a href="tel:0451826539" style="font-size:14px;color:#c9a84c;text-decoration:none;display:flex;align-items:center;gap:6px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#c9a84c"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.35.27 2.67.76 3.88a1 1 0 01-.24 1.11l-2.4 2.8z"/></svg>
        0451 826 539
      </a>
    </div>
    <div style="padding:28px 32px;display:flex;flex-direction:column;gap:0">
      ${[
        ["Trial Massage", "15 min", "$20", "Relaxation or Deep Tissue — perfect first visit"],
        ["Relaxation Massage", "30 min", "$60", null],
        ["Relaxation Massage", "60 min", "$100", null],
        ["Relaxation Massage", "90 min", "$160", null],
        ["Heaven Thai Signature", "60 min", "$120", "Our most popular treatment"],
        ["Deep Tissue", "30 min", "$70", null],
        ["Deep Tissue", "60 min", "$110", null],
        ["Deep Tissue", "90 min", "$180", null],
      ].map(([name, dur, price, note], i, arr) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;${i < arr.length - 1 ? 'border-bottom:1px solid rgba(0,0,0,.06)' : ''}">
        <div>
          <p style="margin:0;font-size:14px;font-weight:600;color:#1b3a2d">${name}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#718096">${dur}${note ? ` · ${note}` : ''}</p>
        </div>
        <div style="background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);border-radius:8px;padding:6px 14px;font-size:15px;font-weight:700;color:#c9a84c;white-space:nowrap;margin-left:16px">${price}</div>
      </div>`).join('')}
    </div>
  </div>

  <!-- Southport -->
  <div style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(27,58,45,.1);border:1px solid rgba(201,168,76,.15)">
    <div style="background:linear-gradient(135deg,#1b3a2d,#2d5c45);padding:28px 32px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <h3 style="margin:0;font-size:18px;font-weight:700;color:#fff">Southport</h3>
      </div>
      <a href="tel:0491460208" style="font-size:14px;color:#c9a84c;text-decoration:none;display:flex;align-items:center;gap:6px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#c9a84c"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.35.27 2.67.76 3.88a1 1 0 01-.24 1.11l-2.4 2.8z"/></svg>
        0491 460 208
      </a>
    </div>
    <div style="padding:28px 32px;display:flex;flex-direction:column;gap:0">
      ${[
        ["Deep Tissue / Relaxation", "30 min", "$60", null],
        ["Deep Tissue / Relaxation", "60 min", "$100", null],
        ["Deep Tissue / Relaxation", "90 min", "$150", null],
      ].map(([name, dur, price, note], i, arr) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;${i < arr.length - 1 ? 'border-bottom:1px solid rgba(0,0,0,.06)' : ''}">
        <div>
          <p style="margin:0;font-size:14px;font-weight:600;color:#1b3a2d">${name}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#718096">${dur}${note ? ` · ${note}` : ''}</p>
        </div>
        <div style="background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);border-radius:8px;padding:6px 14px;font-size:15px;font-weight:700;color:#c9a84c;white-space:nowrap;margin-left:16px">${price}</div>
      </div>`).join('')}
      <div style="margin-top:20px;padding:14px 16px;background:#fff8ed;border-radius:10px;border-left:3px solid #c9a84c">
        <p style="margin:0;font-size:12px;color:#92714a;font-weight:500">⚠ No Private Health Fund available at this location</p>
      </div>
    </div>
  </div>

</div>

<!-- CTA under pricing -->
<div style="text-align:center;margin-top:48px">
  <a href="#contact" style="display:inline-block;padding:16px 40px;background:#c9a84c;color:#fff;border-radius:12px;font-size:16px;font-weight:700;text-decoration:none;box-shadow:0 8px 24px rgba(201,168,76,.35);transition:transform .2s,box-shadow .2s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 12px 32px rgba(201,168,76,.45)'" onmouseout="this.style.transform='';this.style.boxShadow='0 8px 24px rgba(201,168,76,.35)'">Book Your Session</a>
  <p style="margin:12px 0 0;font-size:13px;color:#718096">Walk-ins welcome · Gift vouchers available</p>
</div>
</div>
</section>`;

async function main() {
  const { blobs } = await list({ prefix: `sites/${SLUG}/` });
  const blob = blobs.find((b) => b.pathname === `sites/${SLUG}/index.html`);
  if (!blob) { console.error("Blob not found"); process.exit(1); }

  const res = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
  let html = await res.text();
  console.log("Original length:", html.length);

  // 1. Add logo to nav — find the nav-logo-text span and add the logo img before it
  const logoTarget = `class="nav-logo"`;
  if (html.includes(logoTarget)) {
    // Replace the nav-logo anchor content to lead with the real logo image
    const logoAnchorStart = html.indexOf(`<a`, html.indexOf(logoTarget) - 5);
    const logoAnchorEnd = html.indexOf(`</a>`, logoAnchorStart) + 4;
    const logoAnchorHtml = html.slice(logoAnchorStart, logoAnchorEnd);
    console.log("Nav logo anchor:", logoAnchorHtml.slice(0, 120));

    const newLogoAnchor = `<a class="nav-logo" aria-label="Heaven Thai Massage Home" href="#home" style="display:flex;align-items:center;gap:10px;text-decoration:none"><img src="${LOGO_URL}" alt="Heaven Thai Massage logo" style="height:44px;width:auto;object-fit:contain" loading="eager"><span class="nav-logo-text" style="display:flex;flex-direction:column"><span class="nav-logo-main">Heaven Thai</span><span class="nav-logo-sub">Massage Studio · Worongary</span></span></a>`;
    html = html.slice(0, logoAnchorStart) + newLogoAnchor + html.slice(logoAnchorEnd);
    console.log("Logo injected into nav");
  } else {
    console.warn("nav-logo anchor not found, skipping logo");
  }

  // 2. Add pricing section — inject before the testimonials section or before the footer
  // Try to find a good insertion point
  let inserted = false;
  const anchors = [
    '<section id="testimonials"',
    '<section id="about"',
    '<section id="cta"',
    '<footer',
  ];
  for (const anchor of anchors) {
    if (html.includes(anchor)) {
      // Check pricing section doesn't already exist
      if (html.includes('id="pricing"')) {
        console.log("Pricing section already exists, skipping");
        inserted = true;
        break;
      }
      html = html.replace(anchor, PRICING_SECTION + "\n" + anchor);
      console.log("Pricing section injected before:", anchor);
      inserted = true;
      break;
    }
  }
  if (!inserted) {
    // Last resort: inject before </main> or before </body>
    const target = html.includes("</main>") ? "</main>" : "</body>";
    html = html.replace(target, PRICING_SECTION + "\n" + target);
    console.log("Pricing section injected before:", target);
  }

  // 3. Add Pricing link to nav if not present
  if (!html.includes('href="#pricing"')) {
    html = html.replace(
      /<li><a href="#services">Services<\/a><\/li>/,
      `<li><a href="#services">Services</a></li><li><a href="#pricing">Pricing</a></li>`
    );
    console.log("Pricing nav link added");
  }

  await put(`sites/${SLUG}/index.html`, html, {
    access: "public",
    contentType: "text/html",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  console.log("Done. New length:", html.length);
}

main().catch((e) => { console.error(e); process.exit(1); });
