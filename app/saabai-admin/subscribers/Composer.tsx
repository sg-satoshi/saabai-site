"use client";
/**
 * New broadcast composer (#345). Full-screen overlay with three columns: who it goes to, the
 * message, and a live preview built by the same broadcastEmail() the server sends with.
 * Counts use the server's rule (active, opted in, not suppressed), so "N will get this" is what
 * the broadcast route actually sends. Test sends go to hello@saabai.ai only, fixed on the server.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MERGE_FIELDS, mergeToken, hasValue } from "../../../lib/personalise";
import { audienceCounts, LEFT_OUT_REASON, SEGMENTS, STATUS_LABEL } from "../../../lib/subscriber-rules";
import { BROADCAST_FROM, BROADCAST_FROM_NAME, MAX_SUBJECT, buildBroadcastHtml, previewForRecipient, previewForTest } from "../../../lib/broadcast-template";
import { BROADCAST_TEST_TO, testSubject } from "../../../lib/broadcast-test";
import { broadcastResult, type BroadcastResultView } from "../../../lib/broadcast-result";
import type { AdminSubscriber } from "../../../lib/subscriber-admin";
import { notify } from "../ui/Feedback";
import { Icon, fmtTime, useDrag, useIsMobile, useLayer, useStoredNumber } from "./ui";

const DRAFT_KEY = "saabai-admin:subscribers:draft";
const SAMPLE_NOTE = MERGE_FIELDS.filter((f) => f.key === "firstName" || f.key === "city").map((f) => f.sample).join(", ");

type Draft = { subject: string; body: string; savedAt: number };
type Audience = { id: string; label: string; members: AdminSubscriber[] };

function loadDraft(): Draft {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (d && typeof d.subject === "string" && typeof d.body === "string") return { subject: d.subject, body: d.body, savedAt: Number(d.savedAt) || 0 };
  } catch { /* none */ }
  return { subject: "", body: "", savedAt: 0 };
}

