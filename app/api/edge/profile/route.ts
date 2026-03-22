import { getEdgeProfile, getEdgeSessions } from "../../../../lib/redis";

export const runtime = "edge";

export async function GET() {
  const [profile, sessions] = await Promise.all([
    getEdgeProfile(),
    getEdgeSessions(10),
  ]);
  return Response.json({ profile, sessions });
}
