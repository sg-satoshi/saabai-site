import "./scan.css";
import { AREAS, AREA_LABEL, DISCLAIMER, RATING_LABEL } from "@/lib/site-scan/score";
import { OFFERS } from "@/lib/site-scan/copy";
import type { Fix, ScanReport } from "@/lib/site-scan/types";

const GROUPS: Fix["rating"][] = ["critical", "important", "nice"];

export default function ReportView({ report: r, showLogo = false, onFlag, flaggedIds }: { report: ScanReport; showLogo?: boolean; onFlag?: (checkId: string, label: string) => void; flaggedIds?: string[] }) {
  const flagged = new Set(flaggedIds ?? []);
  const flagBtn = (id: string, label: string) => onFlag ? (flagged.has(id) ? <span className="sx-flagged">Flagged as false positive</span> : <button type="button" className="sx-flag" onClick={() => onFlag(id, label)}>Flag as false positive</button>) : null;
  const offer = OFFERS[r.offer];
  const noSite = r.mode === "no_website";
  const blocked = r.mode === "blocked";
  const crit = r.fixes.filter((f) => f.rating === "critical").length;
  const headline = blocked ? "We could not scan this site" : noSite ? "No website detected" : r.overall !== null && r.overall >= 75 ? "Your website is in good shape" : r.overall !== null && r.overall >= 50 ? "Your website has solid bones and some gaps" : "Your website is leaving enquiries on the table";
  const sub = blocked ? r.message : noSite ? "Customers who look for you online, or ask Google and ChatGPT, find nothing. That scores zero, and it is the easiest gap to fix." : `${r.domain} scored ${r.overall} out of 100. ${crit ? `${crit} critical fix${crit > 1 ? "es" : ""}` : "No critical fixes"}${r.quickWins.length ? ` and ${r.quickWins.length} quick win${r.quickWins.length > 1 ? "s" : ""}.` : "."}`;
  return (
    <div className="sx" data-testid="scan-report">
      {showLogo && <img src="/brand/saabai-lockup-dark.png" alt="Saabai" height={28} style={{ height: 28, width: "auto", marginBottom: 16 }} />}
      <div className="sx-top">
        {r.overall !== null && (
          <div className="sx-ring" role="img" aria-label={`Overall ${r.overall} out of 100`} style={{ background: `conic-gradient(#62c5d1 0 ${r.overall}%, #211f55 ${r.overall}% 100%)` }}>
            <div><b>{r.overall}</b><span>out of 100</span></div>
          </div>
        )}
        <div>
          <span style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#62c5d1" }}>Your website report{r.domain ? ` · ${r.domain}` : ""}</span>
          <h2 style={{ marginTop: 8 }}>{headline}</h2>
          <p>{sub}</p>
        </div>
      </div>

      {r.overall !== null && (
        <div className="sx-areas">
          {AREAS.map((a) => (
            <div className="sx-area" key={a}>
              <small>{AREA_LABEL[a]}</small>
              <b>{r.areas[a] ?? "n/a"}<span style={{ fontSize: 14, color: "#8d9cc4", fontWeight: 400 }}>{r.areas[a] === null ? "" : " / 100"}</span></b>
              <div className="sx-bar"><i style={{ width: `${r.areas[a] ?? 0}%` }} /></div>
            </div>
          ))}
        </div>
      )}
      {!noSite && !blocked && <p className="sx-fine" style={{ marginTop: -8, marginBottom: 20 }}>Based on {r.checksUsed} of {r.checksTotal} checks. Anything we could not see is listed below as unable to verify and is not counted.</p>}

      {r.quickWins.length > 0 && (
        <div role="region" className="sx-box qw" aria-labelledby="sx-qw-h">
          <h3 id="sx-qw-h">Quick wins</h3>
          <p className="sub">Fast to fix and no developer needed. Start here.</p>
          {r.quickWins.map((f) => (
            <div className="sx-qw" key={f.id}>
              <div><b>{f.label}</b><span className="d">{f.fix}</span></div>
              <span className="sx-time">{f.time}</span>
            </div>
          ))}
        </div>
      )}

      {r.fixes.length > 0 && (
        <div role="region" className={`sx-box${noSite ? " sx-nosite" : ""}`} aria-labelledby="sx-fx-h">
          <h3 id="sx-fx-h">{noSite ? "What we found" : "All fixes, most important first"}</h3>
          {GROUPS.flatMap((g) => r.fixes.filter((f) => f.rating === g)).map((f) => (
            <div className="sx-fix" key={f.id}>
              <div className="sx-fh"><span className={`sx-tag ${f.rating}`}>{RATING_LABEL[f.rating]}</span><b>{f.label}</b>{f.quickWin && <span className="sx-time">Quick win</span>}</div>
              <p><em>What we found</em>{f.found}</p>
              <p><em>What it means</em>{f.meaning}</p>
              <p><em>The fix · {f.time}</em>{f.fix}</p>
              {flagBtn(f.id, f.label)}
            </div>
          ))}
        </div>
      )}

      {r.unverified.length > 0 && (
        <div role="region" className="sx-box" aria-labelledby="sx-un-h">
          <h3 id="sx-un-h">Unable to verify</h3>
          <p className="sub">We only use public information, so these were left out of your score rather than guessed.</p>
          <ul className="sx-un" style={{ margin: 0, paddingLeft: 18 }}>{r.unverified.map((u) => <li key={u.id}><b>{u.label}</b>: {u.why} {flagBtn(u.id, u.label)}</li>)}</ul>
        </div>
      )}

      {!blocked && (
        <div className="sx-rec">
          <div><h3>Recommended: {offer.name}</h3><p>{r.offerReason}</p><p>{offer.line}</p></div>
          <a className="sx-btn" href={offer.href}>See the {offer.name} →</a>
        </div>
      )}
      <p className="sx-fine">{DISCLAIMER}{r.scannedAt ? ` Scanned ${new Date(r.scannedAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Brisbane" })}.` : ""}</p>
    </div>
  );
}
