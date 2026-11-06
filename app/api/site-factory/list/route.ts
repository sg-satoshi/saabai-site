import { listFactorySites } from "../../../../lib/factory-sites";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ success: true, sites: await listFactorySites() });
}
