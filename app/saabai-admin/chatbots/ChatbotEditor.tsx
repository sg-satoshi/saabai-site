"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import FaqBulkAdd from "./FaqBulkAdd";
import { Button } from "../ui/Button";
import InsightsPanel from "../../components/chatbot/InsightsPanel";
import { LIMITS, PLAN_LABEL, TONE_LABEL, TONES, canRemovePoweredBy, isHex, poweredByVisible, validateContent, validateSkin, type Faq, type Plan, type PublicWidgetConfig, type Tone } from "../../../lib/chatbot/core";
import { appendFaqs } from "../../../lib/chatbot/faq-import";
import { DEFAULT_ENGAGE, ENGAGE_LIMITS, reviewsWithEnabled, reviewsWithLink, validateEngage, toPublicEngage, type EngageConfig, type Opener, type Testimonial } from "../../../lib/chatbot/engage";
import { DEFAULT_STAGES, GOAL_LABEL, GOAL_LIMITS, validateGoal, toPublicGoal, type GoalConfig, type GoalType } from "../../../lib/chatbot/goal";
import { aiDisclosureSentence, greetingFollowOn, openingGreeting } from "../../../lib/chatbot/disclosure";
import { contrast } from "../../../lib/announce/core";
import { chatbotHistoryPath } from "../../../lib/chatbot/paths";
import { installSnippet } from "../../../lib/chatbot/seed-shared";
import "./chatbots.css";

export type EditorRow = {
  slug: string; name: string; plan: string;
  domains?: string[];
  siteUrl?: string;
  engine?: "platform" | "bespoke";
  enabled?: boolean | null;
  skin: { showPoweredBy?: boolean; logoUrl?: string };
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
  botName: string; greeting: string; avatarUrl: string; logoUrl: string;
  primary: string; accent: string; bg: string; text: string;
  position: "left" | "right"; showPoweredBy: boolean;
  tone: Tone; facts: string; faqs: Faq[];
};

const TABS = [
  { id: "goal", label: "Goal", n: 1 },
  { id: "conversation", label: "Conversation", n: 2 },
  { id: "features", label: "Features and nudges", n: 3 },
  { id: "knowledge", label: "Knowledge", n: 4 },
  { id: "look", label: "Look", n: 5 },
  { id: "results", label: "Results and install", n: 6 },
] as const;
type StepId = (typeof TABS)[number]["id"];
type TabId = StepId | "history";

const GOAL_CARDS: { id: GoalType; title: string; blurb: string }[] = [
  { id: "book_call", title: "Book a call", blurb: "Send them to your booking link." },
  { id: "capture_details", title: "Capture details", blurb: "Get a name and the best way to reach them." },
  { id: "quote", title: "Give a quote", blurb: "Help them get a quote from the team." },
  { id: "call_back", title: "Call back", blurb: "Take a call-back request." },
  { id: "sell_product", title: "Sell a product", blurb: "Help them choose and go to buy." },
  { id: "custom", title: "Custom goal", blurb: "Describe the goal in plain words." },
];

