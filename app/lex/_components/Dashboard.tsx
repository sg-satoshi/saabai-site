"use client";

import type { FirmUsage } from "../../../lib/lex-review-access";
import { PORTAL_REQUESTS_HREF } from "../../../lib/portal-pages";
import type { Project, Thread } from "./types";
import { Icon } from "./icons";
import "./dashboard.css";
import "./account.css";

const day = (ms: number) =>
  new Date(ms).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Brisbane" });

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

function Meter({ label, used, cap }: { label: string; used: number; cap: number }) {
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 100;
  const tone = cap === 0 || used >= cap ? "bad" : pct >= 75 ? "warn" : "ok";
  return (
    <div className="lxh-meter">
      <div className="lxh-meter-h"><span>{label}</span><b>{used} of {cap}</b></div>
      <div className={`lxh-bar ${tone}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={cap} aria-valuenow={used}><i style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

/** Firm dashboard inside the Lex shell. Firm-safe: no admin links, Contact Saabai goes to Account > Requests. */
export function FirmDashboard(props: {
  firmName: string; firmLogo: string | null; email: string | null;
  threads: Thread[]; projects: Project[]; usage: FirmUsage | null; admin: boolean;
  onNewResearch: () => void; onDraft: () => void; onReview: () => void; onIntake: () => void;
  onOpenThread: (id: string) => void; onFirmSettings: () => void;
  onAccount: () => void; onInvoices: () => void;
}) {
  const recent = props.threads.filter((t) => t.messages.length > 0).sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
  const weekAgo = Date.now() - 7 * 86400000;
  const thisWeek = props.threads.filter((t) => t.createdAt >= weekAgo).length;
  const answers = props.threads.reduce((n, t) => n + t.messages.filter((m) => m.role === "assistant").length, 0);
  const projectOf = (t: Thread) => props.projects.find((p) => p.id === t.projectId);

  return (
    <div className="lx-body lxh">
      <div className="lxh-col">
        <header className="lxh-head">
          <div>
            <span className="lxh-k">Firm dashboard</span>
            <h1>{props.firmName || "Your firm"}</h1>
            <p>{props.email ? `Signed in as ${props.email}` : "Signed in"}</p>
          </div>
          <button type="button" className="lx-btn" onClick={props.onFirmSettings}><Icon name="settings" />Firm settings</button>
        </header>

        <div className="lxh-actions">
          <button type="button" onClick={props.onNewResearch}><Icon name="research" /><b>New research</b><span>Ask a tax or legal question</span></button>
          <button type="button" onClick={props.onDraft}><Icon name="draft" /><b>Draft a document</b><span>Agreements, letters, advice</span></button>
          <button type="button" onClick={props.onReview}><Icon name="review" /><b>Review a document</b><span>Risks, redlines, compare</span></button>
          <button type="button" onClick={props.onIntake}><Icon name="matters" /><b>New matter</b><span>Shared with your whole firm</span></button>
        </div>

        <div className="lxh-grid">
          <section className="lxh-card lxh-recent" aria-labelledby="lxh-recent-h">
            <div className="lxh-card-h"><h2 id="lxh-recent-h">Recent research</h2><small>{plural(props.threads.filter((t) => t.messages.length > 0).length, "thread")}</small></div>
            {recent.length === 0 ? (
              <div className="lxh-empty">No research yet. Start with a question and it will appear here.</div>
            ) : (
              <ul>
                {recent.map((t) => {
                  const p = projectOf(t);
                  return (
                    <li key={t.id}>
                      <button type="button" onClick={() => props.onOpenThread(t.id)}>
                        <span className="t">{t.title}</span>
                        <span className="m">
                          {p && <><i style={{ background: p.colour }} />{p.name} · </>}
                          {day(t.createdAt)} · {plural(t.messages.filter((m) => m.role === "assistant").length, "answer")}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className="lxh-side">
            <section className="lxh-card" aria-labelledby="lxh-use-h">
              <div className="lxh-card-h"><h2 id="lxh-use-h">Today&apos;s usage</h2><small>Brisbane time</small></div>
              {props.admin ? (
                <div className="lxh-empty">Saabai admin account. No daily limits apply.</div>
              ) : props.usage ? (
                <>
                  <Meter label="Document reviews" used={props.usage.reviews} cap={props.usage.reviewCap} />
                  <Meter label="Document compares" used={props.usage.compares} cap={props.usage.compareCap} />
                  <Meter label="Sent for review" used={props.usage.submits} cap={props.usage.reviewCap} />
                  <p className="lxh-fine">Limits are per firm and reset at midnight Brisbane time. Research has no daily limit.</p>
                </>
              ) : (
                <div className="lxh-empty">Usage is not available right now.</div>
              )}
            </section>

            <section className="lxh-card" aria-labelledby="lxh-act-h">
              <div className="lxh-card-h"><h2 id="lxh-act-h">Activity</h2></div>
              <dl className="lxh-stats">
                <div><dt>Research this week</dt><dd>{thisWeek}</dd></div>
                <div><dt>Answers saved</dt><dd>{answers}</dd></div>
                <div><dt>Projects</dt><dd>{props.projects.length}</dd></div>
              </dl>
            </section>

            <section className="lxh-card" aria-labelledby="lxh-help-h">
              <div className="lxh-card-h"><h2 id="lxh-help-h">Help and account</h2></div>
              <a className="lxh-link" href={PORTAL_REQUESTS_HREF}>Contact Saabai<span>Raise a request or ask for more capacity</span></a>
              <button type="button" className="lxh-link lxa-linkbtn" onClick={props.onAccount}>Account<span>Your login and details</span></button>
              <button type="button" className="lxh-link lxa-linkbtn" onClick={props.onInvoices}>Invoices<span>Billing history</span></button>
            </section>
          </div>
        </div>

        <p className="lxh-note">Research threads are saved to your account for 90 days. Matters are shared with your whole firm.</p>
      </div>
    </div>
  );
}
