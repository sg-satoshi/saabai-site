"use client";
/** Firm plan document allowance on the Draft Documents screen: count, heads-up at 16, pause at the cap. */
import { resetDateLabel, type DocUsage } from "../../../lib/lex-doc-allowance-shared";

export const LEX_BOOK_CALL_URL = "https://calendly.com/shanegoldberg/30min";
export const LEX_MORE_DOCS_HREF = "mailto:hello@saabai.ai?subject=" + encodeURIComponent("Lex: more documents (Enterprise)");

export function docState(u: DocUsage | null): "none" | "ok" | "warn" | "full" {
  if (!u) return "none";
  if (u.used >= u.cap) return "full";
  if (u.used >= u.warnAt) return "warn";
  return "ok";
}

export function DocAllowance({ usage }: { usage: DocUsage | null }) {
  const st = docState(usage);
  if (!usage || st === "none") return null;
  const links = (
    <p className="lxw-doc-links">
      <a className="lxw-btn sm" href={LEX_MORE_DOCS_HREF}>Talk to us about more documents</a>{" "}
      <a className="lxw-btn sm" href={LEX_BOOK_CALL_URL} target="_blank" rel="noopener noreferrer">Book a call</a>
    </p>
  );
  return (
    <div className="lxw-doc" data-state={st}>
      <p className="lxw-sub" aria-live="polite"><b>{usage.used} of {usage.cap}</b> documents used this month</p>
      {st === "warn" && (
        <div className="lxw-banner warn" role="status">
          <p>Heads up: {usage.cap - usage.used} {usage.cap - usage.used === 1 ? "document" : "documents"} left this month. The count resets on {resetDateLabel(usage.resetsOn)}.</p>
          {links}
        </div>
      )}
      {st === "full" && (
        <div className="lxw-banner warn" role="status">
          <p><b>New drafts are paused until {resetDateLabel(usage.resetsOn)}.</b> Your firm has used all {usage.cap} documents this month. Research is still unlimited, and your existing drafts stay open to view and edit.</p>
          {links}
        </div>
      )}
    </div>
  );
}
