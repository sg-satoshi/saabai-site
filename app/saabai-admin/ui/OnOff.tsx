"use client";

/** Big one-click ON/OFF switch. Green dot and ON when active, red dot and OFF when not. */
export default function OnOff({ on, label, onToggle, disabled, note, testId }: { on: boolean; label: string; onToggle: () => void; disabled?: boolean; note?: string; testId?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <button type="button" data-testid={testId} aria-pressed={on} aria-label={`${label}: ${on ? "on" : "off"}. Press to turn ${on ? "off" : "on"}.`} disabled={disabled} onClick={onToggle}
        style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "10px 22px 10px 16px", fontSize: 20, fontWeight: 800, letterSpacing: ".04em", cursor: disabled ? "wait" : "pointer", borderRadius: 999, border: `2px solid ${on ? "#15803d" : "#b91c1c"}`, background: on ? "#f0fdf4" : "#fef2f2", color: on ? "#14532d" : "#7f1d1d", minHeight: 52 }}>
        <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: "50%", background: on ? "#16a34a" : "#dc2626", boxShadow: `0 0 0 4px ${on ? "rgba(22,163,74,.25)" : "rgba(220,38,38,.25)"}` }} />
        {on ? "ON" : "OFF"}
      </button>
      {note && <small data-testid={testId ? `${testId}-note` : undefined} style={{ color: "var(--n-500)", fontSize: 12.5 }}>{note}</small>}
    </span>
  );
}
