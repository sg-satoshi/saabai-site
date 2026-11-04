/**
 * Admin and cron operations for the SUNDER email module.
 * Routes stay thin. Nothing here talks to SES unless sendSes is called,
 * and tests pass a mock sender into drainOutbox instead of calling these.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRedis } from "../redis";
import { SUNDER_IDENTITY, SUNDER_SLUG, type SenderIdentity } from "./constants";
import { documentHtml, parseBlocks, textToBlocks, type Block } from "./blocks";
import {
  contentHash, copyProblem, DEFAULT_DAILY_CAP, rateDecision, sendBlocked, splitByDailyCap,
} from "./gates";
import {
  countStatus, countSuppressions, emailDb, identityFrom, isMissingSchema, listConfirmed, loadTenant, suppressedEmails, type TenantRow,
} from "./db";
import { buildSunderHtml, confirmMessage, renderMarketingEmail, withReferralLine } from "./message";
import { maskEmail, referralLineText, referralStatsFor } from "../sunder-waitlist";
import { brisbaneAt, brisbaneParts, isQuiet, seriesRunAt } from "./quiet";
import { acquireSendSlot, type RateCounter } from "./rate";
import {
  cleanFromName, confirmationKey, fromDomainAllowed, mailableContacts, oneAddress, publicSesError,
  shouldQueueConfirmation, validateSeriesSteps, type SeriesStepInput,
} from "./rules";
import { sendSes, sesConfigured, type SesMessage } from "./ses";
import type { CampaignView, EmailAdminSnapshot, SeriesStepView } from "./types";
import { readEmailToken } from "./tokens";
import { drainOutbox, tokenEmail, type Outbox, type OutboxRow } from "./worker";

const MIGRATION = "Apply db/migrations/009_email_marketing.sql in the Supabase SQL editor, then refresh.";

function secret(): string {
  // Prefer a dedicated secret so an unsubscribe token cannot be reused as a session.
  // Falls back to the session secret when EMAIL_TOKEN_SECRET is not set.
  return process.env.EMAIL_TOKEN_SECRET || process.env.SAABAI_SESSION_SECRET || "";
}

function rateCounter(): RateCounter | null {
  const redis = getRedis();
  if (!redis) return null;
  return {
    incr: async (key) => Number(await redis.incr(key)),
    decr: async (key) => Number(await redis.decr(key)),
    expire: (key, seconds) => redis.expire(key, seconds),
  };
}

export async function sendingPaused(db: SupabaseClient, tenant: TenantRow | null): Promise<boolean> {
  const { data, error } = await db.from("email_settings").select("paused").eq("id", "global").maybeSingle();
  if (error) {
    if (isMissingSchema(error)) return true;
    throw new Error(error.message);
  }
  if (data?.paused || tenant?.status === "paused") return true;
  const redis = getRedis();
  if (!redis) return false;
  try {
    const v = await redis.get("email:paused");
    return v === "1" || v === 1 || v === true;
  } catch {
    return true;
  }
}

async function writePaused(db: SupabaseClient, tenantId: string, paused: boolean, reason = ""): Promise<void> {
  const { error } = await db.from("email_settings").upsert({ id: "global", paused, pause_reason: paused ? reason.slice(0, 300) : null }, { onConflict: "id" });
  if (error) throw new Error(error.message);
  const { error: tenantError } = await db.from("email_tenants").update({ status: paused ? "paused" : "ready" }).eq("id", tenantId);
  if (tenantError) throw new Error(tenantError.message);
  const redis = getRedis();
  if (redis) await redis.set("email:paused", paused ? "1" : "0");
}

export async function adminSnapshot(): Promise<EmailAdminSnapshot | { ok: false; migration: true; error: string }> {
  let db: SupabaseClient;
  try { db = emailDb(); } catch { return { ok: false, migration: true, error: "Supabase is not configured on this environment." }; }
  const tenant = await loadTenant(db);
  if (!tenant) return { ok: false, migration: true, error: MIGRATION };
  const [subscribed, pending, unsubscribed, suppressed, paused] = await Promise.all([
    countStatus(db, tenant.id, "subscribed"),
    countStatus(db, tenant.id, "pending"),
    countStatus(db, tenant.id, "unsubscribed"),
    countSuppressions(db, tenant.id),
    sendingPaused(db, tenant),
  ]);
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [series, campaigns, sent30q, unsub30q] = await Promise.all([
    loadSeries(db, tenant.id),
    loadCampaigns(db),
    db.from("email_sends").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("kind", "marketing").eq("status", "sent").gte("sent_at", since30),
    db.from("email_suppressions").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).ilike("reason", "%unsub%").gte("created_at", since30),
  ]);
  return {
    ok: true,
    paused,
    fromName: tenant.from_name,
    fromEmail: tenant.from_email,
    configSet: tenant.config_set,
    sesTenantName: tenant.ses_tenant_name,
    counts: { subscribed, pending, unsubscribed, suppressed },
    sent30: sent30q.count ?? 0,
    unsub30: unsub30q.count ?? 0,
    series,
    campaigns,
  };
}

async function enrolmentCount(db: SupabaseClient, seriesId: string, status: string): Promise<number> {
  const { count, error } = await db.from("email_series_enrolments").select("id", { count: "exact", head: true }).eq("series_id", seriesId).eq("status", status);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function loadSeries(db: SupabaseClient, tenantId: string): Promise<EmailAdminSnapshot["series"]> {
  const { data: series, error } = await db.from("email_series").select("id,status").eq("tenant_id", tenantId).eq("slug", "welcome").maybeSingle();
  if (error) throw new Error(error.message);
  if (!series) return { status: "paused", steps: [], enrolled: 0, active: 0, completed: 0, exited: 0 };
  const { data: steps, error: stepError } = await db.from("email_series_steps").select("position,delay_minutes,template_id").eq("series_id", series.id).order("position");
  if (stepError) throw new Error(stepError.message);
  const ids = (steps || []).map((s) => (s as { template_id: string }).template_id);
  const { data: templates, error: templateError } = ids.length
    ? await db.from("email_templates").select("id,subject,body_text").in("id", ids)
    : { data: [], error: null };
  if (templateError) throw new Error(templateError.message);
  const byId = new Map((templates || []).map((t) => [(t as { id: string }).id, t as { subject: string; body_text: string }]));
  const [active, completed, exited] = await Promise.all([
    enrolmentCount(db, series.id, "active"),
    enrolmentCount(db, series.id, "completed"),
    enrolmentCount(db, series.id, "exited"),
  ]);
  return {
    status: series.status === "paused" ? "paused" : "active",
    enrolled: active + completed + exited,
    active,
    completed,
    exited,
    steps: (steps || []).map((s) => {
      const row = s as { position: number; delay_minutes: number; template_id: string };
      const template = byId.get(row.template_id);
      return {
        position: row.position,
        delayDays: Math.round(row.delay_minutes / (24 * 60)),
        subject: template?.subject || "",
        body: template?.body_text || "",
      };
    }),
  };
}

async function loadCampaigns(db: SupabaseClient): Promise<CampaignView[]> {
  const { data, error } = await db.rpc("email_recent_campaigns", { p_tenant: SUNDER_SLUG });
  if (error) throw new Error(error.message);
  return ((data || []) as { id: string; name: string; status: string; created_at: string; scheduled_at: string | null; queued: number; sent: number; failed: number; skipped: number; pending: number; unsubscribed: number }[]).map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    createdAt: c.created_at,
    scheduledAt: c.scheduled_at,
    queued: c.queued,
    sent: c.sent,
    failed: c.failed,
    skipped: c.skipped,
    pending: c.pending,
    unsubscribed: c.unsubscribed || 0,
  }));
}

export async function setSendingPaused(paused: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = emailDb();
  const tenant = await loadTenant(db);
  if (!tenant) return { ok: false, error: MIGRATION };
  await writePaused(db, tenant.id, paused, paused ? "Paused by an admin." : "");
  return { ok: true };
}

export async function saveFromName(name: string): Promise<{ ok: true; fromName: string } | { ok: false; error: string }> {
  const db = emailDb();
  const tenant = await loadTenant(db);
  if (!tenant) return { ok: false, error: MIGRATION };
  const fromName = cleanFromName(name);
  const { error } = await db.from("email_tenants").update({ from_name: fromName }).eq("id", tenant.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, fromName };
}

export async function saveSeries(steps: SeriesStepInput[], status: "active" | "paused"): Promise<{ ok: true } | { ok: false; error: string }> {
  const problem = validateSeriesSteps(steps);
  if (problem) return { ok: false, error: problem };
  const db = emailDb();
  const tenant = await loadTenant(db);
  if (!tenant) return { ok: false, error: MIGRATION };
  const { data: series, error } = await db.from("email_series").select("id").eq("tenant_id", tenant.id).eq("slug", "welcome").maybeSingle();
  if (error || !series) return { ok: false, error: error?.message || "Welcome series is missing. Apply migration 009." };
  const { data: existing, error: stepError } = await db.from("email_series_steps").select("position,template_id").eq("series_id", series.id);
  if (stepError) return { ok: false, error: stepError.message };
  const byPosition = new Map((existing || []).map((s) => [(s as { position: number }).position, (s as { template_id: string }).template_id]));
  for (const step of steps) {
    const templateId = byPosition.get(step.position);
    if (!templateId) return { ok: false, error: `Step ${step.position + 1} is not in the series.` };
    const body = step.body.replace(/\r\n/g, "\n");
    const { error: templateError } = await db.from("email_templates").update({
      subject: step.subject.trim(),
      body_text: body,
      html: buildSunderHtml(body),
      updated_at: new Date().toISOString(),
    }).eq("id", templateId);
    if (templateError) return { ok: false, error: templateError.message };
    const { error: delayError } = await db.from("email_series_steps").update({ delay_minutes: step.delayDays * 24 * 60 }).eq("series_id", series.id).eq("position", step.position);
    if (delayError) return { ok: false, error: delayError.message };
  }
  const { error: statusError } = await db.from("email_series").update({ status }).eq("id", series.id);
  if (statusError) return { ok: false, error: statusError.message };
  return { ok: true };
}

async function requireReady(): Promise<{ db: SupabaseClient; tenant: TenantRow; identity: SenderIdentity } | { error: string }> {
  let db: SupabaseClient;
  try { db = emailDb(); } catch { return { error: "Supabase is not configured." }; }
  const tenant = await loadTenant(db);
  if (!tenant) return { error: MIGRATION };
  if (!fromDomainAllowed(tenant.from_email)) return { error: "The from address is not one the send key is allowed to use." };
  if (!secret()) return { error: "SAABAI_SESSION_SECRET is not set, so unsubscribe links cannot be signed." };
  return { db, tenant, identity: identityFrom(tenant) };
}

type CampaignRow = {
  id: string;
  name: string;
  subject: string;
  preheader: string | null;
  blocks: unknown;
  from_name: string | null;
  status: string;
  content_hash: string | null;
  test_hash: string | null;
  test_sent_at: string | null;
  scheduled_at: string | null;
  send_confirmed: boolean | null;
  typed_confirm?: boolean | null;
};

function campaignContent(row: CampaignRow): { subject: string; preheader: string; blocks: Block[] } | { error: string } {
  const blocks = parseBlocks(row.blocks) || textToBlocks("");
  const content = { subject: row.subject || "", preheader: row.preheader || "", blocks };
  const problem = copyProblem(content);
  if (problem) return { error: problem };
  return content;
}

export async function sendTest(input: { campaignId: string; to: string }): Promise<{ ok: true; subject: string; messageId: string; testedAt: string } | { ok: false; error: string }> {
  const to = oneAddress(input.to);
  if (!to) return { ok: false, error: "Enter one email address." };
  const ready = await requireReady();
  if ("error" in ready) return { ok: false, error: ready.error };
  if (await sendingPaused(ready.db, ready.tenant)) return { ok: false, error: "Sending is paused." };
  if (!sesConfigured()) return { ok: false, error: "Sending is not configured on this environment." };
  const blocked = await suppressedEmails(ready.db, ready.tenant.id, [to]);
  if (blocked.has(to)) return { ok: false, error: "That address is on the suppression list." };
  const loaded = await ready.db.from("email_campaigns").select("id,name,subject,preheader,blocks,from_name,status,content_hash,test_hash,test_sent_at,scheduled_at,send_confirmed").eq("id", input.campaignId).eq("tenant_id", ready.tenant.id).maybeSingle();
  if (loaded.error || !loaded.data) return { ok: false, error: loaded.error?.message || "Campaign not found." };
  const row = loaded.data as CampaignRow;
  const content = campaignContent(row);
  if ("error" in content) return { ok: false, error: content.error };
  const fromName = cleanFromName(row.from_name || ready.tenant.from_name);
  const html = documentHtml({ preheader: content.preheader, blocks: content.blocks });
  const hash = contentHash({ ...content, fromName });
  const sent = await deliverOne(ready.db, ready.tenant.id, {
    id: "test",
    toEmail: to,
    kind: "test",
    subject: content.subject,
    html,
    fromName,
    respectQuiet: false,
    contactStatus: "subscribed",
    confirmedAt: new Date().toISOString(),
    firstName: "Sam",
    campaignId: row.id,
    identity: { ...ready.identity, fromName },
  });
  if (!sent.ok) return sent;
  const testedAt = new Date().toISOString();
  await ready.db.from("email_campaigns").update({ test_hash: hash, content_hash: hash, test_sent_at: testedAt }).eq("id", row.id);
  return { ok: true, subject: sent.subject, messageId: sent.messageId, testedAt };
}

async function deliverOne(db: SupabaseClient, tenantId: string, row: OutboxRow): Promise<{ ok: true; subject: string; messageId: string } | { ok: false; error: string }> {
  const idempotency = `test:${row.campaignId}:${row.toEmail}:${Date.now()}`;
  const { data: inserted, error } = await db.from("email_sends").insert({
    tenant_id: tenantId,
    campaign_id: row.campaignId,
    to_email: row.toEmail,
    kind: "test",
    idempotency_key: idempotency,
    status: "sending",
    subject: row.subject,
    html: row.html,
    from_name: row.fromName,
    respect_quiet: false,
    claimed_at: new Date().toISOString(),
  }).select("id").single();
  if (error || !inserted) return { ok: false, error: error?.message || "Could not record the test." };
  const id = (inserted as { id: string }).id;
  let messageId = "";
  let subject = row.subject;
  let once = true;
  const outbox: Outbox = {
    claim: async () => {
      if (!once) return [];
      once = false;
      return [{ ...row, id }];
    },
    markSent: async (sendId, mid) => {
      messageId = mid;
      await db.from("email_sends").update({ status: "sent", ses_message_id: mid, sent_at: new Date().toISOString() }).eq("id", sendId);
    },
    markFailed: async (sendId, err) => { await db.from("email_sends").update({ status: "failed", error: err }).eq("id", sendId); },
    markSkipped: async (sendId, reason) => { await db.from("email_sends").update({ status: "skipped", error: reason }).eq("id", sendId); },
    release: async (sendId) => { await db.from("email_sends").update({ status: "pending", claimed_at: null }).eq("id", sendId); },
    suppressed: async () => new Set(),
  };
  const result = await drainOutbox({
    outbox,
    send: async (msg: SesMessage) => {
      subject = msg.subject;
      return sendSes(msg);
    },
    acquire: async () => ({ ok: true, waitMs: 0 }),
    paused: false,
    quiet: false,
    secret: secret(),
    limit: 1,
    deadlineMs: 20_000,
  });
  if (result.sent === 1 && messageId) return { ok: true, subject, messageId };
  return { ok: false, error: result.failed ? "The sending provider rejected the test. The send row is marked failed." : "The test did not send." };
}

async function audienceNow(db: SupabaseClient, tenantId: string) {
  const { error: syncError } = await db.rpc("email_sync_sunder");
  if (syncError) throw new Error(syncError.message);
  const contacts = await listConfirmed(db, tenantId);
  const blocked = await suppressedEmails(db, tenantId, contacts.map((c) => c.email));
  const gate = mailableContacts(contacts.map((c) => ({ ...c, confirmedAt: c.confirmed_at })), blocked);
  const pending = await countStatus(db, tenantId, "pending");
  const unsubscribed = await countStatus(db, tenantId, "unsubscribed");
  return { gate, pending, unsubscribed, suppressed: gate.suppressed };
}

async function usedToday(db: SupabaseClient, tenantId: string, now = new Date()): Promise<number> {
  const p = brisbaneParts(now);
  const start = brisbaneAt(p.year, p.month, p.day, 0).toISOString();
  const sent = await db.from("email_sends").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("kind", "marketing").eq("status", "sent").gte("sent_at", start);
  const queued = await db.from("email_sends").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("kind", "marketing").in("status", ["pending", "sending"]).is("not_before", null);
  if (sent.error) throw new Error(sent.error.message);
  if (queued.error) throw new Error(queued.error.message);
  return (sent.count ?? 0) + (queued.count ?? 0);
}

const ALREADY = "This campaign is already sending or has been sent.";

export async function queueBroadcast(input: { campaignId: string; confirm?: string }): Promise<{ ok: true; queued: number; today: number; later: number; suppressed: number; campaignId: string } | { ok: false; error: string }> {
  const ready = await requireReady();
  if ("error" in ready) return { ok: false, error: ready.error };
  const paused = await sendingPaused(ready.db, ready.tenant);
  const loaded = await ready.db.from("email_campaigns").select("id,name,subject,preheader,blocks,from_name,status,content_hash,test_hash,test_sent_at,scheduled_at,send_confirmed,typed_confirm").eq("id", input.campaignId).eq("tenant_id", ready.tenant.id).maybeSingle();
  if (loaded.error || !loaded.data) return { ok: false, error: loaded.error?.message || "Campaign not found." };
  const row = loaded.data as CampaignRow;
  if (row.status !== "draft" && row.status !== "scheduled") return { ok: false, error: ALREADY };
  const content = campaignContent(row);
  if ("error" in content) return { ok: false, error: content.error };
  let audience;
  try { audience = await audienceNow(ready.db, ready.tenant.id); }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Could not read the list." }; }
  const fromName = cleanFromName(row.from_name || ready.tenant.from_name);
  const hash = contentHash({ ...content, fromName });
  const blocked = sendBlocked({ paused, audience: audience.gate.recipients.length, testHash: row.test_hash, contentHash: hash, confirm: input.confirm });
  if (blocked) return { ok: false, error: blocked };
  // One winner. A second click finds the row already sending and inserts nothing.
  const claim = await ready.db.from("email_campaigns").update({
    status: "sending",
    content_hash: hash,
    send_confirmed: true,
    typed_confirm: input.confirm === "SEND",
  }).eq("id", row.id).in("status", ["draft", "scheduled"]).select("id");
  if (claim.error) return { ok: false, error: claim.error.message };
  if (!claim.data?.length) return { ok: false, error: ALREADY };
  const cap = ready.tenant.daily_cap ?? DEFAULT_DAILY_CAP;
  let used = 0;
  try { used = await usedToday(ready.db, ready.tenant.id); }
  catch (e) {
    await ready.db.from("email_campaigns").update({ status: "draft" }).eq("id", row.id).eq("status", "sending");
    return { ok: false, error: e instanceof Error ? e.message : "Could not read today's cap." };
  }
  const split = splitByDailyCap(audience.gate.recipients.length, used, cap);
  const laterAt = (() => { const p = brisbaneParts(new Date()); return brisbaneAt(p.year, p.month, p.day + 1, 7).toISOString(); })();
  const html = documentHtml({ preheader: content.preheader, blocks: content.blocks });
  const rows = audience.gate.recipients.map((c, i) => ({
    tenant_id: ready.tenant.id,
    campaign_id: row.id,
    contact_id: c.id,
    to_email: c.email,
    kind: "marketing" as const,
    idempotency_key: `broadcast:${row.id}:${c.id}`,
    status: "pending",
    subject: content.subject,
    html,
    from_name: fromName,
    respect_quiet: false,
    not_before: i < split.today ? null : laterAt,
  }));
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await ready.db.from("email_sends").upsert(rows.slice(i, i + 200), { onConflict: "idempotency_key", ignoreDuplicates: true });
    if (error && error.code !== "23505") {
      await ready.db.from("email_campaigns").update({ status: "draft" }).eq("id", row.id).eq("status", "sending");
      return { ok: false, error: error.message };
    }
  }
  await ready.db.from("email_campaigns").update({
    counts: { queued: rows.length, today: split.today, later: split.later, suppressed: audience.suppressed },
  }).eq("id", row.id);
  return { ok: true, queued: rows.length, today: split.today, later: split.later, suppressed: audience.suppressed, campaignId: row.id };
}

type DueRow = {
  enrolment_id: string;
  next_step: number;
  enrolled_at: string;
  contact_id: string;
  contact_email: string;
  first_name: string | null;
  contact_status: string;
  confirmed_at: string | null;
  tenant_id: string;
  from_name: string;
  subject: string;
  body_text: string;
  html: string;
  delay_minutes: number;
  next_delay_minutes: number | null;
};

/** SUNDER referral line for one subscriber, or null. Never blocks a send. */
async function referralLineFor(db: SupabaseClient, email: string): Promise<string | null> {
  try {
    const r = (await referralStatsFor(db, [email])).get(email);
    return r ? referralLineText(r) : null;
  } catch {
    return null;
  }
}

