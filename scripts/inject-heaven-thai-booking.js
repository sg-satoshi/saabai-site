#!/usr/bin/env node
// Injects a booking form + floating button into Heaven Thai Massage Blob HTML
require("dotenv").config({ path: ".env.local" });
const { list, put } = require("@vercel/blob");
const fs = require("fs");

const HOST = "https://www.saabai.ai";
const SLUG = "heaven-thai-massage";
const LEAD_API = `${HOST}/api/site-factory/lead`;

const BOOKING_CSS = `
/* ========================
   BOOKING FORM
======================== */
.ht-booking-btn {
  position: fixed;
  bottom: 96px;
  right: 24px;
  z-index: 900;
  width: 60px;
  height: 60px;
  background: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(26,26,46,0.5);
  transition: transform var(--transition), box-shadow var(--transition);
  border: none;
  cursor: pointer;
  color: #fff;
}
.ht-booking-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 8px 32px rgba(26,26,46,0.65);
}
.ht-booking-btn svg { fill: #fff; }

/* Modal overlay */
.ht-modal {
  position: fixed;
  inset: 0;
  z-index: 1001;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  padding: 20px;
}
.ht-modal.open { display: flex; }

.ht-modal-inner {
  background: #fff;
  border-radius: 18px;
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 24px 80px rgba(0,0,0,0.25);
}
.ht-modal-head {
  background: var(--primary);
  padding: 18px 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 18px 18px 0 0;
}
.ht-modal-head h3 { color: #fff; font-size: 16px; font-weight: 600; margin: 0; letter-spacing: -0.3px; }
.ht-modal-close {
  background: none;
  border: none;
  color: rgba(255,255,255,0.7);
  font-size: 22px;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
}
.ht-modal-close:hover { color: #fff; }

.ht-modal-body { padding: 22px; }

.ht-form-group { margin-bottom: 14px; }
.ht-form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 5px;
}
.ht-form-group label .req { color: #dc2626; }
.ht-form-group input,
.ht-form-group select,
.ht-form-group textarea {
  width: 100%;
  padding: 10px 13px;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.2s;
  background: #fafafa;
}
.ht-form-group input:focus,
.ht-form-group select:focus,
.ht-form-group textarea:focus {
  border-color: var(--secondary);
  background: #fff;
}
.ht-form-group textarea { resize: vertical; min-height: 60px; }
.ht-form-row { display: flex; gap: 10px; }
.ht-form-row .ht-form-group { flex: 1; }

.ht-submit {
  width: 100%;
  padding: 12px;
  background: var(--secondary);
  color: var(--primary);
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
  font-family: inherit;
}
.ht-submit:hover { background: var(--accent); transform: scale(1.01); }
.ht-submit:disabled { opacity: 0.5; cursor: default; transform: none; }

.ht-success {
  display: none;
  text-align: center;
  padding: 30px 20px;
}
.ht-success svg { width: 48px; height: 48px; color: #16a34a; margin-bottom: 12px; }
.ht-success h4 { font-size: 17px; color: var(--text); margin: 0 0 6px; }
.ht-success p { font-size: 14px; color: var(--text-muted); margin: 0; line-height: 1.5; }

.ht-error {
  display: none;
  padding: 10px 14px;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 12px;
}
`;

