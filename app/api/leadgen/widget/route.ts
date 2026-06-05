/**
 * LeadGen Embeddable Widget
 *
 * Returns a self-contained HTML/JS widget for lead capture.
 * Business embeds: <script src="https://saabai.ai/api/leadgen/widget?slug=bne-plumbing"></script>
 */

import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug") || "demo";
  const apiBase = process.env.NEXT_PUBLIC_BASE_URL || "https://www.saabai.ai";

  const script = `(function(){
'use strict';
var SLUG = ${JSON.stringify(slug)};
var API = ${JSON.stringify(apiBase + "/api/leadgen/chat")};
var STORAGE_KEY = "lg_conversation_" + SLUG;

var C = {
  slug: SLUG,
  name: "LeadGen AI",
  accent: "#2563eb",
  primary: "#1e3a5f"
};

// Create widget
var d = document;
var container = d.createElement("div");
container.id = "lg-widget";
container.innerHTML = [
  '<style>',
  '#lg-widget{position:fixed;bottom:20px;right:20px;z-index:999999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
  '#lg-btn{width:58px;height:58px;border-radius:50%;border:none;background:' + C.accent + ';cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.25);transition:transform .2s,box-shadow .2s}',
  '#lg-btn:hover{transform:scale(1.05);box-shadow:0 6px 28px rgba(0,0,0,.35)}',
  '#lg-btn svg{width:24px;height:24px;color:#fff}',
  '#lg-panel{position:absolute;bottom:72px;right:0;width:360px;max-height:560px;background:#fff;border-radius:16px;overflow:hidden;display:none;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.18);border:1px solid #e5e7eb}',
  '#lg-panel.open{display:flex}',
  '#lg-header{padding:16px 20px;background:' + C.primary + ';color:#fff}',
  '#lg-header h4{margin:0;font-size:15px;font-weight:600}',
  '#lg-header p{margin:4px 0 0;font-size:12px;opacity:.8}',
  '#lg-msgs{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:10px;max-height:400px;min-height:200px;background:#f9fafb}',
  '.lg-msg{max-width:85%;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.5;word-wrap:break-word}',
  '.lg-msg.user{align-self:flex-end;background:' + C.accent + ';color:#fff;border-bottom-right-radius:4px}',
  '.lg-msg.bot{align-self:flex-start;background:#fff;color:#1f2937;border:1px solid #e5e7eb;border-bottom-left-radius:4px}',
  '#lg-input-area{padding:12px 16px;border-top:1px solid #e5e7eb;display:flex;gap:8px;background:#fff}',
  '#lg-input{flex:1;padding:10px 14px;border-radius:8px;border:1px solid #d1d5db;font-size:14px;outline:none;background:#f9fafb}',
  '#lg-input:focus{border-color:' + C.accent + ';background:#fff}',
  '#lg-send{padding:10px 18px;border-radius:8px;border:none;background:' + C.accent + ';color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .2s}',
  '#lg-send:disabled{opacity:.5;cursor:not-allowed}',
  '.lg-typing{display:flex;gap:4px;padding:10px 14px}',
  '.lg-typing span{width:7px;height:7px;background:#9ca3af;border-radius:50%;animation:lg-bounce 1.4s ease-in-out infinite both}',
  '.lg-typing span:nth-child(1){animation-delay:-.32s}',
  '.lg-typing span:nth-child(2){animation-delay:-.16s}',
  '@keyframes lg-bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}',
  '</style>',
  '<button id="lg-btn" aria-label="Chat with us">',
  '<svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"/></svg>',
  '</button>',
  '<div id="lg-panel">',
  '<div id="lg-header"><h4>Need Help?</h4><p>We typically respond in minutes</p></div>',
  '<div id="lg-msgs"></div>',
  '<div id="lg-input-area">',
  '<input id="lg-input" type="text" placeholder="Tell us what you need..." />',
  '<button id="lg-send">Send</button>',
  '</div></div>'
].join("\\n");
d.body.appendChild(container);

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
  if (saved) {
    conv = JSON.parse(saved);
    if (conv.length > 0 && !conv[conv.length-1].isUser) {
      conv = []; // Stale — start fresh
    }
  }
} catch(e){}

function addMsg(text, isUser) {
  conv.push({role: isUser ? "user" : "assistant", content: text, isUser: isUser});
  var div = d.createElement("div");
  div.className = "lg-msg " + (isUser ? "user" : "bot");
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(conv.slice(-30))); } catch(e){}
}

function showTyping() {
  var div = d.createElement("div");
  div.id = "lg-typing";
  div.className = "lg-msg bot lg-typing";
  div.innerHTML = "<span></span><span></span><span></span>";
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function hideTyping() {
  var el = d.getElementById("lg-typing");
  if (el) el.remove();
}

function sendMessage() {
  var text = input.value.trim();
  if (!text || isLoading) return;
  input.value = "";
  addMsg(text, true);
  isLoading = true;
  sendBtn.disabled = true;
  showTyping();

  var chatMessages = conv.slice(-15).map(function(m) {
    return {role: m.role, content: m.content};
  });

  fetch(API, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({slug: SLUG, messages: chatMessages})
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    hideTyping();
    if (data.content) {
      addMsg(data.content, false);
    }
    isLoading = false;
    sendBtn.disabled = false;
  })
  .catch(function() {
    hideTyping();
    addMsg("Sorry, we couldn\\'t connect. Please call us directly.", false);
    isLoading = false;
    sendBtn.disabled = false;
  });
}

btn.addEventListener("click", function() {
  isOpen = !isOpen;
  panel.className = isOpen ? "open" : "";
  if (isOpen && conv.length === 0) {
    // Send initial greeting
    isLoading = true;
    showTyping();
    fetch(API, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({slug: SLUG, messages: [{role: "user", content: "Hi"}]})
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      hideTyping();
      if (data.content) addMsg(data.content, false);
      isLoading = false;
    })
    .catch(function() {
      hideTyping();
      addMsg("Hi! How can we help you today?", false);
      isLoading = false;
    });
  }
});

input.addEventListener("keydown", function(e) {
  if (e.key === "Enter") sendMessage();
});
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
