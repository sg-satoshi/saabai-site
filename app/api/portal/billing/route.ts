/**
 * GET/POST /api/portal/billing  (portal_session; read-only while impersonating)
 * Plans, add-ons and this site's billing. Actions: change-plan, add-addon,
 * remove-addon, quote, manage, cancel.
 */
import { after } from "next/server";
import { rejectIfImpersonatingReadOnly } from "../../../../lib/impersonation";
import { rejectIfLoginAs } from "../../../../lib/login-as";
import { resolvePortalBilling } from "../../../../lib/billing/portal-auth";
import { getCatalog, visibleAddons, visiblePlans } from "../../../../lib/billing/catalog";
import { planChangeKind, prorate, STATUS_LABELS } from "../../../../lib/billing/state";
import { saveSiteBilling } from "../../../../lib/billing/store";
import { enableFeature } from "../../../../lib/addons/flags";
import { addMonthlyAddon, billingPortalUrl, cancelAtPeriodEnd, changePlan, oneOffAddonCheckout, removeMonthlyAddon, siteUrl, stripeConfigured } from "../../../../lib/billing/stripe-ops";
import { createRequest } from "../../../../lib/client-requests";
import { sendBrandedEmail } from "../../../../lib/email/branded-layout";
import { quoteRequestAdminEmail } from "../../../../lib/billing/emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RETURN = () => `${siteUrl()}/client-portal?page=upgrades`;

export async function GET(req: Request) {
  const who = await resolvePortalBilling(req);
  if (!who) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const catalog = await getCatalog();
  const r = who.rec;
  return Response.json({
    site: who.siteId ? { id: who.siteId, name: who.siteName, domain: who.domain || null } : null,
    gstRegistered: catalog.gstRegistered,
    plans: visiblePlans(catalog),
    addons: visibleAddons(catalog),
    billing: r
      ? {
          status: r.status, statusLabel: STATUS_LABELS[r.status], planId: r.planId, planName: r.planName, monthlyCents: r.monthlyCents,
          currentPeriodStart: r.currentPeriodStart || null, currentPeriodEnd: r.currentPeriodEnd || null, pendingPlan: r.pendingPlan || null,
          addons: r.addons, canManage: !!r.stripeCustomerId,
        }
      : null,
  });
}

