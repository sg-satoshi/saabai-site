"use client";

/** Admin tab bar using the shared .tabs styles. Counts show as pills, muted when 0. */
export function AdminTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          className={value === t.id ? "on" : ""}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count !== undefined ? <span className={`num${t.count === 0 ? " z" : ""}`}>{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
