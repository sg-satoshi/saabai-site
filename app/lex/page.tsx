"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { DOCUMENT_TYPES } from "../../lib/lex-document-types";
import {
  type LexError, cleanThreads, stripErrorAnswers, isStreamErrorPart, signInHref,
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
import type { QAReport } from "../../lib/lex-draft-display";

// ── Brand ─────────────────────────────────────────────────────────────────────
const C = {
  bg:           "#08111f",   // deep navy background
  surface:      "#101b2d",   // card/panel surface
  surfaceRaised:"#16253d",   // elevated surfaces
  border:       "#23344f",   // subtle border
  borderAccent: "#32527f",   // stronger border on focus
  navy:         "#1B2B4B",
  gold:         "#C9A84C",   // primary gold accent
  goldBright:   "#E0BC6A",
  goldDim:      "#8a6e30",
  goldBg:       "rgba(201,168,76,0.08)",
  goldBorder:   "rgba(201,168,76,0.2)",
  text:         "#e8edf5",   // primary text
  textMuted:    "#8fa3c0",   // secondary text
  textDim:      "#4a6080",   // tertiary / placeholders
  white:        "#ffffff",
  green:        "#22c55e",
  userBubble:   "#1e3050",
  aiBubble:     "#1B2B4B",
};


const PROJECT_COLOURS = ["#62c5d1","#5b8dee","#25c986","#f97316","#a78bfa","#f472b6"];



// ── Doc Review types ──────────────────────────────────────────────────────────
type ReviewSeverity = "critical" | "moderate" | "minor";
type ReviewFinding = {
  id: string; severity: ReviewSeverity;
  axis: "risk" | "missing" | "legislation" | "market" | "accuracy" | "completeness" | "compliance" | "tone";
  clauseRef: string; title: string; issue: string; recommendation: string; redline?: string;
};
type ReviewMissingClause = { clause: string; reason: string; severity: ReviewSeverity };
type ReviewLegislationConflict = { ref: string; clauseRef: string; issue: string };
type ReviewReport = {
  documentType: string; direction: "incoming" | "outgoing"; actingFor?: string; jurisdiction: string;
  overallScore: number; riskLevel: "low" | "medium" | "high" | "critical";
  summary: string; findings: ReviewFinding[];
  missingClauses: ReviewMissingClause[]; legislationConflicts: ReviewLegislationConflict[];
  recommendedActions: string[]; wordCount: number; clauseCount: number;
};

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
function LexErrorCard({ error, onRetry, retryLabel = "Try again" }: { error: LexError; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div role="alert" data-lex-error={error.kind} style={{
      padding: "14px 18px", borderRadius: 10, background: "rgba(239,68,68,0.07)",
      border: "1px solid rgba(239,68,68,0.35)", maxWidth: 560,
    }}>
      <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#fca5a5" }}>{error.title}</p>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#fecaca" }}>{error.message}</p>
      {(error.signIn || (error.canRetry && onRetry)) && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {error.signIn && (
            <a href={signInHref(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/lex")} style={{
              padding: "7px 14px", borderRadius: 8, background: C.gold, color: C.bg,
              fontSize: 12, fontWeight: 700, textDecoration: "none",
            }}>Sign in</a>
          )}
          {error.canRetry && onRetry && (
            <button type="button" onClick={onRetry} data-no-feedback style={{
              padding: "7px 14px", borderRadius: 8, cursor: "pointer",
              background: "transparent", border: `1px solid ${C.borderAccent}`, color: C.text,
              fontSize: 12, fontWeight: 600,
            }}>{retryLabel}</button>
          )}
        </div>
      )}
    </div>
  );
}

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
  const reviewFileRef = useRef<HTMLInputElement>(null);
  const [reviewDragOver, setReviewDragOver]       = useState(false);
  // Matter context fields
  const [reviewSubmittedBy, setReviewSubmittedBy] = useState("");
  const [reviewMatterNo, setReviewMatterNo]       = useState("");
  const [reviewClientName, setReviewClientName]   = useState("");
  // Supervision submit state
  const [submitLoading, setSubmitLoading]         = useState(false);
  const [submitDone, setSubmitDone]               = useState(false);
  const [submitError, setSubmitError]             = useState<LexError | null>(null);
  // Comparison state
  const [reviewCompareMode, setReviewCompareMode] = useState(false);
  const [reviewCompareInputMode, setReviewCompareInputMode] = useState<"upload" | "paste">("upload");
  const [reviewComparePasteText, setReviewComparePasteText] = useState("");
  const [reviewCompareFile, setReviewCompareFile] = useState<File | null>(null);
  const [reviewCompareDragOver, setReviewCompareDragOver] = useState(false);
  const [reviewCompareText, setReviewCompareText] = useState("");
  const [reviewComparisonAnalysis, setReviewComparisonAnalysis] = useState("");
  const [reviewComparisonLoading, setReviewComparisonLoading] = useState(false);
  const reviewCompareFileRef = useRef<HTMLInputElement>(null);

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
  const [intakeClientName, setIntakeClientName] = useState("");
  const [intakeMatterType, setIntakeMatterType] = useState("Property");
  const [intakeUrgency, setIntakeUrgency] = useState<"low" | "medium" | "high">("medium");
  const [intakeDescription, setIntakeDescription] = useState("");

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

      fetch("/api/lex-me").then(r => (r.ok ? r.json() : null)).then(d => { if (typeof d?.email === "string") setDisplayEmail(d.email); }).catch(() => {});
      // Narrow screens start with the sources panel closed (it opens as a bottom sheet).
      if (window.matchMedia("(max-width: 980px)").matches) setPanelOpen(false);

      // 2. Check auth and load user-scoped data from Redis
      try {
        const me = await fetch("/api/portal/me").then(r => r.json());
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

  function newThread() {
    // Starting new research stops any answer still in flight (its thread keeps just the question).
    abortRef.current?.abort();
    setLoading(false);
    setResearchActive(false);
    const id = `t_${Date.now()}`;
    const thread: Thread = { id, title: "New research", messages: [], createdAt: Date.now() };
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
        body: JSON.stringify({ messages: updated.map(({ role, content }) => ({ role, content })), clientId, scope: useScope }),
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
  const contextLabel = activeProject ? `Project: ${activeProject.name}` : undefined;
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
        firmName={firmName} firmLogo={firmLogo} userEmail={userEmail ?? displayEmail}
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
          <span className="lx-sp" />
          {mode === "research" && !showWelcome && messages.some(m => m.role === "assistant") && (
            <div className="lx-share-wrap">
              <button type="button" className="lx-btn sm" aria-haspopup="menu" aria-expanded={shareOpen} onClick={() => setShareOpen(o => !o)}><Icon name="share" />Share</button>
              {shareOpen && <ShareMenu onCopy={copyThread} copied={shareCopied} onClose={() => setShareOpen(false)}
                emailHref={mailtoHref(`Research: ${activeThread?.title ?? "Lex research"}`, threadText())} />}
            </div>
          )}
          {mode === "research" && !showWelcome && !panelOpen && (
            <button type="button" className="lx-btn sm" onClick={() => setPanelOpen(true)}><Icon name="book" />Sources{panelMeta ? ` ${citedSources(panelMeta).cited.length}` : ""}</button>
          )}
        </div>

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
          <div className="lx-legacy-mode">
          <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>

            {/* Left: config panel */}
            <div style={{ width: 320, flexShrink: 0, borderRight: `1px solid ${C.border}`, background: C.surface, overflowY: "auto", padding: "24px 20px" }}>

              <p style={{ margin: "0 0 18px", fontSize: 13, fontWeight: 700, color: C.gold, letterSpacing: 0.3 }}>Document Review</p>

              {/* Matter context */}
              <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 10, background: C.bg, border: `1px solid ${C.border}` }}>
                <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Matter Details</p>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: "block", fontSize: 10, color: C.textDim, marginBottom: 4 }}>Submitted By</label>
                  <input value={reviewSubmittedBy} onChange={e => setReviewSubmittedBy(e.target.value)}
                    placeholder="Your name" style={{ width: "100%", padding: "7px 10px", borderRadius: 6, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 10, color: C.textDim, marginBottom: 4 }}>Matter No.</label>
                    <input value={reviewMatterNo} onChange={e => setReviewMatterNo(e.target.value)}
                      placeholder="e.g. 2024-0142" style={{ width: "100%", padding: "7px 10px", borderRadius: 6, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 10, color: C.textDim, marginBottom: 4 }}>Client Name</label>
                    <input value={reviewClientName} onChange={e => setReviewClientName(e.target.value)}
                      placeholder="e.g. Smith Holdings" style={{ width: "100%", padding: "7px 10px", borderRadius: 6, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
              </div>

              {/* Direction toggle */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>Review Type</label>
                <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
                  {(["incoming", "outgoing"] as const).map(d => (
                    <button key={d} onClick={() => setReviewDirection(d)} style={{
                      flex: 1, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "#23344f",
                      background: reviewDirection === d ? C.gold : "transparent",
                      color: reviewDirection === d ? C.bg : C.textMuted,
                      transition: "all 0.15s",
                    }}>
                      {d === "incoming" ? "Incoming" : "Outgoing"}
                    </button>
                  ))}
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 10, color: C.textDim, lineHeight: 1.5 }}>
                  {reviewDirection === "incoming"
                    ? "Contracts/agreements received from counterparties"
                    : "Your firm's work product before sending to clients"}
                </p>
              </div>

              {/* Document type */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>Document Type</label>
                <select value={reviewDocType} onChange={e => setReviewDocType(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, cursor: "pointer", outline: "none" }}>
                  <option value="auto-detect">⚡ Auto-detect (Lex identifies the document)</option>
                  <optgroup label="Commercial">
                    <option value="service-agreement">Service Agreement</option>
                    <option value="nda">Non-Disclosure Agreement (NDA)</option>
                    <option value="shareholders-agreement">Shareholders Agreement</option>
                    <option value="share-purchase-agreement">Share Purchase Agreement</option>
                    <option value="commercial-lease">Commercial Lease</option>
                    <option value="supply-agreement">Supply Agreement</option>
                    <option value="distribution-agreement">Distribution Agreement</option>
                    <option value="licensing-agreement">Licensing Agreement</option>
                    <option value="joint-venture">Joint Venture Agreement</option>
                  </optgroup>
                  <optgroup label="Employment">
                    <option value="employment-contract">Employment Contract</option>
                    <option value="contractor-agreement">Contractor Agreement</option>
                    <option value="enterprise-agreement">Enterprise Agreement</option>
                  </optgroup>
                  <optgroup label="Trusts &amp; Estates">
                    <option value="discretionary-trust-deed">Discretionary Trust Deed</option>
                    <option value="unit-trust-deed">Unit Trust Deed</option>
                    <option value="will">Will &amp; Testament</option>
                  </optgroup>
                  <optgroup label="Family Law">
                    <option value="bfa">Binding Financial Agreement (BFA)</option>
                    <option value="consent-orders">Consent Orders</option>
                    <option value="parenting-plan">Parenting Plan</option>
                  </optgroup>
                  <optgroup label="Correspondence &amp; Advice">
                    <option value="letter-of-advice">Letter of Advice</option>
                    <option value="demand-letter">Letter of Demand</option>
                    <option value="settlement-deed">Deed of Settlement &amp; Release</option>
                    <option value="court-submissions">Court Submissions / Pleadings</option>
                  </optgroup>
                  <optgroup label="Property">
                    <option value="contract-for-sale">Contract for Sale of Land</option>
                    <option value="lease-residential">Residential Lease</option>
                    <option value="easement">Easement / Covenant</option>
                  </optgroup>
                  <optgroup label="Other">
                    <option value="other">Other / Custom document</option>
                  </optgroup>
                </select>
                {reviewDocType === "auto-detect" && (
                  <p style={{ margin: "6px 0 0", fontSize: 10, color: C.textDim, lineHeight: 1.5 }}>
                    Lex will identify the document type from the content and apply the appropriate review criteria automatically.
                  </p>
                )}
              </div>

              {/* Acting for (incoming only) */}
              {reviewDirection === "incoming" && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>Acting For</label>
                  <select value={reviewActingFor} onChange={e => setReviewActingFor(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, cursor: "pointer", outline: "none" }}>
                    <option value="vendor">Vendor / Seller</option>
                    <option value="purchaser">Purchaser / Buyer</option>
                    <option value="landlord">Landlord / Lessor</option>
                    <option value="tenant">Tenant / Lessee</option>
                    <option value="employer">Employer</option>
                    <option value="employee">Employee</option>
                    <option value="licensor">Licensor</option>
                    <option value="licensee">Licensee</option>
                    <option value="service-provider">Service Provider</option>
                    <option value="client">Client / Customer</option>
                    <option value="lender">Lender</option>
                    <option value="borrower">Borrower</option>
                    <option value="both-parties">Both Parties / Neutral</option>
                  </select>
                </div>
              )}

              {/* Jurisdiction */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>Jurisdiction</label>
                <select value={reviewJurisdiction} onChange={e => setReviewJurisdiction(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, cursor: "pointer", outline: "none" }}>
                  <option>All Australian jurisdictions</option>
                  <option>New South Wales (NSW)</option>
                  <option>Victoria (VIC)</option>
                  <option>Queensland (QLD)</option>
                  <option>Western Australia (WA)</option>
                  <option>South Australia (SA)</option>
                  <option>Tasmania (TAS)</option>
                  <option>Australian Capital Territory (ACT)</option>
                  <option>Northern Territory (NT)</option>
                  <option>Cross-border / International</option>
                </select>
              </div>

              {/* Input mode toggle */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  {(["upload", "paste"] as const).map(m => (
                    <button key={m} onClick={() => setReviewInputMode(m)} style={{
                      padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      border: `1px solid ${reviewInputMode === m ? C.gold : C.border}`,
                      background: reviewInputMode === m ? C.goldBg : "transparent",
                      color: reviewInputMode === m ? C.gold : C.textMuted,
                    }}>
                      {m === "upload" ? "Upload file" : "Paste text"}
                    </button>
                  ))}
                </div>

                {/* File upload zone */}
                {reviewInputMode === "upload" && (
                  <div
                    onClick={() => reviewFileRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setReviewDragOver(true); }}
                    onDragLeave={() => setReviewDragOver(false)}
                    onDrop={e => {
                      e.preventDefault(); setReviewDragOver(false);
                      const f = e.dataTransfer.files[0];
                      if (f) setReviewFile(f);
                    }}
                    style={{
                      border: `2px dashed ${reviewDragOver ? C.gold : reviewFile ? "#22c55e" : C.border}`,
                      borderRadius: 10, padding: "20px 16px", textAlign: "center", cursor: "pointer",
                      background: reviewDragOver ? C.goldBg : reviewFile ? "rgba(34,197,94,0.04)" : "transparent",
                      transition: "all 0.15s",
                    }}>
                    <input ref={reviewFileRef} type="file" accept=".pdf,.docx,.doc,.txt" style={{ display: "none" }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) setReviewFile(f); }} />
                    {reviewFile ? (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" style={{ margin: "0 auto 8px", display: "block" }}>
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <p style={{ margin: 0, fontSize: 12, color: "#22c55e", fontWeight: 600 }}>{reviewFile.name}</p>
                        <p style={{ margin: "4px 0 0", fontSize: 10, color: C.textDim }}>
                          {(reviewFile.size / 1024).toFixed(0)} KB, click to change
                        </p>
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="1.5" strokeLinecap="round" style={{ margin: "0 auto 8px", display: "block" }}>
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        <p style={{ margin: 0, fontSize: 12, color: C.textMuted, fontWeight: 500 }}>Drop file or click to browse</p>
                        <p style={{ margin: "4px 0 0", fontSize: 10, color: C.textDim }}>PDF, DOCX, DOC or TXT, max 10MB</p>
                      </>
                    )}
                  </div>
                )}

                {/* Paste textarea */}
                {reviewInputMode === "paste" && (
                  <textarea value={reviewPasteText} onChange={e => setReviewPasteText(e.target.value)}
                    placeholder="Paste the document text here..."
                    rows={8}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, resize: "vertical", background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, lineHeight: 1.6, outline: "none", fontFamily: "inherit" }}
                  />
                )}
              </div>

              {/* Document comparison toggle */}
              <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 8, background: C.bg, border: `1px solid ${C.border}` }}>
                <button onClick={() => setReviewCompareMode(v => !v)} style={{
                  width: "100%", background: "none", border: "#23344f", color: C.textMuted,
                  fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span>Compare with another document</span>
                  <span style={{ color: C.gold, fontSize: 11 }}>{reviewCompareMode ? "▼" : "▶"}</span>
                </button>

                {reviewCompareMode && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      {(["upload", "paste"] as const).map(m => (
                        <button key={m} onClick={() => setReviewCompareInputMode(m)} style={{
                          padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                          border: `1px solid ${reviewCompareInputMode === m ? C.gold : C.border}`,
                          background: reviewCompareInputMode === m ? C.goldBg : "transparent",
                          color: reviewCompareInputMode === m ? C.gold : C.textMuted,
                        }}>
                          {m === "upload" ? "Upload" : "Paste"}
                        </button>
                      ))}
                    </div>

                    {reviewCompareInputMode === "upload" && (
                      <div
                        onClick={() => reviewCompareFileRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setReviewCompareDragOver(true); }}
                        onDragLeave={() => setReviewCompareDragOver(false)}
                        onDrop={e => { e.preventDefault(); setReviewCompareDragOver(false); const f = e.dataTransfer.files[0]; if (f) setReviewCompareFile(f); }}
                        style={{
                          border: `2px dashed ${reviewCompareDragOver ? C.gold : reviewCompareFile ? "#22c55e" : C.border}`,
                          borderRadius: 8, padding: "12px 10px", textAlign: "center", cursor: "pointer",
                          background: reviewCompareDragOver ? C.goldBg : reviewCompareFile ? "rgba(34,197,94,0.04)" : "transparent",
                        }}>
                        <input ref={reviewCompareFileRef} type="file" accept=".pdf,.docx,.doc,.txt" style={{ display: "none" }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) setReviewCompareFile(f); }} />
                        {reviewCompareFile ? (
                          <p style={{ margin: 0, fontSize: 11, color: "#22c55e", fontWeight: 600 }}>{reviewCompareFile.name}</p>
                        ) : (
                          <p style={{ margin: 0, fontSize: 11, color: C.textDim }}>Drop or click to select comparison doc</p>
                        )}
                      </div>
                    )}

                    {reviewCompareInputMode === "paste" && (
                      <textarea value={reviewComparePasteText} onChange={e => setReviewComparePasteText(e.target.value)}
                        placeholder="Paste comparison document text..."
                        rows={4}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: "none", resize: "vertical" }} />
                    )}

                    <button
                      onClick={async () => {
                        setReviewComparisonLoading(true);
                        setReviewComparisonAnalysis("");
                        try {
                          let compareText = "";
                          if (reviewCompareInputMode === "upload" && reviewCompareFile) {
                            const form = new FormData();
                            form.append("file", reviewCompareFile);
                            const res = await fetch("/api/lex-extract", { method: "POST", body: form });
                            if (res.ok) { const data = await res.json(); compareText = data.text; }
                          } else {
                            compareText = reviewComparePasteText;
                          }
                          const originalText = reviewInputMode === "paste" ? reviewPasteText : reviewReport?.summary ?? "";
                          const res = await fetch("/api/lex-review", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ documentText: `ORIGINAL DOCUMENT:\n${originalText}\n\nCOMPARISON DOCUMENT:\n${compareText}`, documentType: "comparison", direction: "incoming", jurisdiction: reviewJurisdiction }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setReviewComparisonAnalysis(data.summary || JSON.stringify(data, null, 2));
                          }
                        } catch {}
                        setReviewComparisonLoading(false);
                      }}
                      disabled={reviewComparisonLoading || (reviewCompareInputMode === "upload" ? !reviewCompareFile : !reviewComparePasteText.trim())}
                      style={{
                        width: "100%", marginTop: 10, padding: "8px 0", borderRadius: 8,
                        background: reviewComparisonLoading ? C.goldDim : C.goldBg,
                        border: `1px solid ${C.goldBorder}`, color: C.gold,
                        fontSize: 11, fontWeight: 700, cursor: reviewComparisonLoading ? "wait" : "pointer",
                      }}>
                      {reviewComparisonLoading ? "Analyzing..." : "Analyze Differences"}
                    </button>
                  </div>
                )}
              </div>

              {/* What Lex checks */}
              <div style={{ marginBottom: 20, padding: "10px 12px", borderRadius: 8, background: C.goldBg, border: `1px solid ${C.goldBorder}` }}>
                <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  {reviewDirection === "incoming" ? "Lex checks for" : "Lex verifies"}
                </p>
                {(reviewDirection === "incoming"
                  ? ["Risk flags & unfavorable clauses", "Missing clauses (what's NOT there)", "Australian legislation conflicts", "Market position & standard terms", "Suggested redlines"]
                  : ["Legal citation accuracy", "Completeness of advice", "LPUL compliance obligations", "Professional tone", "PI exposure risks"]
                ).map((item, i) => (
                  <p key={i} style={{ margin: i > 0 ? "4px 0 0" : 0, fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>
                    <span style={{ color: C.gold }}>→</span> {item}
                  </p>
                ))}
              </div>

              <button
                onClick={sendReview}
                disabled={reviewLoading || (reviewInputMode === "upload" ? !reviewFile : !reviewPasteText.trim())}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 10, border: "#23344f",
                  background: (reviewLoading || (reviewInputMode === "upload" ? !reviewFile : !reviewPasteText.trim()))
                    ? C.goldDim
                    : `linear-gradient(135deg, ${C.goldBright} 0%, ${C.gold} 100%)`,
                  color: C.bg, fontSize: 13, fontWeight: 800, cursor: "pointer",
                  letterSpacing: 0.3, boxShadow: reviewLoading ? "none" : `0 0 20px rgba(201,168,76,0.3)`,
                }}>
                {reviewLoading ? reviewStage : "Review Document"}
              </button>
            </div>

            {/* Right: results panel */}
            <div style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>

              {/* Empty state */}
              {!reviewReport && !reviewLoading && !reviewError && (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, textAlign: "center" }}>
                  <div style={{ width: 72, height: 72, borderRadius: 18, background: C.goldBg, border: `1px solid ${C.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round">
                      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                  </div>
                  <p style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: C.text }}>Ready to Review</p>
                  <p style={{ margin: "0 0 24px", fontSize: 13, color: C.textMuted, maxWidth: 420, lineHeight: 1.7 }}>
                    Upload or paste a document on the left. Lex will analyse it across risk, missing clauses, Australian legislation compliance, and market position.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 440, width: "100%" }}>
                    {[
                      { icon: "⚠", label: "Risk flags", desc: "Unfavorable clauses & exposure" },
                      { icon: "○", label: "Missing clauses", desc: "What should be there but isn't" },
                      { icon: "⚖", label: "Legislation check", desc: "ACL, Fair Work, Corporations Act" },
                      { icon: "↗", label: "Market position", desc: "Standard vs aggressive terms" },
                    ].map(({ icon, label, desc }) => (
                      <div key={label} style={{ padding: "14px 16px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, textAlign: "left" }}>
                        <p style={{ margin: "0 0 4px", fontSize: 16 }}>{icon}</p>
                        <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: C.text }}>{label}</p>
                        <p style={{ margin: 0, fontSize: 11, color: C.textDim }}>{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading state */}
              {reviewLoading && (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                    {[0,1,2,3].map(i => (
                      <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: C.gold, display: "block", animation: `lexDot 1.4s ease-in-out ${i*0.15}s infinite` }} />
                    ))}
                  </div>
                  <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: C.text }}>{reviewStage}</p>
                  <p style={{ margin: 0, fontSize: 12, color: C.textDim }}>Checking all five review axes against Australian law...</p>
                </div>
              )}

              {/* Error state */}
              {reviewError && !reviewLoading && (
                <div style={{ padding: 32 }}>
                  <LexErrorCard error={reviewError} onRetry={() => sendReview()} />
                </div>
              )}

              {/* Results */}
              {reviewReport && !reviewLoading && (() => {
                const { overallScore, riskLevel, summary, findings, missingClauses, legislationConflicts, recommendedActions } = reviewReport;
                const scoreColor = overallScore <= 30 ? "#22c55e" : overallScore <= 60 ? "#f59e0b" : "#ef4444";
                const criticalCount = findings.filter(f => f.severity === "critical").length;
                const moderateCount = findings.filter(f => f.severity === "moderate").length;
                const minorCount = findings.filter(f => f.severity === "minor").length;
                const severityColor = (s: ReviewSeverity) => s === "critical" ? "#ef4444" : s === "moderate" ? "#f59e0b" : "#8fa3c0";
                const severityBg = (s: ReviewSeverity) => s === "critical" ? "rgba(239,68,68,0.06)" : s === "moderate" ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.02)";
                const severityBorder = (s: ReviewSeverity) => s === "critical" ? "rgba(239,68,68,0.2)" : s === "moderate" ? "rgba(245,158,11,0.15)" : C.border;

                return (
                  <div style={{ padding: "28px 32px" }}>

                    {/* Submit for Supervision + Send to Client */}
                    <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>Actions</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textMuted }}>
                          {submitDone ? "Submitted to supervisor." : "Send to client or submit for partner review."}
                        </p>
                        {submitError && <div style={{ marginTop: 8 }}><LexErrorCard error={submitError} onRetry={() => submitForSupervision()} /></div>}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={() => { setEmailOpen(true); setEmailSubject(`Document Review from Lex AI: ${reviewReport.documentType}`); }} style={{
                          padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                          background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.gold, cursor: "pointer", whiteSpace: "nowrap",
                        }}>
                          Send to Client
                        </button>
                        {submitDone ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "rgba(34,197,94,0.1)", border: "#23344f" }}>
                            <span style={{ fontSize: 13 }}>✓</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#22c55e" }}>Submitted</span>
                          </div>
                        ) : (
                          <button onClick={submitForSupervision} disabled={submitLoading} style={{
                            padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: submitLoading ? "wait" : "pointer",
                            background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.gold, flexShrink: 0, whiteSpace: "nowrap",
                            opacity: submitLoading ? 0.6 : 1,
                          }}>
                            {submitLoading ? "Submitting…" : "Submit for Review"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Risk dashboard */}
                    <div style={{ marginBottom: 24, padding: "20px 24px", borderRadius: 14, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
                      {/* Score ring */}
                      <div style={{ textAlign: "center", flexShrink: 0 }}>
                        <div style={{
                          width: 84, height: 84, borderRadius: "50%",
                          background: `conic-gradient(${scoreColor} ${overallScore * 3.6}deg, ${C.bg} 0deg)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          boxShadow: `0 0 20px ${overallScore <= 30 ? "rgba(34,197,94,0.2)" : overallScore <= 60 ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)"}`,
                        }}>
                          <div style={{ width: 62, height: 62, borderRadius: "50%", background: C.surface, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 18, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{overallScore}</span>
                            <span style={{ fontSize: 8, color: C.textDim, lineHeight: 1, marginTop: 1 }}>RISK</span>
                          </div>
                        </div>
                        <p style={{ margin: "6px 0 0", fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: scoreColor }}>
                          {riskLevel === "low" ? "Low Risk" : riskLevel === "medium" ? "Medium Risk" : riskLevel === "high" ? "High Risk" : "Critical"}
                        </p>
                      </div>

                      {/* Counts */}
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: C.text }}>Review complete</p>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                          {[
                            { count: criticalCount, label: "Critical", color: "#ef4444" },
                            { count: moderateCount, label: "Moderate", color: "#f59e0b" },
                            { count: minorCount, label: "Minor", color: C.textMuted },
                            { count: missingClauses.length, label: "Missing", color: C.gold },
                            { count: legislationConflicts.length, label: "Legislation", color: "#818cf8" },
                          ].map(({ count, label, color }) => (
                            <div key={label} style={{ textAlign: "center" }}>
                              <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{count}</p>
                              <p style={{ margin: "2px 0 0", fontSize: 10, color: C.textDim }}>{label}</p>
                            </div>
                          ))}
                        </div>
                        <p style={{ margin: "10px 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>
                          {reviewReport.wordCount.toLocaleString()} words · {reviewReport.clauseCount} clauses · {reviewDirection === "incoming" ? `Acting for ${reviewActingFor}` : "Outgoing review"} · {reviewJurisdiction}
                        </p>
                      </div>
                    </div>

                    {/* Comparison analysis */}
                    {reviewComparisonAnalysis && (
                      <div style={{ marginBottom: 20, padding: "16px 20px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
                        <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 0.5, textTransform: "uppercase" }}>Document Comparison</p>
                        <p style={{ margin: 0, fontSize: 12, color: C.textMuted, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{reviewComparisonAnalysis}</p>
                      </div>
                    )}

                    {/* Summary */}
                    <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
                      <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, textTransform: "uppercase" }}>Executive Summary</p>
                      <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.7 }}>{summary}</p>
                    </div>

                    {/* Missing clauses */}
                    {missingClauses.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 0.5, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, display: "inline-block" }} />
                          Missing Clauses ({missingClauses.length})
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {missingClauses.map((mc, i) => (
                            <div key={i} style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(201,168,76,0.06)", border: "#23344f" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 20, background: "rgba(201,168,76,0.15)", color: C.gold, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" }}>{mc.severity}</span>
                                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>{mc.clause}</p>
                              </div>
                              <p style={{ margin: 0, fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>{mc.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Findings */}
                    {findings.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, textTransform: "uppercase" }}>
                          Findings ({findings.length})
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {findings.map((f, i) => (
                            <div key={i} style={{ borderRadius: 10, background: severityBg(f.severity), border: `1px solid ${severityBorder(f.severity)}`, overflow: "hidden" }}>
                              <div style={{ padding: "12px 16px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 20, background: `${severityColor(f.severity)}20`, color: severityColor(f.severity), fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase", border: `1px solid ${severityColor(f.severity)}40` }}>
                                    {f.severity}
                                  </span>
                                  <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 20, background: "rgba(255,255,255,0.04)", color: C.textDim, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
                                    {f.axis}
                                  </span>
                                  <span style={{ fontSize: 10, color: C.textDim }}>{f.clauseRef}</span>
                                </div>
                                <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: C.text }}>{f.title}</p>
                                <p style={{ margin: "0 0 8px", fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>{f.issue}</p>
                                <p style={{ margin: 0, fontSize: 12, color: C.text, lineHeight: 1.5 }}>
                                  <span style={{ color: C.gold, fontWeight: 600 }}>Recommendation: </span>{f.recommendation}
                                </p>
                              </div>
                              {f.redline && (
                                <div style={{ padding: "10px 16px", borderTop: `1px solid ${severityBorder(f.severity)}`, background: "rgba(0,0,0,0.15)" }}>
                                  <p style={{ margin: "0 0 4px", fontSize: 9, fontWeight: 700, color: C.gold, letterSpacing: 0.5, textTransform: "uppercase" }}>Suggested redline</p>
                                  <p style={{ margin: 0, fontSize: 11, color: "#a5b4fc", lineHeight: 1.6, fontFamily: "Georgia, serif", fontStyle: "italic" }}>{f.redline}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Legislation conflicts */}
                    {legislationConflicts.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "#818cf8", letterSpacing: 0.5, textTransform: "uppercase" }}>
                          Legislation Conflicts ({legislationConflicts.length})
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {legislationConflicts.map((lc, i) => (
                            <div key={i} style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(129,140,248,0.06)", border: "#23344f" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(129,140,248,0.15)", color: "#818cf8", fontWeight: 700 }}>{lc.ref}</span>
                                <span style={{ fontSize: 10, color: C.textDim }}>{lc.clauseRef}</span>
                              </div>
                              <p style={{ margin: 0, fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>{lc.issue}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended actions */}
                    {recommendedActions.length > 0 && (
                      <div style={{ padding: "16px 20px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
                        <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, textTransform: "uppercase" }}>Recommended Actions</p>
                        {recommendedActions.map((action, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, marginTop: i > 0 ? 10 : 0 }}>
                            <span style={{ color: C.gold, fontSize: 13, fontWeight: 700, flexShrink: 0, lineHeight: 1.6 }}>{i + 1}.</span>
                            <p style={{ margin: 0, fontSize: 12, color: C.textMuted, lineHeight: 1.6 }}>{action}</p>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                );
              })()}
            </div>
          </div>
          </div>
        )}

      {/* ── Intake form modal ─────────────────────────────────────────────── */}
      {intakeOpen && (
        <div className="lx-modal-wrap center" onMouseDown={(e) => { if (e.target === e.currentTarget) setIntakeOpen(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setIntakeOpen(false); }}>
          <div className="lx-dialog" role="dialog" aria-label="New Matter Intake" data-no-feedback>
            <div className="head">
              <h3>New Matter Intake</h3>
              <button type="button" className="x" aria-label="Close" onClick={() => setIntakeOpen(false)}>×</button>
            </div>
            <div className="field">
              <label htmlFor="lx-intake-client">Client Name</label>
              <input id="lx-intake-client" value={intakeClientName} onChange={e => setIntakeClientName(e.target.value)}
                placeholder="e.g. Smith Holdings Pty Ltd" autoFocus />
            </div>
            <div className="field">
              <label htmlFor="lx-intake-type">Matter Type</label>
              <select id="lx-intake-type" value={intakeMatterType} onChange={e => setIntakeMatterType(e.target.value)}>
                {["Property", "Family Law", "Corporate / Commercial", "Litigation", "Employment", "Wills & Estates", "Criminal", "Other"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Urgency</label>
              <div className="segs" role="group" aria-label="Urgency">
                {(["low", "medium", "high"] as const).map(u => (
                  <button type="button" key={u} className={intakeUrgency === u ? "on" : ""}
                    aria-pressed={intakeUrgency === u} onClick={() => setIntakeUrgency(u)}>{u}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="lx-intake-desc">Brief Description</label>
              <textarea id="lx-intake-desc" value={intakeDescription} onChange={e => setIntakeDescription(e.target.value)}
                placeholder="Briefly describe the matter..." rows={3} />
            </div>
            <div className="row">
              <button type="button" className="lx-btn" onClick={() => setIntakeOpen(false)}>Cancel</button>
              <button
                type="button"
                className="lx-btn primary"
                disabled={!intakeClientName.trim()}
                onClick={() => {
                  const title = `${intakeMatterType}: ${intakeClientName || "New matter"}`;
                  const id = `t_${Date.now()}`;
                  const thread: Thread = {
                    id, title,
                    messages: [{
                      role: "user",
                      content: `Matter: ${intakeMatterType} for ${intakeClientName || "client"}. Urgency: ${intakeUrgency}. ${intakeDescription}`,
                    }],
                    createdAt: Date.now(),
                  };
                  setThreads(prev => [thread, ...prev]);
                  setActiveId(id);
                  setMode("research");
                  setIntakeOpen(false);
                  setIntakeClientName(""); setIntakeMatterType("Property"); setIntakeUrgency("medium"); setIntakeDescription("");
                }}
              >
                Create Matter
              </button>
            </div>
          </div>
        </div>
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

