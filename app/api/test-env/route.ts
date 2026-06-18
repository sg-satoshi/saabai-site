export const runtime = "edge";

export async function GET() {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN_NICO_MORETTI;
    const chatId = process.env.TELEGRAM_CHAT_ID_NICO_MORETTI;
    if (!token || !chatId) {
      return Response.json({ ok: false, error: "Missing env vars", token: !!token, chatId: !!chatId });
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent("Edge env var test - from LEAD handler's env")}`);
    const data = await res.json();
    return Response.json({ ok: data.ok, msgId: data.result?.message_id });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message });
  }
}
