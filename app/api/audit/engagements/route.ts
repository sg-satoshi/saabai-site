/**
 * GET  /api/audit/engagements — list all audit engagements (admin)
 * POST /api/audit/engagements — create a new engagement (admin)
 */

import { requireAdmin } from "../../../../lib/audit-admin";
import { createEngagement, listEngagements } from "../../../../lib/audit-store";
import { AuditTier, FirmType } from "../../../../lib/audit-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIERS: AuditTier[] = ["essential", "professional", "enterprise"];
const FIRM_TYPES: FirmType[] = [
  "law",
  "accounting",
  "real-estate",
  "financial-advisory",
  "other",
];

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const engagements = await listEngagements();
  return Response.json({ engagements });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tier = body.tier as AuditTier;
  const firmType = body.firmType as FirmType;
  const firmName = String(body.firmName ?? "").trim();
  const contactName = String(body.contactName ?? "").trim();
  const contactEmail = String(body.contactEmail ?? "").trim();

  if (!TIERS.includes(tier))
    return Response.json({ error: "Invalid tier" }, { status: 400 });
  if (!FIRM_TYPES.includes(firmType))
    return Response.json({ error: "Invalid firmType" }, { status: 400 });
  if (!firmName || !contactName || !contactEmail)
    return Response.json(
      { error: "firmName, contactName and contactEmail are required" },
      { status: 400 }
    );

  const engagement = await createEngagement({
    tier,
    firmType,
    firmName,
    contactName,
    contactEmail,
    contactPhone: body.contactPhone ? String(body.contactPhone) : undefined,
    firmSize: body.firmSize ? String(body.firmSize) : undefined,
    website: body.website ? String(body.website) : undefined,
    location: body.location ? String(body.location) : undefined,
    stripeRef: body.stripeRef ? String(body.stripeRef) : undefined,
  });

  if (!engagement)
    return Response.json({ error: "Storage unavailable" }, { status: 503 });

  return Response.json({ engagement }, { status: 201 });
}
