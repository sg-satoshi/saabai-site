/**
 * GET /api/portal/onboarding
 * PUT /api/portal/onboarding
 *
 * Signed-in portal clients only. The flag defaults to off.
 * Writes sit on the existing client record. Completion emails Saabai admin only.
 * This route does not post a lead.
 */
import { verifySession } from "../../../../lib/portal-session";
import { rejectIfImpersonatingReadOnly } from "../../../../lib/impersonation";
import { portalOnboardingAllowed, type OnboardingAction, type StepId } from "../../../../lib/portal-onboarding";
import { buildOnboardingView } from "../../../../lib/portal-onboarding-context";
import { saveOnboardingProgress } from "../../../../lib/portal-onboarding-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS: OnboardingAction[] = ["save", "skip", "goto", "draft"];
const STEPS: StepId[] = ["business", "brand", "access", "next", "lex"];

function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) return trimmed.slice(eq + 1);
  }
  return undefined;
}

function sessionEmail(req: Request): string | null {
  const token = parseCookie(req.headers.get("cookie"), "portal_session");
  if (!token) return null;
  const session = verifySession(token);
  return session?.email?.trim().toLowerCase() || null;
}

export async function GET(req: Request) {
  const email = sessionEmail(req);
  if (!email) return Response.json({ authenticated: false }, { status: 401 });
  try {
    const view = await buildOnboardingView(email);
    return Response.json(view);
  } catch (err) {
    console.error("[portal/onboarding] get", err instanceof Error ? err.name : "error");
    return Response.json({ error: "Could not load onboarding." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const blocked = rejectIfImpersonatingReadOnly(req);
  if (blocked) return blocked;
  const email = sessionEmail(req);
  if (!email) return Response.json({ authenticated: false }, { status: 401 });
  if (!portalOnboardingAllowed(email)) return Response.json({ enabled: false }, { status: 403 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Send the step you are saving." }, { status: 400 });
  }
  const action = body.action;
  const step = body.step;
  if (typeof action !== "string" || !ACTIONS.includes(action as OnboardingAction)) {
    return Response.json({ error: "Unknown action." }, { status: 400 });
  }
  if (typeof step !== "string" || !STEPS.includes(step as StepId)) {
    return Response.json({ error: "Unknown step." }, { status: 400 });
  }

  try {
    const view = await buildOnboardingView(email);
    if (!view.enabled) return Response.json({ enabled: false }, { status: 403 });
    if (!view.steps.some((s) => s.id === step)) {
      return Response.json({ error: "That step is not on this account." }, { status: 400 });
    }
    const saved = await saveOnboardingProgress({
      email,
      clientId: view.clientId,
      name: view.name,
      tier: view.tier,
      isLex: view.isLex,
      action: action as OnboardingAction,
      step: step as StepId,
      fields: body.fields,
    });
    const next = await buildOnboardingView(email);
    return Response.json({ ...next, notified: saved.notified });
  } catch (err) {
    console.error("[portal/onboarding] put", err instanceof Error ? err.name : "error");
    return Response.json({ error: "Could not save this step." }, { status: 500 });
  }
}
