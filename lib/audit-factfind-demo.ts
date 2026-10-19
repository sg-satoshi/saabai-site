/**
 * Preview-only demo fact-find link, so the form can be reviewed on a Vercel
 * preview without a real purchase or touching live engagement data.
 *
 *   /audit/factfind/preview-demo            (Starter)
 *   /audit/factfind/preview-demo-pro        (Pro)
 *   /audit/factfind/preview-demo-business   (Business)
 *
 * Disabled in production: the tokens are only recognised when VERCEL_ENV is
 * "preview" or the app runs in development. Nothing is stored or emailed.
 */

import { AuditEngagement, AuditTier } from "./audit-types";

const DEMO_TOKENS: Record<string, AuditTier> = {
  "preview-demo": "starter",
  "preview-demo-pro": "pro",
  "preview-demo-business": "business",
};

export function demoFactFindEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.VERCEL_ENV === "preview" || (env.NODE_ENV === "development" && env.VERCEL_ENV !== "production");
}

export function isDemoFactFindToken(token: string, env: Record<string, string | undefined> = process.env): boolean {
  return demoFactFindEnabled(env) && Object.prototype.hasOwnProperty.call(DEMO_TOKENS, token);
}

export function demoEngagement(token = "preview-demo"): AuditEngagement {
  const now = new Date().toISOString();
  return {
    id: "aud_preview_demo",
    createdAt: now,
    updatedAt: now,
    tier: DEMO_TOKENS[token] ?? "starter",
    status: "questionnaire_sent",
    firmName: "Preview Demo Pty Ltd",
    firmType: "other",
    contactName: "Demo Customer",
    contactEmail: "demo@example.com",
    stakeholders: [],
    tools: [],
    workflows: [],
    goals: [],
    factFindToken: token,
    responses: {},
    notes: [],
  };
}
