/**
 * GET /api/portal/workspace
 * Returns which portal modules have real data for the signed-in client.
 */
import { verifySession } from "../../../../lib/portal-session";
import { readImpersonationFromRequest } from "../../../../lib/impersonation";
import { getLexClients } from "../../../../lib/lex-config";
import { listEngagements } from "../../../../lib/audit-store";
import { listRequests } from "../../../../lib/client-requests";
import { getPortalUser } from "../../../../lib/portal-users";
import { getDirectoryUser } from "../../../../lib/user-directory";
import { listSites } from "../../../../lib/site-registry";
import { classifySubscription } from "../../../../lib/subscription-classify";
import { creditModelForEngagements, resolveDeliveredAt, tierCreditName } from "../../../../lib/blueprint-credit";
import Stripe from "stripe";

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

async function findWebsiteCareForEmail(email: string): Promise<{
  site: Awaited<ReturnType<typeof listSites>>[number] | null;
  care: { amountCents: number; status: string; description: string } | null;
}> {
  let site: Awaited<ReturnType<typeof listSites>>[number] | null = null;
  try {
    const sites = await listSites();
    site =
      sites.find((s) => (s.business?.email || "").toLowerCase() === email) ||
      null;
  } catch {
    site = null;
  }

  let care: { amountCents: number; status: string; description: string } | null = null;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" as any });
      const customers = await stripe.customers.list({ email, limit: 5 });
      for (const customer of customers.data) {
        const subs = await stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
          limit: 20,
        });
        for (const sub of subs.data) {
          const productType = classifySubscription(sub.metadata || {});
          if (productType !== "website_care") continue;
          if (sub.status !== "active" && sub.status !== "trialing" && sub.status !== "past_due") {
            continue;
          }
          const monthlyItem = sub.items.data.find(
            (item) => item.price?.recurring?.interval === "month",
          );
          care = {
            amountCents: monthlyItem?.price?.unit_amount ?? 0,
            status: sub.status,
            description: sub.metadata?.description || "Care plan",
          };
          break;
        }
        if (care) break;
      }
    } catch {
      /* ignore */
    }
  }

  return { site, care };
}

export async function GET(req: Request) {
  const sessionToken = parseCookie(req.headers.get("cookie"), "portal_session");
  if (!sessionToken) return Response.json({ authenticated: false }, { status: 401 });
  const session = verifySession(sessionToken);
  if (!session) return Response.json({ authenticated: false }, { status: 401 });

  const impersonation = readImpersonationFromRequest(req);
  const email = session.email.toLowerCase();
  const lexFirm = getLexClients().find((c) => c.email.teamEmail.toLowerCase() === email);
  const portalUser = await getPortalUser(email);
  const dirUser = await getDirectoryUser(email);
  const { site, care } = await findWebsiteCareForEmail(email);

  let blueprints: Awaited<ReturnType<typeof listEngagements>> = [];
  try {
    blueprints = (await listEngagements()).filter(
      (e) => (e.contactEmail || "").toLowerCase() === email,
    );
  } catch {
    blueprints = [];
  }

  const clientId = lexFirm?.id || site?.id || dirUser?.id || portalUser?.id || "";
  let requests: Awaited<ReturnType<typeof listRequests>> = [];
  try {
    if (clientId) requests = await listRequests({ clientId });
  } catch {
    requests = [];
  }

  const name =
    dirUser?.name ||
    portalUser?.name ||
    site?.business?.name ||
    lexFirm?.firmName ||
    email.split("@")[0];
  const business =
    site?.business?.name || lexFirm?.firmName || dirUser?.name || portalUser?.name || "";
  const role = (dirUser as { role?: string } | null)?.role === "billing" ? "Billing" : "Owner";

  const modules = {
    lex: !!lexFirm,
    blueprint: blueprints.length > 0,
    projects: !!site,
    care: !!care,
    invoices: !!care,
    requests: true,
    account: true,
  };

  const products: PortalProduct[] = [];
  if (lexFirm) {
    const lexSite = (lexFirm as { website?: string }).website || "";
    products.push({
      id: `lex-${lexFirm.id}`,
      kind: "lex",
      name: "Lex agent",
      detail: `Lex ${lexFirm.agentName ? "Professional" : "plan"}${lexSite ? ` · ${lexSite.replace(/^https?:\/\//, "")}` : lexFirm.agentName ? ` · Agent "${lexFirm.agentName}"` : ""}`,
      status: "Active",
      statusTone: "ok",
      stat: "Open Manage agent for settings and test",
      openPage: "lex-agent",
      icon: "lx",
    });
  }
  if (site) {
    const domain = site.domains?.[0] || site.url.replace(/^https?:\/\//, "");
    products.push({
      id: `site-${site.id}`,
      kind: "website",
      name: "Website",
      detail: `${site.name} · ${domain}`,
      status: site.status === "live" ? "Live" : site.status,
      statusTone: site.status === "live" ? "ok" : "info",
      stat: site.url ? `Open ${domain}` : "Hosted with Saabai",
      openPage: "projects",
      icon: "ws",
    });
  }
  if (care) {
    const dollars = (care.amountCents / 100).toLocaleString("en-AU", {
      style: "currency",
      currency: "AUD",
    });
    products.push({
      id: `care-${email}`,
      kind: "care",
      name: "Care plan",
      detail: `${dollars}/mo · hosting and updates`,
      status: care.status === "active" || care.status === "trialing" ? "Active" : care.status,
      statusTone: care.status === "active" || care.status === "trialing" ? "ok" : "warn",
      stat: care.description || "Monthly care plan",
      openPage: "invoices",
      icon: "cr",
    });
  }
  for (const b of blueprints) {
    const deliveredAt = resolveDeliveredAt(b);
    const delivered = !!deliveredAt || /deliver|complete|done/i.test(b.status || "");
    const items = b.assessment?.opportunities?.length;
    const deliveredLabel = deliveredAt
      ? new Date(deliveredAt).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "Australia/Brisbane",
        })
      : null;
    products.push({
      id: `bp-${b.id}`,
      kind: "blueprint",
      name: `${tierCreditName(b.tier)} Blueprint`,
      detail: deliveredLabel
        ? `Delivered ${deliveredLabel}`
        : `${b.status || "In progress"} · ${b.firmName || "Your Blueprint"}`,
      status: delivered ? "Delivered" : b.status || "In progress",
      statusTone: delivered ? "ok" : "info",
      stat: items != null ? `${items} opportunities in your report` : "Open full report",
      openPage: "blueprint",
      icon: "bp",
    });
  }

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
    site: site
      ? {
          id: site.id,
          name: site.name,
          url: site.url,
          status: site.status,
          domains: site.domains || [],
        }
      : null,
    care,
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
    credit: creditModelForEngagements(blueprints, new Date()),
    impersonating: impersonation
      ? {
          name: impersonation.clientName,
          email: impersonation.clientEmail,
          clientId: impersonation.clientId,
          returnTo: impersonation.returnTo,
          expiresAt: new Date(impersonation.exp).toISOString(),
          readOnly: true as const,
        }
      : null,
  });
}