const BOOKING_HTML = `
<!-- Booking Form -->
<button class="ht-booking-btn" id="htBookingBtn" aria-label="Book Now" onclick="htOpenBooking()">
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>
  </svg>
</button>

<div class="ht-modal" id="htModal">
  <div class="ht-modal-inner">
    <div class="ht-modal-head">
      <h3>Book a Massage</h3>
      <button class="ht-modal-close" onclick="htCloseBooking()">&times;</button>
    </div>
    <div class="ht-modal-body">
      <div class="ht-error" id="htFormError"></div>
      <form id="htBookingForm" onsubmit="htSubmitBooking(event)">
        <div class="ht-form-group">
          <label>Your Name <span class="req">*</span></label>
          <input type="text" id="htName" placeholder="e.g. Sarah" required>
        </div>
        <div class="ht-form-group">
          <label>Phone <span class="req">*</span></label>
          <input type="tel" id="htPhone" placeholder="0401 234 567" required>
        </div>
        <div class="ht-form-row">
          <div class="ht-form-group">
            <label>Location <span class="req">*</span></label>
            <select id="htLocation" required>
              <option value="">Select...</option>
              <option value="Worongary">Worongary</option>
              <option value="Southport">Southport</option>
            </select>
          </div>
          <div class="ht-form-group">
            <label>Preferred Date/Time</label>
            <input type="text" id="htDateTime" placeholder="e.g. Fri 2pm">
          </div>
        </div>
        <div class="ht-form-row">
          <div class="ht-form-group">
            <label>Service <span class="req">*</span></label>
            <select id="htService" required>
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
          <div class="ht-form-group">
            <label>Duration</label>
            <select id="htDuration">
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
        <div class="ht-form-group">
          <label>Notes (optional)</label>
          <textarea id="htNotes" placeholder="Any specific concerns — sore back, tension areas, etc."></textarea>
        </div>
        <button type="submit" class="ht-submit" id="htSubmitBtn">Request Booking</button>
      </form>
      <div class="ht-success" id="htSuccess">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <h4>Thanks, we'll be in touch!</h4>
        <p>Gina or a team member will call you back to confirm your booking.<br>For immediate help, call <strong>0451 826 539</strong></p>
      </div>
    </div>
  </div>
</div>
`;

const BOOKING_JS = `
// Booking form
function htOpenBooking() {
  document.getElementById('htModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function htCloseBooking() {
  document.getElementById('htModal').classList.remove('open');
  document.body.style.overflow = '';
}
// Close on overlay click
document.getElementById('htModal').addEventListener('click', function(e) {
  if (e.target === this) htCloseBooking();
});
// Close on Escape
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') htCloseBooking();
});

async function htSubmitBooking(e) {
  e.preventDefault();
  var name = document.getElementById('htName').value.trim();
  var phone = document.getElementById('htPhone').value.trim();
  var location = document.getElementById('htLocation').value;
  var dateTime = document.getElementById('htDateTime').value.trim();
  var service = document.getElementById('htService').value;
  var duration = document.getElementById('htDuration').value;
  var notes = document.getElementById('htNotes').value.trim();

  if (!name || !phone || !location || !service) {
    document.getElementById('htFormError').textContent = 'Please fill in all required fields.';
    document.getElementById('htFormError').style.display = 'block';
    return;
  }

  var btn = document.getElementById('htSubmitBtn');
  btn.textContent = 'Sending…';
  btn.disabled = true;
  document.getElementById('htFormError').style.display = 'none';

  try {
    var message = '';
    if (notes) message += 'Notes: ' + notes + '\\n';
    if (dateTime) message += 'Preferred: ' + dateTime + '\\n';
    message += 'Location: ' + location;

    var res = await fetch('${LEAD_API}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        phone: phone,
        email: '',
        message: message,
        siteSlug: '${SLUG}',
        duration: duration,
        eventType: service + ' - ' + location
      })
    });

    if (res.ok) {
      document.getElementById('htBookingForm').style.display = 'none';
      document.getElementById('htSuccess').style.display = 'block';
    } else {
      throw new Error('Server error');
    }
  } catch(err) {
    document.getElementById('htFormError').textContent = 'Something went wrong. Please call us on 0451 826 539.';
    document.getElementById('htFormError').style.display = 'block';
  } finally {
    btn.textContent = 'Request Booking';
    btn.disabled = false;
  }
}
`;

async function main() {
  // Read existing download
  let html = fs.readFileSync("ht-html-dump.txt", "utf8");

  // Check if already injected
  if (html.includes("ht-booking-btn")) {
    console.log("Booking form already injected — skipping");
    return;
  }

  // Insert styles before </head>
  html = html.replace("</head>", `<style>${BOOKING_CSS}</style>\n</head>`);

  // Insert HTML + JS before </body>
  const injectBlock = `${BOOKING_HTML}\n<script>${BOOKING_JS}</script>\n`;
  html = html.replace("</body>", `${injectBlock}</body>`);

  // Upload to Blob
  await put(`sites/${SLUG}/index.html`, html, {
    access: "public",
    contentType: "text/html",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  console.log("✅ Booking form injected and uploaded successfully!");
  console.log(`Size: ${(html.length / 1024).toFixed(1)} KB`);
}

main().catch((e) => { console.error(e); process.exit(1); });
