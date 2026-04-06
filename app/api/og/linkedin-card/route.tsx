import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Generates branded LinkedIn card images on-demand
// Usage: /api/og/linkedin-card?type=stat&headline=18+hrs%2Fwk&sub=recovered+by+one+law+firm&label=Law+Firm+Result
// Types: stat | insight | quote | beforeafter

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "insight";
  const headline = searchParams.get("headline") ?? "";
  const sub = searchParams.get("sub") ?? "";
  const label = searchParams.get("label") ?? "Saabai.ai";
  const stat = searchParams.get("stat") ?? "";
  const before = searchParams.get("before") ?? "";
  const after = searchParams.get("after") ?? "";

  const W = 1200;
  const H = 627;

  const GlowBg = () => (
    <div
      style={{
        position: "absolute",
        top: "40%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "900px",
        height: "400px",
        borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(98,197,209,0.12) 0%, transparent 70%)",
        display: "flex",
      }}
    />
  );

  const TopLine = () => (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: "20%",
        right: "20%",
        height: "2px",
        background: "linear-gradient(to right, transparent, #62c5d1, transparent)",
        display: "flex",
      }}
    />
  );

  const Brand = () => (
    <div
      style={{
        position: "absolute",
        bottom: 36,
        right: 52,
        fontSize: "16px",
        fontWeight: "700",
        color: "rgba(255,255,255,0.25)",
        letterSpacing: "0.08em",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#62c5d1", display: "flex" }} />
      saabai.ai
    </div>
  );

  const Label = ({ text }: { text: string }) => (
    <div
      style={{
        fontSize: "12px",
        letterSpacing: "0.22em",
        color: "#62c5d1",
        textTransform: "uppercase",
        fontWeight: "700",
        marginBottom: "28px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#62c5d1", display: "flex" }} />
      {text}
      <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#62c5d1", display: "flex" }} />
    </div>
  );

  const base = {
    background: "#0b092e",
    width: "100%",
    height: "100%",
    display: "flex" as const,
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "system-ui, -apple-system, sans-serif",
    position: "relative" as const,
    padding: "0 80px",
  };

  let content;

  if (type === "stat") {
    content = (
      <div style={base}>
        <GlowBg />
        <TopLine />
        <Brand />
        <Label text={label} />
        <div style={{ fontSize: "112px", fontWeight: "900", color: "#62c5d1", letterSpacing: "-0.04em", lineHeight: 1, display: "flex", marginBottom: "20px" }}>
          {stat || headline}
        </div>
        {sub && (
          <div style={{ fontSize: "28px", color: "rgba(255,255,255,0.65)", textAlign: "center", maxWidth: "700px", lineHeight: 1.4, display: "flex" }}>
            {sub}
          </div>
        )}
      </div>
    );
  } else if (type === "beforeafter") {
    content = (
      <div style={{ ...base, flexDirection: "row", gap: "0", padding: "0", alignItems: "stretch" }}>
        <GlowBg />
        <TopLine />
        <Brand />
        {/* Before */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 52px", background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(98,197,209,0.2)" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.22em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: "20px", display: "flex" }}>BEFORE</div>
          <div style={{ fontSize: "22px", color: "rgba(255,255,255,0.7)", lineHeight: 1.5, display: "flex" }}>{before}</div>
        </div>
        {/* Arrow */}
        <div style={{ width: "72px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ fontSize: "32px", color: "#62c5d1", display: "flex" }}>→</div>
        </div>
        {/* After */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 52px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.22em", color: "#62c5d1", textTransform: "uppercase", marginBottom: "20px", display: "flex" }}>AFTER</div>
          <div style={{ fontSize: "22px", color: "#ffffff", lineHeight: 1.5, display: "flex" }}>{after}</div>
        </div>
      </div>
    );
  } else if (type === "quote") {
    content = (
      <div style={base}>
        <GlowBg />
        <TopLine />
        <Brand />
        <div style={{ fontSize: "20px", color: "#62c5d1", marginBottom: "32px", display: "flex" }}>"</div>
        <div style={{ fontSize: "36px", fontWeight: "600", color: "#ffffff", textAlign: "center", maxWidth: "880px", lineHeight: 1.4, letterSpacing: "-0.01em", display: "flex", marginBottom: "36px" }}>
          {headline}
        </div>
        {sub && (
          <div style={{ fontSize: "16px", color: "rgba(255,255,255,0.4)", display: "flex" }}>
            — {sub}
          </div>
        )}
      </div>
    );
  } else {
    // insight (default)
    content = (
      <div style={base}>
        <GlowBg />
        <TopLine />
        <Brand />
        <Label text={label} />
        <div style={{ fontSize: "52px", fontWeight: "700", color: "#ffffff", textAlign: "center", maxWidth: "900px", lineHeight: 1.15, letterSpacing: "-0.025em", display: "flex", marginBottom: "28px" }}>
          {headline}
        </div>
        {sub && (
          <div style={{ fontSize: "22px", color: "rgba(255,255,255,0.5)", textAlign: "center", maxWidth: "720px", lineHeight: 1.5, display: "flex" }}>
            {sub}
          </div>
        )}
      </div>
    );
  }

  return new ImageResponse(content, { width: W, height: H });
}
