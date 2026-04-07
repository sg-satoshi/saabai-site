/**
 * Lex Widget Embed Script — Saabai.ai
 *
 * Usage:
 *   <script src="https://saabai.ai/lex-widget.js" data-client-id="your-client-id"></script>
 *
 * Optional attributes:
 *   data-client-id    — Your firm's client ID (default: "lex-external")
 *   data-base-url     — Override the widget base URL (default: "https://saabai.ai")
 */
(function () {
  "use strict";

  // ── Config ──────────────────────────────────────────────────────────────────
  var script    = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var clientId = script.getAttribute("data-client-id") || "lex-external";
  var baseUrl  = (script.getAttribute("data-base-url") || "https://saabai.ai").replace(/\/$/, "");
  var src      = baseUrl + "/lex-widget?clientId=" + encodeURIComponent(clientId);

  // ── State ───────────────────────────────────────────────────────────────────
  var isOpen   = false;
  var isMobile = window.innerWidth < 640;

  // ── Inject CSS ───────────────────────────────────────────────────────────────
  var style = document.createElement("style");
  style.textContent = [
    "#__lex-btn {",
    "  position: fixed;",
    "  bottom: 24px;",
    "  right: 24px;",
    "  z-index: 9999;",
    "  width: 60px;",
    "  height: 60px;",
    "  border-radius: 50%;",
    "  background: linear-gradient(135deg, #E0BC6A 0%, #C9A84C 100%);",
    "  border: none;",
    "  cursor: pointer;",
    "  display: flex;",
    "  align-items: center;",
    "  justify-content: center;",
    "  box-shadow: 0 4px 20px rgba(201,168,76,0.4), 0 2px 8px rgba(0,0,0,0.25);",
    "  transition: transform 0.2s ease, box-shadow 0.2s ease;",
    "  outline: none;",
    "}",
    "#__lex-btn:hover {",
    "  transform: scale(1.07) translateY(-2px);",
    "  box-shadow: 0 6px 28px rgba(201,168,76,0.5), 0 4px 12px rgba(0,0,0,0.3);",
    "}",
    "#__lex-btn:active { transform: scale(0.96); }",
    "#__lex-btn-label {",
    "  font-family: Georgia, 'Times New Roman', serif;",
    "  font-size: 26px;",
    "  font-weight: 900;",
    "  color: #0d1b2a;",
    "  line-height: 1;",
    "  transition: opacity 0.15s ease, transform 0.15s ease;",
    "  user-select: none;",
    "}",
    "#__lex-frame-wrap {",
    "  position: fixed;",
    "  bottom: 96px;",
    "  right: 24px;",
    "  z-index: 9998;",
    "  width: 380px;",
    "  height: 600px;",
    "  border-radius: 16px;",
    "  overflow: hidden;",
    "  box-shadow: 0 16px 64px rgba(0,0,0,0.35), 0 4px 20px rgba(0,0,0,0.2);",
    "  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1);",
    "  transform-origin: bottom right;",
    "}",
    "#__lex-frame-wrap.lex-hidden {",
    "  opacity: 0;",
    "  transform: scale(0.88) translateY(12px);",
    "  pointer-events: none;",
    "}",
    "#__lex-frame-wrap.lex-visible {",
    "  opacity: 1;",
    "  transform: scale(1) translateY(0);",
    "  pointer-events: auto;",
    "}",
    "#__lex-iframe {",
    "  width: 100%;",
    "  height: 100%;",
    "  border: none;",
    "  display: block;",
    "}",
    /* Mobile: full-screen */
    "@media (max-width: 639px) {",
    "  #__lex-btn { bottom: 16px; right: 16px; }",
    "  #__lex-frame-wrap {",
    "    bottom: 0 !important;",
    "    right: 0 !important;",
    "    width: 100vw !important;",
    "    height: 100vh !important;",
    "    height: 100dvh !important;",
    "    border-radius: 0 !important;",
    "  }",
    "}",
  ].join("\n");
  document.head.appendChild(style);

  // ── Launcher button ─────────────────────────────────────────────────────────
  var btn = document.createElement("button");
  btn.id = "__lex-btn";
  btn.setAttribute("aria-label", "Open Lex legal assistant");
  btn.setAttribute("aria-expanded", "false");

  var btnLabel = document.createElement("span");
  btnLabel.id = "__lex-btn-label";
  btnLabel.textContent = "L";
  btn.appendChild(btnLabel);
  document.body.appendChild(btn);

  // ── iframe wrapper + iframe ─────────────────────────────────────────────────
  var wrap = document.createElement("div");
  wrap.id = "__lex-frame-wrap";
  wrap.className = "lex-hidden";

  var iframe = document.createElement("iframe");
  iframe.id = "__lex-iframe";
  iframe.src = src;
  iframe.title = "Lex Legal Assistant";
  iframe.setAttribute("allow", "clipboard-write");
  iframe.setAttribute("loading", "lazy");

  wrap.appendChild(iframe);
  document.body.appendChild(wrap);

  // ── Toggle logic ────────────────────────────────────────────────────────────
  function open() {
    isOpen = true;
    wrap.className = "lex-visible";
    btnLabel.textContent = "×";
    btnLabel.style.fontSize = "30px";
    btnLabel.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    btn.setAttribute("aria-label", "Close Lex legal assistant");
    btn.setAttribute("aria-expanded", "true");
  }

  function close() {
    isOpen = false;
    wrap.className = "lex-hidden";
    btnLabel.textContent = "L";
    btnLabel.style.fontSize = "26px";
    btnLabel.style.fontFamily = "Georgia, 'Times New Roman', serif";
    btn.setAttribute("aria-label", "Open Lex legal assistant");
    btn.setAttribute("aria-expanded", "false");
  }

  btn.addEventListener("click", function () {
    if (isOpen) { close(); } else { open(); }
  });

  // ── Listen for messages from widget iframe ──────────────────────────────────
  window.addEventListener("message", function (e) {
    if (!e.data || typeof e.data !== "object") return;
    // Widget signals ready
    if (e.data.lexWidget === "ready") return;
  });

  // ── Mobile resize handling ──────────────────────────────────────────────────
  function applyMobileLayout() {
    isMobile = window.innerWidth < 640;
    // CSS handles the layout via @media query; just ensure
    // open state is preserved correctly after resize
    if (isOpen) {
      wrap.className = "lex-visible";
    }
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyMobileLayout, 120);
  });

  // ── Close on Escape ─────────────────────────────────────────────────────────
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) { close(); }
  });
})();
