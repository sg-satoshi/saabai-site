import { Ban, Clock, Lock, type LucideIcon } from "lucide-react";

const POINTS: { icon: LucideIcon; text: string }[] = [
  {
    icon: Lock,
    text: "Locked-down admin, with two-factor sign-in for our team.",
  },
  {
    icon: Ban,
    text: "Spam and bot protection on every chat and form.",
  },
  {
    icon: Clock,
    text: "Chatbot conversations are deleted automatically after 90 days.",
  },
];

/** Compact trust strip under the /websites pricing CTAs. Copy is fixed. */
export default function SecurityTrustStrip() {
  return (
    <aside
      aria-labelledby="secure-by-default-heading"
      className="mt-8 rounded-2xl border border-saabai-border bg-saabai-surface px-5 py-5 sm:px-8 sm:py-6"
    >
      <h3
        id="secure-by-default-heading"
        className="text-center text-base font-semibold tracking-tight text-saabai-text"
      >
        Secure by default.
      </h3>
      <p className="mx-auto mt-2 max-w-3xl text-center text-sm leading-relaxed text-saabai-text-muted">
        Every site is served over HTTPS from Sydney, kept up to date, and checked automatically before every change, as part of your care plan.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3 sm:gap-6">
        {POINTS.map(({ icon: Icon, text }) => (
          <li
            key={text}
            className="flex items-start gap-2.5 text-sm leading-snug text-saabai-text-muted"
          >
            <Icon
              className="mt-0.5 h-4 w-4 shrink-0 text-saabai-teal"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
