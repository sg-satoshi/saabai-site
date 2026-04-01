// Temporary debug endpoint — inspect raw Pipedrive search results
// Usage: GET /api/pipedrive-debug?order=HP-5089

export const runtime = "edge";

const PIPEDRIVE_BASE = "https://api.pipedrive.com/v1";

export async function GET(req: Request) {
  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return Response.json({ error: "No PIPEDRIVE_API_TOKEN" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const order = searchParams.get("order") ?? "";
  const raw = order.trim().toUpperCase();

  // Extract numeric part
  const numericMatch = raw.match(/(\d+)$/);
  const numericPart = numericMatch ? numericMatch[1] : raw;

  // Run both searches so we can compare
  const [fullRes, numericRes] = await Promise.all([
    fetch(`${PIPEDRIVE_BASE}/deals/search?term=${encodeURIComponent(raw)}&exact_match=false&limit=10&api_token=${token}`),
    fetch(`${PIPEDRIVE_BASE}/deals/search?term=${encodeURIComponent(numericPart)}&exact_match=false&limit=10&api_token=${token}`),
  ]);

  const [fullData, numericData] = await Promise.all([fullRes.json(), numericRes.json()]);

  return Response.json({
    input: { order, raw, numericPart },
    fullTermSearch: {
      term: raw,
      status: fullRes.status,
      totalCount: fullData?.data?.items?.length ?? 0,
      items: (fullData?.data?.items ?? []).map((i: any) => ({
        title: i.item?.title,
        stage: i.item?.stage?.name,
        id: i.item?.id,
      })),
    },
    numericSearch: {
      term: numericPart,
      status: numericRes.status,
      totalCount: numericData?.data?.items?.length ?? 0,
      items: (numericData?.data?.items ?? []).map((i: any) => ({
        title: i.item?.title,
        stage: i.item?.stage?.name,
        id: i.item?.id,
      })),
    },
  });
}
