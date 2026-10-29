import type { ReactNode } from "react";

/* Hand-drawn Saabai icons for /custom-ai-agents (24 x 24, stroke 1.75, currentColor). Decorative only. */
const PATHS = {
  agent: (
    <>
      <rect x="4" y="7" width="16" height="12" rx="3" />
      <path d="M12 3v4" />
      <circle cx="12" cy="3" r="0.6" />
      <path d="M9 12v1M15 12v1M9.5 16h5" />
      <path d="M2 12v2M22 12v2" />
    </>
  ),
  blueprint: (
    <>
      <path d="M6 3h8.5L19 7.5V21H6z" />
      <path d="M14.5 3v4.5H19" />
      <path d="M9 12h7M9 15.5h7M9 8.5h3" />
    </>
  ),
  book: (
    <>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" />
      <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
      <path d="M9 7.5h6M9 10.5h4" />
    </>
  ),
  build: <path d="M14.5 5.5a4 4 0 0 0-5 5L3.8 16.2a1.9 1.9 0 0 0 2.7 2.7l5.7-5.7a4 4 0 0 0 5-5l-2.6 2.6-2.3-.4-.4-2.3z" />,
  chat: (
    <>
      <path d="M4 5h16v11H10l-5 4v-4H4z" />
      <path d="M8 9.5h8M8 12.5h5" />
    </>
  ),
  filter: <path d="M4 5h16l-6.2 7.4V19l-3.6 1.8v-8.4z" />,
  followup: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5l8.5 6 8.5-6" />
    </>
  ),
  group: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16.5 14.1c2.6.4 4.5 2.8 4.5 5.9" />
    </>
  ),
  handoff: (
    <>
      <path d="M3 13h5l1.5 3h5L16 13h5" />
      <path d="M5.5 5h13L21 13v6H3v-6z" />
    </>
  ),
  intake: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V2.8h6V4" />
      <path d="M8.5 9.5l1 1 2-2M13 9.5h3M8.5 14.5l1 1 2-2M13 14.5h3" />
    </>
  ),
  live: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.4l2.7 2.7L16.2 9.6" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11.6a7 7 0 1 0-14 0C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.4" r="2.5" />
    </>
  ),
  price: (
    <>
      <path d="M3.5 12.5V4h8.5l9 9-8.5 8.5z" />
      <circle cx="8" cy="8.5" r="1.6" />
    </>
  ),
  product: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
      <path d="M8 5.25l8 4.5" />
    </>
  ),
  quote: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V2.8h6V4" />
      <path d="M14.2 9.3c-.5-.6-1.3-.9-2.2-.9-1.2 0-2.1.6-2.1 1.5s.9 1.3 2.1 1.5 2.1.7 2.1 1.6-.9 1.6-2.1 1.6c-1 0-1.8-.4-2.2-1" />
      <path d="M12 7.2v1.2M12 14.6v1.2" />
    </>
  ),
  score: (
    <>
      <path d="M3.5 17a8.5 8.5 0 1 1 17 0" />
      <path d="M12 17l4.2-5" />
      <circle cx="12" cy="17" r="1.3" />
      <path d="M6 13l1 .6M18 13l-1 .6M12 8.5v1.2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.4-7.5 9.5-4.3-1.1-7.5-4.9-7.5-9.5V6z" />
      <path d="M9 12l2.2 2.2L15.5 10" />
    </>
  ),
  task: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "ic" }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

/** Icon in a rounded teal tile. */
export function IconTile({ name, small = false }: { name: IconName; small?: boolean }) {
  return (
    <div className={small ? "ich sm" : "ich"} aria-hidden="true">
      <Icon name={name} />
    </div>
  );
}
