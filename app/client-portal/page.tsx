"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import "./portal-auth.css";
import { PortalShell } from "./components/PortalShell";
import { LexWorkspace } from "./LexWorkspace";
import { RequestsPanel } from "./requests/RequestsPanel";
import { UpgradesPanel } from "./upgrades/UpgradesPanel";
import { ChatbotSettingsPanel } from "./chatbot/ChatbotSettingsPanel";
import { portalPageFromSearchParam } from "../../lib/portal-pages";
import { BLUEPRINT_PAGE_HREF, type BlueprintCreditModel } from "../../lib/blueprint-credit";
import { CreditPlanRail } from "./credit/CreditPlanRail";
import { OnboardingCard } from "./onboarding/OnboardingCard";

type AuthView = "checking" | "login" | "sent" | "request" | "request-sent" | "code" | "error" | "app";
type PageId =
  | "overview"
  | "projects"
  | "blueprint"
  | "lex-agent"
  | "leads"
  | "review-queue"
  | "invoices"
  | "requests"
  | "upgrades"
  | "chatbot"
  | "account"
  | "manage-agent";

type PortalProduct = {
  id: string;
  kind: "lex" | "blueprint" | "website" | "care";
  name: string;
  detail: string;
  status: string;
  statusTone: "ok" | "info" | "warn" | "n";
  stat: string;
  openPage: string;
  icon: "lx" | "bp" | "ws" | "cr";
};

type Workspace = {
  email: string;
  name: string;
  business: string;
  role: string;
  clientId: string;
  agentName: string | null;
  plan: string | null;
  modules: {
    lex: boolean;
    blueprint: boolean;
    projects: boolean;
    care?: boolean;
    invoices: boolean;
    requests: boolean;
    account: boolean;
  };
  products: PortalProduct[];
  site: { id: string; name: string; url: string; status: string; domains: string[] } | null;
  care: { amountCents: number; status: string; description: string } | null;
  blueprints: { id: string; tier: string; status: string; createdAt: string; businessName: string; score: number | null }[];
  requests: { id: string; title: string; status: string; createdAt: string; updatedAt: string }[];
  openRequestCount: number;
  impersonating?: { name: string; email: string; clientId: string; returnTo: string; expiresAt: string; readOnly: true } | null;
  /** Null unless this account has a delivered Blueprint credit still on screen. */
  credit?: BlueprintCreditModel | null;
};

const PRODUCT_ICON_PATHS: Record<string, React.ReactNode> = {
  lx: <path d="M12 3v18M5 21h14M5 7h14M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0z" />,
  ws: <><path d="M12 3L2 8l10 5 10-5z" /><path d="M2 13l10 5 10-5" /></>,
  bp: <><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h4" /></>,
  cr: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></>,
};

function ProductIcon({ kind }: { kind: string }) {
  return (
    <span className={`pi ${kind}`}>
      <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">{PRODUCT_ICON_PATHS[kind] || PRODUCT_ICON_PATHS.bp}</svg>
    </span>
  );
}

function badgeClass(tone: string) {
  if (tone === "ok") return "badge b-ok";
  if (tone === "info") return "badge b-info";
  if (tone === "warn") return "badge b-warn";
  return "badge b-n";
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <div className="empty">
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </div>
  );
}

function AuthArt() {
  return (
    <aside className="art">
      <img src="/brand/saabai-logo.png" alt="Saabai" />
      <div>
        <div className="eyb">Saabai Client Portal</div>
        <h2>
          Your projects, invoices and Blueprint <span className="grad">in one place</span>
        </h2>
        <p className="lede">Sign in to follow your build, review your AI Blueprint and get answers from the Saabai team.</p>
        <div className="feat">
          <div>
            <b>
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>
              Project progress
            </b>
            <span>Live status of every build</span>
          </div>
          <div>
            <b>
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></svg>
              Invoices
            </b>
            <span>Download, pay and see history</span>
          </div>
          <div>
            <b>
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-5A8 8 0 1121 12z" /></svg>
              Requests
            </b>
            <span>Ask for changes, track replies</span>
          </div>
          <div>
            <b>
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h4" /></svg>
              Your Blueprint
            </b>
            <span>Plan, priorities and savings</span>
          </div>
        </div>
      </div>
      <div className="legal">
        <span>© 2026 Saabai Pty Ltd · ABN 44 703 735 264 · ACN 703 735 264</span>
        <a href="/privacy" style={{ color: "inherit" }}>Privacy</a>
        <a href="/terms" style={{ color: "inherit" }}>Terms</a>
        <span>Support: hello@saabai.ai</span>
      </div>
    </aside>
  );
}

