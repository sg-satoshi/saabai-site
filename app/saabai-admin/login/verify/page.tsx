import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PENDING_COOKIE, verifyPendingToken } from "../../../../lib/admin-2fa";
import "../../auth.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify | Saabai Admin", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  invalid: "That code did not work. Try the newest code from your app, or a backup code.",
  locked: "Too many wrong codes. Wait 10 minutes and sign in again.",
};

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const pending = verifyPendingToken((await cookies()).get(PENDING_COOKIE)?.value);
  if (!pending) redirect("/saabai-admin/login?error=expired");

  return (
    <div className="auth-screen">
      <aside className="art">
        <img src="/brand/saabai-logo.png" alt="Saabai" />
        <div>
          <div className="mc2">Mission Control</div>
          <h2>One more step to keep the desk locked.</h2>
          <p>Enter the 6-digit code from your authenticator app. You can trust this device for 30 days.</p>
        </div>
        <p style={{ fontSize: 12, color: "#7d83b3" }}>2FA required for every admin</p>
      </aside>
      <div className="panel">
        <div className="box">
          <img className="mlogo" src="/brand/saabai-logo.png" alt="Saabai" />
          <div className="mc2">Two-step sign in</div>
          <h1>Enter your code</h1>
          <p className="lead">Open your authenticator app. Lost your phone? Use a backup code instead.</p>
          {error && ERRORS[error] && <p className="err" role="alert">{ERRORS[error]}</p>}
          <form method="POST" action="/api/auth/2fa/verify" className="f" style={{ marginTop: 22 }}>
            <label htmlFor="code">Authenticator code</label>
            <input
              id="code"
              name="code"
              required
              autoFocus
              autoComplete="one-time-code"
              inputMode="text"
              maxLength={16}
              placeholder="123456"
              className="fi-real"
              style={{ letterSpacing: 4, textAlign: "center", fontSize: 20 }}
            />
            <label className="chkline">
              <input type="checkbox" name="trust" value="1" />
              <span>Trust this device for 30 days. Only tick this on a computer or phone you keep private.</span>
            </label>
            <button type="submit" className="gbtn">
              Verify and continue
            </button>
          </form>
          <p style={{ marginTop: 18, textAlign: "center", fontSize: 13 }}>
            <a href="/saabai-admin/login" style={{ color: "#9aa0c8" }}>
              Start again
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
