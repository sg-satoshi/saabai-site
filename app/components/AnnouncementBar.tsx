"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import AnnouncementView from "./AnnouncementView";
import { countShown, EMPTY_STATE, pickAnnouncement, type PublicAnnouncement, type VisitorState } from "@/lib/announce/core";

const OWNED_HOST = /^(?:www\.)?saabai\.ai$|\.vercel\.app$|^localhost$/i;
const storeKey = (a: { id: string; version: number }) => `sb_ann_${a.id}_v${a.version}`;
/** Click, session count and last-counted session. Keyed by bar id and version, so editing a bar starts everyone fresh. */
const stateKey = (a: { id: string; version: number }) => `sb_ann_st_${a.id}_v${a.version}`;
const memState: Record<string, VisitorState> = {};

function sessionId(): string {
  try {
    let v = sessionStorage.getItem("sb_ann_session");
    if (!v) { v = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("sb_ann_session", v); }
    return v;
  } catch { return "mem"; }
}
function readDismissed(a: PublicAnnouncement): number | null {
  try {
    const s = a.reshow === "session" ? sessionStorage : localStorage;
    const v = s.getItem(storeKey(a));
    if (v) return Number(v) || Date.now();
  } catch { /* storage blocked: fall back to cookie */ }
  const m = document.cookie.split("; ").find((c) => c.startsWith(storeKey(a) + "="));
  return m ? Number(m.split("=")[1]) || Date.now() : null;
}
function readState(a: { id: string; version: number; reshow?: string }, full?: PublicAnnouncement): VisitorState {
  let st: VisitorState = { ...EMPTY_STATE };
  try { const raw = localStorage.getItem(stateKey(a)); if (raw) { const j = JSON.parse(raw); st = { ...st, clickedAt: typeof j.c === "number" ? j.c : null, sessions: Number(j.n) || 0, lastSession: typeof j.s === "string" ? j.s : null }; } } catch { st = { ...(memState[stateKey(a)] ?? st) }; }
  if (full) st.dismissedAt = readDismissed(full);
  return st;
}
function saveState(a: { id: string; version: number }, st: VisitorState) {
  memState[stateKey(a)] = st;
  try { localStorage.setItem(stateKey(a), JSON.stringify({ c: st.clickedAt, n: st.sessions, s: st.lastSession })); } catch { /* storage blocked: kept in memory for this page only */ }
}
function writeDismissed(a: PublicAnnouncement) {
  const now = String(Date.now());
  try { (a.reshow === "session" ? sessionStorage : localStorage).setItem(storeKey(a), now); return; } catch { /* use cookie */ }
  document.cookie = `${storeKey(a)}=${now}; Max-Age=${Math.max(1, a.reshowDays) * 86400}; Path=/; SameSite=Lax`;
}
function beacon(type: string, exp: string) {
  try { navigator.sendBeacon("/api/exp/event", new Blob([JSON.stringify({ type, exp })], { type: "application/json" })); } catch { /* ignore */ }
}

/**
 * Site announcement (top bar, bottom bar or slide-in card). Renders nothing unless the server says an announcement is live
 * for this page and device. Admin only: the flag defaults off and only Saabai-owned sites can enable it.
 */
