"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import "./portal-auth.css";
import { PortalShell } from "./components/PortalShell";
import { LexWorkspace } from "./LexWorkspace";

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
  | "account"
  | "manage-agent";

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
    invoices: boolean;
    requests: boolean;
    account: boolean;
  };
  blueprints: { id: string; tier: string; status: string; createdAt: string; businessName: string; score: number | null }[];
  requests: { id: string; title: string; status: string; createdAt: string; updatedAt: string }[];
  openRequestCount: number;
};

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
        <span>© 2026 Saabai</span>
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
  const [page, setPage] = useState<PageId>("overview");
  const [reqForm, setReqForm] = useState({ name: "", company: "", email: "", about: "My Saabai Blueprint", note: "" });

  async function loadWorkspace() {
    const res = await fetch("/api/portal/workspace", { credentials: "include" });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.authenticated) return false;
    setWorkspace(data);
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

  const nav = useMemo(() => {
    if (!workspace) return [];
    const m = workspace.modules;
    const items: { label: string; id: PageId; icon: string; count?: number; urgent?: boolean }[] = [
      { label: "Overview", id: "overview", icon: "grid" },
    ];
    if (m.projects) items.push({ label: "Projects", id: "projects", icon: "layers" });
    if (m.blueprint) items.push({ label: "Blueprint", id: "blueprint", icon: "doc" });
    if (m.lex) {
      items.push({ label: "Lex agent", id: "lex-agent", icon: "scale" });
      items.push({ label: "Leads", id: "leads", icon: "users" });
      items.push({ label: "Review queue", id: "review-queue", icon: "list" });
    }
    items.push({ label: "Invoices", id: "invoices", icon: "card" });
    items.push({ label: "Requests", id: "requests", icon: "inbox", count: workspace.openRequestCount || undefined });
    items.push({ label: "Account", id: "account", icon: "gear" });
    return items;
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
                <p className="lead">Tell us who you are. We will confirm your account within one business day.</p>
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
                <p className="lead">We will confirm your access within one business day. If your email matches an order, access may be ready sooner.</p>
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

  return (
    <PortalShell
      business={workspace.business || "Your business"}
      personName={workspace.name || workspace.email}
      role={workspace.role}
      nav={nav}
      active={page === "manage-agent" ? "lex-agent" : page}
      onNavigate={(id) => setPage(id as PageId)}
      title={page === "manage-agent" ? "Manage agent" : undefined}
    >
      {page === "overview" && (
        <>
          <div className="ph">
            <div>
              <h1>Welcome back, {firstName}</h1>
              <div className="sub">
                {workspace.business || workspace.email}
                {workspace.modules.lex && workspace.agentName ? ` · Lex agent "${workspace.agentName}"` : ""}
                {workspace.modules.blueprint ? ` · ${workspace.blueprints.length} Blueprint${workspace.blueprints.length === 1 ? "" : "s"}` : ""}
              </div>
            </div>
            <a className="btn dt" href="mailto:hello@saabai.ai">Book a call with Shane</a>
          </div>

          <div className="qa">
            <button type="button" onClick={() => setPage("requests")} style={{ all: "unset", cursor: "pointer" }}>
              <div>
                <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
                <span>
                  New request<small>Change, question or idea</small>
                </span>
              </div>
            </button>
            {workspace.modules.invoices ? (
              <button type="button" onClick={() => setPage("invoices")} style={{ all: "unset", cursor: "pointer" }}>
                <div>
                  <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
                  <span>
                    Pay invoice<small>Open billing</small>
                  </span>
                </div>
              </button>
            ) : (
              <div>
                <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
                <span>
                  Invoices<small>None due right now</small>
                </span>
              </div>
            )}
            {workspace.modules.blueprint && (
              <button type="button" onClick={() => setPage("blueprint")} style={{ all: "unset", cursor: "pointer" }}>
                <div>
                  <svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></svg>
                  <span>
                    Open Blueprint<small>{workspace.blueprints[0]?.tier || "Report"}</small>
                  </span>
                </div>
              </button>
            )}
            {workspace.modules.lex && (
              <button type="button" onClick={() => setPage("manage-agent")} style={{ all: "unset", cursor: "pointer" }}>
                <div>
                  <svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="12" rx="3" /><path d="M12 3v4" /></svg>
                  <span>
                    Manage agent<small>Settings and test</small>
                  </span>
                </div>
              </button>
            )}
          </div>

          <div className="g2">
            {workspace.modules.lex ? (
              <div className="card">
                <div className="hd">
                  <div>
                    <h2>Lex agent</h2>
                    <div className="sub">{workspace.plan || "Plan"} · {workspace.agentName || "Lex"}</div>
                  </div>
                  <span className="badge b-ok">Active</span>
                </div>
                <div className="bd">
                  <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--n-600)" }}>
                    Your agent is active. Open Manage agent to customise, test, or get your embed code.
                  </p>
                  <button type="button" className="btn pri sm" onClick={() => setPage("manage-agent")}>
                    Manage agent
                  </button>
                </div>
              </div>
            ) : workspace.modules.projects ? (
              <div className="card">
                <div className="hd">
                  <h2>Projects</h2>
                  <span className="badge b-info">In build</span>
                </div>
                <div className="bd">
                  <p className="muted">Your website build progress will show here.</p>
                </div>
              </div>
            ) : (
              <Empty title="No active project yet" body="When your website or care plan starts, progress will show here." />
            )}

            {workspace.modules.blueprint ? (
              <div className="card">
                <div className="hd">
                  <h2>Your Blueprint</h2>
                  <span className="tag bp">{workspace.blueprints[0]?.tier}</span>
                </div>
                <div className="bd">
                  <p style={{ margin: "0 0 12px", fontSize: 14 }}>
                    {workspace.blueprints[0]?.businessName || "Your Blueprint"} · status {workspace.blueprints[0]?.status}
                  </p>
                  <button type="button" className="btn sm" onClick={() => setPage("blueprint")}>
                    Open full report
                  </button>
                </div>
              </div>
            ) : (
              <Empty title="No Blueprint yet" body="When you purchase a Blueprint, the full report will appear here." />
            )}
          </div>

          <div className="g2">
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
          <div className="ph"><div><h1>Projects</h1><div className="sub">Website and care plan delivery</div></div></div>
          <Empty title="No project data yet" body="When your build is underway, milestones and staging links will show here." />
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
          <Empty title="No invoices linked yet" body="When Stripe invoices are connected to your portal account, they will list here with pay links for Owner and Billing roles." />
        </>
      )}

      {page === "requests" && (
        <>
          <div className="ph">
            <div>
              <h1>Requests</h1>
              <div className="sub">Changes, questions and build quote requests</div>
            </div>
          </div>
          {workspace.requests.length === 0 ? (
            <Empty title="No requests yet" body="Create a request for a change, question, or a build quote. Promise: we respond within one business day for access requests." />
          ) : (
            <div className="card">
              <table>
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Status</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.requests.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <b style={{ fontWeight: 500 }}>{r.title}</b>
                      </td>
                      <td>
                        <span className={`badge ${r.status === "done" ? "b-ok" : r.status === "in_progress" ? "b-info" : "b-n"}`}>
                          {r.status === "in_progress" ? "In progress" : r.status === "done" ? "Done" : "Received"}
                        </span>
                      </td>
                      <td className="muted">{new Date(r.updatedAt || r.createdAt).toLocaleDateString("en-AU")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="hd"><h2>New request</h2></div>
            <div className="bd">
              <p className="muted" style={{ marginTop: 0 }}>
                To file a detailed request with screenshots, email hello@saabai.ai for now, or use Get a build quote from your Blueprint.
                Full in-portal compose will use your existing request APIs next.
              </p>
              <a className="btn pri" href="mailto:hello@saabai.ai?subject=Client%20portal%20request">
                Email a request
              </a>
            </div>
          </div>
        </>
      )}

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
