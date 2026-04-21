import { getEdgeTranscript } from "../../../../../lib/redis";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const transcript = await getEdgeTranscript(id);

  return Response.json({ transcript });
}