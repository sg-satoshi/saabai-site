/**
 * LeadGen — List leads for a client
 */

import { NextRequest } from "next/server";
import { getLeads } from "../../../../lib/leadgen-config";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  if (!slug) {
    return Response.json({ error: "slug required" }, { status: 400 });
  }

  const leads = await getLeads(slug, Math.min(limit, 100));
  return Response.json({ leads });
}
