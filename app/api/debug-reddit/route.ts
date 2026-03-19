export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = "https://www.reddit.com/r/AINews/hot.rss";

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "saabai-news/1.0 (https://saabai.ai)" },
    });

    const text = await res.text();
    const entryCount = (text.match(/<entry[\s>]/g) ?? []).length;
    const itemCount = (text.match(/<item[\s>]/g) ?? []).length;

    return Response.json({
      status: res.status,
      ok: res.ok,
      contentType: res.headers.get("content-type"),
      bodyLength: text.length,
      entryCount,
      itemCount,
      preview: text.slice(0, 500),
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
