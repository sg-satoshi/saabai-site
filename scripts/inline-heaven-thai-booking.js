#!/usr/bin/env node
// Removes floating booking button + modal, embeds booking form inline into the page
require("dotenv").config({ path: ".env.local" });
const { put } = require("@vercel/blob");
const fs = require("fs");

const SLUG = "heaven-thai-massage";
const HOST = "https://www.saabai.ai";
const LEAD_API = `${HOST}/api/site-factory/lead`;

let html = fs.readFileSync("ht-html-current.txt", "utf8");

// ========== 1. Remove floating button + modal HTML ==========
const floatingStart = html.indexOf("<!-- Booking Form -->");
const bookingJsStart = html.indexOf("// Booking form\nfunction htOpenBooking");

if (floatingStart === -1 || bookingJsStart === -1) {
  console.error("Could not find booking form in HTML. Already removed?");
  // Check what's left
  if (html.includes("ht-booking-btn")) console.log("Still has ht-booking-btn");
  if (html.includes("ht-modal")) console.log("Still has ht-modal");
  if (html.includes("htSubmitBooking")) console.log("Still has htSubmitBooking");
  process.exit(1);
}

// Remove floating button + modal HTML (from "<!-- Booking Form -->" to the end of the modal div)
// Find the end of the modal HTML — it's the closing </div> of ht-modal
const modalEnd = html.indexOf("</div>\n", html.indexOf('id="htModal"'));
const modalCloseTag = html.indexOf("</div>", modalEnd + 10);
// The modal HTML ends right before the booking JS starts
html = html.slice(0, floatingStart) + html.slice(bookingJsStart);

// Remove the booking JS function definitions
const bookingJsEnd = html.indexOf("// Booking form\nfunction htOpenBooking()", bookingJsStart);
// Actually the JS is already there since we cut at bookingJsStart. Let me find the end.
const afterSubmit = html.indexOf("}\n", html.indexOf("htSubmitBooking"));  
// Find the last booking JS line and cut it
const lastBookingLine = html.lastIndexOf("}\n", html.indexOf("</script>", html.indexOf("htSubmitBooking")));

// Let me take a cleaner approach - find the beginning and end of the booking JS block
const bookingBlockStart = html.indexOf("// Booking form");
const bookingBlockEnd = html.indexOf("</script>", bookingBlockStart) + "</script>".length;
const bookingBlock = html.slice(bookingBlockStart, bookingBlockEnd);

console.log("Booking JS block found at", bookingBlockStart, "to", bookingBlockEnd);
console.log("First line:", bookingBlock.split("\n")[0].trim());
console.log("Last line:", bookingBlock.split("\n").pop().trim());

// Remove the booking JS block
html = html.slice(0, bookingBlockStart) + html.slice(bookingBlockEnd);

// ========== 2. Remove booking CSS ==========
const bookingCssStart = html.indexOf("/* ========================\n   BOOKING FORM\n======================== */");
const bookingCssEnd = html.indexOf("/* ========================\n   SITE FACTORY\n======================== */");

if (bookingCssStart !== -1 && bookingCssEnd !== -1) {
  html = html.slice(0, bookingCssStart) + html.slice(bookingCssEnd);
  console.log("Removed booking CSS styles");
} else {
  console.log("Could not find booking CSS boundaries, trying by style tag");
  // Fallback: find the style block that contains ht-booking-btn
  const styleEnd = html.indexOf("</style>", html.indexOf("ht-booking-btn"));
  if (styleEnd !== -1) {
    const styleStart = html.lastIndexOf("<style>", styleEnd);
    html = html.slice(0, styleStart) + html.slice(styleEnd + 8);
    console.log("Removed style block by ht-booking-btn search");
  }
}

// ========== 3. Insert inline booking form section ==========
// Insert between the CTA section and the Locations section
const insertPoint = html.indexOf('<section id="locations"');
if (insertPoint === -1) {
  console.error("Could not find locations section insertion point");
  process.exit(1);
}

