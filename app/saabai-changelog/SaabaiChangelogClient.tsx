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
    date: "7 Jun 2026",
    entries: [
      { time: "10:01", tag: "NEW", title: "Add git hygiene rules to CLAUDE.md" },
      { time: "10:01", tag: "FIX", title: "Remove public embed code, restructure demo section, fix changelog merge conflicts" }
    ],
  },
  {
    date: "6 Jun 2026",
    entries: [
      { time: "21:28", tag: "UPDATE", title: "Update changelogs" },
      { time: "21:22", tag: "UPDATE", title: "Update changelogs" },
      { time: "21:22", tag: "UPDATE", title: "Update changelogs (final)" },
      { time: "21:15", tag: "UPDATE", title: "Update changelogs" },
      { time: "21:15", tag: "UPDATE", title: "Update changelogs" },
      { time: "21:14", tag: "NEW", title: "Add locationPageSpec for 9-city local SEO pages + changelog updates" }
    ],
  },
  {
    date: "4 Jun 2026",
    entries: [
      { time: "06:39", tag: "FIX", title: "Remove mdash entity from FAQ heading in LocationPage" },
      { time: "06:34", tag: "NEW", title: "Add LocationPage template component with all 9 sections and JSON-LD schema" },
      { time: "06:34", tag: "NEW", title: "Add Service Areas section to footer with 9 city links" },
      { time: "06:31", tag: "FIX", title: "Location-data cleanup - remove em dashes, fix Hobart services, update case study framing, trim SEO descriptions, export city consts" },
      { time: "06:17", tag: "NEW", title: "Add location data — 9 Australian city configs with unique content and industryLinks" },
      { time: "00:07", tag: "NEW", title: "Add Australian location pages SEO implementation plan with topic cluster addendum" }
    ],
  },
  {
    date: "3 Jun 2026",
    entries: [
      { time: "23:24", tag: "NEW", title: "Add phone number and duration fields to Nico Moretti inquiry form" },
      { time: "23:21", tag: "NEW", title: "Add FAQ nav link (desktop + mobile) and fix footer FAQ anchor" },
      { time: "23:19", tag: "NEW", title: "Add FAQ section to Nico Moretti site — 7 questions in dark-gold accordion style" },
      { time: "23:17", tag: "NEW", title: "Register Nico Moretti in site factory listings with proper name and metadata" },
      { time: "23:15", tag: "FIX", title: "Update footer copyright year to 2026" },
      { time: "23:14", tag: "NEW", title: "Replace Stitch placeholder images with real Nico Moretti photography" },
      { time: "23:10", tag: "NEW", title: "Add Nico Moretti client site to Site Factory (/sites/nico-moretti)" },
      { time: "22:11", tag: "NEW", title: "Rex changelog — 3 Jun 2026 standalone repo extraction entries" }
    ],
  },
  {
    date: "2 Jun 2026",
    entries: [
      { time: "14:22", tag: "FIX", title: "Remove incorrect full-sheet price cap from standard acrylic CTS pricing" },
      { time: "07:31", tag: "NEW", title: "Rex EOFY sale promo awareness — June 2026" }
    ],
  },
  {
    date: "29 May 2026",
    entries: [
      { time: "06:38", tag: "FIX", title: "Strip back site generation — inject exact CSS vars, fonts, image fallbacks" },
      { time: "06:11", tag: "NEW", title: "Site Factory — Lovable-grade AI chat architecture" }
    ],
  },
  {
    date: "28 May 2026",
    entries: [
      { time: "23:11", tag: "NEW", title: "Site Factory designer persona — world-class web designer + marketer" },
      { time: "23:05", tag: "NEW", title: "Site Factory chat overhaul — markdown rendering + real AI persona" }
    ],
  },
  {
    date: "15 May 2026",
    entries: [
      { time: "01:30", tag: "NEW", title: "AI Audit pricing tie-in added to /for-accounting-firms and /for-real-estate" },
      { time: "01:25", tag: "IMPROVEMENT", title: "Em-dash cleanup across all Saabai-branded pages" },
      { time: "01:25", tag: "FIX", title: "Canonical hello@saabai.ai across user-facing copy and backend defaults" },
      { time: "00:21", tag: "FIX", title: "Advisory notification email header now matches brand navy" },
      { time: "00:17", tag: "UI", title: "Polish advisory notification email with Saabai logo and brand styling" },
      { time: "00:09", tag: "NEW", title: "Inline enquiry form on /advisory replaces mailto buttons" },
    ],
  },
  {
    date: "14 May 2026",
    entries: [
      { time: "23:58", tag: "IMPROVEMENT", title: "Sectioned nav dropdown with AI Audit NEW badge and surfaced industry pages" },
      { time: "23:47", tag: "NEW", title: "Productized AI Audit pricing page with three fixed-price tiers" },
    ],
  },
  {
    date: "12 May 2026",
    entries: [
      { time: "10:42", tag: "NEW", title: "Add explainer video section with transcript timeline and demo CTA" },
      { time: "09:28", tag: "NEW", title: "Add testimonials, security/compliance, and FAQ sections to /for-law-firms" },
    ],
  },
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
    <div className="min-h-screen bg-[#0b092e] text-white font-sans">
      {/* Top nav bar - matching Rex style */}
      <nav className="border-b border-white/10 bg-[#0b092e] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center">
            <img
              src="/brand/saabai-logo.png"
              alt="Saabai.ai"
              style={{ height: 40, width: "auto" }}
            />
          </a>
          <div className="text-xs text-white/60">All development history for the Saabai platform</div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 pt-10 pb-20">
        {/* Tag filters */}
        <div className="flex flex-wrap gap-2 mb-10">
          {(Object.keys(TAG_STYLES) as Tag[]).map(tag => {
            const style = TAG_STYLES[tag];
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="px-4 py-1.5 text-xs font-medium rounded-full border transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: isSelected ? style.bg : "rgba(255,255,255,0.04)",
                  borderColor: isSelected ? style.border : "rgba(255,255,255,0.12)",
                  color: isSelected ? style.text : "#a1a1aa",
                }}
              >
                {tag}
              </button>
            );
          })}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="px-4 py-1.5 text-xs font-medium rounded-full border border-white/20 hover:bg-white/5 text-white/60"
            >
              Clear
            </button>
          )}
        </div>

        {/* Entries */}
        {filteredChangelog.length === 0 ? (
          <div className="text-center py-16 text-white/50">No entries match the selected filters.</div>
        ) : (
          filteredChangelog.map((day, index) => (
            <div key={index} className="mb-12">
              <div className="flex items-baseline gap-4 mb-5">
                <div className="text-sm font-semibold text-white/80 tracking-[0.5px]">{day.date}</div>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <div className="space-y-4 pl-1">
                {day.entries.map((entry, entryIndex) => {
                  const style = TAG_STYLES[entry.tag];
                  return (
                    <div key={entryIndex} className="flex gap-5 items-start group">
                      <div className="font-mono text-xs text-white/40 pt-[3px] w-[38px] shrink-0 text-right tabular-nums">
                        {entry.time}
                      </div>
                      <div className="min-w-[76px]">
                        <span
                          className="inline-block px-3 py-px text-[10px] font-semibold rounded-full tracking-wide shadow-sm"
                          style={{
                            backgroundColor: style.bg,
                            color: style.text,
                            border: `1px solid ${style.border}`,
                          }}
                        >
                          {entry.tag}
                        </span>
                      </div>
                      <div className="flex-1 text-[14.5px] text-white/95 leading-tight pt-px">
                        {entry.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Footer note */}
        <div className="pt-8 mt-14 border-t border-white/10 text-xs text-white/50">
          This page is auto-updated on every commit. For detailed project state visit{" "}
          <a href="/saabai-admin" className="text-white/70 underline hover:text-white">Mission Control</a>.
        </div>
      </div>
    </div>
  );
}
