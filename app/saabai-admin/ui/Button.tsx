import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "pri" | "acc" | "gh" | "dg" | "sec";

export function Button({
  variant = "sec",
  size,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm"; children: ReactNode }) {
  const v = variant === "sec" ? "" : variant;
  return (
    <button type="button" className={`btn ${v} ${size === "sm" ? "sm" : ""} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
