/**
 * SUNDER marketing automations shown on Campaigns.
 * Welcome steps are email_templates rows the series sender reads.
 * Confirm and referral link start as code (CONFIRM_COPY / REFERRAL_COPY)
 * and use a saved template only after an admin saves an edit.
 * Account, portal, password, billing, Lex and wholesale mail are other senders
 * and are not part of this list.
 */
import { documentHtml, textToBlocks } from "./blocks";
import { SUNDER_FROM_NAME, SUNDER_IDENTITY } from "./constants";
import { SUNDER_SAMPLE_VALUES } from "./merge-tags";
import {
  CONFIRM_COPY,
  REFERRAL_COPY,
  confirmMessage,
  referralLinkMessage,
  renderMarketingEmail,
  withReferralLine,
  type SystemCopy,
} from "./message";
import { validateBroadcastCopy, type SeriesStepInput } from "./rules";

export const SYSTEM_CONFIRM = "system-confirm";
export const SYSTEM_REFERRAL = "system-referral-link";
export const WELCOME_POSITIONS = [0, 1, 2] as const;

export const SAMPLE_REFERRAL_LINE = "Your link: https://sunder.com.au/?r=sample · 2 friends joined · 2 bonus entries";
export const SAMPLE_REFERRAL_URL = "https://sunder.com.au/r/sample";
export const SAMPLE_CONFIRM_URL = "https://sunder.com.au/email/confirm?t=preview";

const LOCK_NOTE = "The footer, unsubscribe link and referral counts are added on send. A confirm button always uses a one-time link. Saving does not send.";

export type AutomatedSource = "saved" | "built-in" | "missing";

export type AutomatedEmailView = {
  key: string;
  name: string;
  subject: string;
  channel: "automation";
  trigger: string;
  timing: string;
  source: AutomatedSource;
  status: "active" | "paused" | "built-in";
};

export type AutomatedKey =
  | { kind: "series"; position: number }
  | { kind: "system"; templateName: typeof SYSTEM_CONFIRM | typeof SYSTEM_REFERRAL; mode: "confirm" | "referral" };

export type SeriesStepSource = { position: number; delayDays: number; subject: string; body: string };

/** What the welcome sender wraps. Empty text keeps the stored HTML, which is the live fallback. */
export function seriesOutgoingHtml(bodyText: string | null | undefined, storedHtml: string | null | undefined): string {
  if (bodyText) return documentHtml({ preheader: "", blocks: textToBlocks(bodyText) });
  return storedHtml || "";
}

/** Same HTML enqueueDueSeries stores, before the worker adds the footer and fills in the name. */
export function seriesQueuedHtml(
  bodyText: string | null | undefined,
  storedHtml: string | null | undefined,
  referralLine: string | null,
  referralUrl?: string | null,
): string {
  return withReferralLine(seriesOutgoingHtml(bodyText, storedHtml), referralLine, referralUrl);
}

export function isBroadcastInventory(row: { kind?: string | null; requestKey?: string | null }): boolean {
  if ((row.requestKey || "").startsWith("series:")) return false;
  return row.kind === "broadcast";
}

export function automationKeyFromRequest(requestKey: string | null | undefined): string | null {
  const m = /^series:sunder:welcome:(\d+)$/.exec(requestKey || "");
  return m ? `series-${m[1]}` : null;
}

export function parseAutomatedKey(key: string): AutomatedKey | null {
  if (key === SYSTEM_CONFIRM) return { kind: "system", templateName: SYSTEM_CONFIRM, mode: "confirm" };
  if (key === SYSTEM_REFERRAL) return { kind: "system", templateName: SYSTEM_REFERRAL, mode: "referral" };
  const m = /^series-(\d+)$/.exec(key);
  if (!m) return null;
  const position = Number(m[1]);
  if (!Number.isInteger(position) || position < 0 || position > 19) return null;
  return { kind: "series", position };
}

export function seriesTiming(position: number, delayDays: number, previousDelay: number): string {
  if (position === 0 || delayDays === 0) return "Right after they confirm";
  const wait = Math.max(0, delayDays - previousDelay);
  const days = wait === 1 ? "1 day" : `${wait} days`;
  return `Waits ${days} after the previous email (day ${delayDays})`;
}

