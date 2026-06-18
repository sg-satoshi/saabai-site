export const runtime = "edge";

export async function GET() {
  try {
    const token = process.env.TG_NICO_BOT || process.env.TELEGRAM_BOT_TOKEN_NICO_MORETTI;
    const chatId = process.env.TELEGRAM_CHAT_ID_NICO_MORETTI;
    if (!token || !chatId) {
      return Response.json({ ok: false, error: "Missing vars", tg: !!process.env.TG_NICO_BOT, long: !!process.env.TELEGRAM_BOT_TOKEN_NICO_MORETTI, chat: !!chatId });
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent("Edge env test - new name TG_NICO_BOT works")}`);
    const data = await res.json();
    return Response.json({ ok: data.ok, msgId: data.result?.message_id, token: !!token, chat: !!chatId });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message });
  }
}
