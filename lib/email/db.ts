import type { SupabaseClient } from "@supabase/supabase-js";
import { serviceClient } from "../agent-supabase";
import { SUNDER_SLUG, type SenderIdentity } from "./constants";
import { configurationSetName } from "./ses";

export type TenantRow = {
  id: string;
  slug: string;
  from_name: string;
  from_email: string;
  reply_to: string | null;
  postal_address: string;
  abn: string;
  legal_name: string;
  domain: string;
  why_text: string;
  config_set: string | null;
  ses_tenant_name: string | null;
  status: string;
};

export function emailDb(): SupabaseClient {
  return serviceClient();
}

export function isMissingSchema(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || error.code === "42703" || /does not exist|schema cache|Could not find/i.test(error.message || "");
}

export function identityFrom(row: TenantRow, env: NodeJS.ProcessEnv = process.env): SenderIdentity {
  return {
    slug: row.slug,
    fromName: row.from_name,
    fromEmail: row.from_email,
    replyTo: row.reply_to || row.from_email,
    legalName: row.legal_name,
    abn: row.abn,
    postalAddress: row.postal_address,
    domain: row.domain,
    whyText: row.why_text,
    sesTenantName: (row.ses_tenant_name || "").trim(),
    configSet: configurationSetName(row.config_set, env.AWS_SES_CONFIGURATION_SET) || "",
  };
}

export async function loadTenant(db: SupabaseClient, slug = SUNDER_SLUG): Promise<TenantRow | null> {
  const { data, error } = await db.from("email_tenants").select("id,slug,from_name,from_email,reply_to,postal_address,abn,legal_name,domain,why_text,config_set,ses_tenant_name,status").eq("slug", slug).maybeSingle();
  if (error) {
    if (isMissingSchema(error)) return null;
    throw new Error(error.message);
  }
  return data as TenantRow | null;
}

export async function countStatus(db: SupabaseClient, tenantId: string, status: string): Promise<number> {
  const { count, error } = await db.from("email_contacts").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", status);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function countSuppressions(db: SupabaseClient, tenantId: string): Promise<number> {
  const { count, error } = await db.from("email_suppressions").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function suppressedEmails(db: SupabaseClient, tenantId: string, emails: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < emails.length; i += 200) {
    const chunk = emails.slice(i, i + 200);
    if (!chunk.length) continue;
    const { data, error } = await db.from("email_suppressions").select("email,tenant_id").in("email", chunk);
    if (error) throw new Error(error.message);
    for (const row of data || []) {
      const r = row as { email: string; tenant_id: string | null };
      if (r.tenant_id === null || r.tenant_id === tenantId) found.add(r.email);
    }
  }
  return found;
}

export async function listConfirmed(db: SupabaseClient, tenantId: string): Promise<{ id: string; email: string; first_name: string | null; status: string; confirmed_at: string | null }[]> {
  const out: { id: string; email: string; first_name: string | null; status: string; confirmed_at: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("email_contacts")
      .select("id,email,first_name,status,confirmed_at")
      .eq("tenant_id", tenantId)
      .eq("status", "subscribed")
      .not("confirmed_at", "is", null)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = (data || []) as typeof out;
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}
