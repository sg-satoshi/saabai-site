import { getLeads, getConversations, getGrowthStats } from "../../../lib/redis";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "stats";

  try {
    if (type === "leads") {
      const leads = await getLeads(50);
      return Response.json({ leads });
    }

    if (type === "conversations") {
      const conversations = await getConversations(30);
      return Response.json({ conversations });
    }

    const stats = await getGrowthStats();
    return Response.json(stats);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}