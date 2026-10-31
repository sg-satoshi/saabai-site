"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import InsightsPanel from "../../components/chatbot/InsightsPanel";
import { PageHeader } from "../ui/PageHeader";
import { chatbotHistoryPath, chatbotPagePath, historyBotIds, rowForSlug } from "../../../lib/chatbot/paths";

type Folded = { slug: string; name: string };
type Row = { slug: string; name: string; folded?: Folded[] };

const SLUG = /^[a-z0-9-]{1,60}$/i;

function decodeBot(bot: string) {
  let want = bot;
  try { want = decodeURIComponent(bot); } catch { /* keep the raw value */ }
  return want.trim();
}

export default function ChatHistoryClient({ bot }: { bot: string }) {
  const router = useRouter();
  const requested = decodeBot(bot);
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/admin/chatbots", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { rows?: Row[] }) => { if (live) { setRows(j.rows ?? []); setFailed(false); } })
      .catch(() => { if (live) setFailed(true); })
      .finally(() => { if (live) setLoaded(true); });
    return () => { live = false; };
  }, []);

  const row = requested ? rowForSlug(rows, requested) : null;
  const fromRow = row && SLUG.test(row.slug) ? row.slug.toLowerCase() : "";
  const slug = SLUG.test(requested) ? requested.toLowerCase() : fromRow;
  const aliases = slug ? historyBotIds(slug).filter((id) => id !== slug) : [];

  const listedMiss = loaded && !failed && !!requested && !row;

  return (
    <div data-testid="chat-history" className="ch-page">
      <PageHeader
        title="Chat history"
        meta={row ? `${row.name} (${row.slug}).` : "Funnel counts and transcripts for one chatbot."}
        back={{ href: row ? chatbotPagePath(row.slug) : "/saabai-admin/chatbots", label: row ? row.name : "All chatbots" }}
      />
      {loaded && !failed && rows.length > 0 && (
        <label className="ch-pick">
          Chatbot{" "}
          <select
            aria-label="Chatbot"
            data-testid="history-bot-select"
            value={rows.some((r) => r.slug === (row?.slug || requested)) ? (row?.slug || requested) : ""}
            onChange={(e) => { if (e.target.value) router.push(chatbotHistoryPath(e.target.value)); }}
          >
            <option value="">Choose a chatbot</option>
            {rows.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
          </select>
        </label>
      )}
      {!requested && (
        <div data-testid="history-empty-filter">
          <p className="ch-alias">Open a chatbot and choose Chat history, or pick one here.</p>
          {failed && <p role="alert">Could not load chatbots.</p>}
          {!loaded && <p>Loading</p>}
          <div className="ch-bots">
            {rows.map((r) => (
              <a key={r.slug} className="btn sm" href={chatbotHistoryPath(r.slug)} data-testid={`history-bot-${r.slug}`}>{r.name}</a>
            ))}
          </div>
        </div>
      )}
      {listedMiss && <p role="alert" data-testid="history-missing">No chatbot matches that address.</p>}
      {requested && !slug && !loaded && <p>Loading</p>}
      {slug && !listedMiss && (
        <>
          {aliases.length > 0 && <p className="ch-alias" data-testid="history-aliases">Also includes chats stored under {aliases.join(", ")}.</p>}
          <InsightsPanel key={slug} variant="admin" endpoint={`/api/admin/chatbots/insights?slug=${encodeURIComponent(slug)}`} />
        </>
      )}
    </div>
  );
}
