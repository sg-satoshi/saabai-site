"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import FaqBulkAdd from "./FaqBulkAdd";
import { Button } from "../ui/Button";
import InsightsPanel from "../../components/chatbot/InsightsPanel";
import { LIMITS, PLAN_LABEL, POSITIONS, TONE_LABEL, TONES, canRemovePoweredBy, isHex, poweredByVisible, validateContent, validateSkin, type Faq, type Plan, type PublicWidgetConfig, type Tone } from "../../../lib/chatbot/core";
import { appendFaqs } from "../../../lib/chatbot/faq-import";
import { DEFAULT_ENGAGE, ENGAGE_LIMITS, validateEngage, toPublicEngage, type EngageConfig } from "../../../lib/chatbot/engage";
import { GOAL_LABEL, GOAL_LIMITS, validateGoal, toPublicGoal, type GoalConfig, type GoalField, type GoalType } from "../../../lib/chatbot/goal";
import { contrast } from "../../../lib/announce/core";
import { chatbotHistoryPath } from "../../../lib/chatbot/paths";
import { installSnippet } from "../../../lib/chatbot/seed-shared";
import "./chatbots.css";

export type EditorRow = {
  slug: string; name: string; plan: string;
  domains?: string[];
  engine?: "platform" | "bespoke";
  enabled?: boolean | null;
  skin: { showPoweredBy?: boolean };
  resolved: PublicWidgetConfig;
  tone: Tone; knowledge: { facts: string; faqs: Faq[] };
  goal?: GoalConfig | null; goalSource?: "saved" | "default" | "none"; engage?: EngageConfig;
  canRemovePoweredBy?: boolean;
  usage?: { conversations: number };
  cap?: { cap: number };
  lastChange?: { by?: string; at?: string };
  botLock?: { locked: boolean; by?: string; at?: string };
  leadCapture?: boolean;
};

type Draft = {
  goal: GoalConfig;
  engage: EngageConfig;
  botName: string; greeting: string; avatarUrl: string;
  primary: string; accent: string; bg: string; text: string;
  position: "left" | "right"; showPoweredBy: boolean;
  tone: Tone; facts: string; faqs: Faq[];
};

