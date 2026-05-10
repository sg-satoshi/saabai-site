import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "../../../lib/auth";
import PlonLoginForm from "./PlonLoginForm";

export const metadata = { title: "Sign in — Plastic Online" };

export default async function PlonLoginPage({
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
  const redirectTo = params.redirect ?? "/rex-dashboard";

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      background: "#f9fafb",
    }}>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 400,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 20,
        padding: "44px 40px 40px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 24px 64px rgba(0,0,0,0.06)",
      }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={{
            margin: 0,
            fontSize: 22, fontWeight: 900, color: "#111", letterSpacing: "-0.5px",
          }}>
            Plastic<span style={{ color: "#e13f00" }}>Online</span>
          </p>
          <p style={{
            margin: "10px 0 0",
            fontSize: 11, fontWeight: 700, letterSpacing: 2.5,
            textTransform: "uppercase", color: "#9ca3af",
          }}>
            Rex Dashboard
          </p>
        </div>

        {/* Form */}
        <PlonLoginForm redirectTo={redirectTo} isInvalid={isInvalid} />

        {/* Footer */}
        <p style={{
          margin: "28px 0 0",
          fontSize: 11, color: "#bbb", textAlign: "center",
        }}>
          Powered by{" "}
          <a href="https://saabai.ai" style={{ color: "#999", textDecoration: "none", fontWeight: 600 }}>
            Saabai
          </a>
        </p>
      </div>
    </div>
  );
}
