#!/usr/bin/env node
// Injects the full AI chatbot widget into Heaven Thai Massage Blob HTML

require("dotenv").config({ path: ".env.local" });
const { list, put } = require("@vercel/blob");

// Inline the widget logic (same as lib/chat-widget-template.ts, Node-friendly version)
const SLUG = "heaven-thai-massage";
const BOT_NAME = "Lily";
const GREETING = "Sawasdee ka! I'm Lily, your Heaven Thai guide. Keen to book a massage or have questions? I'm here to help!";
const PRIMARY = "#1b3a2d";
const ACCENT = "#c9a84c";
const BG = "#fdfbf7";
const TEXT = "#1a2e1e";
const PLACEHOLDER = "Ask about treatments, pricing or bookings…";

function buildWidget() {
  const initials = "LH";
  const api = "https://www.saabai.ai/api/site-factory-chat";
  const storageKey = "sf-chat:" + SLUG;

  return `<script id="sf-chat-widget">
(function(){
'use strict';
var CFG={
  slug:${JSON.stringify(SLUG)},
  name:${JSON.stringify(BOT_NAME)},
  initials:${JSON.stringify(initials)},
  greeting:${JSON.stringify(GREETING)},
  primary:${JSON.stringify(PRIMARY)},
  accent:${JSON.stringify(ACCENT)},
  bg:${JSON.stringify(BG)},
  text:${JSON.stringify(TEXT)},
  placeholder:${JSON.stringify(PLACEHOLDER)},
  api:${JSON.stringify(api)},
  storageKey:${JSON.stringify(storageKey)}
};
var msgs=[],isOpen=false,isTyping=false;
try{var saved=localStorage.getItem(CFG.storageKey);if(saved)msgs=JSON.parse(saved);}catch(e){}
function save(){try{localStorage.setItem(CFG.storageKey,JSON.stringify(msgs.slice(-40)));}catch(e){}}

var style=document.createElement('style');
style.textContent='.sf-w{position:fixed;bottom:24px;right:24px;z-index:9999;font-family:-apple-system,Inter,sans-serif}'+
'.sf-btn{width:58px;height:58px;border-radius:50%;border:none;background:'+CFG.accent+';cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.25);transition:transform .2s,box-shadow .2s;position:relative}'+
'.sf-btn:hover{transform:scale(1.06);box-shadow:0 6px 28px rgba(0,0,0,.35)}'+
'.sf-btn::before{content:"";position:absolute;width:100%;height:100%;border-radius:50%;background:'+CFG.accent+';opacity:.3;animation:sf-pulse 2s infinite}'+
'.sf-btn::after{content:"";position:absolute;width:100%;height:100%;border-radius:50%;background:'+CFG.accent+';opacity:.15;animation:sf-pulse 2s .5s infinite}'+
'@keyframes sf-pulse{0%{transform:scale(1);opacity:.3}80%,100%{transform:scale(1.7);opacity:0}}'+
'.sf-panel{position:absolute;bottom:74px;right:0;width:340px;max-width:calc(100vw - 48px);height:480px;max-height:calc(100vh - 120px);background:'+CFG.bg+';border-radius:16px;box-shadow:0 24px 80px rgba(0,0,0,.22);display:flex;flex-direction:column;overflow:hidden;transition:opacity .25s,transform .25s;opacity:0;transform:translateY(10px) scale(.97);pointer-events:none}'+
'.sf-panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:all}'+
'.sf-head{padding:14px 18px;background:'+CFG.primary+';color:#fff;display:flex;align-items:center;gap:10px;flex-shrink:0}'+
'.sf-head-av{width:38px;height:38px;border-radius:50%;background:'+CFG.accent+';color:'+CFG.primary+';font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:2px solid rgba(255,255,255,.3)}'+
'.sf-head-info{flex:1}'+
'.sf-head-name{font-weight:700;font-size:14px;line-height:1.2}'+
'.sf-head-status{font-size:11px;opacity:.75;display:flex;align-items:center;gap:5px;margin-top:2px}'+
'.sf-head-status::before{content:"";width:7px;height:7px;background:#4ade80;border-radius:50%;flex-shrink:0}'+
'.sf-close{background:none;border:none;color:rgba(255,255,255,.7);font-size:22px;cursor:pointer;line-height:1;padding:0 2px;margin-left:auto}'+
'.sf-close:hover{color:#fff}'+
'.sf-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}'+
'.sf-msg{display:flex;gap:8px;max-width:88%}'+
'.sf-msg.user{align-self:flex-end;flex-direction:row-reverse}'+
'.sf-msg.bot{align-self:flex-start}'+
'.sf-msg-av{width:30px;height:30px;border-radius:50%;background:'+CFG.accent+';color:'+CFG.primary+';font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}'+
'.sf-msg-uav{width:30px;height:30px;border-radius:50%;background:'+CFG.primary+';color:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0}'+
'.sf-msg-body{padding:9px 13px;border-radius:14px;font-size:13.5px;line-height:1.55;word-break:break-word}'+
'.sf-msg.bot .sf-msg-body{background:#fff;color:'+CFG.text+';border-bottom-left-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.07)}'+
'.sf-msg.user .sf-msg-body{background:'+CFG.primary+';color:#fff;border-bottom-right-radius:4px}'+
'.sf-typing{display:flex;gap:4px;padding:10px 13px;background:#fff;border-radius:14px;border-bottom-left-radius:4px;width:fit-content;box-shadow:0 2px 8px rgba(0,0,0,.07)}'+
'.sf-dot{width:7px;height:7px;background:#bbb;border-radius:50%;animation:sf-dots 1.4s infinite}'+
'.sf-dot:nth-child(2){animation-delay:.2s}.sf-dot:nth-child(3){animation-delay:.4s}'+
'@keyframes sf-dots{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}'+
'.sf-inp-area{padding:12px 14px;border-top:1px solid rgba(0,0,0,.08);display:flex;gap:8px;flex-shrink:0;background:'+CFG.bg+'}'+
'.sf-inp{flex:1;padding:9px 14px;border:1.5px solid rgba(0,0,0,.1);border-radius:22px;font-size:13.5px;outline:none;background:#fff;color:'+CFG.text+';font-family:inherit}'+
'.sf-inp:focus{border-color:'+CFG.accent+'}'+
'.sf-send{width:38px;height:38px;border-radius:50%;border:none;background:'+CFG.accent+';cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .15s;flex-shrink:0}'+
'.sf-send:hover{transform:scale(1.08)}.sf-send:disabled{opacity:.4;cursor:default}'+
'.sf-powered{text-align:center;font-size:10px;color:rgba(0,0,0,.3);padding:4px 0 8px;flex-shrink:0}'+
'.sf-powered a{color:rgba(0,0,0,.3);text-decoration:none}'+
'.sf-powered a:hover{text-decoration:underline}';
document.head.appendChild(style);

var widget=document.createElement('div');
widget.className='sf-w';
widget.innerHTML='<button class="sf-btn" id="sf-btn" aria-label="Chat with us">'+
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>'+
'</button>'+
'<div class="sf-panel" id="sf-panel">'+
  '<div class="sf-head">'+
    '<div class="sf-head-av">'+CFG.initials+'</div>'+
    '<div class="sf-head-info"><div class="sf-head-name">'+CFG.name+'</div><div class="sf-head-status">Online now</div></div>'+
    '<button class="sf-close" id="sf-close" aria-label="Close">&#x2715;</button>'+
  '</div>'+
  '<div class="sf-msgs" id="sf-msgs"></div>'+
  '<div class="sf-inp-area">'+
    '<input class="sf-inp" id="sf-inp" type="text" placeholder="'+CFG.placeholder+'" autocomplete="off">'+
    '<button class="sf-send" id="sf-send" disabled aria-label="Send">'+
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>'+
    '</button>'+
  '</div>'+
  '<div class="sf-powered">Powered by <a href="https://www.saabai.ai" target="_blank" rel="noopener">Saabai AI</a></div>'+
'</div>';
document.body.appendChild(widget);

var btn=document.getElementById('sf-btn');
var panel=document.getElementById('sf-panel');
var closeBtn=document.getElementById('sf-close');
var msgsEl=document.getElementById('sf-msgs');
var inp=document.getElementById('sf-inp');
var sendBtn=document.getElementById('sf-send');

function toggle(){
  isOpen=!isOpen;
  panel.classList.toggle('open',isOpen);
  if(isOpen&&msgs.length===0)addMsg('bot',CFG.greeting);
  if(isOpen)setTimeout(function(){inp.focus();},100);
}

btn.addEventListener('click',toggle);
closeBtn.addEventListener('click',toggle);

function md(t){
  var h=t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/\`([^\`]+)\`/g,'<code style="background:#f0f0f0;padding:2px 5px;border-radius:3px;font-size:12px;">$1</code>');
  var lines=h.split('\\n'),res=[],inUl=false,inOl=false;
  for(var i=0;i<lines.length;i++){
    var l=lines[i],um=l.match(/^\\s*[-*]\\s+(.+)$/),om=l.match(/^\\s*\\d+\\.\\s+(.+)$/);
    if(um){if(!inUl){if(inOl){res.push('</ol>');inOl=false;}res.push('<ul style="margin:4px 0;padding-left:18px;">');inUl=true;}res.push('<li>'+um[1]+'</li>');}
    else if(om){if(!inOl){if(inUl){res.push('</ul>');inUl=false;}res.push('<ol style="margin:4px 0;padding-left:18px;">');inOl=true;}res.push('<li>'+om[1]+'</li>');}
    else{if(inUl){res.push('</ul>');inUl=false;}if(inOl){res.push('</ol>');inOl=false;}if(l.trim())res.push('<p style="margin:3px 0;">'+l+'</p>');}
  }
  if(inUl)res.push('</ul>');if(inOl)res.push('</ol>');
  return res.join('');
}

function addMsg(role,text){
  msgs.push({role:role,text:text,ts:Date.now()});
  save();
  renderMsg({role:role,text:text});
  msgsEl.scrollTop=msgsEl.scrollHeight;
}

function renderMsg(m){
  var d=document.createElement('div');
  d.className='sf-msg '+m.role;
  if(m.role==='bot'){
    d.innerHTML='<div class="sf-msg-av">'+CFG.initials+'</div><div class="sf-msg-body">'+md(m.text)+'</div>';
  }else{
    d.innerHTML='<div class="sf-msg-uav">You</div><div class="sf-msg-body">'+md(m.text)+'</div>';
  }
  msgsEl.appendChild(d);
}

function showTyping(){
  if(isTyping)return;isTyping=true;
  var d=document.createElement('div');d.className='sf-msg bot';d.id='sf-typing';
  d.innerHTML='<div class="sf-msg-av">'+CFG.initials+'</div><div class="sf-typing"><div class="sf-dot"></div><div class="sf-dot"></div><div class="sf-dot"></div></div>';
  msgsEl.appendChild(d);msgsEl.scrollTop=msgsEl.scrollHeight;
}

function hideTyping(){
  isTyping=false;var el=document.getElementById('sf-typing');if(el)el.remove();
}

async function send(){
  var text=inp.value.trim();if(!text||isTyping)return;
  inp.value='';sendBtn.disabled=true;
  addMsg('user',text);showTyping();
  try{
    var res=await fetch(CFG.api,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({slug:CFG.slug,messages:msgs.filter(function(m){return m.text!==CFG.greeting;}).slice(-10).map(function(m){return{role:m.role==='bot'?'assistant':'user',content:m.text};})})});
    hideTyping();
    if(res.ok){var d=await res.json();addMsg('bot',d.content||"I'm not sure about that — could you rephrase?");}
    else{addMsg('bot',"Something went wrong. Please try again shortly.");}
  }catch(e){hideTyping();addMsg('bot',"Connection error. Please check your internet and try again.");}
  sendBtn.disabled=inp.value.trim()==='';
}

sendBtn.addEventListener('click',send);
inp.addEventListener('keypress',function(e){if(e.key==='Enter')send();});
inp.addEventListener('input',function(){sendBtn.disabled=inp.value.trim()==='';});

msgs.forEach(renderMsg);
msgsEl.scrollTop=msgsEl.scrollHeight;

setTimeout(function(){if(!isOpen&&msgs.length===0)toggle();},50000);
})();
</script>`;
}

