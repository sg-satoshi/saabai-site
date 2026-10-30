"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

type SheetCtl = { setOpen: (open: boolean) => void; sync: () => void; destroy: () => void };

declare global {
  interface Window {
    SaabaiChatSheet?: { attach: (panel: HTMLElement) => SheetCtl };
  }
}

let loading: Promise<void> | null = null;

/** Loads `/chat-sheet.js?v=1` once. The same file drives the vanilla widgets. */
export function loadChatSheet(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.SaabaiChatSheet) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const done = () => resolve();
    const existing = document.querySelector("script[data-saabai-sheet]");
    if (existing) {
      if (window.SaabaiChatSheet) { done(); return; }
      existing.addEventListener("load", done, { once: true });
      existing.addEventListener("error", done, { once: true });
      queueMicrotask(() => { if (window.SaabaiChatSheet) done(); });
      return;
    }
    const s = document.createElement("script");
    s.src = "/chat-sheet.js?v=1";
    s.async = true;
    s.setAttribute("data-saabai-sheet", "1");
    s.onload = done;
    s.onerror = done;
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * On a phone, fit `panelRef` to the visual viewport while `open` is true.
 * Desktop does not change the panel. Safe to call when the panel is unmounted.
 */
export function useMobileChatSheet(open: boolean, panelRef: RefObject<HTMLElement | null>) {
  const ctlRef = useRef<SheetCtl | null>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    let dead = false;
    loadChatSheet().then(() => {
      if (dead || !panel.isConnected || !window.SaabaiChatSheet) return;
      const ctl = window.SaabaiChatSheet.attach(panel);
      ctlRef.current = ctl;
      ctl.setOpen(true);
    });
    return () => {
      dead = true;
      ctlRef.current?.destroy();
      ctlRef.current = null;
    };
  }, [open, panelRef]);

  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current as (HTMLElement & { _saabaiSheet?: SheetCtl }) | null;
    panel?._saabaiSheet?.sync();
  });
}
