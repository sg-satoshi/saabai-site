/**
 * Saabai AI Agent — parameterized client widget script builder.
 *
 * Produces a self-contained vanilla-JS IIFE that renders a branded chat widget
 * for a client and talks to `/api/ai-agent/chat` with { slug, agentType, messages }.
 * All branding per client; the same script serves every client (config injected).
 *
 * The script NEVER contains a system prompt, an API key, or any tenant data — the
 * only inputs are presentation config (name/greeting/colors) + the chat endpoint.
 */
export interface WidgetConfig {
  slug: string;
  agentType: string | null;
  name: string;
  greeting: string;
  avatar: string;
  brandColor: string;
  accentColor: string;
  apiEndpoint: string;
}

export function buildWidgetScript(cfg: WidgetConfig): string {
  const c = JSON.stringify(cfg);
  return `(function(){
  'use strict';
  var CONFIG = ${c};
  var API = CONFIG.apiEndpoint;
  var SLUG = CONFIG.slug;
  var AGENT = CONFIG.agentType;
  var KEY = 'sa_hist_' + SLUG + (AGENT ? '_' + AGENT : '');
  var VKEY = 'sa_visited_' + SLUG;
  var state = { open:false, typing:false, locked:false };
  var msgs = [];
  try { msgs = JSON.parse(localStorage.getItem(KEY)||'[]'); } catch(e){ msgs=[]; }
  if (!msgs.length) { msgs.push({ role:'bot', text: CONFIG.greeting }); }

  var root = document.createElement('div');
  root.id = 'sa-agent-root';
  root.style.cssText = 'position:fixed;z-index:9999;right:20px;bottom:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;';
  document.body.appendChild(root);

  function esc(s){ var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
  function mdToHtml(t){
    var h = esc(t)
      .replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>')
      .replace(/\\*(.+?)\\*/g,'<em>$1</em>')
      .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g,'<a href="$2" target="_blank" style="color:${cfg.accentColor}">$1</a>');
    var lines = h.split('\\n'), inList=false, out=[];
    for (var i=0;i<lines.length;i++){
      var m = lines[i].match(/^\\s*[-*]\\s+(.+)$/);
      if (m){ if(!inList){out.push('<ul style="margin:4px 0;padding-left:18px;">');inList=true;} out.push('<li>'+m[1]+'</li>'); }
      else { if(inList){out.push('</ul>');inList=false;} out.push('<p style="margin:4px 0;">'+lines[i]+'</p>'); }
    }
    if (inList) out.push('</ul>');
    return out.join('');
  }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(msgs.slice(-50))); }catch(e){} }
  function scrollEl(){ var el=document.getElementById('sa-msgs'); if(el){ el.scrollTop=el.scrollHeight; } }

  // ---- launcher (pill desktop / circle mobile) ----
  var btn = document.createElement('button');
  btn.id='sa-btn';
  btn.setAttribute('aria-label','Chat with us');
  btn.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:9999;border:none;cursor:pointer;border-radius:9999px;background:${cfg.brandColor};color:#fff;box-shadow:0 4px 24px rgba(0,0,0,0.3);display:flex;align-items:center;gap:9px;padding:'+(CONFIG.avatar?'4px 16px 4px 4px':'10px 18px')+';transition:transform .2s;-webkit-transform:translateZ(0);transform:translateZ(0);';
  btn.innerHTML = (CONFIG.avatar ? '<img src="'+CONFIG.avatar+'" style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;">' : '') + '<span style="font-size:14px;font-weight:600;white-space:nowrap;">' + esc(CONFIG.name) + '</span>';
  root.appendChild(btn);

  // ---- panel ----
  var panel = document.createElement('div');
  panel.id='sa-panel';
  panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:9998;width:352px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 40px);background:#fff;border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,0.28);display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(12px) scale(0.98);pointer-events:none;transition:opacity .22s,transform .22s;-webkit-transform:translateZ(0);transform:translateZ(0);';
  panel.innerHTML =
    '<div id="sa-head" style="display:flex;align-items:center;gap:9px;padding:14px 16px;background:${cfg.brandColor};color:#fff;">' +
      (CONFIG.avatar?'<img src="'+CONFIG.avatar+'" style="width:30px;height:30px;border-radius:50%;object-fit:cover;">':'<div style="width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:15px;">💬</div>') +
      '<div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:15px;line-height:1.1;">'+esc(CONFIG.name)+'</div><div style="font-size:11px;opacity:.85;">Typically replies instantly</div></div>' +
      '<button id="sa-clear" title="Reset chat" style="background:none;border:none;color:rgba(255,255,255,.7);font-size:12px;cursor:pointer;padding:3px 6px;">Reset</button>' +
      '<button id="sa-close" title="Close" style="background:none;border:none;color:#fff;font-size:20px;line-height:1;cursor:pointer;padding:0 2px;">&times;</button>' +
    '</div>' +
    '<div id="sa-msgs" style="flex:1;overflow-y:auto;padding:16px;background:#f6f7fb;"></div>' +
    '<div id="sa-typing" style="display:none;padding:8px 16px;font-size:12px;color:#888;">' + esc(CONFIG.name) + ' is typing&hellip;</div>' +
    '<div id="sa-inputrow" style="display:flex;gap:8px;padding:12px;border-top:1px solid #eee;background:#fff;">' +
      '<input id="sa-input" type="text" placeholder="Type a message&hellip;" style="flex:1;border:1px solid #e2e6ee;border-radius:10px;padding:10px 12px;font-size:14px;outline:none;">' +
      '<button id="sa-send" style="background:${cfg.accentColor};color:#fff;border:none;border-radius:10px;padding:0 16px;font-weight:600;cursor:pointer;font-size:14px;">Send</button>' +
    '</div>';
  root.appendChild(panel);

  function open(){ state.open=true; panel.style.opacity='1'; panel.style.transform='translateY(0) scale(1)'; panel.style.pointerEvents='all'; btn.style.display='none'; render(); setTimeout(function(){ var i=document.getElementById('sa-input'); if(i) i.focus(); },120); }
  function close(){ state.open=false; panel.style.opacity='0'; panel.style.transform='translateY(12px) scale(0.98)'; panel.style.pointerEvents='none'; btn.style.display='flex'; }
  btn.addEventListener('click', open);
  document.getElementById('sa-close').addEventListener('click', close);
  document.getElementById('sa-clear').addEventListener('click', function(){ if(!msgs.length) return; msgs=[{role:'bot',text:CONFIG.greeting}]; save(); render(); });

  function render(){
    var el = document.getElementById('sa-msgs'); el.innerHTML='';
    msgs.forEach(function(m){
      var wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;margin-bottom:10px;'+ (m.role==='user'?'justify-content:flex-end;':'justify-content:flex-start;');
      var b = document.createElement('div');
      var cls = m.role==='user'?'background:${cfg.accentColor};color:#fff;':'background:#fff;color:#1a1a2e;border:1px solid #e6e9f1;';
      b.style.cssText='max-width:80%;padding:9px 13px;border-radius:14px;font-size:14px;line-height:1.45;word-wrap:break-word;'+cls;
      b.innerHTML = mdToHtml(m.text);
      wrap.appendChild(b); el.appendChild(wrap);
    });
    el.scrollTop=el.scrollHeight; save();
  }

  function send(){
    var inp=document.getElementById('sa-input'); var t=(inp.value||'').trim(); if(!t) return;
    msgs.push({role:'user',text:t}); inp.value=''; render();
    var lastUser = t;
    var history = msgs.filter(function(m){return m.role!=='system';}).slice(-20).map(function(m){return {role:m.role==='bot'?'assistant':m.role,content:m.text};});
    var ty=document.getElementById('sa-typing'); ty.style.display='block'; SEND_LOCK=true;
    fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:SLUG,agentType:AGENT,messages:history})})
      .then(function(r){return r.json();})
      .then(function(d){
        ty.style.display='none'; SEND_LOCK=false;
        if(d && d.content){ msgs.push({role:'bot',text:d.content}); }
        else { msgs.push({role:'bot',text:"Sorry, I couldn't connect. Please try again."}); }
        render();
      })
      .catch(function(){
        ty.style.display='none'; SEND_LOCK=false;
        msgs.push({role:'bot',text:"Connection lost. Please check your internet and try again."}); render();
      });
  }
  var SEND_LOCK=false;
  document.getElementById('sa-send').addEventListener('click', function(){ if(!SEND_LOCK) send(); });
  document.getElementById('sa-input').addEventListener('keydown', function(e){ if(e.key==='Enter' && !SEND_LOCK) send(); });

  // ---- mobile sizing ----
  function fit(){
    if (window.innerWidth <= 480){
      panel.style.width='calc(100vw - 24px)'; panel.style.right='12px'; panel.style.bottom='12px'; panel.style.height='72vh'; panel.style.maxHeight='620px';
      btn.style.right='12px'; btn.style.bottom='12px';
    } else { panel.style.width='352px'; panel.style.right='16px'; panel.style.bottom='16px'; panel.style.height='520px'; }
  }
  fit(); window.addEventListener('resize', fit);

  // ---- proactive open (once per browser) ----
  if (!localStorage.getItem(VKEY)){
    setTimeout(function(){ if(!state.open){ localStorage.setItem(VKEY,'1'); open(); } }, 7000);
  }

  render();
})();
`;
}
