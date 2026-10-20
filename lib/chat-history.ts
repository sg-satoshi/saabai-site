/**
 * Chat history for /saabai-admin/chat-history.
 * Pure filtering, totals and CSV. No Supabase client and no secrets.
 * The server loader lives in lib/chat-history-server.ts and uses the service role.
 */

export const HISTORY_PAGE_SIZE = 25;
export const HISTORY_EXPORT_LIMIT = 5000;
export const HISTORY_TRANSCRIPT_LIMIT = 400;
export const HISTORY_LEAD_LIMIT = 50;
const BRISBANE_OFFSET_MS = 10 * 60 * 60 * 1000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type HistoryQuery = {
  bot: string;
  site: string;
  from: string;
  to: string;
  q: string;
  page: number;
  id: string;
};

export type HistoryConversation = {
  id: string;
  bot_slug: string | null;
  site_id: string | null;
  channel: string | null;
  started_at: string;
};

export type HistoryMessage = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cost_usd?: number | string | null;
  model?: string | null;
};

export type HistoryLead = {
  id: string;
  conversation_id: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  service?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

export type HistoryDataset = {
  conversations: HistoryConversation[];
  messages: HistoryMessage[];
  leads: HistoryLead[];
};

export type HistoryConversationRow = {
  id: string;
  bot: string;
  site: string;
  channel: string;
  startedAt: string;
  messages: number;
  leads: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  preview: string;
};

export type BotStat = {
  bot: string;
  chats: number;
  messages: number;
  leads: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export type SiteCost = {
  site: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export type TranscriptMessage = {
  id: string;
  role: string;
  content: string;
  model: string;
  createdAt: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export type TranscriptLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  service: string;
  notes: string;
  createdAt: string;
};

export type HistoryTranscript = {
  id: string;
  bot: string;
  site: string;
  channel: string;
  startedAt: string;
  truncated: boolean;
  messages: TranscriptMessage[];
  leads: TranscriptLead[];
};

export type HistoryTotals = {
  chats: number;
  messages: number;
  leads: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export type HistoryView = {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  truncated: boolean;
  bots: string[];
  sites: string[];
  totals: HistoryTotals;
  byBot: BotStat[];
  bySite: SiteCost[];
  conversations: HistoryConversationRow[];
  transcript: HistoryTranscript | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : "";
}

export function isRealDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function ymd(dt: Date): string {
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${m}-${d}`;
}

export function brisbaneToday(now = new Date()): string {
  return ymd(new Date(now.getTime() + BRISBANE_OFFSET_MS));
}

export function addCalendarDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return ymd(new Date(Date.UTC(y, m - 1, d + days)));
}

export function defaultHistoryRange(now = new Date()): { from: string; to: string } {
  const to = brisbaneToday(now);
  return { from: addCalendarDays(to, -29), to };
}

/** Inclusive Brisbane calendar day, as a UTC instant. */
export function brisbaneDayStartUtc(value: string): string | null {
  if (!isRealDate(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - BRISBANE_OFFSET_MS).toISOString();
}

/** Exclusive end: 00:00 Brisbane on the next calendar day. */
export function brisbaneDayEndExclusiveUtc(value: string): string | null {
  if (!isRealDate(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1) - BRISBANE_OFFSET_MS).toISOString();
}

export function parseHistoryQuery(sp: SearchParams, now = new Date()): HistoryQuery {
  const defaults = defaultHistoryRange(now);
  let from = one(sp.from).trim();
  let to = one(sp.to).trim();
  if (!isRealDate(from)) from = defaults.from;
  if (!isRealDate(to)) to = defaults.to;
  if (from > to) [from, to] = [to, from];
  const pageRaw = Number.parseInt(one(sp.page), 10);
  return {
    bot: one(sp.bot).replace(/\u0000/g, "").trim().slice(0, 80),
    site: one(sp.site).replace(/\u0000/g, "").trim().slice(0, 160),
    from,
    to,
    q: one(sp.q).replace(/\u0000/g, "").trim().slice(0, 200),
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? Math.min(pageRaw, 100_000) : 1,
    id: one(sp.id).replace(/\u0000/g, "").trim().slice(0, 200),
  };
}

export function historyHref(
  path: string,
  query: HistoryQuery,
  extra?: { page?: number; id?: string | null; kind?: string },
): string {
  const page = extra && "page" in extra ? extra.page ?? 1 : query.page;
  const id = extra && "id" in extra ? extra.id ?? "" : query.id;
  const params = new URLSearchParams();
  if (query.bot) params.set("bot", query.bot);
  if (query.site) params.set("site", query.site);
  params.set("from", query.from);
  params.set("to", query.to);
  if (query.q) params.set("q", query.q);
  if (page > 1) params.set("page", String(page));
  if (id) params.set("id", id);
  if (extra?.kind) params.set("kind", extra.kind);
  const s = params.toString();
  return s ? `${path}?${s}` : path;
}

export function formatBrisbane(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const b = new Date(t + BRISBANE_OFFSET_MS);
  const hh = String(b.getUTCHours()).padStart(2, "0");
  const mm = String(b.getUTCMinutes()).padStart(2, "0");
  return `${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}, ${hh}:${mm}`;
}

export function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-AU");
}

export function formatUsd(value: number, digits: "auto" | "fixed" = "auto"): string {
  if (!Number.isFinite(value)) return digits === "fixed" ? "0.000000" : "0";
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  if (digits === "fixed") return rounded.toFixed(6);
  if (rounded === 0) return "0";
  if (Math.abs(rounded) >= 1) return rounded.toFixed(2);
  return rounded.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

export function previewText(content: string, limit = 140): string {
  const flat = content.replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return flat;
  return `${flat.slice(0, Math.max(0, limit - 3))}...`;
}

export function roleLabel(role: string): string {
  if (role === "user") return "Visitor";
  if (role === "assistant") return "Bot";
  return role || "Message";
}

export function siteLabel(site: string): string {
  return site.trim() ? site : "No site";
}

function money(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : 0;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 1_000_000) / 1_000_000;
}

function whole(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : 0;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is Record<string, unknown> => !!row && typeof row === "object");
}

function cmpIso(a: string, b: string): number {
  const d = Date.parse(a) - Date.parse(b);
  if (d !== 0 && Number.isFinite(d)) return d;
  return a < b ? -1 : a > b ? 1 : 0;
}

function blankTotals(): HistoryTotals {
  return { chats: 0, messages: 0, leads: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
}

export function emptyHistoryView(query: HistoryQuery, pageSize = HISTORY_PAGE_SIZE): HistoryView {
  return {
    total: 0,
    page: query.page,
    pageSize,
    pageCount: 1,
    truncated: false,
    bots: query.bot ? [query.bot] : [],
    sites: query.site ? [query.site] : [],
    totals: blankTotals(),
    byBot: [],
    bySite: [],
    conversations: [],
    transcript: null,
  };
}

function withSelected(options: string[], selected: string): string[] {
  const clean = [...new Set(options.map((v) => v.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  if (selected && !clean.includes(selected)) clean.push(selected);
  clean.sort((a, b) => a.localeCompare(b));
  return clean;
}

export function historyViewFromRpc(data: unknown, query: HistoryQuery): HistoryView {
  const raw = (typeof data === "string" ? safeJson(data) : data) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") return emptyHistoryView(query);
  const pageSize = whole(raw.pageSize) || HISTORY_PAGE_SIZE;
  const total = whole(raw.total);
  const page = whole(raw.page) || query.page || 1;
  const byBot = asRows(raw.byBot).map((row) => ({
    bot: text(row.bot),
    chats: whole(row.chats),
    messages: whole(row.messages),
    leads: whole(row.leads),
    inputTokens: whole(row.inputTokens),
    outputTokens: whole(row.outputTokens),
    costUsd: money(row.costUsd),
  })).filter((row) => row.bot);
  const bySite = asRows(raw.bySite).map((row) => ({
    site: text(row.site),
    inputTokens: whole(row.inputTokens),
    outputTokens: whole(row.outputTokens),
    costUsd: money(row.costUsd),
  }));
  const totalsRaw = raw.totals && typeof raw.totals === "object" ? raw.totals as Record<string, unknown> : null;
  const totals = totalsRaw ? {
    chats: whole(totalsRaw.chats),
    messages: whole(totalsRaw.messages),
    leads: whole(totalsRaw.leads),
    inputTokens: whole(totalsRaw.inputTokens),
    outputTokens: whole(totalsRaw.outputTokens),
    costUsd: money(totalsRaw.costUsd),
  } : byBot.reduce((sum, row) => ({
    chats: sum.chats + row.chats,
    messages: sum.messages + row.messages,
    leads: sum.leads + row.leads,
    inputTokens: sum.inputTokens + row.inputTokens,
    outputTokens: sum.outputTokens + row.outputTokens,
    costUsd: money(sum.costUsd + row.costUsd),
  }), blankTotals());
  const transcriptRaw = raw.transcript && typeof raw.transcript === "object" ? raw.transcript as Record<string, unknown> : null;
  return {
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    truncated: raw.truncated === true,
    bots: withSelected(stringList(raw.bots), query.bot),
    sites: withSelected(stringList(raw.sites), query.site),
    totals,
    byBot,
    bySite,
    conversations: asRows(raw.conversations).map((row) => ({
      id: text(row.id),
      bot: text(row.bot),
      site: text(row.site),
      channel: text(row.channel),
      startedAt: text(row.startedAt),
      messages: whole(row.messages),
      leads: whole(row.leads),
      inputTokens: whole(row.inputTokens),
      outputTokens: whole(row.outputTokens),
      costUsd: money(row.costUsd),
      preview: previewText(text(row.preview)),
    })).filter((row) => row.id),
    transcript: transcriptRaw && text(transcriptRaw.id) ? {
      id: text(transcriptRaw.id),
      bot: text(transcriptRaw.bot),
      site: text(transcriptRaw.site),
      channel: text(transcriptRaw.channel),
      startedAt: text(transcriptRaw.startedAt),
      truncated: transcriptRaw.truncated === true,
      messages: asRows(transcriptRaw.messages).map((row) => ({
        id: text(row.id),
        role: text(row.role),
        content: text(row.content),
        model: text(row.model),
        createdAt: text(row.createdAt),
        inputTokens: whole(row.inputTokens),
        outputTokens: whole(row.outputTokens),
        costUsd: money(row.costUsd),
      })),
      leads: asRows(transcriptRaw.leads).map((row) => ({
        id: text(row.id),
        name: text(row.name),
        email: text(row.email),
        phone: text(row.phone),
        status: text(row.status),
        service: text(row.service),
        notes: text(row.notes).slice(0, 400),
        createdAt: text(row.createdAt),
      })),
    } : null,
  };
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function safeJson(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}

function inRange(iso: string, fromMs: number, toMs: number): boolean {
  const t = Date.parse(iso);
  return Number.isFinite(t) && t >= fromMs && t < toMs;
}

function messageTotals(messages: HistoryMessage[]): { inputTokens: number; outputTokens: number; costUsd: number } {
  return messages.reduce((sum, message) => ({
    inputTokens: sum.inputTokens + whole(message.input_tokens),
    outputTokens: sum.outputTokens + whole(message.output_tokens),
    costUsd: money(sum.costUsd + money(message.cost_usd)),
  }), { inputTokens: 0, outputTokens: 0, costUsd: 0 });
}

function pickPreview(messages: HistoryMessage[], q: string): string {
  if (q) {
    const hit = [...messages]
      .filter((message) => message.content.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => cmpIso(a.created_at, b.created_at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0];
    return hit ? previewText(hit.content) : "";
  }
  const latest = [...messages].sort((a, b) => cmpIso(b.created_at, a.created_at) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))[0];
  return latest ? previewText(latest.content) : "";
}

function toTranscript(conversation: HistoryConversation, messages: HistoryMessage[], leads: HistoryLead[]): HistoryTranscript {
  const ordered = [...messages].sort((a, b) => cmpIso(a.created_at, b.created_at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const orderedLeads = [...leads].sort((a, b) => cmpIso(a.created_at || "", b.created_at || "") || (a.id < b.id ? -1 : 1));
  return {
    id: conversation.id,
    bot: conversation.bot_slug || "",
    site: conversation.site_id || "",
    channel: conversation.channel || "",
    startedAt: conversation.started_at,
    truncated: ordered.length > HISTORY_TRANSCRIPT_LIMIT,
    messages: ordered.slice(0, HISTORY_TRANSCRIPT_LIMIT).map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      model: message.model || "",
      createdAt: message.created_at,
      inputTokens: whole(message.input_tokens),
      outputTokens: whole(message.output_tokens),
      costUsd: money(message.cost_usd),
    })),
    leads: orderedLeads.slice(0, HISTORY_LEAD_LIMIT).map((lead) => ({
      id: lead.id,
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      status: lead.status || "",
      service: lead.service || "",
      notes: (lead.notes || "").slice(0, 400),
      createdAt: lead.created_at || "",
    })),
  };
}

/**
 * Same rules as db/migrations/006_chat_history_admin.sql.
 * Logged chats only (bot_slug set). Dates are inclusive Brisbane days on started_at.
 * Search is a case-insensitive substring of message content. % and _ are literal.
 * Leads count only when leads.conversation_id points at a matching chat.
 */
export function summariseChatHistory(
  data: HistoryDataset,
  query: HistoryQuery,
  opts?: { exportAll?: boolean },
): HistoryView {
  const fromMs = Date.parse(brisbaneDayStartUtc(query.from) || "");
  const toMs = Date.parse(brisbaneDayEndExclusiveUtc(query.to) || "");
  const q = query.q.trim();
  const logged = data.conversations.filter((conversation) => (conversation.bot_slug || "").trim());
  const bots = withSelected(logged.map((conversation) => conversation.bot_slug || ""), query.bot);
  const sites = withSelected(logged.map((conversation) => conversation.site_id || ""), query.site);
  const messagesById = new Map<string, HistoryMessage[]>();
  for (const message of data.messages) {
    const list = messagesById.get(message.conversation_id) ?? [];
    list.push(message);
    messagesById.set(message.conversation_id, list);
  }
  const leadsById = new Map<string, HistoryLead[]>();
  for (const lead of data.leads) {
    if (!lead.conversation_id) continue;
    const list = leadsById.get(lead.conversation_id) ?? [];
    list.push(lead);
    leadsById.set(lead.conversation_id, list);
  }
  const siteOf = (conversation: HistoryConversation) => (conversation.site_id || "").trim();
  const matched = logged.filter((conversation) => {
    if (query.bot && conversation.bot_slug !== query.bot) return false;
    if (query.site && siteOf(conversation) !== query.site) return false;
    if (!inRange(conversation.started_at, fromMs, toMs)) return false;
    if (!q) return true;
    return (messagesById.get(conversation.id) ?? []).some((message) => message.content.toLowerCase().includes(q.toLowerCase()));
  }).sort((a, b) => cmpIso(b.started_at, a.started_at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const byBotMap = new Map<string, BotStat>();
  const bySiteMap = new Map<string, SiteCost>();
  const totals = blankTotals();
  for (const conversation of matched) {
    const messages = messagesById.get(conversation.id) ?? [];
    const leads = leadsById.get(conversation.id) ?? [];
    const usage = messageTotals(messages);
    const bot = conversation.bot_slug || "";
    const site = siteOf(conversation);
    const stat = byBotMap.get(bot) ?? { bot, chats: 0, messages: 0, leads: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    stat.chats += 1;
    stat.messages += messages.length;
    stat.leads += leads.length;
    stat.inputTokens += usage.inputTokens;
    stat.outputTokens += usage.outputTokens;
    stat.costUsd = money(stat.costUsd + usage.costUsd);
    byBotMap.set(bot, stat);
    const siteStat = bySiteMap.get(site) ?? { site, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    siteStat.inputTokens += usage.inputTokens;
    siteStat.outputTokens += usage.outputTokens;
    siteStat.costUsd = money(siteStat.costUsd + usage.costUsd);
    bySiteMap.set(site, siteStat);
    totals.chats += 1;
    totals.messages += messages.length;
    totals.leads += leads.length;
    totals.inputTokens += usage.inputTokens;
    totals.outputTokens += usage.outputTokens;
    totals.costUsd = money(totals.costUsd + usage.costUsd);
  }

  const exportAll = opts?.exportAll === true;
  const pageSize = exportAll ? HISTORY_EXPORT_LIMIT : HISTORY_PAGE_SIZE;
  const page = exportAll ? 1 : query.page;
  const pageRows = matched.slice((page - 1) * pageSize, page * pageSize).map((conversation) => {
    const messages = messagesById.get(conversation.id) ?? [];
    const leads = leadsById.get(conversation.id) ?? [];
    const usage = messageTotals(messages);
    return {
      id: conversation.id,
      bot: conversation.bot_slug || "",
      site: siteOf(conversation),
      channel: conversation.channel || "",
      startedAt: conversation.started_at,
      messages: messages.length,
      leads: leads.length,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costUsd: usage.costUsd,
      preview: pickPreview(messages, q),
    };
  });
  const opened = !exportAll && query.id ? data.conversations.find((conversation) => conversation.id === query.id) ?? null : null;

  return {
    total: matched.length,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(matched.length / pageSize)),
    truncated: exportAll && matched.length > HISTORY_EXPORT_LIMIT,
    bots,
    sites,
    totals,
    byBot: [...byBotMap.values()].sort((a, b) => b.chats - a.chats || a.bot.localeCompare(b.bot)),
    bySite: [...bySiteMap.values()].sort((a, b) => b.costUsd - a.costUsd || a.site.localeCompare(b.site)),
    conversations: pageRows,
    transcript: opened ? toTranscript(opened, messagesById.get(opened.id) ?? [], leadsById.get(opened.id) ?? []) : null,
  };
}

function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export function costsCsv(view: HistoryView): string {
  const rows: unknown[][] = [
    ...view.byBot.map((row) => ["bot", row.bot, row.inputTokens, row.outputTokens, formatUsd(row.costUsd, "fixed")]),
    ...view.bySite.map((row) => ["site", siteLabel(row.site), row.inputTokens, row.outputTokens, formatUsd(row.costUsd, "fixed")]),
  ];
  return toCsv(["group", "name", "input_tokens", "output_tokens", "cost_usd"], rows);
}

export function chatsCsv(view: HistoryView): string {
  const rows = view.conversations.map((row) => [
    row.id,
    row.bot,
    siteLabel(row.site),
    row.channel,
    row.startedAt,
    row.messages,
    row.leads,
    row.inputTokens,
    row.outputTokens,
    formatUsd(row.costUsd, "fixed"),
    row.preview,
  ]);
  return toCsv(["id", "bot", "site", "channel", "started_at", "messages", "leads", "input_tokens", "output_tokens", "cost_usd", "preview"], rows);
}