export async function enqueueDueSeries(db: SupabaseClient): Promise<number> {
  const { data, error } = await db.rpc("email_due_enrolments", { p_limit: 40 });
  if (error) throw new Error(error.message);
  let n = 0;
  for (const raw of (data || []) as DueRow[]) {
    const email = raw.contact_email;
    if (raw.contact_status !== "subscribed" || !raw.confirmed_at) {
      await db.from("email_series_enrolments").update({ status: "exited" }).eq("id", raw.enrolment_id).eq("status", "active");
      continue;
    }
    const blocked = await suppressedEmails(db, raw.tenant_id, [email]);
    if (blocked.has(email)) {
      await db.from("email_series_enrolments").update({ status: "exited" }).eq("id", raw.enrolment_id).eq("status", "active");
      continue;
    }
    const campaignId = await seriesCampaign(db, raw);
    const html = withReferralLine(raw.body_text ? documentHtml({ preheader: "", blocks: textToBlocks(raw.body_text) }) : raw.html, await referralLineFor(db, email));
    const { error: insertError } = await db.from("email_sends").insert({
      tenant_id: raw.tenant_id,
      campaign_id: campaignId,
      contact_id: raw.contact_id,
      to_email: email,
      kind: "marketing",
      idempotency_key: `series:${raw.enrolment_id}:${raw.next_step}`,
      status: "pending",
      subject: raw.subject,
      html,
      from_name: raw.from_name,
      respect_quiet: true,
    });
    if (insertError && insertError.code !== "23505") throw new Error(insertError.message);
    const now = new Date();
    if (raw.next_delay_minutes === null || raw.next_delay_minutes === undefined) {
      await db.from("email_series_enrolments").update({ status: "completed", next_run_at: null }).eq("id", raw.enrolment_id).eq("next_step", raw.next_step).eq("status", "active");
    } else {
      const runAt = seriesRunAt(new Date(raw.enrolled_at), raw.next_delay_minutes, now);
      await db.from("email_series_enrolments").update({
        next_step: raw.next_step + 1,
        next_run_at: runAt.toISOString(),
      }).eq("id", raw.enrolment_id).eq("next_step", raw.next_step).eq("status", "active");
    }
    n++;
  }
  return n;
}

