/*! Saabai chat widget v1 (1.0.0). One script for every site:
 *  <script src="https://www.saabai.ai/embed/chat.v1.js" data-site="your-site-slug" async></script>
 *  Reads the site's settings (look, on/off, plan rules) from Saabai. No lead capture. No cookies.
 *  Compatible within v1: fixes ship here, breaking changes get a new file name (chat.v2.js).
 */
(function () {
  "use strict";
  var VERSION = "1.0.0";
  var script = document.currentScript;
  if (!script) { var all = document.querySelectorAll("script[data-site]"); script = all[all.length - 1]; }
  if (!script) return;
  var site = (script.getAttribute("data-site") || "").trim().toLowerCase();
  var preview = script.hasAttribute("data-preview");
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(site) && !preview) return;
  var base = "https://www.saabai.ai";
  try { base = new URL(script.src, location.href).origin; } catch (e) {}
  window.__saabaiChat = window.__saabaiChat || {};
  if (window.__saabaiChat[site || "preview"]) return;
  window.__saabaiChat[site || "preview"] = VERSION;

  var HEX = /^#[0-9a-fA-F]{6}$/;
  var IDLE_MS = 30 * 60 * 1000;
  var KEY = "saabai-chat:" + (site || "preview");
  var cfg = null, state = { sid: "", t: 0, msgs: [] }, busy = false, ended = false;
  var els = {};

  function rid() {
    try { if (crypto && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, "").slice(0, 32); } catch (e) {}
    var s = ""; for (var i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16); return s;
  }
  function load() {
    if (preview) { state = { sid: "preview-session", t: Date.now(), msgs: [] }; return; }
    try {
      var raw = sessionStorage.getItem(KEY);
      if (raw) { var o = JSON.parse(raw); if (o && o.sid && Date.now() - o.t < IDLE_MS) { state = o; return; } }
    } catch (e) {}
    state = { sid: rid(), t: Date.now(), msgs: [] };
  }
  function save() {
    if (preview) return;
    state.t = Date.now();
    try { sessionStorage.setItem(KEY, JSON.stringify({ sid: state.sid, t: state.t, msgs: state.msgs.slice(-40) })); } catch (e) {}
  }
  function safeUrl(u) {
    if (!u) return "";
    if (u.charAt(0) === "/" && u.charAt(1) !== "/") return base + u;
    try { var x = new URL(u); return x.protocol === "https:" ? x.href : ""; } catch (e) { return ""; }
  }
  function initials(n) { return (n || "?").split(/\s+/).slice(0, 2).map(function (w) { return (w[0] || "").toUpperCase(); }).join(""); }

  var CSS = [
    ":host{all:initial}",
    "*{box-sizing:border-box}",
    ".w{position:fixed;bottom:20px;z-index:2147483000;font:14px/1.5 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--text)}",
    ".w.right{right:20px}.w.left{left:20px}",
    ".btn{width:60px;height:60px;border-radius:50%;border:3px solid var(--accent);background:var(--primary);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.28);transition:transform .15s}",
    ".btn:hover{transform:scale(1.06)}.btn:focus-visible,.send:focus-visible,.close:focus-visible,.inp:focus-visible,.pw a:focus-visible{outline:3px solid #62c5d1;outline-offset:2px}",
    ".btn img{width:100%;height:100%;object-fit:cover;display:block}",
    ".panel{position:absolute;bottom:76px;width:352px;max-width:calc(100vw - 40px);height:500px;max-height:calc(100vh - 110px);background:var(--bg);border-radius:16px;box-shadow:0 20px 70px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden}",
    ".right .panel{right:0}.left .panel{left:0}.panel.open{display:flex}",
    ".head{display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--primary);color:#fff;flex:none}",
    ".av{width:40px;height:40px;border-radius:50%;background:var(--accent);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex:none;overflow:hidden;border:2px solid rgba(255,255,255,.35)}",
    ".av img{width:100%;height:100%;object-fit:cover}",
    ".nm{font-weight:700;font-size:15px;line-height:1.2}.st{font-size:12px;opacity:.85;display:flex;align-items:center;gap:6px;margin-top:2px}.st:before{content:'';width:8px;height:8px;border-radius:50%;background:#4ade80}",
    ".st.off:before{background:#94a3b8}",
    ".close{margin-left:auto;background:none;border:0;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:6px 8px;border-radius:8px;opacity:.85}.close:hover{opacity:1}",
    ".msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}",
    ".m{max-width:86%;padding:9px 13px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word;font-size:14px}",
    ".m.bot{align-self:flex-start;background:#fff;color:var(--text);border-bottom-left-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,.08)}",
    ".m.user{align-self:flex-end;background:var(--primary);color:#fff;border-bottom-right-radius:4px}",
    ".m.note{align-self:stretch;max-width:100%;background:#fff8e6;color:#5b4300;border:1px solid #f1d58a;font-size:13px;text-align:center}",
    ".dots{display:flex;gap:4px;padding:12px 14px;background:#fff;border-radius:14px;border-bottom-left-radius:4px;align-self:flex-start}",
    ".dots i{width:7px;height:7px;border-radius:50%;background:#b8bcc6;animation:b 1.3s infinite}.dots i:nth-child(2){animation-delay:.2s}.dots i:nth-child(3){animation-delay:.4s}",
    "@keyframes b{0%,80%,100%{opacity:.35;transform:scale(.7)}40%{opacity:1;transform:scale(1)}}",
    "@media (prefers-reduced-motion:reduce){.dots i{animation:none;opacity:.7}.btn{transition:none}}",
    ".bar{display:flex;gap:8px;padding:10px 12px;border-top:1px solid rgba(0,0,0,.08);background:var(--bg);flex:none}",
    ".inp{flex:1;min-width:0;height:40px;padding:0 14px;border:1.5px solid rgba(0,0,0,.14);border-radius:20px;font:inherit;background:#fff;color:var(--text)}",
    ".inp:disabled{background:#eef0f3}",
    ".send{width:40px;height:40px;border-radius:50%;border:0;background:var(--accent);color:var(--primary);cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none}",
    ".send:disabled{opacity:.45;cursor:default}",
    ".pw{text-align:center;font-size:11px;color:rgba(0,0,0,.45);padding:2px 0 8px;flex:none}.pw a{color:inherit}",
    ".go{text-align:center;padding:0 12px 8px;flex:none}.go a{font-size:13px;color:var(--primary)}",
    ".sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}",
    "@media (max-width:480px){.w{bottom:12px}.w.right{right:12px}.w.left{left:12px}.panel{position:fixed;left:8px;right:8px;bottom:84px;width:auto;max-width:none;height:min(560px,calc(100vh - 100px))}}"
  ].join("");

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function build() {
    var host = document.createElement("div");
    host.setAttribute("data-saabai-chat", site || "preview");
    var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    var st = document.createElement("style"); st.textContent = CSS; root.appendChild(st);
    var w = el("div", "w right"); els.w = w;
    var btn = el("button", "btn"); btn.type = "button"; btn.setAttribute("aria-expanded", "false"); els.btn = btn;
    var panel = el("div", "panel"); panel.setAttribute("role", "dialog"); els.panel = panel;
    var head = el("div", "head");
    var av = el("div", "av"); els.av = av;
    var info = el("div"); els.nm = el("div", "nm"); els.st = el("div", "st", "Online now"); info.appendChild(els.nm); info.appendChild(els.st);
    var close = el("button", "close", "\u00d7"); close.type = "button"; close.setAttribute("aria-label", "Close chat"); els.close = close;
    head.appendChild(av); head.appendChild(info); head.appendChild(close);
    var msgs = el("div", "msgs"); msgs.setAttribute("aria-live", "polite"); msgs.setAttribute("role", "log"); els.msgs = msgs;
    var bar = el("form", "bar"); els.bar = bar;
    var inp = el("input", "inp"); inp.type = "text"; inp.autocomplete = "off"; inp.maxLength = 1000; inp.setAttribute("aria-label", "Your message"); els.inp = inp;
    var send = el("button", "send"); send.type = "submit"; send.disabled = true; send.setAttribute("aria-label", "Send message"); els.send = send;
    send.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
    bar.appendChild(inp); bar.appendChild(send);
    var pw = el("div", "pw"); els.pw = pw;
    var a = el("a", "", "Saabai AI"); a.href = "https://www.saabai.ai"; a.target = "_blank"; a.rel = "noopener"; pw.appendChild(document.createTextNode("Powered by ")); pw.appendChild(a);
    var go = el("div", "go"); els.go = go;
    panel.appendChild(head); panel.appendChild(msgs); panel.appendChild(go); panel.appendChild(bar); panel.appendChild(pw);
    w.appendChild(panel); w.appendChild(btn); root.appendChild(w);
    document.body.appendChild(host);
    els.host = host;
    btn.addEventListener("click", function () { toggle(!panel.classList.contains("open")); });
    close.addEventListener("click", function () { toggle(false); btn.focus(); });
    panel.addEventListener("keydown", function (e) { if (e.key === "Escape") { toggle(false); btn.focus(); } });
    inp.addEventListener("input", function () { send.disabled = busy || ended || !inp.value.trim(); });
    bar.addEventListener("submit", function (e) { e.preventDefault(); submit(); });
  }

  function track(ev) {
    if (preview || !site) return;
    fetch(base + "/api/chat-platform/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: site, sessionId: state.sid, event: ev })
    }).catch(function () {});
  }

  function apply(c) {
    cfg = c;
    var s = els.w;
    var set = function (k, v, d) { s.style.setProperty(k, HEX.test(v || "") ? v : d); };
    set("--primary", c.primary, "#0f2a4a"); set("--accent", c.accent, "#c9a227"); set("--bg", c.bg, "#f6f7f9"); set("--text", c.text, "#1c2430");
    els.w.className = "w " + (c.position === "left" ? "left" : "right");
    els.panel.setAttribute("aria-label", "Chat with " + c.botName);
    els.btn.setAttribute("aria-label", "Chat with " + c.botName);
    els.nm.textContent = c.botName;
    els.inp.placeholder = c.placeholder || "Type a message...";
    var url = safeUrl(c.avatarUrl);
    function fill(node, big) {
      node.textContent = "";
      if (url) { var img = document.createElement("img"); img.alt = ""; img.src = url; img.onerror = function () { if (big) node.innerHTML = bubbleIcon(); else node.textContent = initials(c.botName); }; node.appendChild(img); }
      else if (big) node.innerHTML = bubbleIcon(); else node.textContent = initials(c.botName);
    }
    fill(els.btn, true); fill(els.av, false);
    els.pw.style.display = c.poweredBy === false ? "none" : "";
    if (els.go) {
      els.go.textContent = "";
      if (c.handoff && c.handoff.href && c.handoff.label) {
        var link = el("a", "", c.handoff.label);
        link.href = c.handoff.href;
        link.target = "_blank";
        link.rel = "noopener";
        link.addEventListener("click", function () { track("handoff"); });
        els.go.appendChild(link);
      }
    }
    if (!state.msgs.length && c.greeting) state.msgs = [{ r: "bot", c: c.greeting, g: 1 }];
    else if (state.msgs[0] && state.msgs[0].g) state.msgs[0].c = c.greeting;
    render();
  }
  function bubbleIcon() { return '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>'; }

  function render() {
    els.msgs.textContent = "";
    state.msgs.forEach(function (m) { els.msgs.appendChild(el("div", "m " + m.r, m.c)); });
    if (busy) { var d = el("div", "dots"); d.setAttribute("aria-label", "Typing"); d.innerHTML = "<i></i><i></i><i></i>"; els.msgs.appendChild(d); }
    els.msgs.scrollTop = els.msgs.scrollHeight;
    els.send.disabled = busy || ended || !els.inp.value.trim();
    els.inp.disabled = ended;
    els.st.className = "st" + (ended ? " off" : ""); els.st.textContent = ended ? "Away" : "Online now";
  }
  function toggle(open) {
    els.panel.classList.toggle("open", open);
    els.btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) { render(); setTimeout(function () { if (!els.inp.disabled) els.inp.focus(); }, 30); }
  }
  function note(text) { state.msgs.push({ r: "note", c: text, n: 1 }); save(); }

  function submit() {
    var text = els.inp.value.trim();
    if (!text || busy || ended) return;
    els.inp.value = ""; state.msgs.push({ r: "user", c: text }); busy = true; save(); render();
    if (preview) { setTimeout(function () { busy = false; state.msgs.push({ r: "bot", c: "This is a preview. Real replies appear on your live site." }); render(); }, 600); return; }
    var history = state.msgs.filter(function (m) { return (m.r === "user" || m.r === "bot") && !m.g && !m.n; }).slice(-10).map(function (m) { return { role: m.r === "bot" ? "assistant" : "user", content: m.c }; });
    fetch(base + "/api/chat-platform/message", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: site, sessionId: state.sid, messages: history }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (o) {
        busy = false;
        var j = o.j || {};
        if (j.chatbotOff) { ended = true; state.msgs.push({ r: "note", c: j.content || (cfg && cfg.offMessage) || "Chat is taking a break.", n: 1 }); }
        else if (o.s === 429) note(j.content || "Chat is very busy right now. Please try again shortly.");
        else if (o.s === 403 || o.s === 404) { ended = true; note("Chat is not available here right now. Please contact the team directly."); }
        else if (o.s >= 400 || !j.content) note("Sorry, I couldn't answer that just now. Please try again, or contact the team directly.");
        else { state.msgs.push({ r: "bot", c: j.content }); }
        save(); render();
      })
      .catch(function () { busy = false; note("I couldn't connect just now. Please check your connection and try again, or contact the team directly."); render(); });
  }

  function start(c) { if (!els.host) build(); load(); apply(c); }

  function boot() {
    if (preview) {
      build(); load();
      window.addEventListener("message", function (e) {
        if (e.source !== window.parent || !e.data || e.data.type !== "saabai-chat-config" || !e.data.config) return;
        var c = e.data.config;
        if (e.data.open !== false) toggle(true);
        ended = !!e.data.showOff; state.msgs = [];
        apply(c);
        if (e.data.showOff) { state.msgs.push({ r: "note", c: c.offMessage, n: 1 }); render(); }
      });
      try { window.parent.postMessage({ type: "saabai-chat-ready" }, "*"); } catch (x) {}
      return;
    }
    fetch(base + "/api/chat-platform/config?site=" + encodeURIComponent(site))
      .then(function (r) { return r.ok ? r.json() : { active: false }; })
      .then(function (c) { if (c && c.active) start(c); })
      .catch(function () { /* stay hidden */ });
  }
  if (document.body) boot(); else document.addEventListener("DOMContentLoaded", boot);
})();
