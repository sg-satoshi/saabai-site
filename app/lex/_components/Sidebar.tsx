"use client";

import { useState } from "react";
import type { Mode, Project, Thread } from "./types";
import { Icon } from "./icons";

type Rename = { type: "thread" | "project"; id: string; value: string } | null;

export function initials(nameOrEmail: string | null | undefined): string {
  const s = (nameOrEmail ?? "").trim();
  if (!s) return "L";
  const base = s.includes("@") ? s.split("@")[0] : s;
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || base.slice(0, 2).toUpperCase();
}

function ThreadItem({ t, active, onSelect, onMenu, rename, setRename, onRename, onDragStart, onDragEnd, colour }: {
  t: Thread; active: boolean; onSelect: () => void; onMenu: (e: React.MouseEvent) => void;
  rename: Rename; setRename: (r: Rename) => void; onRename: (id: string, v: string) => void;
  onDragStart: () => void; onDragEnd: () => void; colour?: string;
}) {
  const editing = rename?.type === "thread" && rename.id === t.id;
  return (
    <div className={`lx-thread${active ? " on" : ""}`} draggable={!editing}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }} onDragEnd={onDragEnd}>
      {colour && <span className="dot" style={{ background: colour }} />}
      {editing ? (
        <input data-menu="rename" autoFocus value={rename!.value} aria-label="Thread name"
          onChange={(e) => setRename({ ...rename!, value: e.target.value })}
          onBlur={() => { onRename(t.id, rename!.value || t.title); setRename(null); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { onRename(t.id, rename!.value || t.title); setRename(null); }
            if (e.key === "Escape") setRename(null);
            e.stopPropagation();
          }} />
      ) : (
        <button type="button" className="t" onClick={onSelect} title={t.title} aria-current={active || undefined}>{t.title}</button>
      )}
      <button type="button" className="more" data-menu="trigger" aria-label={`Options for ${t.title}`} onClick={onMenu}>&#8943;</button>
    </div>
  );
}

