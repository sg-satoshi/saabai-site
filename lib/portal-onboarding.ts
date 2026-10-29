/**
 * Guided client onboarding for the existing portal login.
 *
 * Flag: PORTAL_ONBOARDING_MODE = off | allowlist | on. Unset means off.
 * Allowlist: PORTAL_ONBOARDING_ALLOW, comma-separated emails.
 * Neither variable is required. Nothing here changes billing.
 */

export type OnboardingMode = "off" | "allowlist" | "on";
export type OnboardingStatus = "not_started" | "in_progress" | "complete";
export type StepId = "business" | "brand" | "access" | "next" | "lex";
export type AccessChoice = "requested" | "granted" | "not_needed";
export type PortalTier = "lex" | "blueprint" | "website" | "care" | "retainer";
export type OnboardingAction = "save" | "skip" | "goto" | "draft";
export type FieldKind = "text" | "email" | "textarea" | "select" | "access";

export interface OnboardingPayload {
  businessName?: string;
  abn?: string;
  industry?: string;
  serviceArea?: string;
  primaryContact?: string;
  timezone?: string;
  logoNote?: string;
  colours?: string;
  phone?: string;
  contactEmail?: string;
  hours?: string;
  sentence?: string;
  googleBusiness?: AccessChoice;
  domain?: AccessChoice;
  hosting?: AccessChoice;
  socials?: AccessChoice;
  jurisdiction?: string;
  practiceAreas?: string;
}

export interface OnboardingState {
  clientId: string;
  email: string;
  step: StepId;
  status: OnboardingStatus;
  tier: PortalTier;
  payload: OnboardingPayload;
  skipped: StepId[];
  updatedAt: string;
  completedAt?: string;
  notifiedAt?: string;
}

export interface FieldDef {
  key: keyof OnboardingPayload;
  label: string;
  hint?: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
}

export interface StepPresentation {
  id: StepId;
  label: string;
  title: string;
  lede: string;
  fields: FieldDef[];
}

type EnvLike = Record<string, string | undefined>;

export const BASE_STEPS: StepId[] = ["business", "brand", "access", "next"];
export const LEX_STEP: StepId = "lex";

const ACCESS_CHOICES: AccessChoice[] = ["requested", "granted", "not_needed"];
const ACCESS_KEYS = new Set<keyof OnboardingPayload>(["googleBusiness", "domain", "hosting", "socials"]);

