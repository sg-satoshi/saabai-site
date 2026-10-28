import type { ReactNode } from "react";

/** Uppercase admin field label, slate-600 for contrast. Pass htmlFor to tie it to its input. */
export function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  if (!htmlFor) return <span className="au-label">{children}</span>;
  return (
    <label htmlFor={htmlFor} className="au-label">
      {children}
    </label>
  );
}
