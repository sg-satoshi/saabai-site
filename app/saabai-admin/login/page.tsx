import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME, isAdminSession } from "../../../lib/auth";
import { safeRedirect } from "../../../lib/safe-redirect";
import AdminLoginForm from "./AdminLoginForm";
import "../auth.css";

export const metadata = { title: "Admin Login | Saabai", robots: { index: false, follow: false } };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = safeRedirect(params.redirect, "/saabai-admin");
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    const session = await verifySessionToken(token);
    if (session) redirect((await isAdminSession(session.clientId)) ? redirectTo : "/dashboard");
  }

  const isInvalid = params.error === "invalid" || params.error === "locked";
  const expired = params.error === "expired";

  return (
    <div className="auth-screen">
      <aside className="art">
        <img src="/brand/saabai-logo.png" alt="Saabai" />
        <div>
          <div className="mc2">Mission Control</div>
          <h2>Run sales, delivery and clients from one calm desk.</h2>
          <p>Blueprints, Lex, websites and care plans in one place. 2FA is required for every admin.</p>
          <div className="stat">
            <div>
              <b className="num">AA</b>
              Contrast first
            </div>
            <div>
              <b className="num">2FA</b>
              Required
            </div>
            <div>
              <b className="num">30d</b>
              Trusted device
            </div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: "#7d83b3" }}>Saabai Admin · Australia</p>
      </aside>
      <div className="panel">
        <div className="box">
          <img className="mlogo" src="/brand/saabai-logo.png" alt="Saabai" />
          <div className="mc2">Mission Control</div>
          <h1>Sign in</h1>
          <p className="lead">Use your Saabai admin email. You will confirm with an authenticator code next.</p>
          {(expired) && (
            <p role="alert" style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(194,38,29,.12)", color: "#f3b4b0", fontSize: 13 }}>
              Your code step timed out. Please sign in again.
            </p>
          )}
          <AdminLoginForm redirectTo={redirectTo} isInvalid={isInvalid} />
        </div>
      </div>
      <p className="foot2">Need help? hello@saabai.ai</p>
    </div>
  );
}
