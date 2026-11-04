"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { documentHtml, newBlock, type Block } from "../../../lib/email/blocks";
import { SUNDER_FROM_NAME, SUNDER_IDENTITY } from "../../../lib/email/constants";
import { cleanFromName } from "../../../lib/email/rules";
import { PREHEADER_MAX, SEND_CONFIRM_OVER, SUBJECT_MAX, contentHash } from "../../../lib/email/gates";
import { renderMarketingEmail } from "../../../lib/email/message";
import { SUNDER_MERGE_FIELDS, SUNDER_SAMPLE_VALUES, insertToken, mergeTagIssues } from "../../../lib/email/merge-tags";
import { mergeToken } from "../../../lib/personalise";

type Detail = {
  ok: true;
  campaign: { id: string; name: string; subject: string; preheader: string; blocks: Block[]; fromName: string; status: string; testHash: string | null; testSentAt: string | null };
  fromEmail: string;
  defaultFromName?: string;
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
  const [fromName, setFromName] = useState(SUNDER_FROM_NAME);
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
  const subjectRef = useRef<HTMLInputElement | null>(null);

  function insertInto(el: HTMLInputElement | HTMLTextAreaElement | null, value: string, set: (v: string) => void, token: string) {
    const r = insertToken(value, token, el?.selectionStart ?? null, el?.selectionEnd ?? null);
    set(r.value);
    requestAnimationFrame(() => { if (el) { el.focus(); el.setSelectionRange(r.caret, r.caret); } });
  }

  useEffect(() => {
    if (!campaignId) {
      fetch("/api/admin/email", { cache: "no-store" }).then((r) => r.json()).then((j) => { if (j?.ok && j.fromName) setFromName(cleanFromName(j.fromName)); }).catch(() => {}).finally(() => { loaded.current = true; });
      return;
    }
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
        setFromName(cleanFromName(j.campaign.fromName || j.defaultFromName || ""));
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
    values: SUNDER_SAMPLE_VALUES,
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

  const tagIssues = mergeTagIssues([subject, preheader, ...blocks.flatMap((b) => Object.values(b).filter((v): v is string => typeof v === "string"))]);

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
            <button type="button" className="btn" disabled={!unlocked || !!busy || tagIssues.length > 0} aria-describedby="send-lock" onClick={() => { setTyped(""); setConfirm("schedule"); }}>Schedule</button>
            <button type="button" className="btn pri" disabled={!unlocked || !!busy || tagIssues.length > 0} aria-describedby="send-lock" onClick={() => { setTyped(""); setConfirm("send"); }}>Send now</button>
          </div>
          <p id="send-lock" className="em-help" style={{ textAlign: "right" }}>{tagIssues.length ? "Fix the field tags below to unlock sending." : unlocked ? "A test of this version was sent." : "Send a test first to unlock Send now and Schedule."}</p>
        </div>
      </div>
      {banner && <div className="em-alert info" role="status" style={{ margin: "12px 0" }}>{banner}</div>}
      {tagIssues.length > 0 && <div className="em-alert warn" role="alert" style={{ marginBottom: 12 }}><b>Unknown field {tagIssues.length === 1 ? "tag" : "tags"}:</b> {tagIssues.map((t) => <code key={t} className="em-tag">{t}</code>)}. These would be left blank for subscribers. Use Insert field to add a supported tag.</div>}
      {detail?.paused && <div className="em-alert warn" style={{ marginBottom: 12 }}>Sending is paused. Tests and sends stay locked.</div>}

      <div className="em-split">
        <div style={{ display: "grid", gap: 16 }}>
          <div className="card"><div className="bd" style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><b>Audience</b><span className="em-help">Required</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span>Waitlist, confirmed only</span><b className="num">{audience.toLocaleString("en-AU")} recipients</b></div>
            <p className="em-help">Excludes {detail?.unsubscribed || 0} unsubscribed and {detail?.suppressed || 0} suppressed. {detail?.pending || 0} pending confirmation are not in this audience.</p>
            <label className="em-field">Name<input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /></label>
            <div className="em-field">
              <div className="em-labelrow"><label htmlFor="em-subject">Subject</label><InsertField onPick={(t) => insertInto(subjectRef.current, subject, setSubject, t)} /></div>
              <input id="em-subject" ref={subjectRef} value={subject} maxLength={SUBJECT_MAX} aria-invalid={subject.length > SUBJECT_MAX} onChange={(e) => setSubject(e.target.value)} />
              <span className="em-count">{subject.length} / {SUBJECT_MAX}</span>
            </div>
            <label className="em-field">From name
              <input value={fromName} maxLength={80} onChange={(e) => setFromName(e.target.value)} onBlur={() => setFromName(cleanFromName(fromName))} />
              <span className="em-help">Inbox shows: {cleanFromName(fromName)} &lt;{detail?.fromEmail || "hello@sunder.com.au"}&gt;</span>
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
                        {(b.kind === "heading" || b.kind === "text") && <TagField id={`${b.id}-text`} label="Text" rows={b.kind === "heading" ? 2 : 4} value={b.text} onChange={(v) => patch(b.id, { text: v })} insert={insertInto} />}
                        {b.kind === "image" && <>
                          <label className="em-field">Image address<input value={b.src} onChange={(e) => patch(b.id, { src: e.target.value })} /></label>
                          <label className="em-field">Alt text<input value={b.alt} onChange={(e) => patch(b.id, { alt: e.target.value })} /></label>
                        </>}
                        {b.kind === "button" && <>
                          <TagField id={`${b.id}-label`} label="Label" value={b.label} onChange={(v) => patch(b.id, { label: v })} insert={insertInto} />
                          <label className="em-field">Link<input value={b.href} onChange={(e) => patch(b.id, { href: e.target.value })} /></label>
                        </>}
                        {b.kind === "columns" && <>
                          <TagField id={`${b.id}-left`} label="Left" rows={3} value={b.left} onChange={(v) => patch(b.id, { left: v })} insert={insertInto} />
                          <TagField id={`${b.id}-right`} label="Right" rows={3} value={b.right} onChange={(v) => patch(b.id, { right: v })} insert={insertInto} />
                        </>}
                        {b.kind === "product" && <>
                          <TagField id={`${b.id}-title`} label="Title" value={b.title} onChange={(v) => patch(b.id, { title: v })} insert={insertInto} />
                          <label className="em-field">Link<input value={b.href} onChange={(e) => patch(b.id, { href: e.target.value })} /></label>
                          <TagField id={`${b.id}-ptext`} label="Text" rows={2} value={b.text} onChange={(v) => patch(b.id, { text: v })} insert={insertInto} />
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
            <p className="em-help" style={{ marginTop: -4 }}>Field tags show sample values (First name: Sam).</p>
            <iframe title="Email preview" sandbox="" srcDoc={preview.html} className="em-frame" style={{ maxWidth: mobilePreview ? 375 : 620 }} />
          </div>
        </div>
      </div>

      {testOpen && (
        <div className="em-modal" role="presentation">
          <div className="em-dialog" role="dialog" aria-modal="true" aria-labelledby="test-h">
            <h2 id="test-h">Send a test</h2>
            <p className="em-help">One address. Use a mailbox you can open. Field tags use sample values, so First name shows as Sam.</p>
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

type FieldEl = HTMLInputElement | HTMLTextAreaElement;
type Insert = (el: FieldEl | null, value: string, set: (v: string) => void, token: string) => void;

function InsertField({ onPick }: { onPick: (token: string) => void }) {
  const ref = useRef<HTMLDetailsElement | null>(null);
  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, []);
  return (
    <details className="em-insert" ref={ref}>
      <summary aria-label="Insert a personalisation field"><span aria-hidden="true">{"{ }"}</span> Insert field</summary>
      <div className="em-insert-menu" role="menu">
        {SUNDER_MERGE_FIELDS.map((f) => (
          <button key={f.key} type="button" role="menuitem" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(mergeToken(f)); if (ref.current) ref.current.open = false; }}>
            <span className="em-insert-name">{f.label}</span>
            <code className="em-tag">{mergeToken(f)}</code>
          </button>
        ))}
        <p className="em-insert-hint">Text after the | is the fallback, used when a subscriber has no {SUNDER_MERGE_FIELDS[0]?.label.toLowerCase()}. Edit it to suit, e.g. {"{{firstName|mate}}"}.</p>
      </div>
    </details>
  );
}

function TagField({ id, label, value, rows, onChange, insert }: { id: string; label: string; value: string; rows?: number; onChange: (v: string) => void; insert: Insert }) {
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="em-field">
      <div className="em-labelrow"><label htmlFor={id}>{label}</label><InsertField onPick={(t) => insert(rows ? areaRef.current : inputRef.current, value, onChange, t)} /></div>
      {rows ? (
        <textarea id={id} ref={areaRef} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