async function main() {
  const { blobs } = await list({ prefix: `sites/${SLUG}/` });
  const blob = blobs.find((b) => b.pathname === `sites/${SLUG}/index.html`);
  if (!blob) { console.error("Blob not found"); process.exit(1); }

  const res = await fetch(`${blob.url}?t=${Date.now()}`, { cache: "no-store" });
  let html = await res.text();

  console.log("HTML length:", html.length);
  console.log("Has chatBtn (old):", html.includes("chatBtn"));
  console.log("Has sf-chat-widget (new):", html.includes("sf-chat-widget"));

  // Remove old simple chatPopup and any existing sf widget
  html = html.replace(/<script id="sf-chat-widget">[\s\S]*?<\/script>/i, "");
  html = html.replace(/<!-- Chat bubble button -->[\s\S]*?<script>\s*async function submitChatForm[\s\S]*?<\/script>/i, "");
  html = html.replace(/<button id="chatBtn"[\s\S]*?<\/button>\s*/i, "");
  html = html.replace(/<div id="chatPopup"[\s\S]*?<\/div>\s*/i, "");

  const widget = buildWidget();
  if (html.includes("</body>")) {
    html = html.replace("</body>", `${widget}\n</body>`);
  } else {
    html += `\n${widget}`;
  }

  await put(`sites/${SLUG}/index.html`, html, {
    access: "public",
    contentType: "text/html",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  console.log("Done! Widget injected. Final length:", html.length);
}

main().catch(e => { console.error(e); process.exit(1); });
