export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, siteSlug } = body;
    if (siteSlug !== "nico-moretti") return Response.json({ ok: false, error: "not nico" });

    // IDENTICAL to the lead handler's early test code
    const t = process.env.TG_NICO_BOT;
    const c = process.env.TELEGRAM_CHAT_ID_NICO_MORETTI;
    if (!t || !c) return Response.json({ ok: false, error: "missing env", t: !!t, c: !!c });

    const res = await fetch(`https://api.telegram.org/bot${t}/sendMessage?chat_id=${c}&text=${encodeURIComponent("MIRROR test: " + name)}`);
    const data = await res.json();

    return Response.json({ ok: data.ok, msgId: data.result?.message_id });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
