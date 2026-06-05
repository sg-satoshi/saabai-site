/**
 * LeadGen Embeddable Widget
 *
 * Returns a self-contained HTML/JS widget for lead capture.
 * Business embeds: <script src="https://saabai.ai/api/leadgen/widget?slug=bne-plumbing"></script>
 *
 * Design: Inspired by Mia (Saabai's own chat widget) but with tradie/man avatar,
 * gold/teal Saabai brand colors, and lead capture focus.
 */

import { NextRequest } from "next/server";

const TRADIE_SVG = `<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;border-radius:50%">
  <circle cx="30" cy="30" r="30" fill="%23c9a227"/>
  <circle cx="30" cy="22" r="9" fill="%230b092e"/>
  <rect x="19" y="30" width="22" height="14" rx="4" fill="%230b092e"/>
  <rect x="15" y="31" width="30" height="6" rx="2" fill="%23e2c053"/>
  <rect x="24" y="37" width="4" height="8" rx="1" fill="%230b092e"/>
  <rect x="32" y="37" width="4" height="8" rx="1" fill="%230b092e"/>
  <circle cx="18" cy="38" r="3" fill="%2362c5d1"/>
  <circle cx="42" cy="38" r="3" fill="%2362c5d1"/>
</svg>`;

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug") || "demo";
  const apiBase = process.env.NEXT_PUBLIC_BASE_URL || "https://www.saabai.ai";

  const script = `(function(){
'use strict';
var SLUG = ${JSON.stringify(slug)};
var API = ${JSON.stringify(apiBase + "/api/leadgen/chat")};
var STORAGE_KEY = "lg_conv_" + SLUG;

// ── Saabai Brand Colours ─────────────────────────────────
var GOLD = "#c9a227";
var GOLD_BRIGHT = "#e2c053";
var DARK = "#0b092e";
var TEAL = "#62c5d1";
var SURFACE = "#14123a";
var TEXT_DIM = "#7c8db5";
var WHITE = "#ffffff";

// Tradie avatar SVG (inline so no external images)
var TRADIE_AVATAR = ${JSON.stringify(TRADIE_SVG)};

// Create widget container
var d = document;
var container = d.createElement("div");
container.id = "lg-widget";
container.innerHTML = [
  '<style>',
  '#lg-widget{position:fixed;bottom:20px;right:20px;z-index:999999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.4}',
  // ── Button (closed state) ──
  '#lg-btn{width:60px;height:60px;border-radius:50%;border:3px solid ' + GOLD + ';cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(201,162,39,0.35);transition:all .25s ease;position:relative;background:' + DARK + ';padding:0}',
  '#lg-btn:hover{transform:scale(1.08);box-shadow:0 6px 32px rgba(201,162,39,0.5)}',
  '#lg-btn svg{width:28px;height:28px;color:' + GOLD + '}',
  // ── Panel (open state) ──
  '#lg-panel{position:absolute;bottom:74px;right:0;width:380px;max-height:600px;background:' + SURFACE + ';border-radius:16px;overflow:hidden;display:none;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:1px solid rgba(201,162,39,0.2)}',
  '#lg-panel.open{display:flex}',
  // ── Header ──
  '#lg-header{padding:18px 20px;background:linear-gradient(135deg,' + DARK + ',' + SURFACE + ');border-bottom:1px solid rgba(201,162,39,0.15);display:flex;align-items:center;gap:14px}',
  '#lg-header .av{width:44px;height:44px;border-radius:50%;overflow:hidden;border:2px solid ' + GOLD + ';flex-shrink:0;background:' + DARK + '}',
  '#lg-header .info{flex:1}',
  '#lg-header .info h4{margin:0;font-size:15px;font-weight:700;color:' + WHITE + ';letter-spacing:-0.01em}',
  '#lg-header .info p{margin:2px 0 0;font-size:11px;color:' + TEXT_DIM + ';display:flex;align-items:center;gap:5px}',
  '#lg-header .info p .dot{width:6px;height:6px;border-radius:50%;background:#22c55e;display:inline-block;animation:pulse-dot 2s ease-in-out infinite}',
  '@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:0.4}}',
  // ── Messages ──
  '#lg-msgs{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:10px;max-height:380px;min-height:200px;background:' + DARK + ';scroll-behavior:smooth}',
  '.lg-msg{max-width:88%;padding:11px 16px;border-radius:14px;font-size:14px;line-height:1.5;word-wrap:break-word}',
  '.lg-msg.user{align-self:flex-end;background:linear-gradient(135deg,' + GOLD + ',' + GOLD_BRIGHT + ');color:' + DARK + ';font-weight:500;border-bottom-right-radius:4px}',
  '.lg-msg.bot{align-self:flex-start;background:' + SURFACE + ';color:' + WHITE + ';border-bottom-left-radius:4px;border:1px solid rgba(98,197,209,0.12)}',
  // ── Input area ──
  '#lg-input-area{padding:14px 16px;border-top:1px solid rgba(201,162,39,0.15);display:flex;gap:8px;background:' + SURFACE + '}',
  '#lg-input{flex:1;padding:11px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);font-size:14px;outline:none;background:' + DARK + ';color:' + WHITE + ';caret-color:' + GOLD + ';transition:border-color .2s}',
  '#lg-input::placeholder{color:' + TEXT_DIM + ';opacity:0.7}',
  '#lg-input:focus{border-color:' + GOLD + ';background:' + SURFACE + '}',
  '#lg-send{padding:11px 20px;border-radius:10px;border:none;background:linear-gradient(135deg,' + GOLD + ',' + GOLD_BRIGHT + ');color:' + DARK + ';font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap}',
  '#lg-send:hover:not(:disabled){transform:scale(1.03);box-shadow:0 2px 12px rgba(201,162,39,0.3)}',
  '#lg-send:disabled{opacity:.4;cursor:not-allowed}',
  // ── Typing indicator ──
  '.lg-typing{display:flex;gap:5px;padding:11px 16px}',
  '.lg-typing span{width:8px;height:8px;border-radius:50%;background:' + TEAL + ';animation:lg-bounce 1.4s ease-in-out infinite both}',
  '.lg-typing span:nth-child(1){animation-delay:-.32s}',
  '.lg-typing span:nth-child(2){animation-delay:-.16s}',
  '@keyframes lg-bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}',
  '</style>',
  // ── Button ──
  '<button id="lg-btn" aria-label="Chat with us">',
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/></svg>',
  '</button>',
  // ── Panel ──
  '<div id="lg-panel">',
  '<div id="lg-header">',
  '<div class="av">' + TRADIE_AVATAR + '</div>',
  '<div class="info"><h4>Need Help 24/7?</h4><p><span class="dot"></span> Online — Typically responds in seconds</p></div>',
  '</div>',
  '<div id="lg-msgs"></div>',
  '<div id="lg-input-area">',
  '<input id="lg-input" type="text" placeholder="Tell us what you need..." autocomplete="off" />',
  '<button id="lg-send">Send</button>',
  '</div></div>'
].join("\\n");
d.body.appendChild(container);

// ── Elements ───────────────────────────────────────────
var btn = d.getElementById("lg-btn");
var panel = d.getElementById("lg-panel");
var msgs = d.getElementById("lg-msgs");
var input = d.getElementById("lg-input");
var sendBtn = d.getElementById("lg-send");
var isOpen = false;
var isLoading = false;
var conv = [];

// Load saved conversation from localStorage
try {
  var saved = localStorage.getItem(STORAGE_KEY);
  if (saved) { conv = JSON.parse(saved); if (conv.length>0 && !conv[conv.length-1].isUser) conv=[]; }
} catch(e){}

function addMsg(text, isUser) {
  conv.push({role:isUser?"user":"assistant",content:text,isUser:isUser});
  var div = d.createElement("div");
  div.className = "lg-msg " + (isUser ? "user" : "bot");
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(conv.slice(-30))); } catch(e){}
}

function showTyping() {
  var div = d.createElement("div"); div.id = "lg-typing";
  div.className = "lg-msg bot lg-typing";
  div.innerHTML = "<span></span><span></span><span></span>";
  msgs.appendChild(div); msgs.scrollTop = msgs.scrollHeight;
}

function hideTyping() { var el = d.getElementById("lg-typing"); if (el) el.remove(); }

function sendMessage() {
  var text = input.value.trim();
  if (!text || isLoading) return;
  input.value = "";
  addMsg(text, true);
  isLoading = true; sendBtn.disabled = true;
  showTyping();
  fetch(API, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug:SLUG,messages:conv.slice(-15).map(function(m){return{role:m.role,content:m.content}} )})})
  .then(function(r){return r.json()})
  .then(function(data){hideTyping();if(data.content)addMsg(data.content,false);isLoading=false;sendBtn.disabled=false;})
  .catch(function(){hideTyping();addMsg("Sorry, we couldn\\'t connect. Please call us directly.",false);isLoading=false;sendBtn.disabled=false;});
}

btn.addEventListener("click", function(){
  isOpen = !isOpen;
  panel.className = isOpen ? "open" : "";
  if (isOpen && conv.length === 0) {
    isLoading = true; showTyping();
    fetch(API, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug:SLUG,messages:[{role:"user",content:"Hi"}]})})
    .then(function(r){return r.json()})
    .then(function(data){hideTyping();if(data.content)addMsg(data.content,false);isLoading=false;})
    .catch(function(){hideTyping();addMsg("Hi! Need help? Tell us what\\'s happened and we\\'ll get someone out.",false);isLoading=false;});
  }
});

input.addEventListener("keydown", function(e){if(e.key==="Enter")sendMessage();});
sendBtn.addEventListener("click", sendMessage);
})();`;

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