async function seriesCampaign(db: SupabaseClient, row: DueRow): Promise<string> {
  const requestKey = `series:${SUNDER_SLUG}:welcome:${row.next_step}`;
  const existing = await db.from("email_campaigns").select("id").eq("request_key", requestKey).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return (existing.data as { id: string }).id;
  const created = await db.from("email_campaigns").insert({
    tenant_id: row.tenant_id,
    kind: "series_step",
    name: row.subject.slice(0, 120),
    subject: row.subject,
    status: "sending",
    request_key: requestKey,
  }).select("id").single();
  if (created.error?.code === "23505") {
    const again = await db.from("email_campaigns").select("id").eq("request_key", requestKey).maybeSingle();
    if (again.data) return (again.data as { id: string }).id;
  }
  if (created.error || !created.data) throw new Error(created.error?.message || "Could not record the series step.");
  return (created.data as { id: string }).id;
}

function mapClaimed(row: Record<string, unknown>, contact: { status: string; confirmed_at: string | null; first_name: string | null } | undefined, identity: SenderIdentity): OutboxRow {
  return {
    id: String(row.id),
    toEmail: String(row.to_email),
    kind: row.kind as OutboxRow["kind"],
    subject: String(row.subject),
    html: String(row.html),
    fromName: String(row.from_name),
    respectQuiet: !!row.respect_quiet,
    contactStatus: contact?.status || "missing",
    confirmedAt: contact?.confirmed_at || null,
    firstName: contact?.first_name || null,
    campaignId: row.campaign_id ? String(row.campaign_id) : null,
    identity: { ...identity, fromName: String(row.from_name || identity.fromName) },
  };
}

