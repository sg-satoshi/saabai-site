import { getNewsData } from "../../../lib/news";

export const revalidate = 1800; // cache 30 minutes

export async function GET() {
  const { all, updatedAt } = await getNewsData({ redditLimit: 4, newsLimit: 4 });
  return Response.json({ items: all, updatedAt });
}
