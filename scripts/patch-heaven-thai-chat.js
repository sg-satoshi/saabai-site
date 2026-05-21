#!/usr/bin/env node
// Patches Heaven Thai Massage Blob HTML: replaces phone floating button with chat bubble + popup

require("dotenv").config({ path: ".env.local" });
const { list, put } = require("@vercel/blob");

const OLD_BUTTON = `<a href="tel:0451826539" class="floating-btn" aria-label="Call Heaven Thai Massage on 0451 826 539">
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.82a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
</a>`;

const NEW_BUTTON = `<!-- Chat bubble button -->
<button id="chatBtn" class="floating-btn" aria-label="Chat with us" onclick="document.getElementById('chatPopup').style.display=document.getElementById('chatPopup').style.display==='none'?'flex':'none'">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>
</button>
<div id="chatPopup" style="display:none;position:fixed;bottom:100px;right:24px;z-index:901;width:300px;background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.18);flex-direction:column;overflow:hidden;font-family:inherit">
  <div style="background:var(--primary);padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
    <span style="color:#fff;font-weight:600;font-size:14px">Hi! How can we help?</span>
    <button onclick="document.getElementById('chatPopup').style.display='none'" style="background:none;border:none;color:rgba(255,255,255,.7);font-size:20px;cursor:pointer;line-height:1">×</button>
  </div>
  <div style="padding:16px">
    <p style="margin:0 0 12px;font-size:13px;color:#555;line-height:1.5">Send us a message and we'll get back to you shortly.</p>
    <form id="chatForm" onsubmit="submitChatForm(event)">
      <input id="chatName" type="text" placeholder="Your name" required style="width:100%;padding:8px 12px;border:1px solid #e0e0e0;border-radius:8px;font-size:13px;margin-bottom:8px;box-sizing:border-box;outline:none">
      <input id="chatMsg" type="text" placeholder="Your message..." required style="width:100%;padding:8px 12px;border:1px solid #e0e0e0;border-radius:8px;font-size:13px;margin-bottom:8px;box-sizing:border-box;outline:none">
      <button type="submit" style="width:100%;padding:9px;background:var(--secondary);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Send Message</button>
    </form>
    <div id="chatSuccess" style="display:none;text-align:center;padding:12px 0;color:#1a1a2e;font-size:13px;font-weight:500">Thanks! We'll be in touch soon.</div>
  </div>
</div>
<script>
async function submitChatForm(e){
  e.preventDefault();
  const name=document.getElementById('chatName').value;
  const message=document.getElementById('chatMsg').value;
  try{
    await fetch('https://www.saabai.ai/api/site-factory/lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,message,siteSlug:'heaven-thai-massage'})});
  }catch(_){}
  document.getElementById('chatForm').style.display='none';
  document.getElementById('chatSuccess').style.display='block';
}
</script>`;

async function main() {
  const { blobs } = await list({ prefix: "sites/heaven-thai-massage/" });
  const blob = blobs.find((b) => b.pathname === "sites/heaven-thai-massage/index.html");
  if (!blob) { console.error("Blob not found"); process.exit(1); }

  const res = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
  let html = await res.text();

  if (!html.includes(OLD_BUTTON.trim().slice(0, 60))) {
    console.error("Old button not found in HTML — may have already been patched or format changed");
    console.log("Searching for 'floating-btn' anchor...");
    const idx = html.indexOf('<a href="tel:0451826539"');
    if (idx === -1) { console.error("No tel anchor found either"); process.exit(1); }
    console.log("Found at", idx, ":", html.slice(idx, idx + 80));
    process.exit(1);
  }

  html = html.replace(OLD_BUTTON, NEW_BUTTON);

  await put("sites/heaven-thai-massage/index.html", html, {
    access: "public",
    contentType: "text/html",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  console.log("Patched successfully!");
}

main().catch(e => { console.error(e); process.exit(1); });
