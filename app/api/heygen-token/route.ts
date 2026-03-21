export const runtime = "edge";

export async function POST() {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) return new Response("HeyGen not configured", { status: 500 });

  const res = await fetch("https://api.heygen.com/v1/streaming.create_token", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    return new Response(`HeyGen error ${res.status}: ${body}`, { status: res.status });
  }

  const data = await res.json();
  return Response.json({ token: data.data?.token });
}
