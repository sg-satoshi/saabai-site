import Link from "next/link";
import { requireAdmin } from "../../../../lib/require-admin";
import AdminShell from "../../AdminSidebar";
import { listChatbotCanonical } from "../../../../lib/chatbot/admin-list";
import { chatbotPagePath, historyBotIds } from "../../../../lib/chatbot/paths";
import { listChatHistory } from "../../../../lib/chat-log";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Chat history" };

const css = `
.ch{max-width:900px}
.ch h1{margin:8px 0 4px}
.ch-back{font-size:13px;color:var(--n-700)}
.ch p{font-size:13.5px;color:var(--n-800);line-height:1.45}
.ch-muted{color:var(--n-500);font-size:12.5px}
.ch-turn{background:#fff;border:1px solid #e6e6ef;border-radius:10px;padding:12px 14px;margin:0 0 8px}
.ch-meta{font-size:12px;color:var(--n-500);margin:0 0 6px}
.ch-role{font-weight:600;color:var(--n-900)}
.ch-body{margin:0;white-space:pre-wrap;word-break:break-word;font-size:13.5px;color:var(--n-900)}
`;

function brisbane(iso: string) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso || "";
  return new Date(t + 10 * 3600_000).toISOString().slice(0, 16).replace("T", " ") + " Brisbane";
}

function roleLabel(role: string) {
  const r = role.toLowerCase();
  if (r === "user" || r === "visitor") return "Visitor";
  if (r === "assistant" || r === "bot") return "Bot";
  if (r === "system") return "System";
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Message";
}

function clip(text: string) {
  return text.length > 4000 ? `${text.slice(0, 4000)}...` : text;
}

export default async function ChatHistoryPage({ searchParams }: { searchParams: Promise<{ bot?: string }> }) {
  await requireAdmin("/saabai-admin/chatbots/history");
  const { bot } = await searchParams;
  const raw = (bot ?? "").trim();
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { /* keep the raw value */ }
  decoded = decoded.trim();

  let canonical = decoded;
  let name = decoded;
  let found = false;
  let ids = decoded ? historyBotIds(decoded) : [];
  if (decoded) {
    const groups = await listChatbotCanonical().catch(() => []);
    const group = groups.find((g) => g.site.slug === decoded || g.slugs.includes(decoded) || g.folded.some((f) => f.slug === decoded));
    if (group) {
      found = true;
      canonical = group.site.slug;
      name = group.site.name;
      ids = historyBotIds(canonical, group.slugs);
    }
  }
  const history = decoded ? await listChatHistory(ids) : null;
  const extras = ids.filter((id) => id !== canonical);
  const copy = found && canonical !== decoded;

  return (
    <AdminShell activePath="/saabai-admin/chatbots">
      <div className="ch">
        <style>{css}</style>
        <Link href="/saabai-admin/chatbots" className="ch-back">All chatbots</Link>
        <h1>Chat history</h1>
        {!decoded && <p data-testid="history-empty-filter">Open a chatbot and choose Chat history, or add ?bot= and the site slug to this address.</p>}
        {decoded && (
          <>
            <p data-testid="history-for">
              Showing chats for {found ? <Link href={chatbotPagePath(canonical)}>{name}</Link> : name}.
            </p>
            {copy && <p>This address is a copy of {name}. Chats from every copy are included.</p>}
            {extras.length > 0 && <p className="ch-muted">Also includes chats logged as {extras.join(", ")}.</p>}
            {history && !history.configured && <p data-testid="history-unconfigured">Chat history is not connected on this server yet.</p>}
            {history?.error && <p role="alert" data-testid="history-error">Could not load chat history.</p>}
            {history?.configured && !history.error && history.turns.length === 0 && <p data-testid="history-none">No chats logged for this bot yet.</p>}
            {history?.turns.map((turn) => (
              <article key={turn.id} className="ch-turn" data-testid="history-turn">
                <p className="ch-meta"><span className="ch-role">{roleLabel(turn.role)}</span> at {brisbane(turn.createdAt)}{turn.bot && turn.bot !== canonical ? `, logged as ${turn.bot}` : ""}</p>
                <p className="ch-body">{clip(turn.content)}</p>
              </article>
            ))}
          </>
        )}
      </div>
    </AdminShell>
  );
}
