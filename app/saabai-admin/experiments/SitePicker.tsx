"use client";
import { useMemo, useState } from "react";
import { Badge } from "../ui/Badge";

export type ExpSite = { key: string; label: string; url?: string; enabled: boolean; kind: "saabai" | "client" };

const SITE_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;
export const SAABAI = "saabai";

/** The site in the address bar (?site=), else saabai.ai. */
export function readSite(): string {
  if (typeof window === "undefined") return SAABAI;
  const s = new URLSearchParams(window.location.search).get("site") ?? "";
  return SITE_RE.test(s) ? s : SAABAI;
}

/** "site=<key>" query part, empty for saabai.ai so its links stay as they were. */
export const siteParam = (site: string, lead: "?" | "&" = "?") => (site === SAABAI ? "" : `${lead}site=${encodeURIComponent(site)}`);

const host = (u?: string) => { try { return u ? new URL(u).hostname.replace(/^www\./, "") : ""; } catch { return ""; } };

/** Searchable list of every site split testing can manage: saabai.ai plus every Site Factory site. */
export function SitePicker({ sites, site, onPick }: { sites: ExpSite[]; site: string; onPick: (key: string) => void }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? sites.filter((s) => `${s.label} ${s.key} ${host(s.url)}`.toLowerCase().includes(t)) : sites;
  }, [q, sites]);
  return (
    <div className="xp-sites">
      <label className="xp-sites-q">
        <span>Site</span>
        <input className="xp-in" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${sites.length} sites`} aria-label="Search sites" />
      </label>
      <div className="xp-sites-list" role="listbox" aria-label="Sites">
        {shown.map((s) => (
          <button key={s.key} type="button" role="option" aria-selected={s.key === site} className={`xp-site${s.key === site ? " on" : ""}`} onClick={() => onPick(s.key)}>
            <span className="t">{s.label}</span>
            <span className="s">{host(s.url) || s.key}</span>
            <Badge tone={s.enabled ? "ok" : "neutral"}>{s.enabled ? "On" : "Off"}</Badge>
          </button>
        ))}
        {!shown.length && <p className="xp-note" style={{ padding: "8px 10px" }}>No site matches “{q}”.</p>}
      </div>
    </div>
  );
}