export default function AnnouncementBar() {
  const path = usePathname() || "/";
  const [list, setList] = useState<PublicAnnouncement[]>([]);
  const [, setTick] = useState(0);
  const [show, setShow] = useState(false);
  const [mobile, setMobile] = useState(false);
  // Timer: offset = server clock minus device clock. `ended` flips when the deadline is reached (or the server says so).
  const [offset, setOffset] = useState(0);
  const [ended, setEnded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef<string>("");

  useEffect(() => {
    if (!OWNED_HOST.test(window.location.hostname)) return;
    let dead = false;
    const t0 = Date.now();
    fetch("/api/announcement/active", { credentials: "same-origin", cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => {
      const all: PublicAnnouncement[] = Array.isArray(j?.announcements) ? j.announcements : j?.announcement ? [j.announcement] : [];
      if (dead || !all.length) return;
      const t = all.find((x) => x.timer)?.timer;
      if (t) { setOffset(t.serverNow - (t0 + Date.now()) / 2); setEnded(!!t.expired); }
      setList(all);
    }).catch(() => {});
    return () => { dead = true; };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const f = () => setMobile(mq.matches);
    f(); mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  // One bar per page view: the highest priority one that this page, device and visitor history allow.
  const ann = list.length ? pickAnnouncement(list, { path, mobile, session: sessionId(), state: (x) => readState(x, list.find((l) => l.id === x.id)) }) : null;
  const annKey = ann ? `${ann.id}:${ann.version}` : "";

  useEffect(() => {
    setShow(false);
    if (!ann) return;
    if (ann.layout !== "card") { setShow(true); return; }
    // Card: after a delay or scroll depth, never on first paint.
    let done = false;
    const go = () => { if (!done) { done = true; setShow(true); cleanup(); } };
    const t = ann.delaySec > 0 ? window.setTimeout(go, ann.delaySec * 1000) : undefined;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (ann.scrollPct > 0 && max > 0 && (window.scrollY / max) * 100 >= ann.scrollPct) go();
    };
    if (ann.scrollPct > 0) window.addEventListener("scroll", onScroll, { passive: true });
    const cleanup = () => { if (t) clearTimeout(t); window.removeEventListener("scroll", onScroll); };
    return cleanup;
  }, [annKey, path]); // eslint-disable-line react-hooks/exhaustive-deps

  // Top bar pushes the page down: publish its height and shift the fixed nav.
  useEffect(() => {
    const el = document.documentElement;
    if (!show || !ann || ann.layout !== "top" || !ref.current) { el.removeAttribute("data-ann-top"); el.style.removeProperty("--ann-h"); return; }
    const set = () => { el.style.setProperty("--ann-h", `${ref.current?.offsetHeight ?? 0}px`); el.setAttribute("data-ann-top", "1"); };
    set();
    const ro = new ResizeObserver(set); ro.observe(ref.current);
    return () => { ro.disconnect(); el.removeAttribute("data-ann-top"); el.style.removeProperty("--ann-h"); };
  }, [show, ann]);

  // Mobile bottom bar: hide if the stack with the sticky call bar would exceed 25% of the viewport.
  useEffect(() => {
    if (show && ann?.layout === "bottom" && mobile && ref.current && (ref.current.offsetHeight + 64) / window.innerHeight > 0.25) ref.current.style.display = "none";
  }, [show, ann, mobile]);

  // Frequency cap: count this session once, the first time the bar is actually shown.
  useEffect(() => {
    if (!show || !ann || !(ann.maxShows && ann.maxShows > 0)) return;
    const sid = sessionId(), st = readState(ann);
    if (st.lastSession !== sid) saveState(ann, countShown(st, sid));
  }, [show, annKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Impression once per visitor per day (only when the engine says this visitor is a counted participant).
  useEffect(() => {
    if (!show || !ann?.expId) return;
    const k = `sb_ann_imp_${ann.expId}_${new Date().toISOString().slice(0, 10)}`;
    try { if (localStorage.getItem(k)) return; localStorage.setItem(k, "1"); } catch { if (seen.current === k) return; seen.current = k; }
    beacon("impression", ann.expId);
  }, [show, ann]);

  // Deadline reached on this device: swap or hide straight away, then ask the server (the authority) to confirm.
  // If the device clock was off and the server says it isn't over, correct the offset and keep counting.
  const onEnd = () => {
    if (!ann?.timer) return;
    const confirm = (tries: number) => {
      fetch("/api/announcement/active", { credentials: "same-origin", cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => {
        if (!j) return;
        if (!j.announcement) { setShow(false); return; }
        const t = j.announcement.timer;
        if (t && !t.expired) { setEnded(false); setOffset(t.serverNow - Date.now()); if (tries < 3) window.setTimeout(() => confirm(tries + 1), 3000); }
      }).catch(() => {});
    };
    if (ann.timer.endMode === "hide") setShow(false); else setEnded(true);
    confirm(0);
  };

  const close = () => { if (ann) writeDismissed(ann); setShow(false); setTick((t) => t + 1); };
  const clicked = (a: PublicAnnouncement) => { saveState(a, { ...readState(a), clickedAt: Date.now() }); setTick((t) => t + 1); };
  useEffect(() => {
    if (!show) return;
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  });

  if (!ann || !show) return null;
  return <AnnouncementView ann={ann} ended={ended} offset={offset} onEnd={onEnd} onClose={close} innerRef={ref} onCta={(url) => { clicked(ann); if (ann.expId) beacon(url.startsWith("tel:") ? "call_click" : "cta_click", ann.expId); }} />;
}

