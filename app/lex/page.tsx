"use client";

import { PORTAL_REQUESTS_HREF } from "@/lib/portal-pages";

import { useState, useRef, useEffect, useCallback } from "react";
import { DOCUMENT_TYPES } from "../../lib/lex-document-types";
import {
  type LexError, cleanThreads, stripErrorAnswers, isStreamErrorPart,
  lexErrorFromResponse, lexErrorFromStatus, lexNetworkError, lexEmptyError,
} from "../../lib/lex-errors";
import type { LexAnswerMeta } from "../../lib/lex-sources";
import { answerWithSources, citedSources } from "../../lib/lex-cite-display";
import { type ChatMessage, type Thread, type Project, type Mode, ATTACH_MARK } from "./_components/types";
import { Sidebar, initials } from "./_components/Sidebar";
import { AnswerSheet, brisbaneStamp } from "./_components/Answer";
import { SourcesPanel } from "./_components/SourcesPanel";
import { Composer, EmptyState, SearchingSteps, ErrorCard, NoResultsCard, FOLLOW_UPS, type Attachment } from "./_components/States";
import { CommandPalette, FlagDialog, ShareMenu } from "./_components/Extras";
import { type LexStep, applyStepPart, stepSummary, mailtoHref } from "../../lib/lex-steps";
import { ALL_SCOPES, isFullScope, normalizeScope, type LexScopeKey } from "../../lib/lex-scope";
import type { FlagReason } from "../../lib/lex-flag";
import { Icon } from "./_components/icons";
import { exportAnswerToWord } from "./_components/exportAnswer";
import { exportDraftToWord } from "./_components/exportDraft";
import { DraftingView } from "./_components/Drafting";
import { AccountView, InvoicesView } from "./_components/Account";
import { FirmDashboard } from "./_components/Dashboard";
import { MattersView, MatterDetail, MatterBar, NewMatterDialog } from "./_components/Matters";
import type { Matter, MatterItem } from "../../lib/lex-matters";
import type { FirmUsage } from "../../lib/lex-review-access";
import type { QAReport } from "../../lib/lex-draft-display";
import type { ReviewReport } from "../../lib/lex-review-display";
import { ReviewView } from "./_components/Review";
import { exportReviewToWord } from "./_components/exportReview";



const PROJECT_COLOURS = ["#62c5d1","#5b8dee","#25c986","#f97316","#a78bfa","#f472b6"];



// ── Helpers ───────────────────────────────────────────────────────────────────
/** The question as typed, without any attached document text. */
function shownQuestion(content: string): string {
  return content.split(ATTACH_MARK)[0];
}

const ATTACH_MAX_CHARS = 12000;

function threadTitle(msgs: ChatMessage[]): string {
  const firstMsg = msgs.find(m => m.role === "user")?.content;
  const first = firstMsg ? shownQuestion(firstMsg) : "New research";
  return first.length > 52 ? first.slice(0, 52) + "…" : first;
}