const REPLY_SUGGESTIONS = ["Book an appointment", "Prices", "Opening hours"];
const QUESTION_SUGGESTIONS = ["What's brought you in?", "Have you been here before?", "When did it start?", "What's the best way to reach you?"];
const GREETING_START = /^\s*(hi|hello|hey|g'day|good (morning|afternoon|evening))\b/i;
const EMPTY_GOAL: GoalConfig = { primary: "none", fallback: "none", questions: [], stages: [], quickReplies: [] };

function cleanGoal(goal: GoalConfig): GoalConfig {
  const next = { ...goal };
  delete next.locked;
  return next;
}
function cleanEngage(engage: EngageConfig): EngageConfig {
  const next = { ...engage };
  delete next.locked;
  return next;
}

function fromRow(row: EditorRow): Draft {
  const bot = row.resolved?.botName || row.name;
  return {
    goal: cleanGoal(row.goal ?? EMPTY_GOAL),
    engage: cleanEngage(row.engage ?? DEFAULT_ENGAGE),
    botName: row.resolved?.botName ?? "",
    greeting: greetingFollowOn(row.resolved?.greeting ?? "", bot),
    avatarUrl: row.resolved?.avatarUrl ?? "",
    logoUrl: row.skin?.logoUrl ?? "",
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
  const [hh, mm] = s.slice(11, 16).split(":").map(Number);
  const ap = hh >= 12 ? "pm" : "am";
  return `${Number(d)} ${months[Number(m) - 1]}, ${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${ap} Brisbane`;
}

type Change = { tab: StepId; label: string; id: string };

function changes(a: Draft, b: Draft): Change[] {
  const out: Change[] = [];
  const add = (tab: StepId, label: string, id: string, same: boolean) => { if (!same) out.push({ tab, label, id }); };
  const g = (k: keyof GoalConfig, label: string, id: string) => add("goal", label, id, JSON.stringify(a.goal[k] ?? "") === JSON.stringify(b.goal[k] ?? ""));
  g("primary", "Main goal", "f-primary");
  g("primaryCustom", "Custom goal", "f-primaryCustom");
  add("goal", "Main button label", "f-cta-label", (a.goal.cta?.label ?? "") === (b.goal.cta?.label ?? ""));
  add("goal", "Booking link", "f-cta-url", (a.goal.cta?.url ?? "") === (b.goal.cta?.url ?? ""));
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
  add("conversation", "Tone", "f-tone", a.tone === b.tone);
  add("conversation", "Persona and tone notes", "f-persona", (a.goal.persona ?? "") === (b.goal.persona ?? ""));
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
  add("look", "Logo", "f-logo", a.logoUrl === b.logoUrl);
  add("look", "Position", "f-position", a.position === b.position);
  add("look", "Colours", "f-primary", a.primary === b.primary && a.accent === b.accent && a.bg === b.bg && a.text === b.text);
  add("look", "Powered by", "f-powered", a.showPoweredBy === b.showPoweredBy);
  return out;
}

function tabOfError(key: string): StepId {
  if (/^(primary|fallback|cta|handoff)/.test(key)) return "goal";
  if (/^(questions|stages|quick|return|freeOffer|offer|testimonial|persona|tone)/.test(key)) return "conversation";
  if (/^(opener|idle|scroll|reviews|end|email|transcript)/.test(key)) return "features";
  if (/^(facts|faq)/.test(key)) return "knowledge";
  return "look";
}

const FIELD_ID: Record<string, string> = {
  ctaUrl: "f-cta-url", ctaLabel: "f-cta-label", primaryCustom: "f-primaryCustom", fallbackCustom: "f-fallbackCustom",
  greeting: "f-greeting", botName: "f-botName", avatarUrl: "f-avatar", logoUrl: "f-logo", facts: "f-facts",
  reviewsUrl: "f-greview",
};

function Shell({ mode }: { mode: "admin" | "client" }) {
  return <span hidden data-testid={`shell-${mode}`} />;
}

function countClass(n: number, max?: number) {
  if (max == null) return "c";
  if (n > max) return "c over";
  if (n >= max * 0.9) return "c warn";
  return "c";
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
  const [fail, setFail] = useState<{ tab: StepId; text: string; id?: string } | null>(null);
  const [width, setWidth] = useState<"desktop" | "mobile">("desktop");
  const [back, setBack] = useState<"light" | "dark" | "photo">("light");
  const [showOff, setShowOff] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [siteMenu, setSiteMenu] = useState(false);
  const [reply, setReply] = useState("");
  const [askOn, setAskOn] = useState(false);
  const [knowOn, setKnowOn] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const tablist = useRef<HTMLDivElement>(null);
  const ready = useRef(false);
  const changed = useMemo(() => changes(saved, draft), [saved, draft]);
  const dirty = changed.length > 0 && !off;
  const advFallback = useOpen(`${row.slug}:fallback`);
  const advReturn = useOpen(`${row.slug}:return`);
  const advStages = useOpen(`${row.slug}:stages`);
  const advOffers = useOpen(`${row.slug}:offers`);
  const advTone = useOpen(`${row.slug}:tone`);
  const advTiming = useOpen(`${row.slug}:timing`);
  const advBrand = useOpen(`${row.slug}:brand`);

  useEffect(() => {
    const next = fromRow(row);
    // Parent reloads the row after a save. The draft has to follow that copy.
    /* eslint-disable react-hooks/set-state-in-effect */
    setDraft(next);
    setSaved(next);
    setAskOn(false);
    setKnowOn(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [row.slug, row.lastChange?.at, row.botLock?.locked]);

  useEffect(() => {
    const read = () => {
      let h = window.location.hash.replace("#", "");
      if (h === "editor") { window.history.replaceState(null, "", `${location.pathname}${location.search}#goal`); h = "goal"; }
      if (h === "plan") { window.history.replaceState(null, "", `${location.pathname}${location.search}#results`); h = "results"; }
      const known = TABS.some((t) => t.id === h) || (mode === "client" && h === "history");
      const next: TabId = !known ? "goal" : h === "results" && !showResults ? "goal" : (h as TabId);
      setTab(next);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [showResults, mode]);

  useEffect(() => {
    tablist.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [tab]);

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

  const who = draft.botName.trim() || row.name;
  const pub: PublicWidgetConfig = useMemo(() => ({
    ...row.resolved,
    botName: who,
    greeting: openingGreeting({ botName: who, businessName: row.name, extra: draft.greeting }),
    avatarUrl: draft.avatarUrl.trim(),
    ...(draft.logoUrl.trim() ? { logoUrl: draft.logoUrl.trim() } : {}),
    primary: isHex(draft.primary) ? draft.primary : row.resolved.primary,
    accent: isHex(draft.accent) ? draft.accent : row.resolved.accent,
    bg: isHex(draft.bg) ? draft.bg : row.resolved.bg,
    text: isHex(draft.text) ? draft.text : row.resolved.text,
    position: draft.position,
    poweredBy: poweredByVisible(row.plan as Plan, draft.showPoweredBy),
    goal: toPublicGoal(draft.goal),
    engage: toPublicEngage(draft.engage, { leadCapture: !!row.leadCapture }),
  }), [draft, row, who]);

  const push = useCallback(() => { frame.current?.contentWindow?.postMessage({ type: "saabai-chat-config", config: pub, open: true, showOff }, "*"); }, [pub, showOff]);
  useEffect(() => {
    const on = (e: MessageEvent) => { if (e.source === frame.current?.contentWindow && e.data?.type === "saabai-chat-ready") { ready.current = true; push(); } };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [push]);
  useEffect(() => { if (ready.current) push(); }, [push]);

  function go(id: TabId) {
    window.history.replaceState(null, "", `${location.pathname}${location.search}#${id}`);
    setTab(id);
  }
  function focusField(id: string, dest: TabId) {
    go(dest);
    const domId = FIELD_ID[id] || id;
    setTimeout(() => document.getElementById(domId)?.focus(), 40);
  }
  function touch() { setBar("dirty"); setFail(null); setErrors({}); }

  function setGoal<K extends keyof GoalConfig>(k: K, v: GoalConfig[K]) {
    setDraft((d) => ({ ...d, goal: { ...d.goal, [k]: v } }));
    touch();
  }
  function setEngage<K extends keyof EngageConfig>(k: K, v: EngageConfig[K]) {
    setDraft((d) => ({ ...d, engage: { ...d.engage, [k]: v } }));
    touch();
  }
  function setLook<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
    touch();
  }

  async function save() {
    const skin = {
      botName: draft.botName, greeting: draft.greeting, avatarUrl: draft.avatarUrl, logoUrl: draft.logoUrl,
      primary: draft.primary, accent: draft.accent, bg: draft.bg, text: draft.text, position: draft.position,
      ...(mode === "admin" && canRemovePoweredBy(row.plan as Plan) ? { showPoweredBy: draft.showPoweredBy } : {}),
    };
    const content = { tone: draft.tone, facts: draft.facts, faqs: draft.faqs };
    const goal = cleanGoal(draft.goal);
    const engage = cleanEngage(draft.engage);
    const fields: Record<string, string> = {};
    const g = validateGoal(goal); const e = validateEngage(engage); const sk = validateSkin(skin); const ct = validateContent(content);
    Object.assign(fields, g.ok ? {} : g.errors, e.ok ? {} : e.errors, sk.ok ? {} : sk.errors, ct.ok ? {} : ct.errors);
    if (Object.keys(fields).length) {
      setErrors(fields);
      const key = Object.keys(fields)[0];
      const dest = tabOfError(key);
      const n = Object.keys(fields).length;
      setFail({ tab: dest, text: `Can't save yet. Fix ${n} field${n === 1 ? "" : "s"} on ${TABS.find((t) => t.id === dest)?.label}: ${fields[key]}`, id: key });
      setBar("bad");
      go(dest);
      return;
    }
    setErrors({});
    setFail(null);
    setBusy(true);
    setBar("saving");
    const goalChanged = JSON.stringify(goal) !== JSON.stringify(cleanGoal(saved.goal));
    const engageChanged = JSON.stringify(engage) !== JSON.stringify(cleanEngage(saved.engage));
    const restChanged = JSON.stringify({ ...draft, goal: saved.goal, engage: saved.engage }) !== JSON.stringify(saved);
    if (mode === "client") {
      const r = await fetch("/api/portal/chatbot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal, engage, skin, content }) });
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
    const posts: { tab: StepId; body: Record<string, unknown> }[] = [];
    if (goalChanged) posts.push({ tab: "goal", body: { action: "save_goal", goal } });
    if (engageChanged) posts.push({ tab: "conversation", body: { action: "save_engage", engage } });
    if (restChanged) posts.push({ tab: "look", body: { action: "save_all", skin, content } });
    let failed: { tab: StepId; text: string } | null = null;
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
  const tabErrors = (id: TabId) => id === "history" ? 0 : Object.keys(errors).filter((k) => tabOfError(k) === id).length;
  const tabDirty = (id: TabId) => id !== "history" && changed.some((c) => c.tab === id);
  const low = (fg: string, bgc: string) => isHex(fg) && isHex(bgc) && contrast(fg, bgc) < 4.5;
  const passes = !low(draft.text, draft.bg) && !low("#ffffff", draft.primary);
  const canHide = row.canRemovePoweredBy ?? canRemovePoweredBy(row.plan as Plan);
  const bgStyle = back === "dark" ? "var(--navy-800)" : back === "photo" ? "linear-gradient(135deg, var(--teal-300), var(--n-100))" : "var(--n-50)";
  const tabs: { id: TabId; label: string; n?: number }[] = [
    ...TABS.filter((t) => showResults || t.id !== "results"),
    ...(mode === "client" ? [{ id: "history" as const, label: "Chat history" }] : []),
  ];
  const numbered = tabs.filter((t) => t.n);
  const stepAt = numbered.findIndex((t) => t.id === tab);
  const names = [...new Set(changed.map((c) => c.tab))].map((id) => TABS.find((t) => t.id === id)?.label).filter(Boolean);
  const siteHref = row.siteUrl || (row.domains?.[0] ? (row.domains[0].startsWith("http") ? row.domains[0] : `https://${row.domains[0]}`) : "");
  const opening = aiDisclosureSentence(who, row.name);
  const offerCount = (draft.engage.freeOffer?.label ? 1 : 0) + (draft.engage.offer?.text ? 1 : 0);
  const reviewCount = draft.engage.testimonials.length;
  const offerSummary = [offerCount ? `${offerCount} offer${offerCount === 1 ? "" : "s"}` : "", reviewCount ? `${reviewCount} review${reviewCount === 1 ? "" : "s"}` : ""].filter(Boolean).join(", ") || "None";
  const stageSummary = !draft.goal.stages.length || JSON.stringify(draft.goal.stages) === JSON.stringify(DEFAULT_STAGES) ? "Standard order" : `${draft.goal.stages.length} custom stages`;
  const chats = row.usage?.conversations ?? 0;
  const cap = row.cap?.cap ?? 0;

  return (
    <div className={`cbed${off ? " is-ro" : ""}`} data-testid={`editor-${row.slug}`}>
      {mode === "admin" ? <Shell mode="admin" /> : <Shell mode="client" />}
      {mode === "client" && (
        <header className="cbed-head">
          <div className="ehrow">
            <div>
              <div className="ttl">
                <h1>Your chatbot</h1>
                <span className={`pill ${row.enabled === false ? "off" : "on"}`}>{row.enabled === false ? "Off" : "On"}</span>
                {lockedBot && <span className="tag lock">Managed by Saabai</span>}
              </div>
              <p className="meta">Bot: {who}<span className="sep" />{lockedBot ? "Saabai looks after these settings" : "You can edit this chatbot"}</p>
            </div>
            <div className="acts">
              {siteHref && <a className="btn sec" href={siteHref} target="_blank" rel="noreferrer">Open my site</a>}
              {siteHref && (
                <>
                  <Button variant="gh" icon className="cbed-client-more" aria-label="More actions" onClick={() => setSiteMenu((v) => !v)}>···</Button>
                  {siteMenu && (
                    <div className="menu" role="menu">
                      <a className="mi" href={siteHref} target="_blank" rel="noreferrer" onClick={() => setSiteMenu(false)}>Open my site</a>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          {lockedBot && (
            <div className="lockbanner" role="status">
              <p><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" /><path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="currentColor" strokeWidth="1.75" /></svg><span><strong>This chatbot is managed by Saabai.</strong> Contact us to make changes.</span></p>
              <a className="btn sec sm" href="mailto:hello@saabai.ai">Contact Saabai</a>
            </div>
          )}
          {readOnly && !lockedBot && <div className="lockbanner" role="status"><p>Viewing as the client. Changes are disabled.</p></div>}
        </header>
      )}

      <div className="cbed-tabs-wrap">
        <div className="tabs-fade">
          <div className="tabs cbed-tabs" role="tablist" aria-orientation="horizontal" ref={tablist} onKeyDown={(e) => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
            const buttons = [...(tablist.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])];
            const current = (e.target as HTMLElement).closest<HTMLButtonElement>('[role="tab"]');
            const i = current ? buttons.indexOf(current) : -1;
            if (i < 0) return;
            e.preventDefault();
            const next = e.key === "Home" ? buttons[0] : e.key === "End" ? buttons[buttons.length - 1] : buttons[(i + (e.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length];
            const id = tabs[buttons.indexOf(next)]?.id;
            if (!id) return;
            go(id);
            next.focus();
          }}>
            {tabs.map((t) => {
              const errs = tabErrors(t.id);
              const active = tab === t.id;
              const done = !active && errs === 0 && t.id !== "results" && t.id !== "history";
              return (
                <button key={t.id} type="button" role="tab" aria-selected={active} className={`tab${active ? " on" : ""}${done ? " done" : ""}${errs ? " err" : ""}`} onClick={() => go(t.id)}>
                  {t.n != null && <span className="n">{done ? <Check /> : t.n}</span>}
                  <span>{t.label}</span>
                  {t.id === "knowledge" && <span className="cnt">{draft.faqs.length}</span>}
                  {tabDirty(t.id) && <i className="dot" aria-label="Unsaved changes" />}
                  {errs > 0 && <span className="errc">{errs}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <p className="cbed-step">{stepAt >= 0 ? `Step ${stepAt + 1} of ${numbered.length} · swipe for more` : "Chat history"}</p>
      </div>

      <div className={`cbed-grid${tab === "history" ? " solo" : ""}`}>
        <div className="cbed-main">
          {tab === "goal" && (
            <div className="col" id="goal">
              <div className="lead"><div><h2>Goal</h2><p>Pick one goal. The bot steers every chat towards it.</p></div></div>
              <section className="card">
                <div className="ch"><Icon d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0" /><div><div className="eyebrow">Step 1 of 3</div><h3>What should the chatbot achieve?</h3><p>Everything else in this editor works towards this goal.</p></div></div>
                <div className="cb">
                  <div className="goals" role="radiogroup" aria-label="Main goal" id="f-primary">
                    {GOAL_CARDS.map((c) => (
                      <button key={c.id} type="button" role="radio" aria-checked={draft.goal.primary === c.id} className={`gc${draft.goal.primary === c.id ? " on" : ""}`} disabled={off} onClick={() => setGoal("primary", c.id)}>
                        <span className="gi" aria-hidden="true"><Icon d="M4 7h16v12H4zM4 7l8 6 8-6" /></span>
                        <div><b>{c.title}</b><span>{c.blurb}</span></div>
                        <span className="rad" />
                      </button>
                    ))}
                  </div>
                  {draft.goal.primary === "custom" && (
                    <Field label="Custom goal" id="f-primaryCustom" count={(draft.goal.primaryCustom ?? "").length} max={GOAL_LIMITS.custom} error={err("primaryCustom")} dirty={isDirty("f-primaryCustom")}>
                      <input id="f-primaryCustom" type="text" className={off ? "ro" : ""} maxLength={GOAL_LIMITS.custom} readOnly={off} value={draft.goal.primaryCustom ?? ""} onChange={(e) => setGoal("primaryCustom", e.target.value)} />
                    </Field>
                  )}
                  <button type="button" className="nonegoal" disabled={off} onClick={() => setGoal("primary", "none")}>No goal, answer questions only</button>
                </div>
              </section>
              <section className="card">
                <div className="ch"><Icon d="M4 7h16v10H4zM8 7V5a4 4 0 0 1 8 0v2" /><div><div className="eyebrow">Step 2 of 3</div><h3>Main button</h3><p>The button the bot offers when the visitor is ready.</p></div></div>
                <div className="cb two">
                  <Field label="Button label" id="f-cta-label" count={(draft.goal.cta?.label ?? "").length} max={GOAL_LIMITS.ctaLabel} error={err("ctaLabel")} dirty={isDirty("f-cta-label")} hint="Keep it short. Shown in the chat.">
                    <input id="f-cta-label" type="text" className={off ? "ro" : ""} readOnly={off} maxLength={GOAL_LIMITS.ctaLabel} value={draft.goal.cta?.label ?? ""} onChange={(e) => setGoal("cta", { label: e.target.value, url: draft.goal.cta?.url ?? "" })} />
                  </Field>
                  <Field label="Booking link" id="f-cta-url" error={err("ctaUrl")} dirty={isDirty("f-cta-url")} hint="https://, mailto: or tel:">
                    <input id="f-cta-url" type="text" className={off ? "ro" : ""} readOnly={off} value={draft.goal.cta?.url ?? ""} onChange={(e) => setGoal("cta", { label: draft.goal.cta?.label ?? "", url: e.target.value })} aria-invalid={!!err("ctaUrl")} />
                  </Field>
                </div>
              </section>
              <section className="card">
                <div className="ch"><Icon d="M12 3v4M12 17v4M3 12h4M17 12h4" /><div><div className="eyebrow">Step 3 of 3</div><h3>If the main goal doesn&apos;t fit</h3><p>What the bot does when the visitor isn&apos;t ready.</p></div></div>
                <p className="hint" style={{ padding: "8px 24px 0" }}>Most bots keep the defaults. Open this to change the fallback or add a hand-over rule.</p>
                <Advanced label="Fallback and hand-over" count={3} summary={`${GOAL_LABEL[draft.goal.fallback]}${draft.goal.handoff ? ", hand-over set" : ""}`} open={advFallback.open} onToggle={advFallback.toggle}>
                  <Field label="Fallback goal" id="f-fallback" error={err("fallback")} dirty={isDirty("f-fallback")} hint="Used when the visitor isn't ready for the main goal.">
                    <select id="f-fallback" disabled={off} value={draft.goal.fallback} onChange={(e) => setGoal("fallback", e.target.value as GoalType)}>{(Object.keys(GOAL_LABEL) as GoalType[]).map((g) => <option key={g} value={g}>{GOAL_LABEL[g]}</option>)}</select>
                  </Field>
                  <div className="two">
                    <Field label="Fallback button" id="f-fallback-label" error={err("fallbackCtaLabel")} dirty={isDirty("f-fallback-label")} hint="Opens the details form in the chat.">
                      <input id="f-fallback-label" type="text" readOnly={off} className={off ? "ro" : ""} value={draft.goal.fallbackCta?.label ?? ""} onChange={(e) => setGoal("fallbackCta", { label: e.target.value, url: draft.goal.fallbackCta?.url ?? "" })} />
                    </Field>
                    <Field label="Fallback link" id="f-fallback-url" error={err("fallbackCtaUrl")} dirty={isDirty("f-fallback-url")}>
                      <input id="f-fallback-url" type="text" readOnly={off} className={off ? "ro" : ""} placeholder="https://, mailto: or tel:" value={draft.goal.fallbackCta?.url ?? ""} onChange={(e) => setGoal("fallbackCta", { label: draft.goal.fallbackCta?.label ?? "", url: e.target.value })} />
                    </Field>
                  </div>
                  {draft.goal.fallback === "custom" && <Field label="Describe the fallback goal" id="f-fallbackCustom" error={err("fallbackCustom")} dirty={isDirty("f-fallbackCustom")}><input id="f-fallbackCustom" type="text" maxLength={GOAL_LIMITS.custom} readOnly={off} value={draft.goal.fallbackCustom ?? ""} onChange={(e) => setGoal("fallbackCustom", e.target.value)} /></Field>}
                  <Field label="When to hand over to your team" optional id="f-handoff" count={(draft.goal.handoff ?? "").length} max={GOAL_LIMITS.handoff} error={err("handoff")} dirty={isDirty("f-handoff")} hint="Plain words. The bot follows this as a rule.">
                    <textarea id="f-handoff" className={off ? "ro" : ""} readOnly={off} maxLength={GOAL_LIMITS.handoff} value={draft.goal.handoff ?? ""} onChange={(e) => setGoal("handoff", e.target.value)} />
                  </Field>
                </Advanced>
              </section>
            </div>
          )}

          {tab === "conversation" && (
            <div className="col">
              <div className="lead"><div><h2>Conversation</h2><p>How the chat opens and what the bot asks.</p></div></div>
              <section className="card">
                <div className="ch"><Icon d="M4 6h16v10H8l-4 4z" /><div><h3>Opening</h3><p>What visitors see first, under the greeting.</p></div></div>
                <div className="cb">
                  <Field label="Quick replies" id="f-replies" countText={`${draft.goal.quickReplies.length} of 4`} error={err("quickReplies")} dirty={isDirty("f-replies")} hint="Short choices visitors can tap under the greeting. Up to 4, 30 characters each.">
                    <div className="chipin">
                      {draft.goal.quickReplies.map((q, i) => (
                        <span key={`${q}-${i}`} className="chip">{q}{!off && <button type="button" aria-label={`Remove ${q}`} onClick={() => setGoal("quickReplies", draft.goal.quickReplies.filter((_, j) => j !== i))}>×</button>}</span>
                      ))}
                      {!off && draft.goal.quickReplies.length < 4 && (
                        <input id="f-replies" type="text" placeholder={draft.goal.quickReplies.length ? "Add a quick reply" : "Type a quick reply, then press Enter"} maxLength={30} value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && reply.trim()) { e.preventDefault(); setGoal("quickReplies", [...draft.goal.quickReplies, reply.trim()].slice(0, 4)); setReply(""); } }} />
                      )}
                    </div>
                    {!off && draft.goal.quickReplies.length === 0 && (
                      <div className="sugg">Suggestions: {REPLY_SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => setGoal("quickReplies", [...draft.goal.quickReplies, s].slice(0, 4))}>{s}</button>)}</div>
                    )}
                  </Field>
                  <Advanced label="Returning visitors" count={1} summary={draft.engage.returnGreeting?.trim() ? "Welcome back message: on" : "Welcome back message: off"} open={advReturn.open} onToggle={advReturn.toggle}>
                    <Field label="Welcome back message" optional id="f-return" count={(draft.engage.returnGreeting ?? "").length} max={ENGAGE_LIMITS.returnGreeting} error={err("returnGreeting")} dirty={isDirty("f-return")} hint="Shown instead of the opening line when the same browser comes back.">
                      <input id="f-return" type="text" readOnly={off} className={off ? "ro" : ""} maxLength={ENGAGE_LIMITS.returnGreeting} value={draft.engage.returnGreeting ?? ""} onChange={(e) => setEngage("returnGreeting", e.target.value)} />
                    </Field>
                  </Advanced>
                </div>
              </section>
              <section className="card">
                <div className="ch"><Icon d="M8 9h8M8 13h5M6 4h12v14H6z" /><div><h3>Qualifying questions</h3><p>Help the bot understand what the visitor needs before it offers the goal.</p></div></div>
                <div className="cb">
                  {draft.goal.questions.length === 0 && !askOn ? (
                    <div className="empty">
                      <div className="tile"><Icon d="M9 9h.01M15 9h.01M8 14h8M6 4h12v16H6z" /></div>
                      <h4>No qualifying questions yet</h4>
                      <p>Add up to 4 questions the bot can ask, one at a time, to understand what the visitor needs.</p>
                      {!off && <div className="bt"><Button variant="pri" size="sm" onClick={() => setAskOn(true)}>Add a question</Button><Button variant="sec" size="sm" onClick={() => setGoal("questions", QUESTION_SUGGESTIONS.slice(0, 4))}>Use suggested questions</Button></div>}
                    </div>
                  ) : (
                    <QuestionList items={draft.goal.questions} readOnly={off} error={err("questions")} onChange={(items) => setGoal("questions", items)} />
                  )}
                  <Advanced label="Conversation stages" count={1} summary={stageSummary} open={advStages.open} onToggle={advStages.toggle}>
                    <Field label="Stages" id="f-stages" error={err("stages")} dirty={isDirty("f-stages")} hint="One stage per line. Leave blank to keep the standard order. Up to 7, 80 characters each.">
                      <textarea id="f-stages" readOnly={off} className={off ? "ro" : ""} value={draft.goal.stages.join("\n")} placeholder={DEFAULT_STAGES.join("\n")} onChange={(e) => setGoal("stages", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 7))} />
                    </Field>
                  </Advanced>
                </div>
              </section>
              <section className="card">
                <div className="ch"><Icon d="M12 3l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z" /><div><h3>Conversion helpers</h3><p>Honest ways to move a chat towards the goal. Each is easy for a visitor to ignore.</p></div></div>
                <div className="cb">
                  <SwitchRow on={draft.engage.microCommit} label="Ask an easy question first" hint="A one-tap question before asking for any details." disabled={off} onChange={(v) => setEngage("microCommit", v)} />
                  <SwitchRow on={draft.engage.objections} label="Handle worries with your approved answers" hint="Uses your Knowledge answers for price, timing and trust worries." disabled={off} onChange={(v) => setEngage("objections", v)} />
                  <Advanced label="Offers and reviews" count={3} summary={offerSummary} open={advOffers.open} onToggle={advOffers.toggle}>
                    <div className="two">
                      <Field label="Free offer button" optional id="f-offer-label" error={err("freeOfferLabel")} dirty={isDirty("f-offer-label")}><input id="f-offer-label" type="text" readOnly={off} value={draft.engage.freeOffer?.label ?? ""} onChange={(e) => setEngage("freeOffer", { label: e.target.value, url: draft.engage.freeOffer?.url ?? "", value: draft.engage.freeOffer?.value ?? "" })} /></Field>
                      <Field label="Offer link" id="f-offer-url" error={err("freeOfferUrl")}><input id="f-offer-url" type="text" readOnly={off} value={draft.engage.freeOffer?.url ?? ""} onChange={(e) => setEngage("freeOffer", { label: draft.engage.freeOffer?.label ?? "", url: e.target.value, value: draft.engage.freeOffer?.value ?? "" })} /></Field>
                    </div>
                    <Field label="What they get from it" id="f-offer-value" error={err("freeOfferValue")}><input id="f-offer-value" type="text" readOnly={off} value={draft.engage.freeOffer?.value ?? ""} onChange={(e) => setEngage("freeOffer", { label: draft.engage.freeOffer?.label ?? "", url: draft.engage.freeOffer?.url ?? "", value: e.target.value })} /></Field>
                    <div className="two">
                      <Field label="Current offer" optional id="f-current-offer" error={err("offerText")} dirty={isDirty("f-current-offer")} hint="Hides itself after the end date. No countdowns."><input id="f-current-offer" type="text" readOnly={off} placeholder="Only if real, for example: rebate month" value={draft.engage.offer?.text ?? ""} onChange={(e) => setEngage("offer", { text: e.target.value, endsOn: draft.engage.offer?.endsOn ?? "" })} /></Field>
                      <Field label="Ends on" id="f-ends" error={err("offerEndsOn")} hint="YYYY-MM-DD"><input id="f-ends" type="text" placeholder="YYYY-MM-DD" readOnly={off} value={draft.engage.offer?.endsOn ?? ""} onChange={(e) => setEngage("offer", { text: draft.engage.offer?.text ?? "", endsOn: e.target.value })} /></Field>
                    </div>
                    <ReviewList items={draft.engage.testimonials} readOnly={off} onChange={(items) => setEngage("testimonials", items)} />
                  </Advanced>
                  <Advanced label="Tone" count={2} summary={TONE_LABEL[draft.tone]} open={advTone.open} onToggle={advTone.toggle}>
                    <Field label="Tone of voice" id="f-tone" error={err("tone")} dirty={isDirty("f-tone")} hint="How the bot sounds in every reply.">
                      <div className="goals" role="radiogroup" aria-label="Tone">
                        {TONES.map((t) => (
                          <button key={t} type="button" role="radio" id={t === "friendly" ? "f-tone" : undefined} aria-checked={draft.tone === t} className={`gc${draft.tone === t ? " on" : ""}`} disabled={off} onClick={() => setLook("tone", t)}>
                            <div><b>{TONE_LABEL[t]}</b></div><span className="rad" />
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Anything else about how it should talk" optional id="f-persona" count={(draft.goal.persona ?? "").length} max={GOAL_LIMITS.persona} error={err("persona")} dirty={isDirty("f-persona")} hint="For example: use Australian spelling.">
                      <textarea id="f-persona" className={off ? "ro" : ""} readOnly={off} maxLength={GOAL_LIMITS.persona} value={draft.goal.persona ?? ""} onChange={(e) => setGoal("persona", e.target.value)} />
                    </Field>
                  </Advanced>
                </div>
              </section>
            </div>
          )}

          {tab === "features" && (
            <div className="col">
              <div className="lead"><div><h2>Features and nudges</h2><p>Extras inside the chat, and gentle prompts on the page.</p></div></div>
              <section className="card">
                <div className="ch"><Icon d="M5 7h14v10H5zM8 7V5h8v2" /><div><h3>In-chat features</h3><p>What visitors can do inside the chat.</p></div></div>
                <div className="cb">
                  <SwitchRow on={draft.engage.endChat} label="End chat and New chat buttons" hint="Visitors can finish or start fresh at any time." disabled={off} onChange={(v) => setEngage("endChat", v)} />
                  <SwitchRow on={draft.engage.emailCopy} label="Offer a copy of the chat at the end" hint="Asks for an email with a consent tick box. Needs lead capture switched on for the account." disabled={off} onChange={(v) => setEngage("emailCopy", v)} />
                  <SwitchRow on={draft.engage.transcripts} label="Show chat transcripts in the client portal" hint="Lets the client read past chats in their portal." disabled={off} onChange={(v) => setEngage("transcripts", v)} />
                </div>
              </section>
              <section className="card">
                <div className="ch"><Icon d="M12 4v8l4 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" /><div><h3>Gentle nudges</h3><p>Shown once per page, at most 3 times a week per visitor. Never opens the chat by itself.</p></div></div>
                <div className="cb">
                  <OpenerList items={draft.engage.openers} readOnly={off} error={err("openers")} onChange={(items) => setEngage("openers", items)} />
                  <Advanced label="Timing nudges" count={3} summary={timingSummary(draft.engage)} open={advTiming.open} onToggle={advTiming.toggle}>
                    <div className="two">
                      <Field label="Idle nudge after" id="f-idle" error={err("idleSeconds")} dirty={isDirty("f-idle")} hint="Seconds. 0 turns it off. 15 to 300."><input id="f-idle" type="text" readOnly={off} value={String(draft.engage.idleSeconds)} onChange={(e) => setEngage("idleSeconds", Number(e.target.value) || 0)} /></Field>
                      <Field label="Scroll nudge at" id="f-scroll" error={err("scrollPercent")} dirty={isDirty("f-scroll")} hint="Percent of the page. 0 turns it off. Up to 90."><input id="f-scroll" type="text" readOnly={off} value={String(draft.engage.scrollPercent)} onChange={(e) => setEngage("scrollPercent", Number(e.target.value) || 0)} /></Field>
                    </div>
                    <SwitchRow on={draft.engage.exitIntent} label="Exit nudge on desktop" hint="A small note when the mouse heads for the close button. Not on phones." disabled={off} onChange={(v) => setEngage("exitIntent", v)} />
                  </Advanced>
                </div>
              </section>
              <section className="card">
                <div className="ch"><Icon d="M12 3l2.2 4.6L19 8.2l-3.5 3.4.8 4.9L12 14.8 7.7 16.5l.8-4.9L5 8.2l4.8-.6z" /><div><h3>Google reviews</h3><p>Ask happy clients for a review at the end of a chat.</p></div></div>
                <div className="cb">
                  <SwitchRow on={draft.engage.reviews.enabled} label="Invite existing clients to leave a Google review" hint="Asked once per visitor. Every existing client is asked, happy or not. Unhappy visitors can pass a concern to the team." disabled={off} onChange={(v) => { setDraft((d) => ({ ...d, engage: { ...d.engage, reviews: reviewsWithEnabled(d.engage.reviews, v) } })); touch(); }} />
                  <Field label="Google review link" id="f-greview" error={err("reviewsUrl")} dirty={isDirty("f-greview")} hint="Paste the link from your Google Business profile.">
                    <input id="f-greview" type="text" readOnly={off} value={draft.engage.reviews.url} onChange={(e) => { const raw = e.target.value; setDraft((d) => ({ ...d, engage: { ...d.engage, reviews: reviewsWithLink(d.engage.reviews, raw) } })); touch(); }} />
                  </Field>
                </div>
              </section>
            </div>
          )}

          {tab === "knowledge" && (
            <div className="col">
              <div className="lead"><div><h2>Knowledge</h2><p>What the bot is allowed to say about the business.</p></div></div>
              {!draft.facts.trim() && draft.faqs.length === 0 && !knowOn ? (
                <section className="card"><div className="cb"><div className="empty">
                  <div className="tile"><Icon d="M6 4h9l3 3v13H6z" /></div>
                  <h4>{who} doesn&apos;t know your business yet</h4>
                  <p>Add your hours, services and prices, then a few common questions with approved answers. The bot only answers from what you add here.</p>
                  {!off && <div className="bt"><Button variant="pri" size="sm" onClick={() => setKnowOn(true)}>Add business facts</Button><Button variant="sec" size="sm" onClick={() => { setKnowOn(true); setLook("faqs", [...draft.faqs, { q: "", a: "" }]); }}>Add a question</Button></div>}
                </div></div></section>
              ) : (
                <>
                  <section className="card">
                    <div className="ch"><Icon d="M6 4h12v16H6z" /><div><h3>Business facts</h3><p>Hours, services, prices, areas and policies. The bot won&apos;t invent anything else.</p></div></div>
                    <div className="cb">
                      <Field label="Facts" id="f-facts" count={draft.facts.length} max={LIMITS.facts} error={err("facts")} dirty={isDirty("f-facts")} hint="Plain text. Short sentences work best.">
                        <textarea id="f-facts" readOnly={off} className={off ? "ro" : ""} maxLength={LIMITS.facts} value={draft.facts} onChange={(e) => setLook("facts", e.target.value)} />
                      </Field>
                    </div>
                  </section>
                  <section className="card">
                    <div className="ch">
                      <Icon d="M8 8h8M8 12h8M8 16h5M6 4h12v16H6z" />
                      <div><h3>Questions and approved answers</h3><p>The bot uses these answers word for word when a visitor asks.</p></div>
                      {!off && <div className="r" style={{ display: "flex", gap: 8 }}><FaqBulkAdd existing={draft.faqs} onAppend={(rows) => { setDraft((cur) => ({ ...cur, faqs: appendFaqs(cur.faqs, rows) })); touch(); }} /></div>}
                    </div>
                    <div className="cb">
                      <FaqList items={draft.faqs} readOnly={off} errors={errors} onChange={(faqs) => setLook("faqs", faqs)} />
                      {!off && <Button variant="sec" size="sm" disabled={draft.faqs.length >= LIMITS.faqs} onClick={() => setLook("faqs", [...draft.faqs, { q: "", a: "" }])}>Add</Button>}
                      <p className="hint">{draft.faqs.length} of {LIMITS.faqs} questions used. A question can be {LIMITS.q} characters and an answer {LIMITS.a}.</p>
                    </div>
                  </section>
                </>
              )}
            </div>
          )}

          {tab === "look" && (
            <div className="col">
              <div className="lead"><div><h2>Look</h2><p>How the chat looks on the site.</p></div></div>
              <section className="card">
                <div className="ch"><Icon d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0" /><div><h3>Name and avatar</h3><p>Who the bot is.</p></div></div>
                <div className="cb">
                  <div className="two">
                    <Field label="Bot name" id="f-botName" count={draft.botName.length} max={40} error={err("botName")} dirty={isDirty("f-botName")}><input id="f-botName" type="text" readOnly={off} className={off ? "ro" : ""} maxLength={40} value={draft.botName} onChange={(e) => setLook("botName", e.target.value)} /></Field>
                    <div className="f">
                      <div className="fl"><label id="f-position-label">Position on the page</label></div>
                      <div className={`seg${off ? " dis" : ""}`} role="radiogroup" aria-labelledby="f-position-label" aria-disabled={off || undefined}>
                        <button type="button" role="radio" id="f-position" aria-checked={draft.position === "right"} className={draft.position === "right" ? "on" : ""} disabled={off} onClick={() => setLook("position", "right")}>Bottom right</button>
                        <button type="button" role="radio" aria-checked={draft.position === "left"} className={draft.position === "left" ? "on" : ""} disabled={off} onClick={() => setLook("position", "left")}>Bottom left</button>
                      </div>
                    </div>
                  </div>
                  <ImageField id="f-avatar" label="Avatar" hint="Square image, at least 128 px. Uses the first letter until you add one." button="Upload image" letter={(who || "A").slice(0, 1).toUpperCase()} value={draft.avatarUrl} readOnly={off} error={err("avatarUrl")} onChange={(v) => setLook("avatarUrl", v)} />
                </div>
              </section>
              <section className="card">
                <div className="ch"><Icon d="M4 6h16v10H8l-4 4z" /><div><h3>Greeting</h3><p>The first thing the bot says.</p></div></div>
                <div className="cb">
                  <Field label="Opening line" id="f-opening" countText="Fixed" hint="Always shown first, so visitors know they're talking to an AI assistant.">
                    <div className="prefix"><Icon d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v8H6z" />{opening}</div>
                  </Field>
                  <Field label="Then say" id="f-greeting" count={draft.greeting.length} max={300} error={err("greeting")} dirty={isDirty("f-greeting")} hint="Don't start with Hi or Hello. The opening line already says it.">
                    <textarea id="f-greeting" readOnly={off} className={off ? "ro" : ""} maxLength={300} value={draft.greeting} onChange={(e) => setLook("greeting", e.target.value)} />
                    {GREETING_START.test(draft.greeting) && <p className="warnm">The opening line already says hello. Start with the next thing you want the bot to say.</p>}
                  </Field>
                </div>
              </section>
              <section className="card">
                <div className="ch"><Icon d="M4 16a6 6 0 0 1 8-5.6A6 6 0 0 1 20 16M8 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /><div><h3>Colours</h3><p>Contrast is checked as you change them.</p></div></div>
                <div className="cb">
                  <div className="swatches">
                    {([["primary", "Header and visitor bubbles"], ["accent", "Accent and button ring"], ["bg", "Chat background"], ["text", "Text"]] as const).map(([k, label]) => (
                      <Field key={k} label={label} id={`f-${k}`} error={err(k)} dirty={isDirty("f-primary")}>
                        <div className="swi">
                          <input type="color" aria-label={`${label} swatch`} disabled={off} value={isHex(draft[k]) ? draft[k] : "#000000"} onChange={(e) => setLook(k, e.target.value)} />
                          <input id={`f-${k}`} type="text" readOnly={off} className={off ? "ro" : ""} value={draft[k]} onChange={(e) => setLook(k, e.target.value)} />
                        </div>
                      </Field>
                    ))}
                  </div>
                  <div role="status">{passes ? <p className="okline">Text and header colours pass the readability check (AA).</p> : <p className="err" role="alert">Text or header colours are hard to read. Try a darker text or header colour.</p>}</div>
                </div>
              </section>
              <section className="card">
                {mode === "admin" ? (
                  <Advanced label="Branding" count={1} summary={poweredByVisible(row.plan as Plan, draft.showPoweredBy) ? '"Powered by Saabai" shown' : '"Powered by Saabai" hidden'} open={advBrand.open} onToggle={advBrand.toggle}>
                    <SwitchRow on={poweredByVisible(row.plan as Plan, draft.showPoweredBy)} label='Show "Powered by Saabai"' hint={canHide ? "Can be switched off on Growth and Signature. Always shown on Presence." : "Always shown on Presence. It can be removed on Growth and Signature."} disabled={off || !canHide} onChange={(v) => setLook("showPoweredBy", v)} />
                    {err("showPoweredBy") && <p className="err" role="alert">{err("showPoweredBy")}</p>}
                  </Advanced>
                ) : (
                  <Advanced label="Branding" count={1} summary={draft.logoUrl ? "Logo added" : "No logo yet"} open={advBrand.open} onToggle={advBrand.toggle}>
                    <ImageField id="f-logo" label="Logo" hint="Shown in the chat header. PNG or SVG, at least 256 px wide. Paste an https link." button="Add logo link" logo letter="" value={draft.logoUrl} readOnly={off} error={err("logoUrl")} onChange={(v) => setLook("logoUrl", v)} />
                  </Advanced>
                )}
              </section>
            </div>
          )}

          {tab === "results" && showResults && (
            <div className="col" id="results">
              <div className="lead"><div><h2>Results and install</h2><p>How the bot is doing, and how to put it on a site.</p></div></div>
              {chats === 0 ? (
                <section className="card"><div className="cb">
                  <div className="kpis">
                    <Kpi label="Chats this month" value="0" sub={cap ? `of ${cap}` : ""} />
                    <Kpi label="Reached the goal" value="0" sub="no data" />
                    <Kpi label="Goal rate" value="no data" sub="" />
                    <Kpi label="Handed to the team" value="0" sub="" />
                  </div>
                  <div className="empty">
                    <div className="tile"><Icon d="M4 19V5M4 19h16M8 16v-4M12 16V8M16 16v-6" /></div>
                    <h4>No chats yet</h4>
                    <p>Results show up here after the first visitor chats with {who}. Check these first:</p>
                    <p className="hint">{draft.goal.primary !== "none" && (draft.facts.trim() || draft.faqs.length) ? "Goal and knowledge are set up." : "Set a goal and add knowledge before you send traffic."}</p>
                    <p className="hint">Copy the install line onto the site if it is not a factory site.</p>
                    <div className="bt">
                      <Button variant="sec" size="sm" onClick={() => { void navigator.clipboard?.writeText(installSnippet(row.slug)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy install line"}</Button>
                      {siteHref && <a className="btn sec sm" href={siteHref} target="_blank" rel="noreferrer">Open site</a>}
                    </div>
                  </div>
                </div></section>
              ) : (
                <>
                  <div className="kpis">
                    <Kpi label="Chats this month" value={String(chats)} sub={cap ? `of ${cap}` : ""} />
                    <Kpi label="Plan" value={PLAN_LABEL[row.plan as Plan] ?? row.plan} sub={cap ? `${cap} chats` : ""} />
                  </div>
                  <section className="card">
                    <div className="ch"><div><h3>Conversion funnel</h3><p>This month. Counts only.</p></div></div>
                    <div className="cb">
                      <InsightsPanel variant="summary" transcriptsOn={draft.engage.transcripts} endpoint={`/api/admin/chatbots/insights?slug=${encodeURIComponent(row.slug)}`} historyHref={chatbotHistoryPath(row.slug)} />
                    </div>
                  </section>
                </>
              )}
              <section className="card">
                <div className="ch"><div><h3>Install on a site</h3><p>One line, just before the closing body tag. Factory sites get it automatically.</p></div></div>
                <div className="cb">
                  <div className="code" data-testid="snippet"><span>{installSnippet(row.slug)}</span><Button variant="sec" size="sm" onClick={() => { void navigator.clipboard?.writeText(installSnippet(row.slug)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy"}</Button></div>
                </div>
              </section>
              <section className="card">
                <div className="ch"><div><h3>Plan and status</h3><p>Changes here save straight away.</p></div></div>
                <div className="cb two">
                  <Field label="Plan" id="f-plan">
                    <select id="f-plan" value={row.plan} disabled={kill} onChange={(e) => { void fetch("/api/admin/chatbots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: row.slug, action: "set_plan", plan: e.target.value }) }).then(() => onSaved()); }}>
                      {(plans.length ? plans : [{ key: row.plan, label: PLAN_LABEL[row.plan as Plan] ?? row.plan, cap: row.cap?.cap ?? 0 }]).map((p) => <option key={p.key} value={p.key}>{p.label}{p.cap ? `, ${p.cap} chats a month` : ""}</option>)}
                    </select>
                  </Field>
                  <div className="f">
                    <div className="fl"><label>Status</label></div>
                    <div className="seg" role="radiogroup" aria-label="Status">
                      <button type="button" className={row.enabled ? "on" : ""} disabled={kill} onClick={() => { if (!row.enabled) void fetch("/api/admin/chatbots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: row.slug, action: "set_enabled", enabled: true, reason: "" }) }).then(() => onSaved()); }}>On, answering visitors</button>
                      <button type="button" className={!row.enabled ? "on" : ""} disabled={kill} onClick={() => { if (row.enabled) void fetch("/api/admin/chatbots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: row.slug, action: "set_enabled", enabled: false, reason: "" }) }).then(() => onSaved()); }}>Off, break message</button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {tab === "history" && mode === "client" && (
            <div className="col">
              <div className="lead"><div><h2>Chat history</h2><p>Counts, and transcripts when they are switched on.</p></div></div>
              <InsightsPanel endpoint="/api/portal/chatbot/insights" />
            </div>
          )}
        </div>

        {tab !== "history" && (
          <aside className={`cbed-preview${previewOpen ? " open" : ""}`} aria-label="Live preview">
            <section className="card"><div className="pvc">
              <div className="pvh"><b>Live preview</b><span className="live">Updates as you type</span>{previewOpen && <Button variant="sec" size="sm" onClick={() => setPreviewOpen(false)}>Close</Button>}</div>
              <div className="pvctl">
                <div className="ctl"><span>Device</span>
                  <div className="seg" role="radiogroup" aria-label="Device">
                    <button type="button" role="radio" aria-checked={width === "desktop"} className={width === "desktop" ? "on" : ""} onClick={() => setWidth("desktop")}>Desktop</button>
                    <button type="button" role="radio" aria-checked={width === "mobile"} className={width === "mobile" ? "on" : ""} onClick={() => setWidth("mobile")}>Mobile</button>
                  </div>
                </div>
                <div className="ctl"><span>Page behind</span>
                  <div className="seg" role="radiogroup" aria-label="Page behind">
                    {(["light", "dark", "photo"] as const).map((b) => (
                      <button key={b} type="button" role="radio" aria-checked={back === b} className={back === b ? "on" : ""} onClick={() => setBack(b)}>{b === "light" ? "Light" : b === "dark" ? "Dark" : "Photo"}</button>
                    ))}
                  </div>
                </div>
              </div>
              <button type="button" className="pvtg" data-testid="preview-off" aria-pressed={showOff} onClick={() => setShowOff((v) => !v)}>
                Show the break message
                <span className={`sw${showOff ? " on" : ""}`} aria-hidden="true"><i /></span>
              </button>
              {dirty && <p className="cbed-note">Preview shows your unsaved changes. Visitors still see the saved version.</p>}
              <div className="cbed-pvbox" style={{ background: bgStyle }}>
                <iframe ref={frame} title={`Chat widget preview for ${row.name}`} src="/embed/preview.html" style={{ width: width === "mobile" ? 390 : "100%", marginLeft: width === "mobile" ? "auto" : undefined, marginRight: width === "mobile" ? "auto" : undefined }} data-testid="preview-frame" />
              </div>
              <p className="cbed-foot">This is the real widget. Replies here are sample replies.</p>
            </div></section>
          </aside>
        )}
      </div>

      {!off && (
        <div className={`cbed-save ${bar === "bad" ? "bad" : bar === "saved" ? "ok" : dirty ? "dirty" : ""}`}>
          <div className="msg" role="status">
            {bar === "bad" && fail ? <button type="button" className="jump" onClick={() => focusField(fail.id || "f-cta-url", fail.tab)}>{fail.text} Go to field</button>
              : bar === "saved" ? <span>Saved at {brisbaneStamp(new Date().toISOString())}. The live widget picks it up within about a minute.</span>
              : dirty ? <><i className="dot" aria-hidden="true" /><b>{changed.length} unsaved change{changed.length === 1 ? "" : "s"}</b> on {names.join(", ")}: {changed.slice(0, 4).map((c) => c.label).join(", ")}.</>
              : <span>All changes saved.{row.lastChange?.at ? ` Last changed ${brisbaneStamp(row.lastChange.at)}${row.lastChange.by ? ` by ${row.lastChange.by}` : ""}.` : ""}</span>}
          </div>
          <div className="bts">
            <Button variant="sec" disabled={!dirty || busy} onClick={() => { setDraft(saved); setErrors({}); setFail(null); setBar("clean"); }}>Discard</Button>
            <Button variant="pri" disabled={!dirty || busy || bar === "bad"} loading={busy} onClick={() => void save()} data-testid="editor-save">{busy ? "Saving" : "Save changes"}</Button>
          </div>
        </div>
      )}
      {tab !== "history" && <button type="button" className="cbed-fab" onClick={() => setPreviewOpen(true)}>Preview</button>}
      {toast && <div className="cbed-toast" role="status">{toast}</div>}
    </div>
  );
}

function timingSummary(e: EngageConfig) {
  const bits = [e.idleSeconds ? `idle ${e.idleSeconds}s` : "", e.scrollPercent ? `scroll ${e.scrollPercent}%` : "", e.exitIntent ? "exit on" : ""].filter(Boolean);
  return bits.length ? bits.join(", ") : "Nudges off";
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div className="kpi"><div className="l">{label}</div><div className="v">{value}</div>{sub && <div className="s">{sub}</div>}</div>;
}

function subscribeAdv(onChange: () => void) {
  window.addEventListener("cbed-adv", onChange);
  return () => window.removeEventListener("cbed-adv", onChange);
}
function useOpen(key: string) {
  const storeKey = `cbed-adv:${key}`;
  const open = useSyncExternalStore(
    subscribeAdv,
    () => { try { return sessionStorage.getItem(storeKey) === "1"; } catch { return false; } },
    () => false,
  );
  const toggle = (next: boolean) => {
    try { sessionStorage.setItem(storeKey, next ? "1" : "0"); } catch { /* private mode */ }
    window.dispatchEvent(new Event("cbed-adv"));
  };
  return { open, toggle };
}

function Field({ label, id, hint, error, count, max, countText, dirty, optional, children }: { label: string; id: string; hint?: string; error?: string; count?: number; max?: number; countText?: string; dirty?: boolean; optional?: boolean; children: ReactNode }) {
  return (
    <div className={`f${dirty ? " dirty" : ""}${error ? " bad" : ""}`}>
      <div className="fl"><label htmlFor={id}>{label}{optional && <span className="opt"> (optional)</span>}</label>{countText ? <span className="c">{countText}</span> : max != null && <span className={countClass(count ?? 0, max)}>{count ?? 0}/{max}</span>}</div>
      {children}
      {error ? <p className="err" role="alert" id={`${id}-err`}>{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

function SwitchRow({ on, label, hint, disabled, onChange }: { on: boolean; label: string; hint: string; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="tg">
      <button type="button" className="tg-hit" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)}>
        <span><b>{label}</b><p>{hint}</p></span>
        <span className={`sw${on ? " on" : ""}`} aria-hidden="true"><i /></span>
      </button>
    </div>
  );
}

function Advanced({ label, count, summary, open, onToggle, children }: { label: string; count: number; summary: string; open: boolean; onToggle: (v: boolean) => void; children: ReactNode }) {
  return (
    <div className={`adv${open ? " open" : ""}`}>
      <button type="button" className="advh" aria-expanded={open} onClick={() => onToggle(!open)}>
        <Icon d={open ? "M6 9l6 6 6-6" : "M9 6l6 6-6 6"} />
        {label}
        <span className="cnt">{count}</span>
        <span className="sum">{open ? "Hide" : summary}</span>
      </button>
      {open && <div className="advb">{children}</div>}
    </div>
  );
}

function ImageField({ id, label, hint, button, letter, value, readOnly, error, onChange, logo }: { id: string; label: string; hint: string; button: string; letter: string; value: string; readOnly?: boolean; error?: string; onChange: (v: string) => void; logo?: boolean }) {
  const [edit, setEdit] = useState(!!value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (edit) ref.current?.focus(); }, [edit]);
  return (
    <div className="upl">
      <span className={`a${logo ? " logo" : ""}`}>{value && !error ? <img src={value} alt="" /> : (letter || <Icon d="M12 16V4M7 9l5-5 5 5M4 20h16" />)}</span>
      <div className="upl-copy">
        <b>{label}</b>
        <p className="hint">{hint}</p>
        {(edit || value) && <input ref={ref} id={id} type="text" className={readOnly ? "ro" : ""} readOnly={readOnly} placeholder="https://" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} />}
        {error && <p className="err" role="alert">{error}</p>}
      </div>
      {!readOnly && <button type="button" className="btn sm" onClick={() => setEdit(true)}>{button}</button>}
    </div>
  );
}

function QuestionList({ items, readOnly, error, onChange }: { items: string[]; readOnly?: boolean; error?: string; onChange: (v: string[]) => void }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Field label="Questions" id="f-questions" countText={`${items.length} of 4`} error={error} hint="Asked one at a time, only when they fit. 140 characters each.">
      <div className="rows">
        {items.map((item, i) => (
          <div key={i}>
            <div className="row" draggable={!readOnly} onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const from = Number(e.dataTransfer.getData("text/plain")); if (!Number.isInteger(from) || from === i) return; const next = items.slice(); const [row] = next.splice(from, 1); next.splice(i, 0, row); onChange(next); }}>
              {!readOnly && <span className="grip" aria-hidden="true">⋮⋮</span>}
              <span className="i">{i + 1}</span>
              <button type="button" className="t" onClick={() => setOpen(open === i ? null : i)}><b>{item}</b></button>
              {!readOnly && <button type="button" className="btn gh ic sm" aria-label={`Remove ${item}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>×</button>}
            </div>
            {open === i && !readOnly && (
              <div className="fqo">
                <input type="text" aria-label={`Question ${i + 1}`} maxLength={GOAL_LIMITS.question} value={item} onChange={(e) => onChange(items.map((x, j) => j === i ? e.target.value : x))} />
                <Button variant="sec" size="sm" onClick={() => setOpen(null)}>Done</Button>
              </div>
            )}
          </div>
        ))}
      </div>
      {!readOnly && items.length < 4 && (
        <div className="addrow">
          <input id="f-questions" type="text" value={text} maxLength={GOAL_LIMITS.question} placeholder="Add a question, for example: When did it start?" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { e.preventDefault(); onChange([...items, text.trim()].slice(0, 4)); setText(""); } }} />
          <Button variant="sec" size="sm" onClick={() => { if (text.trim()) { onChange([...items, text.trim()].slice(0, 4)); setText(""); } }}>Add</Button>
        </div>
      )}
    </Field>
  );
}

function ReviewList({ items, readOnly, onChange }: { items: Testimonial[]; readOnly?: boolean; onChange: (v: Testimonial[]) => void }) {
  const [quote, setQuote] = useState("");
  const [name, setName] = useState("");
  return (
    <Field label="Client reviews the bot can quote" id="f-reviews" countText={`${items.length} of 5`} hint="Quoted word for word. The bot never makes reviews up.">
      <div className="rows">
        {items.map((t, i) => (
          <div className="row" key={i}>
            <span className="t"><b>&ldquo;{t.quote}&rdquo;</b><small>{t.name}</small></span>
            {!readOnly && <button type="button" className="btn gh ic sm" aria-label="Remove review" onClick={() => onChange(items.filter((_, j) => j !== i))}>×</button>}
          </div>
        ))}
      </div>
      {!readOnly && items.length < 5 && (
        <div className="two">
          <input type="text" aria-label="Review quote" placeholder="The quote" value={quote} onChange={(e) => setQuote(e.target.value)} />
          <div className="addrow">
            <input type="text" aria-label="Review name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Button variant="sec" size="sm" onClick={() => { if (quote.trim() && name.trim()) { onChange([...items, { quote: quote.trim(), name: name.trim() }]); setQuote(""); setName(""); } }}>Add</Button>
          </div>
        </div>
      )}
    </Field>
  );
}

function OpenerList({ items, readOnly, error, onChange }: { items: Opener[]; readOnly?: boolean; error?: string; onChange: (v: Opener[]) => void }) {
  const [match, setMatch] = useState("");
  const [text, setText] = useState("");
  return (
    <Field label="Page openers" id="f-openers" countText={`${items.length} of 6`} error={error} hint="A page path and a short message. Up to 6.">
      <div className="rows">
        {items.map((o, i) => (
          <div className="row" key={i}>
            <span className="t"><b>{o.match}</b><small>{o.text}</small></span>
            {!readOnly && <button type="button" className="btn gh ic sm" aria-label="Remove opener" onClick={() => onChange(items.filter((_, j) => j !== i))}>×</button>}
          </div>
        ))}
      </div>
      {!readOnly && items.length < 6 && (
        <div className="addrow">
          <input id="f-openers" type="text" placeholder="/page path" value={match} onChange={(e) => setMatch(e.target.value)} />
          <input type="text" placeholder="Short message for that page" value={text} onChange={(e) => setText(e.target.value)} />
          <Button variant="sec" size="sm" onClick={() => { if (match.trim() && text.trim()) { onChange([...items, { match: match.trim(), text: text.trim() }]); setMatch(""); setText(""); } }}>Add</Button>
        </div>
      )}
    </Field>
  );
}

function FaqList({ items, readOnly, errors, onChange }: { items: Faq[]; readOnly?: boolean; errors: Record<string, string>; onChange: (v: Faq[]) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(items.findIndex((f) => !f.q || !f.a));
  const shown = items.map((f, i) => ({ f, i })).filter((x) => !q || `${x.f.q} ${x.f.a}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <input className="search" type="text" aria-label="Search questions" placeholder={`Search ${items.length} questions`} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="rows">
        {shown.map(({ f, i }) => (
          <div key={i}>
            <button type="button" className="row" onClick={() => setOpen(open === i ? null : i)}>
              <span className="t"><b>{f.q || "New question"}</b><small>{f.a || "Add an approved answer"}</small></span>
            </button>
            {open === i && (
              <div className="fqo">
                <Field label="Question" id={`faq-q-${i}`} count={f.q.length} max={LIMITS.q} error={errors[`faq${i}`]}>
                  <input id={`faq-q-${i}`} type="text" readOnly={readOnly} maxLength={LIMITS.q} value={f.q} onChange={(e) => onChange(items.map((x, j) => j === i ? { ...x, q: e.target.value } : x))} />
                </Field>
                <Field label="Approved answer" id={`faq-a-${i}`} count={f.a.length} max={LIMITS.a} hint="Used word for word.">
                  <textarea id={`faq-a-${i}`} readOnly={readOnly} maxLength={LIMITS.a} value={f.a} onChange={(e) => onChange(items.map((x, j) => j === i ? { ...x, a: e.target.value } : x))} />
                </Field>
                <div className="addrow">
                  {!readOnly && <button type="button" className="btn gh" style={{ color: "var(--bad)" }} onClick={() => { onChange(items.filter((_, j) => j !== i)); setOpen(null); }}>Remove</button>}
                  <Button variant="sec" size="sm" onClick={() => setOpen(null)}>Done</Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;
}
function Check() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>;
}