export function liveOutbox(db: SupabaseClient, tenant: TenantRow): Outbox {
  const identity = identityFrom(tenant);
  return {
    async claim(limit, skipQuiet) {
      const { data, error } = await db.rpc("email_claim_sends", { p_limit: limit, p_quiet: skipQuiet });
      if (error) throw new Error(error.message);
      const rows = (data || []) as Record<string, unknown>[];
      for (const other of rows.filter((r) => String(r.tenant_id) !== tenant.id)) {
        await db.from("email_sends").update({ status: "pending", claimed_at: null }).eq("id", String(other.id)).is("ses_message_id", null);
      }
      const mine = rows.filter((r) => String(r.tenant_id) === tenant.id);
      const contactIds = [...new Set(mine.map((r) => r.contact_id).filter(Boolean).map(String))];
      const contacts = new Map<string, { status: string; confirmed_at: string | null; first_name: string | null }>();
      if (contactIds.length) {
        const { data: found, error: contactError } = await db.from("email_contacts").select("id,status,confirmed_at,first_name").in("id", contactIds);
        if (contactError) throw new Error(contactError.message);
        for (const c of found || []) {
          const row = c as { id: string; status: string; confirmed_at: string | null; first_name: string | null };
          contacts.set(row.id, row);
        }
      }
      return mine.map((r) => mapClaimed(r, contacts.get(String(r.contact_id || "")), identity));
    },
    async markSent(id, messageId) {
      const { error } = await db.from("email_sends").update({ status: "sent", ses_message_id: messageId, sent_at: new Date().toISOString(), error: null }).eq("id", id).eq("status", "sending");
      if (error) throw new Error(error.message);
    },
    async markFailed(id, err) {
      const { error } = await db.from("email_sends").update({ status: "failed", error: err.slice(0, 300) }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    async markSkipped(id, reason) {
      const { error } = await db.from("email_sends").update({ status: "skipped", error: reason }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    async release(id) {
      const { error } = await db.from("email_sends").update({ status: "pending", claimed_at: null }).eq("id", id).eq("status", "sending").is("ses_message_id", null);
      if (error) throw new Error(error.message);
    },
    suppressed(emails) { return suppressedEmails(db, tenant.id, emails); },
  };
}

export async function campaignDetail(id: string) {
  const ready = await requireReady();
  if ("error" in ready) return { ok: false as const, error: ready.error };
  const loaded = await ready.db.from("email_campaigns").select("id,name,subject,preheader,blocks,from_name,status,content_hash,test_hash,test_sent_at,scheduled_at,send_confirmed").eq("id", id).eq("tenant_id", ready.tenant.id).maybeSingle();
  if (loaded.error || !loaded.data) return { ok: false as const, error: loaded.error?.message || "Campaign not found." };
  const row = loaded.data as CampaignRow;
  const blocks = parseBlocks(row.blocks) || [];
  let audience;
  try { audience = await audienceNow(ready.db, ready.tenant.id); }
  catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : "Could not read the list." }; }
  const used = await usedToday(ready.db, ready.tenant.id);
  const cap = ready.tenant.daily_cap ?? DEFAULT_DAILY_CAP;
  return {
    ok: true as const,
    campaign: {
      id: row.id,
      name: row.name,
      subject: row.subject,
      preheader: row.preheader || "",
      blocks,
      fromName: row.from_name || ready.tenant.from_name,
      status: row.status,
      testHash: row.test_hash,
      testSentAt: row.test_sent_at,
      scheduledAt: row.scheduled_at,
    },
    fromEmail: ready.tenant.from_email,
    paused: await sendingPaused(ready.db, ready.tenant),
    audience: audience.gate.recipients.length,
    pending: audience.pending,
    unsubscribed: audience.unsubscribed,
    suppressed: audience.suppressed,
    dailyCap: cap,
    usedToday: used,
  };
}

export async function healthReport() {
  const ready = await requireReady();
  if ("error" in ready) return { ok: false as const, error: ready.error };
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [sends, bounces, complaints, paused] = await Promise.all([
    ready.db.from("email_sends").select("id", { count: "exact", head: true }).eq("tenant_id", ready.tenant.id).eq("kind", "marketing").eq("status", "sent").gte("sent_at", since),
    ready.db.from("email_suppressions").select("id", { count: "exact", head: true }).eq("tenant_id", ready.tenant.id).ilike("reason", "%bounce%").gte("created_at", since),
    ready.db.from("email_suppressions").select("id", { count: "exact", head: true }).eq("tenant_id", ready.tenant.id).ilike("reason", "%complaint%").gte("created_at", since),
    sendingPaused(ready.db, ready.tenant),
  ]);
  if (sends.error || bounces.error || complaints.error) return { ok: false as const, error: "Could not read sending health." };
  const decision = rateDecision(sends.count ?? 0, bounces.count ?? 0, complaints.count ?? 0);
  const settings = await ready.db.from("email_settings").select("pause_reason").eq("id", "global").maybeSingle();
  const used = await usedToday(ready.db, ready.tenant.id);
  return {
    ok: true as const,
    paused,
    pauseReason: (settings.data as { pause_reason?: string } | null)?.pause_reason || "",
    sends7d: sends.count ?? 0,
    rates: decision.rates,
    sentToday: used,
    dailyCap: ready.tenant.daily_cap ?? DEFAULT_DAILY_CAP,
    configSet: ready.tenant.config_set,
  };
}

export async function saveDailyCap(cap: number): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(cap) || cap < 0 || cap > 100000) return { ok: false, error: "Daily cap is a whole number from 0 to 100000." };
  const ready = await requireReady();
  if ("error" in ready) return { ok: false, error: ready.error };
  const { error } = await ready.db.from("email_tenants").update({ daily_cap: cap }).eq("id", ready.tenant.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function listContacts(filter: { q?: string; status?: string }) {
  const ready = await requireReady();
  if ("error" in ready) return { ok: false as const, error: ready.error };
  let query = ready.db.from("email_contacts").select("id,email,first_name,status,consent_source,consent_text,consent_version,consent_at,confirmed_at").eq("tenant_id", ready.tenant.id).order("created_at", { ascending: false }).limit(300);
  const status = filter.status || "all";
  if (status === "confirmed") query = query.eq("status", "subscribed");
  else if (status === "pending" || status === "unsubscribed") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return { ok: false as const, error: error.message };
  const rows = (data || []) as { id: string; email: string; first_name: string | null; status: string; consent_source: string | null; consent_text: string | null; consent_version: string | null; consent_at: string | null; confirmed_at: string | null }[];
  const emails = rows.map((r) => r.email);
  const suppressed = emails.length ? await suppressedEmails(ready.db, ready.tenant.id, emails) : new Set<string>();
  const reasons = new Map<string, string>();
  if (emails.length) {
    const found = await ready.db.from("email_suppressions").select("email,reason").eq("tenant_id", ready.tenant.id).in("email", emails.slice(0, 200));
    for (const r of (found.data || []) as { email: string; reason: string }[]) reasons.set(r.email, r.reason);
  }
  const q = (filter.q || "").trim().toLowerCase();
  const refs: Awaited<ReturnType<typeof referralStatsFor>> = await referralStatsFor(ready.db, emails).catch(() => new Map());
  const people = rows.filter((r) => !q || r.email.includes(q) || (r.first_name || "").toLowerCase().includes(q)).filter((r) => status !== "suppressed" || suppressed.has(r.email) || r.status === "bounced" || r.status === "complained").map((r) => ({
    ...r,
    suppressed: suppressed.has(r.email) || r.status === "bounced" || r.status === "complained",
    reason: reasons.get(r.email) || (r.status === "bounced" || r.status === "complained" ? r.status : ""),
    referrals: refs.get(r.email)?.friends ?? 0,
    referred_by: maskEmail(refs.get(r.email)?.referredByEmail),
  }));
  return {
    ok: true as const,
    people,
    counts: {
      confirmed: await countStatus(ready.db, ready.tenant.id, "subscribed"),
      pending: await countStatus(ready.db, ready.tenant.id, "pending"),
      unsubscribed: await countStatus(ready.db, ready.tenant.id, "unsubscribed"),
      suppressed: await countSuppressions(ready.db, ready.tenant.id),
    },
  };
}

export function parseImportCsv(text: string): { email: string; firstName: string; consentSource: string }[] | { error: string } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { error: "The file needs a header and at least one row." };
  const head = lines[0].toLowerCase().split(",").map((c) => c.trim());
  const emailAt = head.indexOf("email");
  const nameAt = head.indexOf("first_name");
  const sourceAt = head.indexOf("consent_source");
  if (emailAt < 0 || sourceAt < 0) return { error: "The header must include email and consent_source." };
  const out: { email: string; firstName: string; consentSource: string }[] = [];
  for (const line of lines.slice(1, 501)) {
    const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const email = oneAddress(cells[emailAt] || "");
    const consentSource = (cells[sourceAt] || "").slice(0, 120);
    if (!email) return { error: `A row has an invalid email: ${line.slice(0, 80)}` };
    if (!consentSource) return { error: `Every row needs a consent source. Missing for ${email}.` };
    out.push({ email, firstName: (nameAt >= 0 ? cells[nameAt] : "").replace(/[<>]/g, "").slice(0, 60), consentSource });
  }
  if (lines.length > 501) return { error: "Import up to 500 rows at a time." };
  return out;
}

export async function importContacts(csv: string): Promise<{ ok: true; added: number; skipped: number } | { ok: false; error: string }> {
  const parsed = parseImportCsv(csv);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  const ready = await requireReady();
  if ("error" in ready) return { ok: false, error: ready.error };
  let added = 0;
  let skipped = 0;
  for (const row of parsed) {
    const existing = await ready.db.from("email_contacts").select("id").eq("tenant_id", ready.tenant.id).eq("email", row.email).maybeSingle();
    if (existing.data) { skipped++; continue; }
    const inserted = await ready.db.from("email_contacts").insert({
      tenant_id: ready.tenant.id,
      email: row.email,
      first_name: row.firstName || null,
      status: "pending",
      consent_source: row.consentSource,
      consent_text: "Imported with a declared consent source. Marketing waits until they confirm.",
      consent_version: "import",
      consent_at: new Date().toISOString(),
    }).select("id").single();
    if (inserted.error || !inserted.data) return { ok: false, error: inserted.error?.message || "Import stopped." };
    const msg = confirmMessage();
    await ready.db.from("email_sends").insert({
      tenant_id: ready.tenant.id,
      contact_id: (inserted.data as { id: string }).id,
      to_email: row.email,
      kind: "confirm",
      idempotency_key: confirmationKey(row.email, new Date()),
      status: "pending",
      subject: msg.subject,
      html: msg.html,
      from_name: ready.tenant.from_name,
      respect_quiet: false,
    });
    added++;
  }
  return { ok: true, added, skipped };
}

export async function saveCampaign(input: { id?: string; name: string; subject: string; preheader: string; blocks: unknown; fromName?: string }): Promise<{ ok: true; id: string; hash: string } | { ok: false; error: string }> {
  const blocks = parseBlocks(input.blocks);
  if (!blocks) return { ok: false, error: "Those blocks are not valid." };
  const content = { subject: String(input.subject || ""), preheader: String(input.preheader || ""), blocks };
  const ready = await requireReady();
  if ("error" in ready) return { ok: false, error: ready.error };
  const fromName = cleanFromName(input.fromName || ready.tenant.from_name);
  const hash = contentHash({ ...content, fromName });
  const patch = {
    name: (input.name || content.subject || "Untitled").trim().slice(0, 120),
    subject: content.subject.trim().slice(0, 200),
    preheader: content.preheader.trim().slice(0, 200),
    blocks,
    from_name: fromName,
    content_hash: hash,
    kind: "broadcast",
  };
  if (input.id) {
    const { error } = await ready.db.from("email_campaigns").update(patch).eq("id", input.id).eq("tenant_id", ready.tenant.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: input.id, hash };
  }
  const created = await ready.db.from("email_campaigns").insert({ ...patch, tenant_id: ready.tenant.id, status: "draft" }).select("id").single();
  if (created.error || !created.data) return { ok: false, error: created.error?.message || "Could not save the draft." };
  return { ok: true, id: (created.data as { id: string }).id, hash };
}

export async function scheduleBroadcast(input: { campaignId: string; when: string; confirm?: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const when = new Date(input.when);
  if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60_000) return { ok: false, error: "Pick a time in the future." };
  const ready = await requireReady();
  if ("error" in ready) return { ok: false, error: ready.error };
  const paused = await sendingPaused(ready.db, ready.tenant);
  const loaded = await ready.db.from("email_campaigns").select("id,name,subject,preheader,blocks,from_name,status,content_hash,test_hash,test_sent_at,scheduled_at,send_confirmed").eq("id", input.campaignId).eq("tenant_id", ready.tenant.id).maybeSingle();
  if (loaded.error || !loaded.data) return { ok: false, error: loaded.error?.message || "Campaign not found." };
  const row = loaded.data as CampaignRow;
  const content = campaignContent(row);
  if ("error" in content) return { ok: false, error: content.error };
  let audience;
  try { audience = await audienceNow(ready.db, ready.tenant.id); }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Could not read the list." }; }
  const fromName = cleanFromName(row.from_name || ready.tenant.from_name);
  const hash = contentHash({ ...content, fromName });
  const blocked = sendBlocked({ paused, audience: audience.gate.recipients.length, testHash: row.test_hash, contentHash: hash, confirm: input.confirm });
  if (blocked) return { ok: false, error: blocked };
  const { data, error } = await ready.db.from("email_campaigns").update({
    status: "scheduled",
    scheduled_at: when.toISOString(),
    content_hash: hash,
    send_confirmed: true,
    typed_confirm: input.confirm === "SEND",
  }).eq("id", row.id).in("status", ["draft", "scheduled"]).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: ALREADY };
  return { ok: true };
}