const inlineSection = `
</section><!-- end CTA section -->

<!-- ========================
     INLINE BOOKING FORM SECTION
======================== -->
<section id="booking" style="padding:80px 24px;background:#fff" aria-label="Book Online">
  <style>
    #booking .bk-wrap{max-width:1100px;margin:0 auto}
    #booking .bk-header{text-align:center;margin-bottom:48px}
    #booking .bk-tag{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#c9a84c;margin:0 0 8px}
    #booking h2{margin:0 0 12px;font-size:clamp(28px,4vw,42px);font-weight:700;color:#1a1a2e;letter-spacing:-.02em;font-family:'Playfair Display',serif}
    #booking .bk-sub{font-size:15px;color:#6b6b80;max-width:560px;margin:0 auto;line-height:1.6}
    #booking .bk-grid{display:grid;grid-template-columns:1fr;gap:40px;max-width:800px;margin:0 auto}
    @media(min-width:768px){#booking .bk-grid{grid-template-columns:1fr 1fr}}
    #booking .bk-form-card{background:#f8f6f1;border-radius:20px;padding:32px;border:1px solid rgba(201,168,76,.12)}
    #booking .bk-form-card h3{margin:0 0 20px;font-size:18px;font-weight:700;color:#1a1a2e}
    #booking .bk-field{margin-bottom:14px}
    #booking .bk-field label{display:block;font-size:12px;font-weight:600;color:#1a1a2e;margin-bottom:4px}
    #booking .bk-field label .req{color:#dc2626}
    #booking .bk-field input,
    #booking .bk-field select,
    #booking .bk-field textarea{width:100%;padding:10px 13px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:14px;outline:none;font-family:inherit;box-sizing:border-box;transition:border-color .2s;background:#fff}
    #booking .bk-field input:focus,
    #booking .bk-field select:focus,
    #booking .bk-field textarea:focus{border-color:#c9a84c}
    #booking .bk-field textarea{resize:vertical;min-height:50px}
    #booking .bk-row{display:flex;gap:10px}
    #booking .bk-row .bk-field{flex:1}
    #booking .bk-submit{width:100%;padding:12px;background:#c9a84c;color:#1a1a2e;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;transition:background .2s;font-family:inherit}
    #booking .bk-submit:hover{background:#e8c97a}
    #booking .bk-submit:disabled{opacity:.5;cursor:default}
    #booking .bk-success{display:none;text-align:center;padding:40px 20px;background:#f0fdf4;border-radius:16px;border:1px solid #bbf7d0}
    #booking .bk-success svg{width:44px;height:44px;color:#16a34a;margin-bottom:10px}
    #booking .bk-success h4{font-size:17px;color:#1a1a2e;margin:0 0 6px}
    #booking .bk-success p{font-size:14px;color:#6b6b80;margin:0;line-height:1.5}
    #booking .bk-error{display:none;padding:10px 14px;background:#fef2f2;color:#dc2626;border-radius:8px;font-size:13px;margin-bottom:12px}

    #booking .bk-info-card{background:#1a1a2e;border-radius:20px;padding:32px;color:#fff}
    #booking .bk-info-card h3{margin:0 0 16px;font-size:18px;font-weight:700;color:#c9a84c}
    #booking .bk-info-item{display:flex;gap:12px;margin-bottom:16px;align-items:flex-start}
    #booking .bk-info-item svg{flex-shrink:0;margin-top:2px}
    #booking .bk-info-text{font-size:14px;line-height:1.5;color:rgba(255,255,255,.85)}
    #booking .bk-info-text strong{color:#fff;font-weight:600}
    #booking .bk-divider{height:1px;background:rgba(201,168,76,.25);margin:16px 0}
    #booking .bk-hours{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)}
    #booking .bk-hours:last-child{border-bottom:none}
    #booking .bk-hours-day{font-size:13px;color:rgba(255,255,255,.7)}
    #booking .bk-hours-time{font-size:13px;font-weight:600;color:#fff}
  </style>

  <div class="bk-wrap">
    <div class="bk-header">
      <p class="bk-tag">Book Online</p>
      <h2>Request Your Session</h2>
      <p class="bk-sub">Fill in the form below and Gina will call you back to confirm your time and therapist. Same-day bookings often available.</p>
    </div>

    <div class="bk-grid">
      <div class="bk-form-card">
        <div class="bk-error" id="bkFormError"></div>
        <form id="bkForm" onsubmit="bkSubmit(event)">
          <div class="bk-field">
            <label>Your Name <span class="req">*</span></label>
            <input type="text" id="bkName" placeholder="e.g. Sarah" required>
          </div>
          <div class="bk-field">
            <label>Phone <span class="req">*</span></label>
            <input type="tel" id="bkPhone" placeholder="0401 234 567" required>
          </div>
          <div class="bk-row">
            <div class="bk-field">
              <label>Location <span class="req">*</span></label>
              <select id="bkLocation" required>
                <option value="">Select...</option>
                <option value="Worongary">Worongary</option>
                <option value="Southport">Southport</option>
              </select>
            </div>
            <div class="bk-field">
              <label>Preferred Date/Time</label>
              <input type="text" id="bkDateTime" placeholder="e.g. Fri 2pm">
            </div>
          </div>
          <div class="bk-row">
            <div class="bk-field">
              <label>Service <span class="req">*</span></label>
              <select id="bkService" required>
                <option value="">Select...</option>
                <option value="Relaxation Massage">Relaxation Massage</option>
                <option value="Deep Tissue Massage">Deep Tissue Massage</option>
                <option value="Heaven Thai Signature">Heaven Thai Signature</option>
                <option value="Authentic Thai Massage">Authentic Thai Massage</option>
                <option value="Hot Stone Massage">Hot Stone Massage</option>
                <option value="Couples Massage">Couples Massage</option>
                <option value="Foot Reflexology">Foot Reflexology</option>
              </select>
            </div>
            <div class="bk-field">
              <label>Duration</label>
              <select id="bkDuration">
                <option value="">Not sure yet</option>
                <option value="15 min">15 min (Trial)</option>
                <option value="30 min">30 min</option>
                <option value="45 min">45 min</option>
                <option value="60 min">60 min</option>
                <option value="75 min">75 min</option>
                <option value="90 min">90 min</option>
                <option value="120 min">120 min</option>
              </select>
            </div>
          </div>
          <div class="bk-field">
            <label>Notes (optional)</label>
            <textarea id="bkNotes" placeholder="Any specific concerns — sore back, tension areas, etc."></textarea>
          </div>
          <button type="submit" class="bk-submit" id="bkSubmitBtn">Request Booking</button>
        </form>
        <div class="bk-success" id="bkSuccess">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <h4>Thanks, we'll be in touch!</h4>
          <p>Gina will call you back to confirm your booking.<br>For immediate help, call <strong>0451 826 539</strong></p>
        </div>
      </div>

      <div class="bk-info-card">
        <h3>Prefer to call or text?</h3>

        <div class="bk-info-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="2"><rect x="3" y="2" width="18" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
          <div class="bk-info-text">
            <strong>Call us</strong><br>
            <a href="tel:0451826539" style="color:#c9a84c;text-decoration:none">0451 826 539</a> (Worongary)<br>
            <a href="tel:0491460208" style="color:#c9a84c;text-decoration:none">0491 460 208</a> (Southport)
          </div>
        </div>

        <div class="bk-info-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <div class="bk-info-text">
            <strong>Text us</strong><br>
            <a href="sms:0451826539" style="color:#c9a84c;text-decoration:none">0451 826 539</a>
          </div>
        </div>

        <div class="bk-info-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <div class="bk-info-text">
            <strong>Two locations</strong><br>
            Worongary — 23 Mudgeeraba Rd<br>
            Southport — 1A/5 Olympic Cct
          </div>
        </div>

        <div class="bk-divider"></div>

        <div><strong style="font-size:14px;color:#c9a84c;display:block;margin-bottom:8px">Studio Hours</strong>
          <div class="bk-hours"><span class="bk-hours-day">Monday – Sunday</span><span class="bk-hours-time">9:00am – 7:00pm</span></div>
        </div>

        <div class="bk-divider"></div>

        <div class="bk-info-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <div class="bk-info-text">
            <strong>Walk-ins welcome</strong><br>
            Calling ahead guarantees your preferred time and therapist.
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="locations"`;
html = html.slice(0, insertPoint) + inlineSection + html.slice(insertPoint + '<section id="locations"'.length);

