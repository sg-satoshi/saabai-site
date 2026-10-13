import type { ReactNode } from "react";

export function Num({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`num ${className}`.trim()}>{children}</span>;
}
