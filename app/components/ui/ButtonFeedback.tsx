"use client";
import { useEffect } from "react";

/**
 * Site-wide async feedback for buttons. When a click on a button/link starts a
 * fetch within 400ms, the control shows a spinner (aria-busy) until it settles,
 * and a toast confirms a mutation or reports a failure. Opt out with data-no-feedback.
 * Streaming / chat requests are ignored.
 */
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function toast(kind: "ok" | "err", msg: string) {
  let box = document.querySelector<HTMLElement>(".sb-toasts");
  if (!box) {
    box = document.createElement("div");
    box.className = "sb-toasts";
    box.setAttribute("aria-live", "polite");
    document.body.appendChild(box);
  }
  const t = document.createElement("div");
  t.className = "sb-toast";
  t.dataset.kind = kind;
  t.setAttribute("role", kind === "err" ? "alert" : "status");
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), kind === "err" ? 6000 : 3000);
}

export default function ButtonFeedback() {
  useEffect(() => {
    const w = window as unknown as { __sbFetchPatched?: boolean };
    if (w.__sbFetchPatched) return;
    w.__sbFetchPatched = true;
    let last: { el: HTMLElement; at: number } | null = null;
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("button, [role=button], a, input[type=submit]");
      if (el && !el.closest("[data-no-feedback]")) last = { el, at: Date.now() };
    };
    document.addEventListener("click", onClick, true);
    const orig = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const method = (init?.method || (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase();
      const own = typeof url === "string" && (url.startsWith("/") || url.startsWith(location.origin));
      const el = own && last && Date.now() - last.at < 400 && !/chat|stream|track|analytics|events?\b/i.test(url) ? last.el : null;
      if (!el || !el.isConnected) return orig(input, init);
      last = null;
      const was = el.getAttribute("aria-busy");
      el.setAttribute("aria-busy", "true");
      try {
        const res = await orig(input, init);
        const stream = (res.headers.get("content-type") || "").includes("event-stream");
        if (!stream) {
          if (!res.ok) toast("err", res.status === 401 || res.status === 403 ? "Not allowed. Please sign in again." : "That didn't work. Please try again.");
          else if (MUTATING.has(method) && !location.pathname.startsWith("/saabai-admin")) toast("ok", "Done");
        }
        return res;
      } catch (err) {
        toast("err", "Network problem. Please try again.");
        throw err;
      } finally {
        if (was === null) el.removeAttribute("aria-busy");
        else el.setAttribute("aria-busy", was);
      }
    };
  }, []);
  return null;
}