export function listAutomatedEmails(input: {
  seriesStatus: "active" | "paused" | "missing";
  steps: SeriesStepSource[];
  confirmSaved: boolean;
  confirmSubject: string;
  referralSaved: boolean;
  referralSubject: string;
}): AutomatedEmailView[] {
  const byPos = new Map(input.steps.map((s) => [s.position, s]));
  const positions = [...new Set<number>([...WELCOME_POSITIONS, ...input.steps.map((s) => s.position)])].sort((a, b) => a - b);
  let previous = 0;
  const welcome = positions.map((position) => {
    const step = byPos.get(position);
    const timing = step ? seriesTiming(position, step.delayDays, previous) : "Set up with the welcome series (day 0, then day 3, then day 7)";
    if (step) previous = step.delayDays;
    const view: AutomatedEmailView = {
      key: `series-${position}`,
      name: `Welcome email ${position + 1}`,
      subject: step?.subject || "",
      channel: "automation",
      trigger: "Joins the SUNDER waitlist and confirms",
      timing,
      source: step ? "saved" : "missing",
      status: input.seriesStatus === "missing" ? "built-in" : input.seriesStatus,
    };
    return view;
  });
  return [
    ...welcome,
    {
      key: SYSTEM_CONFIRM,
      name: "Confirm opt-in",
      subject: input.confirmSaved ? input.confirmSubject : CONFIRM_COPY.subject,
      channel: "automation",
      trigger: "Someone joins the SUNDER waitlist",
      timing: "Straight away, before they are confirmed",
      source: input.confirmSaved ? "saved" : "built-in",
      status: "built-in",
    },
    {
      key: SYSTEM_REFERRAL,
      name: "Referral link",
      subject: input.referralSaved ? input.referralSubject : REFERRAL_COPY.subject,
      channel: "automation",
      trigger: "Someone asks to check their referrals",
      timing: "At most one email every 8 hours for that address",
      source: input.referralSaved ? "saved" : "built-in",
      status: "built-in",
    },
  ];
}

/** A stored button label is short text. Full HTML in that column is ignored so the built-in label stays. */
export function systemButtonLabel(stored: string | null | undefined, fallback: string): string {
  const text = (stored || "").trim();
  if (!text || text.length > 80 || /[<>]/.test(text)) return fallback;
  return text;
}

export function cleanButtonLabel(raw: string, fallback: string): string | { error: string } {
  const label = raw.replace(/[\r\n<>]/g, "").trim();
  if (!label) return { error: "The button needs a label." };
  if (label.length > 80) return { error: "Button labels are limited to 80 characters." };
  return label || fallback;
}

export function validateAutomatedEdit(key: AutomatedKey, input: { subject: string; message: string; buttonLabel?: string }): string | null {
  const copy = validateBroadcastCopy({ subject: input.subject, body: input.message });
  if (copy) return copy;
  if (key.kind === "system") {
    const label = cleanButtonLabel(input.buttonLabel ?? "", key.mode === "confirm" ? CONFIRM_COPY.buttonLabel : REFERRAL_COPY.buttonLabel);
    if (typeof label !== "string") return label.error;
  }
  return null;
}

export function replaceSeriesStep(steps: SeriesStepInput[], position: number, subject: string, body: string): SeriesStepInput[] | { error: string } {
  if (!steps.some((s) => s.position === position)) return { error: "That welcome email is not in the series." };
  return steps.map((s) => s.position === position ? { ...s, subject: subject.trim(), body: body.replace(/\r\n/g, "\n") } : { ...s });
}

export type AutomatedEditor = {
  ok: true;
  key: string;
  name: string;
  trigger: string;
  timing: string;
  subject: string;
  message: string;
  buttonLabel: string | null;
  mode: "series" | "confirm" | "referral";
  source: AutomatedSource;
  storedHtml: string;
  useStoredHtml: boolean;
  lockNote: string;
};