function ClientPortalInner() {
  const searchParams = useSearchParams();
  const [authView, setAuthView] = useState<AuthView>("checking");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [page, setPage] = useState<PageId>(() => portalPageFromSearchParam(searchParams.get("page")) as PageId);
  const [reqForm, setReqForm] = useState({ name: "", company: "", email: "", about: "My Saabai Blueprint", note: "" });

  async function loadWorkspace() {
    const res = await fetch("/api/portal/workspace", { credentials: "include" });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.authenticated) return false;
    setWorkspace({ ...data, products: data.products || [], site: data.site || null, care: data.care || null });
    return true;
  }

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) {
      setAuthView("error");
      setError(
        err === "invalid_token"
          ? "That sign-in link is invalid or has already been used. Request a new one."
          : err === "missing_token"
            ? "That sign-in link is incomplete. Request a new one from the sign-in page."
            : "Something went wrong signing you in. Please try again.",
      );
      return;
    }
    loadWorkspace()
      .then((ok) => setAuthView(ok ? "app" : "login"))
      .catch(() => setAuthView("login"));
  }, [searchParams]);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirect: "/client-portal" }),
      });
      setAuthView("sent");
    } catch {
      setAuthView("sent");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "That code did not work. Try again or request a new link.");
        return;
      }
      const ok = await loadWorkspace();
      setAuthView(ok ? "app" : "error");
      if (!ok) setError("Signed in, but we could not load your workspace. Refresh and try again.");
    } catch {
      setError("That code did not work. Try again or request a new link.");
    } finally {
      setBusy(false);
    }
  }

  async function sendAccessRequest(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Please fill in the required fields.");
        return;
      }
      setAuthView("request-sent");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/portal/me", { method: "DELETE" }).catch(() => {});
    setWorkspace(null);
    setAuthView("login");
  }

  const { navGroups, bottomNav } = useMemo(() => {
    if (!workspace) return { navGroups: [], bottomNav: [] as { label: string; id: string; icon: string }[] };
    const m = workspace.modules;
    const hasWebsite = !!(workspace.site || m.care || m.projects);
    const productItems: { label: string; id: PageId; icon: string; count?: number; urgent?: boolean }[] = [];
    if (m.lex) {
      productItems.push({ label: "Lex agent", id: "lex-agent", icon: "scale" });
      productItems.push({ label: "Leads", id: "leads", icon: "users" });
      productItems.push({ label: "Review queue", id: "review-queue", icon: "list" });
    }
    if (m.projects) productItems.push({ label: "Website build", id: "projects", icon: "layers" });
    if (m.care) productItems.push({ label: "Care plan", id: "projects", icon: "shield" });
    if (m.blueprint) productItems.push({ label: "Blueprint", id: "blueprint", icon: "doc" });

    const accountItems = [
      { label: "Invoices", id: "invoices" as PageId, icon: "card" },
      { label: "Requests", id: "requests" as PageId, icon: "inbox", count: workspace.openRequestCount || undefined },
      ...(hasWebsite ? [{ label: "Upgrades", id: "upgrades" as PageId, icon: "bolt" }, { label: "Chatbot", id: "chatbot" as PageId, icon: "chat" }] : []),
      { label: "Account", id: "account" as PageId, icon: "gear" },
    ];

    const navGroups = [
      { items: [{ label: "Overview", id: "overview" as PageId, icon: "grid" }] },
      ...(productItems.length ? [{ label: "Your products", items: productItems }] : []),
      { label: "Account", items: accountItems },
    ];

    // Mobile bar adapts per client mix (design 10g / 10b / 10)
    let bottomNav: { label: string; id: string; icon: string }[];
    if (m.lex && m.projects) {
      bottomNav = [
        { label: "Home", id: "overview", icon: "grid" },
        { label: "Lex", id: "lex-agent", icon: "scale" },
        { label: "Website", id: "projects", icon: "layers" },
        { label: "Invoices", id: "invoices", icon: "card" },
      ];
    } else if (m.lex) {
      bottomNav = [
        { label: "Home", id: "overview", icon: "grid" },
        { label: "Leads", id: "leads", icon: "users" },
        { label: "Invoices", id: "invoices", icon: "card" },
        { label: "Requests", id: "requests", icon: "inbox" },
      ];
    } else if (hasWebsite) {
      bottomNav = [
        { label: "Home", id: "overview", icon: "grid" },
        { label: "Upgrades", id: "upgrades", icon: "bolt" },
        { label: "Invoices", id: "invoices", icon: "card" },
        { label: "Requests", id: "requests", icon: "inbox" },
      ];
    } else {
      bottomNav = [
        { label: "Home", id: "overview", icon: "grid" },
        { label: m.projects ? "Projects" : m.blueprint ? "Blueprint" : "Home", id: m.projects ? "projects" : m.blueprint ? "blueprint" : "overview", icon: m.projects ? "layers" : "doc" },
        { label: "Invoices", id: "invoices", icon: "card" },
        { label: "Requests", id: "requests", icon: "inbox" },
      ];
    }
    return { navGroups, bottomNav };
  }, [workspace]);

  if (authView === "checking") {
    return (
      <div className="portal-auth" style={{ display: "grid", placeItems: "center", color: "#9aa0c8" }}>
        Checking your session…
      </div>
    );
  }

  if (authView !== "app") {
    return (
      <div className="portal-auth">
        <AuthArt />
        <div className="panel">
          <div className="box">
            <div className="mlogo">
              <img src="/brand/saabai-logo.png" alt="Saabai" />
            </div>

            {authView === "login" && (
              <>
                <div className="tagl">Client Portal</div>
                <h1>Sign in</h1>
                <p className="lead">Enter your work email and we will send you a secure sign-in link. You can also use the 6-digit code from the email.</p>
                <form className="f" onSubmit={sendLink}>
                  <label htmlFor="email">Work email</label>
                  <input id="email" className="fi-real" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com.au" />
                  <button type="submit" className="tbtn" disabled={busy}>
                    {busy ? "Sending…" : "Email me a sign in link"}
                  </button>
                </form>
                <p className="alt">
                  Have a code?{" "}
                  <a href="#" onClick={(e) => { e.preventDefault(); setAuthView("code"); }}>
                    Enter 6-digit code
                  </a>
                </p>
                <p className="alt">
                  New to Saabai?{" "}
                  <a href="#" onClick={(e) => { e.preventDefault(); setAuthView("request"); setReqForm((f) => ({ ...f, email })); }}>
                    Request access
                  </a>
                </p>
                <div className="sec">
                  <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
                  <span>Passwordless sign in. Links expire after 15 minutes and work once. We never say whether an email has an account.</span>
                </div>
              </>
            )}

            {authView === "sent" && (
              <>
                <div className="icon">
                  <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
                </div>
                <div className="tagl">Check your email</div>
                <h1>Your sign in link is on its way</h1>
                <p className="lead">
                  If <b style={{ color: "#fff", fontWeight: 500 }}>{email}</b> has a portal account, a link and a 6-digit code will arrive in a minute or two.
                </p>
                <div className="note ok" style={{ marginTop: 22 }}>
                  <div>
                    <b>Link expires in 15 minutes</b>
                    It works once. Check spam or promotions if you cannot see it.
                  </div>
                </div>
                <button type="button" className="obtn" style={{ marginTop: 22 }} onClick={() => setAuthView("code")}>
                  Enter 6-digit code
                </button>
                <button type="button" className="obtn" onClick={() => setAuthView("login")}>
                  Use a different email
                </button>
                <p className="alt">
                  No account yet?{" "}
                  <a href="#" onClick={(e) => { e.preventDefault(); setAuthView("request"); }}>
                    Request access
                  </a>
                </p>
              </>
            )}

            {authView === "code" && (
              <>
                <div className="tagl">Client Portal</div>
                <h1>Enter your code</h1>
                <p className="lead">Type the 6-digit code from your email. Or open the sign-in link instead.</p>
                {error && <div className="note bad" style={{ marginTop: 14 }} role="alert">{error}</div>}
                <form className="f" onSubmit={verifyCode}>
                  <label htmlFor="code-email">Work email</label>
                  <input id="code-email" className="fi-real" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  <label htmlFor="code" style={{ marginTop: 14 }}>
                    6-digit code
                  </label>
                  <input
                    id="code"
                    className="fi-real"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    style={{ letterSpacing: 6, textAlign: "center", fontSize: 20 }}
                  />
                  <button type="submit" className="tbtn" disabled={busy || code.length !== 6}>
                    {busy ? "Checking…" : "Verify and continue"}
                  </button>
                </form>
                <button type="button" className="obtn" onClick={() => setAuthView("login")}>
                  Back to sign in
                </button>
              </>
            )}

            {authView === "request" && (
              <>
                <div className="tagl">Client Portal</div>
                <h1>Request access</h1>
                <p className="lead">Tell us who you are. We usually reply within 1 business day to confirm your account.</p>
                {error && <div className="note bad" style={{ marginTop: 14 }} role="alert">{error}</div>}
                <form className="f" onSubmit={sendAccessRequest}>
                  <label htmlFor="rname">Full name</label>
                  <input id="rname" className="fi-real" required value={reqForm.name} onChange={(e) => setReqForm({ ...reqForm, name: e.target.value })} />
                  <label htmlFor="rco" style={{ marginTop: 12 }}>Business</label>
                  <input id="rco" className="fi-real" value={reqForm.company} onChange={(e) => setReqForm({ ...reqForm, company: e.target.value })} />
                  <label htmlFor="remail" style={{ marginTop: 12 }}>Work email</label>
                  <input id="remail" className="fi-real" type="email" required value={reqForm.email} onChange={(e) => setReqForm({ ...reqForm, email: e.target.value })} />
                  <label htmlFor="rabout" style={{ marginTop: 12 }}>What is it about?</label>
                  <select id="rabout" className="fi-real" value={reqForm.about} onChange={(e) => setReqForm({ ...reqForm, about: e.target.value })}>
                    <option>My Saabai Blueprint</option>
                    <option>Website or care plan</option>
                    <option>Lex agent</option>
                    <option>Billing or invoices</option>
                    <option>Something else</option>
                  </select>
                  <label htmlFor="rnote" style={{ marginTop: 12 }}>
                    Anything we should know? <span style={{ color: "#8f95c0", fontWeight: 400 }}>Optional</span>
                  </label>
                  <textarea id="rnote" className="fi-real" value={reqForm.note} onChange={(e) => setReqForm({ ...reqForm, note: e.target.value })} />
                  <button type="submit" className="tbtn" disabled={busy}>
                    {busy ? "Sending…" : "Send request"}
                  </button>
                </form>
                <p className="alt">
                  Already have access?{" "}
                  <a href="#" onClick={(e) => { e.preventDefault(); setAuthView("login"); }}>
                    Sign in
                  </a>
                </p>
              </>
            )}

            {authView === "request-sent" && (
              <>
                <div className="icon">
                  <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                </div>
                <div className="tagl">Request sent</div>
                <h1>Thanks. We have your request.</h1>
                <p className="lead">We usually reply within 1 business day to confirm your access. If your email matches an order, access may be ready sooner.</p>
                <button type="button" className="tbtn" onClick={() => setAuthView("login")}>
                  Back to sign in
                </button>
              </>
            )}

            {authView === "error" && (
              <>
                <div className="note bad" role="alert">
                  <div>
                    <b>Could not sign you in</b>
                    {error || "Please request a new sign-in link."}
                  </div>
                </div>
                <button type="button" className="tbtn" onClick={() => { setError(null); setAuthView("login"); }}>
                  Request a new link
                </button>
              </>
            )}
          </div>
          <p className="foot2">saabai.ai/client-portal</p>
        </div>
      </div>
    );
  }

  if (!workspace) return null;

  const firstName = workspace.name.split(/\s+/)[0] || "there";
  const canPay = workspace.role === "Owner" || workspace.role === "Billing";

  async function exitImpersonation() {
    const res = await fetch("/api/admin/impersonate", { method: "DELETE", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    window.location.href = data.redirect || "/saabai-admin/customers";
  }

  return (
    <PortalShell
      business={workspace.business || "Your business"}
      personName={workspace.name || workspace.email}
      role={workspace.role}
      navGroups={navGroups}
      bottomNav={bottomNav}
      active={page === "manage-agent" ? "lex-agent" : page}
      onNavigate={(id) => setPage(id as PageId)}
      title={page === "manage-agent" ? "Manage agent" : undefined}
      impersonating={workspace.impersonating || null}
      onExitImpersonation={exitImpersonation}
    >
      {page === "overview" && (
        <>
          <OnboardingCard />
          <div className="ph">
            <div>
              <h1>Welcome back, {firstName}</h1>
              <div className="sub">
                {workspace.business || workspace.email}
                {workspace.products?.length
                  ? ` · ${workspace.products.length} product${workspace.products.length === 1 ? "" : "s"} with Saabai`
                  : workspace.modules.lex && workspace.agentName
                    ? ` · Lex agent "${workspace.agentName}"`
                    : ""}
              </div>
            </div>
            <a className="btn dt" href="mailto:hello@saabai.ai">Book a call with Shane</a>
          </div>

          <div className={workspace.credit ? "ov-with-credit" : undefined}>
          <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="hd">
              <div>
                <h2>Your products</h2>
                <div className="sub">
                  {(workspace.products?.length || 0) === 0
                    ? "Purchases with Saabai will appear here"
                    : workspace.products.length === 1
                      ? "1 product"
                      : `${workspace.products.length} purchases with Saabai`}
                </div>
              </div>
              <a className="btn sm" href="mailto:hello@saabai.ai?subject=Add%20a%20product">
                Add a product
              </a>
            </div>
            {(workspace.products?.length || 0) === 0 ? (
              <Empty title="No products linked yet" body="When you buy Lex, a Blueprint or a website build, each purchase will show as a row here." />
            ) : (
              workspace.products.map((prod) => (
                <div className="prod" key={prod.id}>
                  <ProductIcon kind={prod.icon} />
                  <div className="nm">
                    {prod.name}
                    <small>{prod.detail}</small>
                  </div>
                  <span className={badgeClass(prod.statusTone)}>{prod.status}</span>
                  <div className="st">{prod.stat}</div>
                  <button type="button" className="op" onClick={() => setPage(prod.openPage as PageId)}>
                    Open →
                  </button>
                </div>
              ))
            )}
          </div>

          {workspace.modules.lex && (
            <>
              <div className="sec-h">
                <h2>Lex agent</h2>
                <button type="button" className="op" onClick={() => setPage("manage-agent")}>
                  Manage agent →
                </button>
              </div>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="hd">
                  <div>
                    <h2>{workspace.agentName || "Lex"}</h2>
                    <div className="sub">{workspace.plan || "Plan"} · Active on your site</div>
                  </div>
                  <span className="badge b-ok">Active</span>
                </div>
                <div className="bd">
                  <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--n-600)" }}>
                    Customise, test, embed, review leads and the review queue from Manage agent. Live stats stay on that page so this overview never shows placeholder numbers.
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className="btn pri sm" onClick={() => setPage("manage-agent")}>
                      Manage agent
                    </button>
                    <button type="button" className="btn sm" onClick={() => setPage("leads")}>
                      Leads
                    </button>
                    <button type="button" className="btn sm" onClick={() => setPage("review-queue")}>
                      Review queue
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {workspace.modules.projects && workspace.site && (
            <>
              <div className="sec-h">
                <h2>Website</h2>
                <button type="button" className="op" onClick={() => setPage("projects")}>
                  Open site →
                </button>
              </div>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="hd">
                  <div>
                    <h2>{workspace.site.name}</h2>
                    <div className="sub">{workspace.site.domains?.[0] || workspace.site.url}</div>
                  </div>
                  <span className={`badge ${workspace.site.status === "live" ? "b-ok" : "b-info"}`}>
                    {workspace.site.status === "live" ? "Live" : workspace.site.status}
                  </span>
                </div>
                <div className="bd">
                  <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--n-600)" }}>
                    Hosted with Saabai{workspace.care ? " on a monthly care plan" : ""}.
                  </p>
                  <a className="btn pri sm" href={workspace.site.url} target="_blank" rel="noopener noreferrer">
                    Open website
                  </a>
                </div>
              </div>
            </>
          )}

          {workspace.modules.blueprint && (
            <>
              <div className="sec-h">
                <h2>Your Blueprint</h2>
                <button type="button" className="op" onClick={() => setPage("blueprint")}>
                  Open report →
                </button>
              </div>
              <div className="g2">
                {workspace.blueprints.slice(0, 2).map((b) => (
                  <div className="card" key={b.id}>
                    <div className="hd">
                      <div>
                        <h2>{b.businessName || "Blueprint"}</h2>
                        <div className="sub">{b.tier} · {b.status}</div>
                      </div>
                      <span className="tag bp">{b.tier}</span>
                    </div>
                    <div className="bd">
                      <p style={{ margin: "0 0 12px", fontSize: 14 }}>
                        {b.score != null ? `${b.score} ranked opportunities in your report.` : "Open the full opportunities table."}
                      </p>
                      <button type="button" className="btn sm" onClick={() => setPage("blueprint")}>
                        Open full report
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!workspace.modules.lex && !workspace.modules.blueprint && !workspace.modules.projects && (
            <Empty title="Nothing to show yet" body="Once a Lex agent, Blueprint or website build is linked to this email, sections will appear below Your products." />
          )}

          <div className="g2" style={{ marginTop: 16 }}>
            <div className="card">
              <div className="hd">
                <h2>Invoices</h2>
                {canPay && <span className="muted" style={{ fontSize: 12.5 }}>Owner and Billing can pay</span>}
              </div>
              {workspace.modules.invoices ? (
                <div className="bd"><p className="muted">Your invoices will list here.</p></div>
              ) : (
                <Empty title="No invoices yet" body="Paid orders and care plan invoices will show here when linked to your account." />
              )}
            </div>
            <div className="card">
              <div className="hd">
                <h2>Open requests</h2>
                <button type="button" className="btn sm" onClick={() => setPage("requests")}>
                  New request
                </button>
              </div>
              {workspace.requests.length === 0 ? (
                <Empty title="No requests yet" body="Ask for a change, question or idea. We reply in the portal." />
              ) : (
                <div className="bd" style={{ paddingTop: 4, paddingBottom: 4 }}>
                  {workspace.requests.slice(0, 5).map((r) => (
                    <div className="row" key={r.id}>
                      <div>
                        <b style={{ fontWeight: 500 }}>{r.title}</b>
                        <div className="muted" style={{ fontSize: 12.5 }}>
                          {r.id.slice(0, 12)} · {new Date(r.updatedAt || r.createdAt).toLocaleDateString("en-AU")}
                        </div>
                      </div>
                      <span className={`badge ${r.status === "done" ? "b-ok" : r.status === "in_progress" ? "b-info" : "b-n"}`}>
                        {r.status === "in_progress" ? "In progress" : r.status === "done" ? "Done" : "Received"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>
          {workspace.credit ? <CreditPlanRail model={workspace.credit} blueprintHref={BLUEPRINT_PAGE_HREF} /> : null}
          </div>
        </>
      )}

{page === "blueprint" && (
        <>
          <div className="ph">
            <div>
              <h1>Blueprint</h1>
              <div className="sub">Full report from your Saabai engagement</div>
            </div>
            <button type="button" className="btn pri" onClick={() => setPage("requests")}>
              Get a build quote
            </button>
          </div>
          {workspace.blueprints.length === 0 ? (
            <Empty title="No Blueprint on file" body="Purchase a Blueprint to see your full opportunities table here." />
          ) : (
            <div className="card">
              <div className="hd">
                <h2>Ranked opportunities</h2>
                <span className="muted" style={{ fontSize: 12.5 }}>From your delivered report</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Blueprint</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th className="r">Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.blueprints.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <b style={{ fontWeight: 500 }}>{b.businessName || "Blueprint"}</b>
                          <div className="muted" style={{ fontSize: 12 }}>{b.tier}</div>
                        </td>
                        <td>
                          <span className="badge b-info">{b.status}</span>
                        </td>
                        <td className="muted">{new Date(b.createdAt).toLocaleDateString("en-AU")}</td>
                        <td className="r num">{b.score ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bd">
                <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
                  Need the build next? Use Get a build quote to create a request for the Saabai team.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {page === "projects" && (
        <>
          <div className="ph"><div><h1>Website</h1><div className="sub">Hosted site and care plan</div></div></div>
          {workspace.site ? (
            <div className="card">
              <div className="hd">
                <div>
                  <h2>{workspace.site.name}</h2>
                  <div className="sub">{workspace.site.domains?.[0] || workspace.site.url}</div>
                </div>
                <span className={`badge ${workspace.site.status === "live" ? "b-ok" : "b-info"}`}>
                  {workspace.site.status === "live" ? "Live" : workspace.site.status}
                </span>
              </div>
              <div className="bd">
                <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--n-600)" }}>
                  Your site is hosted with Saabai. Open it any time, or create a request for a change.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <a className="btn pri sm" href={workspace.site.url} target="_blank" rel="noopener noreferrer">
                    Open website
                  </a>
                  <button type="button" className="btn sm" onClick={() => setPage("requests")}>
                    Request a change
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Empty title="No project data yet" body="When your build is underway, milestones and staging links will show here." />
          )}
          {workspace.care && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="hd">
                <div>
                  <h2>Care plan</h2>
                  <div className="sub">{workspace.care.description}</div>
                </div>
                <span className="badge b-ok">Active</span>
              </div>
              <div className="bd">
                <p style={{ margin: 0, fontSize: 14, color: "var(--n-600)" }}>
                  {(workspace.care.amountCents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD" })}/mo for hosting and updates.
                  Owner and Billing can review invoices from the Invoices section.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {(page === "lex-agent" || page === "leads" || page === "review-queue" || page === "manage-agent") && workspace.modules.lex && (
        <>
          {page === "lex-agent" && (
            <div className="ph">
              <div>
                <h1>Lex agent</h1>
                <div className="sub">Quick view. Full settings live under Manage agent.</div>
              </div>
              <button type="button" className="btn pri" onClick={() => setPage("manage-agent")}>
                Manage agent
              </button>
            </div>
          )}
          {(page === "manage-agent" || page === "leads" || page === "review-queue") && (
            <div style={{ margin: page === "manage-agent" ? "-8px -8px 0" : undefined }}>
              <LexWorkspace embedded />
            </div>
          )}
          {page === "lex-agent" && (
            <div className="card">
              <div className="bd">
                <p style={{ margin: 0, fontSize: 14, color: "var(--n-600)" }}>
                  Agent <b>{workspace.agentName || "Lex"}</b> on your Lex plan. Use Manage agent for customise, test, embed, review queue and leads.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {page === "invoices" && (
        <>
          <div className="ph">
            <div>
              <h1>Invoices</h1>
              <div className="sub">{canPay ? "You can pay open invoices from this account." : "Ask an Owner or Billing user to pay invoices."}</div>
            </div>
          </div>
          {workspace.care ? (
            <div className="card">
              <div className="bd">
                <p style={{ margin: "0 0 8px", fontSize: 14 }}>
                  Care plan active at {(workspace.care.amountCents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD" })}/mo.
                </p>
                <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
                  Individual invoice pay links will list here when Stripe invoice history is linked in the portal. Owner and Billing can pay.
                </p>
              </div>
            </div>
          ) : (
            <Empty title="No invoices linked yet" body="When Stripe invoices are connected to your portal account, they will list here with pay links for Owner and Billing roles." />
          )}
        </>
      )}

      {page === "requests" && (
        <RequestsPanel />
      )}

      {page === "upgrades" && <UpgradesPanel readOnly={!!workspace.impersonating} />}

      {page === "chatbot" && <ChatbotSettingsPanel readOnly={!!workspace.impersonating} />}

      {page === "account" && (
        <>
          <div className="ph">
            <div>
              <h1>Account</h1>
              <div className="sub">Your portal profile</div>
            </div>
          </div>
          <div className="card">
            <div className="bd">
              <div className="row" style={{ paddingTop: 0 }}>
                <span>Name</span>
                <span>{workspace.name || "-"}</span>
              </div>
              <div className="row">
                <span>Email</span>
                <span>{workspace.email}</span>
              </div>
              <div className="row">
                <span>Business</span>
                <span>{workspace.business || "-"}</span>
              </div>
              <div className="row">
                <span>Role</span>
                <span>{workspace.role}</span>
              </div>
              <button type="button" className="btn" style={{ marginTop: 16 }} onClick={signOut}>
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </PortalShell>
  );
}

export default function ClientPortalPage() {
  return (
    <Suspense fallback={<div className="portal-auth" style={{ display: "grid", placeItems: "center", color: "#9aa0c8" }}>Loading…</div>}>
      <ClientPortalInner />
    </Suspense>
  );
}
