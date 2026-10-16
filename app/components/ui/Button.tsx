"use client";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Shared client-side button. Carries no brand styling of its own (pass className),
 * but wires loading (spinner + label swap, aria-busy), disabled and the global
 * hover / pressed / focus-visible states from globals.css.
 */
export type SbButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: ReactNode;
};

export default function Button({ loading = false, loadingLabel, disabled, children, type = "button", ...rest }: SbButtonProps) {
  return (
    <button {...rest} type={type} disabled={disabled || loading} aria-busy={loading || undefined}>
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
