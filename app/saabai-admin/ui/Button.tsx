import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Admin button system (#345). pri = navy primary (one per view), sec = secondary, gh = ghost,
 * dq = quiet danger (neutral until hover, never beside a send), ds = danger confirm (the final
 * step of a destructive dialog only). acc and dg stay for pages that still use them.
 * Sizes: sm 30, default 36, md 40, lg 48. icon = square, needs an aria-label.
 */
export type ButtonVariant = "pri" | "acc" | "gh" | "dg" | "sec" | "dq" | "ds";
export type ButtonSize = "sm" | "md" | "lg";

export function Button({
  variant = "sec",
  size,
  icon = false,
  loading = false,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; icon?: boolean; loading?: boolean; children: ReactNode }) {
  const cls = ["btn", variant === "sec" ? "" : variant, size ?? "", icon ? "ic" : "", loading ? "loading" : "", className].filter(Boolean).join(" ");
  return (
    <button type="button" className={cls} aria-busy={loading || undefined} title={icon ? rest["aria-label"] : undefined} {...rest}>
      {children}
    </button>
  );
}