// ── Error card: failures are shown as a state, never as an answer ─────────────
// ── Thinking dots ─────────────────────────────────────────────────────────────
// ── Thinking label from query ─────────────────────────────────────────────────
function thinkingFor(msg: string): string {
  const l = msg.toLowerCase();
  if (/austlii|case law|case|judgment|tribunal/.test(l)) return "Searching AustLII…";
  if (/ato|tax|ruling|gst|cgt|income/.test(l)) return "Checking ATO…";
  if (/legislation|act|section|regulation|statute/.test(l)) return "Searching legislation…";
  if (/uk|england|new zealand|nz|ireland|international/.test(l)) return "Searching international databases…";
  if (/draft|write|letter|advice|memo/.test(l)) return "Drafting…";
  return "Researching…";
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LexPage() {
  const clientId = "lex-internal";

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [threadMenu, setThreadMenu] = useState<{ threadId: string; x: number; y: number } | null>(null);
  const [projectMenu, setProjectMenu] = useState<{ projectId: string; x: number; y: number } | null>(null);
  const [renameState, setRenameState] = useState<{ type: "thread" | "project"; id: string; value: string } | null>(null);
  const [moveDialog, setMoveDialog] = useState<string | null>(null); // threadId being moved

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkLabel, setThinkLabel] = useState("Researching…");
  const [steps, setSteps] = useState<LexStep[]>([]);
  const [scope, setScopeState] = useState<LexScopeKey[]>(ALL_SCOPES);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [flagFor, setFlagFor] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  // True from send until the stream ends (loading only covers the wait for the first words).
  const [researchActive, setResearchActive] = useState(false);
  // Sources panel: which answer it shows (message index) and which citation is selected.
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelMsg, setPanelMsg] = useState<number | null>(null);
  const [selectedCite, setSelectedCite] = useState<number | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  // Shown in the sidebar only; thread sync still keys on userEmail from the portal session.
  const [displayEmail, setDisplayEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [firmUsage, setFirmUsage] = useState<FirmUsage | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState<number | null>(null);

  // ── Draft mode state ───────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("research");
  const [draftTypeId, setDraftTypeId] = useState<string>(DOCUMENT_TYPES[0].id);
  const [draftParties, setDraftParties] = useState("");
  const [draftJurisdiction, setDraftJurisdiction] = useState("All Australian jurisdictions");
  const [draftInstructions, setDraftInstructions] = useState("");
  const [draftResponseLength, setDraftResponseLength] = useState<"default" | "concise" | "balanced" | "detailed">("default");
  const [draftText, setDraftText] = useState("");
  const [draftQA, setDraftQA] = useState<QAReport | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftQALoading, setDraftQALoading] = useState(false);
  const [draftThinkLabel, setDraftThinkLabel] = useState("Searching legislation…");
  const [draftCopied, setDraftCopied] = useState(false);
  const draftAbortRef  = useRef<AbortController | null>(null);

  // ── Review mode state ──────────────────────────────────────────────────────
  const [reviewDirection, setReviewDirection]     = useState<"incoming" | "outgoing">("incoming");
  const [reviewDocType, setReviewDocType]         = useState("auto-detect");
  const [reviewActingFor, setReviewActingFor]     = useState("vendor");
  const [reviewJurisdiction, setReviewJurisdiction] = useState("All Australian jurisdictions");
  const [reviewInputMode, setReviewInputMode]     = useState<"upload" | "paste">("upload");
  const [reviewPasteText, setReviewPasteText]     = useState("");
  const [reviewFile, setReviewFile]               = useState<File | null>(null);
  const [reviewLoading, setReviewLoading]         = useState(false);
  const [reviewStage, setReviewStage]             = useState("Extracting document...");
  const [reviewReport, setReviewReport]           = useState<ReviewReport | null>(null);
  const [reviewError, setReviewError]             = useState<LexError | null>(null);
  const [reviewDocText, setReviewDocText]         = useState("");
  // Matter context fields
  const [reviewSubmittedBy, setReviewSubmittedBy] = useState("");
  const [reviewMatterNo, setReviewMatterNo]       = useState("");
  const [reviewClientName, setReviewClientName]   = useState("");
  // Supervision submit state
  const [submitLoading, setSubmitLoading]         = useState(false);
  const [submitDone, setSubmitDone]               = useState(false);
  const [submitError, setSubmitError]             = useState<LexError | null>(null);
  // Comparison state

  const bottomRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);
  const abortRef     = useRef<AbortController | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Email state ──────────────────────────────────────────────────────────
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // ── Client intake state ───────────────────────────────────────────────
  const [intakeOpen, setIntakeOpen] = useState(false);
  // ── Matters (firm-wide, by email domain) ─────────────────────────────
  const [matters, setMatters] = useState<Matter[]>([]);
  const [mattersLoading, setMattersLoading] = useState(false);
  const [mattersError, setMattersError] = useState<string | null>(null);
  const [activeMatterId, setActiveMatterIdState] = useState<string | null>(null);
  const [openMatterId, setOpenMatterId] = useState<string | null>(null);
  const [matterItems, setMatterItems] = useState<MatterItem[] | null>(null);
  const [matterBusy, setMatterBusy] = useState(false);
  const [matterError, setMatterError] = useState<string | null>(null);
  const syncedRef = useRef<Record<string, string>>({});

  // ── Firm settings state ───────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [firmName, setFirmName] = useState("");
  const [firmLogo, setFirmLogo] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  // Research failure for one thread. Kept out of the thread so it is never saved or sent to the model.
  const [researchError, setResearchError] = useState<{ threadId: string; error: LexError; retryText: string } | null>(null);
  const [draftError, setDraftError] = useState<LexError | null>(null);

  const activeThread = threads.find(t => t.id === activeId) ?? null;
  const messages = activeThread?.messages ?? [];

  // Hydrate threads + projects + chips after mount; then check auth and load from Redis
  useEffect(() => {
    async function init() {
      // 1. Load from anonymous localStorage first (no flicker)
      try {
        const saved = cleanThreads(JSON.parse(localStorage.getItem("lex_threads") ?? "[]") as Thread[]);
        if (saved.length > 0) { setThreads(saved); setActiveId(saved[0].id); }
      } catch {}
      try {
        try { const sc = localStorage.getItem("lex:scope"); if (sc) setScopeState(normalizeScope(JSON.parse(sc))); } catch {}
        const savedProjects = JSON.parse(localStorage.getItem("lex_projects") ?? "[]") as Project[];
        if (savedProjects.length > 0) {
          setProjects(savedProjects);
          setExpandedProjects(new Set(savedProjects.map(p => p.id)));
        }
      } catch {}
      try {
        const savedLogo = localStorage.getItem("lex_firm_logo");
        const savedName = localStorage.getItem("lex_firm_name");
        if (savedLogo) setFirmLogo(savedLogo);
        if (savedName) setFirmName(savedName);
      } catch {}

      const lexMe: Promise<string | null> = fetch("/api/lex-me").then(r => (r.ok ? r.json() : null)).then(d => {
        if (typeof d?.email === "string") setDisplayEmail(d.email);
        if (typeof d?.name === "string" && d.name) setDisplayName(d.name);
        if (d?.admin === true) setDisplayName("Saabai admin");
        setIsAdmin(d?.admin === true);
        if (d?.usage && typeof d.usage.reviews === "number") setFirmUsage(d.usage as FirmUsage);
        return typeof d?.email === "string" ? d.email : null;
      }).catch(() => null);
      try { const am = localStorage.getItem("lex:matter"); if (am) setActiveMatterIdState(am); } catch {}
      if (new URLSearchParams(window.location.search).get("view") === "matters") setMode("matters");
      // Deep links: /lex?view=account and /lex?view=invoices open those pages inside the Lex shell.
      if (new URLSearchParams(window.location.search).get("view") === "account") setMode("account");
      if (new URLSearchParams(window.location.search).get("view") === "invoices") setMode("invoices");
      // Deep link: /lex?view=dashboard opens the firm dashboard inside the Lex shell.
      if (new URLSearchParams(window.location.search).get("view") === "dashboard") setMode("dashboard");
      // Narrow screens start with the sources panel closed (it opens as a bottom sheet).
      if (window.matchMedia("(max-width: 980px)").matches) setPanelOpen(false);

      // 2. Check auth and load user-scoped data from Redis
      try {
        const portalMe = await fetch("/api/portal/me").then(r => r.json()).catch(() => null);
        // Firm users signed in through /login have no portal session; /api/lex-me knows them.
        const me = portalMe?.authenticated && portalMe.email ? portalMe : { authenticated: !!(await lexMe), email: await lexMe };
        if (me.authenticated && me.email) {
          setUserEmail(me.email);
          // Prefer user-scoped localStorage (quick win while Redis loads)
          const userKey = `lex_threads_${me.email}`;
          try {
            const localSaved = cleanThreads(JSON.parse(localStorage.getItem(userKey) ?? "[]") as Thread[]);
            if (localSaved.length > 0) { setThreads(localSaved); setActiveId(localSaved[0].id); }
          } catch {}
          // Load from Redis: authoritative, works across devices
          const res = await fetch("/api/lex-threads");
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.threads) && data.threads.length > 0) {
              const clean = cleanThreads(data.threads as Thread[]);
              setThreads(clean);
              setActiveId(clean[0].id);
            }
          }
        }
      } catch {}
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist threads: localStorage always, Redis (debounced 2s) when authenticated
  useEffect(() => {
    const storageKey = userEmail ? `lex_threads_${userEmail}` : "lex_threads";
    try { localStorage.setItem(storageKey, JSON.stringify(threads)); } catch {}

    if (userEmail) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        fetch("/api/lex-threads", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threads }),
        }).catch(() => {});
      }, 2000);
    }
  }, [threads, userEmail]);

  // Persist projects
  useEffect(() => {
    const storageKey = userEmail ? `lex_projects_${userEmail}` : "lex_projects";
    try { localStorage.setItem(storageKey, JSON.stringify(projects)); } catch {}
  }, [projects, userEmail]);

  // Close menus on outside click
  useEffect(() => {
    if (!threadMenu && !projectMenu && !moveDialog) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-menu]")) {
        setThreadMenu(null);
        setProjectMenu(null);
        setMoveDialog(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [threadMenu, projectMenu, moveDialog]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
  }, [input]);

  // Fire pre-filled query from ?q= URL param (e.g. from client portal top questions)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      window.history.replaceState({}, "", "/lex");
      sendMessage(q);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Matters ───────────────────────────────────────────────────────────
  const loadMatters = useCallback(async () => {
    setMattersLoading(true); setMattersError(null);
    try {
      const r = await fetch("/api/lex-matters");
      if (!r.ok) throw new Error(r.status === 401 ? "You are signed out. Sign in again to see your firm's matters." : "Lex could not reach the matters service. Try again.");
      const d = await r.json();
      setMatters(Array.isArray(d.matters) ? d.matters : []);
    } catch (e) { setMattersError(e instanceof Error ? e.message : "Could not load matters."); }
    setMattersLoading(false);
  }, []);
  useEffect(() => { loadMatters(); }, [loadMatters]);
  const activeMatter = matters.find(m => m.id === activeMatterId) ?? null;
  const openMatter = matters.find(m => m.id === openMatterId) ?? null;
  function setActiveMatterId(id: string | null) {
    setActiveMatterIdState(id);
    try { if (id) localStorage.setItem("lex:matter", id); else localStorage.removeItem("lex:matter"); } catch {}
  }
  async function openMatterDetail(id: string) {
    setOpenMatterId(id); setMatterItems(null); setMatterError(null); setMode("matters"); setNavOpen(false);
    try {
      const r = await fetch(`/api/lex-matters/${encodeURIComponent(id)}`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      setMatterItems(Array.isArray(d.items) ? d.items : []);
      if (d.matter) setMatters(prev => prev.map(m => m.id === id ? d.matter : m));
    } catch { setMatterItems([]); setMatterError("The items in this matter could not load. Try again."); }
  }
  async function createMatterFromDialog(f: Record<string, unknown>) {
    setMatterBusy(true); setMatterError(null);
    try {
      const r = await fetch("/api/lex-matters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.matter) throw new Error(d.error || "The matter could not be created.");
      setMatters(prev => [d.matter, ...prev]);
      setActiveMatterId(d.matter.id);
      setIntakeOpen(false);
      openMatterDetail(d.matter.id);
    } catch (e) { setMatterError(e instanceof Error ? e.message : "The matter could not be created."); }
    setMatterBusy(false);
  }
  async function updateOpenMatter(f: Partial<Matter>) {
    if (!openMatterId) return;
    setMatterBusy(true); setMatterError(null);
    try {
      const r = await fetch(`/api/lex-matters/${encodeURIComponent(openMatterId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.matter) throw new Error(d.error || "The changes could not be saved.");
      setMatters(prev => prev.map(m => m.id === d.matter.id ? d.matter : m));
    } catch (e) { setMatterError(e instanceof Error ? e.message : "The changes could not be saved."); }
    setMatterBusy(false);
  }
  /** Saves a snapshot to a matter. Skips when nothing changed since the last save. */
  async function attachToMatter(matterId: string, item: { ref: string; kind: MatterItem["kind"]; title: string; data: unknown }) {
    const sig = JSON.stringify(item).length + ":" + item.title;
    const key = `${matterId}|${item.ref}`;
    if (syncedRef.current[key] === sig) return;
    syncedRef.current[key] = sig;
    try {
      const r = await fetch(`/api/lex-matters/${encodeURIComponent(matterId)}/items`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { delete syncedRef.current[key]; return; }
      if (d.matter) setMatters(prev => prev.map(m => m.id === d.matter.id ? d.matter : m));
      if (d.item && openMatterId === matterId) setMatterItems(prev => prev ? [d.item, ...prev.filter(i => i.ref !== d.item.ref)] : prev);
    } catch { delete syncedRef.current[key]; }
  }
  async function removeMatterItem(ref: string) {
    if (!openMatterId) return;
    const r = await fetch(`/api/lex-matters/${encodeURIComponent(openMatterId)}/items?ref=${encodeURIComponent(ref)}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) { setMatterItems(prev => prev?.filter(i => i.ref !== ref) ?? prev); loadMatters(); }
    else setMatterError("That item could not be removed. Try again.");
  }
  function openMatterItem(i: MatterItem) {
    const d = (i.data ?? {}) as Record<string, unknown>;
    if (i.kind === "research" && Array.isArray(d.messages)) {
      const id = `m_${i.ref.replace(/^research:/, "")}`;
      const t: Thread = { id, title: i.title, messages: d.messages as ChatMessage[], createdAt: i.at, matterId: openMatterId ?? undefined };
      setThreads(prev => [t, ...prev.filter(x => x.id !== id && x.id !== i.ref.replace(/^research:/, ""))]);
      setActiveId(id); setPanelMsg(null); setSelectedCite(null); setMode("research");
    } else if (i.kind === "draft" && typeof d.text === "string") {
      if (typeof d.docType === "string") setDraftTypeId(d.docType);
      setDraftText(d.text); setDraftQA((d.qa as QAReport) ?? null); setDraftError(null); setMode("draft");
    } else if (i.kind === "review" && d.report) {
      setReviewReport(d.report as ReviewReport); setReviewDocText(typeof d.docText === "string" ? d.docText : ""); setReviewError(null); setMode("review");
    }
    if (openMatterId) setActiveMatterId(openMatterId);
  }

  // Work done while a matter is active is saved to it, so the whole firm can open it.
  const hashText = (t: string) => { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  useEffect(() => {
    if (loading && activeMatterId && activeId) setThreads(prev => prev.map(t => t.id === activeId && !t.matterId ? { ...t, matterId: activeMatterId } : t));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);
  useEffect(() => {
    const t = activeThread;
    if (loading || researchActive || !t?.matterId || !matters.some(m => m.id === t.matterId)) return;
    const last = t.messages[t.messages.length - 1];
    if (last?.role !== "assistant" || !last.content.trim()) return;
    attachToMatter(t.matterId, {
      ref: `research:${t.id.replace(/^m_/, "")}`, kind: "research", title: t.title,
      data: { messages: t.messages.map(m => ({ ...m, content: m.content.slice(0, 20000) })) },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, researchActive, activeThread?.messages.length, activeThread?.title, matters.length]);
  useEffect(() => {
    if (draftLoading || draftQALoading || !draftText.trim() || !activeMatterId || mode !== "draft") return;
    const name = DOCUMENT_TYPES.find(d => d.id === draftTypeId)?.name ?? "Document";
    attachToMatter(activeMatterId, { ref: `draft:${hashText(draftText.slice(0, 400))}`, kind: "draft", title: name, data: { text: draftText, docType: draftTypeId, qa: draftQA } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftLoading, draftQALoading]);
  useEffect(() => {
    if (reviewLoading || !reviewReport || !activeMatterId || mode !== "review") return;
    const title = `${reviewReport.documentType || "Document"} review${reviewFile?.name ? `: ${reviewFile.name}` : ""}`;
    attachToMatter(activeMatterId, { ref: `review:${hashText((reviewDocText || reviewReport.summary || "").slice(0, 600))}`, kind: "review", title,
      data: { report: reviewReport, docText: reviewDocText.slice(0, 120000), fileName: reviewFile?.name ?? null } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewLoading, reviewReport]);

  function newThread() {
    // Starting new research stops any answer still in flight (its thread keeps just the question).
    abortRef.current?.abort();
    setLoading(false);
    setResearchActive(false);
    const id = `t_${Date.now()}`;
    const thread: Thread = { id, title: "New research", messages: [], createdAt: Date.now(), ...(activeMatterId ? { matterId: activeMatterId } : {}) };
    setThreads(prev => [thread, ...prev]);
    setActiveId(id);
    setInput("");
    setAttachment(null);
    setAttachError(null);
    setMode("research");
    setNavOpen(false);
    setPanelMsg(null);
    setSelectedCite(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function deleteThread(id: string) {
    setThreads(prev => prev.filter(t => t.id !== id));
    if (activeId === id) {
      const remaining = threads.filter(t => t.id !== id);
      setActiveId(remaining[0]?.id ?? null);
    }
  }

  function renameThread(id: string, title: string) {
    setThreads(prev => prev.map(t => t.id === id ? { ...t, title } : t));
  }

  function moveThreadToProject(threadId: string, projectId: string | null) {
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, projectId: projectId ?? undefined } : t));
    // Auto-expand destination project
    if (projectId) setExpandedProjects(prev => new Set([...prev, projectId]));
  }

  function newProject() {
    const id = `p_${Date.now()}`;
    const colour = PROJECT_COLOURS[projects.length % PROJECT_COLOURS.length];
    const project: Project = { id, name: "New Project", createdAt: Date.now(), colour };
    setProjects(prev => [...prev, project]);
    setExpandedProjects(prev => new Set([...prev, id]));
    // Open rename immediately
    setRenameState({ type: "project", id, value: "New Project" });
  }

  function renameProject(id: string, name: string) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  }

  function deleteProject(id: string) {
    setProjects(prev => prev.filter(p => p.id !== id));
    // Orphan threads back to Unorganised
    setThreads(prev => prev.map(t => t.projectId === id ? { ...t, projectId: undefined } : t));
  }

  function updateThreadMessages(id: string, msgs: ChatMessage[]) {
    setThreads(prev => prev.map(t =>
      t.id === id
        ? { ...t, messages: msgs, title: threadTitle(msgs) }
        : t
    ));
  }

  const sendMessage = useCallback(async (text: string, opts?: { retry?: boolean; scope?: LexScopeKey[] }) => {
    if (!text.trim() || loading || researchActive || attaching) return;
    const useScope = opts?.scope ?? scope;

    let tid = activeId;
    // Create a new thread if none active
    if (!tid) {
      tid = `t_${Date.now()}`;
      const newT: Thread = { id: tid, title: "New research", messages: [], createdAt: Date.now() };
      setThreads(prev => [newT, ...prev]);
      setActiveId(tid);
    }

    const attach = !opts?.retry ? attachment : null;
    const userMsg: ChatMessage = {
      role: "user", at: Date.now(),
      content: attach ? `${text.trim()}${ATTACH_MARK}${attach.name}\n\n${attach.text.slice(0, ATTACH_MAX_CHARS)}` : text.trim(),
      ...(attach ? { attachment: attach.name } : {}),
    };
    const prevMsgs = stripErrorAnswers(threads.find(t => t.id === tid)?.messages ?? []);
    const last = prevMsgs[prevMsgs.length - 1];
    // Retry re-sends the question already in the thread instead of adding it twice.
    const updated = opts?.retry && last?.role === "user" && last.content === userMsg.content
      ? prevMsgs
      : [...prevMsgs, userMsg];

    updateThreadMessages(tid, updated);
    if (!opts?.retry) { setInput(""); setAttachment(null); setAttachError(null); }
    setResearchError(null);
    setLoading(true);
    setSteps([]);
    setResearchActive(true);
    setSelectedCite(null);
    setThinkLabel(thinkingFor(text));

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const finalId = tid;
    const fail = (error: LexError) => {
      // Drop any partial answer: the thread keeps only the question.
      updateThreadMessages(finalId, updated);
      setResearchError({ threadId: finalId, error, retryText: userMsg.content });
    };

    try {
      const res = await fetch("/api/lex-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated.map(({ role, content }) => ({ role, content })), clientId, scope: useScope, threadId: finalId }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        fail(await lexErrorFromResponse(res, "research"));
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";
      let started = false;
      let streamFailed = false;
      let answerMeta: LexAnswerMeta | undefined;
      let stepList: LexStep[] = [];

      while (!streamFailed) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (isStreamErrorPart(parsed)) { streamFailed = true; break; }
            if (parsed.type === "data-lex-sources" && parsed.data) { answerMeta = parsed.data as LexAnswerMeta; continue; }
            if (typeof parsed.type === "string" && parsed.type.startsWith("tool-")) {
              const next = applyStepPart(stepList, parsed);
              if (next !== stepList) { stepList = next; setSteps(next); }
              continue;
            }
            if (parsed.type === "text-delta" && parsed.delta) {
              fullText += parsed.delta;
              const withAI: ChatMessage[] = [...updated, { role: "assistant", content: fullText }];
              if (!started) {
                started = true;
                setLoading(false);
              }
              updateThreadMessages(finalId, withAI);
            }
          } catch {}
        }
      }

      if (streamFailed) {
        reader.cancel().catch(() => {});
        fail(lexErrorFromStatus(500, null, "research"));
      } else if (!fullText.trim()) {
        fail(lexEmptyError("research"));
      } else {
        const sum = stepSummary(stepList);
        const citedNone = !answerMeta || citedSources(answerMeta).cited.length === 0;
        const final: ChatMessage[] = [...updated, {
          role: "assistant", content: fullText.trim(), at: Date.now(), ...(answerMeta ? { meta: answerMeta } : {}),
          ...(sum.failed ? { failedSearches: stepList.filter(s => s.status === "failed" && s.tool !== "readSource").length } : {}),
          ...(sum.noResults && citedNone ? { noResults: true } : {}),
        }];
        updateThreadMessages(finalId, final);
        setPanelMsg(final.length - 1);
      }
    } catch (e: unknown) {
      if ((e as Error)?.name !== "AbortError") fail(lexNetworkError("research"));
    } finally {
      setLoading(false);
      setResearchActive(false);
    }
  }, [activeId, threads, loading, researchActive, clientId, scope, attachment, attaching]);

  // Ctrl K (or Cmd K) opens the command palette: new research or jump to a thread.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setMode("research"); setPaletteOpen(o => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function copyAnswer(idx: number) {
    const msg = messages[idx];
    if (!msg) return;
    navigator.clipboard.writeText(answerWithSources(msg.content, msg.meta)).then(() => {
      setCopiedMsg(idx);
      setTimeout(() => setCopiedMsg(null), 1500);
    }).catch(() => {});
  }

  function questionFor(idx: number): string {
    for (let i = idx - 1; i >= 0; i--) if (messages[i].role === "user") return shownQuestion(messages[i].content);
    return "";
  }

  function exportAnswer(idx: number) {
    const msg = messages[idx];
    if (!msg) return;
    exportAnswerToWord({ question: questionFor(idx), answer: msg.content, meta: msg.meta, firmName, stamp: msg.at ? brisbaneStamp(msg.at) : undefined }).catch(() => {});
  }

  function draftFrom(idx: number) {
    const msg = messages[idx];
    if (!msg) return;
    const research = answerWithSources(msg.content, msg.meta);
    setDraftInstructions(`Base the document on this research.\n\nQuestion: ${questionFor(idx)}\n\n${research}`.slice(0, 6000));
    setMode("draft");
  }

  function setScope(next: LexScopeKey[]) {
    setScopeState(next);
    try { localStorage.setItem("lex:scope", JSON.stringify(next)); } catch {}
  }

  async function attachFile(file: File) {
    setAttachError(null);
    if (file.size > 10 * 1024 * 1024) { setAttachError("That file is over 10 MB. Attach a smaller file."); return; }
    setAttaching(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/lex-extract", { method: "POST", body: fd });
      const data = await res.json().catch(() => null) as { text?: string; wordCount?: number; error?: string } | null;
      if (!res.ok || !data?.text?.trim()) { setAttachError(data?.error && res.status === 400 ? data.error : "Lex could not read that file. Try a PDF, Word or text file."); return; }
      setAttachment({ name: file.name, text: data.text, words: data.wordCount ?? data.text.split(/\s+/).length });
      inputRef.current?.focus();
    } catch {
      setAttachError("Lex could not read that file. Check your connection and try again.");
    } finally {
      setAttaching(false);
    }
  }

  async function submitFlag(idx: number, reason: FlagReason, note: string): Promise<boolean> {
    const msg = messages[idx];
    if (!msg || !activeId) return false;
    try {
      const res = await fetch("/api/lex-flag", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, note, question: shownQuestion(questionFor(idx)), answer: msg.content, threadId: activeId }),
      });
      if (!res.ok) return false;
      updateThreadMessages(activeId, messages.map((m, i) => (i === idx ? { ...m, flagged: true } : m)));
      return true;
    } catch { return false; }
  }

  function threadText(): string {
    const title = activeThread?.title ?? "Lex research";
    const parts = [`${title}\nResearch by Lex for ${firmName || "your firm"}. Research assistance, not legal advice.`];
    for (const m of messages) {
      if (m.role === "user") parts.push(`Question: ${shownQuestion(m.content)}${m.attachment ? ` (with ${m.attachment})` : ""}`);
      else parts.push(answerWithSources(m.content, m.meta));
    }
    return parts.join("\n\n");
  }

  function copyThread() {
    navigator.clipboard.writeText(threadText()).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    }).catch(() => {});
  }

  function selectCite(idx: number, n: number) {
    setPanelMsg(idx);
    setSelectedCite(prev => (prev === n && panelMsg === idx ? null : n));
    setPanelOpen(true);
  }

  // ── Send email ──────────────────────────────────────────────────────────
  async function sendEmail(documentText: string, type: "draft" | "review") {
    if (!emailTo.trim() || !emailSubject.trim()) return;
    setEmailSending(true);
    setEmailSent(false);
    try {
      const res = await fetch("/api/lex-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailTo, subject: emailSubject, body: emailBody, documentText, type }),
      });
      if (res.ok) {
        setEmailSent(true);
        setTimeout(() => { setEmailSent(false); setEmailOpen(false); }, 2000);
      }
    } catch {}
    setEmailSending(false);
  }

  const sendDraft = useCallback(async () => {
    if (draftLoading) return;
    setDraftText("");
    setDraftError(null);
    setDraftQA(null);
    setDraftLoading(true);
    setDraftQALoading(false);

    const labels = ["Searching legislation…", "Verifying sections…", "Searching AustLII…", "Drafting document…", "Compiling clauses…"];
    let labelIdx = 0;
    setDraftThinkLabel(labels[0]);
    const labelTimer = setInterval(() => {
      labelIdx = (labelIdx + 1) % labels.length;
      setDraftThinkLabel(labels[labelIdx]);
    }, 3500);

    draftAbortRef.current?.abort();
    draftAbortRef.current = new AbortController();

    try {
      const res = await fetch("/api/lex-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: draftTypeId,
          parties: draftParties,
          jurisdiction: draftJurisdiction,
          specialInstructions: draftInstructions,
          responseLength: draftResponseLength !== "default" ? draftResponseLength : undefined,
          messages: [],
        }),
        signal: draftAbortRef.current.signal,
      });

      if (!res.ok) {
        clearInterval(labelTimer);
        setDraftError(await lexErrorFromResponse(res, "draft"));
        setDraftLoading(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";
      let streamFailed = false;

      while (!streamFailed) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (isStreamErrorPart(parsed)) { streamFailed = true; break; }
            if (parsed.type === "text-delta" && parsed.delta) {
              fullText += parsed.delta;
              setDraftText(fullText);
            }
          } catch {}
        }
      }

      clearInterval(labelTimer);
      setDraftLoading(false);

      if (streamFailed || !fullText.trim()) {
        // A half-written or empty draft is not a document: clear it so it can't be exported or emailed.
        if (streamFailed) reader.cancel().catch(() => {});
        setDraftText("");
        setDraftError(streamFailed ? lexErrorFromStatus(500, null, "draft") : lexEmptyError("draft"));
        return;
      }

      // ── QA pass ─────────────────────────────────────────────────────────────
      if (fullText.trim()) {
        setDraftQALoading(true);
        try {
          const qaRes = await fetch("/api/lex-draft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestQA: true, completedDraft: fullText, documentType: draftTypeId }),
          });
          if (qaRes.ok) {
            const qa = await qaRes.json() as QAReport;
            setDraftQA(qa);
          }
        } catch {}
        setDraftQALoading(false);
      }
    } catch (e: unknown) {
      clearInterval(labelTimer);
      if ((e as Error)?.name !== "AbortError") {
        setDraftText("");
        setDraftError(lexNetworkError("draft"));
      }
      setDraftLoading(false);
    }
  }, [draftLoading, draftTypeId, draftParties, draftJurisdiction, draftInstructions, draftResponseLength]);

  const submitForSupervision = useCallback(async () => {
    if (!reviewReport || submitLoading) return;
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/lex-review-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firmId: "lex-internal",
          submittedBy: reviewSubmittedBy,
          matterNo: reviewMatterNo,
          clientName: reviewClientName,
          documentName: reviewFile?.name ?? "",
          report: reviewReport,
        }),
      });
      if (!res.ok) { setSubmitError(await lexErrorFromResponse(res, "submission")); return; }
      setSubmitDone(true);
    } catch {
      setSubmitError(lexNetworkError("submission"));
    } finally {
      setSubmitLoading(false);
    }
  }, [reviewReport, submitLoading, reviewSubmittedBy, reviewMatterNo, reviewClientName, reviewFile]);

  const sendReview = useCallback(async () => {
    if (reviewLoading) return;
    const hasContent = reviewInputMode === "paste" ? reviewPasteText.trim() : !!reviewFile;
    if (!hasContent) return;

    setReviewLoading(true);
    setReviewReport(null);
    setReviewError(null);
    setReviewDocText("");
    setSubmitDone(false);
    setSubmitError(null);

    const stages = [
      "Extracting document...",
      "Parsing clauses...",
      "Checking legislation...",
      "Identifying missing clauses...",
      "Assessing risk exposure...",
      "Generating recommendations...",
    ];
    let stageIdx = 0;
    setReviewStage(stages[0]);
    const stageTimer = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, stages.length - 1);
      setReviewStage(stages[stageIdx]);
    }, 8000);

    try {
      let documentText = "";
      let wordCount = 0;

      if (reviewInputMode === "upload" && reviewFile) {
        const form = new FormData();
        form.append("file", reviewFile);
        const extractRes = await fetch("/api/lex-extract", { method: "POST", body: form });
        if (!extractRes.ok) { setReviewError(await lexErrorFromResponse(extractRes, "review")); return; }
        const extracted = await extractRes.json();
        documentText = extracted.text;
        wordCount = extracted.wordCount;
      } else {
        documentText = reviewPasteText.trim();
        wordCount = documentText.split(/\s+/).filter(Boolean).length;
      }

      if (!documentText.trim()) {
        setReviewError({ kind: "empty", title: "No text found", message: "No text could be read from this document. Try a text-based PDF or DOCX, or paste the text.", canRetry: false, signIn: false });
        return;
      }

      const reviewRes = await fetch("/api/lex-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentText,
          documentType: reviewDocType,
          direction: reviewDirection,
          actingFor: reviewDirection === "incoming" ? reviewActingFor : undefined,
          jurisdiction: reviewJurisdiction,
          fileName: reviewFile?.name,
        }),
      });

      if (!reviewRes.ok) { setReviewError(await lexErrorFromResponse(reviewRes, "review")); return; }
      const report = await reviewRes.json() as ReviewReport;
      report.wordCount = report.wordCount || wordCount;
      setReviewDocText(documentText);
      setReviewReport(report);
    } catch {
      setReviewError(lexNetworkError("review"));
    } finally {
      clearInterval(stageTimer);
      setReviewLoading(false);
    }
  }, [reviewLoading, reviewInputMode, reviewFile, reviewPasteText, reviewDocType, reviewDirection, reviewActingFor, reviewJurisdiction]);

  const showWelcome = messages.length === 0;

  // Sources panel follows the selected answer, or the latest answer that has checked sources.
  const lastMetaIdx = (() => { for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "assistant" && messages[i].meta) return i; return null; })();
  const panelIdx = panelMsg != null && messages[panelMsg]?.meta ? panelMsg : lastMetaIdx;
  const panelMeta = panelIdx != null ? messages[panelIdx]?.meta : undefined;
  const showPanel = mode === "research" && panelOpen && !showWelcome;
  const lastAssistant = (() => { for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "assistant") return i; return -1; })();
  const streamingIdx = loading ? -1 : (researchActive ? lastAssistant : -1);
  const activeProject = activeThread?.projectId ? projects.find(p => p.id === activeThread.projectId) : undefined;
  const threadMatter = activeThread?.matterId ? matters.find(m => m.id === activeThread.matterId) : (showWelcome && activeMatter ? activeMatter : undefined);
  const contextLabel = threadMatter ? `Matter: ${threadMatter.id}` : activeProject ? `Project: ${activeProject.name}` : undefined;
  const firstAt = messages.find(m => m.at)?.at ?? activeThread?.createdAt;

  const composer = (hero: boolean) => (
    <Composer ref={inputRef} value={input} onChange={setInput} onSend={() => sendMessage(input)} disabled={loading || researchActive}
      placeholder={hero ? "Ask a legal research question, or paste facts from the matter..." : "Ask a follow-up about this research..."}
      contextLabel={contextLabel} autoFocus={hero}
      scope={scope} onScope={setScope}
      attachment={attachment} attaching={attaching} attachError={attachError}
      onAttach={attachFile} onClearAttachment={() => { setAttachment(null); setAttachError(null); }} />
  );

  return (
    <div className={`lx${showPanel ? " lx-panel" : ""}${navOpen ? " nav-open" : ""}`}>
      <div className="lx-scrim" onClick={() => setNavOpen(false)} />
      <Sidebar
        mode={mode} setMode={(m) => { setMode(m); setNavOpen(false); }} onNew={newThread}
        threads={threads} projects={projects} activeId={activeId}
        onSelect={(id) => { setActiveId(id); setPanelMsg(null); setSelectedCite(null); setNavOpen(false); }}
        onThreadMenu={(id, e) => { setThreadMenu(m => m?.threadId === id ? null : { threadId: id, x: e.clientX, y: e.clientY }); setProjectMenu(null); }}
        onProjectMenu={(id, e) => { setProjectMenu(m => m?.projectId === id ? null : { projectId: id, x: e.clientX, y: e.clientY }); setThreadMenu(null); }}
        rename={renameState} setRename={setRenameState} onRenameThread={renameThread} onRenameProject={renameProject}
        onNewProject={newProject} onMoveThread={moveThreadToProject}
        expanded={expandedProjects}
        toggleProject={(id) => setExpandedProjects(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
        firmName={firmName} firmLogo={firmLogo} userEmail={userEmail ?? displayEmail} userName={displayName}
        matterCount={matters.filter(m => m.status !== "closed").length}
        onFirmSettings={() => { setSettingsOpen(true); setNavOpen(false); }} onIntake={() => { setIntakeOpen(true); setNavOpen(false); }}
      />

      {/* ── Menus ─────────────────────────────────────────────────────────── */}
      {threadMenu && (() => {
        const thread = threads.find(t => t.id === threadMenu.threadId);
        if (!thread) return null;
        return (
          <div className="lx-menu" data-menu="context" role="menu"
            style={{ top: Math.min(threadMenu.y, window.innerHeight - 200), left: Math.min(threadMenu.x + 4, window.innerWidth - 200) }}>
            <button type="button" onClick={() => { setRenameState({ type: "thread", id: thread.id, value: thread.title }); setThreadMenu(null); }}>Rename</button>
            <button type="button" onClick={() => { setMoveDialog(thread.id); setThreadMenu(null); }}>Move to project</button>
            {thread.projectId && <button type="button" onClick={() => { moveThreadToProject(thread.id, null); setThreadMenu(null); }}>Remove from project</button>}
            <hr />
            <button type="button" className="danger" onClick={() => { deleteThread(thread.id); setThreadMenu(null); }}>Delete thread</button>
          </div>
        );
      })()}
      {projectMenu && (() => {
        const project = projects.find(p => p.id === projectMenu.projectId);
        if (!project) return null;
        return (
          <div className="lx-menu" data-menu="context" role="menu"
            style={{ top: Math.min(projectMenu.y, window.innerHeight - 140), left: Math.min(projectMenu.x + 4, window.innerWidth - 200) }}>
            <button type="button" onClick={() => { setRenameState({ type: "project", id: project.id, value: project.name }); setProjectMenu(null); }}>Rename project</button>
            <hr />
            <button type="button" className="danger" onClick={() => { deleteProject(project.id); setProjectMenu(null); }}>Delete project</button>
          </div>
        );
      })()}
      {moveDialog && (
        <div className="lx-menu" data-menu="context" role="dialog" aria-label="Move to project"
          style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", minWidth: 240 }}>
          <p>Move to project</p>
          {projects.length === 0
            ? <div style={{ padding: "4px 10px 8px", color: "var(--muted)", fontSize: 12.5 }}>No projects yet. Create one in the sidebar first.</div>
            : projects.map(p => (
              <button type="button" key={p.id} onClick={() => { moveThreadToProject(moveDialog, p.id); setMoveDialog(null); }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: p.colour, marginRight: 8 }} />{p.name}
              </button>
            ))}
          <hr />
          <button type="button" onClick={() => { moveThreadToProject(moveDialog, null); setMoveDialog(null); }}>No project</button>
        </div>
      )}

      {paletteOpen && (
        <CommandPalette threads={threads} onClose={() => setPaletteOpen(false)}
          onNew={(q) => { newThread(); if (q) setInput(q); setTimeout(() => inputRef.current?.focus(), 0); }}
          onOpen={(id) => { setActiveId(id); setPanelMsg(null); setSelectedCite(null); setNavOpen(false); }} />
      )}
      {flagFor != null && <FlagDialog onClose={() => setFlagFor(null)} onSubmit={(r, n) => submitFlag(flagFor, r, n)} />}

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="lx-main">
        <div className="lx-top">
          <button type="button" className="burger" aria-label="Open navigation" onClick={() => setNavOpen(true)}><Icon name="menu" size={20} /></button>
          {mode === "research" && (
            <div className="lx-ctx">
              <span className="k">{activeProject ? "Project" : "Research"}</span>
              {firstAt && <span className="id">{new Date(firstAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric", timeZone: "Australia/Brisbane" })}</span>}
              <b>{activeProject ? `${activeProject.name}: ` : ""}{activeThread && !showWelcome ? activeThread.title : "New research"}</b>
            </div>
          )}
          {mode === "draft" && <div className="lx-ctx"><span className="k">Drafting</span><b>{DOCUMENT_TYPES.find(d => d.id === draftTypeId)?.name ?? "Document"}</b></div>}
          {mode === "review" && <div className="lx-ctx"><span className="k">Doc review</span><b>{reviewFile?.name ?? "Review a document"}</b></div>}
          {mode === "dashboard" && <div className="lx-ctx"><span className="k">Firm</span><b>Dashboard</b></div>}
          {mode === "account" && <div className="lx-ctx"><span className="k">Account</span><b>Your login</b></div>}
          {mode === "invoices" && <div className="lx-ctx"><span className="k">Billing</span><b>Invoices</b></div>}
          {mode === "matters" && <div className="lx-ctx"><span className="k">Matters</span><b>{openMatter ? `${openMatter.id}: ${openMatter.name}` : "All matters"}</b></div>}
          <span className="lx-sp" />
          {mode === "research" && !showWelcome && messages.some(m => m.role === "assistant") && (
            <div className="lx-share-wrap">
              <button type="button" className="lx-btn sm ico" aria-label="Share" aria-haspopup="menu" aria-expanded={shareOpen} onClick={() => setShareOpen(o => !o)}><Icon name="share" /><span className="lbl">Share</span></button>
              {shareOpen && <ShareMenu onCopy={copyThread} copied={shareCopied} onClose={() => setShareOpen(false)}
                emailHref={mailtoHref(`Research: ${activeThread?.title ?? "Lex research"}`, threadText())} />}
            </div>
          )}
          {mode === "research" && !showWelcome && !panelOpen && (
            <button type="button" className="lx-btn sm" aria-label="Open sources" onClick={() => setPanelOpen(true)}><Icon name="book" /><span className="lbl">Sources</span>{panelMeta ? ` ${citedSources(panelMeta).cited.length}` : ""}</button>
          )}
          <a className="lx-btn sm" href={PORTAL_REQUESTS_HREF} aria-label="Contact Saabai"><span className="lbl-long">Contact Saabai</span><span className="lbl-short">Contact</span></a>
        </div>
        {activeMatter && (mode === "research" || mode === "draft" || mode === "review") && (
          <MatterBar matter={activeMatter} onOpen={() => openMatterDetail(activeMatter.id)} onLeave={() => setActiveMatterId(null)} />
        )}

        {mode === "matters" && (openMatter ? (
          <MatterDetail key={openMatter.id} matter={openMatter} items={matterItems} active={activeMatterId === openMatter.id}
            busy={matterBusy} error={matterError}
            onBack={() => { setOpenMatterId(null); loadMatters(); }}
            onWorkIn={() => setActiveMatterId(openMatter.id)} onLeave={() => setActiveMatterId(null)}
            onUpdate={updateOpenMatter} onOpenItem={openMatterItem} onRemoveItem={removeMatterItem}
            onNewResearch={() => { setActiveMatterId(openMatter.id); newThread(); setTimeout(() => inputRef.current?.focus(), 0); }}
            onDraft={() => { setActiveMatterId(openMatter.id); setMode("draft"); }}
            onReview={() => { setActiveMatterId(openMatter.id); setMode("review"); }} />
        ) : (
          <MattersView matters={matters} loading={mattersLoading} error={mattersError} activeId={activeMatterId}
            onNew={() => { setMatterError(null); setIntakeOpen(true); }} onOpen={openMatterDetail} onRetry={loadMatters} />
        ))}


        {mode === "research" && (
          <>
            <div className="lx-body">
              {showWelcome ? (
                <EmptyState firmName={firmName} onPick={(q) => sendMessage(q)} composer={composer(true)} />
              ) : (
                <div className="lx-col">
                  {messages.map((msg, i) => msg.role === "user" ? (
                    <div className="lx-q" key={i}>
                      <div className="lx-avatar" aria-hidden="true">{userEmail ?? displayEmail ? initials(userEmail ?? displayEmail) : "Me"}</div>
                      <div className="qt">
                        <p>{shownQuestion(msg.content)}</p>
                        {msg.attachment && <span className="lx-chip"><Icon name="attach" size={12} />{msg.attachment}</span>}
                      </div>
                    </div>
                  ) : (
                    <div key={i} onClick={() => { if (msg.meta && panelIdx !== i) { setPanelMsg(i); setSelectedCite(null); } }}>
                      <AnswerSheet
                        text={msg.content} meta={msg.meta} at={msg.at} streaming={i === streamingIdx}
                        selected={panelIdx === i ? selectedCite : null}
                        onCite={(n) => selectCite(i, n)}
                        onExport={() => exportAnswer(i)} onCopy={() => copyAnswer(i)} onDraft={() => draftFrom(i)}
                        onSources={() => { setPanelMsg(i); setPanelOpen(true); }}
                        copied={copiedMsg === i}
                        onFlag={() => setFlagFor(i)} flagged={msg.flagged} failedSearches={msg.failedSearches}
                      />
                      {msg.noResults && i === messages.length - 1 && !researchActive && (
                        <NoResultsCard narrowed={!isFullScope(scope)}
                          onWiden={() => { setScope(ALL_SCOPES); sendMessage(questionFor(i), { scope: ALL_SCOPES }); }}
                          onRephrase={() => { setInput(questionFor(i)); inputRef.current?.focus(); }} />
                      )}
                    </div>
                  ))}

                  {!loading && researchError && researchError.threadId === activeId && (
                    <ErrorCard error={researchError.error} onRetry={() => sendMessage(researchError.retryText, { retry: true })} />
                  )}

                  {loading && <SearchingSteps steps={steps} label={thinkLabel} />}

                  {!loading && !researchActive && !researchError && messages[messages.length - 1]?.role === "assistant" && !messages[messages.length - 1]?.noResults && (
                    <div className="lx-follow">
                      {FOLLOW_UPS.map(f => <button type="button" key={f} onClick={() => sendMessage(f)}>{f}</button>)}
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
            {!showWelcome && (
              <div className="lx-compose">
                {composer(false)}
                <div className="lx-fine">Lex cites every claim and flags what it could not check. Always check primary sources before advising a client.</div>
              </div>
            )}
          </>
        )}

        {mode === "account" && (
          <AccountView firmName={firmName} email={userEmail ?? displayEmail} admin={isAdmin} usage={firmUsage}
            onInvoices={() => setMode("invoices")} onFirmSettings={() => setSettingsOpen(true)} />
        )}
        {mode === "invoices" && <InvoicesView onAccount={() => setMode("account")} />}

        {mode === "dashboard" && (
          <FirmDashboard
            firmName={firmName} firmLogo={firmLogo} email={userEmail ?? displayEmail}
            threads={threads} projects={projects} usage={firmUsage} admin={isAdmin}
            onNewResearch={() => { newThread(); setTimeout(() => inputRef.current?.focus(), 0); }}
            onDraft={() => setMode("draft")} onReview={() => setMode("review")}
            onIntake={() => setIntakeOpen(true)} onFirmSettings={() => setSettingsOpen(true)}
            onAccount={() => setMode("account")} onInvoices={() => setMode("invoices")}
            onOpenThread={(id) => { setActiveId(id); setPanelMsg(null); setSelectedCite(null); setMode("research"); }}
          />
        )}

        {mode === "draft" && (
          <DraftingView
            typeId={draftTypeId} setTypeId={setDraftTypeId}
            jurisdiction={draftJurisdiction} setJurisdiction={setDraftJurisdiction}
            parties={draftParties} setParties={setDraftParties}
            length={draftResponseLength} setLength={setDraftResponseLength}
            instructions={draftInstructions} setInstructions={setDraftInstructions}
            text={draftText} qa={draftQA} loading={draftLoading} qaLoading={draftQALoading} thinkLabel={draftThinkLabel}
            error={draftError} onDraft={() => sendDraft()}
            copied={draftCopied}
            onCopy={() => { navigator.clipboard.writeText(draftText); setDraftCopied(true); setTimeout(() => setDraftCopied(false), 1500); }}
            onExport={() => exportDraftToWord({ draftText, docTypeName: DOCUMENT_TYPES.find(d => d.id === draftTypeId)?.name ?? "Legal Document", jurisdiction: draftJurisdiction, firmName })}
            onSend={() => { setEmailOpen(true); setEmailSubject(`Document from Lex AI: ${DOCUMENT_TYPES.find(d => d.id === draftTypeId)?.name ?? "Legal Document"}`); }}
            onResearch={(q) => { setMode("research"); newThread(); setInput(q); setTimeout(() => inputRef.current?.focus(), 0); }}
          />
        )}

        {mode === "review" && (
          <ReviewView
            direction={reviewDirection} setDirection={setReviewDirection}
            docType={reviewDocType} setDocType={setReviewDocType}
            actingFor={reviewActingFor} setActingFor={setReviewActingFor}
            jurisdiction={reviewJurisdiction} setJurisdiction={setReviewJurisdiction}
            inputMode={reviewInputMode} setInputMode={setReviewInputMode}
            pasteText={reviewPasteText} setPasteText={setReviewPasteText}
            file={reviewFile} setFile={setReviewFile}
            submittedBy={reviewSubmittedBy} setSubmittedBy={setReviewSubmittedBy}
            matterNo={reviewMatterNo} setMatterNo={setReviewMatterNo}
            clientName={reviewClientName} setClientName={setReviewClientName}
            report={reviewReport} docText={reviewDocText} loading={reviewLoading} stage={reviewStage} error={reviewError} onReview={() => sendReview()}
            submitLoading={submitLoading} submitDone={submitDone} submitError={submitError} onSubmit={() => submitForSupervision()}
            onSend={() => { if (reviewReport) { setEmailOpen(true); setEmailSubject(`Document Review from Lex AI: ${reviewReport.documentType}`); } }}
            onExport={(comparison) => { if (reviewReport) exportReviewToWord({ report: reviewReport, fileName: reviewInputMode === "upload" ? reviewFile?.name : undefined, firmName, comparison }); }}
            onResearch={(q) => { setMode("research"); newThread(); setInput(q); setTimeout(() => inputRef.current?.focus(), 0); }}
            onReset={() => { setReviewReport(null); setReviewDocText(""); setReviewError(null); setSubmitDone(false); setSubmitError(null); }}
          />
        )}

      {/* ── New matter ───────────────────────────────────────────────────── */}
      {intakeOpen && (
        <NewMatterDialog busy={matterBusy} error={matterError} onClose={() => setIntakeOpen(false)} onCreate={createMatterFromDialog} />
      )}

      {/* ── Firm settings modal ─────────────────────────────────────────────── */}
      {settingsOpen && (
        <div className="lx-modal-wrap center" onMouseDown={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setSettingsOpen(false); }}>
          <div className="lx-dialog" role="dialog" aria-label="Firm Settings" data-no-feedback>
            <div className="head">
              <h3>Firm Settings</h3>
              <button type="button" className="x" aria-label="Close" onClick={() => setSettingsOpen(false)}>×</button>
            </div>
            <div className="field">
              <label htmlFor="lx-firm-name">Firm Name</label>
              <input id="lx-firm-name" value={firmName} onChange={e => setFirmName(e.target.value)}
                placeholder="e.g. Goldberg & Associates" />
            </div>
            <div className="field">
              <label>Firm Logo</label>
              {firmLogo ? (
                <div className="logo-row">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={firmLogo} alt="Firm logo" />
                  <button type="button" className="btn-danger" onClick={() => { setFirmLogo(null); localStorage.removeItem("lex_firm_logo"); }}>Remove</button>
                </div>
              ) : (
                <div
                  className="drop"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const dataUrl = ev.target?.result as string;
                          setFirmLogo(dataUrl);
                          localStorage.setItem("lex_firm_logo", dataUrl);
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") (e.currentTarget as HTMLDivElement).click(); }}
                >
                  <p>Click to upload logo</p>
                  <small>PNG, JPG or SVG, max 2MB</small>
                </div>
              )}
            </div>
            <div className="row">
              <button type="button" className="lx-btn" onClick={() => setSettingsOpen(false)}>Cancel</button>
              <button
                type="button"
                className="lx-btn primary"
                onClick={() => {
                  localStorage.setItem("lex_firm_name", firmName);
                  setSettingsOpen(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Email form modal ─────────────────────────────────────────────── */}
      {emailOpen && (
        <div className="lx-modal-wrap center" onMouseDown={(e) => { if (e.target === e.currentTarget) setEmailOpen(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setEmailOpen(false); }}>
          <div className="lx-dialog" role="dialog" aria-label="Send to Client" data-no-feedback>
            <div className="head">
              <h3>Send to Client</h3>
              <button type="button" className="x" aria-label="Close" onClick={() => setEmailOpen(false)}>×</button>
            </div>
            <div className="field">
              <label htmlFor="lx-email-to">To</label>
              <input id="lx-email-to" type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)}
                placeholder="client@example.com" />
            </div>
            <div className="field">
              <label htmlFor="lx-email-subject">Subject</label>
              <input id="lx-email-subject" value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                placeholder="Document from Lex AI" />
            </div>
            <div className="field">
              <label htmlFor="lx-email-body">Message (optional)</label>
              <textarea id="lx-email-body" value={emailBody} onChange={e => setEmailBody(e.target.value)}
                placeholder="Please find the attached document..." rows={3} />
            </div>
            <div className="row">
              <button type="button" className="lx-btn" onClick={() => setEmailOpen(false)}>Cancel</button>
              <button
                type="button"
                className={`lx-btn primary${emailSent ? " ok" : ""}`}
                disabled={emailSending || !emailTo.trim() || !emailSubject.trim()}
                onClick={() => sendEmail(mode === "draft" ? draftText : reviewReport?.summary ?? "", mode as "draft" | "review")}
              >
                {emailSent ? "Sent!" : emailSending ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}

      </main>

      {showPanel && (
        <SourcesPanel meta={panelMeta} selected={selectedCite} onSelect={setSelectedCite}
          onClose={() => { setPanelOpen(false); setSelectedCite(null); }} />
      )}
    </div>
  );
}

