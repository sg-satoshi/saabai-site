export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];
    return Response.json({ ok: true, received: messages.length });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
}

export async function GET() {
  return Response.json({ ok: true, route: "plon/chat" });
}