async function promoteScheduled(db: SupabaseClient, tenant: TenantRow): Promise<number> {
  const { data, error } = await db.from("email_campaigns").select("id,typed_confirm").eq("tenant_id", tenant.id).eq("status", "scheduled").lte("scheduled_at", new Date().toISOString()).limit(5);
  if (error || !data?.length) return 0;
  let n = 0;
  for (const row of data as { id: string; typed_confirm: boolean | null }[]) {
    const result = await queueBroadcast({ campaignId: row.id, confirm: row.typed_confirm ? "SEND" : undefined });
    if (result.ok) n++;
    else if (!/already sending or has been sent/i.test(result.error)) {
      await db.from("email_campaigns").update({ status: "draft", counts: { error: result.error } }).eq("id", row.id).eq("status", "scheduled");
    }
  }
  return n;
}

async function maybeAutoPause(db: SupabaseClient, tenant: TenantRow): Promise<string | null> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sends = await db.from("email_sends").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("kind", "marketing").eq("status", "sent").gte("sent_at", since);
  const bounces = await db.from("email_suppressions").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).ilike("reason", "%bounce%").gte("created_at", since);
  const complaints = await db.from("email_suppressions").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).ilike("reason", "%complaint%").gte("created_at", since);
  if (sends.error || bounces.error || complaints.error) return null;
  const decision = rateDecision(sends.count ?? 0, bounces.count ?? 0, complaints.count ?? 0);
  if (!decision.pause) return null;
  await writePaused(db, tenant.id, true, decision.pause);
  return decision.pause;
}

