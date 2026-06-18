export const runtime = "edge";

export async function GET() {
  const results: string[] = [];

  try {
    // Test 1: Basic fetch to Telegram
    const t1 = await fetch("https://api.telegram.org/bot8697337660:AAG7s4l3U4FZAykt91u8AKDEA11hpKTp1HY/sendMessage?chat_id=5066504835&text=Test%201%20-%20basic%20fetch");
    const r1 = await t1.json();
    results.push(`Test 1 (basic fetch): ${r1.ok ? "OK" : "FAIL"} msg_id=${r1.result?.message_id || "?"}`);

    // Test 2: Fetch with process.env lookup
    const token = process.env.TELEGRAM_BOT_TOKEN_NICO_MORETTI || "8697337660:AAG7s4l3U4FZAykt91u8AKDEA11hpKTp1HY";
    const chat = process.env.TELEGRAM_CHAT_ID_NICO_MORETTI || "5066504835";
    const t2 = await fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat}&text=Test%202%20-%20env%20vars`);
    const r2 = await t2.json();
    results.push(`Test 2 (env vars): ${r2.ok ? "OK" : "FAIL"} msg_id=${r2.result?.message_id || "?"}`);

    // Test 3: Encode URI component
    const txt = encodeURIComponent("Test 3 - encoded text with *markdown*");
    const t3 = await fetch(`https://api.telegram.org/bot8697337660:AAG7s4l3U4FZAykt91u8AKDEA11hpKTp1HY/sendMessage?chat_id=5066504835&text=${txt}&parse_mode=Markdown`);
    const r3 = await t3.json();
    results.push(`Test 3 (encoded): ${r3.ok ? "OK" : "FAIL"} msg_id=${r3.result?.message_id || "?"}`);

    return Response.json({ ok: true, results });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
