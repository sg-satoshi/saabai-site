/*! Saabai mobile chat sheet. Shared by every client widget.
 * Phone keyboards do not shrink vh/dvh. This pins an open panel to
 * window.visualViewport so the header, the latest messages and the input
 * stay in the visible area. Desktop widths are left to each widget's CSS.
 * Keep the frame() rules in sync with lib/mobile-chat-sheet.ts.
 */
(function (global) {
  "use strict";
  var PHONE = 640;
  var COARSE_MAX = 1024;
  var KEYBOARD_INSET = 80;
  var CSS = [
    ".saabai-mobile-sheet{position:fixed !important;top:var(--saabai-sheet-top) !important;left:var(--saabai-sheet-left) !important;width:var(--saabai-sheet-width) !important;height:var(--saabai-sheet-height) !important;right:auto !important;bottom:auto !important;margin:0 !important;max-width:none !important;max-height:none !important;border-radius:0 !important;transform:none !important;transition:none !important;z-index:2147483000 !important;box-sizing:border-box !important;padding-top:env(safe-area-inset-top);padding-bottom:var(--saabai-sheet-pad-bottom);overscroll-behavior:contain;display:flex !important;flex-direction:column !important;opacity:1 !important;pointer-events:auto !important;overflow:hidden !important}",
    ".saabai-mobile-sheet input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=hidden]),.saabai-mobile-sheet textarea{font-size:16px !important}"
  ].join("");

  function frame(v) {
    if (!v || !(v.layoutWidth > 0)) return null;
    var phone = v.layoutWidth <= PHONE || (!!v.coarse && v.layoutWidth <= COARSE_MAX);
    if (!phone) return null;
    var vis = v.visual;
    var width = vis && vis.width > 0 ? vis.width : v.layoutWidth;
    var height = vis && vis.height > 0 ? vis.height : v.layoutHeight;
    var top = vis && Number.isFinite(vis.offsetTop) ? vis.offsetTop : 0;
    var left = vis && Number.isFinite(vis.offsetLeft) ? vis.offsetLeft : 0;
    if (top < 0) top = 0;
    if (left < 0) left = 0;
    if (!(width > 0) || !(height > 0)) return null;
    var keyboard = Math.max(0, (v.layoutHeight || 0) - height - top) > KEYBOARD_INSET;
    return { top: top, left: left, width: width, height: height, keyboard: keyboard };
  }

  function readViewport() {
    var vv = global.visualViewport;
    var coarse = false;
    try { coarse = global.matchMedia("(hover: none) and (pointer: coarse)").matches; } catch (e) {}
    return {
      layoutWidth: global.innerWidth,
      layoutHeight: global.innerHeight,
      coarse: coarse,
      visual: vv ? { width: vv.width, height: vv.height, offsetTop: vv.offsetTop || 0, offsetLeft: vv.offsetLeft || 0 } : null
    };
  }

  function parentEl(n) {
    if (!n) return null;
    if (n.parentElement) return n.parentElement;
    var root = n.getRootNode && n.getRootNode();
    if (root && root.host) return root.host;
    return null;
  }

  function ensureCss(panel) {
    var root = panel.getRootNode ? panel.getRootNode() : document;
    var parent = root && root.host ? root : document.head;
    if (!parent || (parent.querySelector && parent.querySelector("style[data-saabai-sheet-css]"))) return;
    var st = document.createElement("style");
    st.setAttribute("data-saabai-sheet-css", "1");
    st.textContent = CSS;
    parent.appendChild(st);
  }

  var locks = 0;
  var saved = null;
  var scrollY = 0;
  var openSheets = [];

  function onTouch(e) {
    if (locks === 0) return;
    var t = e.target;
    while (t && t !== document.body && t !== document.documentElement) {
      if (t.getAttribute && t.getAttribute("data-saabai-sheet-scroll") === "1") return;
      t = t.parentElement || (t.getRootNode && t.getRootNode().host) || null;
    }
    if (e.cancelable) e.preventDefault();
  }

  function lockPage() {
    if (locks++ > 0) return;
    var b = document.body;
    var root = document.documentElement;
    scrollY = global.scrollY || root.scrollTop || 0;
    saved = {
      position: b.style.position,
      top: b.style.top,
      left: b.style.left,
      right: b.style.right,
      width: b.style.width,
      overflow: b.style.overflow,
      rootOverflow: root.style.overflow
    };
    b.dataset.saabaiSheetLock = "1";
    b.style.position = "fixed";
    b.style.top = (-scrollY) + "px";
    b.style.left = "0";
    b.style.right = "0";
    b.style.width = "100%";
    b.style.overflow = "hidden";
    root.style.overflow = "hidden";
    document.addEventListener("touchmove", onTouch, { passive: false });
  }

  function unlockPage() {
    if (locks === 0) return;
    if (--locks > 0) return;
    var b = document.body;
    var root = document.documentElement;
    if (saved) {
      b.style.position = saved.position;
      b.style.top = saved.top;
      b.style.left = saved.left;
      b.style.right = saved.right;
      b.style.width = saved.width;
      b.style.overflow = saved.overflow;
      root.style.overflow = saved.rootOverflow;
    }
    if (b.dataset) delete b.dataset.saabaiSheetLock;
    document.removeEventListener("touchmove", onTouch);
    global.scrollTo(0, scrollY);
    saved = null;
  }

  // Back/bfcache restores the page with whatever inline styles were on body.
  // Drop the lock on pagehide so the cached page can scroll, then lock again
  // if the sheet is still open when the page is restored.
  function releaseLocksForCache() {
    for (var i = 0; i < openSheets.length; i++) openSheets[i].pauseLock();
    while (locks > 0) unlockPage();
  }
  if (global.addEventListener) {
    global.addEventListener("pagehide", releaseLocksForCache);
    global.addEventListener("pageshow", function (e) {
      if (!e.persisted) return;
      for (var i = 0; i < openSheets.length; i++) openSheets[i].sync();
    });
  }

  function layoutChildren(panel) {
    var kids = panel.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      if (!el || !el.style || el.tagName === "STYLE") continue;
      var oy = "";
      try { oy = getComputedStyle(el).overflowY; } catch (e) {}
      if (oy === "auto" || oy === "scroll") {
        el.style.setProperty("min-height", "0", "important");
        el.style.setProperty("flex", "1 1 auto", "important");
        el.style.setProperty("max-height", "none", "important");
        el.style.setProperty("overscroll-behavior", "contain", "important");
        el.setAttribute("data-saabai-sheet-scroll", "1");
      } else {
        el.style.setProperty("flex-shrink", "0", "important");
        el.setAttribute("data-saabai-sheet-fixed", "1");
      }
    }
  }

  function clearChildren(panel) {
    var marked = panel.querySelectorAll("[data-saabai-sheet-scroll],[data-saabai-sheet-fixed]");
    for (var i = 0; i < marked.length; i++) {
      var el = marked[i];
      el.style.removeProperty("min-height");
      el.style.removeProperty("flex");
      el.style.removeProperty("max-height");
      el.style.removeProperty("overscroll-behavior");
      el.style.removeProperty("flex-shrink");
      el.removeAttribute("data-saabai-sheet-scroll");
      el.removeAttribute("data-saabai-sheet-fixed");
    }
  }

  function attach(panel) {
    if (!panel) return { setOpen: function () {}, sync: function () {}, destroy: function () {}, isActive: function () { return false; } };
    if (panel._saabaiSheet) return panel._saabaiSheet;
    var open = false;
    var active = false;
    var held = [];
    var timers = [];

    function suspendAncestors() {
      held = [];
      var n = parentEl(panel);
      var root = document.documentElement;
      while (n && n !== root) {
        var cs;
        try { cs = getComputedStyle(n); } catch (e) { break; }
        var transform = cs.transform && cs.transform !== "none";
        var will = (cs.willChange || "").indexOf("transform") !== -1;
        if (transform || will) {
          held.push({
            el: n,
            transform: n.style.getPropertyValue("transform"),
            priority: n.style.getPropertyPriority("transform")
          });
          n.style.setProperty("transform", "none", "important");
        }
        n = parentEl(n);
      }
    }

    function restoreAncestors() {
      for (var i = 0; i < held.length; i++) {
        var h = held[i];
        if (h.transform) h.el.style.setProperty("transform", h.transform, h.priority);
        else h.el.style.removeProperty("transform");
      }
      held = [];
    }

    function stickers() {
      var kids = panel.children;
      var list = [];
      for (var i = 0; i < kids.length; i++) {
        var el = kids[i];
        if (!el || !el.getAttribute) continue;
        var oy = "";
        try { oy = getComputedStyle(el).overflowY; } catch (e) {}
        if (oy === "auto" || oy === "scroll" || el.getAttribute("data-saabai-sheet-scroll") === "1") {
          list.push({ el: el, bottom: el.scrollHeight - el.clientHeight - el.scrollTop < 80 });
        }
      }
      return list;
    }

    function apply(f) {
      ensureCss(panel);
      var keep = stickers();
      if (!active) {
        active = true;
        lockPage();
        suspendAncestors();
      }
      panel.style.setProperty("--saabai-sheet-top", f.top + "px");
      panel.style.setProperty("--saabai-sheet-left", f.left + "px");
      panel.style.setProperty("--saabai-sheet-width", f.width + "px");
      panel.style.setProperty("--saabai-sheet-height", f.height + "px");
      panel.style.setProperty("--saabai-sheet-pad-bottom", f.keyboard ? "0px" : "env(safe-area-inset-bottom)");
      panel.classList.add("saabai-mobile-sheet");
      panel.setAttribute("data-saabai-sheet-open", "1");
      layoutChildren(panel);
      for (var i = 0; i < keep.length; i++) {
        if (keep[i].bottom) keep[i].el.scrollTop = keep[i].el.scrollHeight;
      }
    }

    function deactivate() {
      if (!active && !panel.classList.contains("saabai-mobile-sheet")) return;
      active = false;
      panel.classList.remove("saabai-mobile-sheet");
      panel.removeAttribute("data-saabai-sheet-open");
      panel.style.removeProperty("--saabai-sheet-top");
      panel.style.removeProperty("--saabai-sheet-left");
      panel.style.removeProperty("--saabai-sheet-width");
      panel.style.removeProperty("--saabai-sheet-height");
      panel.style.removeProperty("--saabai-sheet-pad-bottom");
      clearChildren(panel);
      restoreAncestors();
      unlockPage();
    }

    function sync() {
      if (!open || !panel.isConnected) return;
      var f = frame(readViewport());
      if (!f) { deactivate(); return; }
      apply(f);
    }

    function later() {
      sync();
      timers.push(global.setTimeout(sync, 60));
      timers.push(global.setTimeout(sync, 320));
    }

    function onVV() { if (open) sync(); }

    var vv = global.visualViewport;
    if (vv) {
      vv.addEventListener("resize", onVV);
      vv.addEventListener("scroll", onVV);
    }
    global.addEventListener("resize", onVV, true);
    global.addEventListener("orientationchange", onVV);
    panel.addEventListener("focusin", later);
    panel.addEventListener("focusout", later);

    function destroy() {
      open = false;
      deactivate();
      for (var i = 0; i < timers.length; i++) global.clearTimeout(timers[i]);
      timers = [];
      if (vv) {
        vv.removeEventListener("resize", onVV);
        vv.removeEventListener("scroll", onVV);
      }
      global.removeEventListener("resize", onVV, true);
      global.removeEventListener("orientationchange", onVV);
      panel.removeEventListener("focusin", later);
      panel.removeEventListener("focusout", later);
      if (panel._saabaiSheet === api) delete panel._saabaiSheet;
      openSheets = openSheets.filter(function (s) { return s !== api; });
    }

    var api = {
      setOpen: function (v) {
        open = !!v;
        if (open) sync();
        else deactivate();
      },
      sync: sync,
      destroy: destroy,
      isActive: function () { return active; },
      pauseLock: function () { active = false; }
    };
    openSheets.push(api);
    panel._saabaiSheet = api;
    return api;
  }

  global.SaabaiChatSheet = {
    frame: frame,
    attach: attach,
    PHONE_MAX_WIDTH: PHONE,
    COARSE_POINTER_MAX_WIDTH: COARSE_MAX,
    KEYBOARD_INSET_PX: KEYBOARD_INSET
  };
})(typeof window !== "undefined" ? window : globalThis);
