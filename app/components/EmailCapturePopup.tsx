"use client";

/**
 * Exit pop-up, angle 1 (Designer spec exit-popup-redesign, QA Gate PASS r2, Shane yes 29 Oct 2026).
 * Desktop: exit-intent modal that sends leavers to the free AI score, with "Email me the link" as a fallback.
 * Mobile and touch: a small, late, non-modal bottom sheet. No timer modal on any device.
 * Rules (paths, caps, holdout, suppression) live in lib/exit-popup.ts and are unit tested.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import "./exit-popup.css";
import { gaEvent } from "@/lib/ga";
import { showsSaabaiChrome } from "@/lib/client-site-surface";
import {
  installConversationBridge,
  interruptBlocked,
  isExitIntentLeave,
  subscribeConversationActivity,
} from "@/lib/conversation-activity";
import {
  DESKTOP_ARM_MS,
  EXIT_VARIANT,
  MEMBER_KEY,
  MOBILE_DWELL_MS,
  SCORE_HREF,
  SESSION_SEEN_KEY,
  assignGroup,
  bumpPageViews,
  exitPopupEligible,
  isMemberPath,
  markFlag,
  migrateLegacyCookie,
  mobileReady,
  sheetFits,
  validEmail,
  writeCap,
} from "@/lib/exit-popup";

type Surface = "modal" | "sheet";
type Trigger = "exit_intent" | "mobile_scroll";
type View = "default" | "email" | "sending" | "error-invalid" | "error-server" | "success";
type DismissMethod = "close" | "no_thanks" | "escape" | "backdrop";

const INVALID_MSG = "Enter a valid email address so we know where to send your link.";
const SERVER_MSG = "That did not send. Try again, or take the score now. You can also email hello@saabai.ai.";

function fieldBusy(): boolean {
  const a = document.activeElement as HTMLElement | null;
  if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT" || a.isContentEditable)) return true;
  const fields = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]), textarea',
  );
  for (const f of Array.from(fields)) if (f.value && f.value.trim()) return true;
  return false;
}

function stores(): { local: Storage; session: Storage } | null {
  try {
    return { local: window.localStorage, session: window.sessionStorage };
  } catch {
    return null;
  }
}

const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
const Close = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
const Check = ({ size = 14, stroke = 1.9 }: { size?: number; stroke?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="#62c5d1" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8.3l2.5 2.5L12 5.4" /></svg>
);
const ErrIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></svg>
);
const Gauge = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 17a8.5 8.5 0 1 1 17 0" /><path d="M12 17l4.2-5" /><circle cx="12" cy="17" r="1.3" /><path d="M6 13l1 .6M18 13l-1 .6M12 8.5v1.2" /></svg>
);
const Ring = () => (
  <svg width="168" height="168" viewBox="0 0 168 168" aria-hidden="true">
    <defs><linearGradient id="xp-rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7dd9e3" /><stop offset="1" stopColor="#62c5d1" /></linearGradient></defs>
    <circle cx="84" cy="84" r="66" fill="none" stroke="rgba(98,197,209,.14)" strokeWidth="12" />
    <circle cx="84" cy="84" r="66" fill="none" stroke="url(#xp-rg)" strokeWidth="12" strokeLinecap="round" strokeDasharray="290 415" transform="rotate(-90 84 84)" />
    <text x="84" y="80" textAnchor="middle" fontFamily="var(--font-geist-sans), Geist, sans-serif" fontWeight="600" fontSize="40" fill="#fff">?</text>
    <text x="84" y="106" textAnchor="middle" fontFamily="var(--font-geist-sans), Geist, sans-serif" fontWeight="500" fontSize="15" fill="#a5b4fc">out of 100</text>
  </svg>
);

export default function EmailCapturePopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState<{ surface: Surface; trigger: Trigger } | null>(null);
  const [view, setView] = useState<View>("default");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [compact, setCompact] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLAnchorElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const openRef = useRef(open);
  const viewRef = useRef(view);
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { viewRef.current = view; }, [view]);

  useEffect(() => installConversationBridge(), []);

  const close = useCallback((restore = true) => {
    setOpen(null);
    setView("default");
    setCompact(false);
    setMeasuring(false);
    if (restore) {
      const el = lastFocus.current;
      if (el && typeof el.focus === "function" && document.contains(el)) window.setTimeout(() => el.focus(), 0);
    }
  }, []);

  // Per page: membership flag, legacy cookie, holdout split, page views, and the triggers.
  useEffect(() => {
    if (openRef.current) close(false);
    const path = window.location.pathname;
    const chrome = showsSaabaiChrome(window.location.hostname, path);
    if (!chrome) return;
    const s = stores();
    if (!s) return;
    const { local, session } = s;
    if (isMemberPath(path)) {
      markFlag(local, MEMBER_KEY);
      return;
    }
    migrateLegacyCookie(document.cookie, local);
    const { group, isNew } = assignGroup(local);
    if (isNew && group === "holdout") gaEvent("exit_popup_holdout", { variant: EXIT_VARIANT });
    const pageViews = bumpPageViews(session);
    const eligible = () => exitPopupEligible({ path: window.location.pathname, chrome, local, session });
    if (!eligible()) return;

    let fired = false;
    let pending: Trigger | null = null;
    const tryOpen = (surface: Surface, trigger: Trigger) => {
      if (fired || openRef.current) return;
      if (!eligible()) { fired = true; return; }
      if (interruptBlocked() || fieldBusy()) { pending = surface === "sheet" ? trigger : null; return; }
      fired = true;
      pending = null;
      lastFocus.current = document.activeElement as HTMLElement | null;
      setView("default");
      setCompact(false);
      setMeasuring(surface === "sheet");
      setOpen({ surface, trigger });
    };

    const cleanups: Array<() => void> = [];
    const touch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    if (!touch) {
      // Desktop: exit intent only, armed after 8 seconds. No timer.
      let armed = false;
      const arm = window.setTimeout(() => { armed = true; }, DESKTOP_ARM_MS);
      const onLeave = (e: MouseEvent) => {
        if (!armed || !isExitIntentLeave(e, document)) return;
        tryOpen("modal", "exit_intent");
      };
      document.addEventListener("mouseleave", onLeave);
      cleanups.push(() => { window.clearTimeout(arm); document.removeEventListener("mouseleave", onLeave); });
    } else if (pageViews >= 2) {
      // Mobile: never on the first page of a visit; then 50% scroll and 20 seconds on the page.
      const start = Date.now();
      let depth = 0;
      const check = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        depth = Math.max(depth, max <= 0 ? 1 : window.scrollY / max);
        if (mobileReady({ pageViews, scrollDepth: depth, dwellMs: Date.now() - start })) tryOpen("sheet", "mobile_scroll");
      };
      const t = window.setTimeout(check, MOBILE_DWELL_MS + 50);
      window.addEventListener("scroll", check, { passive: true });
      cleanups.push(() => { window.clearTimeout(t); window.removeEventListener("scroll", check); });
    }

    const unsub = subscribeConversationActivity(() => {
      if (interruptBlocked()) {
        // A conversation started: step aside without writing a cap.
        if (openRef.current) close(false);
        return;
      }
      if (pending) tryOpen("sheet", pending);
    });
    cleanups.push(unsub);
    return () => cleanups.forEach((f) => f());
  }, [pathname, close]);

  const markSeen = useCallback(() => {
    const s = stores();
    try { s?.session.setItem(SESSION_SEEN_KEY, "1"); } catch { /* storage blocked */ }
  }, []);

  // Mobile sheet: measure before showing. Default must fit 25% of the viewport, else compact, else do not show.
  useLayoutEffect(() => {
    if (!open || open.surface !== "sheet" || !measuring) return;
    const el = dialogRef.current;
    if (!el) return;
    // Decide on the next frame while the sheet is still invisible (data-measuring hides it).
    const raf = window.requestAnimationFrame(() => {
      const h = el.getBoundingClientRect().height;
      if (sheetFits(h, window.innerHeight)) setMeasuring(false);
      else if (!compact) setCompact(true);
      else close(false);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [open, measuring, compact, close]);

  // Shown: view event, session flag, focus, and desktop modal plumbing.
  const shown = !!open && !measuring;
  useEffect(() => {
    if (!shown || !open) return;
    markSeen();
    gaEvent("exit_popup_view", { variant: EXIT_VARIANT, surface: open.surface, trigger: open.trigger, page_path: window.location.pathname });
    primaryRef.current?.focus({ preventScroll: true });
    if (open.surface === "sheet") {
      document.body.setAttribute("data-exit-sheet", "1");
      return () => document.body.removeAttribute("data-exit-sheet");
    }
    const root = rootRef.current;
    const siblings = Array.from(document.body.children).filter((c) => c !== root && !c.hasAttribute("inert")) as HTMLElement[];
    siblings.forEach((c) => c.setAttribute("inert", ""));
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      siblings.forEach((c) => c.removeAttribute("inert"));
      html.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  const surface = open?.surface ?? "modal";

  const dismiss = useCallback((method: DismissMethod) => {
    const s = stores();
    // A backdrop mis-click only hides it for the rest of this visit (the session flag is already set).
    if (s && method !== "backdrop" && viewRef.current !== "success") writeCap(s.local, "dismissed");
    gaEvent("exit_popup_dismiss", { variant: EXIT_VARIANT, surface: openRef.current?.surface, method, state: viewRef.current });
    close(true);
  }, [close]);

  // Escape closes; Tab is trapped inside the desktop modal.
  useEffect(() => {
    if (!shown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); dismiss("escape"); return; }
      if (e.key !== "Tab" || openRef.current?.surface !== "modal") return;
      const box = dialogRef.current;
      if (!box) return;
      const items = Array.from(box.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !box.contains(active))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (active === last || !box.contains(active))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shown, dismiss]);

  const ctaClick = (state: "default" | "email" | "success") => {
    const s = stores();
    if (s && state !== "success") writeCap(s.local, "clicked");
    gaEvent("exit_popup_cta_click", { variant: EXIT_VARIANT, surface, state });
  };

  const openEmail = () => {
    setView("email");
    gaEvent("exit_popup_email_open", { variant: EXIT_VARIANT, surface });
    if (open?.surface === "sheet") setCompact(false);
    window.setTimeout(() => emailRef.current?.focus(), 0);
  };

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (view === "sending") return;
    if (!validEmail(email)) {
      setView("error-invalid");
      gaEvent("exit_popup_email_error", { variant: EXIT_VARIANT, surface, reason: "invalid" });
      emailRef.current?.focus();
      return;
    }
    setView("sending");
    gaEvent("exit_popup_email_submit", { variant: EXIT_VARIANT, surface, marketing_consent: consent });
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), offer: "score_link", marketingConsent: consent, source: window.location.pathname }),
      });
      const j = (await res.json().catch(() => null)) as { ok?: boolean; sent?: boolean } | null;
      if (res.ok && j?.ok === true && j.sent === true) {
        const s = stores();
        if (s) writeCap(s.local, "emailed");
        gaEvent("generate_lead", { form: "exit_popup_score_link", marketing_consent: consent });
        setView("success");
        return;
      }
    } catch { /* fall through to the server error */ }
    setView("error-server");
    gaEvent("exit_popup_email_error", { variant: EXIT_VARIANT, surface, reason: "server" });
  };

  if (!open) return null;

  const isEmailView = view === "email" || view === "sending" || view === "error-invalid" || view === "error-server";
  const titleId = surface === "modal" ? "xp-title" : "xp-title-m";
  const descId = surface === "modal" ? "xp-desc" : "xp-desc-m";
  const errId = "xp-err";

  const privacyEmail = (
    <>One email with your link. No spam. <a className="xp-pl" href="/privacy">Privacy policy</a></>
  );

  const emailForm = (
    <form onSubmit={sendLink} noValidate>
      <label className="xp-l" htmlFor="xp-email">Email</label>
      <input
        ref={emailRef}
        id="xp-email"
        className="xp-inp"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@yourbusiness.com.au"
        value={email}
        onChange={(e) => { setEmail(e.target.value); if (view === "error-invalid" || view === "error-server") setView("email"); }}
        aria-invalid={view === "error-invalid" ? true : undefined}
        aria-describedby={view === "error-invalid" || view === "error-server" ? errId : undefined}
      />
      {(view === "error-invalid" || view === "error-server") && (
        <p className="xp-err" id={errId} role="alert"><ErrIcon />{view === "error-invalid" ? INVALID_MSG : SERVER_MSG}</p>
      )}
      <label className="xp-cb" style={surface === "sheet" ? { margin: "12px 0 0" } : undefined}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>Also send me occasional Saabai tips by email. Optional. Unsubscribe any time.</span>
      </label>
      <button className="xp-btn" type="submit" disabled={view === "sending"} style={surface === "sheet" ? undefined : { marginTop: 0 }}>
        {view === "sending" ? "Sending..." : "Email me the link"}
      </button>
      <div className="xp-row">
        <a className="xp-link" href={SCORE_HREF} onClick={() => ctaClick("email")}>{surface === "modal" ? "Take the score now instead" : "Take the score now"}</a>
        <button type="button" className="xp-link dim" onClick={() => dismiss("no_thanks")}>No thanks</button>
      </div>
    </form>
  );

  if (surface === "sheet") {
    return (
      <div ref={rootRef} className="xp">
        <div
          ref={dialogRef}
          className={`xp-sheet${compact && view === "default" ? " compact" : ""}`}
          data-measuring={measuring ? "1" : undefined}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          aria-describedby={view === "default" && !compact ? descId : undefined}
        >
          <button type="button" className="xp-x" aria-label="Close" onClick={() => dismiss("close")}><Close /></button>
          {view === "success" ? (
            <>
              <div className="xp-top">
                <div className="xp-ico"><Check size={22} stroke={1.8} /></div>
                <div role="status">
                  <h2 id={titleId}>Link sent</h2>
                  <p className="xp-s">Check your inbox for an email from hello@saabai.ai. Questions? Reply to it. We usually reply within 1 business day.</p>
                </div>
              </div>
              <a ref={primaryRef} className="xp-btn ghost" href={SCORE_HREF} onClick={() => ctaClick("success")}>Take the score now <Arrow /></a>
              <div className="xp-row" style={{ justifyContent: "center" }}>
                <button type="button" className="xp-link dim" onClick={() => dismiss("close")}>Close</button>
              </div>
            </>
          ) : isEmailView ? (
            <>
              <div className="xp-top">
                <div className="xp-ico"><Gauge /></div>
                <div>
                  <h2 id={titleId}>Email me the link</h2>
                  <p className="xp-s">{privacyEmail}</p>
                </div>
              </div>
              <div style={{ height: 14 }} />
              {emailForm}
            </>
          ) : (
            <>
              <div className="xp-top">
                <div className="xp-ico"><Gauge /></div>
                <div>
                  <h2 id={titleId}>Get your free AI score</h2>
                  {!compact && <p className="xp-s" id={descId}>12 questions, about 3 minutes. Instant score and three quick wins.</p>}
                </div>
              </div>
              <a ref={primaryRef} className="xp-btn" href={SCORE_HREF} onClick={() => ctaClick("default")}>Get my free AI score <Arrow /></a>
              <div className="xp-row">
                <button type="button" className="xp-link" onClick={openEmail}>Email me the link</button>
                <button type="button" className="xp-link dim" onClick={() => dismiss("no_thanks")}>No thanks</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="xp">
      <div className="xp-scrim" onClick={() => dismiss("backdrop")} aria-hidden="true" />
      <div className="xp-center">
        <div
          ref={dialogRef}
          className="xp-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
        >
          <div className="xp-viz" aria-hidden="true">
            <Ring />
            <div className="xp-chips">
              <div className="xp-chip"><i>1</i>Quick win 1</div>
              <div className="xp-chip"><i>2</i>Quick win 2</div>
              <div className="xp-chip"><i>3</i>Quick win 3</div>
            </div>
          </div>
          <div className="xp-body">
            <button type="button" className="xp-x" aria-label="Close" onClick={() => dismiss("close")}><Close /></button>
            {view === "success" ? (
              <div className="xp-done">
                <div className="xp-tickbig"><Check size={26} stroke={1.8} /></div>
                <div role="status">
                  <h2 id={titleId} style={{ marginTop: 20 }}>Link sent</h2>
                  <p className="xp-lead" id={descId}>Check your inbox for an email from hello@saabai.ai with your link to the free AI score.</p>
                </div>
                <p className="xp-lead" style={{ marginTop: 12 }}>Got a question? Reply to that email. We usually reply within 1 business day.</p>
                <div style={{ height: 26 }} />
                <a ref={primaryRef} className="xp-btn ghost" href={SCORE_HREF} onClick={() => ctaClick("success")}>Take the score now <Arrow /></a>
                <div className="xp-row" style={{ justifyContent: "center", width: "100%" }}>
                  <button type="button" className="xp-link dim" onClick={() => dismiss("close")}>Close</button>
                </div>
              </div>
            ) : isEmailView ? (
              <>
                <span className="xp-pill">Free AI score</span>
                <h2 id={titleId}>We&apos;ll email you the link for later</h2>
                <p className="xp-lead" id={descId}>One email with your link to the free AI score. Take it when you have 3 minutes.</p>
                <div style={{ height: 20 }} />
                {emailForm}
                <p className="xp-fine xp-priv">{privacyEmail}</p>
              </>
            ) : (
              <>
                <span className="xp-pill">Free AI score</span>
                <h2 id={titleId}>Before you go, see where AI could help your business</h2>
                <p className="xp-lead" id={descId}>Twelve questions, about 3 minutes. Made for Australian small businesses.</p>
                <ul className="xp-tick">
                  <li><span className="xp-c"><Check /></span>An instant score out of 100</li>
                  <li><span className="xp-c"><Check /></span>Three quick wins for this week</li>
                  <li><span className="xp-c"><Check /></span>No email needed to see your score</li>
                </ul>
                <a ref={primaryRef} className="xp-btn" href={SCORE_HREF} onClick={() => ctaClick("default")}>Get my free AI score <Arrow /></a>
                <div className="xp-row">
                  <button type="button" className="xp-link" onClick={openEmail}>Email me the link for later</button>
                  <button type="button" className="xp-link dim" onClick={() => dismiss("no_thanks")}>No thanks, I&apos;ll keep browsing</button>
                </div>
                <p className="xp-fine xp-priv">Your answers stay private. We use them to work out your score, and to email your report if you ask. <a className="xp-pl" href="/privacy">Privacy policy</a></p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
