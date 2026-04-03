import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "../../lib/auth";
import LoginForm from "./LoginForm";

export const metadata = { title: "Client Portal — Saabai" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  // Skip login if already authenticated
  if (token) {
    const session = await verifySessionToken(token);
    if (session) redirect(params.redirect ?? "/rex-dashboard");
  }

  const isInvalid = params.error === "invalid";
  const redirectTo = params.redirect ?? "";

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "var(--font-geist-sans), 'Helvetica Neue', Arial, sans-serif",
    }}>

      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{
          position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
          width: 700, height: 500, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(98,197,209,0.07) 0%, transparent 65%)",
        }} />
      </div>

      {/* Login card */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 400,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(98,197,209,0.14)",
        borderRadius: 20,
        padding: "40px 40px 36px",
        backdropFilter: "blur(12px)",
        boxShadow: "0 0 0 1px rgba(98,197,209,0.04), 0 24px 64px rgba(0,0,0,0.45)",
      }}>

        {/* Logo + portal label */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/saabai-logo.png"
            alt="Saabai"
            height={34}
            style={{ objectFit: "contain" }}
          />
          <p style={{
            margin: "14px 0 0",
            fontSize: 10, fontWeight: 700, letterSpacing: 3,
            textTransform: "uppercase", color: "rgba(98,197,209,0.55)",
          }}>
            Client Portal
          </p>
        </div>

        {/* Form (client component — handles focus/hover events) */}
        <LoginForm redirectTo={redirectTo} isInvalid={isInvalid} />

        {/* Footer */}
        <p style={{
          marginTop: 28, marginBottom: 0,
          textAlign: "center", fontSize: 12,
          color: "rgba(131,153,192,0.5)",
          lineHeight: 1.7,
        }}>
          Need access?{" "}
          <a href="mailto:hello@saabai.ai" style={{ color: "rgba(98,197,209,0.6)", textDecoration: "none" }}>
            Contact Saabai
          </a>
        </p>
      </div>
    </div>
  );
}
