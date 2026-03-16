import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Saabai — AI Automation for Professional Firms";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0b092e",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Glow background */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -60%)",
            width: "800px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(98,197,209,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Teal top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "25%",
            right: "25%",
            height: "2px",
            background: "linear-gradient(to right, transparent, #62c5d1, transparent)",
          }}
        />

        {/* Eyebrow */}
        <div
          style={{
            fontSize: "14px",
            letterSpacing: "0.2em",
            color: "#62c5d1",
            textTransform: "uppercase",
            marginBottom: "32px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#62c5d1" }} />
          AI Automation for Professional Firms · Australia
          <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#62c5d1" }} />
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: "64px",
            fontWeight: "700",
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            textAlign: "center",
            color: "#ffffff",
            maxWidth: "900px",
            marginBottom: "24px",
          }}
        >
          Your firm runs on expertise.{" "}
          <span style={{ color: "#62c5d1" }}>Not admin.</span>
        </div>

        {/* Sub */}
        <div
          style={{
            fontSize: "22px",
            color: "rgba(255,255,255,0.55)",
            textAlign: "center",
            maxWidth: "700px",
            lineHeight: 1.5,
            marginBottom: "48px",
          }}
        >
          AI systems that recover 20+ hours a week — without adding staff or changing how your team works.
        </div>

        {/* Brand */}
        <div
          style={{
            fontSize: "18px",
            fontWeight: "600",
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.05em",
          }}
        >
          saabai.ai
        </div>
      </div>
    ),
    { ...size }
  );
}
