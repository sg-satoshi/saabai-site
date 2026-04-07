"use client";

import { useState, useMemo } from "react";
import type { NewsItem } from "../../lib/news";

// ── Icons ─────────────────────────────────────────────────────────────────────

function XIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.849L1.683 2.25H8.12l4.265 5.638 5.858-5.638Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 8l6-6M3 2h5v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// ── Cards ─────────────────────────────────────────────────────────────────────

function XCard({ item }: { item: NewsItem }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      className="group block rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            {item.authorName?.charAt(0) ?? "X"}
          </div>
          <div>
            <p className="text-[12px] font-semibold text-white leading-tight">{item.authorName}</p>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{item.source}</p>
          </div>
        </div>
        <span style={{ color: "rgba(255,255,255,0.3)" }}><XIcon size={13} /></span>
      </div>
      <p className="text-sm leading-relaxed mb-4 line-clamp-4" style={{ color: "rgba(255,255,255,0.85)" }}>
        {item.title}
      </p>
      <span className="flex items-center gap-1 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "rgba(255,255,255,0.4)" }}>
        View on X <ArrowIcon />
      </span>
    </a>
  );
}

function RedditCard({ item }: { item: NewsItem }) {
  return (
    <a href={item.permalink ?? item.url} target="_blank" rel="noopener noreferrer"
      className="group block bg-saabai-surface border border-saabai-border hover:border-saabai-teal/40 rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[9px] font-bold px-2 py-0.5 rounded tracking-wider uppercase"
          style={{ background: "rgba(255,99,0,0.15)", color: "#ff6535" }}>{item.source}</span>
      </div>
      <p className="text-sm font-medium text-saabai-text leading-snug mb-4 group-hover:text-saabai-teal-bright transition-colors line-clamp-3">
        {item.title}
      </p>
      <span className="flex items-center gap-1 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity text-saabai-teal">
        View thread <ArrowIcon />
      </span>
    </a>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      className="group block bg-saabai-surface border border-saabai-border hover:border-saabai-teal/40 rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[9px] font-bold px-2 py-0.5 rounded tracking-wider uppercase"
          style={{ background: "rgba(98,197,209,0.1)", color: "#62c5d1" }}>{item.source}</span>
      </div>
      <p className="text-sm font-medium text-saabai-text leading-snug mb-4 group-hover:text-saabai-teal-bright transition-colors line-clamp-3">
        {item.title}
      </p>
      <span className="flex items-center gap-1 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity text-saabai-teal">
        Read article <ArrowIcon />
      </span>
    </a>
  );
}

function AnyCard({ item }: { item: NewsItem }) {
  if (item.type === "x") return <XCard item={item} />;
  if (item.type === "reddit") return <RedditCard item={item} />;
  return <NewsCard item={item} />;
}

// ── Source chip ───────────────────────────────────────────────────────────────

