/*! Saabai chat widget v1 (1.2.0). One script for every site:
 *  <script src="https://www.saabai.ai/embed/chat.v1.js" data-site="your-site-slug" async></script>
 *  Reads the site's settings (look, on/off, plan rules) from Saabai. No lead capture. No cookies.
 *  Compatible within v1: fixes ship here, breaking changes get a new file name (chat.v2.js).
 */
(function () {
  "use strict";
  var VERSION = "1.2.0";
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
  function linkUrl(u) {
    if (!u || typeof u !== "string") return "";
    if (/^mailto:[^\s@]+@[^\s@]+/i.test(u) || /^tel:\+?[0-9]{6,20}$/i.test(u)) return u;
    try { var x = new URL(u); return x.protocol === "https:" ? x.href : ""; } catch (e) { return ""; }
  }
  // "2026-11-30" -> "30 Nov 2026" (Australian order).
  function auDate(d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ""); if (!m) return d || "";
    return (+m[3]) + " " + ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m[2] - 1] + " " + m[1];
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
    ".qr{display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start;max-width:100%}",
    ".qr button{border:1.5px solid var(--primary);background:#fff;color:var(--primary);border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer;min-height:34px}",
    ".qr button:hover{background:var(--primary);color:#fff}.qr button:focus-visible,.cta:focus-visible{outline:3px solid #62c5d1;outline-offset:2px}",
    ".cta{align-self:flex-start;display:inline-block;background:var(--primary);color:#fff;border-radius:10px;padding:9px 14px;font-weight:600;font-size:14px;text-decoration:none;border:2px solid var(--accent)}",
    ".cta.fb{background:#fff;color:var(--primary);border-color:var(--primary)}",
    ".hb{background:none;border:1px solid rgba(255,255,255,.5);color:#fff;font:600 11px system-ui,sans-serif;border-radius:999px;padding:4px 9px;cursor:pointer;margin-left:4px}",
    ".hb:focus-visible,.nd button:focus-visible,.fu button:focus-visible{outline:3px solid #62c5d1;outline-offset:2px}",
    ".pv{font-size:11px;color:rgba(0,0,0,.5);text-align:center;padding:0 12px 4px;flex:none}",
    ".offer{margin:0 12px 6px;padding:6px 10px;border-radius:8px;background:#eef6ff;color:#1c3a5c;font-size:12.5px;flex:none}",
    ".nd{position:absolute;bottom:72px;width:260px;max-width:calc(100vw - 40px);background:#fff;color:#1c2430;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.2);padding:12px 34px 12px 12px;font-size:13.5px;cursor:pointer}",
    ".right .nd{right:0}.left .nd{left:0}",
    ".nd button{position:absolute;top:4px;right:4px;border:0;background:none;font-size:18px;line-height:1;cursor:pointer;color:#555;padding:4px 8px}",
    ".fu{align-self:stretch;background:#fff;border-radius:12px;padding:10px;box-shadow:0 1px 4px rgba(0,0,0,.08);font-size:13px}",
    ".fu input[type=email],.fu input[type=text]{width:100%;height:36px;margin:4px 0;padding:0 10px;border:1.5px solid rgba(0,0,0,.14);border-radius:8px;font:inherit}",
    ".fu label{display:flex;gap:6px;align-items:flex-start;font-size:12px;margin:4px 0}",
    ".fu button{border:0;background:var(--primary);color:#fff;border-radius:8px;padding:7px 12px;font:inherit;font-weight:600;cursor:pointer;margin-right:6px}",
    ".fu button.ln{background:none;color:var(--primary);text-decoration:underline;padding:7px 0}",
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
    var newb = el("button", "hb", "New chat"); newb.type = "button"; newb.style.display = "none"; els.newb = newb;
    var endb = el("button", "hb", "End chat"); endb.type = "button"; endb.style.display = "none"; els.endb = endb;
    head.appendChild(av); head.appendChild(info);
    var hbx = el("div"); hbx.style.marginLeft = "auto"; hbx.style.display = "flex"; hbx.appendChild(newb); hbx.appendChild(endb);
    head.appendChild(hbx); head.appendChild(close); close.style.marginLeft = "4px";
    var msgs = el("div", "msgs"); msgs.setAttribute("aria-live", "polite"); msgs.setAttribute("role", "log"); els.msgs = msgs;
    var bar = el("form", "bar"); els.bar = bar;
    var inp = el("input", "inp"); inp.type = "text"; inp.autocomplete = "off"; inp.maxLength = 1000; inp.setAttribute("aria-label", "Your message"); els.inp = inp;
    var send = el("button", "send"); send.type = "submit"; send.disabled = true; send.setAttribute("aria-label", "Send message"); els.send = send;
    send.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
    bar.appendChild(inp); bar.appendChild(send);
    var pw = el("div", "pw"); els.pw = pw;
    var a = el("a", "", "Saabai AI"); a.href = "https://www.saabai.ai"; a.target = "_blank"; a.rel = "noopener"; pw.appendChild(document.createTextNode("Powered by ")); pw.appendChild(a);
    var go = el("div", "go"); els.go = go;
    var offer = el("div", "offer"); offer.style.display = "none"; els.offer = offer;
    var pv = el("div", "pv"); els.pv = pv;
    panel.appendChild(head); panel.appendChild(offer); panel.appendChild(msgs); panel.appendChild(go); panel.appendChild(bar); panel.appendChild(pv); panel.appendChild(pw);
    w.appendChild(panel); w.appendChild(btn); root.appendChild(w);
    document.body.appendChild(host);
    els.host = host;
    saabaiSheet(false);
    btn.addEventListener("click", function () { hideNudge(); toggle(!panel.classList.contains("open")); });
    endb.addEventListener("click", endChat);
    newb.addEventListener("click", newChat);
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
    var eg = c.engage || {};
    els.pv.textContent = eg.privacyNote || "";
    if (eg.offer && eg.offer.text) { els.offer.textContent = eg.offer.text + " Offer ends " + auDate(eg.offer.endsOn) + "."; els.offer.style.display = ""; } else els.offer.style.display = "none";
    if (eg.freeOffer && linkUrl(eg.freeOffer.url)) {
      var lm = el("a", "", eg.freeOffer.label); lm.href = linkUrl(eg.freeOffer.url); lm.target = "_blank"; lm.rel = "noopener"; lm.style.marginLeft = "10px";
      lm.addEventListener("click", function () { track("offer_click"); });
      els.go.appendChild(lm);
    }
    var greet = c.greeting;
    if (returning && eg.returnGreeting) greet = eg.returnGreeting;
    c = Object.assign({}, c, { greeting: greet });
    var q0 = c.goal && c.goal.quickReplies ? c.goal.quickReplies.slice(0, 4) : [];
    if (!state.msgs.length && c.greeting) state.msgs = [{ r: "bot", c: c.greeting, g: 1, q: q0 }];
    else if (state.msgs[0] && state.msgs[0].g) { state.msgs[0].c = c.greeting; state.msgs[0].q = q0; }
    render();
  }
  function bubbleIcon() { return '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>'; }

  function render() {
    els.msgs.textContent = "";
    var last = state.msgs.length - 1;
    state.msgs.forEach(function (m, i) {
      els.msgs.appendChild(el("div", "m " + m.r, m.c));
      if (m.b) {
        var href = linkUrl(m.b.url);
        if (href) {
          var a = el("a", "cta" + (m.b.kind === "fallback" ? " fb" : ""), m.b.label);
          a.href = href; if (/^https:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
          a.addEventListener("click", function () { track(m.b.kind === "fallback" ? "fallback_click" : "cta_click"); });
          els.msgs.appendChild(a);
        }
      }
      if (m.rv) {
        var rh = linkUrl(m.rv);
        if (rh) {
          var ra = el("a", "cta fb", "Leave a review"); ra.href = rh; ra.target = "_blank"; ra.rel = "noopener";
          ra.addEventListener("click", function () { track("review_click"); try { localStorage.setItem(KEY + ":rv", "1"); } catch (e) {} });
          els.msgs.appendChild(ra);
        }
      }
      // Quick replies only under the latest bot message, and only while nothing is pending.
      if (i === last && m.r === "bot" && m.q && m.q.length && !busy && !ended) {
        var row = el("div", "qr"); row.setAttribute("role", "group"); row.setAttribute("aria-label", "Suggested replies");
        m.q.forEach(function (t) {
          var b = el("button", "", t); b.type = "button";
          b.addEventListener("click", function () { els.inp.value = t; submit(); });
          row.appendChild(b);
        });
        els.msgs.appendChild(row);
      }
    });
    if (ended && endForm) els.msgs.appendChild(endForm);
    if (busy) { var d = el("div", "dots"); d.setAttribute("aria-label", "Typing"); d.innerHTML = "<i></i><i></i><i></i>"; els.msgs.appendChild(d); }
    els.msgs.scrollTop = els.msgs.scrollHeight;
    els.send.disabled = busy || ended || !els.inp.value.trim();
    els.inp.disabled = ended;
    var eg2 = (cfg && cfg.engage) || {};
    var talked = state.msgs.some(function (m) { return m.r === "user"; });
    els.endb.style.display = eg2.endChat && talked && !ended ? "" : "none";
    els.newb.style.display = eg2.endChat && (talked || ended) ? "" : "none";
    els.st.className = "st" + (ended ? " off" : ""); els.st.textContent = ended ? "Away" : "Online now";
  }
  function saabaiSheet(open) {
    var src = base + "/chat-sheet.js?v=1";
    function run() {
      if (!window.SaabaiChatSheet || !els.panel) return;
      if (!els.panel._saabaiSheet) els.panel._saabaiSheet = window.SaabaiChatSheet.attach(els.panel);
      els.panel._saabaiSheet.setOpen(!!open);
    }
    if (window.SaabaiChatSheet) { run(); return; }
    var existing = document.querySelector("script[data-saabai-sheet]");
    if (existing) { existing.addEventListener("load", run); return; }
    var s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.setAttribute("data-saabai-sheet", "1");
    s.onload = run;
    document.head.appendChild(s);
  }
  function toggle(open) {
    els.panel.classList.toggle("open", open);
    els.btn.setAttribute("aria-expanded", open ? "true" : "false");
    saabaiSheet(open);
    if (open) { render(); setTimeout(function () { if (!els.inp.disabled) { try { els.inp.focus({ preventScroll: true }); } catch (err) { els.inp.focus(); } } }, 30); }
  }
  function note(text) { state.msgs.push({ r: "note", c: text, n: 1 }); save(); }

  function submit() {
    var text = els.inp.value.trim();
    if (!text || busy || ended) return;
    els.inp.value = ""; state.msgs.push({ r: "user", c: text }); busy = true; save(); render();
    if (preview) {
      setTimeout(function () {
        busy = false;
        var pm = { r: "bot", c: "This is a preview. Real replies appear on your live site." };
        var g = cfg && cfg.goal; var pb = g && (g.cta || g.fallback);
        if (pb) pm.b = { label: pb.label, url: pb.url, kind: g.cta ? "cta" : "fallback" };
        state.msgs.push(pm); render();
      }, 600);
      return;
    }
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
        else {
          var bm = { r: "bot", c: j.content };
          if (j.quickReplies && j.quickReplies.length) bm.q = j.quickReplies.slice(0, 3);
          if (j.cta && j.cta.label && j.cta.url) bm.b = { label: j.cta.label, url: j.cta.url, kind: j.cta.kind === "fallback" ? "fallback" : "cta" };
          var asked = false; try { asked = !!localStorage.getItem(KEY + ":rv"); } catch (e) {}
          if (j.review && j.review.url && !asked) { bm.rv = j.review.url; try { localStorage.setItem(KEY + ":rv", "1"); } catch (e) {} }
          state.msgs.push(bm);
        }
        save(); render();
      })
      .catch(function () { busy = false; note("I couldn't connect just now. Please check your connection and try again, or contact the team directly."); render(); });
  }

  var endForm = null, returning = false, nudgeEl = null;
  function endChat() {
    ended = true; track("chat_ended");
    var eg = (cfg && cfg.engage) || {};
    endForm = null;
    if (eg.emailCopy) endForm = followForm();
    note("Chat ended. Thanks for chatting.");
    render();
  }
  function newChat() {
    track("new_chat");
    ended = false; endForm = null; busy = false;
    state = { sid: rid(), t: Date.now(), msgs: [] };
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    apply(cfg);
  }
  // Follow-up capture: consent is required (Spam Act). Field events never include values.
  function followForm() {
    var f = el("form", "fu"); track("form_opened");
    f.appendChild(el("div", "", "Want a copy of this chat, or a follow-up from the team?"));
    var nm = el("input"); nm.type = "text"; nm.placeholder = "Your name (optional)"; nm.maxLength = 100; nm.setAttribute("aria-label", "Your name");
    var em = el("input"); em.type = "email"; em.placeholder = "Your email"; em.maxLength = 200; em.required = true; em.setAttribute("aria-label", "Your email");
    var lab = el("label"); var cb = el("input"); cb.type = "checkbox"; lab.appendChild(cb); lab.appendChild(document.createTextNode("Yes, email me a copy of this chat and a follow-up. I can unsubscribe any time."));
    var msg = el("div"); msg.setAttribute("role", "status");
    var sb = el("button", "", "Send me a copy"); sb.type = "submit";
    var no = el("button", "ln", "No thanks"); no.type = "button";
    var once = {};
    function filled(k, v) { if (v && !once[k]) { once[k] = 1; track("field_" + k); } }
    nm.addEventListener("change", function () { filled("name", nm.value.trim()); });
    em.addEventListener("change", function () { filled("email", em.value.trim()); });
    no.addEventListener("click", function () { endForm = null; render(); });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!cb.checked) { msg.textContent = "Please tick the box so we can email you."; return; }
      if (preview) { msg.textContent = "Preview only. Nothing was sent."; return; }
      sb.disabled = true;
      var transcript = state.msgs.filter(function (m) { return m.r === "user" || m.r === "bot"; }).map(function (m) { return (m.r === "user" ? "You: " : "Bot: ") + m.c; }).join("\n").slice(0, 1000);
      fetch(base + "/api/chat-platform/followup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: site, sessionId: state.sid, name: nm.value, email: em.value, consent: true, message: transcript }) })
        .then(function (r) { msg.textContent = r.ok ? "Thanks, we'll be in touch." : "Sorry, that didn't go through. Please contact the team directly."; })
        .catch(function () { msg.textContent = "Sorry, that didn't go through."; sb.disabled = false; });
    });
    f.appendChild(nm); f.appendChild(em); f.appendChild(lab); f.appendChild(sb); f.appendChild(no); f.appendChild(msg);
    return f;
  }

  // Nudges: page-aware opener, idle, scroll depth and exit intent (desktop). Once per page view,
  // at most nudgeCap per visitor per 7 days, never when the chat is open, always dismissible.
  function nudgeAllowed(cap) {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY + ":nd") || "[]");
      var week = Date.now() - 7 * 86400000;
      var recent = raw.filter(function (t) { return t > week; });
      return recent.length < cap ? recent : null;
    } catch (e) { return null; }
  }
  function hideNudge() { if (nudgeEl) { nudgeEl.remove(); nudgeEl = null; } }
  function showNudge(text) {
    var eg = (cfg && cfg.engage) || {};
    if (nudgeEl || !text || els.panel.classList.contains("open")) return;
    var recent = nudgeAllowed(eg.nudgeCap || 3); if (!recent) return;
    try { recent.push(Date.now()); localStorage.setItem(KEY + ":nd", JSON.stringify(recent)); } catch (e) { return; }
    nudgeEl = el("div", "nd", text); nudgeEl.setAttribute("role", "status");
    var x = el("button", "", "\u00d7"); x.type = "button"; x.setAttribute("aria-label", "Dismiss");
    x.addEventListener("click", function (e) { e.stopPropagation(); hideNudge(); });
    nudgeEl.appendChild(x);
    nudgeEl.addEventListener("click", function () { track("nudge_click"); hideNudge(); toggle(true); });
    els.w.appendChild(nudgeEl); track("nudge_shown");
  }
  function openerFor(path, list) {
    var best = null;
    (list || []).forEach(function (o) {
      var m = o.match.length > 1 ? o.match.replace(/\/+$/, "") : o.match;
      if (path === m || path.indexOf(m === "/" ? "/" : m + "/") === 0) { if (!best || m.length > best.match.length) best = o; }
    });
    return best ? best.text : null;
  }
  function armNudges(c) {
    var eg = c.engage || {};
    if (preview) return;
    var text = openerFor(location.pathname, eg.openers) || (eg.idleSeconds || eg.scrollPercent || eg.exitIntent ? "Have a question? I can help." : null);
    if (!text) return;
    var fired = false;
    function fire() { if (fired) return; fired = true; showNudge(text); cleanup(); }
    var t1 = null, onScroll = null, onLeave = null;
    if (openerFor(location.pathname, eg.openers) && !eg.idleSeconds && !eg.scrollPercent) t1 = setTimeout(fire, 8000);
    if (eg.idleSeconds) t1 = setTimeout(fire, eg.idleSeconds * 1000);
    if (eg.scrollPercent) {
      onScroll = function () { var h = document.documentElement.scrollHeight - innerHeight; if (h > 0 && scrollY / h * 100 >= eg.scrollPercent) fire(); };
      addEventListener("scroll", onScroll, { passive: true });
    }
    if (eg.exitIntent && matchMedia && matchMedia("(pointer:fine)").matches) {
      onLeave = function (e) { if (e.clientY <= 0) fire(); };
      document.addEventListener("mouseleave", onLeave);
    }
    function cleanup() { if (t1) clearTimeout(t1); if (onScroll) removeEventListener("scroll", onScroll); if (onLeave) document.removeEventListener("mouseleave", onLeave); }
  }

  function start(c) {
    if (!els.host) build();
    try { returning = !!localStorage.getItem(KEY + ":seen"); localStorage.setItem(KEY + ":seen", "1"); } catch (e) {}
    load(); apply(c); armNudges(c);
  }

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