export async function runEmailCron(): Promise<Record<string, unknown>> {
  let db: SupabaseClient;
  try { db = emailDb(); } catch { return { ok: false, error: "no database" }; }
  const tenant = await loadTenant(db);
  if (!tenant) return { ok: false, error: "migration 009 not applied" };
  if (await sendingPaused(db, tenant)) return { ok: true, paused: true, sent: 0 };
  const auto = await maybeAutoPause(db, tenant);
  if (auto) return { ok: true, paused: true, autoPaused: auto, sent: 0 };
  if (!sesConfigured()) return { ok: true, paused: false, configured: false, sent: 0 };
  if (!secret()) return { ok: true, paused: false, configured: false, reason: "no token secret", sent: 0 };
  const sync = await db.rpc("email_sync_sunder");
  if (sync.error) return { ok: false, error: sync.error.message };
  const promoted = await promoteScheduled(db, tenant);
  const enqueued = await enqueueDueSeries(db);
  const stuck = await db.rpc("email_fail_stuck_sends");
  const drained = await drainOutbox({
    outbox: liveOutbox(db, tenant),
    send: (msg) => sendSes(msg),
    acquire: () => acquireSendSlot(rateCounter()),
    paused: false,
    quiet: isQuiet(new Date()),
    secret: secret(),
  });
  return { ok: true, configured: true, enqueued, promoted, stuck: stuck.data ?? 0, ...drained };
}

