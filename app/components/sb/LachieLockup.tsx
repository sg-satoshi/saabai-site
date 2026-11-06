import "./voice-demo.css";

const PORTRAIT_1X = "/brand/lachie/avatar/lachie-headset-avatar-button-96.png";
const PORTRAIT_2X = "/brand/lachie/avatar/lachie-headset-avatar-button-192.png";

export function LachiePortrait({
  alt = "Lachie, Saabai's AI voice demo",
  size = 96,
}: {
  alt?: string;
  size?: number;
}) {
  return (
    <img
      className="lachie-portrait"
      src={PORTRAIT_1X}
      srcSet={`${PORTRAIT_2X} 2x`}
      width={size}
      height={size}
      alt={alt}
    />
  );
}

export function LachieLockup({
  second,
  descriptor,
  as: Tag = "div",
}: {
  second: "Legend" | "Legal";
  descriptor: string;
  as?: "div" | "h2";
}) {
  return (
    <Tag className="lachie-lockup" data-theme="dark">
      <span className="lachie-lockup__line">
        <span className="lachie-lockup__meet">Meet</span>{" "}
        <span className="lachie-lockup__name">Lachie</span>{" "}
        <span className="lachie-lockup__second">{second}</span>
      </span>
      <span className="lachie-lockup__desc">{descriptor}</span>
    </Tag>
  );
}
