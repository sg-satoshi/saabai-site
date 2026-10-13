import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PENDING_COOKIE, verifyPendingToken } from "../../../../lib/admin-2fa";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify | Saabai Admin", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  invalid: "That code didn't work. Try the newest code from your app, or a backup code.",
  locked: "Too many wrong codes. Wait 10 minutes and sign in again.",
};

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const pending = verifyPendingToken((await cookies()).get(PENDING_COOKIE)?.value);
  if (!pending) redirect("/saabai-admin/login?error=expired");

  const input = {
    width: "100%", boxSizing: "border-box" as const, minHeight: 48, padding: "12px 14px", fontSize: 20, letterSpacing: 4,
    textAlign: "center" as const, background: "#151935", color: "#e2e4f0", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#07091a", fontFamily: "var(--font-geist-sans), 'Helvetica Neue', Arial, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400, background: "#0e1128", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "36px 28px" }}>
        <p style={{ margin: 0, textAlign: "center", fontSize: 20, fontWeight: 800, color: "#e2e4f0" }}>Saabai</p>
        <p style={{ margin: "10px 0 24px", textAlign: "center", fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#C9A84C" }}>Two-step sign in</p>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "#9aa0bd", lineHeight: 1.5 }}>Enter the 6-digit code from your authenticator app. Lost your phone? Use one of your backup codes instead.</p>
        {error && ERRORS[error] && (
          <p role="alert" style={{ margin: "0 0 16px", padding: "10px 14px", fontSize: 13, color: "#fca5a5", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 10 }}>{ERRORS[error]}</p>
        )}
        <form method="POST" action="/api/auth/2fa/verify">
          <label htmlFor="code" style={{ display: "block", marginBottom: 8, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#6b7093" }}>Code</label>
          <input id="code" name="code" required autoFocus autoComplete="one-time-code" inputMode="text" maxLength={16} placeholder="123456" style={input} />
          <button type="submit" style={{ width: "100%", minHeight: 48, marginTop: 20, border: 0, borderRadius: 10, fontSize: 15, fontWeight: 700, color: "#111", background: "linear-gradient(135deg,#C9A84C,#E0BC6A)", cursor: "pointer" }}>Verify</button>
        </form>
        <p style={{ margin: "18px 0 0", textAlign: "center", fontSize: 13 }}><a href="/saabai-admin/login" style={{ color: "#9aa0bd", display: "inline-block", padding: "12px 8px" }}>Start again</a></p>
      </div>
    </div>
  );
}
