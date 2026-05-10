import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "../../../lib/auth";
import AdminLoginForm from "./AdminLoginForm";

export const metadata = { title: "Admin Login — Saabai" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  // Already authenticated → go to admin
  if (token) {
    const session = await verifySessionToken(token);
    if (session) redirect(params.redirect ?? "/saabai-admin");
  }

  const isInvalid = params.error === "invalid";
  const redirectTo = params.redirect ?? "/saabai-admin";

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background: "#07091a",
      fontFamily: "var(--font-geist-sans), 'Helvetica Neue', Arial, sans-serif",
    }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{
          position: "absolute", top: "25%", left: "50%", transform: "translateX(-50%)",
          width: 600, height: 400, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 65%)",
        }} />
      </div>

      {/* Card */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 400,
        background: "#0e1128",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 20,
        padding: "44px 40px 40px",
        boxShadow: "0 0 0 1px rgba(201,168,76,0.03), 0 24px 64px rgba(0,0,0,0.5)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={{
            margin: 0,
            fontSize: 20, fontWeight: 800, color: "#e2e4f0", letterSpacing: "-0.5px",
          }}>
            Saabai
          </p>
          <p style={{
            margin: "10px 0 0",
            fontSize: 10, fontWeight: 700, letterSpacing: 3,
            textTransform: "uppercase", color: "#C9A84C",
          }}>
            Mission Control
          </p>
        </div>

        <AdminLoginForm redirectTo={redirectTo} isInvalid={isInvalid} />
      </div>
    </div>
  );
}
