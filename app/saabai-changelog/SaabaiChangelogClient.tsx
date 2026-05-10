"use client";

import { useState } from "react";

type Tag = "NEW" | "FIX" | "IMPROVEMENT" | "UI" | "INFRA" | "DOCS" | "DEPLOYMENT" | "UPDATE";

interface Entry {
  time: string;
  tag: Tag;
  title: string;
}

interface Day {
  date: string;
  entries: Entry[];
}

const TAG_STYLES: Record<Tag, { bg: string; text: string; border: string }> = {
  NEW:         { bg: "rgba(37,211,102,0.18)",  text: "#ffffff", border: "rgba(37,211,102,0.35)" },
  FIX:         { bg: "rgba(96,165,250,0.18)",  text: "#ffffff", border: "rgba(96,165,250,0.35)" },
  IMPROVEMENT: { bg: "rgba(251,191,36,0.18)",  text: "#ffffff", border: "rgba(251,191,36,0.35)" },
  UI:          { bg: "rgba(244,114,182,0.18)", text: "#ffffff", border: "rgba(244,114,182,0.35)" },
  INFRA:       { bg: "rgba(251,146,60,0.18)",  text: "#ffffff", border: "rgba(251,146,60,0.35)" },
  DOCS:        { bg: "rgba(59,130,246,0.18)",  text: "#ffffff", border: "rgba(59,130,246,0.35)" },
  DEPLOYMENT:  { bg: "rgba(168,85,247,0.18)",  text: "#ffffff", border: "rgba(168,85,247,0.35)" },
  UPDATE:      { bg: "rgba(107,114,128,0.18)", text: "#ffffff", border: "rgba(107,114,128,0.35)" },
};

const CHANGELOG: Day[] = [
  {
    date: "10 May 2026",
    entries: [
      { time: "22:00", tag: "NEW", title: "Saabai changelog page created at /saabai-changelog" },
      { time: "22:00", tag: "DOCS", title: "Added docs/saabai-changelog.md with Rex-style entries" },
    ],
  },
];

export default function SaabaiChangelogClient() {
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  const filteredChangelog = CHANGELOG.map(day => ({
    ...day,
    entries: day.entries.filter(entry =>
      selectedTags.length === 0 || selectedTags.includes(entry.tag)
    )
  })).filter(day => day.entries.length > 0);

  const toggleTag = (tag: Tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="text-2xl">🛰️</div>
              <div>
                <h1 className="text-xl font-semibold">Saabai Changelog</h1>
                <p className="text-sm text-white/60">All development history for the Saabai platform</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex flex-wrap gap-2 mb-8">
          {(Object.keys(TAG_STYLES) as Tag[]).map(tag => {
            const style = TAG_STYLES[tag];
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="px-3 py-1 text-xs rounded-full border transition-all"
                style={{
                  backgroundColor: isSelected ? style.bg : "rgba(255,255,255,0.03)",
                  borderColor: isSelected ? style.border : "rgba(255,255,255,0.1)",
                  color: isSelected ? style.text : "#aaa",
                }}
              >
                {tag}
              </button>
            );
          })}
          {selectedTags.length > 0 && (
            <button onClick={() => setSelectedTags([])} className="px-3 py-1 text-xs rounded-full border border-white/20 hover:bg-white/5">
              Clear filters
            </button>
          )}
        </div>

        {filteredChangelog.length === 0 ? (
          <div className="text-center py-12 text-white/60">No entries match the selected filters.</div>
        ) : (
          filteredChangelog.map((day, index) => (
            <div key={index} className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-lg font-medium">{day.date}</div>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <div className="space-y-3">
                {day.entries.map((entry, entryIndex) => {
                  const style = TAG_STYLES[entry.tag];
                  return (
                    <div key={entryIndex} className="flex gap-4 items-start group">
                      <div className="font-mono text-xs text-white/40 pt-1 w-[42px] shrink-0 text-right">{entry.time}</div>
                      <div className="px-3 py-1 rounded-full text-xs font-medium shrink-0" style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` }}>
                        {entry.tag}
                      </div>
                      <div className="flex-1 text-[15px] text-white/90 pt-0.5 leading-snug">
                        {entry.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        <div className="mt-12 pt-8 border-t border-white/10 text-xs text-white/50">
          This page is auto-updated from commits. For detailed project state see <a href="/saabai-admin" className="underline">Mission Control</a>.
        </div>
      </div>
    </div>
  );
}