export async function POST(req: Request) {
  const loginAs = rejectIfLoginAs(req);
  if (loginAs) return loginAs;
  const blocked = rejectIfImpersonatingReadOnly(req);
  if (blocked) return blocked;
  const who = await resolvePortalBilling(req);
  if (!who) return Response.json({ error: "Not authenticated" }, { status: 401 });
  let body: { action?: string; planId?: string; addonId?: string; notes?: string; confirm?: boolean };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  const catalog = await getCatalog();
  const rec = who.rec;

  if (body.action === "quote") {
    const addon = catalog.addons.find((a) => a.id === body.addonId && a.visible);
    if (!addon) return Response.json({ error: "Unknown add-on" }, { status: 400 });
    const notes = String(body.notes || "").slice(0, 2000);
    const created = await createRequest({
      clientId: who.siteId || `portal:${who.email}`, clientName: rec?.contact.name || who.email, clientEmail: who.email,
      siteId: who.siteId || undefined, siteName: who.siteName || undefined,
      title: `Quote: ${addon.name}`, description: notes || `Please quote ${addon.name} for my site.`, type: "new_feature", priority: "normal", screenshots: [],
    });
    after(() => sendBrandedEmail({ to: "hello@saabai.ai", email: quoteRequestAdminEmail({ siteName: who.siteName || who.email, addonName: addon.name, clientEmail: who.email, notes }) }).then(() => undefined));
    return Response.json({ ok: true, requestId: created.id });
  }

  if (!rec) return Response.json({ error: "Billing isn't set up for your site yet. Contact Saabai and we'll sort it." }, { status: 400 });
  const live = ["active", "cancelling"].includes(rec.status) && !!rec.stripeSubscriptionId;

  if (body.action === "manage") {
    if (!rec.stripeCustomerId || !stripeConfigured()) return Response.json({ error: "Billing management isn't available yet" }, { status: 400 });
    return Response.json({ url: await billingPortalUrl(rec.stripeCustomerId, RETURN()) });
  }

  if (body.action === "change-plan") {
    const plan = catalog.plans.find((p) => p.id === body.planId && p.visible);
    if (!plan) return Response.json({ error: "Unknown plan" }, { status: 400 });
    const kind = planChangeKind(rec.monthlyCents, plan.priceCents);
    if (kind === "same") return Response.json({ error: "That's your current price" }, { status: 400 });
    const proratedCents = rec.currentPeriodStart && rec.currentPeriodEnd ? prorate(plan.priceCents - rec.monthlyCents, rec.currentPeriodStart, rec.currentPeriodEnd) : plan.priceCents - rec.monthlyCents;
    if (!body.confirm) return Response.json({ quote: { kind, planName: plan.name, monthlyCents: plan.priceCents, proratedCents: Math.max(0, proratedCents), effectiveAt: kind === "upgrade" ? new Date().toISOString() : rec.currentPeriodEnd } });
    if (!live || !stripeConfigured()) return Response.json({ error: "Your billing needs to be active to change plans" }, { status: 400 });
    await changePlan(rec, { planId: plan.id, planName: plan.name, monthlyCents: plan.priceCents }, kind);
    const next = kind === "upgrade"
      ? { ...rec, planId: plan.id, planName: plan.name, monthlyCents: plan.priceCents, priceVersion: plan.priceVersion, pendingPlan: undefined }
      : { ...rec, pendingPlan: { planId: plan.id, planName: plan.name, monthlyCents: plan.priceCents, effectiveAt: rec.currentPeriodEnd || new Date().toISOString() } };
    await saveSiteBilling(next, `${kind === "upgrade" ? "Upgraded" : "Downgrade scheduled"} to ${plan.name}`);
    return Response.json({ ok: true, kind });
  }

  if (body.action === "add-addon") {
    const addon = catalog.addons.find((a) => a.id === body.addonId && a.visible && a.checkout === "stripe");
    if (!addon) return Response.json({ error: "Unknown add-on" }, { status: 400 });
    if (rec.addons.some((a) => a.addonId === addon.id && a.status === "active")) return Response.json({ error: "You already have this add-on" }, { status: 400 });
    if (!body.confirm) {
      const proratedCents = addon.billing === "monthly" && rec.currentPeriodStart && rec.currentPeriodEnd ? prorate(addon.priceCents, rec.currentPeriodStart, rec.currentPeriodEnd) : addon.priceCents;
      return Response.json({ quote: { name: addon.name, billing: addon.billing, priceCents: addon.priceCents, proratedCents } });
    }
    if (!stripeConfigured()) return Response.json({ error: "Checkout isn't available yet" }, { status: 400 });
    if (addon.billing === "one_off") return Response.json({ url: await oneOffAddonCheckout(rec, addon, RETURN()) });
    if (!live) return Response.json({ error: "Your billing needs to be active to add monthly extras" }, { status: 400 });
    const itemId = await addMonthlyAddon(rec, addon);
    if (addon.feature) await enableFeature(rec.siteId, addon.feature);
    const addons = rec.addons.filter((a) => a.addonId !== addon.id);
    addons.push({ addonId: addon.id, status: "active", subscriptionItemId: itemId, priceCents: addon.priceCents, billing: "monthly", addedAt: new Date().toISOString() });
    await saveSiteBilling({ ...rec, addons }, `Add-on added: ${addon.name}`);
    return Response.json({ ok: true });
  }

  if (body.action === "remove-addon") {
    const cur = rec.addons.find((a) => a.addonId === body.addonId && a.status === "active" && a.billing === "monthly");
    if (!cur) return Response.json({ error: "Add-on not found" }, { status: 400 });
    if (cur.subscriptionItemId && stripeConfigured()) await removeMonthlyAddon(cur.subscriptionItemId);
    const addons = rec.addons.map((a) => (a === cur ? { ...a, status: "removing" as const, endsAt: rec.currentPeriodEnd || new Date().toISOString() } : a));
    await saveSiteBilling({ ...rec, addons }, `Add-on removal scheduled: ${cur.addonId}`);
    return Response.json({ ok: true, endsAt: rec.currentPeriodEnd || null });
  }

  if (body.action === "cancel") {
    if (!rec.stripeSubscriptionId || !stripeConfigured()) return Response.json({ error: "Nothing to cancel" }, { status: 400 });
    await cancelAtPeriodEnd(rec.stripeSubscriptionId);
    await saveSiteBilling({ ...rec, status: "cancelling" }, "Client cancelled (end of cycle)");
    return Response.json({ ok: true, endsAt: rec.currentPeriodEnd || null });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
