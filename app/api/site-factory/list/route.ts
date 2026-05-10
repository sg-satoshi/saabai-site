import { listSites } from "../../../../lib/site-registry";

export const runtime = "edge";

export async function GET() {
  try {
    const sites = await listSites();
    return Response.json({ success: true, sites });
  } catch (error) {
    console.error("List sites error:", error);
    return Response.json({ error: "Failed to list sites" }, { status: 500 });
  }
}