const TIMEZONES: { value: string; label: string }[] = [
  { value: "Australia/Brisbane", label: "Brisbane" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Australia/Melbourne", label: "Melbourne" },
  { value: "Australia/Adelaide", label: "Adelaide" },
  { value: "Australia/Perth", label: "Perth" },
  { value: "Australia/Hobart", label: "Hobart" },
  { value: "Australia/Darwin", label: "Darwin" },
  { value: "Pacific/Auckland", label: "Auckland" },
];

const LIMITS: Partial<Record<keyof OnboardingPayload, number>> = {
  businessName: 160,
  abn: 20,
  industry: 120,
  serviceArea: 200,
  primaryContact: 120,
  timezone: 64,
  logoNote: 300,
  colours: 120,
  phone: 40,
  contactEmail: 254,
  hours: 200,
  sentence: 280,
  jurisdiction: 120,
  practiceAreas: 500,
};

const STEP_FIELDS: Record<StepId, (keyof OnboardingPayload)[]> = {
  business: ["businessName", "abn", "industry", "serviceArea", "primaryContact", "timezone"],
  brand: ["logoNote", "colours", "phone", "contactEmail", "hours", "sentence"],
  access: ["googleBusiness", "domain", "hosting", "socials"],
  next: [],
  lex: ["jurisdiction", "practiceAreas"],
};

export function portalOnboardingMode(env: EnvLike = process.env): OnboardingMode {
  const raw = (env.PORTAL_ONBOARDING_MODE ?? "").trim().toLowerCase();
  if (raw === "on" || raw === "allowlist") return raw;
  return "off";
}

export function portalOnboardingAllowed(email: string, env: EnvLike = process.env): boolean {
  const mode = portalOnboardingMode(env);
  if (mode === "off") return false;
  if (mode === "on") return true;
  const allow = (env.PORTAL_ONBOARDING_ALLOW ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const norm = email.trim().toLowerCase();
  return !!norm && allow.includes(norm);
}

export function stepsFor(isLex: boolean): StepId[] {
  return isLex ? [...BASE_STEPS, LEX_STEP] : [...BASE_STEPS];
}

export function resolveTier(input: {
  isLex: boolean;
  hasBlueprint: boolean;
  hasWebsite: boolean;
  hasCare: boolean;
}): PortalTier {
  if (input.isLex) return "lex";
  if (input.hasBlueprint) return "blueprint";
  // An active paid plan on a site means care, even though a site record also sets hasWebsite.
  if (input.hasCare) return "care";
  if (input.hasWebsite) return "website";
  return "retainer";
}

export function nextStepCopy(input: {
  tier: PortalTier;
  hasBlueprint: boolean;
  hasWebsite: boolean;
}): string[] {
  if (input.tier === "lex") {
    const lines = [
      "You are on Lex.",
      "The chatbot can be turned on or off in Manage agent whenever you like.",
      "Saabai uses the details in this checklist for the first deliverable, then confirms a check-in with you.",
    ];
    if (input.hasBlueprint) {
      lines.push("A Blueprint is also on this account. The report stays with that engagement.");
    }
    if (input.hasWebsite) {
      lines.push("A website build is also on this account.");
    }
    return lines;
  }
  if (input.tier === "blueprint") {
    return [
      "You are on the Blueprint.",
      "Your report is part of that engagement.",
      "Saabai uses these details for the first deliverable, then confirms a check-in.",
      "If a chatbot is added later, you can turn it on or off in the admin area whenever you like.",
    ];
  }
  if (input.tier === "website") {
    return [
      "You are on a website build.",
      "Saabai uses these details for the first deliverable, then confirms a check-in.",
      "Where the build includes a chatbot, you can turn it on or off in the admin area whenever you like.",
    ];
  }
  if (input.tier === "care") {
    return [
      "You are on a care plan.",
      "Saabai uses these details to keep the site current.",
      "Where you have a chatbot, you can turn it on or off in the admin area whenever you like.",
      "Saabai will confirm the next check-in after this checklist.",
    ];
  }
  return [
    "You are on a Saabai retainer.",
    "What is included is the work already on your account.",
    "Where you have a chatbot, you can turn it on or off in the admin area whenever you like.",
    "Saabai will confirm the first deliverable date and the check-in after you finish this checklist.",
  ];
}

function accessField(key: keyof OnboardingPayload, label: string): FieldDef {
  return { key, label, kind: "access" };
}

export function fieldsForStep(step: StepId): FieldDef[] {
  if (step === "business") {
    return [
      { key: "businessName", label: "Business name", kind: "text" },
      { key: "abn", label: "ABN or business number", hint: "Optional.", kind: "text" },
      { key: "industry", label: "Industry", kind: "text" },
      { key: "serviceArea", label: "Service area", hint: "Towns or regions you cover.", kind: "text" },
      { key: "primaryContact", label: "Primary contact", kind: "text" },
      { key: "timezone", label: "Timezone", kind: "select", options: TIMEZONES },
    ];
  }
  if (step === "brand") {
    return [
      {
        key: "logoNote",
        label: "Logo",
        hint: "Paste a link, or say where the file lives. Uploading a file is not part of this step.",
        kind: "text",
      },
      { key: "colours", label: "Brand colours", hint: "Names or hex values are fine.", kind: "text" },
      { key: "phone", label: "Phone", kind: "text" },
      { key: "contactEmail", label: "Public email", kind: "email" },
      { key: "hours", label: "Hours", kind: "text" },
      { key: "sentence", label: "What the business does", hint: "One sentence.", kind: "textarea" },
    ];
  }
  if (step === "access") {
    return [
      accessField("googleBusiness", "Google Business Profile"),
      accessField("domain", "Domain registrar"),
      accessField("hosting", "Hosting"),
      accessField("socials", "Social accounts"),
    ];
  }
  if (step === "lex") {
    return [
      { key: "jurisdiction", label: "Jurisdiction", hint: "For example, Queensland, or Commonwealth and NSW.", kind: "text" },
      { key: "practiceAreas", label: "Practice areas", hint: "The areas Lex should stay inside.", kind: "textarea" },
    ];
  }
  return [];
}

const STEP_META: Record<StepId, { label: string; title: string; lede: string }> = {
  business: {
    label: "Business",
    title: "Confirm who we are working with",
    lede: "Check the business details. You can change anything that is wrong.",
  },
  brand: {
    label: "Brand",
    title: "Brand and assets",
    lede: "Later work is built from this. A logo link is enough for now.",
  },
  access: {
    label: "Access",
    title: "Access we need from you",
    lede: "Mark each item as requested, granted, or not needed. You can skip this and come back.",
  },
  next: {
    label: "Next",
    title: "What happens next",
    lede: "This is the work on your account, and how the chatbot control works.",
  },
  lex: {
    label: "Lex",
    title: "Jurisdiction and practice areas",
    lede: "Lex uses this to stay inside the right law. This step is only for Lex clients.",
  },
};

export function presentSteps(isLex: boolean): StepPresentation[] {
  return stepsFor(isLex).map((id) => ({
    id,
    label: STEP_META[id].label,
    title: STEP_META[id].title,
    lede: STEP_META[id].lede,
    fields: fieldsForStep(id),
  }));
}

export function statusLabel(status: OnboardingStatus): string {
  if (status === "complete") return "Complete";
  if (status === "in_progress") return "In progress";
  return "Not started";
}

export function stepLabel(step: StepId | null): string {
  if (!step) return "Not started";
  return STEP_META[step].title;
}

export function freshOnboarding(clientId: string, email: string, now = new Date().toISOString()): OnboardingState {
  return {
    clientId,
    email: email.trim().toLowerCase(),
    step: "business",
    status: "not_started",
    tier: "retainer",
    payload: {},
    skipped: [],
    updatedAt: now,
  };
}

export function sanitiseFields(step: StepId, raw: unknown): Partial<OnboardingPayload> {
  if (!raw || typeof raw !== "object") return {};
  const src = raw as Record<string, unknown>;
  const out: Partial<OnboardingPayload> = {};
  for (const key of STEP_FIELDS[step]) {
    const value = src[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (ACCESS_KEYS.has(key)) {
      if (!ACCESS_CHOICES.includes(trimmed as AccessChoice)) continue;
      out[key] = trimmed as AccessChoice;
      continue;
    }
    const max = LIMITS[key] ?? 200;
    (out as Record<string, string>)[key] = trimmed.slice(0, max);
  }
  return out;
}

function isStep(value: unknown): value is StepId {
  return value === "business" || value === "brand" || value === "access" || value === "next" || value === "lex";
}

export function clampStep(step: StepId, isLex: boolean): StepId {
  const steps = stepsFor(isLex);
  return steps.includes(step) ? step : steps[steps.length - 1];
}

export function applyOnboardingAction(input: {
  state: OnboardingState;
  isLex: boolean;
  action: OnboardingAction;
  step: StepId;
  fields?: unknown;
  now?: string;
}): { state: OnboardingState; justCompleted: boolean } {
  const steps = stepsFor(input.isLex);
  if (!steps.includes(input.step)) {
    return { state: input.state, justCompleted: false };
  }
  const now = input.now ?? new Date().toISOString();
  const wasComplete = input.state.status === "complete";
  let payload = { ...input.state.payload };
  let skipped = input.state.skipped.filter((s) => steps.includes(s));
  let step = input.step;
  let status: OnboardingStatus = input.state.status === "not_started" ? "in_progress" : input.state.status;

  if (input.action === "goto") {
    return {
      state: {
        ...input.state,
        step,
        status: wasComplete ? "in_progress" : status,
        skipped,
        updatedAt: now,
        completedAt: undefined,
      },
      justCompleted: false,
    };
  }

  if (input.action === "draft") {
    payload = { ...payload, ...sanitiseFields(step, input.fields) };
    return {
      state: {
        ...input.state,
        step,
        status: "in_progress",
        payload,
        skipped,
        updatedAt: now,
        completedAt: undefined,
      },
      justCompleted: false,
    };
  }

  if (input.action === "save") {
    payload = { ...payload, ...sanitiseFields(step, input.fields) };
    skipped = skipped.filter((s) => s !== step);
  } else if (input.action === "skip") {
    if (!skipped.includes(step)) skipped.push(step);
  } else {
    return { state: input.state, justCompleted: false };
  }

  const idx = steps.indexOf(step);
  const next = steps[idx + 1];
  let completedAt = input.state.completedAt;
  let justCompleted = false;

  if (!next && input.action === "skip") {
    status = "in_progress";
  } else if (!next && input.action === "save") {
    status = "complete";
    completedAt = now;
    justCompleted = !input.state.notifiedAt;
  } else if (next) {
    step = next;
    status = "in_progress";
    completedAt = undefined;
  }

  return {
    state: {
      ...input.state,
      step,
      status,
      payload,
      skipped,
      updatedAt: now,
      completedAt: status === "complete" ? completedAt : undefined,
    },
    justCompleted,
  };
}

export function normaliseStored(raw: unknown, fallbackEmail: string): OnboardingState | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<OnboardingState>;
  if (!isStep(row.step)) return null;
  if (row.status !== "not_started" && row.status !== "in_progress" && row.status !== "complete") return null;
  const email = typeof row.email === "string" && row.email.includes("@") ? row.email.trim().toLowerCase() : fallbackEmail;
  const tier: PortalTier =
    row.tier === "lex" || row.tier === "blueprint" || row.tier === "website" || row.tier === "care" || row.tier === "retainer"
      ? row.tier
      : "retainer";
  const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
  const skipped = Array.isArray(row.skipped) ? row.skipped.filter(isStep) : [];
  return {
    clientId: typeof row.clientId === "string" && row.clientId ? row.clientId : email,
    email,
    step: row.step,
    status: row.status,
    tier,
    payload,
    skipped,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date(0).toISOString(),
    ...(typeof row.completedAt === "string" ? { completedAt: row.completedAt } : {}),
    ...(typeof row.notifiedAt === "string" ? { notifiedAt: row.notifiedAt } : {}),
  };
}

export function toClientState(state: OnboardingState) {
  return {
    step: state.step,
    status: state.status,
    tier: state.tier,
    payload: state.payload,
    skipped: state.skipped,
    updatedAt: state.updatedAt,
    completedAt: state.completedAt ?? null,
  };
}

/** Every client-facing sentence, for the copy guard. */
export function allOnboardingCopy(): string {
  const tiers: PortalTier[] = ["lex", "blueprint", "website", "care", "retainer"];
  const parts: string[] = [];
  for (const step of presentSteps(true)) {
    parts.push(step.label, step.title, step.lede);
    for (const field of step.fields) {
      parts.push(field.label, field.hint ?? "");
      for (const opt of field.options ?? []) parts.push(opt.label, opt.value);
    }
  }
  for (const tier of tiers) {
    parts.push(...nextStepCopy({ tier, hasBlueprint: true, hasWebsite: true }));
    parts.push(...nextStepCopy({ tier, hasBlueprint: false, hasWebsite: false }));
  }
  parts.push(
    "Not now",
    "Skip this step",
    "Save and continue",
    "Finish",
    "Back",
    "Setup checklist",
    "You can leave this and come back. The rest of the portal stays open.",
    "Requested",
    "Granted",
    "Not needed",
  );
  return parts.join("\n");
}