function SourceChip({
  label, type, selected, onToggle,
}: {
  label: string;
  type: "reddit" | "news" | "x";
  selected: boolean;
  onToggle: () => void;
}) {
  const styles = {
    reddit: { active: { background: "rgba(255,99,0,0.25)", color: "#ff6535", borderColor: "#ff6535" }, idle: { background: "rgba(255,99,0,0.08)", color: "rgba(255,99,0,0.6)", borderColor: "rgba(255,99,0,0.2)" } },
    news:   { active: { background: "rgba(98,197,209,0.2)", color: "#62c5d1", borderColor: "#62c5d1" }, idle: { background: "rgba(98,197,209,0.06)", color: "rgba(98,197,209,0.5)", borderColor: "rgba(98,197,209,0.15)" } },
    x:      { active: { background: "rgba(255,255,255,0.15)", color: "#fff", borderColor: "rgba(255,255,255,0.6)" }, idle: { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", borderColor: "rgba(255,255,255,0.1)" } },
  };
  const s = selected ? styles[type].active : styles[type].idle;
  return (
    <button
      onClick={onToggle}
      className="text-[11px] font-semibold px-3 py-1.5 rounded-full tracking-wide transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
      style={{ border: `1px solid ${s.borderColor}`, ...s }}
    >
      {type === "x" && <XIcon size={9} />}
      {label}
      {selected && <span className="text-[9px] opacity-70">✕</span>}
    </button>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ badge, badgeStyle, title }: {
  badge: string;
  badgeStyle: React.CSSProperties;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="text-[9px] font-bold px-2 py-1 rounded tracking-wider uppercase flex items-center gap-1" style={badgeStyle}>
        {badge.startsWith("X") && <XIcon size={9} />}
        {badge}
      </span>
      <h2 className="text-lg font-semibold text-saabai-text">{title}</h2>
      <div className="flex-1 h-px bg-saabai-border" />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  reddit: NewsItem[];
  news: NewsItem[];
  x: NewsItem[];
}

// Build unique source lists from data
function getSources(items: NewsItem[]) {
  return [...new Set(items.map((i) => i.source))].sort();
}

export default function AiNewsClient({ reddit, news, x }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const redditSources = useMemo(() => getSources(reddit), [reddit]);
  const newsSources   = useMemo(() => getSources(news), [news]);
  const xSources      = useMemo(() => getSources(x), [x]);

  function toggle(source: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  }

  function selectAll(sources: string[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      sources.forEach((s) => next.add(s));
      return next;
    });
  }

  function clearAll() { setSelected(new Set()); }

  // Filter items based on selection
  const filteredReddit = selected.size === 0 ? reddit : reddit.filter((i) => selected.has(i.source));
  const filteredNews   = selected.size === 0 ? news   : news.filter((i) => selected.has(i.source));
  const filteredX      = selected.size === 0 ? x      : x.filter((i) => selected.has(i.source));

  // Custom feed = union of all filtered items when sources are selected
  const customFeed: NewsItem[] = selected.size === 0
    ? []
    : [...filteredX, ...filteredReddit, ...filteredNews];

  const hasSelection = selected.size > 0;

  return (
    <div className="space-y-16">

      {/* ── Source filter panel ─────────────────────────────────────────────── */}
      <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-saabai-teal uppercase mb-1">Your Feed</p>
            <p className="text-xs text-saabai-text-dim">
              {hasSelection
                ? `${selected.size} source${selected.size > 1 ? "s" : ""} selected — showing ${customFeed.length} posts`
                : "Select sources below to build your custom feed"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasSelection && (
              <button onClick={clearAll}
                className="text-[11px] text-saabai-text-dim hover:text-saabai-text transition-colors px-3 py-1.5 rounded-lg"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* X accounts */}
        {xSources.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-bold tracking-widest uppercase flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                <XIcon size={8} /> X Accounts
              </span>
              <button onClick={() => selectAll(xSources)} className="text-[10px] transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.25)" }}>
                select all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {xSources.map((s) => (
                <SourceChip key={s} label={s} type="x" selected={selected.has(s)} onToggle={() => toggle(s)} />
              ))}
            </div>
          </div>
        )}

        {/* Reddit */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,99,0,0.4)" }}>Reddit</span>
            <button onClick={() => selectAll(redditSources)} className="text-[10px] transition-colors" style={{ color: "rgba(255,99,0,0.3)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,99,0,0.7)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,99,0,0.3)")}>
              select all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {redditSources.map((s) => (
              <SourceChip key={s} label={s} type="reddit" selected={selected.has(s)} onToggle={() => toggle(s)} />
            ))}
          </div>
        </div>

        {/* News */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "rgba(98,197,209,0.4)" }}>News</span>
            <button onClick={() => selectAll(newsSources)} className="text-[10px] transition-colors" style={{ color: "rgba(98,197,209,0.3)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(98,197,209,0.7)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(98,197,209,0.3)")}>
              select all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {newsSources.map((s) => (
              <SourceChip key={s} label={s} type="news" selected={selected.has(s)} onToggle={() => toggle(s)} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Custom feed ─────────────────────────────────────────────────────── */}
      {hasSelection && (
        <div>
          <SectionHeader
            badge="Your Feed"
            badgeStyle={{ background: "rgba(98,197,209,0.15)", color: "#62c5d1" }}
            title={`${selected.size} source${selected.size > 1 ? "s" : ""} selected`}
          />
          {customFeed.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customFeed.map((item, i) => <AnyCard key={i} item={item} />)}
            </div>
          ) : (
            <p className="text-saabai-text-dim text-sm">No posts available for this selection right now.</p>
          )}
        </div>
      )}

      {/* ── X voices ────────────────────────────────────────────────────────── */}
      {!hasSelection && x.length > 0 && (
        <div>
          <SectionHeader
            badge="X"
            badgeStyle={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}
            title="AI Voices on X"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {x.map((item, i) => <XCard key={i} item={item} />)}
          </div>
        </div>
      )}

      {/* ── Reddit ──────────────────────────────────────────────────────────── */}
      {!hasSelection && (
        <div>
          <SectionHeader
            badge="Reddit"
            badgeStyle={{ background: "rgba(255,99,0,0.15)", color: "#ff6535" }}
            title="Community Discussions"
          />
          {reddit.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reddit.map((item, i) => <RedditCard key={i} item={item} />)}
            </div>
          ) : (
            <p className="text-saabai-text-dim text-sm">Loading discussions...</p>
          )}
        </div>
      )}

      {/* ── News ────────────────────────────────────────────────────────────── */}
      {!hasSelection && (
        <div>
          <SectionHeader
            badge="News"
            badgeStyle={{ background: "rgba(98,197,209,0.1)", color: "#62c5d1" }}
            title="Industry & Research"
          />
          {news.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {news.map((item, i) => <NewsCard key={i} item={item} />)}
            </div>
          ) : (
            <p className="text-saabai-text-dim text-sm">Loading articles...</p>
          )}
        </div>
      )}

    </div>
  );
}