export function editorFromSources(input: {
  key: AutomatedKey;
  seriesStatus: "active" | "paused" | "missing";
  step: { subject: string; body: string; html: string; delayDays: number; previousDelay: number } | null;
  saved: { subject: string; body: string; html: string } | null;
}): AutomatedEditor | { error: string } {
  const list = listAutomatedEmails({
    seriesStatus: input.seriesStatus,
    steps: input.key.kind === "series" && input.step
      ? [{ position: input.key.position, delayDays: input.step.delayDays, subject: input.step.subject, body: input.step.body }]
      : [],
    confirmSaved: input.key.kind === "system" && input.key.mode === "confirm" && !!input.saved?.body.trim(),
    confirmSubject: input.saved?.subject || "",
    referralSaved: input.key.kind === "system" && input.key.mode === "referral" && !!input.saved?.body.trim(),
    referralSubject: input.saved?.subject || "",
  });
  if (input.key.kind === "series") {
    const position = input.key.position;
    const row = list.find((v) => v.key === `series-${position}`);
    if (!row) return { error: "That welcome email is not in the series." };
    const body = input.step?.body || "";
    const storedHtml = input.step?.html || "";
    return {
      ok: true,
      key: row.key,
      name: row.name,
      trigger: row.trigger,
      timing: input.step ? seriesTiming(input.key.position, input.step.delayDays, input.step.previousDelay) : row.timing,
      subject: input.step?.subject || "",
      message: body,
      buttonLabel: null,
      mode: "series",
      source: input.step ? "saved" : "missing",
      storedHtml,
      useStoredHtml: !body && !!storedHtml,
      lockNote: LOCK_NOTE,
    };
  }
  const templateName = input.key.templateName;
  const fallback = input.key.mode === "confirm" ? CONFIRM_COPY : REFERRAL_COPY;
  const saved = input.saved?.body.trim() ? input.saved : null;
  const row = list.find((v) => v.key === templateName)!;
  return {
    ok: true,
    key: row.key,
    name: row.name,
    trigger: row.trigger,
    timing: row.timing,
    subject: saved ? saved.subject : fallback.subject,
    message: saved ? saved.body : fallback.body,
    buttonLabel: saved ? systemButtonLabel(saved.html, fallback.buttonLabel) : fallback.buttonLabel,
    mode: input.key.mode,
    source: saved ? "saved" : "built-in",
    storedHtml: "",
    useStoredHtml: false,
    lockNote: LOCK_NOTE,
  };
}

/** Preview uses the same shell the sender queues, then the same footer pass as the worker. */
export function previewAutomated(input: {
  mode: "series" | "confirm" | "referral";
  subject: string;
  message: string;
  buttonLabel?: string | null;
  storedHtml?: string;
  useStoredHtml?: boolean;
}): { subject: string; html: string } {
  if (input.mode === "series") {
    const html = seriesQueuedHtml(
      input.useStoredHtml ? "" : input.message,
      input.useStoredHtml ? (input.storedHtml || "") : "",
      SAMPLE_REFERRAL_LINE,
      SAMPLE_REFERRAL_URL,
    );
    return renderMarketingEmail({
      subject: input.subject || "Subject",
      html,
      fromName: SUNDER_FROM_NAME,
      identity: SUNDER_IDENTITY,
      unsubUrl: "https://saabai.ai/email/u",
      viewUrl: "https://saabai.ai/email/view",
      values: SUNDER_SAMPLE_VALUES,
    });
  }
  const copy: SystemCopy = {
    subject: input.subject,
    body: input.message,
    buttonLabel: input.buttonLabel || "",
  };
  const msg = input.mode === "confirm" ? confirmMessage(copy) : referralLinkMessage(SAMPLE_REFERRAL_URL, copy);
  const html = input.mode === "confirm" ? withReferralLine(msg.html, SAMPLE_REFERRAL_LINE, SAMPLE_REFERRAL_URL) : msg.html;
  return renderMarketingEmail({
    subject: msg.subject,
    html,
    fromName: SUNDER_FROM_NAME,
    identity: SUNDER_IDENTITY,
    unsubUrl: "https://saabai.ai/email/u",
    viewUrl: "https://saabai.ai/email/view",
    confirmUrl: input.mode === "confirm" ? SAMPLE_CONFIRM_URL : undefined,
    values: SUNDER_SAMPLE_VALUES,
  });
}
