import {
  formatBrisbane,
  formatCount,
  formatUsd,
  historyHref,
  roleLabel,
  siteLabel,
  type HistoryQuery,
  type HistoryView,
} from "../../../lib/chat-history";

const css = `
.ch-filters{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}
.ch-filters label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--n-500);font-weight:500}
.ch-filters input,.ch-filters select{height:36px;border:1px solid var(--n-200);border-radius:8px;padding:0 10px;background:#fff;color:var(--n-900);font:400 13.5px Inter,system-ui,sans-serif;max-width:100%}
.ch-filters input[type="search"]{min-width:min(100%,220px)}
.ch-table td.ch-preview{white-space:normal;max-width:360px;color:var(--n-600)}
.ch-table td{vertical-align:top}
.ch-table tbody tr:hover td{background:#f5f8fc}
.ch-bubble{border:1px solid var(--n-200);border-radius:10px;padding:10px 12px;margin:0 0 10px;background:#fff}
.ch-bubble.bot{background:var(--n-25)}
.ch-meta{font-size:12px;color:var(--n-500);margin-bottom:4px}
.ch-body{white-space:pre-wrap;overflow-wrap:anywhere}
.ch-pages{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px}
.ch-actions{display:flex;gap:8px;flex-wrap:wrap}
`;

function money(value: number): string {
  return `$${formatUsd(value)}`;
}

