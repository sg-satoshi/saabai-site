export const runtime = "edge";

export async function GET(req: Request) {
  const token = process.env.PIPEDRIVE_API_TOKEN;
  if (!token) return Response.json({ error: "No token" });

  const url = new URL(req.url);
  const term = url.searchParams.get("term") ?? "PLON-36135";

  const [searchRes, stagesRes] = await Promise.all([
    fetch(`https://api.pipedrive.com/v1/deals/search?term=${encodeURIComponent(term)}&fields=title&exact_match=false&api_token=${token}`),
    fetch(`https://api.pipedrive.com/v1/stages?api_token=${token}`),
  ]);

  const [searchData, stagesData] = await Promise.all([
    searchRes.json(),
    stagesRes.json(),
  ]);

  // Also fetch full deal if found
  const dealId = searchData?.data?.items?.[0]?.item?.id;
  const dealData = dealId
    ? await fetch(`https://api.pipedrive.com/v1/deals/${dealId}?api_token=${token}`).then(r => r.json())
    : null;

  return Response.json({
    search: { status: searchRes.status, data: searchData },
    stages: { status: stagesRes.status, data: stagesData },
    dealDirect: dealData,
  });
}