// ========== 4. Add submission JS ==========
const inlineJs = `
<script>
async function bkSubmit(e){
  e.preventDefault();
  var name=document.getElementById('bkName').value.trim();
  var phone=document.getElementById('bkPhone').value.trim();
  var location=document.getElementById('bkLocation').value;
  var dateTime=document.getElementById('bkDateTime').value.trim();
  var service=document.getElementById('bkService').value;
  var duration=document.getElementById('bkDuration').value;
  var notes=document.getElementById('bkNotes').value.trim();

  if(!name||!phone||!location||!service){
    document.getElementById('bkFormError').textContent='Please fill in all required fields.';
    document.getElementById('bkFormError').style.display='block';
    return;
  }

  var btn=document.getElementById('bkSubmitBtn');
  btn.textContent='Sending…';btn.disabled=true;
  document.getElementById('bkFormError').style.display='none';

  try{
    var msg='';
    if(notes)msg+='Notes: '+notes+'\\\\n';
    if(dateTime)msg+='Preferred: '+dateTime+'\\\\n';
    msg+='Location: '+location;

    var res=await fetch('${LEAD_API}',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        name:name,phone:phone,email:'',
        message:msg,siteSlug:'${SLUG}',
        duration:duration,
        eventType:service+' - '+location
      })
    });

    if(res.ok){
      document.getElementById('bkForm').style.display='none';
      document.getElementById('bkSuccess').style.display='block';
    }else throw new Error('Server error');
  }catch(err){
    document.getElementById('bkFormError').textContent='Something went wrong. Please call us on 0451 826 539.';
    document.getElementById('bkFormError').style.display='block';
  }finally{
    btn.textContent='Request Booking';btn.disabled=false;
  }
}
</script>
`;

// Insert the JS right before </body>
html = html.replace("</body>", inlineJs + "\n</body>");

// ========== 5. Upload to Blob ==========
require("fs").writeFileSync("ht-html-current.txt", html);
console.log("File saved. Size:", (html.length / 1024).toFixed(1), "KB");

put(`sites/${SLUG}/index.html`, html, {
  access: "public",
  contentType: "text/html",
  addRandomSuffix: false,
  allowOverwrite: true,
}).then(() => {
  console.log("✅ Uploaded to Vercel Blob successfully!");
}).catch(console.error);
