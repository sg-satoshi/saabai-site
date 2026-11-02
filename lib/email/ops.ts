/**
 * Admin and cron operations for the SUNDER email module.
 * Routes stay thin. Nothing here talks to SES unless sendSes is called,
 * and tests pass a mock sender into drainOutbox instead of calling these.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRedis } from "../redis";
import { SUNDER_IDENTITY, SUNDER_SLUG, type SenderIdentity } from "./constants";
import {
  countStatus, countSuppressions, emailDb, identityFrom, isMissingSchema, listConfirmed, loadTenant, suppressedEmails, type TenantRow,
} from "./db";
import { buildSunderHtml, confirmMessage } from "./message";
import { isQuiet, seriesRunAt } from "./quiet";
import { acquireSendSlot, type RateCounter } from "./rate";
import {
  cleanFromName, confirmationKey, fromDomainAllowed, mailableContacts, oneAddress, publicSesError,
  shouldQueueConfirmation, validateBroadcastCopy, validateSeriesSteps, type SeriesStepInput,
} from "./rules";
import { sendSes, sesConfigured, type SesMessage } from "./ses";
import type { CampaignView, EmailAdminSnapshot, SeriesStepView } from "./types";
import { drainOutbox, tokenEmail, type Outbox, type OutboxRow } from "./worker";

const MIGRATION = "Apply db/migrations/009_email_marketing.sql in the Supabase SQL editor, then refresh.";

function secret(): string {
  return process.env.SAABAI_SESSION_SECRET || "";
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

async function writePaused(db: SupabaseClient, tenantId: string, paused: boolean): Promise<void> {
  const { error } = await db.from("email_settings").upsert({ id: "global", paused }, { onConflict: "id" });
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
  const series = await loadSeries(db, tenant.id);
  const campaigns = await loadCampaigns(db);
  return {
    ok: true,
    paused,
    fromName: tenant.from_name,
    fromEmail: tenant.from_email,
    configSet: tenant.config_set,
    sesTenantName: tenant.ses_tenant_name,
    counts: { subscribed, pending, unsubscribed, suppressed },
    series,
    campaigns,
  };
}

async function loadSeries(db: SupabaseClient, tenantId: string): Promise<{ status: "active" | "paused"; steps: SeriesStepView[] }> {
  const { data: series, error } = await db.from("email_series").select("id,status").eq("tenant_id", tenantId).eq("slug", "welcome").maybeSingle();
  if (error) throw new Error(error.message);
  if (!series) return { status: "paused", steps: [] };
  const { data: steps, error: stepError } = await db.from("email_series_steps").select("position,delay_minutes,template_id").eq("series_id", series.id).order("position");
  if (stepError) throw new Error(stepError.message);
  const ids = (steps || []).map((s) => (s as { template_id: string }).template_id);
  const { data: templates, error: templateError } = ids.length
    ? await db.from("email_templates").select("id,subject,body_text").in("id", ids)
    : { data: [], error: null };
  if (templateError) throw new Error(templateError.message);
  const byId = new Map((templates || []).map((t) => [(t as { id: string }).id, t as { subject: string; body_text: string }]));
  return {
    status: series.status === "paused" ? "paused" : "active",
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
  return ((data || []) as { id: string; name: string; status: string; created_at: string; queued: number; sent: number; failed: number; skipped: number; pending: number }[]).map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    createdAt: c.created_at,
    queued: c.queued,
    sent: c.sent,
    failed: c.failed,
    skipped: c.skipped,
    pending: c.pending,
  }));
}

export async function setSendingPaused(paused: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = emailDb();
  const tenant = await loadTenant(db);
  if (!tenant) return { ok: false, error: MIGRATION };
  await writePaused(db, tenant.id, paused);
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

export async function sendTest(input: { to: string; subject: string; body: string; fromName?: string }): Promise<{ ok: true; subject: string; messageId: string } | { ok: false; error: string }> {
  const to = oneAddress(input.to);
  if (!to) return { ok: false, error: "Enter one email address." };
  const copy = validateBroadcastCopy(input);
  if (copy) return { ok: false, error: copy };
  const ready = await requireReady();
  if ("error" in ready) return { ok: false, error: ready.error };
  if (await sendingPaused(ready.db, ready.tenant)) return { ok: false, error: "Sending is paused." };
  if (!sesConfigured()) return { ok: false, error: "SES is not configured on this environment." };
  const blocked = await suppressedEmails(ready.db, ready.tenant.id, [to]);
  if (blocked.has(to)) return { ok: false, error: "That address is on the suppression list." };
  const fromName = cleanFromName(input.fromName || ready.tenant.from_name);
  const html = buildSunderHtml(input.body);
  const { data: campaign, error: campaignError } = await ready.db.from("email_campaigns").insert({
    tenant_id: ready.tenant.id,
    kind: "test",
    name: `Test: ${input.subject.trim().slice(0, 80)}`,
    subject: input.subject.trim(),
    status: "sending",
  }).select("id").single();
  if (campaignError || !campaign) return { ok: false, error: campaignError?.message || "Could not record the test." };
  const row: OutboxRow = {
    id: "test",
    toEmail: to,
    kind: "test",
    subject: input.subject.trim(),
    html,
    fromName,
    respectQuiet: false,
    contactStatus: "subscribed",
    confirmedAt: new Date().toISOString(),
    firstName: "Sam",
    campaignId: (campaign as { id: string }).id,
    identity: { ...ready.identity, fromName },
  };
  const sent = await deliverOne(ready.db, ready.tenant.id, row);
  if (!sent.ok) return sent;
  return { ok: true, subject: sent.subject, messageId: sent.messageId };
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
  if (result.sent === 1 && messageId) {
    await db.from("email_campaigns").update({ status: "sent" }).eq("id", row.campaignId);
    return { ok: true, subject, messageId };
  }
  return { ok: false, error: result.failed ? "SES rejected the test. The send row is marked failed." : "The test did not send." };
}

export async function queueBroadcast(input: { subject: string; body: string; fromName?: string; requestKey: string }): Promise<{ ok: true; queued: number; suppressed: number; held: number; campaignId: string } | { ok: false; error: string }> {
  const copy = validateBroadcastCopy(input);
  if (copy) return { ok: false, error: copy };
  if (!/^[A-Za-z0-9_:-]{8,80}$/.test(input.requestKey)) return { ok: false, error: "Missing send key." };
  const ready = await requireReady();
  if ("error" in ready) return { ok: false, error: ready.error };
  if (await sendingPaused(ready.db, ready.tenant)) return { ok: false, error: "Sending is paused." };
  const { error: syncError } = await ready.db.rpc("email_sync_sunder");
  if (syncError) return { ok: false, error: syncError.message };
  const existing = await ready.db.from("email_campaigns").select("id,counts").eq("request_key", input.requestKey).maybeSingle();
  if (existing.error) return { ok: false, error: existing.error.message };
  const fromName = cleanFromName(input.fromName || ready.tenant.from_name);
  const subject = input.subject.trim();
  const html = buildSunderHtml(input.body.replace(/\r\n/g, "\n"));
  let campaignId = (existing.data as { id: string } | null)?.id;
  if (!campaignId) {
    const created = await ready.db.from("email_campaigns").insert({
      tenant_id: ready.tenant.id,
      kind: "broadcast",
      name: subject.slice(0, 120),
      subject,
      status: "sending",
      request_key: input.requestKey,
    }).select("id").single();
    if (created.error?.code === "23505") {
      const again = await ready.db.from("email_campaigns").select("id").eq("request_key", input.requestKey).maybeSingle();
      campaignId = (again.data as { id: string } | null)?.id;
    } else if (created.data) {
      campaignId = (created.data as { id: string }).id;
    }
    if (!campaignId) return { ok: false, error: created.error?.message || "Could not start the broadcast." };
  }
  const contacts = await listConfirmed(ready.db, ready.tenant.id);
  const blocked = await suppressedEmails(ready.db, ready.tenant.id, contacts.map((c) => c.email));
  const gate = mailableContacts(contacts.map((c) => ({ ...c, confirmedAt: c.confirmed_at })), blocked);
  const rows = gate.recipients.map((c) => ({
    tenant_id: ready.tenant.id,
    campaign_id: campaignId,
    contact_id: c.id,
    to_email: c.email,
    kind: "marketing",
    idempotency_key: `broadcast:${input.requestKey}:${c.id}`,
    status: "pending",
    subject,
    html,
    from_name: fromName,
    respect_quiet: false,
  }));
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await ready.db.from("email_sends").upsert(rows.slice(i, i + 200), { onConflict: "idempotency_key", ignoreDuplicates: true });
    if (error) return { ok: false, error: error.message };
  }
  const counts = { queued: gate.recipients.length, suppressed: gate.suppressed, held: gate.held };
  await ready.db.from("email_campaigns").update({ counts, status: "sending" }).eq("id", campaignId);
  return { ok: true, queued: counts.queued, suppressed: counts.suppressed, held: counts.held, campaignId };
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
    const html = raw.body_text ? buildSunderHtml(raw.body_text) : raw.html;
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

export async function runEmailCron(): Promise<Record<string, unknown>> {
  let db: SupabaseClient;
  try { db = emailDb(); } catch { return { ok: false, error: "no database" }; }
  const tenant = await loadTenant(db);
  if (!tenant) return { ok: false, error: "migration 009 not applied" };
  if (await sendingPaused(db, tenant)) return { ok: true, paused: true, sent: 0 };
  if (!sesConfigured()) return { ok: true, paused: false, configured: false, sent: 0 };
  if (!secret()) return { ok: true, paused: false, configured: false, reason: "no token secret", sent: 0 };
  const sync = await db.rpc("email_sync_sunder");
  if (sync.error) return { ok: false, error: sync.error.message };
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
  return { ok: true, configured: true, enqueued, stuck: stuck.data ?? 0, ...drained };
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
  const msg = confirmMessage();
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
  const parsed = tokenEmail(token, secret(), "unsub");
  if (!parsed) return { ok: false, error: "This link isn't valid" };
  const db = emailDb();
  const { error } = await db.rpc("email_unsubscribe", { p_tenant: parsed.tenant, p_email: parsed.email, p_reason: "one_click" });
  if (error) {
    if (isMissingSchema(error)) return { ok: false, error: "Unsubscribe is not available yet." };
    throw new Error(error.message);
  }
  return { ok: true };
}

export function safeError(err: unknown): string {
  return publicSesError(err);
}