export async function afterSunderSignup(input: { email: string; firstName: string; created: boolean }): Promise<void> {
  const db = emailDb();
  const email = input.email.trim().toLowerCase();
  const { data, error } = await db.from("sunder_subscribers").select("marketing_status").eq("email", email).maybeSingle();
  if (error) {
    if (isMissingSchema(error)) return;
    throw new Error(error.message);
  }
  const status = (data as { marketing_status?: string } | null)?.marketing_status ?? null;
  if (!shouldQueueConfirmation(input.created, status)) return;
  const tenant = await loadTenant(db);
  if (!tenant) return;
  const sync = await db.rpc("email_sync_sunder");
  if (sync.error) throw new Error(sync.error.message);
  const contact = await db.from("email_contacts").select("id,status").eq("tenant_id", tenant.id).eq("email", email).maybeSingle();
  if (contact.error) throw new Error(contact.error.message);
  const base = confirmMessage();
  const msg = { ...base, html: withReferralLine(base.html, await referralLineFor(db, email)) };
  const key = confirmationKey(email, new Date());
  const { error: insertError } = await db.from("email_sends").insert({
    tenant_id: tenant.id,
    contact_id: (contact.data as { id: string } | null)?.id ?? null,
    to_email: email,
    kind: "confirm",
    idempotency_key: key,
    status: "pending",
    subject: msg.subject,
    html: msg.html,
    from_name: tenant.from_name || SUNDER_IDENTITY.fromName,
    respect_quiet: false,
  });
  if (insertError && insertError.code !== "23505") throw new Error(insertError.message);
  if (await sendingPaused(db, tenant) || !sesConfigured() || !secret()) return;
  const { data: pending, error: pendingError } = await db.from("email_sends").select("id,subject,html,from_name,contact_id").eq("idempotency_key", key).eq("status", "pending").maybeSingle();
  if (pendingError || !pending) return;
  const claimed = await db.from("email_sends").update({ status: "sending", claimed_at: new Date().toISOString() }).eq("id", (pending as { id: string }).id).eq("status", "pending").select("id");
  if (claimed.error || !claimed.data?.length) return;
  const row = mapClaimed({
    ...(pending as Record<string, unknown>),
    to_email: email,
    kind: "confirm",
    respect_quiet: false,
    campaign_id: null,
  }, { status: "pending", confirmed_at: null, first_name: input.firstName }, identityFrom(tenant));
  let once = true;
  await drainOutbox({
    outbox: {
      claim: async () => {
        if (!once) return [];
        once = false;
        return [row];
      },
      markSent: async (id, messageId) => { await db.from("email_sends").update({ status: "sent", ses_message_id: messageId, sent_at: new Date().toISOString() }).eq("id", id); },
      markFailed: async (id, err) => { await db.from("email_sends").update({ status: "failed", error: err.slice(0, 300) }).eq("id", id); },
      markSkipped: async (id, reason) => { await db.from("email_sends").update({ status: "skipped", error: reason }).eq("id", id); },
      release: async (id) => { await db.from("email_sends").update({ status: "pending", claimed_at: null }).eq("id", id).is("ses_message_id", null); },
      suppressed: (emails) => suppressedEmails(db, tenant.id, emails),
    },
    send: (msg) => sendSes(msg),
    acquire: () => acquireSendSlot(rateCounter()),
    paused: false,
    quiet: false,
    secret: secret(),
    limit: 1,
    deadlineMs: 15_000,
  });
}

