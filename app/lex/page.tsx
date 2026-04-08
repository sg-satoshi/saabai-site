"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { DOCUMENT_TYPES } from "../../lib/lex-document-types";

// ── Brand ─────────────────────────────────────────────────────────────────────
const C = {
  bg:           "#0d1b2a",   // deep navy background
  surface:      "#162236",   // card/panel surface
  surfaceRaised:"#1e3050",   // elevated surfaces
  border:       "#243550",   // subtle border
  borderAccent: "#2d4870",   // stronger border on focus
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

type ChatMessage  = { role: "user" | "assistant"; content: string };
type Thread       = { id: string; title: string; messages: ChatMessage[]; createdAt: number };
type Mode         = "research" | "draft" | "review";

type QASection  = { id: string; clause: string; status: "verified" | "flagged" | "unverified"; note: string };
type QAReport   = { overallConfidence: number; sections: QASection[]; criticalIssues: string[]; recommendedChecks: string[] };

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
function threadTitle(msgs: ChatMessage[]): string {
  const first = msgs.find(m => m.role === "user")?.content ?? "New research";
  return first.length > 52 ? first.slice(0, 52) + "…" : first;
}

function fmtDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

// ── Lex avatar ────────────────────────────────────────────────────────────────
function LexMark({ size = 32 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${C.goldBright} 0%, ${C.gold} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, border: `1.5px solid ${C.goldDim}`,
    }}>
      <span style={{ fontSize: size * 0.42, fontWeight: 900, color: C.bg, fontFamily: "Georgia, serif" }}>L</span>
    </div>
  );
}

// ── Thinking dots ─────────────────────────────────────────────────────────────
function ThinkingDots({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px",
      background: C.aiBubble, borderRadius: "16px 16px 16px 4px",
      border: `1px solid ${C.border}`, maxWidth: 220 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0,1,2].map(i => (
          <span key={i} style={{
            width: 5, height: 5, borderRadius: "50%", background: C.gold, display: "block",
            animation: `lexDot 1.2s ease-in-out ${i*0.2}s infinite`,
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: C.textMuted }}>{label}</span>
    </div>
  );
}

// ── Render message content (markdown-lite) ────────────────────────────────────
function renderLex(text: string): React.ReactNode[] {
  // Fix period-space
  text = text.replace(/([a-z\)])\. ?([A-Z])/g, "$1. $2");
  const paragraphs = text.split(/\n{2,}/);
  const out: React.ReactNode[] = [];
  const linkRe = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\(((?:https?|mailto):\/\/[^\)]+)\))/g;

  paragraphs.forEach((para, pi) => {
    if (pi > 0) out.push(<div key={`gap-${pi}`} style={{ height: 8 }} />);
    para.split("\n").forEach((line, li) => {
      if (li > 0) out.push(<br key={`br-${pi}-${li}`} />);
      const nodes: React.ReactNode[] = [];
      let last = 0, key = 0, m: RegExpExecArray | null;
      linkRe.lastIndex = 0;
      while ((m = linkRe.exec(line)) !== null) {
        if (m.index > last) nodes.push(line.slice(last, m.index));
        if (m[0].startsWith("**")) {
          nodes.push(<strong key={`b-${pi}-${li}-${key++}`} style={{ color: C.goldBright }}>{m[2]}</strong>);
        } else {
          nodes.push(
            <a key={`a-${pi}-${li}-${key++}`} href={m[4]} target="_blank" rel="noopener noreferrer"
              style={{ color: C.gold, textDecoration: "underline", fontWeight: 600 }}>
              {m[3]}
            </a>
          );
        }
        last = m.index + m[0].length;
      }
      if (last < line.length) nodes.push(line.slice(last));
      out.push(...nodes);
    });
  });
  return out;
}

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

