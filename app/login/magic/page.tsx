import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in, Saabai",
  // Keep the one-time token out of Referer headers.
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Landing page for the emailed sign-in link. The token is only consumed when
 * the client presses the button (POST), so link scanners can't use it up.
 */
export default async function MagicLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = typeof token === "string" && token.length >= 20 && token.length <= 200;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, background: "#0e2554",
      fontFamily: "var(--font-geist-sans), 'Helvetica Neue', Arial, sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 400, background: "#0b092e",
        border: "1px solid rgba(98,197,209,0.18)", borderRadius: 20,
        padding: "40px 40px 36px", textAlign: "center",
        boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/saabai-logo.png" alt="Saabai" height={34} style={{ objectFit: "contain" }} />
        <p style={{ margin: "14px 0 28px", fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "rgba(98,197,209,0.55)" }}>
          Client Portal
        </p>
        {valid ? (
          <form method="POST" action="/api/auth/magic-link/verify">
            <input type="hidden" name="token" value={token} />
            <p style={{ margin: "0 0 22px", fontSize: 14, color: "rgba(240,244,255,0.75)", lineHeight: 1.6 }}>
              Welcome back. Press the button below to finish signing in.
            </p>
            <button type="submit" style={{
              width: "100%", padding: 12, fontSize: 14, fontWeight: 700,
              background: "rgba(98,197,209,0.15)", border: "1px solid rgba(98,197,209,0.35)",
              borderRadius: 10, cursor: "pointer", color: "#62c5d1", fontFamily: "inherit",
            }}>
              Sign in →
            </button>
          </form>
        ) : (
          <>
            <p style={{ margin: "0 0 22px", fontSize: 14, color: "rgba(240,244,255,0.75)", lineHeight: 1.6 }}>
              This sign-in link isn&apos;t valid. Please request a new one.
            </p>
            <a href="/login" style={{ fontSize: 13, color: "#62c5d1", textDecoration: "none", fontWeight: 600 }}>Back to sign in</a>
          </>
        )}
      </div>
    </div>
  );
}
