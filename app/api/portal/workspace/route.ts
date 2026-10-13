/**
 * GET /api/portal/workspace
 * Returns which portal modules have real data for the signed-in client.
 */
import { verifySession } from "../../../../lib/portal-session";
import { getLexClients } from "../../../../lib/lex-config";
import { listEngagements } from "../../../../lib/audit-store";
import { listRequests } from "../../../../lib/client-requests";
import { getPortalUser } from "../../../../lib/portal-users";
import { getDirectoryUser } from "../../../../lib/user-directory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export type PortalProduct = {
  id: string;
  kind: "lex" | "blueprint" | "website" | "care";
  name: string;
  detail: string;
  status: string;
  statusTone: "ok" | "info" | "warn" | "n";
  stat: string;
  openPage: string;
  icon: "lx" | "bp" | "ws" | "cr";
};

export async function GET(req: Request) {
  const sessionToken = parseCookie(req.headers.get("cookie"), "portal_session");
  if (!sessionToken) return Response.json({ authenticated: false }, { status: 401 });
  const session = verifySession(sessionToken);
  if (!session) return Response.json({ authenticated: false }, { status: 401 });

  const email = session.email.toLowerCase();
  const lexFirm = getLexClients().find((c) => c.email.teamEmail.toLowerCase() === email);
  const portalUser = await getPortalUser(email);
  const dirUser = await getDirectoryUser(email);

  let blueprints: Awaited<ReturnType<typeof listEngagements>> = [];
  try {
    blueprints = (await listEngagements()).filter(
      (e) => (e.contactEmail || "").toLowerCase() === email,
    );
  } catch {
    blueprints = [];
  }

  const clientId = lexFirm?.id || dirUser?.id || portalUser?.id || "";
  let requests: Awaited<ReturnType<typeof listRequests>> = [];
  try {
    if (clientId) requests = await listRequests({ clientId });
  } catch {
    requests = [];
  }

  const name = dirUser?.name || portalUser?.name || lexFirm?.firmName || email.split("@")[0];
  const business = lexFirm?.firmName || dirUser?.name || portalUser?.name || "";
  const role = (dirUser as { role?: string } | null)?.role === "billing" ? "Billing" : "Owner";

  const modules = {
    lex: !!lexFirm,
    blueprint: blueprints.length > 0,
    projects: false, // wire when Site Factory / build data is available for this client
    care: false, // wire when care plan subscription is linked
    invoices: false, // wire when Stripe customer invoices are linked
    requests: true,
    account: true,
  };

  const products: PortalProduct[] = [];
  if (lexFirm) {
    const site = (lexFirm as { website?: string }).website || "";
    products.push({
      id: `lex-${lexFirm.id}`,
      kind: "lex",
      name: "Lex agent",
      detail: `Lex ${lexFirm.agentName ? "Professional" : "plan"}${site ? ` · ${site.replace(/^https?:\/\//, "")}` : lexFirm.agentName ? ` · Agent "${lexFirm.agentName}"` : ""}`,
      status: "Active",
      statusTone: "ok",
      stat: "Open Manage agent for settings and test",
      openPage: "lex-agent",
      icon: "lx",
    });
  }
  for (const b of blueprints) {
    const delivered = /deliver|complete|done/i.test(b.status || "");
    const items = b.assessment?.opportunities?.length;
    products.push({
      id: `bp-${b.id}`,
      kind: "blueprint",
      name: `${b.tier || "Blueprint"} Blueprint`,
      detail: delivered
        ? `Delivered ${new Date(b.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}`
        : `${b.status || "In progress"} · ${b.firmName || "Your Blueprint"}`,
      status: delivered ? "Delivered" : b.status || "In progress",
      statusTone: delivered ? "ok" : "info",
      stat: items != null ? `${items} opportunities in your report` : "Open full report",
      openPage: "blueprint",
      icon: "bp",
    });
  }
  // Website / care rows only when real data exists (modules.projects / modules.care).

  return Response.json({
    authenticated: true,
    email,
    name,
    business,
    role,
    clientId,
    agentName: lexFirm?.agentName ?? null,
    plan: lexFirm ? "Professional" : null,
    modules,
    products,
    blueprints: blueprints.map((b) => ({
      id: b.id,
      tier: b.tier,
      status: b.status,
      createdAt: b.createdAt,
      businessName: b.firmName,
      score: b.assessment?.opportunities?.length ?? null,
      opportunityCount: b.assessment?.opportunities?.length ?? null,
    })),
    requests: requests.slice(0, 20).map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    openRequestCount: requests.filter((r) => r.status !== "done").length,
  });
}