const TABS = [
  { id: "goal", label: "Goal" },
  { id: "conversation", label: "Conversation" },
  { id: "features", label: "Features and nudges" },
  { id: "knowledge", label: "Knowledge" },
  { id: "look", label: "Look" },
  { id: "results", label: "Results and install" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const GOAL_CARDS: { id: GoalType; title: string; blurb: string }[] = [
  { id: "capture_details", title: "Capture details", blurb: "Get a name and the best way to reach them." },
  { id: "quote", title: "Give a quote", blurb: "Help them get a quote from the team." },
  { id: "book_call", title: "Book a call", blurb: "Send them to the booking link." },
  { id: "call_back", title: "Call back", blurb: "Take a call-back request for the team." },
  { id: "sell_product", title: "Sell a product", blurb: "Help them choose and go to buy." },
  { id: "custom", title: "Custom goal", blurb: "Describe the goal in plain words." },
];

const EMPTY_GOAL: GoalConfig = { primary: "none", fallback: "none", questions: [], stages: [], quickReplies: [] };

function fromRow(row: EditorRow): Draft {
  return {
    goal: row.goal ?? EMPTY_GOAL,
    engage: row.engage ?? DEFAULT_ENGAGE,
    botName: row.resolved?.botName ?? "",
    greeting: row.resolved?.greeting ?? "",
    avatarUrl: row.resolved?.avatarUrl ?? "",
    primary: row.resolved?.primary ?? "#0b5c78",
    accent: row.resolved?.accent ?? "#62c5d1",
    bg: row.resolved?.bg ?? "#fbfbfd",
    text: row.resolved?.text ?? "#13152a",
    position: row.resolved?.position ?? "right",
    showPoweredBy: row.skin?.showPoweredBy !== false,
    tone: row.tone ?? "friendly",
    facts: row.knowledge?.facts ?? "",
    faqs: row.knowledge?.faqs ?? [],
  };
}

function brisbaneStamp(iso?: string) {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const s = new Date(t + 10 * 3600_000).toISOString();
  const [, m, d] = s.slice(0, 10).split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hm = s.slice(11, 16);
  const [hh, mm] = hm.split(":").map(Number);
  const ap = hh >= 12 ? "pm" : "am";
  return `${Number(d)} ${months[Number(m) - 1]}, ${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${ap} Brisbane`;
}

type Change = { tab: TabId; label: string; id: string };

function changes(a: Draft, b: Draft): Change[] {
  const out: Change[] = [];
  const add = (tab: TabId, label: string, id: string, same: boolean) => { if (!same) out.push({ tab, label, id }); };
  const g = (k: keyof GoalConfig, label: string, id: string) => add("goal", label, id, JSON.stringify(a.goal[k] ?? "") === JSON.stringify(b.goal[k] ?? ""));
  g("primary", "Main goal", "f-primary");
  g("primaryCustom", "Custom goal", "f-primaryCustom");
  add("goal", "Main button label", "f-cta-label", (a.goal.cta?.label ?? "") === (b.goal.cta?.label ?? ""));
  add("goal", "Booking link", "f-cta-url", (a.goal.cta?.url ?? "") === (b.goal.cta?.url ?? ""));
  add("goal", "Tone", "f-tone", a.tone === b.tone);
  g("persona", "Persona and tone notes", "f-persona");
  g("fallback", "Fallback goal", "f-fallback");
  g("fallbackCustom", "Fallback custom goal", "f-fallbackCustom");
  add("goal", "Fallback button", "f-fallback-label", (a.goal.fallbackCta?.label ?? "") === (b.goal.fallbackCta?.label ?? ""));
  add("goal", "Fallback link", "f-fallback-url", (a.goal.fallbackCta?.url ?? "") === (b.goal.fallbackCta?.url ?? ""));
  g("handoff", "Hand-over rule", "f-handoff");
  add("conversation", "Quick replies", "f-replies", JSON.stringify(a.goal.quickReplies) === JSON.stringify(b.goal.quickReplies));
  add("conversation", "Welcome back", "f-return", (a.engage.returnGreeting ?? "") === (b.engage.returnGreeting ?? ""));
  add("conversation", "Questions", "f-questions", JSON.stringify(a.goal.questions) === JSON.stringify(b.goal.questions));
  add("conversation", "Stages", "f-stages", JSON.stringify(a.goal.stages) === JSON.stringify(b.goal.stages));
  add("conversation", "Easy question first", "f-micro", a.engage.microCommit === b.engage.microCommit);
  add("conversation", "Handle worries", "f-objections", a.engage.objections === b.engage.objections);
  add("conversation", "Free offer", "f-offer-label", JSON.stringify(a.engage.freeOffer ?? null) === JSON.stringify(b.engage.freeOffer ?? null));
  add("conversation", "Current offer", "f-current-offer", JSON.stringify(a.engage.offer ?? null) === JSON.stringify(b.engage.offer ?? null));
  add("conversation", "Reviews", "f-reviews", JSON.stringify(a.engage.testimonials) === JSON.stringify(b.engage.testimonials));
  add("features", "End chat", "f-end", a.engage.endChat === b.engage.endChat);
  add("features", "Email a copy", "f-email", a.engage.emailCopy === b.engage.emailCopy);
  add("features", "Transcripts", "f-transcripts", a.engage.transcripts === b.engage.transcripts);
  add("features", "Page openers", "f-openers", JSON.stringify(a.engage.openers) === JSON.stringify(b.engage.openers));
  add("features", "Idle nudge", "f-idle", a.engage.idleSeconds === b.engage.idleSeconds);
  add("features", "Scroll nudge", "f-scroll", a.engage.scrollPercent === b.engage.scrollPercent);
  add("features", "Exit nudge", "f-exit", a.engage.exitIntent === b.engage.exitIntent);
  add("features", "Google review", "f-greview", JSON.stringify(a.engage.reviews) === JSON.stringify(b.engage.reviews));
  add("knowledge", "Business facts", "f-facts", a.facts === b.facts);
  add("knowledge", "Approved answers", "f-faqs", JSON.stringify(a.faqs) === JSON.stringify(b.faqs));
  add("look", "Bot name", "f-botName", a.botName === b.botName);
  add("look", "Greeting", "f-greeting", a.greeting === b.greeting);
  add("look", "Avatar", "f-avatar", a.avatarUrl === b.avatarUrl);
  add("look", "Position", "f-position", a.position === b.position);
  add("look", "Colours", "f-primary", a.primary === b.primary && a.accent === b.accent && a.bg === b.bg && a.text === b.text);
  add("look", "Powered by", "f-powered", a.showPoweredBy === b.showPoweredBy);
  return out;
}

function tabOfError(key: string): TabId {
  if (/^(primary|fallback|cta|persona|handoff|tone)/.test(key)) return "goal";
  if (/^(questions|stages|quick|return|freeOffer|offer|testimonial|micro|objection)/.test(key)) return "conversation";
  if (/^(opener|idle|scroll|reviews|end|email|transcript)/.test(key)) return "features";
  if (/^(facts|faq)/.test(key)) return "knowledge";
  return "look";
}

function Shell({ mode }: { mode: "admin" | "client" }) {
  return <span hidden data-testid={`shell-${mode}`} />;
}

export default function ChatbotEditor({ row, onSaved, mode = "admin", readOnly = false, plans = [], kill = false }: {
  row: EditorRow; onSaved: () => Promise<void> | void; mode?: "admin" | "client"; readOnly?: boolean;
  plans?: { key: string; label: string; cap: number }[]; kill?: boolean;
}) {
  const lockedBot = mode === "client" && !!row.botLock?.locked;
  const off = readOnly || lockedBot;
  const showResults = mode === "admin";
  const [draft, setDraft] = useState<Draft>(() => fromRow(row));
  const [saved, setSaved] = useState<Draft>(() => fromRow(row));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<TabId>("goal");
  const [busy, setBusy] = useState(false);
  const [bar, setBar] = useState<"clean" | "dirty" | "bad" | "saving" | "saved">("clean");
  const [toast, setToast] = useState("");
  const [fail, setFail] = useState<{ tab: TabId; text: string; id?: string } | null>(null);
  const [width, setWidth] = useState<"desktop" | "mobile">("desktop");
  const [back, setBack] = useState<"light" | "dark" | "photo">("light");
  const [showOff, setShowOff] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [reply, setReply] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const changed = useMemo(() => changes(saved, draft), [saved, draft]);
  const dirty = changed.length > 0 && !off;

  useEffect(() => {
    const next = fromRow(row);
    setDraft(next);
    setSaved(next);
  }, [row.slug, row.lastChange?.at, row.botLock?.locked]);

  useEffect(() => {
    const read = () => {
      let h = window.location.hash.replace("#", "");
      if (h === "editor") { window.history.replaceState(null, "", `${location.pathname}${location.search}#goal`); h = "goal"; }
      if (h === "plan") { window.history.replaceState(null, "", `${location.pathname}${location.search}#results`); h = "results"; }
      const known = TABS.some((t) => t.id === h);
      const next = !known ? "goal" : h === "results" && !showResults ? "goal" : (h as TabId);
      setTab(next);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [showResults]);

  useEffect(() => {
    if (!dirty) return;
    const leave = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (!href || href.startsWith("#")) return;
      if (!window.confirm("You have unsaved changes. Leave this page?")) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("beforeunload", leave);
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", leave); document.removeEventListener("click", click, true); };
  }, [dirty]);

  const pub: PublicWidgetConfig = useMemo(() => ({
    ...row.resolved,
    botName: draft.botName.trim() || row.name,
    greeting: draft.greeting.trim() || row.resolved.greeting,
    avatarUrl: draft.avatarUrl.trim(),
    primary: isHex(draft.primary) ? draft.primary : row.resolved.primary,
    accent: isHex(draft.accent) ? draft.accent : row.resolved.accent,
    bg: isHex(draft.bg) ? draft.bg : row.resolved.bg,
    text: isHex(draft.text) ? draft.text : row.resolved.text,
    position: draft.position,
    poweredBy: poweredByVisible(row.plan as Plan, draft.showPoweredBy),
    goal: toPublicGoal(draft.goal),
    engage: toPublicEngage(draft.engage, { leadCapture: !!row.leadCapture }),
  }), [draft, row]);

  function push() { frame.current?.contentWindow?.postMessage({ type: "saabai-chat-config", config: pub, open: true, showOff }, "*"); }
  useEffect(() => {
    const on = (e: MessageEvent) => { if (e.source === frame.current?.contentWindow && e.data?.type === "saabai-chat-ready") { ready.current = true; push(); } };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [pub, showOff]);
  useEffect(() => { if (ready.current) push(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pub, showOff]);

  function go(id: TabId) {
    const url = `${location.pathname}${location.search}#${id}`;
    window.history.replaceState(null, "", url);
    setTab(id);
  }
  function focusField(id: string, dest: TabId) {
    go(dest);
    setTimeout(() => document.getElementById(id)?.focus(), 40);
  }

  function setGoal<K extends keyof GoalConfig>(k: K, v: GoalConfig[K]) {
    setDraft((d) => ({ ...d, goal: { ...d.goal, [k]: v } }));
    setBar("dirty");
  }
  function setEngage<K extends keyof EngageConfig>(k: K, v: EngageConfig[K]) {
    setDraft((d) => ({ ...d, engage: { ...d.engage, [k]: v } }));
    setBar("dirty");
  }
  function setLook<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
    setBar("dirty");
  }

  const fieldLocked = (kind: "goal" | "engage", key: string) => {
    if (mode !== "client" || off) return off;
    if (kind === "goal") return (draft.goal.locked ?? []).includes(key as GoalField);
    return (draft.engage.locked ?? []).includes(key as never);
  };

  async function save() {
    const skin = { botName: draft.botName, greeting: draft.greeting, avatarUrl: draft.avatarUrl, primary: draft.primary, accent: draft.accent, bg: draft.bg, text: draft.text, position: draft.position, ...(canRemovePoweredBy(row.plan as Plan) ? { showPoweredBy: draft.showPoweredBy } : {}) };
    const content = { tone: draft.tone, facts: draft.facts, faqs: draft.faqs };
    const g = validateGoal(draft.goal);
    const e = validateEngage(draft.engage);
    const sk = validateSkin(skin);
    const ct = validateContent(content);
    const fields: Record<string, string> = { ...(g.ok ? {} : g.errors), ...(e.ok ? {} : e.errors), ...(sk.ok ? {} : sk.errors), ...(ct.ok ? {} : ct.errors) };
    if (Object.keys(fields).length) {
      setErrors(fields);
      const key = Object.keys(fields)[0];
      const dest = tabOfError(key);
      setFail({ tab: dest, text: `Can't save yet. Fix ${Object.keys(fields).length} field on ${TABS.find((t) => t.id === dest)?.label}: ${fields[key]}`, id: key });
      setBar("bad");
      return;
    }
    setErrors({});
    setFail(null);
    setBusy(true);
    setBar("saving");
    const goalChanged = JSON.stringify(draft.goal) !== JSON.stringify(saved.goal);
    const engageChanged = JSON.stringify(draft.engage) !== JSON.stringify(saved.engage);
    const restChanged = JSON.stringify({ ...draft, goal: saved.goal, engage: saved.engage }) !== JSON.stringify({ ...saved, goal: saved.goal, engage: saved.engage });
    if (mode === "client") {
      const r = await fetch("/api/portal/chatbot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal: draft.goal, engage: draft.engage, skin, content }) });
      const j = await r.json().catch(() => ({}));
      setBusy(false);
      if (!r.ok) { setErrors(j.fields ?? {}); setFail({ tab: "goal", text: j.error || "Couldn't save." }); setBar("bad"); return; }
      setSaved(draft);
      setBar("saved");
      setToast("Saved. The live widget picks it up within about a minute.");
      setTimeout(() => setToast(""), 3000);
      await onSaved();
      return;
    }
    const posts: { tab: TabId; body: Record<string, unknown> }[] = [];
    if (goalChanged) posts.push({ tab: "goal", body: { action: "save_goal", goal: draft.goal } });
    if (engageChanged) posts.push({ tab: "conversation", body: { action: "save_engage", engage: draft.engage } });
    if (restChanged) posts.push({ tab: "look", body: { action: "save_all", skin, content } });
    let failed: { tab: TabId; text: string } | null = null;
    for (const p of posts) {
      const r = await fetch("/api/admin/chatbots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: row.slug, ...p.body }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { failed = { tab: p.tab, text: j.error || "Couldn't save." }; setErrors(j.fields ?? {}); break; }
    }
    setBusy(false);
    if (failed) { setFail(failed); setBar("bad"); await onSaved(); return; }
    setSaved(draft);
    setBar("saved");
    setToast("Saved. The live widget picks it up within about a minute.");
    setTimeout(() => setToast(""), 3000);
    await onSaved();
  }

  const err = (k: string) => errors[k];
  const isDirty = (id: string) => changed.some((c) => c.id === id);
  const tabErrors = (id: TabId) => Object.keys(errors).filter((k) => tabOfError(k) === id).length;
  const tabDirty = (id: TabId) => changed.some((c) => c.tab === id);
  const low = (fg: string, bgc: string) => isHex(fg) && isHex(bgc) && contrast(fg, bgc) < 4.5;
  const passes = !low(draft.text, draft.bg) && !low("#ffffff", draft.primary);
  const canHide = row.canRemovePoweredBy ?? canRemovePoweredBy(row.plan as Plan);
  const bgStyle = back === "dark" ? "var(--navy-800)" : back === "photo" ? "linear-gradient(135deg, var(--teal-300), var(--n-100))" : "var(--n-50)";
  const tabs = TABS.filter((t) => showResults || t.id !== "results");
  const names = [...new Set(changed.map((c) => c.tab))].map((id) => TABS.find((t) => t.id === id)?.label).filter(Boolean).join(", ");

  const ro = (locked: boolean) => off || locked;
  const inputCls = (locked: boolean) => ro(locked) ? "fi ro" : "";

  return (
    <div className="cbed" data-testid={`editor-${row.slug}`}>
      {mode === "admin" ? <Shell mode="admin" /> : <Shell mode="client" />}
      {mode === "client" && (
        <header className="cbed-head">
          <div className="cbed-top">
            <div>
              <div className="cbed-title">
                <h1 className="au-title">Your chatbot</h1>
                <span className={`onoff ${row.enabled === false ? "off" : "on"}`}><i />{row.enabled === false ? "OFF" : "ON"}</span>
                {lockedBot && <span className="tag">Locked by Saabai</span>}
              </div>
              <p className="cbed-meta">{row.name} · Bot: {draft.botName || row.resolved.botName} · {lockedBot ? "Managed by Saabai" : "You can edit these settings"}</p>
            </div>
            <div className="cbed-actions">
              <Button variant="sec" onClick={() => setShowHistory((v) => !v)}>Chat history</Button>
            </div>
          </div>
          {lockedBot && (
            <div className="lockbanner" role="status" style={{ marginTop: 12 }}>
              <p><strong>This chatbot is managed by Saabai.</strong> Contact us to make changes.</p>
              <a className="btn sec sm" href="mailto:hello@saabai.ai">Contact Saabai</a>
            </div>
          )}
        </header>
      )}

      <div className={mode === "client" ? "cbed-head" : ""} style={mode === "admin" ? { background: "#fff", padding: "0 32px" } : undefined}>
        <div className="tabs cbed-tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => go(t.id)}>
              {t.label}
              {t.id === "knowledge" && <span className="num">{draft.faqs.length}</span>}
              {tabDirty(t.id) && <i className="dot-tab" aria-label="Unsaved changes" />}
              {tabErrors(t.id) > 0 && <span className="err-tab">{tabErrors(t.id)}</span>}
            </button>
          ))}
          {mode === "admin" && <Button variant="sec" size="sm" className="cbed-preview-btn" onClick={() => setPreviewOpen(true)} style={{ marginLeft: "auto", alignSelf: "center" }}>Preview</Button>}
        </div>
      </div>

      {showHistory && mode === "client" && <div style={{ padding: "16px 32px" }}><InsightsPanel endpoint="/api/portal/chatbot/insights" /></div>}

      <div className="cbed-grid">
        <div className="cbed-main">
          {tab === "goal" && (
            <div id="goal">
              <section className="au-card">
                <div className="au-card-hd"><div><div className="step">Step 1</div><h2 className="au-card-h">What should the chatbot achieve?</h2><p className="au-card-desc">Everything else in this editor works towards this goal.</p></div></div>
                <div className="au-card-bd">
                  <div className="goals" role="radiogroup" aria-label="Main goal">
                    {GOAL_CARDS.map((c) => (
                      <label key={c.id} className={`goal${draft.goal.primary === c.id ? " on" : ""}`}>
                        <input id={c.id === "call_back" ? "f-primary" : undefined} type="radio" name="primary" value={c.id} checked={draft.goal.primary === c.id} disabled={ro(fieldLocked("goal", "primary"))} aria-label={GOAL_LABEL[c.id]} onChange={() => setGoal("primary", c.id)} />
                        <b>{c.title}</b>{c.blurb}
                      </label>
                    ))}
                  </div>
                  {draft.goal.primary === "custom" && (
                    <Field label="Custom goal" id="f-primaryCustom" count={(draft.goal.primaryCustom ?? "").length} max={GOAL_LIMITS.custom} error={err("primaryCustom")} dirty={isDirty("f-primaryCustom")}>
                      <input id="f-primaryCustom" className={inputCls(fieldLocked("goal", "primary"))} maxLength={GOAL_LIMITS.custom} readOnly={ro(fieldLocked("goal", "primary"))} value={draft.goal.primaryCustom ?? ""} onChange={(e) => setGoal("primaryCustom", e.target.value)} aria-describedby={err("primaryCustom") ? "f-primaryCustom-err" : undefined} />
                    </Field>
                  )}
                  <button type="button" className="nonegoal" disabled={ro(fieldLocked("goal", "primary"))} onClick={() => setGoal("primary", "none")}>No goal (answer questions only)</button>
                </div>
              </section>
              <section className="au-card">
                <div className="au-card-hd"><div><div className="step">Step 2</div><h2 className="au-card-h">Main button</h2><p className="au-card-desc">The button the bot offers when the visitor is ready.</p></div></div>
                <div className="au-card-bd two">
                  <Field label="Main button label" id="f-cta-label" count={(draft.goal.cta?.label ?? "").length} max={GOAL_LIMITS.ctaLabel} error={err("ctaLabel")} dirty={isDirty("f-cta-label")} hint="Shown when the visitor is ready. Keep it short.">
                    <input id="f-cta-label" className={inputCls(fieldLocked("goal", "cta"))} readOnly={ro(fieldLocked("goal", "cta"))} maxLength={GOAL_LIMITS.ctaLabel} value={draft.goal.cta?.label ?? ""} onChange={(e) => setGoal("cta", { label: e.target.value, url: draft.goal.cta?.url ?? "" })} />
                  </Field>
                  <Field label="Booking or call-back link" id="f-cta-url" error={err("ctaUrl")} dirty={isDirty("f-cta-url")} hint="https://, mailto: or tel:. If empty, the bot offers the fallback button.">
                    <input id="f-cta-url" className={inputCls(fieldLocked("goal", "cta"))} readOnly={ro(fieldLocked("goal", "cta"))} value={draft.goal.cta?.url ?? ""} onChange={(e) => setGoal("cta", { label: draft.goal.cta?.label ?? "", url: e.target.value })} aria-describedby={err("ctaUrl") ? "f-cta-url-err" : undefined} />
                  </Field>
                </div>
              </section>
              <section className="au-card">
                <div className="au-card-hd"><div><div className="step">Step 3</div><h2 className="au-card-h">Tone</h2><p className="au-card-desc">How it talks. Applies to every reply.</p></div></div>
                <div className="au-card-bd two">
                  <Field label="Tone" id="f-tone" error={err("tone")} dirty={isDirty("f-tone")} hint="How the bot sounds in every reply.">
                    <select id="f-tone" className={`fi ${inputCls(false)}`} disabled={off} value={draft.tone} onChange={(e) => setLook("tone", e.target.value as Tone)}>{TONES.map((t) => <option key={t} value={t}>{TONE_LABEL[t]}</option>)}</select>
                  </Field>
                  <Field label="Persona and tone notes (optional)" id="f-persona" count={(draft.goal.persona ?? "").length} max={GOAL_LIMITS.persona} error={err("persona")} dirty={isDirty("f-persona")}>
                    <textarea id="f-persona" className={inputCls(fieldLocked("goal", "persona"))} readOnly={ro(fieldLocked("goal", "persona"))} maxLength={GOAL_LIMITS.persona} value={draft.goal.persona ?? ""} onChange={(e) => setGoal("persona", e.target.value)} />
                  </Field>
                </div>
              </section>
              <section className="au-card">
                <div className="au-card-hd"><div><div className="step">Step 4</div><h2 className="au-card-h">Fallback and hand-over</h2><p className="au-card-desc">{"What happens when the main goal doesn't fit."}</p></div></div>
                <div className="au-card-bd">
                  <div className="two">
                    <Field label="Fallback goal" id="f-fallback" error={err("fallback")} dirty={isDirty("f-fallback")} hint="Used when the visitor isn't ready for the main goal.">
                      <select id="f-fallback" className={`fi ${inputCls(fieldLocked("goal", "fallback"))}`} disabled={ro(fieldLocked("goal", "fallback"))} value={draft.goal.fallback} onChange={(e) => setGoal("fallback", e.target.value as GoalType)}>{(Object.keys(GOAL_LABEL) as GoalType[]).map((g) => <option key={g} value={g}>{GOAL_LABEL[g]}</option>)}</select>
                    </Field>
                    <Field label="Fallback button and link" id="f-fallback-label" error={err("fallbackCtaLabel") || err("fallbackCtaUrl")} dirty={isDirty("f-fallback-label")} hint="Opens the details form in the chat.">
                      <input id="f-fallback-label" className={inputCls(fieldLocked("goal", "fallbackCta"))} readOnly={ro(fieldLocked("goal", "fallbackCta"))} placeholder="Button label" value={draft.goal.fallbackCta?.label ?? ""} onChange={(e) => setGoal("fallbackCta", { label: e.target.value, url: draft.goal.fallbackCta?.url ?? "" })} />
                      <input id="f-fallback-url" style={{ marginTop: 8 }} className={inputCls(fieldLocked("goal", "fallbackCta"))} readOnly={ro(fieldLocked("goal", "fallbackCta"))} placeholder="https://, mailto: or tel:" value={draft.goal.fallbackCta?.url ?? ""} onChange={(e) => setGoal("fallbackCta", { label: draft.goal.fallbackCta?.label ?? "", url: e.target.value })} />
                    </Field>
                  </div>
                  {draft.goal.fallback === "custom" && <Field label="Describe the fallback goal" id="f-fallbackCustom" error={err("fallbackCustom")} dirty={isDirty("f-fallbackCustom")}><input id="f-fallbackCustom" maxLength={GOAL_LIMITS.custom} readOnly={ro(fieldLocked("goal", "fallback"))} value={draft.goal.fallbackCustom ?? ""} onChange={(e) => setGoal("fallbackCustom", e.target.value)} /></Field>}
                  <Field label="When to hand over to your team" id="f-handoff" count={(draft.goal.handoff ?? "").length} max={GOAL_LIMITS.handoff} error={err("handoff")} dirty={isDirty("f-handoff")} hint="Plain words only. Text that tries to give the AI new instructions is rejected.">
                    <textarea id="f-handoff" className={inputCls(fieldLocked("goal", "handoff"))} readOnly={ro(fieldLocked("goal", "handoff"))} maxLength={GOAL_LIMITS.handoff} value={draft.goal.handoff ?? ""} onChange={(e) => setGoal("handoff", e.target.value)} />
                  </Field>
                </div>
              </section>
            </div>
          )}

          {tab === "conversation" && (
            <div>
              <section className="au-card">
                <div className="au-card-hd"><div><h2 className="au-card-h">Opening</h2><p className="au-card-desc">What visitors see first.</p></div></div>
                <div className="au-card-bd">
                  <Field label="Quick reply buttons under the greeting" id="f-replies" error={err("quickReplies")} dirty={isDirty("f-replies")} hint="Short choices visitors can tap. Up to 4, 30 characters each.">
                    <div className="pills">
                      {draft.goal.quickReplies.map((q, i) => <span key={i} className="pill">{q} {!off && <button type="button" aria-label={`Remove ${q}`} onClick={() => setGoal("quickReplies", draft.goal.quickReplies.filter((_, j) => j !== i))}>×</button>}</span>)}
                    </div>
                    {!off && draft.goal.quickReplies.length < 4 && <input id="f-replies" placeholder="Add a quick reply" maxLength={30} value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && reply.trim()) { e.preventDefault(); setGoal("quickReplies", [...draft.goal.quickReplies, reply.trim()].slice(0, 4)); setReply(""); } }} />}
                  </Field>
                  <Field label="Welcome back message for returning visitors (optional)" id="f-return" count={(draft.engage.returnGreeting ?? "").length} max={ENGAGE_LIMITS.returnGreeting} error={err("returnGreeting")} dirty={isDirty("f-return")}>
                    <input id="f-return" readOnly={ro(fieldLocked("engage", "returnGreeting"))} className={inputCls(fieldLocked("engage", "returnGreeting"))} maxLength={ENGAGE_LIMITS.returnGreeting} value={draft.engage.returnGreeting ?? ""} onChange={(e) => setEngage("returnGreeting", e.target.value)} />
                  </Field>
                </div>
              </section>
              <section className="au-card">
                <div className="au-card-hd"><div><h2 className="au-card-h">Qualifying questions</h2><p className="au-card-desc">Asked one at a time, only when they fit.</p></div></div>
                <div className="au-card-bd">
                  <ListLines id="f-questions" label="Questions" items={draft.goal.questions} max={GOAL_LIMITS.questions} len={GOAL_LIMITS.question} readOnly={ro(fieldLocked("goal", "questions"))} error={err("questions")} onChange={(items) => setGoal("questions", items)} />
                  <Field label="Conversation stages (optional)" id="f-stages" error={err("stages")} dirty={isDirty("f-stages")} hint="Leave as standard unless you need a different order. Up to 7, 80 characters each.">
                    <input id="f-stages" readOnly={ro(fieldLocked("goal", "stages"))} value={draft.goal.stages.join(", ")} onChange={(e) => setGoal("stages", e.target.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 7))} />
                  </Field>
                </div>
              </section>
              <section className="au-card">
                <div className="au-card-hd"><div><h2 className="au-card-h">Conversion helpers</h2><p className="au-card-desc">Proven ways to move a chat towards the goal. Each one is honest and easy to ignore.</p></div></div>
                <div className="au-card-bd">
                  <Switch on={draft.engage.microCommit} label="Easy question first" hint="Asks a one-tap question before asking for details." disabled={ro(fieldLocked("engage", "microCommit"))} onChange={(v) => setEngage("microCommit", v)} />
                  <Switch on={draft.engage.objections} label="Handle worries from my approved answers" hint="Uses your questions and answers for price, timing and trust worries." disabled={ro(fieldLocked("engage", "objections"))} onChange={(v) => setEngage("objections", v)} />
                  <div className="two">
                    <Field label="Free offer button label (optional)" id="f-offer-label" error={err("freeOfferLabel")} dirty={isDirty("f-offer-label")}><input id="f-offer-label" readOnly={ro(fieldLocked("engage", "freeOffer"))} value={draft.engage.freeOffer?.label ?? ""} onChange={(e) => setEngage("freeOffer", { label: e.target.value, url: draft.engage.freeOffer?.url ?? "", value: draft.engage.freeOffer?.value ?? "" })} /></Field>
                    <Field label="Link" id="f-offer-url" error={err("freeOfferUrl")}><input id="f-offer-url" readOnly={ro(fieldLocked("engage", "freeOffer"))} value={draft.engage.freeOffer?.url ?? ""} onChange={(e) => setEngage("freeOffer", { label: draft.engage.freeOffer?.label ?? "", url: e.target.value, value: draft.engage.freeOffer?.value ?? "" })} /></Field>
                  </div>
                  <Field label="What they get from it" id="f-offer-value" error={err("freeOfferValue")}><input id="f-offer-value" readOnly={ro(fieldLocked("engage", "freeOffer"))} value={draft.engage.freeOffer?.value ?? ""} onChange={(e) => setEngage("freeOffer", { label: draft.engage.freeOffer?.label ?? "", url: draft.engage.freeOffer?.url ?? "", value: e.target.value })} /></Field>
                  <div className="two">
                    <Field label="Current offer (only if real)" id="f-current-offer" error={err("offerText")} dirty={isDirty("f-current-offer")} hint="The offer hides itself after this date. No countdowns or limited-spots wording."><input id="f-current-offer" readOnly={ro(fieldLocked("engage", "offer"))} value={draft.engage.offer?.text ?? ""} onChange={(e) => setEngage("offer", { text: e.target.value, endsOn: draft.engage.offer?.endsOn ?? "" })} /></Field>
                    <Field label="Ends on" id="f-ends" error={err("offerEndsOn")}><input id="f-ends" type="text" placeholder="YYYY-MM-DD" readOnly={ro(fieldLocked("engage", "offer"))} value={draft.engage.offer?.endsOn ?? ""} onChange={(e) => setEngage("offer", { text: draft.engage.offer?.text ?? "", endsOn: e.target.value })} /></Field>
                  </div>
                  <ListPairs id="f-reviews" label="Real client reviews the bot can quote" items={draft.engage.testimonials.map((t) => `${t.quote} | ${t.name}`)} max={ENGAGE_LIMITS.testimonials} readOnly={ro(fieldLocked("engage", "testimonials"))} hint="Quoted word for word. The bot never makes any up. Up to 5." onChange={(lines) => setEngage("testimonials", lines.map((l) => { const i = l.lastIndexOf("|"); return i > 0 ? { quote: l.slice(0, i).trim(), name: l.slice(i + 1).trim() } : { quote: l.trim(), name: "" }; }).filter((t) => t.quote))} />
                </div>
              </section>
            </div>
          )}

          {tab === "features" && (
            <div>
              <section className="au-card">
                <div className="au-card-hd"><div><h2 className="au-card-h">Chat features</h2><p className="au-card-desc">What visitors can do inside the chat.</p></div></div>
                <div className="au-card-bd">
                  <Switch on={draft.engage.endChat} label="End chat and New chat buttons" hint="Visitors can finish or start fresh at any time." disabled={ro(fieldLocked("engage", "endChat"))} onChange={(v) => setEngage("endChat", v)} />
                  <Switch on={draft.engage.emailCopy} label="Offer a copy of the chat at the end" hint="Asks for an email with a consent tick box. Only works once Saabai switches on lead capture for the account." disabled={ro(fieldLocked("engage", "emailCopy"))} onChange={(v) => setEngage("emailCopy", v)} />
                  <Switch on={draft.engage.transcripts} label="Show chat transcripts in the client portal" hint="Chats are kept for 90 days, then deleted." disabled={ro(fieldLocked("engage", "transcripts"))} onChange={(v) => setEngage("transcripts", v)} />
                </div>
              </section>
              <section className="au-card">
                <div className="au-card-hd"><div><h2 className="au-card-h">Gentle nudges</h2><p className="au-card-desc">Shown once per page, at most 3 times a week per visitor, and always easy to close. Never opens the chat by itself.</p></div></div>
                <div className="au-card-bd">
                  <ListPairs id="f-openers" label="Page openers" items={draft.engage.openers.map((o) => `${o.match} | ${o.text}`)} max={ENGAGE_LIMITS.openers} readOnly={ro(fieldLocked("engage", "openers"))} hint="A page path and a short message. Up to 6." onChange={(lines) => setEngage("openers", lines.map((l) => { const [m, ...t] = l.split("|"); return { match: (m || "").trim(), text: t.join("|").trim() }; }).filter((o) => o.match && o.text))} />
                  <div className="two">
                    <Field label="Idle nudge after" id="f-idle" error={err("idleSeconds")} dirty={isDirty("f-idle")} hint="0 turns it off. 15 to 300 seconds."><input id="f-idle" readOnly={ro(fieldLocked("engage", "nudges"))} value={String(draft.engage.idleSeconds)} onChange={(e) => setEngage("idleSeconds", Number(e.target.value) || 0)} /></Field>
                    <Field label="Scroll depth nudge" id="f-scroll" error={err("scrollPercent")} dirty={isDirty("f-scroll")} hint="0 turns it off. Up to 90."><input id="f-scroll" readOnly={ro(fieldLocked("engage", "nudges"))} value={String(draft.engage.scrollPercent)} onChange={(e) => setEngage("scrollPercent", Number(e.target.value) || 0)} /></Field>
                  </div>
                  <Switch on={draft.engage.exitIntent} label="Exit nudge on desktop" hint="A small note when the mouse heads for the close button. Not on phones." disabled={ro(fieldLocked("engage", "nudges"))} onChange={(v) => setEngage("exitIntent", v)} />
                </div>
              </section>
              <section className="au-card">
                <div className="au-card-hd"><div><h2 className="au-card-h">Google reviews</h2><p className="au-card-desc">Invite existing clients to leave a review at the end of a chat.</p></div></div>
                <div className="au-card-bd">
                  <Switch on={draft.engage.reviews.enabled} label="Invite existing clients to leave a Google review" hint="Asked once per visitor. Every existing client is asked, happy or not, as Google and the ACCC require. Unhappy visitors are also offered to pass their concern to the team." disabled={ro(fieldLocked("engage", "reviews"))} onChange={(v) => setEngage("reviews", { ...draft.engage.reviews, enabled: v })} />
                  <Field label="Google review link" id="f-greview" error={err("reviewsUrl")} dirty={isDirty("f-greview")}>
                    <input id="f-greview" readOnly={ro(fieldLocked("engage", "reviews"))} value={draft.engage.reviews.url} onChange={(e) => setEngage("reviews", { ...draft.engage.reviews, url: e.target.value })} />
                  </Field>
                </div>
              </section>
            </div>
          )}

          {tab === "knowledge" && (
            <div>
              <section className="au-card">
                <div className="au-card-hd"><div><h2 className="au-card-h">Business facts</h2><p className="au-card-desc">Hours, services, prices, areas and policies. The bot is told not to invent anything else.</p></div></div>
                <div className="au-card-bd">
                  <Field label="Facts" id="f-facts" count={draft.facts.length} max={LIMITS.facts} error={err("facts")} dirty={isDirty("f-facts")} hint="Plain text.">
                    <textarea id="f-facts" readOnly={off} className={inputCls(off)} maxLength={LIMITS.facts} value={draft.facts} onChange={(e) => setLook("facts", e.target.value)} />
                  </Field>
                </div>
              </section>
              <section className="au-card">
                <div className="au-card-hd"><div><h2 className="au-card-h">Questions and approved answers</h2><p className="au-card-desc">The bot uses these answers word for word in visitor asks.</p></div></div>
                <div className="au-card-bd">
                  <p className="hint">{draft.faqs.length} of {LIMITS.faqs} questions used. A question can be {LIMITS.q} characters and an answer {LIMITS.a}.</p>
                  {draft.faqs.map((f, i) => (
                    <div className="rowedit" key={i} style={{ height: "auto", padding: 8, display: "block" }}>
                      <input aria-label={`Question ${i + 1}`} readOnly={off} maxLength={LIMITS.q} value={f.q} onChange={(e) => setLook("faqs", draft.faqs.map((x, j) => j === i ? { ...x, q: e.target.value } : x))} />
                      <textarea aria-label={`Answer ${i + 1}`} readOnly={off} maxLength={LIMITS.a} value={f.a} onChange={(e) => setLook("faqs", draft.faqs.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} />
                      {!off && <button type="button" className="btn gh sm" onClick={() => setLook("faqs", draft.faqs.filter((_, j) => j !== i))}>Remove</button>}
                      {err(`faq${i}`) && <p className="err" role="alert">{err(`faq${i}`)}</p>}
                    </div>
                  ))}
                  {!off && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <Button variant="sec" size="sm" disabled={draft.faqs.length >= LIMITS.faqs} onClick={() => setLook("faqs", [...draft.faqs, { q: "", a: "" }])}>Add a question</Button>
                      <FaqBulkAdd existing={draft.faqs} onAppend={(rows) => { setDraft((cur) => ({ ...cur, faqs: appendFaqs(cur.faqs, rows) })); setBar("dirty"); }} />
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {tab === "look" && (
            <div>
              <section className="au-card">
                <div className="au-card-hd"><div><h2 className="au-card-h">Name and greeting</h2><p className="au-card-desc">Who the bot is and the first thing it says.</p></div></div>
                <div className="au-card-bd">
                  <div className="two">
                    <Field label="Bot name" id="f-botName" count={draft.botName.length} max={40} error={err("botName")} dirty={isDirty("f-botName")}><input id="f-botName" readOnly={off} className={inputCls(off)} maxLength={40} value={draft.botName} onChange={(e) => setLook("botName", e.target.value)} /></Field>
                    <Field label="Position on the page" id="f-position" error={err("position")} dirty={isDirty("f-position")}><select id="f-position" className="fi" disabled={off} value={draft.position} onChange={(e) => setLook("position", e.target.value as "left" | "right")}>{POSITIONS.map((p) => <option key={p} value={p}>{p === "right" ? "Bottom right" : "Bottom left"}</option>)}</select></Field>
                  </div>
                  <Field label="Greeting" id="f-greeting" count={draft.greeting.length} max={300} error={err("greeting")} dirty={isDirty("f-greeting")}><textarea id="f-greeting" readOnly={off} maxLength={300} value={draft.greeting} onChange={(e) => setLook("greeting", e.target.value)} /></Field>
                  <Field label="Avatar image link (optional)" id="f-avatar" error={err("avatarUrl")} dirty={isDirty("f-avatar")} hint="https only."><input id="f-avatar" readOnly={off} value={draft.avatarUrl} onChange={(e) => setLook("avatarUrl", e.target.value)} /></Field>
                </div>
              </section>
              <section className="au-card">
                <div className="au-card-hd"><div><h2 className="au-card-h">Colours</h2><p className="au-card-desc">Contrast is checked as you type.</p></div></div>
                <div className="au-card-bd two">
                  {([["primary", "Header and visitor bubbles"], ["accent", "Accent and button ring"], ["bg", "Chat background"], ["text", "Text"]] as const).map(([k, label]) => (
                    <Field key={k} label={label} id={`f-${k}`} error={err(k)} dirty={isDirty("f-primary")}>
                      <input id={`f-${k}`} readOnly={off} value={draft[k]} onChange={(e) => setLook(k, e.target.value)} aria-label={`${label} hex`} />
                    </Field>
                  ))}
                  <div style={{ gridColumn: "1 / -1" }} role="status">
                    {passes ? <p className="hint" style={{ color: "var(--ok)" }}>Text and header colours pass the readability check.</p> : <p className="err" role="alert">Text or header colours are hard to read. Try a darker text or header colour.</p>}
                  </div>
                </div>
              </section>
              <section className="au-card">
                <div className="au-card-hd"><div><h2 className="au-card-h">Branding</h2></div></div>
                <div className="au-card-bd">
                  <Switch on={poweredByVisible(row.plan as Plan, draft.showPoweredBy)} label='Show "Powered by Saabai"' hint={canHide ? "Can be switched off on Growth and Signature. Always shown on Presence." : "Always shown on Presence. It can be removed on Growth and Signature."} disabled={off || !canHide} onChange={(v) => setLook("showPoweredBy", v)} />
                  {err("showPoweredBy") && <p className="err" role="alert">{err("showPoweredBy")}</p>}
                </div>
              </section>
            </div>
          )}

          {tab === "results" && showResults && (
            <div id="results">
              <section className="au-card">
                <div className="au-card-hd"><div><h2 className="au-card-h">Conversion funnel</h2><p className="au-card-desc">Counts only. Nothing people type into form fields is stored here.</p></div></div>
                <div className="au-card-bd">
                  <InsightsPanel variant="summary" endpoint={`/api/admin/chatbots/insights?slug=${encodeURIComponent(row.slug)}`} historyHref={chatbotHistoryPath(row.slug)} />
                </div>
              </section>
              <section className="au-card">
                <div className="au-card-hd"><div><h2 className="au-card-h">Install on a site</h2><p className="au-card-desc">One line, just before the closing body tag. Factory sites get it automatically when the new widget is switched on.</p></div></div>
                <div className="au-card-bd">
                  <code className="code" data-testid="snippet">{installSnippet(row.slug)}</code>
                  <Button variant="sec" size="sm" onClick={() => { void navigator.clipboard?.writeText(installSnippet(row.slug)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy line"}</Button>
                </div>
              </section>
              <section className="au-card">
                <div className="au-card-hd"><div><h2 className="au-card-h">Status and plan</h2><p className="au-card-desc">The On switch also sits in the page header.</p></div></div>
                <div className="au-card-bd two">
                  <Field label="Plan" id="f-plan">
                    <select id="f-plan" className="fi" value={row.plan} disabled={kill} onChange={(e) => { void fetch("/api/admin/chatbots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: row.slug, action: "set_plan", plan: e.target.value }) }).then(() => onSaved()); }}>
                      {(plans.length ? plans : [{ key: row.plan, label: PLAN_LABEL[row.plan as Plan] ?? row.plan, cap: row.cap?.cap ?? 0 }]).map((p) => <option key={p.key} value={p.key}>{p.label}{p.cap ? ` (${p.cap} chats)` : ""}</option>)}
                    </select>
                  </Field>
                  <p className="hint">{row.enabled ? "Answering visitors" : "Showing the break message"}</p>
                </div>
              </section>
            </div>
          )}
        </div>

        <aside className={`cbed-preview${previewOpen ? " open" : ""}`} aria-label="Live preview">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong>Live preview</strong>
            <div className="seg" role="group" aria-label="Preview size">
              <button type="button" className={width === "desktop" ? "on" : ""} onClick={() => setWidth("desktop")}>Desktop</button>
              <button type="button" className={width === "mobile" ? "on" : ""} onClick={() => setWidth("mobile")}>Mobile</button>
            </div>
          </div>
          <div className="seg" role="group" aria-label="Preview page" style={{ marginBottom: 8 }}>
            <button type="button" className={back === "light" ? "on" : ""} onClick={() => setBack("light")}>Light page</button>
            <button type="button" className={back === "dark" ? "on" : ""} onClick={() => setBack("dark")}>Dark</button>
            <button type="button" className={back === "photo" ? "on" : ""} onClick={() => setBack("photo")}>Photo</button>
            <button type="button" className={showOff ? "on" : ""} onClick={() => setShowOff((v) => !v)} data-testid="preview-off">Break message</button>
          </div>
          {previewOpen && <Button variant="sec" size="sm" onClick={() => setPreviewOpen(false)}>Close preview</Button>}
          {dirty && <p className="cbed-note">Preview shows your unsaved changes. Visitors still see the saved version.</p>}
          <div className="cbed-pvbox" style={{ background: bgStyle }}>
            <iframe ref={frame} title={`Chat widget preview for ${row.name}`} src="/embed/preview.html" style={{ width: width === "mobile" ? 390 : "100%" }} data-testid="preview-frame" />
          </div>
          <p className="cbed-foot">This is the real widget. Replies in the preview are sample replies and use no AI.</p>
        </aside>
      </div>

      {!off && (
        <div className={`cbed-save ${bar === "bad" ? "bad" : bar === "saved" ? "ok" : dirty ? "dirty" : ""}`}>
          <div className="msg" role="status">
            {bar === "bad" && fail ? <button type="button" className="jump" onClick={() => focusField(fail.id || "f-cta-url", fail.tab)}>{fail.text}</button>
              : bar === "saved" ? <span>Saved at {brisbaneStamp(new Date().toISOString())}. The live widget picks it up within about a minute.</span>
              : dirty ? <><i className="dot" aria-hidden="true" />{changed.length} unsaved change{changed.length === 1 ? "" : "s"} on {names}. {changed.slice(0, 4).map((c) => c.label).join(", ")}.</>
              : <span>All changes saved.{row.lastChange?.at ? ` Last changed ${brisbaneStamp(row.lastChange.at)}${row.lastChange.by ? ` by ${row.lastChange.by}` : ""}.` : ""}</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="sec" disabled={!dirty || busy} onClick={() => { setDraft(saved); setErrors({}); setFail(null); setBar("clean"); }}>Discard changes</Button>
            <Button variant="pri" disabled={!dirty || busy} loading={busy} onClick={() => void save()} data-testid="editor-save">{busy ? "Saving" : "Save changes"}</Button>
          </div>
        </div>
      )}
      {toast && <div className="cbed-toast" role="status">{toast}</div>}
    </div>
  );
}

function Field({ label, id, hint, error, count, max, dirty, children }: { label: string; id: string; hint?: string; error?: string; count?: number; max?: number; dirty?: boolean; children: ReactNode }) {
  return (
    <div className={`fld${dirty ? " dirty" : ""}${error ? " bad" : ""}`}>
      <div className="fld-l"><label htmlFor={id}>{label}</label>{max != null && <span className="num">{count ?? 0}/{max}</span>}</div>
      {children}
      {error ? <p className="err" role="alert" id={`${id}-err`}>{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

function Switch({ on, label, hint, disabled, onChange }: { on: boolean; label: string; hint: string; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="sw-row">
      <button type="button" className={`sw${on ? " on" : ""}`} role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}><i /></button>
      <div><b>{label}</b><p>{hint}</p></div>
    </div>
  );
}

function ListLines({ id, label, items, max, len, readOnly, error, onChange }: { id: string; label: string; items: string[]; max: number; len: number; readOnly?: boolean; error?: string; onChange: (v: string[]) => void }) {
  const [text, setText] = useState("");
  return (
    <Field label={label} id={id} error={error} hint={`Up to ${max}, ${len} characters each.`}>
      {items.map((item, i) => (
        <div className="rowedit" key={i}><span>{item}</span>{!readOnly && <button type="button" className="btn gh ic sm" aria-label={`Remove ${item}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>×</button>}</div>
      ))}
      {!readOnly && items.length < max && (
        <div style={{ display: "flex", gap: 8 }}>
          <input id={id} value={text} maxLength={len} placeholder="Add a question" onChange={(e) => setText(e.target.value)} />
          <Button variant="sec" size="sm" onClick={() => { if (text.trim()) { onChange([...items, text.trim()].slice(0, max)); setText(""); } }}>Add a question</Button>
        </div>
      )}
    </Field>
  );
}

function ListPairs({ id, label, items, max, readOnly, hint, onChange }: { id: string; label: string; items: string[]; max: number; readOnly?: boolean; hint?: string; onChange: (v: string[]) => void }) {
  const [text, setText] = useState("");
  return (
    <Field label={label} id={id} hint={hint}>
      {items.map((item, i) => (
        <div className="rowedit" key={i}><span>{item}</span>{!readOnly && <button type="button" className="btn gh ic sm" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>×</button>}</div>
      ))}
      {!readOnly && items.length < max && (
        <div style={{ display: "flex", gap: 8 }}>
          <input id={id} value={text} placeholder="/page | message" onChange={(e) => setText(e.target.value)} />
          <Button variant="sec" size="sm" onClick={() => { if (text.trim()) { onChange([...items, text.trim()].slice(0, max)); setText(""); } }}>Add</Button>
        </div>
      )}
    </Field>
  );
}