export function Sidebar(props: {
  mode: Mode; setMode: (m: Mode) => void; onNew: () => void;
  threads: Thread[]; projects: Project[]; activeId: string | null; onSelect: (id: string) => void;
  onThreadMenu: (id: string, e: React.MouseEvent) => void; onProjectMenu: (id: string, e: React.MouseEvent) => void;
  rename: Rename; setRename: (r: Rename) => void; onRenameThread: (id: string, v: string) => void; onRenameProject: (id: string, v: string) => void;
  onNewProject: () => void; onMoveThread: (threadId: string, projectId: string | null) => void;
  expanded: Set<string>; toggleProject: (id: string) => void;
  firmName: string; firmLogo: string | null; userEmail: string | null;
  onFirmSettings: () => void; onIntake: () => void;
}) {
  const { mode, setMode, threads, projects, activeId } = props;
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const loose = threads.filter((t) => !t.projectId || !projects.some((p) => p.id === t.projectId));
  const nav = (m: Mode, icon: string, label: string) => (
    <button type="button" className={`lx-nav${mode === m ? " on" : ""}`} onClick={() => setMode(m)} aria-current={mode === m || undefined}>
      <Icon name={icon} />{label}
    </button>
  );
  const item = (t: Thread, colour?: string) => (
    <ThreadItem key={t.id} t={t} active={t.id === activeId && mode === "research"} colour={colour}
      onSelect={() => { props.onSelect(t.id); setMode("research"); }}
      onMenu={(e) => { e.stopPropagation(); props.onThreadMenu(t.id, e); }}
      rename={props.rename} setRename={props.setRename} onRename={props.onRenameThread}
      onDragStart={() => setDrag(t.id)} onDragEnd={() => { setDrag(null); setOver(null); }} />
  );
  const dropProps = (target: string | null) => ({
    onDragOver: (e: React.DragEvent) => { if (drag) { e.preventDefault(); setOver(target ?? "loose"); } },
    onDragLeave: () => setOver(null),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); if (drag) props.onMoveThread(drag, target); setDrag(null); setOver(null); },
  });

  return (
    <aside className="lx-side" aria-label="Lex navigation">
      <div className="lx-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={props.firmLogo || "/favicon.svg"} alt="" />
        <div><b>Lex</b><span>{props.firmName ? props.firmName : "by Saabai"}</span></div>
      </div>
      <button type="button" className="lx-new" onClick={props.onNew}><Icon name="plus" />New research<kbd>Ctrl K</kbd></button>

      <div className="lx-label">Workspace</div>
      {nav("research", "research", "Research")}
      {nav("draft", "draft", "Drafting")}
      {nav("review", "review", "Doc review")}

      <div className="lx-scroll">
        <div className="lx-label">Projects<button type="button" onClick={props.onNewProject} aria-label="New project">+ New</button></div>
        {projects.length === 0 && <div className="lx-empty-side">Group related research into a project.</div>}
        {projects.map((p) => {
          const pts = threads.filter((t) => t.projectId === p.id);
          const open = props.expanded.has(p.id);
          const editing = props.rename?.type === "project" && props.rename.id === p.id;
          return (
            <div key={p.id} {...dropProps(p.id)}>
              {editing ? (
                <div className="lx-thread">
                  <input data-menu="rename" autoFocus value={props.rename!.value} aria-label="Project name" style={{ marginLeft: 10 }}
                    onChange={(e) => props.setRename({ ...props.rename!, value: e.target.value })}
                    onBlur={() => { props.onRenameProject(p.id, props.rename!.value || p.name); props.setRename(null); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { props.onRenameProject(p.id, props.rename!.value || p.name); props.setRename(null); }
                      if (e.key === "Escape") props.setRename(null);
                    }} />
                </div>
              ) : (
                <div className="lx-thread">
                  <button type="button" className={`lx-proj${over === p.id ? " drop" : ""}`} onClick={() => props.toggleProject(p.id)} aria-expanded={open}>
                    <i style={{ background: p.colour }} />{p.name}<small>{pts.length}</small>
                  </button>
                  <button type="button" className="more" data-menu="trigger" aria-label={`Options for ${p.name}`}
                    onClick={(e) => { e.stopPropagation(); props.onProjectMenu(p.id, e); }}>&#8943;</button>
                </div>
              )}
              {open && pts.map((t) => item(t, p.colour))}
              {open && pts.length === 0 && <div className="lx-empty-side" style={{ paddingLeft: 36 }}>{over === p.id ? "Drop here" : "No research yet"}</div>}
            </div>
          );
        })}

        <div {...dropProps(null)} style={over === "loose" ? { outline: "1px dashed var(--teal)", borderRadius: 6 } : undefined}>
          <div className="lx-label">Recent research</div>
          {loose.length === 0 && <div className="lx-empty-side">Your research threads appear here.</div>}
          {loose.map((t) => item(t))}
        </div>

        <div className="lx-label">Firm</div>
        <a className="lx-nav" href="/client-portal"><Icon name="dashboard" />Firm dashboard</a>
        <button type="button" className="lx-nav" onClick={props.onIntake}><Icon name="matters" />New matter intake</button>
        <button type="button" className="lx-nav" onClick={props.onFirmSettings}><Icon name="settings" />Firm settings</button>
      </div>

      <div className="lx-foot">
        <div className="lx-avatar">{initials(props.userEmail)}</div>
        <div style={{ minWidth: 0 }}>
          <b>{props.userEmail ?? "Signed in"}</b>
          <span>{props.firmName || "Lex workspace"}</span>
        </div>
      </div>
      <a className="lx-powered" href="https://saabai.ai" target="_blank" rel="noopener noreferrer">Powered by Saabai.ai</a>
    </aside>
  );
}
