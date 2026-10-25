/* Line icons used across the Lex workspace (24px grid, stroke follows currentColor). */
const P: Record<string, React.ReactNode> = {
  research: <path d="M4 5h16v11H8l-4 4z" />,
  draft: <><path d="M5 3h10l4 4v14H5z" /><path d="M9 13h6M9 17h4" /></>,
  review: <><path d="M5 3h10l4 4v14H5z" /><circle cx="11" cy="13" r="3" /><path d="M13.5 15.5 16 18" /></>,
  matters: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5h6v2" /></>,
  projects: <path d="M3 6h6l2 2h10v11H3z" />,
  dashboard: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
  chip: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  send: <path d="M12 19V5M5 12l7-7 7 7" />,
  word: <><path d="M5 3h10l4 4v14H5z" /><path d="M8 11l1.5 6L12 12l2.5 5L16 11" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M4 16V4h12" /></>,
  share: <path d="M4 12v8h16v-8M12 3v13M7 8l5-5 5 5" />,
  warn: <><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17v.5" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  book: <><path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z" /><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z" /></>,
  attach: <path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7" />,
  flag: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></>,
  ext: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v6H4V6h6" /></>,
};

export function Icon({ name, size }: { name: keyof typeof P | string; size?: number }) {
  return (
    <svg className="i" viewBox="0 0 24 24" aria-hidden="true" style={size ? { width: size, height: size } : undefined}>
      {P[name] ?? null}
    </svg>
  );
}
