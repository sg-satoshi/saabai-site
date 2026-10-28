"use client";

import { useEffect, useState } from "react";
import "./credit-rail.css";
import {
  BLUEPRINT_PAGE_HREF,
  describeCredit,
  IMPLEMENTATION_CALL_URL,
  padCreditUnit,
  type BlueprintCreditModel,
  type CreditServiceId,
} from "../../../lib/blueprint-credit";

function ServiceIcon({ id }: { id: CreditServiceId }) {
  if (id === "lex") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5h16v11H9l-5 4z" />
        <path d="M8 10h8M8 13h5" />
      </svg>
    );
  }
  if (id === "lachie") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />
      </svg>
    );
  }
  if (id === "automation") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M7 6.5h.01M10 6.5h.01" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </svg>
  );
}

export function CreditPlanRail({
  model,
  blueprintHref = BLUEPRINT_PAGE_HREF,
  frozen = false,
}: {
  model: BlueprintCreditModel;
  blueprintHref?: string;
  /** Preview clocks stay on the sample time so screenshots do not tick. */
  frozen?: boolean;
}) {
  const [nowMs, setNowMs] = useState(() => new Date(model.serverNow).getTime());

  useEffect(() => {
    const server = new Date(model.serverNow).getTime();
    setNowMs(server);
    if (frozen || !Number.isFinite(server)) return;
    const offset = Date.now() - server;
    const id = window.setInterval(() => setNowMs(Date.now() - offset), 60_000);
    return () => window.clearInterval(id);
  }, [model.serverNow, frozen]);

  const view = describeCredit(model, new Date(nowMs));
  if (!view) return null;

  const headerClass = view.tone === "warm" ? "C-h t-warm" : "C-h t-calm";

  return (
    <article className="card credit-rail" aria-label={view.headline} data-phase={view.phase}>
      <div className={headerClass}>
        <div className="eb">
          <span>Blueprint build credit</span>
          <span className="pill2" aria-live="polite">{view.statusLabel}</span>
        </div>
        <h3>{view.headline}</h3>
        <p className="sr-only">{view.ariaSummary}</p>
        {view.showCountdown ? (
          <div className="cdl" aria-hidden="true">
            {view.days > 0 ? <b>{view.days}</b> : null}
            {view.days > 0 ? <span>d</span> : null}
            <b>{padCreditUnit(view.hours)}</b>
            <span>h</span>
            <b>{padCreditUnit(view.minutes)}</b>
            <span>m</span>
            <span className="lft">left</span>
          </div>
        ) : null}
        {view.showCountdown ? (
          <div className="trk" aria-hidden="true">
            <i style={{ width: `${Math.min(100, Math.max(0, view.fraction * 100))}%` }} />
          </div>
        ) : null}
        <div className="ends">{view.endsLine}</div>
      </div>
      <div className="C-b">
        <p className="body">{view.body}</p>
        {view.usedNote ? <p className="used">{view.usedNote}</p> : null}
        <div className="plbl" id="credit-plan">
          <b>{view.planTitle}</b>
          <span>{view.planSource}</span>
        </div>
        {view.items.map((item, index) => (
          <div className="rec" key={`${item.service}-${index}`}>
            <span className="n">{index + 1}</span>
            <div className="rt">
              {item.title}
              <small>{item.detail}</small>
            </div>
            <span className="svc">
              <ServiceIcon id={item.service} />
              {item.serviceLabel}
            </span>
          </div>
        ))}
        <p className="also">{view.alsoCovers}</p>
        <a className="btn pri full" href={IMPLEMENTATION_CALL_URL} target="_blank" rel="noopener noreferrer">
          <CalendarIcon />
          {view.primaryLabel}
        </a>
        <a className="btn full" href={blueprintHref}>
          {view.secondaryLabel}
        </a>
        <p className="fine">{view.finePrint}</p>
      </div>
    </article>
  );
}
