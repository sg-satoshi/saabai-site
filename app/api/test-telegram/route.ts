export const runtime = "edge";

export async function GET() {
  try {
    const token = "8697337660:AAG7s4l3U4FZAykt91u8AKDEA11hpKTp1HY";
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=5066504835&text=🔔%20Test%20from%20Edge%20runtime%20-%20if%20you%20see%20this%2C%20outbound%20fetch%20works!&parse_mode=Markdown`);
    const data = await res.json();
    return Response.json({ ok: res.ok, data });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