export function ChatHistoryView({
  status,
  view,
  query,
}: {
  status: "ok" | "unconfigured" | "unavailable";
  view: HistoryView | null;
  query: HistoryQuery;
}) {
  const bots = view?.bots ?? (query.bot ? [query.bot] : []);
  const sites = view?.sites ?? (query.site ? [query.site] : []);
  const listPath = "/saabai-admin/chat-history";
  const exportPath = "/saabai-admin/chat-history/export";

  return (
    <div data-testid="chat-history">
      <style>{css}</style>
      <div className="ph">
        <div>
          <h1>Chat history</h1>
          <p className="sub">Chats, leads and model cost for the dates you pick. Rows are kept for 90 days.</p>
        </div>
        <div className="ch-actions">
          <a className="btn sm" data-testid="export-costs" href={historyHref(exportPath, query, { id: null, page: 1, kind: "costs" })}>Export costs</a>
          <a className="btn sm" data-testid="export-chats" href={historyHref(exportPath, query, { id: null, page: 1, kind: "chats" })}>Export chats</a>
        </div>
      </div>

      <form className="card" method="get" action={listPath} style={{ marginBottom: 16 }}>
        <div className="fbar ch-filters">
          <label>Bot
            <select name="bot" aria-label="Bot" defaultValue={query.bot}>
              <option value="">All bots</option>
              {bots.map((bot) => <option key={bot} value={bot}>{bot}</option>)}
            </select>
          </label>
          <label>Site
            <select name="site" aria-label="Site" defaultValue={query.site}>
              <option value="">All sites</option>
              {sites.map((site) => <option key={site} value={site}>{site}</option>)}
            </select>
          </label>
          <label>From
            <input type="date" name="from" aria-label="From" defaultValue={query.from} required />
          </label>
          <label>To
            <input type="date" name="to" aria-label="To" defaultValue={query.to} required />
          </label>
          <label>Search
            <input type="search" name="q" aria-label="Search message text" placeholder="Search message text" defaultValue={query.q} />
          </label>
          <button className="btn pri sm" type="submit">Apply</button>
        </div>
        <p className="sub" style={{ padding: "0 16px 12px" }}>Dates are Brisbane time.</p>
      </form>

      {status === "unconfigured" && <div className="card"><div className="bd"><p>Chat history is not connected yet.</p></div></div>}
      {status === "unavailable" && <div className="card"><div className="bd"><p>Chat history could not be loaded.</p></div></div>}

      {status === "ok" && view && (
        <>
          {query.id && !view.transcript && (
            <div className="card" style={{ marginBottom: 16 }} data-testid="history-missing">
              <div className="bd"><p>That chat was not found.</p></div>
            </div>
          )}

          {view.transcript && (
            <section className="card" style={{ marginBottom: 16 }} data-testid="history-transcript">
              <div className="hd">
                <div>
                  <h2>{view.transcript.bot || "Chat"}{view.transcript.site ? ` · ${view.transcript.site}` : ""}</h2>
                  <div className="sub">{formatBrisbane(view.transcript.startedAt)}{view.transcript.channel ? ` · ${view.transcript.channel}` : ""}</div>
                </div>
                <a className="btn sm" href={historyHref(listPath, query, { id: null })}>Close</a>
              </div>
              <div className="bd">
                {view.transcript.messages.length === 0 && <p>This chat has no messages.</p>}
                {view.transcript.messages.map((message) => (
                  <article key={message.id} className={`ch-bubble${message.role === "assistant" ? " bot" : ""}`}>
                    <div className="ch-meta">{roleLabel(message.role)} · {formatBrisbane(message.createdAt)}</div>
                    <div className="ch-body">{message.content}</div>
                    {message.role === "assistant" && (message.inputTokens > 0 || message.outputTokens > 0 || message.costUsd > 0) && (
                      <div className="ch-meta num" style={{ margin: "6px 0 0" }}>
                        {formatCount(message.inputTokens)} in, {formatCount(message.outputTokens)} out, {money(message.costUsd)}
                      </div>
                    )}
                  </article>
                ))}
                {view.transcript.truncated && <p className="muted">Showing the first 400 messages.</p>}
                <h2 style={{ margin: "16px 0 8px" }}>Leads</h2>
                {view.transcript.leads.length === 0 && <p className="muted">No lead on this chat.</p>}
                {view.transcript.leads.map((lead) => {
                  const who = [lead.name, lead.email, lead.phone].filter(Boolean).join(", ");
                  return (
                    <p key={lead.id}>
                      {who || "Lead"}{lead.status ? ` (${lead.status})` : ""}{lead.service ? `. ${lead.service}` : ""}
                    </p>
                  );
                })}
              </div>
            </section>
          )}

          <div className="kpis">
            <div className="card kpi"><div className="l">Chats</div><div className="v num" data-testid="history-chats">{formatCount(view.totals.chats)}</div></div>
            <div className="card kpi"><div className="l">Messages</div><div className="v num" data-testid="history-messages">{formatCount(view.totals.messages)}</div></div>
            <div className="card kpi"><div className="l">Leads</div><div className="v num" data-testid="history-leads">{formatCount(view.totals.leads)}</div></div>
            <div className="card kpi"><div className="l">Cost</div><div className="v num" data-testid="history-cost">{money(view.totals.costUsd)}</div></div>
          </div>

          {view.total === 0 ? (
            <div className="card"><div className="bd"><p>No chats in this range.</p></div></div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="hd"><h2>By bot</h2></div>
                <div className="tbl-scroll">
                  <table>
                    <thead>
                      <tr><th>Bot</th><th className="r">Chats</th><th className="r">Messages</th><th className="r">Leads</th></tr>
                    </thead>
                    <tbody>
                      {view.byBot.map((row) => (
                        <tr key={row.bot}>
                          <td>{row.bot}</td>
                          <td className="r num">{formatCount(row.chats)}</td>
                          <td className="r num">{formatCount(row.messages)}</td>
                          <td className="r num">{formatCount(row.leads)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="g2">
                <CostTable title="Cost by bot" rows={view.byBot.map((row) => ({ key: row.bot, label: row.bot, inputTokens: row.inputTokens, outputTokens: row.outputTokens, costUsd: row.costUsd }))} />
                <CostTable title="Cost by site" rows={view.bySite.map((row) => ({ key: row.site || "none", label: siteLabel(row.site), inputTokens: row.inputTokens, outputTokens: row.outputTokens, costUsd: row.costUsd }))} />
              </div>

              <div className="card">
                <div className="hd">
                  <h2>Chats</h2>
                  <span className="muted" data-testid="history-total">{formatCount(view.total)} chats</span>
                </div>
                {view.truncated && <p className="sub" style={{ padding: "12px 16px 0" }}>The chat export includes the latest 5,000.</p>}
                <div className="tbl-scroll">
                  <table className="ch-table">
                    <thead>
                      <tr>
                        <th>Started</th><th>Bot</th><th>Site</th>
                        <th className="r">Messages</th><th className="r">Leads</th><th className="r">Cost</th>
                        <th>Preview</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {view.conversations.map((row) => (
                        <tr key={row.id} data-testid="history-row" className={query.id === row.id ? "sel" : undefined}>
                          <td>{formatBrisbane(row.startedAt)}</td>
                          <td>{row.bot}</td>
                          <td>{siteLabel(row.site)}</td>
                          <td className="r num">{formatCount(row.messages)}</td>
                          <td className="r num">{formatCount(row.leads)}</td>
                          <td className="r num">{money(row.costUsd)}</td>
                          <td className="ch-preview">{row.preview}</td>
                          <td><a href={historyHref(listPath, query, { id: row.id })}>Open</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="ch-pages">
                  {view.page > 1 ? <a className="btn sm" href={historyHref(listPath, query, { page: view.page - 1, id: null })}>Previous</a> : <span />}
                  <span className="muted">Page {view.page} of {view.pageCount}</span>
                  {view.page < view.pageCount ? <a className="btn sm" href={historyHref(listPath, query, { page: view.page + 1, id: null })}>Next</a> : <span />}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function CostTable({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; label: string; inputTokens: number; outputTokens: number; costUsd: number }[];
}) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="hd"><h2>{title}</h2></div>
      <div className="tbl-scroll">
        <table>
          <thead>
            <tr><th>{title === "Cost by site" ? "Site" : "Bot"}</th><th className="r">Input tokens</th><th className="r">Output tokens</th><th className="r">Cost</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td className="r num">{formatCount(row.inputTokens)}</td>
                <td className="r num">{formatCount(row.outputTokens)}</td>
                <td className="r num">{money(row.costUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
