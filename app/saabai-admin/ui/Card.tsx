import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`.trim()}>{children}</div>;
}

export function CardHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="hd">
      <h2>{title}</h2>
      {action}
    </div>
  );
}

export function CardBody({ children }: { children: ReactNode }) {
  return <div className="bd">{children}</div>;
}