// ── Quick replies ─────────────────────────────────────────────────────────────
const QUICK_REPLIES = [
  "What are the elements of negligence under Australian law?",
  "Summarise the duty of care test from Donoghue v Stevenson",
  "What does s 180 Corporations Act say about director duties?",
  "Search AustLII for recent unfair dismissal cases",
  "What are the CGT implications of a trust distribution?",
  "What is the test for unconscionable conduct under the ACL?",
  "Draft a short letter of advice on a breach of contract",
  "Search ATO rulings on Division 7A and loan repayments",
  "What is the reasonable person standard in negligence?",
  "Explain the difference between binding and persuasive authority",
];

function pickReplies() {
  return [...QUICK_REPLIES].sort(() => Math.random() - 0.5).slice(0, 4);
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LexPage() {
  const clientId = "lex-internal";

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkLabel, setThinkLabel] = useState("Researching…");
  const [chips, setChips] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // ── Draft mode state ───────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("research");
  const [draftTypeId, setDraftTypeId] = useState<string>(DOCUMENT_TYPES[0].id);
  const [draftParties, setDraftParties] = useState("");
  const [draftJurisdiction, setDraftJurisdiction] = useState("All Australian jurisdictions");
  const [draftInstructions, setDraftInstructions] = useState("");
  const [draftText, setDraftText] = useState("");
  const [draftQA, setDraftQA] = useState<QAReport | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftQALoading, setDraftQALoading] = useState(false);
  const [draftThinkLabel, setDraftThinkLabel] = useState("Searching legislation…");
  const [draftCopied, setDraftCopied] = useState(false);
  const draftBottomRef = useRef<HTMLDivElement>(null);
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
  const [reviewError, setReviewError]             = useState<string | null>(null);
  const reviewFileRef = useRef<HTMLInputElement>(null);
  const [reviewDragOver, setReviewDragOver]       = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const abortRef   = useRef<AbortController | null>(null);

  const activeThread = threads.find(t => t.id === activeId) ?? null;
  const messages = activeThread?.messages ?? [];

  // Hydrate threads + chips from client state after mount (avoids server/client mismatch)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("lex_threads") ?? "[]") as Thread[];
      if (saved.length > 0) {
        setThreads(saved);
        setActiveId(saved[0].id);
      }
    } catch {}
    setChips(pickReplies());
  }, []);

  // Persist threads
  useEffect(() => {
    try { localStorage.setItem("lex_threads", JSON.stringify(threads)); } catch {}
  }, [threads]);

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
    const id = `t_${Date.now()}`;
    const thread: Thread = { id, title: "New research", messages: [], createdAt: Date.now() };
    setThreads(prev => [thread, ...prev]);
    setActiveId(id);
    setInput("");
    setChips(pickReplies());
  }

  function deleteThread(id: string) {
    setThreads(prev => prev.filter(t => t.id !== id));
    if (activeId === id) {
      const remaining = threads.filter(t => t.id !== id);
      setActiveId(remaining[0]?.id ?? null);
    }
  }

  function updateThreadMessages(id: string, msgs: ChatMessage[]) {
    setThreads(prev => prev.map(t =>
      t.id === id
        ? { ...t, messages: msgs, title: threadTitle(msgs) }
        : t
    ));
  }

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    let tid = activeId;
    // Create a new thread if none active
    if (!tid) {
      tid = `t_${Date.now()}`;
      const newT: Thread = { id: tid, title: "New research", messages: [], createdAt: Date.now() };
      setThreads(prev => [newT, ...prev]);
      setActiveId(tid);
    }

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const prevMsgs = threads.find(t => t.id === tid)?.messages ?? [];
    const updated = [...prevMsgs, userMsg];

    updateThreadMessages(tid, updated);
    setInput("");
    setLoading(true);
    setChips([]);
    setThinkLabel(thinkingFor(text));

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/lex-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, clientId }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";
      let started = false;
      const finalId = tid;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
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

      if (fullText.trim()) {
        const final: ChatMessage[] = [...updated, { role: "assistant", content: fullText.trim() }];
        updateThreadMessages(finalId, final);
        // Follow-up chips
        setChips(pickReplies());
      }
    } catch (e: unknown) {
      if ((e as Error)?.name !== "AbortError") {
        const errMsgs: ChatMessage[] = [
          ...updated,
          { role: "assistant", content: "There was a problem reaching the research API. Please try again." },
        ];
        if (tid) updateThreadMessages(tid, errMsgs);
      }
    } finally {
      setLoading(false);
    }
  }, [activeId, threads, loading, clientId]);

  function copyLast() {
    const last = [...messages].reverse().find(m => m.role === "assistant");
    if (!last) return;
    navigator.clipboard.writeText(last.content).then(() => {
      setCopyFeedback("Copied!");
      setTimeout(() => setCopyFeedback(null), 1500);
    });
  }

  const sendDraft = useCallback(async () => {
    if (draftLoading) return;
    setDraftText("");
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
          messages: [],
        }),
        signal: draftAbortRef.current.signal,
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === "text-delta" && parsed.delta) {
              fullText += parsed.delta;
              setDraftText(fullText);
            }
          } catch {}
        }
      }

      clearInterval(labelTimer);
      setDraftLoading(false);

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
        setDraftText("There was a problem reaching the drafting API. Please try again.");
      }
      setDraftLoading(false);
    }
  }, [draftLoading, draftTypeId, draftParties, draftJurisdiction, draftInstructions]);

  const sendReview = useCallback(async () => {
    if (reviewLoading) return;
    const hasContent = reviewInputMode === "paste" ? reviewPasteText.trim() : !!reviewFile;
    if (!hasContent) return;

    setReviewLoading(true);
    setReviewReport(null);
    setReviewError(null);

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
        if (!extractRes.ok) throw new Error((await extractRes.json()).error ?? "Extraction failed");
        const extracted = await extractRes.json();
        documentText = extracted.text;
        wordCount = extracted.wordCount;
      } else {
        documentText = reviewPasteText.trim();
        wordCount = documentText.split(/\s+/).filter(Boolean).length;
      }

      if (!documentText.trim()) throw new Error("No text could be extracted from the document.");

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

      if (!reviewRes.ok) throw new Error((await reviewRes.json()).error ?? "Review failed");
      const report = await reviewRes.json() as ReviewReport;
      report.wordCount = report.wordCount || wordCount;
      setReviewReport(report);
    } catch (e: unknown) {
      setReviewError((e as Error).message ?? "Review failed. Please try again.");
    } finally {
      clearInterval(stageTimer);
      setReviewLoading(false);
    }
  }, [reviewLoading, reviewInputMode, reviewFile, reviewPasteText, reviewDocType, reviewDirection, reviewActingFor, reviewJurisdiction]);

  useEffect(() => {
    if (draftText) draftBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [draftText]);

  const showWelcome = messages.length === 0;

  return (
    <div style={{
      display: "flex", height: "100dvh", overflow: "hidden",
      background: C.bg, color: C.text,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif",
    }}>
      <style>{`
        @keyframes lexDot{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <aside style={{
          width: 260, flexShrink: 0, display: "flex", flexDirection: "column",
          background: C.surface, borderRight: `1px solid ${C.border}`,
        }}>
          {/* Brand */}
          <div style={{ padding: "18px 16px 12px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <LexMark size={34} />
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.text, letterSpacing: 0.2 }}>Lex</p>
                <p style={{ margin: 0, fontSize: 10, color: C.textMuted }}>Australian Legal Research</p>
              </div>
            </div>
          </div>

          {/* New thread button */}
          <div style={{ padding: "10px 12px" }}>
            <button onClick={newThread} style={{
              width: "100%", padding: "9px 12px", borderRadius: 10,
              background: C.goldBg, border: `1px solid ${C.goldBorder}`,
              color: C.gold, fontSize: 12, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              New Research Thread
            </button>
          </div>

          {/* Thread list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
            {threads.length === 0 && (
              <p style={{ textAlign: "center", color: C.textDim, fontSize: 11, marginTop: 24, padding: "0 12px" }}>
                No threads yet. Start a new research session above.
              </p>
            )}
            {threads.map(thread => (
              <div
                key={thread.id}
                onClick={() => { setActiveId(thread.id); setChips(pickReplies()); }}
                style={{
                  padding: "9px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 2,
                  background: activeId === thread.id ? C.surfaceRaised : "transparent",
                  border: activeId === thread.id ? `1px solid ${C.borderAccent}` : "1px solid transparent",
                  display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: activeId === thread.id ? C.text : C.textMuted,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {thread.title}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 10, color: C.textDim }}>{fmtDate(thread.createdAt)}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteThread(thread.id); }}
                  style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer",
                    padding: 2, borderRadius: 4, flexShrink: 0, lineHeight: 1, fontSize: 14 }}
                  title="Delete thread"
                >×</button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
            <a href="/client-portal" style={{ display: "block", fontSize: 11, color: C.textMuted,
              textDecoration: "none", padding: "6px 0" }}>
              ⚙ Firm Dashboard
            </a>
            <a href="https://saabai.ai" target="_blank" rel="noopener noreferrer"
              style={{ display: "block", fontSize: 10, color: C.textDim, textDecoration: "none", marginTop: 4 }}>
              Powered by Saabai.ai
            </a>
          </div>
        </aside>
      )}

      {/* ── Main panel ───────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Toolbar */}
        <div style={{
          height: 52, borderBottom: `1px solid ${C.border}`, padding: "0 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: C.surface, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setSidebarOpen(v => !v)}
              style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 4 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            {!sidebarOpen && <LexMark size={26} />}
            {/* Mode tabs */}
            <div style={{ display: "flex", background: C.bg, borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
              {([["research", "Research"], ["draft", "Draft Document"], ["review", "Doc Review"]] as [Mode, string][]).map(([m, label]) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  padding: "4px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", border: "none", transition: "all 0.15s",
                  background: mode === m ? C.gold : "transparent",
                  color: mode === m ? C.bg : C.textMuted,
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {mode === "research" && messages.some(m => m.role === "assistant") && (
              <button onClick={copyLast} style={{
                background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
                color: C.textMuted, fontSize: 11, cursor: "pointer", padding: "4px 10px",
              }}>
                {copyFeedback ?? "Copy last response"}
              </button>
            )}
            {mode === "research" && (
              <button onClick={newThread} style={{
                background: C.goldBg, border: `1px solid ${C.goldBorder}`,
                borderRadius: 6, color: C.gold, fontSize: 11, fontWeight: 700,
                cursor: "pointer", padding: "4px 12px",
              }}>+ New Thread</button>
            )}
            {mode === "draft" && draftText && (
              <button onClick={() => { navigator.clipboard.writeText(draftText); setDraftCopied(true); setTimeout(() => setDraftCopied(false), 1500); }} style={{
                background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
                color: C.textMuted, fontSize: 11, cursor: "pointer", padding: "4px 10px",
              }}>
                {draftCopied ? "Copied!" : "Copy draft"}
              </button>
            )}
          </div>
        </div>

        {/* ── Draft mode ─────────────────────────────────────────────────────── */}
        {mode === "draft" && (
          <div style={{ flex: 1, overflowY: "auto", display: "flex", minHeight: 0 }}>

            {/* Form panel */}
            <div style={{
              width: 340, flexShrink: 0, borderRight: `1px solid ${C.border}`,
              background: C.surface, overflowY: "auto", padding: "24px 20px",
            }}>
              <p style={{ margin: "0 0 18px", fontSize: 13, fontWeight: 700, color: C.gold, letterSpacing: 0.3 }}>
                Document Configuration
              </p>

              {/* Document type */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Document Type
                </label>
                <select value={draftTypeId} onChange={e => setDraftTypeId(e.target.value)}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8,
                    background: C.bg, border: `1px solid ${C.border}`,
                    color: C.text, fontSize: 13, cursor: "pointer", outline: "none",
                  }}>
                  {(["trust", "family-law", "commercial", "employment", "property"] as const).map(cat => {
                    const docs = DOCUMENT_TYPES.filter(d => d.category === cat);
                    if (!docs.length) return null;
                    const labels: Record<string, string> = { trust: "Trusts", "family-law": "Family Law", commercial: "Commercial", employment: "Employment", property: "Property" };
                    return (
                      <optgroup key={cat} label={labels[cat]}>
                        {docs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </optgroup>
                    );
                  })}
                </select>
                {/* Document description */}
                {(() => {
                  const doc = DOCUMENT_TYPES.find(d => d.id === draftTypeId);
                  return doc ? (
                    <p style={{ margin: "8px 0 0", fontSize: 11, color: C.textDim, lineHeight: 1.5 }}>{doc.description}</p>
                  ) : null;
                })()}
              </div>

              {/* Jurisdiction */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Jurisdiction
                </label>
                <select value={draftJurisdiction} onChange={e => setDraftJurisdiction(e.target.value)}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8,
                    background: C.bg, border: `1px solid ${C.border}`,
                    color: C.text, fontSize: 13, cursor: "pointer", outline: "none",
                  }}>
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

              {/* Parties */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Parties
                </label>
                <textarea value={draftParties} onChange={e => setDraftParties(e.target.value)}
                  placeholder={"e.g.\nTrustee: Smith Holdings Pty Ltd (ACN 123 456 789)\nSettlor: Jane Smith\nBeneficiaries: Smith Family"}
                  rows={5}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8, resize: "vertical",
                    background: C.bg, border: `1px solid ${C.border}`,
                    color: C.text, fontSize: 13, lineHeight: 1.6, outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Special instructions */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Special Instructions
                  <span style={{ fontWeight: 400, textTransform: "none", marginLeft: 4, color: C.textDim }}>(optional)</span>
                </label>
                <textarea value={draftInstructions} onChange={e => setDraftInstructions(e.target.value)}
                  placeholder="e.g. Include a corporate trustee clause. Vesting date 80 years from establishment."
                  rows={3}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: 8, resize: "vertical",
                    background: C.bg, border: `1px solid ${C.border}`,
                    color: C.text, fontSize: 13, lineHeight: 1.6, outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Warnings for selected doc type */}
              {(() => {
                const doc = DOCUMENT_TYPES.find(d => d.id === draftTypeId);
                return doc && doc.draftingWarnings.length > 0 ? (
                  <div style={{ marginBottom: 20, padding: "12px 14px", borderRadius: 8, background: "rgba(201,168,76,0.06)", border: `1px solid ${C.goldBorder}` }}>
                    <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: 0.5, textTransform: "uppercase" }}>Key Drafting Risks</p>
                    {doc.draftingWarnings.slice(0, 3).map((w, i) => (
                      <p key={i} style={{ margin: i > 0 ? "6px 0 0" : 0, fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>
                        <span style={{ color: C.gold }}>!</span> {w}
                      </p>
                    ))}
                  </div>
                ) : null;
              })()}

              <button
                onClick={sendDraft}
                disabled={draftLoading}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
                  background: draftLoading ? C.goldDim : `linear-gradient(135deg, ${C.goldBright} 0%, ${C.gold} 100%)`,
                  color: C.bg, fontSize: 13, fontWeight: 800, cursor: draftLoading ? "not-allowed" : "pointer",
                  letterSpacing: 0.3, transition: "opacity 0.15s",
                  boxShadow: draftLoading ? "none" : `0 0 20px rgba(201,168,76,0.3)`,
                }}>
                {draftLoading ? draftThinkLabel : "Draft Document"}
              </button>

              {draftLoading && (
                <p style={{ margin: "10px 0 0", fontSize: 10, color: C.textDim, textAlign: "center" }}>
                  Searching legislation and verifying citations before drafting...
                </p>
              )}
            </div>

            {/* Output panel */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", minWidth: 0 }}>

              {/* Empty state */}
              {!draftText && !draftLoading && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: C.goldBg, border: `1px solid ${C.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/>
                    </svg>
                  </div>
                  <p style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: C.text }}>Ready to Draft</p>
                  <p style={{ margin: 0, fontSize: 13, color: C.textMuted, maxWidth: 360, lineHeight: 1.6 }}>
                    Configure the document on the left. Lex will search the governing legislation, verify section numbers, and draft a fully cited document.
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap", justifyContent: "center" }}>
                    {["Search-first mandate", "Verified citations", "QA verification", "Jurisdiction-aware"].map(t => (
                      <span key={t} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 20, background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.gold }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Thinking state */}
              {draftLoading && !draftText && (
                <div style={{ padding: "32px 32px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <ThinkingDots label={draftThinkLabel} />
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: C.textDim }}>Lex is searching legislation before drafting. This ensures every section number is verified.</p>
                </div>
              )}

              {/* Draft output */}
              {draftText && (
                <div style={{ padding: "28px 32px" }}>
                  <div style={{
                    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
                    padding: "28px 32px", fontFamily: "'Georgia', 'Times New Roman', serif",
                    fontSize: 13.5, lineHeight: 1.9, color: C.text, whiteSpace: "pre-wrap",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                  }}>
                    {draftText}
                    {draftLoading && <span style={{ display: "inline-block", width: 8, height: 16, background: C.gold, animation: "lexDot 0.8s ease-in-out infinite", verticalAlign: "middle", marginLeft: 4, borderRadius: 2 }} />}
                  </div>

                  {/* QA Loading */}
                  {draftQALoading && (
                    <div style={{ marginTop: 16, padding: "14px 18px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: C.gold, display: "block", animation: `lexDot 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
                      </div>
                      <span style={{ fontSize: 12, color: C.textMuted }}>Running QA verification — checking every citation and clause...</span>
                    </div>
                  )}

                  {/* QA Panel */}
                  {draftQA && (
                    <div style={{ marginTop: 20, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                      {/* QA header */}
                      <div style={{
                        padding: "20px 24px", background: C.surface,
                        borderBottom: `1px solid ${C.border}`,
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}>
                        <div>
                          <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 800, color: C.text }}>QA Verification Report</p>
                          <p style={{ margin: 0, fontSize: 11, color: C.textMuted }}>Independent review of citations, clauses, and legal accuracy</p>
                        </div>
                        {/* Confidence score */}
                        <div style={{ textAlign: "center", flexShrink: 0 }}>
                          <div style={{
                            width: 72, height: 72, borderRadius: "50%", position: "relative",
                            background: `conic-gradient(${
                              draftQA.overallConfidence >= 85 ? "#22c55e" :
                              draftQA.overallConfidence >= 65 ? "#f59e0b" : "#ef4444"
                            } ${draftQA.overallConfidence * 3.6}deg, ${C.bg} 0deg)`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: `0 0 16px ${draftQA.overallConfidence >= 85 ? "rgba(34,197,94,0.25)" : draftQA.overallConfidence >= 65 ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.25)"}`,
                          }}>
                            <div style={{ width: 54, height: 54, borderRadius: "50%", background: C.surface, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: 16, fontWeight: 900, color: draftQA.overallConfidence >= 85 ? "#22c55e" : draftQA.overallConfidence >= 65 ? "#f59e0b" : "#ef4444", lineHeight: 1 }}>{draftQA.overallConfidence}</span>
                              <span style={{ fontSize: 8, color: C.textDim, lineHeight: 1, marginTop: 1 }}>/ 100</span>
                            </div>
                          </div>
                          <p style={{ margin: "6px 0 0", fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: draftQA.overallConfidence >= 85 ? "#22c55e" : draftQA.overallConfidence >= 65 ? "#f59e0b" : "#ef4444" }}>
                            {draftQA.overallConfidence >= 85 ? "High Confidence" : draftQA.overallConfidence >= 65 ? "Review Advised" : "Significant Concerns"}
                          </p>
                        </div>
                      </div>

                      {/* Critical issues */}
                      {draftQA.criticalIssues.length > 0 && (
                        <div style={{ padding: "16px 24px", background: "rgba(239,68,68,0.06)", borderBottom: `1px solid rgba(239,68,68,0.15)` }}>
                          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#ef4444", letterSpacing: 0.5, textTransform: "uppercase" }}>
                            Critical Issues — Must Review Before Use
                          </p>
                          {draftQA.criticalIssues.map((issue, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, marginTop: i > 0 ? 8 : 0 }}>
                              <span style={{ color: "#ef4444", fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>✕</span>
                              <p style={{ margin: 0, fontSize: 12, color: "#fca5a5", lineHeight: 1.5 }}>{issue}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Clause sections */}
                      {draftQA.sections.length > 0 && (
                        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}` }}>
                          <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, textTransform: "uppercase" }}>Clause-by-Clause Review</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {draftQA.sections.map((s, i) => {
                              const statusColor = s.status === "verified" ? "#22c55e" : s.status === "flagged" ? "#f59e0b" : C.textDim;
                              const statusIcon = s.status === "verified" ? "✓" : s.status === "flagged" ? "⚠" : "?";
                              const statusBg = s.status === "verified" ? "rgba(34,197,94,0.06)" : s.status === "flagged" ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.02)";
                              return (
                                <div key={i} style={{ padding: "10px 14px", borderRadius: 8, background: statusBg, border: `1px solid ${s.status === "verified" ? "rgba(34,197,94,0.12)" : s.status === "flagged" ? "rgba(245,158,11,0.15)" : C.border}` }}>
                                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                    <span style={{ fontSize: 13, color: statusColor, flexShrink: 0, fontWeight: 700, marginTop: 1 }}>{statusIcon}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3, flexWrap: "wrap" }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{s.id}</span>
                                        <span style={{ fontSize: 10, color: C.textDim }}>{s.clause}</span>
                                        <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 20, background: statusBg, color: statusColor, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase", border: `1px solid ${s.status === "verified" ? "rgba(34,197,94,0.2)" : s.status === "flagged" ? "rgba(245,158,11,0.2)" : C.border}` }}>
                                          {s.status}
                                        </span>
                                      </div>
                                      <p style={{ margin: 0, fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>{s.note}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Recommended checks */}
                      {draftQA.recommendedChecks.length > 0 && (
                        <div style={{ padding: "16px 24px" }}>
                          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, textTransform: "uppercase" }}>Recommended Checks Before Use</p>
                          {draftQA.recommendedChecks.map((check, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, marginTop: i > 0 ? 8 : 0 }}>
                              <span style={{ color: C.gold, fontSize: 12, lineHeight: 1.6, flexShrink: 0 }}>→</span>
                              <p style={{ margin: 0, fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>{check}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div ref={draftBottomRef} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Research mode ───────────────────────────────────────────────────── */}
        {mode === "research" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
          <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px" }}>

            {/* Welcome screen */}
            {showWelcome && (
              <div style={{ textAlign: "center", paddingTop: 40 }}>
                <LexMark size={56} />
                <h1 style={{ margin: "16px 0 8px", fontSize: 26, fontWeight: 800, color: C.text }}>
                  Lex — Australian Legal Research
                </h1>
                <p style={{ margin: "0 0 32px", fontSize: 14, color: C.textMuted, lineHeight: 1.6 }}>
                  Real-time research across AustLII, ATO, Federal Legislation, and international databases.
                  <br/>Every response cites its source.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 560, margin: "0 auto 32px" }}>
                  {chips.map(chip => (
                    <button key={chip} onClick={() => sendMessage(chip)}
                      style={{
                        padding: "12px 14px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                        background: C.surface, border: `1px solid ${C.border}`,
                        color: C.textMuted, fontSize: 12, lineHeight: 1.4, fontWeight: 400,
                      }}>
                      {chip}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center",
                  flexWrap: "wrap", fontSize: 11, color: C.textDim }}>
                  {["AustLII case law", "ATO rulings", "Federal legislation", "International law"].map(tag => (
                    <span key={tag} style={{
                      padding: "4px 10px", borderRadius: 20,
                      background: C.goldBg, border: `1px solid ${C.goldBorder}`, color: C.gold,
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: "flex", gap: 12, marginBottom: 20,
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
              }}>
                {msg.role === "assistant" && <LexMark size={28} />}
                <div style={{
                  maxWidth: msg.role === "user" ? "70%" : "100%",
                  padding: "12px 16px",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user" ? C.userBubble : C.aiBubble,
                  border: `1px solid ${C.border}`,
                  fontSize: 14, lineHeight: 1.7, color: C.text,
                }}>
                  {renderLex(msg.content)}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <LexMark size={28} />
                <ThinkingDots label={thinkLabel} />
              </div>
            )}

            {/* Follow-up chips after response */}
            {!loading && !showWelcome && chips.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, marginLeft: 40 }}>
                {chips.map(chip => (
                  <button key={chip} onClick={() => sendMessage(chip)} style={{
                    padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                    background: C.goldBg, border: `1px solid ${C.goldBorder}`,
                    color: C.gold, fontSize: 11, fontWeight: 500,
                  }}>
                    {chip}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>
        )}

        {/* Input area — research mode only */}
        {mode === "research" && <div style={{
          borderTop: `1px solid ${C.border}`, background: C.surface,
          padding: "14px 24px 18px", flexShrink: 0,
        }}>
          <div style={{ maxWidth: 780, margin: "0 auto" }}>
            <div style={{
              display: "flex", gap: 10, alignItems: "center",
              background: C.bg, border: `1.5px solid ${C.borderAccent}`,
              borderRadius: 14, padding: "10px 12px",
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
                }}
                placeholder="Ask a legal research question… (Shift+Enter for new line)"
                disabled={loading}
                rows={1}
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  color: C.text, fontSize: 14, resize: "none", lineHeight: 1.6,
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                style={{
                  width: 36, height: 36, borderRadius: 10, border: "none", flexShrink: 0,
                  background: input.trim() && !loading ? C.gold : C.goldBg,
                  cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 2L7 9" stroke={C.bg} strokeWidth="2" strokeLinecap="round"/>
                  <path d="M14 2L9.5 14L7 9L2 6.5L14 2z" stroke={C.bg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 10.5, color: C.textDim, textAlign: "center" }}>
              Lex searches AustLII, ATO, and legislation.gov.au in real-time. Always cite-check before use in practice. •{" "}
              <a href="https://austlii.edu.au" target="_blank" rel="noopener noreferrer" style={{ color: C.textDim }}>AustLII</a>{" "}
              <a href="https://ato.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: C.textDim }}>ATO</a>{" "}
              <a href="https://legislation.gov.au" target="_blank" rel="noopener noreferrer" style={{ color: C.textDim }}>legislation.gov.au</a>
            </p>
          </div>
        </div>}

        {/* ── Doc Review mode ─────────────────────────────────────────────── */}
        {mode === "review" && (
          <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>

            {/* Left: config panel */}
            <div style={{ width: 320, flexShrink: 0, borderRight: `1px solid ${C.border}`, background: C.surface, overflowY: "auto", padding: "24px 20px" }}>

              <p style={{ margin: "0 0 18px", fontSize: 13, fontWeight: 700, color: C.gold, letterSpacing: 0.3 }}>Document Review</p>

              {/* Direction toggle */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>Review Type</label>
                <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
                  {(["incoming", "outgoing"] as const).map(d => (
                    <button key={d} onClick={() => setReviewDirection(d)} style={{
                      flex: 1, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
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
                          {(reviewFile.size / 1024).toFixed(0)} KB — click to change
                        </p>
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="1.5" strokeLinecap="round" style={{ margin: "0 auto 8px", display: "block" }}>
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        <p style={{ margin: 0, fontSize: 12, color: C.textMuted, fontWeight: 500 }}>Drop file or click to browse</p>
                        <p style={{ margin: "4px 0 0", fontSize: 10, color: C.textDim }}>PDF, DOCX, DOC, TXT — max 10MB</p>
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
                  width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
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
                  <div style={{ padding: "16px 20px", borderRadius: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#ef4444" }}>Review failed</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#fca5a5" }}>{reviewError}</p>
                  </div>
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
                            <div key={i} style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
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
                            <div key={i} style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(129,140,248,0.06)", border: "1px solid rgba(129,140,248,0.2)" }}>
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
        )}

      </main>
    </div>
  );
}
