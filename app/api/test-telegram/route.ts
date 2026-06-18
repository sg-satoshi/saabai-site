export const runtime = "edge";

export async function POST(req: Request) {
  const results: string[] = [];

  try {
    // Parse body just like the lead handler
    const body = await req.json().catch(() => ({}));
    const { name, phone } = body;

    // Test: same pattern as lead handler
    const t = "8697337660:AAG7s4l3U4FZAykt91u8AKDEA11hpKTp1HY";
    const c = "5066504835";
    const msg = `POST test: ${name || "?"} - ${phone || "?"}`;
    const url = `https://api.telegram.org/bot${t}/sendMessage?chat_id=${c}&text=${encodeURIComponent(msg)}`;
    const r = await fetch(url);
    const d = await r.json();
    results.push(`POST test: ${d.ok ? "OK msg=" + (d.result?.message_id || "?") : "FAIL " + JSON.stringify(d)}`);

    return Response.json({ ok: true, results });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