export default function Composer({ subs, selectedEmails, initialAudience, now, onClose, onSent }: {
  subs: AdminSubscriber[];
  selectedEmails: string[];
  initialAudience: string;
  now: number;
  onClose: () => void;
  onSent: () => void;
}) {
  const mobile = useIsMobile();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [savedAt, setSavedAt] = useState(0);
  const [audienceId, setAudienceId] = useState(initialAudience);
  const [pickOpen, setPickOpen] = useState(false);
  const [showLeftOut, setShowLeftOut] = useState(false);
  const [tab, setTab] = useState<"recipients" | "test">("recipients");
  const [mTab, setMTab] = useState<"write" | "preview">("write");
  const [mAudOpen, setMAudOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [testing, setTesting] = useState(false);
  const [testSent, setTestSent] = useState<{ at: Date; subject: string } | null>(null);
  const [testErr, setTestErr] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResultView | null>(null);
  const [prevW, setPrevW] = useStoredNumber("saabai-admin:subscribers:preview-w", 540, 360, 820);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const subjRef = useRef<HTMLInputElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    const d = loadDraft();
    setSubject(d.subject); setBody(d.body); setSavedAt(d.savedAt);
    loaded.current = true;
    setTimeout(() => subjRef.current?.focus(), 0);
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => {
      const at = Date.now();
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ subject, body, savedAt: at })); setSavedAt(at); } catch { /* storage blocked */ }
    }, 400);
    return () => clearTimeout(t);
  }, [subject, body]);

  const audiences: Audience[] = useMemo(() => {
    const sel = new Set(selectedEmails);
    const list: Audience[] = [{ id: "all", label: "All subscribers", members: subs }];
    if (sel.size) list.push({ id: "selected", label: "Selected rows", members: subs.filter((s) => sel.has(s.email)) });
    for (const seg of SEGMENTS.slice(1)) list.push({ id: seg.id, label: seg.label, members: subs.filter((s) => seg.filter(s, now)) });
    return list;
  }, [subs, selectedEmails, now]);
  const audience = audiences.find((a) => a.id === audienceId) ?? audiences[0];
  const counts = audienceCounts(audience.members);
  const recipients = useMemo(() => audience.members.filter((s) => s.emailStatus === "can_email"), [audience]);
  const leftOut = audience.members.filter((s) => s.emailStatus !== "can_email");
  const n = counts.canEmail;
  useEffect(() => { setIdx(0); }, [audienceId]);

  const who = recipients[Math.min(idx, Math.max(0, recipients.length - 1))];
  const email = useMemo(() => {
    if (tab === "test" || !who) return previewForTest(subject, body);
    return previewForRecipient(who, subject, body);
  }, [tab, who, subject, body]);

  const blank = !subject.trim() ? "Add a subject first." : !body.trim() ? "Write a message first." : "";
  const sendBlock = blank || (n === 0 ? "Nobody in this audience can be emailed." : "");

  const close = useCallback(() => {
    if (confirmOpen) { if (!sending) setConfirmOpen(false); return; }
    if (pickOpen) { setPickOpen(false); return; }
    onClose();
  }, [confirmOpen, sending, pickOpen, onClose]);
  useLayer(true, close);
  useLayer(confirmOpen, () => {}, keepRef);

  function insert(token: string) {
    const ta = taRef.current;
    if (!ta) { setBody((b) => b + token); return; }
    const s = ta.selectionStart ?? body.length, e = ta.selectionEnd ?? body.length;
    const next = body.slice(0, s) + token + body.slice(e);
    setBody(next);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s + token.length, s + token.length); });
  }

  // Test send: the server fixes the recipient to hello@saabai.ai. Only subject and html are sent.
  async function sendTest() {
    if (blank || testing) return;
    setTesting(true); setTestErr("");
    try {
      const res = await fetch("/api/subscribers/broadcast/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), html: buildBroadcastHtml(body), fromName: BROADCAST_FROM_NAME }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setTestSent({ at: new Date(), subject: typeof data.subject === "string" ? data.subject : testSubject(subject.trim()) });
        setTab("test");
        if (mobile) setMTab("preview");
      } else setTestErr(data.error || "The test did not send. Try again in a moment.");
    } catch {
      setTestErr("The test did not send. Check your connection and try again.");
    } finally {
      setTesting(false);
    }
  }

  async function send() {
    if (sendBlock || sending) return;
    setSending(true); setResult(null);
    try {
      const res = await fetch("/api/subscribers/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The server filters again (opted in, not suppressed), so only people who can be emailed get it.
        body: JSON.stringify({ emails: audience.members.map((s) => s.email), subject: subject.trim(), html: buildBroadcastHtml(body), fromName: BROADCAST_FROM_NAME }),
      });
      const data = await res.json().catch(() => ({}));
      const r = broadcastResult(res.ok, data);
      setConfirmOpen(false);
      if (r.kind === "ok") {
        try { localStorage.removeItem(DRAFT_KEY); } catch { /* storage blocked */ }
        notify.success(r.msg);
        onSent();
      } else setResult(r);
    } catch {
      setConfirmOpen(false);
      setResult({ kind: "error", msg: "The broadcast did not go out. Check your connection and try again." });
    } finally {
      setSending(false);
    }
  }

  const drag = useDrag((dx) => setPrevW(prevW - dx));
  const saved = savedAt ? `Draft saved ${fmtTime(new Date(savedAt))}.` : "Draft saves as you type.";

  const testBtn = (
    <button type="button" className={`btn lg${testing ? " loading" : ""}`} onClick={sendTest} disabled={!!blank} title={blank || `Sends one test to ${BROADCAST_TEST_TO} with sample values`} aria-busy={testing || undefined}>
      {testing ? "Sending" : testSent ? <><span style={{ color: "var(--ok)", display: "inline-flex" }}><Icon name="tick" /></span>{mobile ? "Test sent" : "Test sent. Send again"}</> : <><Icon name="test" />{mobile ? "Send test" : `Send test to ${BROADCAST_TEST_TO}`}</>}
    </button>
  );
  const sendBtn = (
    <button type="button" className="btn pri lg" onClick={() => setConfirmOpen(true)} disabled={!!sendBlock} title={sendBlock || undefined}>
      {mobile ? `Review and send ${n}` : `Review and send to ${n}`}
    </button>
  );

  const banners = (
    <>
      {testSent && (
        <div className="s-ok" role="status">
          <Icon name="tick" />
          <div>Test sent to <b>{BROADCAST_TEST_TO}</b> at {fmtTime(testSent.at)} as <b>&quot;{testSent.subject}&quot;</b>, with sample values in the fields ({SAMPLE_NOTE}). Check that inbox before you send.</div>
        </div>
      )}
      {testErr && <div className="s-ok bad" role="alert"><Icon name="warn" /><div>{testErr}</div></div>}
      {result && <div className={`s-ok ${result.kind === "ok" ? "" : result.kind === "none" ? "info" : "bad"}`} role="alert"><Icon name={result.kind === "ok" ? "tick" : "warn"} /><div>{result.msg}</div></div>}
    </>
  );

  const audienceList = (
    <div role="radiogroup" aria-label="Send to" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {audiences.map((a) => {
        const c = audienceCounts(a.members);
        return (
          <button key={a.id} type="button" role="radio" aria-checked={a.id === audience.id} className="s-radio" onClick={() => { setAudienceId(a.id); setMAudOpen(false); }}>
            <span className="dot" />
            <span className="nm">{a.label}</span>
            <span className="num" style={{ fontSize: 13 }}><b style={{ color: "var(--head)" }}>{c.canEmail}</b><span style={{ color: "var(--muted)" }}>/{c.total}</span></span>
          </button>
        );
      })}
    </div>
  );

  const recipientCheck = (
    <div className="s-rcheck" aria-live="polite">
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="num" style={{ fontSize: 30, fontWeight: 500, color: "var(--head)", lineHeight: 1 }}>{n}</span>
        <span style={{ fontWeight: 600 }}>will get this email</span>
      </div>
      {counts.leftOut > 0 ? (
        <>
          <div style={{ marginTop: 10, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}><b style={{ color: "var(--text)" }}>{counts.leftOut} left out</b>, by law and by choice:</div>
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6, fontSize: 13, lineHeight: 1.45 }}>
            {counts.notOptedIn > 0 && <div style={{ display: "flex", gap: 8 }}><span className="s-badge not_opted_in" style={{ height: 20, fontSize: 11.5 }}>{counts.notOptedIn}</span><span>{LEFT_OUT_REASON.not_opted_in}</span></div>}
            {counts.unsubscribed > 0 && <div style={{ display: "flex", gap: 8 }}><span className="s-badge unsubscribed" style={{ height: 20, fontSize: 11.5 }}>{counts.unsubscribed}</span><span>{LEFT_OUT_REASON.unsubscribed}</span></div>}
          </div>
          <button type="button" className="btn gh sm" style={{ marginTop: 8, color: "var(--acc)", paddingLeft: 0 }} aria-expanded={showLeftOut} onClick={() => setShowLeftOut((v) => !v)}>
            {showLeftOut ? "Hide who is left out" : "See who is left out"}
          </button>
          {showLeftOut && (
            <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              {leftOut.map((s) => (
                <li key={s.email} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.firstName || s.email}</span>
                  <span style={{ color: "var(--muted)", flex: "none" }}>{STATUS_LABEL[s.emailStatus]}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div style={{ marginTop: 10, fontSize: 13, color: "var(--muted)" }}>Nobody in this audience is left out.</div>
      )}
    </div>
  );

  const picker = pickOpen && (
    <div className="s-pick" role="dialog" aria-label="Fields and fallbacks">
      <div style={{ padding: "12px 14px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--head)" }}>Fields and fallbacks</div>
        <button type="button" className="btn gh sm" onClick={() => setPickOpen(false)}>{mobile ? "Done" : "Close"}</button>
      </div>
      <div style={{ padding: "0 14px 10px", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
        Each field button inserts the token below. The word after the | is used when that field is blank. Edit it in the message to change it.
      </div>
      {MERGE_FIELDS.map((f) => (
        <button key={f.key} type="button" className="r" onClick={() => insert(mergeToken(f))} style={{ width: "100%", background: "none", border: 0, borderTop: "1px solid var(--line2)", textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer" }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{f.label}</span>
          <span className="num" style={{ fontSize: 12.5, color: "var(--muted)", textAlign: "right" }}>{recipients.filter((s) => hasValue(s[f.key])).length} of {n} filled</span>
          <span><span className="s-mf">{`{{${f.key}|`}<b style={{ fontWeight: 500, opacity: 0.75 }}>{f.fallback}</b>{"}}"}</span></span>
          <span style={{ fontSize: 12.5, color: "var(--muted)", textAlign: "right" }}>Test send: {f.sample}</span>
        </button>
      ))}
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--line2)", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
        Same five fields the server fills. Email, IP, consent, source and dates are never offered. Counts are for the {n} people who will get this email.
      </div>
    </div>
  );

  const write = (
    <div className="s-write">
      <div>
        <label className="s-lab" htmlFor="bc-subject" style={{ display: "block", marginBottom: 6 }}>Subject</label>
        <div style={{ position: "relative" }}>
          <input id="bc-subject" ref={subjRef} className="s-inp" style={{ width: "100%", height: 44, fontSize: 15, paddingRight: 70 }} value={subject} maxLength={MAX_SUBJECT} onChange={(e) => setSubject(e.target.value)} placeholder="What is this email about?" />
          <span className="s-note num" style={{ position: "absolute", right: 12, top: 13 }}>{subject.length}/{MAX_SUBJECT}</span>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label className="s-lab" htmlFor="bc-body">Message</label>
          <button type="button" className="btn gh sm" aria-expanded={pickOpen} onClick={() => setPickOpen((v) => !v)}>Fields and fallbacks</button>
        </div>
        <div className="s-chips" role="group" aria-label="Insert personalisation field" style={{ marginBottom: 10 }}>
          {MERGE_FIELDS.map((f) => (
            <button key={f.key} type="button" className="btn sm" onClick={() => insert(mergeToken(f))} title={`Inserts ${mergeToken(f)}`}><Icon name="plus" />{f.label}</button>
          ))}
        </div>
        <textarea id="bc-body" ref={taRef} className="s-ta" value={body} onChange={(e) => setBody(e.target.value)} placeholder={"Hi {{firstName|there}},\n\nWrite your message. Each line becomes a paragraph."} />
      </div>
      <div className="s-lock"><Icon name="lock" />Added to every email automatically: unsubscribe link, ABN footer and sender name.</div>
      {picker}
    </div>
  );

  const preview = (
    <div className="s-prev" style={mobile ? { minHeight: 520 } : undefined}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div className="s-lab">Live preview</div>
        <div className="seg2" role="tablist" aria-label="Preview">
          <button type="button" role="tab" aria-selected={tab === "recipients"} onClick={() => setTab("recipients")}>Recipients</button>
          <button type="button" role="tab" aria-selected={tab === "test"} onClick={() => setTab("test")}>Test email</button>
        </div>
      </div>
      {tab === "recipients" && who ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <button type="button" className="btn sm ic" aria-label="Previous recipient" title="Previous recipient" disabled={idx <= 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}><Icon name="left" /></button>
          <div style={{ flex: 1, lineHeight: 1.3, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><span style={{ color: "var(--muted)" }}>Previewing as</span> <b>{who.firstName ? `${who.firstName} (${who.email})` : who.email}</b></div>
          <span className="s-note num">{Math.min(idx, recipients.length - 1) + 1} of {recipients.length}</span>
          <button type="button" className="btn sm ic" aria-label="Next recipient" title="Next recipient" disabled={idx >= recipients.length - 1} onClick={() => setIdx((i) => Math.min(recipients.length - 1, i + 1))}><Icon name="right" /></button>
        </div>
      ) : (
        <div style={{ fontSize: 13, lineHeight: 1.4 }}>
          <span style={{ color: "var(--muted)" }}>{tab === "test" ? `Showing the test as ${BROADCAST_TEST_TO} gets it.` : "Nobody in this audience can be emailed, so this shows the test."}</span> Sample values fill the fields. Each recipient gets their own.
        </div>
      )}
      <div className="s-meta">
        <b>{BROADCAST_FROM_NAME}</b> &lt;hello@saabai.ai&gt;<br />
        To: <b>{email.to[0]}</b><br />
        Subject: <b>{email.subject || "(no subject yet)"}</b>
      </div>
      <iframe className="s-frame" title="Email preview" sandbox="" srcDoc={email.html} />
    </div>
  );

  const confirm = confirmOpen && (
    <>
      <div className="s-ov" style={{ zIndex: 110, background: "rgba(7,6,31,.6)" }} onClick={() => !sending && setConfirmOpen(false)} />
      <div className="s-dialog" role="dialog" aria-modal="true" aria-labelledby="bc-confirm-h">
        <h2 id="bc-confirm-h" className="s-h2">Send this to {n} {n === 1 ? "person" : "people"}?</h2>
        <div className="s-sub" style={{ marginBottom: 12 }}>It goes out straight away. You can&apos;t unsend it.</div>
        <div className="s-crow"><div>Subject</div><div>{subject.trim()}</div></div>
        <div className="s-crow"><div>Send to</div><div>{audience.label}</div></div>
        <div className="s-crow"><div>Will receive</div><div><b className="num" style={{ fontSize: 16 }}>{n}</b> {n === 1 ? "person" : "people"}</div></div>
        <div className="s-crow"><div>Left out</div><div>{counts.leftOut ? `${counts.leftOut}: ${counts.notOptedIn} not opted in, ${counts.unsubscribed} unsubscribed` : "Nobody"}</div></div>
        <div className="s-crow"><div>Test</div><div>{testSent ? <span style={{ color: "var(--ok)", fontWeight: 600 }}>Sent to {BROADCAST_TEST_TO} at {fmtTime(testSent.at)}</span> : <span style={{ color: "#7a4505", fontWeight: 600 }}>No test sent yet. You can still send, or go back and send one to {BROADCAST_TEST_TO} first.</span>}</div></div>
        <div className="s-crow"><div>In every email</div><div>Unsubscribe link, ABN footer, {BROADCAST_FROM_NAME} as sender</div></div>
        <div className="s-dbtns">
          <button type="button" ref={keepRef} className="btn lg" onClick={() => setConfirmOpen(false)} disabled={sending}>Go back</button>
          <button type="button" className={`btn pri lg${sending ? " loading" : ""}`} onClick={send} aria-busy={sending || undefined}>{sending ? "Sending" : `Send to ${n} now`}</button>
        </div>
      </div>
    </>
  );

  return (
    <div className="sx">
      <div className="s-ov" onClick={onClose} />
      <div className="s-sheet" role="dialog" aria-modal="true" aria-labelledby="bc-h">
        <div className="s-shead">
          <div style={{ minWidth: 0 }}>
            <h2 id="bc-h" className="s-h2">New broadcast</h2>
            <div className="s-note">{saved}{mobile ? "" : ` From ${BROADCAST_FROM}`}</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {!mobile && (sendBlock ? <span className="s-note" style={{ maxWidth: 220, textAlign: "right" }}>{sendBlock}</span> : null)}
            {!mobile && testBtn}
            {!mobile && sendBtn}
            {!mobile && <div className="s-vsep" />}
            <button type="button" className={`btn gh ic${mobile ? " lg" : " md"}`} aria-label="Close, draft is saved" title="Close, draft is saved" onClick={onClose}><Icon name="x" /></button>
          </div>
        </div>
        {(testSent || testErr || result) && <div style={{ padding: mobile ? "12px 16px 0" : "12px 24px 0", display: "flex", flexDirection: "column", gap: 8 }}>{banners}</div>}
        {mobile ? (
          <div className="s-cols">
            <div className="seg2 s-mtabs" role="tablist" aria-label="Composer">
              <button type="button" role="tab" aria-selected={mTab === "write"} onClick={() => setMTab("write")}>Write</button>
              <button type="button" role="tab" aria-selected={mTab === "preview"} onClick={() => setMTab("preview")}>Preview</button>
            </div>
            {mTab === "write" ? (
              <>
                <div style={{ margin: "12px 16px 0", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, lineHeight: 1.35 }}>
                      <div style={{ fontSize: 13, color: "var(--muted)" }}>To</div>
                      <div style={{ fontWeight: 600 }}>{audience.label}. <span className="num">{n}</span> will get it</div>
                      <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{counts.leftOut} left out: {counts.notOptedIn} not opted in, {counts.unsubscribed} unsubscribed</div>
                    </div>
                    <button type="button" className="btn gh sm" style={{ color: "var(--acc)" }} aria-expanded={mAudOpen} onClick={() => setMAudOpen((v) => !v)}>{mAudOpen ? "Done" : "Change"}</button>
                  </div>
                  {mAudOpen && <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>{audienceList}{recipientCheck}</div>}
                </div>
                {write}
              </>
            ) : preview}
          </div>
        ) : (
          <div className="s-cols" style={{ gridTemplateColumns: `310px minmax(360px,1fr) 12px ${prevW}px` }}>
            <div className="s-aud">
              <div className="s-lab" style={{ padding: "0 4px" }}>Send to</div>
              {audienceList}
              {recipientCheck}
            </div>
            {write}
            <button type="button" className="s-hv" style={{ borderLeft: "1px solid var(--line2)" }} aria-label="Resize preview. Use left and right arrows." title="Drag to resize"
              {...drag} onKeyDown={(e) => { if (e.key === "ArrowLeft") setPrevW(prevW + 24); if (e.key === "ArrowRight") setPrevW(prevW - 24); }} />
            {preview}
          </div>
        )}
        {mobile && (
          <div className="s-mbar">
            {testBtn}
            {sendBtn}
            {sendBlock && <div className="s-note" style={{ gridColumn: "1 / -1", textAlign: "center" }}>{sendBlock}</div>}
          </div>
        )}
      </div>
      {confirm}
    </div>
  );
}
