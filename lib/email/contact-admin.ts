/**
 * Pure rules for editing and deleting SUNDER email contacts from the admin.
 * No network. ops.ts does the Supabase work.
 */
import { oneAddress } from "./rules";
import { cleanMobile } from "../sunder-waitlist";

export const MAX_DELETE = 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Statuses an admin can set by hand. Re-subscribing needs fresh consent, so it is never offered. */
export const EDITABLE_STATUS = ["keep", "unsubscribed"] as const;

export type ContactEdit = { id: string; email: string; firstName: string | null; mobile: string | null | undefined; unsubscribe: boolean };

export function validateContactEdit(body: Record<string, unknown>): { ok: true; edit: ContactEdit } | { ok: false; error: string; fields?: Record<string, string> } {
  const id = String(body.id || "");
  if (!UUID.test(id)) return { ok: false, error: "That subscriber was not found." };
  const fields: Record<string, string> = {};
  const email = oneAddress(String(body.email || ""));
  if (!email) fields.email = "Enter one valid email address.";
  const nameRaw = typeof body.firstName === "string" ? body.firstName.trim() : "";
  if (nameRaw.length > 60) fields.firstName = "Keep the name under 60 characters.";
  let mobile: string | null | undefined;
  if (body.mobile !== undefined) {
    const m = cleanMobile(body.mobile);
    if (m === false) fields.mobile = "Enter a valid mobile number, or leave it blank.";
    else mobile = m;
  }
  const status = String(body.status || "keep");
  if (!(EDITABLE_STATUS as readonly string[]).includes(status)) fields.status = "That status cannot be set by hand.";
  if (Object.keys(fields).length) return { ok: false, error: "Some fields need fixing.", fields };
  return { ok: true, edit: { id, email: email as string, firstName: nameRaw || null, mobile, unsubscribe: status === "unsubscribed" } };
}

export function cleanDeleteIds(raw: unknown): { ok: true; ids: string[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || !raw.length) return { ok: false, error: "Pick at least one subscriber." };
  const ids = [...new Set(raw.map(String))];
  if (ids.some((id) => !UUID.test(id))) return { ok: false, error: "That list has an unknown subscriber." };
  if (ids.length > MAX_DELETE) return { ok: false, error: `Delete up to ${MAX_DELETE} at a time.` };
  return { ok: true, ids };
}

export { deleteConfirmText, editLocked } from "./contact-copy";