export async function viewByToken(token: string): Promise<{ subject: string; html: string } | null> {
  const parsed = readEmailToken(token, secret(), "view");
  if (!parsed?.id) return null;
  let db: SupabaseClient;
  try { db = emailDb(); } catch { return null; }
  const { data } = await db.from("email_sends").select("to_email,subject,html,from_name,contact_id").eq("id", parsed.id).maybeSingle();
  const row = data as { to_email: string; subject: string; html: string; from_name: string; contact_id: string | null } | null;
  if (!row || row.to_email !== parsed.e) return null;
  let firstName: string | null = null;
  if (row.contact_id) {
    const contact = await db.from("email_contacts").select("first_name").eq("id", row.contact_id).maybeSingle();
    firstName = (contact.data as { first_name?: string } | null)?.first_name || null;
  }
  const tenant = await loadTenant(db, parsed.t);
  if (!tenant) return null;
  const rendered = renderMarketingEmail({
    subject: row.subject,
    html: row.html,
    fromName: row.from_name,
    identity: { ...identityFrom(tenant), fromName: row.from_name },
    unsubUrl: "https://saabai.ai/email/u",
    values: { firstName },
  });
  return { subject: rendered.subject, html: rendered.html };
}

export async function confirmByToken(token: string): Promise<{ status: "confirmed" | "already" | "unsubscribed" | "missing" | "invalid" }> {
  const parsed = tokenEmail(token, secret(), "confirm");
  if (!parsed || parsed.tenant !== SUNDER_SLUG) return { status: "invalid" };
  const db = emailDb();
  const { data, error } = await db.rpc("email_confirm_sunder", { p_email: parsed.email });
  if (error) {
    if (isMissingSchema(error)) return { status: "missing" };
    throw new Error(error.message);
  }
  const status = String(data || "missing");
  if (status === "confirmed" || status === "already" || status === "unsubscribed" || status === "missing") return { status };
  return { status: "missing" };
}

export async function unsubscribeByToken(token: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = readEmailToken(token, secret(), "unsub");
  if (!parsed) return { ok: false, error: "This link isn't valid" };
  const db = emailDb();
  const { error } = await db.rpc("email_unsubscribe", { p_tenant: parsed.t, p_email: parsed.e, p_reason: "unsubscribe" });
  if (error) {
    if (isMissingSchema(error)) return { ok: false, error: "Unsubscribe is not available yet." };
    throw new Error(error.message);
  }
  if (parsed.c) {
    const tenant = await loadTenant(db, parsed.t);
    if (tenant) await db.from("email_suppressions").update({ campaign_id: parsed.c }).eq("tenant_id", tenant.id).eq("email", parsed.e);
  }
  return { ok: true };
}

/** Hard bounce or complaint from the sending provider. Feeds suppression, series exit, and auto-pause. */
export async function recordProviderEvent(input: { email: string; reason: "bounce" | "complaint"; tenant?: string; campaignId?: string | null }): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, error: "Missing address" };
  let db: SupabaseClient;
  try { db = emailDb(); } catch { return { ok: false, error: "no database" }; }
  const slug = input.tenant && /^[a-z0-9][a-z0-9-]{0,30}$/.test(input.tenant) ? input.tenant : SUNDER_SLUG;
  const { error } = await db.rpc("email_unsubscribe", { p_tenant: slug, p_email: email, p_reason: input.reason });
  if (error) return { ok: false, error: error.message };
  const tenant = await loadTenant(db, slug);
  if (!tenant) return { ok: true };
  const status = input.reason === "complaint" ? "complained" : "bounced";
  await db.from("email_contacts").update({ status, updated_at: new Date().toISOString() }).eq("tenant_id", tenant.id).eq("email", email);
  if (input.campaignId && /^[0-9a-f-]{36}$/i.test(input.campaignId)) {
    await db.from("email_suppressions").update({ campaign_id: input.campaignId }).eq("tenant_id", tenant.id).eq("email", email);
  }
  await maybeAutoPause(db, tenant);
  return { ok: true };
}

export function safeError(err: unknown): string {
  return publicSesError(err);
}
