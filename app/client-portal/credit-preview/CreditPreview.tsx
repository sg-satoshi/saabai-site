"use client";

import { useState } from "react";
import { PortalShell, type NavGroup, type NavItem } from "../components/PortalShell";
import { CreditPlanRail } from "../credit/CreditPlanRail";
import {
  CREDIT_PREVIEW_STATES,
  previewCreditModel,
  type CreditPreviewState,
} from "../../../lib/blueprint-credit";

const LABELS: Record<CreditPreviewState, string> = {
  fresh: "Fresh",
  mid: "Mid",
  urgent: "7 days or less",
  last: "Last day",
  hidden: "Hidden",
};

function BlueprintIcon() {
  return (
    <span className="pi bp">
      <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3h7l5 5v13H7z" />
        <path d="M14 3v5h5M10 13h6M10 17h4" />
      </svg>
    </span>
  );
}

function WebsiteIcon() {
  return (
    <span className="pi ws">
      <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3L2 8l10 5 10-5z" />
        <path d="M2 13l10 5 10-5" />
      </svg>
    </span>
  );
}

const BLUEPRINT_NAV: NavGroup[] = [
  { items: [{ label: "Overview", id: "overview", icon: "grid" }] },
  { label: "Your products", items: [{ label: "Blueprint", id: "blueprint", icon: "doc" }] },
  {
    label: "Account",
    items: [
      { label: "Invoices", id: "invoices", icon: "card" },
      { label: "Requests", id: "requests", icon: "inbox" },
      { label: "Account", id: "account", icon: "gear" },
    ],
  },
];

const HIDDEN_NAV: NavGroup[] = [
  { items: [{ label: "Overview", id: "overview", icon: "grid" }] },
  { label: "Your products", items: [{ label: "Website build", id: "projects", icon: "layers" }] },
  {
    label: "Account",
    items: [
      { label: "Invoices", id: "invoices", icon: "card" },
      { label: "Requests", id: "requests", icon: "inbox" },
      { label: "Account", id: "account", icon: "gear" },
    ],
  },
];

const BLUEPRINT_BOTTOM: NavItem[] = [
  { label: "Home", id: "overview", icon: "grid" },
  { label: "Blueprint", id: "blueprint", icon: "doc" },
  { label: "Invoices", id: "invoices", icon: "card" },
  { label: "Requests", id: "requests", icon: "inbox" },
];

const HIDDEN_BOTTOM: NavItem[] = [
  { label: "Home", id: "overview", icon: "grid" },
  { label: "Website", id: "projects", icon: "layers" },
  { label: "Invoices", id: "invoices", icon: "card" },
  { label: "Requests", id: "requests", icon: "inbox" },
];

export function CreditPreview({ state, chrome }: { state: CreditPreviewState; chrome: boolean }) {
  const [page, setPage] = useState("overview");
  const hidden = state === "hidden";
  const model = previewCreditModel(state);

  return (
    <div data-credit-preview={state}>
      {chrome ? (
        <div className="credit-preview-bar">
          <p>Demo only. Coastline Physio is sample data. Nothing here is saved, and this page does not contact leads.</p>
          <nav aria-label="Credit states">
            {CREDIT_PREVIEW_STATES.map((item) => (
              <a key={item} href={`/client-portal/credit-preview?state=${item}`} aria-current={item === state ? "page" : undefined}>
                {LABELS[item]}
              </a>
            ))}
          </nav>
        </div>
      ) : null}
      <PortalShell
        business="Coastline Physio"
        personName="Mia Turner"
        role="Owner"
        navGroups={hidden ? HIDDEN_NAV : BLUEPRINT_NAV}
        bottomNav={hidden ? HIDDEN_BOTTOM : BLUEPRINT_BOTTOM}
        active={page}
        onNavigate={setPage}
      >
        {page !== "overview" ? (
          <div className="card">
            <div className="empty">
              <h3>Preview stays on Overview</h3>
              <p>This demo only renders the credit rail. Open Overview to see the sample states.</p>
              <button type="button" className="btn" style={{ marginTop: 12 }} onClick={() => setPage("overview")}>
                Back to Overview
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="ph">
              <div>
                <h1>Welcome back, Mia</h1>
                <div className="sub">Coastline Physio · 1 product with Saabai</div>
              </div>
              <a className="btn dt" href="mailto:hello@saabai.ai">Book a call with Shane</a>
            </div>
            <div className={model ? "ov-with-credit" : undefined} data-credit-rail={model ? "shown" : "hidden"}>
              <div>
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="hd">
                    <div>
                      <h2>Your products</h2>
                      <div className="sub">1 product</div>
                    </div>
                    <a className="btn sm" href="mailto:hello@saabai.ai?subject=Add%20a%20product">Add a product</a>
                  </div>
                  {hidden ? (
                    <div className="prod">
                      <WebsiteIcon />
                      <div className="nm">
                        Website
                        <small>coastlinephysio.example · Live</small>
                      </div>
                      <span className="badge b-ok">Live</span>
                      <div className="st">Hosted with Saabai</div>
                      <button type="button" className="op" onClick={() => setPage("projects")}>Open →</button>
                    </div>
                  ) : (
                    <div className="prod">
                      <BlueprintIcon />
                      <div className="nm">
                        Pro Blueprint
                        <small>Delivered 26 Oct 2026</small>
                      </div>
                      <span className="badge b-ok">Delivered</span>
                      <div className="st">3 opportunities in your report</div>
                      <button type="button" className="op" onClick={() => setPage("blueprint")}>Open →</button>
                    </div>
                  )}
                </div>
                {hidden ? null : (
                  <div className="card">
                    <div className="hd">
                      <div>
                        <h2>Your Blueprint</h2>
                        <div className="sub">Top opportunities, ranked</div>
                      </div>
                      <button type="button" className="op" onClick={() => setPage("blueprint")}>Open Blueprint →</button>
                    </div>
                    <div className="bd" style={{ paddingTop: 8, paddingBottom: 8 }}>
                      <div className="opp"><span className="n">1</span><div>Answer website enquiries after hours<div className="muted" style={{ fontSize: 12.5 }}>Estimated impact: High</div></div></div>
                      <div className="opp"><span className="n">2</span><div>Handle calls while you&apos;re with a client<div className="muted" style={{ fontSize: 12.5 }}>Estimated impact: High</div></div></div>
                      <div className="opp"><span className="n">3</span><div>Rebuild the site around online bookings<div className="muted" style={{ fontSize: 12.5 }}>Estimated impact: Medium</div></div></div>
                    </div>
                  </div>
                )}
              </div>
              {model ? <CreditPlanRail model={model} blueprintHref="#credit-plan" frozen /> : null}
            </div>
          </>
        )}
      </PortalShell>
    </div>
  );
}
