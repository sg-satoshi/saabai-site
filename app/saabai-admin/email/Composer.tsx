"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { documentHtml, newBlock, type Block } from "../../../lib/email/blocks";
import { SUNDER_IDENTITY } from "../../../lib/email/constants";
import { PREHEADER_MAX, SEND_CONFIRM_OVER, SUBJECT_MAX, contentHash } from "../../../lib/email/gates";
import { renderMarketingEmail } from "../../../lib/email/message";

type Detail = {
  ok: true;
  campaign: { id: string; name: string; subject: string; preheader: string; blocks: Block[]; fromName: string; status: string; testHash: string | null; testSentAt: string | null };
  fromEmail: string;
  paused: boolean;
  audience: number;
  pending: number;
  unsubscribed: number;
  suppressed: number;
  dailyCap: number;
  usedToday: number;
};

const KINDS: Block["kind"][] = ["heading", "text", "image", "button", "divider", "columns", "product"];

export default function Composer({ campaignId }: { campaignId?: string }) {
  const [id, setId] = useState(campaignId || "");
  const idRef = useRef(campaignId || "");
  const [name, setName] = useState("New broadcast");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([newBlock("text")]);
  const [fromName, setFromName] = useState("SUNDER");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [testHash, setTestHash] = useState<string | null>(null);
  const [testedAt, setTestedAt] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState("");
  const [width, setWidth] = useState<620 | 375>(620);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [confirm, setConfirm] = useState<null | "send" | "schedule">(null);
  const [typed, setTyped] = useState("");
  const [when, setWhen] = useState("");
  const [pick, setPick] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!campaignId) { loaded.current = true; return; }
    fetch(`/api/admin/email?view=campaign&id=${campaignId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) { setBanner(j.error || "Could not open this campaign."); return; }
        setDetail(j);
        idRef.current = j.campaign.id;
        setId(j.campaign.id);
        setName(j.campaign.name || "New broadcast");
        setSubject(j.campaign.subject || "");
        setPreheader(j.campaign.preheader || "");
        setBlocks(j.campaign.blocks?.length ? j.campaign.blocks : [newBlock("text")]);
        setFromName(j.campaign.fromName || "SUNDER");
        setTestHash(j.campaign.testHash);
        setTestedAt(j.campaign.testSentAt);
        loaded.current = true;
      })
      .catch(() => setBanner("Could not open this campaign."));
  }, [campaignId]);

  const hash = contentHash({ subject, preheader, blocks, fromName });
  const unlocked = !!testHash && testHash === hash && (detail?.audience || 0) > 0 && !detail?.paused;
  const audience = detail?.audience || 0;
  const needsTyped = audience > SEND_CONFIRM_OVER;

  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => { save(false); }, 700);
    return () => clearTimeout(t);
    // save closes over the latest fields via the timeout callback below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, subject, preheader, blocks, fromName]);

  async function save(manual: boolean) {
    const res = await fetch("/api/admin/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", id: idRef.current || undefined, name, subject, preheader, blocks, fromName }),
    });
    const json = await res.json().catch(() => ({}));
    if (!json.ok) { if (manual) setBanner(json.error || "Could not save."); return; }
    if (!idRef.current && json.id) {
      idRef.current = json.id;
      setId(json.id);
      window.history.replaceState(null, "", `/saabai-admin/email/${json.id}`);
    }
    setSavedAt(new Date());
  }

  async function post(payload: Record<string, unknown>) {
    const res = await fetch("/api/admin/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    return { res, json: await res.json().catch(() => ({})) };
  }

  async function doTest() {
    setBusy("test");
    setBanner("");
    await save(true);
    const current = idRef.current;
    if (!current) { setBusy(""); setBanner("Save the draft first."); return; }
    const { json } = await post({ action: "test", campaignId: current, to: testTo });
    setBusy("");
    if (!json.ok) { setBanner(json.error || "The test did not send."); return; }
    setTestHash(contentHash({ subject, preheader, blocks, fromName }));
    setTestedAt(json.testedAt);
    setTestOpen(false);
    setBanner(`Test sent to ${testTo}.`);
  }

  async function doSend() {
    if (needsTyped && typed !== "SEND") return;
    setBusy("send");
    const { json } = await post({ action: "send", campaignId: idRef.current, confirm: needsTyped ? typed : undefined });
    setBusy("");
    if (!json.ok) { setBanner(json.error || "Nothing was sent."); return; }
    setConfirm(null);
    setBanner(json.later ? `Queued ${json.today} for today. ${json.later} wait until 7:00am Brisbane tomorrow.` : `Queued ${json.queued}. The sender runs every minute.`);
  }

  async function doSchedule() {
    if (!when) return;
    if (needsTyped && typed !== "SEND") return;
    setBusy("schedule");
    const iso = new Date(`${when}:00+10:00`).toISOString();
    const { json } = await post({ action: "schedule", campaignId: idRef.current, when: iso, confirm: needsTyped ? typed : undefined });
    setBusy("");
    if (!json.ok) { setBanner(json.error || "Nothing was scheduled."); return; }
    setConfirm(null);
    setBanner("Scheduled. It stays queued until that time.");
  }

  const preview = useMemo(() => renderMarketingEmail({
    subject: subject || "Subject",
    html: documentHtml({ preheader, blocks }),
    fromName,
    identity: { ...SUNDER_IDENTITY, fromName },
    unsubUrl: "https://saabai.ai/email/u",
    viewUrl: "https://saabai.ai/email/view",
    values: { firstName: "Sam" },
  }), [subject, preheader, blocks, fromName]);

  function statusChip(status: string) {
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Draft";
  const cls = status === "scheduled" ? "b-sched" : status === "sending" ? "b-sending" : status === "sent" ? "b-ok" : status === "cancelled" ? "b-n" : "b-n";
  return <span className={`badge ${cls}`}>{label === "Cancelled" ? "Cancelled" : label}</span>;
}

function summary(b: Block): string {
  if (b.kind === "heading" || b.kind === "text") return b.text.trim() || "Empty";
  if (b.kind === "image") return b.alt.trim() || b.src.trim() || "Image";
  if (b.kind === "button") return b.label.trim() || "Button";
  if (b.kind === "divider") return "Line";
  if (b.kind === "columns") return "Two columns";
  return b.title.trim() || "Product";
}

function patch(blockId: string, next: Partial<Block>) {
    setBlocks((list) => list.map((b) => b.id === blockId ? { ...b, ...next } as Block : b));
  }
  function move(blockId: string, dir: -1 | 1) {
    setBlocks((list) => {
      const i = list.findIndex((b) => b.id === blockId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const copy = list.slice();
      const [row] = copy.splice(i, 1);
      copy.splice(j, 0, row);
      return copy;
    });
  }

  const room = Math.max(0, (detail?.dailyCap || 0) - (detail?.usedToday || 0));
  const today = Math.min(audience, room);
  const later = Math.max(0, audience - today);
  const capLine = later > 0 ? `${today.toLocaleString("en-AU")} today, the rest sends tomorrow from 7:00 AM` : `Within today's cap (${(detail?.usedToday || 0).toLocaleString("en-AU")} of ${(detail?.dailyCap || 0).toLocaleString("en-AU")} used)`;

  return (
    <div className="em-page">
      <div className="ph">
        <div>
          <h1>{name || "New broadcast"} {statusChip(detail?.campaign.status || "draft")}</h1>
          <p className="sub">{savedAt ? `Autosaved ${savedAt.toLocaleTimeString("en-AU", { timeZone: "Australia/Brisbane", hour: "numeric", minute: "2-digit" })}` : "Autosaves as you type."}</p>
        </div>
        <div className="em-actions">
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button type="button" className="btn" onClick={() => setTestOpen(true)} disabled={!!busy || !!detail?.paused}>Send test</button>
            <button type="button" className="btn" disabled={!unlocked || !!busy} aria-describedby="send-lock" onClick={() => { setTyped(""); setConfirm("schedule"); }}>Schedule</button>
            <button type="button" className="btn pri" disabled={!unlocked || !!busy} aria-describedby="send-lock" onClick={() => { setTyped(""); setConfirm("send"); }}>Send now</button>
          </div>
          <p id="send-lock" className="em-help" style={{ textAlign: "right" }}>{unlocked ? "A test of this version was sent." : "Send a test first to unlock Send now and Schedule."}</p>
        </div>
      </div>
      {banner && <div className="em-alert info" role="status" style={{ margin: "12px 0" }}>{banner}</div>}
      {detail?.paused && <div className="em-alert warn" style={{ marginBottom: 12 }}>Sending is paused. Tests and sends stay locked.</div>}

      <div className="em-split">
        <div style={{ display: "grid", gap: 16 }}>
          <div className="card"><div className="bd" style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><b>Audience</b><span className="em-help">Required</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span>Waitlist, confirmed only</span><b className="num">{audience.toLocaleString("en-AU")} recipients</b></div>
            <p className="em-help">Excludes {detail?.unsubscribed || 0} unsubscribed and {detail?.suppressed || 0} suppressed. {detail?.pending || 0} pending confirmation are not in this audience.</p>
            <label className="em-field">Name<input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /></label>
            <label className="em-field">Subject
              <input value={subject} maxLength={SUBJECT_MAX} aria-invalid={subject.length > SUBJECT_MAX} onChange={(e) => setSubject(e.target.value)} />
              <span className="em-count">{subject.length} / {SUBJECT_MAX}</span>
            </label>
            <label className={`em-field${preheader.trim() ? "" : " err"}`}>Preview text
              <input value={preheader} maxLength={PREHEADER_MAX} onChange={(e) => setPreheader(e.target.value)} />
              <span className="em-count">{preheader.length} / {PREHEADER_MAX}</span>
              {!preheader.trim() && <span className="em-help e">Add preview text, or the inbox shows the first body line.</span>}
            </label>
          </div></div>

          <div className="card"><div className="hd"><h2>Body</h2><span className="em-help">Drag is Move up and Move down</span></div>
            <div className="bd" style={{ display: "grid", gap: 10 }}>
              {blocks.map((b) => (
                <div key={b.id} className={`em-block${pick === b.id ? " on" : ""}`}>
                  <div aria-hidden="true" style={{ color: "var(--n-400)", paddingTop: 8 }}>::</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="em-help" style={{ letterSpacing: ".08em", textTransform: "uppercase" }}>{b.kind}</div>
                    <div>{summary(b)}</div>
                    {pick === b.id && (
                      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                        {(b.kind === "heading" || b.kind === "text") && <label className="em-field">Text<textarea rows={b.kind === "heading" ? 2 : 4} value={b.text} onChange={(e) => patch(b.id, { text: e.target.value })} /></label>}
                        {b.kind === "image" && <>
                          <label className="em-field">Image address<input value={b.src} onChange={(e) => patch(b.id, { src: e.target.value })} /></label>
                          <label className="em-field">Alt text<input value={b.alt} onChange={(e) => patch(b.id, { alt: e.target.value })} /></label>
                        </>}
                        {b.kind === "button" && <>
                          <label className="em-field">Label<input value={b.label} onChange={(e) => patch(b.id, { label: e.target.value })} /></label>
                          <label className="em-field">Link<input value={b.href} onChange={(e) => patch(b.id, { href: e.target.value })} /></label>
                        </>}
                        {b.kind === "columns" && <>
                          <label className="em-field">Left<textarea rows={3} value={b.left} onChange={(e) => patch(b.id, { left: e.target.value })} /></label>
                          <label className="em-field">Right<textarea rows={3} value={b.right} onChange={(e) => patch(b.id, { right: e.target.value })} /></label>
                        </>}
                        {b.kind === "product" && <>
                          <label className="em-field">Title<input value={b.title} onChange={(e) => patch(b.id, { title: e.target.value })} /></label>
                          <label className="em-field">Link<input value={b.href} onChange={(e) => patch(b.id, { href: e.target.value })} /></label>
                          <label className="em-field">Text<textarea rows={2} value={b.text} onChange={(e) => patch(b.id, { text: e.target.value })} /></label>
                        </>}
                      </div>
                    )}
                  </div>
                  <details>
                    <summary className="btn sm" style={{ listStyle: "none" }} aria-label={`Actions for ${b.kind}`}>...</summary>
                    <div style={{ display: "grid", gap: 4, marginTop: 4 }}>
                      <button type="button" className="btn sm" onClick={() => setPick(pick === b.id ? null : b.id)}>{pick === b.id ? "Close" : "Edit"}</button>
                      <button type="button" className="btn sm" onClick={() => move(b.id, -1)}>Move up</button>
                      <button type="button" className="btn sm" onClick={() => move(b.id, 1)}>Move down</button>
                      <button type="button" className="btn sm dg" onClick={() => setBlocks((list) => list.filter((x) => x.id !== b.id))}>Remove</button>
                    </div>
                  </details>
                </div>
              ))}
              <div className="em-add" style={{ minHeight: 44 }}>Add block {KINDS.map((k) => <button key={k} type="button" className="btn" style={{ margin: 4, minHeight: 44 }} onClick={() => { const block = newBlock(k); setBlocks((list) => [...list, block]); setPick(block.id); }}>{k}</button>)}</div>
              <div className="em-lock"><b>Footer, locked.</b> Sender name, ABN, postal address, why you got this, and the unsubscribe link. Cannot be removed.</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="hd"><h2>Live preview</h2>
            <div className="seg" role="group" aria-label="Preview width">
              <button type="button" className={width === 620 ? "on" : ""} onClick={() => { setWidth(620); setMobilePreview(false); }}>Desktop</button>
              <button type="button" className={width === 375 ? "on" : ""} onClick={() => { setWidth(375); setMobilePreview(true); }}>Mobile</button>
            </div>
          </div>
          <div className="bd em-prev">
            <p className="em-help" style={{ marginTop: 0 }}><b>{preview.subject}</b> · {preview.from}</p>
            <iframe title="Email preview" sandbox="" srcDoc={preview.html} className="em-frame" style={{ maxWidth: mobilePreview ? 375 : 620 }} />
          </div>
        </div>
      </div>

      {testOpen && (
        <div className="em-modal" role="presentation">
          <div className="em-dialog" role="dialog" aria-modal="true" aria-labelledby="test-h">
            <h2 id="test-h">Send a test</h2>
            <p className="em-help">One address. Use a mailbox you can open. The sample name in the message is Sam.</p>
            <label className="em-field">Address<input value={testTo} onChange={(e) => setTestTo(e.target.value)} /></label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button type="button" className="btn" onClick={() => setTestOpen(false)}>Cancel</button>
              <button type="button" className="btn pri" disabled={busy === "test"} onClick={doTest}>{busy === "test" ? "Sending" : "Send test"}</button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="em-modal" role="presentation">
          <div className="em-dialog" role="dialog" aria-modal="true" aria-labelledby="go-h">
            <h2 id="go-h">{confirm === "send" ? "Send this broadcast now?" : "Schedule this broadcast?"}</h2>
            <div className="em-kv">
              <span>Campaign</span><b>{name}</b>
              <span>From</span><b>{fromName}, {detail?.fromEmail || "hello@sunder.com.au"}</b>
              <span>Audience</span><b className="num">{audience.toLocaleString("en-AU")} confirmed</b>
              <span>Daily cap</span><span>{capLine}</span>
              <span>Test sent</span><span>{testedAt ? `Yes, ${new Date(testedAt).toLocaleTimeString("en-AU", { timeZone: "Australia/Brisbane", hour: "numeric", minute: "2-digit" })}` : "No"}</span>
            </div>
            {confirm === "schedule" && <label className="em-field">Brisbane time<input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></label>}
            <div className="em-alert warn">Once sending starts you can pause it, but emails already sent cannot be recalled.</div>
            {needsTyped ? (
              <label className="em-field" style={{ marginTop: 12 }}>Over 500 recipients: type SEND to confirm
                <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" aria-label="Type SEND to confirm" />
              </label>
            ) : <p className="em-help" style={{ marginTop: 12 }}>500 recipients or fewer: no typed confirm needed.</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button type="button" className="btn" onClick={() => setConfirm(null)}>Cancel</button>
              {confirm === "send" ? (
                <button type="button" className="btn pri" disabled={!!busy || (needsTyped && typed !== "SEND")} onClick={doSend}>{busy === "send" ? "Queuing" : `Send to ${audience.toLocaleString("en-AU")}`}</button>
              ) : (
                <button type="button" className="btn pri" disabled={!!busy || !when || (needsTyped && typed !== "SEND")} onClick={doSchedule}>Schedule</button>
              )}
            </div>
          </div>
        </div>
      )}
      <p style={{ marginTop: 16 }}><Link href="/saabai-admin/email" className="btn">Back to campaigns</Link></p>
    </div>
  );
}
